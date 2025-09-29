// src/pages/B2B/components/PublicRecipes.tsx
import { useEffect, useState } from "react";
import { View, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";

type Recipe = {
  id: string;
  title: string;
  thumb?: string;
  instructions?: string;
};

/** 含中文判断（标题或正文命中中文即可） */
function looksChinese(s?: string) {
  if (!s) return false;
  return /[\u4e00-\u9fa5]/.test(s);
}

/** 读取 API_BASE（避免可选调用导致编译问题） */
function getApiBase(): string {
  try {
    const v = Taro.getStorageSync("API_BASE");
    if (v) return String(v);
  } catch {}
  return "https://harmisa-app.vercel.app";
}

interface Props {
  code: string;
  ings?: string[];
  limit?: number;
  /** true 时前端再做一次中文过滤（双保险） */
  forceZhOnly?: boolean;
}

export default function PublicRecipes({
  code,
  ings,
  limit = 4,
  forceZhOnly = false,
}: Props) {
  const [list, setList] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const apiBase = getApiBase();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setHint(null);
      setList([]);

      try {
        const res = await Taro.request({
          url: `${apiBase}/api/recipes_cn`,
          method: "POST",
          header: { "Content-Type": "application/json" },
          data: {
            code,
            limit,
            ings: (ings || []).join(","),
            forceZh: 1, // —— 强制后端仅返回中文
          },
        });

        const data: any = (res as any).data || {};
        let arr: Recipe[] = Array.isArray(data.recipes) ? data.recipes : [];

        // 前端再做一次兜底过滤（极端情况下）
        if (forceZhOnly) {
          arr = arr.filter(
            (r) => looksChinese(r.title) || looksChinese(r.instructions)
          );
        }

        if (!cancelled) {
          setList(arr);
          if (!arr.length) setHint("该标签暂无可展示的中文食谱");
        }
      } catch (e) {
        if (!cancelled) {
          setHint("公开食谱源暂不可用");
          setList([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // 只在 code/ings/limit/forceZhOnly 变化时刷新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, (ings || []).join(","), limit, forceZhOnly]);

  if (loading) return <Text className="muted">正在拉取食谱…</Text>;

  return (
    <View className="public-recipes">
      {hint && <Text className="muted">{hint}</Text>}
      {list.map((r) => (
        <View key={r.id} className="pr-item">
          {r.thumb ? (
            <Image className="thumb" src={r.thumb} mode="aspectFill" />
          ) : null}
          <View className="meta">
            <Text className="title">{r.title}</Text>
            {r.instructions ? (
              <Text className="ins">
                {String(r.instructions).replace(/\s+/g, " ").slice(0, 100)}…
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
