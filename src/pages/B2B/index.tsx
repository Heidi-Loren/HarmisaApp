import { useState, useMemo } from "react";
import { View, Text, ScrollView, Button } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";

import { mockDishes } from "@/utils/recommendation/mockDishes";
import { generateUnifiedRecommendations } from "@/utils/recommendation/generateUnifiedRecommendations";

import type { Dish } from "@/utils/recommendation/types";
import type { DishExplanation } from "@/utils/recommendation/explanation";
import type { UserProfile } from "@/utils/profile/types";
import { readUserProfileFromStorage } from "@/utils/profile/storage";
import { getOrCreateDeviceId } from "@/utils/device";

import WeightControls, { Weights } from "@/components/WeightControls";
import AllergenDrawer from "@/components/AllergenDrawer";
import TagPickerDrawer from "@/components/TagPickerDrawer";
import { computeAutoWeights } from "@/utils/recommendation/autoWeights"; // ✅ 自动权重

import "./index.scss";

// —— 根据设备区分偏好存储
function makeKeys(deviceId: string) {
  return {
    weights:   `pref_weights:${deviceId}`,
    mode:      `pref_weight_mode:${deviceId}`, // ✅ 自动/手动
    allergens: `pref_allergens:${deviceId}`,
    dislikes:  `pref_dislikes:${deviceId}`,
    craves:    `pref_craves:${deviceId}`,
  };
}

// —— 过敏同义词（硬排除）
const ALLERGEN_SYNS: Record<string, string[]> = {
  花生: ["花生","花生仁","花生酱","peanut"],
  坚果: ["坚果","核桃","腰果","杏仁","榛子","碧根果","开心果","nuts"],
  芝麻: ["芝麻","芝麻酱","sesame"],
  牛奶: ["牛奶","奶","乳","乳制品","奶酪","芝士","奶油","黄油","乳糖","dairy","milk","cheese","butter"],
  乳制品: ["乳制品","奶酪","芝士","黄油","奶油","牛奶"],
  鸡蛋: ["鸡蛋","蛋类","蛋黄","蛋白","egg"],
  大豆: ["大豆","黄豆","豆制品","豆浆","豆腐","酱油","味噌","纳豆","soy"],
  海鲜: ["海鲜","鱼","贝","虾","蟹","鱿鱼","章鱼","蛤蜊","牡蛎","海产"],
  甲壳类: ["甲壳","虾","蟹","crustacean"],
  贝类: ["贝","蛤蜊","扇贝","牡蛎","螺"],
  小麦: ["小麦","面粉","面筋","麸质","gluten","wheat"],
  麸质: ["麸质","面筋","gluten"],
  芹菜: ["芹菜","celery"],
};

// —— 偏好同义词（软加减分）
const PREF_SYNS: Record<string, string[]> = {
  辣: ["辣","麻辣","辣椒","川菜","spicy"],
  清淡: ["清淡","清爽","light"],
  面: ["面","面条","拉面","米线","粉","noodle"],
  饭: ["饭","米饭","盖饭","rice"],
  汤: ["汤","汤面","汤粉","soup"],
  烧烤: ["烤","烧烤","BBQ","串"],
  咖喱: ["咖喱","curry"],
  甜: ["甜","甜品","dessert","糖"],
  酸: ["酸","酸辣","酸汤"],
  牛肉: ["牛肉","beef"],
  鸡肉: ["鸡肉","鸡","chicken"],
  羊肉: ["羊肉","mutton","lamb"],
  海鲜: ["海鲜","鱼","虾","蟹","贝","seafood"],
  香菜: ["香菜","芫荽","cilantro","parsley"],
  内脏: ["内脏","卤味","肥肠","肝","肾","肚","offal"],
  洋葱: ["洋葱","onion"],
  大蒜: ["大蒜","蒜","蒜蓉","garlic"],
};

function matchAny(dish: Dish, words: string[], dict: Record<string,string[]>) {
  if (!words?.length) return 0;
  const hay = (dish.tags || []).concat(dish.name || "").join(" ").toLowerCase();
  let hits = 0;
  words.forEach(w => {
    const syns = dict[w] || [w];
    if (syns.some(s => hay.includes(String(s).toLowerCase()))) hits += 1;
  });
  return hits;
}

