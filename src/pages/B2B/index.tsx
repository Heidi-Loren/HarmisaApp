// src/pages/B2B/index.tsx
import { useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";

import IngredientMode from "./components/IngredientMode";
import RestaurantMode from "./components/RestaurantMode";
import { readUserProfileFromStorage } from "@/utils/profile/storage";
import { toUserContext } from "@/utils/profile/toUserContext";
import type { UserContext } from "@/lib/types";

import "./index.scss";

export default function B2BIndex() {
  const [tab, setTab] = useState<"ingredients"|"restaurant">("ingredients");
  const [user, setUser] = useState<UserContext | null>(null);

  useEffect(() => {
    try {
      const p = readUserProfileFromStorage();
      if (!p) throw new Error("no profile");
      setUser(toUserContext(p));  // 体质/环境/动因 -> 标准三层向量
    } catch {
      // 最小兜底（可替换为你的默认/引导）
      setUser({
        constitution_vector: { "温": 0.6, "化湿": 0.4, "阳虚": 0.5 },
        environment_vector:  { "夏": 0.4, "湿热": 0.5, "华东": 0.2 },
        motive_vector:       { "P": 0.5, "H": 0.3, "S": 0.1, "E": 0.1 },
        hard_filters: { spicy_max: 1, oil_max: 2 }
      });
      Taro.showToast({ title: "使用默认画像", icon: "none" });
    }
  }, []);

  return (
    <View className="b2b-shell">
      <View className="hdr">
        <Text className="title">B2B · 饮食推荐结果</Text>
        <View className="tabs">
          <Button size="mini" className={tab==='ingredients'?'active':''} onClick={()=>setTab('ingredients')}>食材模式</Button>
          <Button size="mini" className={tab==='restaurant'?'active':''}  onClick={()=>setTab('restaurant')}>餐厅模式</Button>
        </View>
      </View>

      {user && (
        tab === "ingredients"
          ? <IngredientMode user={user}/>
          : <RestaurantMode user={user}/>
      )}
    </View>
  );
}
