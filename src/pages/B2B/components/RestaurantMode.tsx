// src/pages/B2B/components/RestaurantMode.tsx
import { useState } from "react";
import { View, Text, Button, Textarea } from "@tarojs/components";
import RecoPanel from "./RecoPanel";
import type { UserContext } from "@/lib/types";

export default function RestaurantMode({ user }:{ user: UserContext }) {
  const [raw, setRaw] = useState<string>("清蒸鲈鱼\n西兰花鸡肉饭\n番茄牛腩汤\n麻婆豆腐\n青椒肉丝");
  const [menu, setMenu] = useState<string[]>(["清蒸鲈鱼","西兰花鸡肉饭","番茄牛腩汤","麻婆豆腐","青椒肉丝"]);

  function applyPaste(){
    const lines = (raw||"")
      .split(/\r?\n/)
      .map(s=>s.trim())
      .filter(Boolean);
    setMenu(Array.from(new Set(lines)));
  }

  return (
    <View className="mode restaurant">
      <View className="bar">
        <Text className="bar-title">门店菜单（每行一个菜名）</Text>
        <Button size="mini" onClick={applyPaste}>应用</Button>
      </View>

      <Textarea
        className="paste"
        value={raw}
        onInput={(e)=>setRaw((e.detail as any).value)}
        placeholder="在此粘贴菜单…"
      />

      <View className="hint">
        将只展示“能与菜单菜名完全匹配或近似包含”的样本菜。后续可升级为 CSV 上传 + 字段映射。
      </View>

      <RecoPanel user={user} menuCandidates={menu}/>
    </View>
  );
}
