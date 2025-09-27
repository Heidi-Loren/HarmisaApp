// src/pages/B2B/components/RecoPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { UserContext } from "@/lib/types";
import { mockGroups } from "@/data/mockReco";
import { GROUPED_CATEGORY_META } from "@/data/categoryMeta";
import PublicRecipes from "./PublicRecipes";
import CategoryExplorer from "./CategoryExplorer";

type Item = {
  id: string;
  name_cn: string;
  score: number;
  explanation?: string;
  substitutions?: Record<string, string[]>;
  ingredients_core?: string[];
};

type CategoryBlock = {
  code: string;
  motivation: "P" | "H" | "S" | "E";
  name: string;
  one_line_desc?: string;
  items: Item[];
};

type Props = {
  user: UserContext;
  /** 食材模式：今日可用食材（用于公开食谱排序/过滤） */
  ingredientWhitelist?: string[];
  /** 餐厅模式预留 */
  menuCandidates?: string[];
};

function getApiBase(): string {
  const fromStorage = Taro.getStorageSync?.("API_BASE");
  if (fromStorage) return String(fromStorage);
  return "https://harmisa-app.vercel.app";
}
const API_BASE = getApiBase();

export default function RecoPanel({
  user,
  ingredientWhitelist,
  menuCandidates,
}: Props) {
  const [tab, setTab] = useState<"P" | "H" | "S" | "E">("P");
  const [serverBlocks, setServerBlocks] = useState<CategoryBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 全屏浏览器
  const [explore, setExplore] = useState<{ open: boolean; code?: string; title?: string }>({ open: false });

  useEffect(() => {
    void fetchTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /** 拉取某个动因页签下的类别卡片 */
  async function fetchTab(m: "P" | "H" | "S" | "E") {
    setLoading(true);
    setErr(null);
    try {
      // 1) 优先 POST（带 user + motivation）
      const res = await Taro.request({
        url: `${API_BASE}/api/recommend`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { user, motivation: m, includeFields: ["ingredients_core"] },
      });
      const ok =
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        !!(res.data as any)?.groups;
      if (!ok) throw new Error(`POST ${res.statusCode}`);
      const group = ((res.data as any).groups as any[]).find(
        (g) => g.motivation === m
      );
      setServerBlocks((group?.categories || []) as CategoryBlock[]);
    } catch {
      try {
        // 2) 降级 GET（无 body）
        const res2 = await Taro.request({
          url: `${API_BASE}/api/recommend`,
          method: "GET",
        });
        const group2 = ((res2.data as any)?.groups as any[] | undefined)?.find(
          (g) => g.motivation === m
        );
        setServerBlocks((group2?.categories || []) as CategoryBlock[]);
      } catch {
        // 3) 兜底：mock
        const groups = mockGroups();
        const g = groups.find((x: any) => x.motivation === m) as any;
        setServerBlocks((g?.categories || []) as CategoryBlock[]);
        setErr("后端未连通，使用演示数据");
      }
    } finally {
      setLoading(false);
    }
  }

  /** 用元数据补齐固定 3 张类别卡 */
  const filledBlocks = useMemo(() => {
    const metas = GROUPED_CATEGORY_META[tab];
    const map = new Map((serverBlocks || []).map((b) => [b.code, b]));
    return metas.map((meta) => {
      const hit = map.get(meta.code);
      return hit
        ? hit
        : ({
            code: meta.code,
            motivation: meta.motivation,
            name: meta.name,
            one_line_desc: meta.one_line_desc,
            items: [],
          } as CategoryBlock);
    });
  }, [serverBlocks, tab]);

  /** C 端仅食材；菜单保留兼容（不影响渲染） */
  const filtered = useMemo(() => {
    const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "");
    const menuSet = new Set((menuCandidates || []).map(norm));
    const hasMenu = menuSet.size > 0;
    const hasPantry = (ingredientWhitelist || []).length > 0;

    const byPantry = (it: Item) => {
      if (!hasPantry) return true;
      const ings = it.ingredients_core || [];
      if (!ings.length) return true;
      const pantry = new Set((ingredientWhitelist as string[]).map((x) => norm(x)));
      const hit = ings.filter((x) => pantry.has(norm(x))).length;
      return ings.length === 0 ? true : hit / ings.length >= 0.7;
    };

    const byMenu = (it: Item) => {
      if (!hasMenu) return true;
      const n = norm(it.name_cn);
      return (
        menuSet.has(n) ||
        Array.from(menuSet).some((m) => n.includes(m) || m.includes(n))
      );
    };

    return (filledBlocks || []).map((b) => ({
      ...b,
      items: (b.items || []).filter((it) => byPantry(it) && byMenu(it)),
    }));
  }, [filledBlocks, ingredientWhitelist, menuCandidates]);

  return (
    <View className="reco-panel">
      {/* 动因 Tab */}
      <View className="mot-tabs sticky">
        {(["P", "H", "S", "E"] as const).map((m) => (
          <Button
            key={m}
            size="mini"
            className={tab === m ? "active" : ""}
            onClick={() => setTab(m)}
          >
            {m === "P" ? "自护" : m === "H" ? "习惯" : m === "S" ? "社交" : "情绪"}
          </Button>
        ))}
      </View>

      {loading && (
        <View className="skeleton">
          <View className="sk-card" />
          <View className="sk-card" />
          <Text className="muted">加载中…</Text>
        </View>
      )}

      {!loading && !!filtered.length && (
        <ScrollView scrollY className="cats">
          {filtered.map((cat) => (
            <View key={cat.code} className="cat-card">
              <View className="cat-hd">
                <Text className="cat-name">{cat.name}</Text>
                {cat.one_line_desc && (
                  <Text className="cat-desc">{cat.one_line_desc}</Text>
                )}
                <Text className="badge">示例</Text>
              </View>

              {/* ✅ 示例：不再渲染本地 items，直接用中文食谱接口取 3 条 */}
              <View className="items">
                <PublicRecipes code={cat.code} ings={ingredientWhitelist} limit={3} />
              </View>

              {/* 公开食谱 */}
              <View className="divider" />
              <View className="pr-head"><Text>公开食谱</Text></View>
              <PublicRecipes code={cat.code} ings={ingredientWhitelist} limit={4} />

              {/* 查看更多（全屏浏览器） */}
              <View className="more-wrap">
                <Button
                  size="mini"
                  onClick={() => setExplore({ open: true, code: cat.code, title: cat.name })}
                >
                  查看更多食谱
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {!loading && !filtered.length && (
        <View className="empty">
          <Text className="muted">{err || "暂无可展示数据"}</Text>
        </View>
      )}

      {/* 全屏食谱浏览器（搜索/分页/仅看匹配今日食材/加入购物清单） */}
      <CategoryExplorer
        visible={explore.open}
        code={explore.code || ""}
        title={explore.title || ""}
        todayIngs={ingredientWhitelist || []}
        onClose={() => setExplore({ open: false })}
      />
    </View>
  );
}