export default function B2BPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [source, setSource] = useState<"storage" | "mock">("mock");

  const [deviceId, setDeviceId] = useState<string>("");
  const [mode, setMode] = useState<'auto'|'manual'>('auto');        // ✅ 模式
  const [autoWhy, setAutoWhy] = useState<string[]>([]);             // ✅ 解释
  const [weights, setWeights] = useState<Weights>({ constitution: .5, environment: .3, drivers: .2 });

  const [allergens, setAllergens] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [craves, setCraves] = useState<string[]>([]);

  const [drawerAllergen, setDrawerAllergen] = useState(false);
  const [drawerDislike, setDrawerDislike] = useState(false);
  const [drawerCrave, setDrawerCrave] = useState(false);

  useDidShow(() => {
    try {
      // 画像
      const p = readUserProfileFromStorage();
      let prof: UserProfile;
      if (p) { setProfile(p); setSource("storage"); prof = p; }
      else {
        prof = {
          constitution: { main: "阳虚质", secondary: ["痰湿质"], scoreMap: { 阳虚质: 90, 痰湿质: 75 } },
          climate: { season: "秋", location: "广州", climateTags: ["润燥", "健脾"] },
          motivation: { main: "E", secondary: ["H"], ratio: { P: 20, H: 30, S: 10, E: 40 } },
        };
        setProfile(prof);
        setSource("mock");
      }

      // 偏好 + 模式
      const id = getOrCreateDeviceId();
      setDeviceId(id);
      const k = makeKeys(id);

      const savedMode = Taro.getStorageSync(k.mode);
      if (savedMode === 'manual' || savedMode === 'auto') setMode(savedMode);

      const savedW = Taro.getStorageSync(k.weights);
      if (savedW && typeof savedW === "object") setWeights(savedW as Weights);

      const savedA = Taro.getStorageSync(k.allergens);
      if (Array.isArray(savedA)) setAllergens(savedA as string[]);

      const savedD = Taro.getStorageSync(k.dislikes);
      if (Array.isArray(savedD)) setDislikes(savedD as string[]);

      const savedC = Taro.getStorageSync(k.craves);
      if (Array.isArray(savedC)) setCraves(savedC as string[]);

      // 若是自动模式 → 立刻用自动权重覆盖
      const m = (savedMode === 'manual' || savedMode === 'auto') ? savedMode : 'auto';
      if (m === 'auto') {
        const { weights: w, why } = computeAutoWeights(prof);
        setWeights(w as Weights);
        setAutoWhy(why);
        Taro.setStorageSync(k.weights, w);
      }
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: "画像/偏好读取失败，使用默认", icon: "none" });
    }
  });

  // —— 基础算法结果
  const computed: Array<Dish & { finalScore: number; explanation: DishExplanation }> =
    useMemo(() => {
      if (!profile) return [];
      try {
        const recs = (generateUnifiedRecommendations as any)(mockDishes, profile, weights);
        return (recs as Array<Dish & { finalScore: number; explanation: DishExplanation }>).slice(0, 60);
      } catch (e) {
        console.error("生成推荐失败：", e);
        Taro.showToast({ title: "生成推荐失败", icon: "none" });
        return [];
      }
    }, [profile, weights]);

  // —— 1) 过敏硬过滤 → 2) 不爱/想吃软加权排序
  const recommended = useMemo(() => {
    if (!computed.length) return [];
    const noAllergen = allergens.length
      ? computed.filter(d => matchAny(d, allergens, ALLERGEN_SYNS) === 0)
      : computed;

    const adjusted = noAllergen.map(d => {
      const base = d.finalScore ?? 0;
      const dislikeHits = matchAny(d, dislikes, PREF_SYNS);
      const craveHits = matchAny(d, craves, PREF_SYNS);
      const penalty = Math.min(0.20, 0.08 * dislikeHits);
      const boost   = Math.min(0.25, 0.10 * craveHits);
      const adj = Math.max(0, +(base * (1 - penalty) * (1 + boost)).toFixed(1));
      return { ...d, _adjScore: adj };
    });
    adjusted.sort((a, b) => (b._adjScore ?? 0) - (a._adjScore ?? 0));
    return adjusted.slice(0, 12);
  }, [computed, allergens, dislikes, craves]);

  // —— 应用偏好并持久化
  function applyAllergens(next: string[]) {
    setAllergens(next);
    if (deviceId) Taro.setStorageSync(makeKeys(deviceId).allergens, next);
    setDrawerAllergen(false);
    Taro.showToast({ title: "过敏已应用", icon: "none" });
  }
  function applyDislikes(next: string[]) {
    setDislikes(next);
    if (deviceId) Taro.setStorageSync(makeKeys(deviceId).dislikes, next);
    setDrawerDislike(false);
    Taro.showToast({ title: "不爱吃已应用", icon: "none" });
  }
  function applyCraves(next: string[]) {
    setCraves(next);
    if (deviceId) Taro.setStorageSync(makeKeys(deviceId).craves, next);
    setDrawerCrave(false);
    Taro.showToast({ title: "今天想吃已应用", icon: "none" });
  }

  // —— 切换模式
  function switchToAuto() {
    if (!profile) return;
    const { weights: w, why } = computeAutoWeights(profile);
    setMode('auto'); setAutoWhy(why); setWeights(w as Weights);
    if (deviceId) { const k = makeKeys(deviceId); Taro.setStorageSync(k.mode, 'auto'); Taro.setStorageSync(k.weights, w); }
  }
  function switchToManual() {
    setMode('manual');
    if (deviceId) Taro.setStorageSync(makeKeys(deviceId).mode, 'manual');
  }

  return (
    <View className="b2b-page">
      <View className="header">
        <Text className="title">个性化推荐结果</Text>
        {profile && (
          <Text className="subtitle">
            来源：{source === "storage" ? "问卷存储" : "默认 mock"} ·
            体质 <Text className="bold">{profile.constitution.main}</Text>
            {profile.constitution.secondary?.length ? ` / ${profile.constitution.secondary.join(" / ")}` : ""} ·
            季节 {profile.climate.season} · 动因 <Text className="bold">{profile.motivation.main}</Text>
          </Text>
        )}
      </View>

      {/* 模式切换 + 解释 */}
      <View className="modebar">
        <Button size="mini" className={mode==='auto' ? 'primary' : ''} onClick={switchToAuto}>自动权重</Button>
        <Button size="mini" className={mode==='manual' ? 'primary' : ''} onClick={switchToManual}>手动</Button>
        {mode==='auto' && !!autoWhy.length && <Text className="muted">自动：{autoWhy.join(' / ')}</Text>}
      </View>

      <WeightControls
        value={weights}
        onChange={(w) => {
          setWeights(w);
          if (deviceId) Taro.setStorageSync(makeKeys(deviceId).weights, w);
        }}
      />

      {/* 工具条：三个偏好入口 + 摘要 */}
      <View className="toolbar">
        <Button className="btn" size="mini" onClick={() => setDrawerAllergen(true)}>过敏</Button>
        <Button className="btn" size="mini" onClick={() => setDrawerDislike(true)}>不爱</Button>
        <Button className="btn" size="mini" onClick={() => setDrawerCrave(true)}>想吃</Button>
        <View className="muted">
          {!!allergens.length && <Text>已排除：{allergens.join("、")} </Text>}
          {!!dislikes.length && <Text>｜ 不爱：{dislikes.join("、")} </Text>}
          {!!craves.length && <Text>｜ 想吃：{craves.join("、")}</Text>}
        </View>
      </View>

      <ScrollView className="list" scrollY>
        <View className="list-inner">
          {recommended.length ? (
            recommended.map((dish, idx) => (
              <View key={dish.name + idx} className="card">
                <View className="card-head">
                  <Text className="name">{idx + 1}. {dish.name}</Text>
                  {"_adjScore" in dish && (
                    <Text className="score">得分 {(dish as any)._adjScore?.toFixed ? (dish as any)._adjScore.toFixed(1) : (dish as any)._adjScore}</Text>
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
              <Text>暂无符合筛选的结果，试试清空过敏或调整偏好</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 三个抽屉 */}
      <AllergenDrawer
        visible={drawerAllergen}
        value={allergens}
        onConfirm={applyAllergens}
        onClose={() => setDrawerAllergen(false)}
      />
      <TagPickerDrawer
        visible={drawerDislike}
        title="不爱吃（挑食）"
        suggested={["香菜","内脏","洋葱","大蒜","辣","咖喱","羊肉","海鲜","甜","酸"]}
        value={dislikes}
        onConfirm={applyDislikes}
        onClose={() => setDrawerDislike(false)}
      />
      <TagPickerDrawer
        visible={drawerCrave}
        title="今天想吃"
        suggested={["辣","清淡","面","饭","汤","烧烤","咖喱","牛肉","鸡肉","海鲜","甜"]}
        value={craves}
        onConfirm={applyCraves}
        onClose={() => setDrawerCrave(false)}
      />
    </View>
  );
}
