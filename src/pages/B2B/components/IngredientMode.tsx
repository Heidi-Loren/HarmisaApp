// src/pages/B2B/components/IngredientMode.tsx
import { useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import RecoPanel from "./RecoPanel";
import type { UserContext } from "@/lib/types";

const SUGGEST_INGS = [
  "鸡胸","鸡蛋","西兰花","胡萝卜","番茄","生菜","土豆","玉米","米饭","面条",
  "豆腐","三文鱼","鲈鱼","虾","香菇","青江菜","燕麦","牛腩","青椒","洋葱","蒜","姜"
];

export default function IngredientMode({ user }:{ user: UserContext }) {
  const [ings, setIngs] = useState<string[]>(["鸡胸","西兰花","米饭"]);

  function toggle(x:string){
    setIngs(prev => prev.includes(x) ? prev.filter(i=>i!==x) : [...prev, x]);
  }
  function clear(){ setIngs([]); }

  return (
    <View className="mode ingredients">
      <View className="bar">
        <Text className="bar-title">可用食材</Text>
        <Button size="mini" onClick={clear}>清空</Button>
      </View>

      <View className="chips">
        {SUGGEST_INGS.map(x=>(
          <Text key={x} className={`chip ${ings.includes(x)?"on":""}`} onClick={()=>toggle(x)}>{x}</Text>
        ))}
      </View>

      <View className="hint">只展示“核心食材≥70%被这些食材覆盖”的样本菜（MVP 规则，可调）。</View>

      <RecoPanel user={user} ingredientWhitelist={ings}/>
    </View>
  );
}
