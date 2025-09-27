// src/pages/B2B/components/PublicRecipes.tsx
import { useEffect, useState } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";

type Recipe = {
  id: string;
  title: string;
  thumb?: string;
  category?: string;
  area?: string;
  tags?: string[];
  instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  source?: string;
  youtube?: string;
};

export default function PublicRecipes({
  code,
  ings,
  limit = 4,
}: { code: string; ings?: string[]; limit?: number }) {
  const [list, setList] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function apiBase(): string {
    const fromStorage = Taro.getStorageSync?.("API_BASE");
    return String(fromStorage || "https://harmisa-app.vercel.app");
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await Taro.request({
          url: `${apiBase()}/api/recipes`,
          method: "POST",
          data: { code, limit, ings: (ings||[]).join(",") },
          header: { "Content-Type": "application/json" },
        });
        if (!cancel) {
          const arr = (res.data?.recipes || []) as Recipe[];
          setList(arr);
          if (!arr.length) setErr("暂无公开食谱");
        }
      } catch (e) {
        if (!cancel) { setErr("公开食谱源暂不可用"); setList([]); }
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [code, JSON.stringify(ings), limit]);

  if (loading) return <Text className="muted">正在拉取公开食谱…</Text>;
  if (err && !list.length) return <Text className="muted">{err}</Text>;

  return (
    <View className="public-recipes">
      {list.map(r => (
        <View key={r.id} className="pr-item">
          {r.thumb && <Image className="thumb" src={r.thumb} mode="aspectFill" />}
          <View className="meta">
            <Text className="title">{r.title}</Text>
            <Text className="sub">
              {r.area || r.category ? `${r.area||""} ${r.category||""}`.trim() : "公开食谱"}
              {r.tags?.length ? ` · ${r.tags.slice(0,2).join("/")}` : ""}
            </Text>
            {r.instructions && (
              <Text className="ins">
                {String(r.instructions).replace(/\s+/g," ").slice(0,120)}…
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
