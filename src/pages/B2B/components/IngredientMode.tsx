import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { UserContext } from "@/lib/types";
import RecoPanel from "./RecoPanel";
import PantryEditor from "./PantryEditor";
import {
  readPantryHistory, readPantryToday,
  savePantryHistory, savePantryToday, upsertPantryHistory
} from "@/utils/pantry/storage";

export default function IngredientMode({ user }: { user: UserContext }) {
  const [history, setHistory] = useState<string[]>([]);
  const [today, setToday] = useState<string[]>([]);

  // 初始化：读取本地存储
  useEffect(() => {
    try {
      setHistory(readPantryHistory());
      setToday(readPantryToday());
    } catch {
      Taro.showToast({ title: "食材读取失败，使用空白", icon: "none" });
    }
  }, []);

  // 实时回传（可选）
  function handleUpdate(nextToday: string[], nextHistory: string[]) {
    setToday(nextToday);
    setHistory(nextHistory);
    savePantryToday(nextToday);
    savePantryHistory(nextHistory);
  }

  // 点击“应用”
  function apply(nextToday: string[]) {
    setToday(nextToday);
    savePantryToday(nextToday);
    upsertPantryHistory(nextToday);
    setHistory(readPantryHistory());
    Taro.showToast({ title: "已应用今日食材", icon: "none" });
  }

  return (
    <View className="mode ingredients">
      <Text className="hint">只展示“核心食材≥70%命中今日食材”的样本菜与公开食谱。</Text>

      <PantryEditor
        today={today}
        history={history}
        onUpdate={handleUpdate}
        onApply={apply}
      />

      {/* 这里把今日食材作为 whitelist 传入推荐与公开食谱 */}
      <RecoPanel user={user} ingredientWhitelist={today} />
    </View>
  );
}
