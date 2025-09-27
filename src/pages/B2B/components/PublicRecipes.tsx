import { useEffect, useState } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";

type Recipe = { id: string; title: string; thumb?: string; instructions?: string; };

export default function PublicRecipes({
  code, ings, limit = 4
}: { code: string; ings?: string[]; limit?: number }) {
  const [list, setList] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const apiBase = String(Taro.getStorageSync?.("API_BASE") || "https://harmisa-app.vercel.app");

  async function reqZh(preferIngs: boolean) {
    return Taro.request({
      url: `${apiBase}/api/recipes_zh`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { code, limit, ings: preferIngs ? (ings||[]).join(",") : "" }
    });
  }
  async function reqEn() {
    return Taro.request({
      url: `${apiBase}/api/recipes`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { code, limit, ings: "" }
    });
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setHint(null); setList([]);
      try {
        // 1) 中文库 + 食材
        let r = await reqZh(true);
        let arr = (r.data?.recipes || []) as Recipe[];

        // 2) 中文库（不带食材）兜底
        if (!arr.length) {
          r = await reqZh(false);
          arr = (r.data?.recipes || []) as Recipe[];
          if (arr.length) setHint("未命中你选择的食材，展示该标签的通用中文食谱。");
        }

        // 3) 仍然为空 → 英文库兜底
        if (!arr.length) {
          const r2 = await reqEn();
          arr = (r2.data?.recipes || []) as Recipe[];
          if (arr.length) setHint("中文库暂无命中，已为你展示英文公开食谱。");
        }

        if (!cancel) setList(arr);
        if (!arr.length && !cancel) setHint("该标签暂无可展示的公开食谱");
      } catch {
        if (!cancel) { setHint("公开食谱源暂不可用"); setList([]); }
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [code, JSON.stringify(ings), limit]);

  if (loading) return <Text className="muted">正在拉取食谱…</Text>;

  return (
    <View className="public-recipes">
      {hint && <Text className="muted">{hint}</Text>}
      {list.map(r => (
        <View key={r.id} className="pr-item">
          {r.thumb && <Image className="thumb" src={r.thumb} mode="aspectFill" />}
          <View className="meta">
            <Text className="title">{r.title}</Text>
            {r.instructions && <Text className="ins">{String(r.instructions).replace(/\s+/g," ").slice(0,100)}…</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}
