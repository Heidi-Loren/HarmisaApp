// src/pages/B2B/components/PublicRecipes.tsx
import { useEffect, useState } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";

type Recipe = { id: string; title: string; thumb?: string; instructions?: string };

/** 标题或正文里必须含中文；否则判为英文，直接隐藏 */
function looksChinese(s?: string) {
  if (!s) return false;
  return /[\u4e00-\u9fa5]/.test(s);
}

export default function PublicRecipes({
  code,
  ings,
  limit = 4,
  forceZhOnly = false,
}: {
  code: string;
  ings?: string[];
  limit?: number;
  /** true 时会过滤掉任何含英文字母且无中文的条目 */
  forceZhOnly?: boolean;
}) {
  const [list, setList] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const apiBase = String(Taro.getStorageSync?.("API_BASE") || "https://harmisa-app.vercel.app");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setHint(null);
      setList([]);
      try {
        const res = await Taro.request({
          url: `${apiBase}/api/recipes_cn`,
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: { code, limit, ings: (ings || []).join(",") },
        });
        let arr = (res.data?.recipes || []) as Recipe[];

        if (forceZhOnly) {
          arr = arr.filter(r => looksChinese(r.title) || looksChinese(r.instructions));
        }

        if (!cancel) {
          setList(arr);
          if (!arr.length) setHint("该标签暂无可展示的中文食谱");
        }
      } catch {
        if (!cancel) {
          setHint("公开食谱源暂不可用");
          setList([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [code, JSON.stringify(ings), limit, forceZhOnly]);

  if (loading) return <Text className="muted">正在拉取食谱…</Text>;

  return (
    <View className="public-recipes">
      {hint && <Text className="muted">{hint}</Text>}
      {list.map((r) => (
        <View key={r.id} className="pr-item">
          {r.thumb && <Image className="thumb" src={r.thumb} mode="aspectFill" />}
          <View className="meta">
            <Text className="title">{r.title}</Text>
            {r.instructions && (
              <Text className="ins">
                {String(r.instructions).replace(/\s+/g, " ").slice(0, 100)}…
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
