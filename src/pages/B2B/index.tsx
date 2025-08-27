import { useState, useMemo } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";

import { mockDishes } from "@/utils/recommendation/mockDishes";
import { generateUnifiedRecommendations } from "@/utils/recommendation/generateUnifiedRecommendations";

import type { Dish } from "@/utils/recommendation/types";
import type { DishExplanation } from "@/utils/recommendation/explanation";
import type { UserProfile } from "@/utils/profile/types";
import { readUserProfileFromStorage } from "@/utils/profile/storage"; // ✅ 新增

import "./index.scss";

export default function B2BPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [source, setSource] = useState<"storage" | "mock">("mock");

  // ✅ 进入页面时优先读本地画像，取不到再用你原来的 mock
  useDidShow(() => {
    try {
      const p = readUserProfileFromStorage();
      if (p) {
        setProfile(p);
        setSource("storage");
      } else {
        setProfile({
          constitution: { main: "阳虚质", secondary: ["痰湿质"], scoreMap: { 阳虚质: 90, 痰湿质: 75 } },
          climate: { season: "秋", location: "广州", climateTags: ["润燥", "健脾"] },
          motivation: { main: "E", secondary: ["H"], ratio: { P: 20, H: 30, S: 10, E: 40 } }
        });
        setSource("mock");
      }
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: "画像读取失败，使用默认", icon: "none" });
    }
  });

  // ✅ 用画像（无论来自存储还是 mock）计算推荐
  const recommendedDishes: Array<Dish & { finalScore: number; explanation: DishExplanation }> =
    useMemo(() => {
      if (!profile) return [];
      try {
        const recs = generateUnifiedRecommendations(mockDishes, profile);
        return recs.slice(0, 12);
      } catch (e) {
        console.error("生成推荐失败：", e);
        Taro.showToast({ title: "生成推荐失败", icon: "none" });
        return [];
      }
    }, [profile]);

  return (
    <View className="b2b-page">
      <View className="header">
        <Text className="title">个性化推荐结果</Text>
        {profile && (
          <Text className="subtitle">
            来源：{source === "storage" ? "问卷存储" : "默认 mock"} ·
            体质 <Text className="bold">{profile.constitution.main}</Text>
            {profile.constitution.secondary?.length ? ` / ${profile.constitution.secondary.join(" / ")}` : ""} ·
            季节 {profile.climate.season} ·
            动因 <Text className="bold">{profile.motivation.main}</Text>
          </Text>
        )}
      </View>

      <ScrollView className="list" scrollY>
        <View className="list-inner">{/* ✅ 把 padding 放到内部容器，消除黄字警告 */}
          {recommendedDishes.length ? (
            recommendedDishes.map((dish, idx) => (
              <View key={dish.name + idx} className="card">
                <View className="card-head">
                  <Text className="name">{idx + 1}. {dish.name}</Text>
                  {typeof dish.finalScore === "number" && (
                    <Text className="score">得分 {dish.finalScore.toFixed(1)}</Text>
                  )}
                </View>

                {!!dish.tags?.length && (
                  <View className="tags">
                    {dish.tags.map((tag) => (
                      <Text key={tag} className="chip">{tag}</Text>
                    ))}
                  </View>
                )}

                <View className="reason">
                  <Text className="reason-title">推荐理由</Text>
                  <View className="reason-list">
                    {dish.explanation?.constitution && <Text className="reason-item">• {dish.explanation.constitution}</Text>}
                    {dish.explanation?.climate && <Text className="reason-item">• {dish.explanation.climate}</Text>}
                    {dish.explanation?.motivation && <Text className="reason-item">• {dish.explanation.motivation}</Text>}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="empty">
              <Text>暂无推荐结果，稍后再试或调整画像</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
