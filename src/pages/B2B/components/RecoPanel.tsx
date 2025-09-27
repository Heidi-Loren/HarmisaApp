import { useEffect, useMemo, useState } from "react";
import { View, Text, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { UserContext } from "@/lib/types";
import { mockGroups } from "@/data/mockReco";
import { GROUPED_CATEGORY_META } from "@/data/categoryMeta";

type Item = {
  id: string;
  name_cn: string;
  score: number;
  explanation?: string;
  substitutions?: Record<string,string[]>;
  ingredients_core?: string[];
};

type CategoryBlock = {
  code: string;
  motivation: "P"|"H"|"S"|"E";
  name: string;
  one_line_desc?: string;
  items: Item[];
};

type Props = {
  user: UserContext;
  ingredientWhitelist?: string[];
  menuCandidates?: string[];      // 现在 C 端不用，保留兼容
};

function getApiBase(): string {
  const fromStorage = Taro.getStorageSync?.("API_BASE");
  if (fromStorage) return String(fromStorage);
  return "https://harmisa-app.vercel.app";
}
const API_BASE = getApiBase();

export default function RecoPanel({ user, ingredientWhitelist, menuCandidates }: Props) {
  const [tab, setTab] = useState<"P"|"H"|"S"|"E">("P");
  const [serverBlocks, setServerBlocks] = useState<CategoryBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { void fetchTab(tab); /* eslint-disable-next-line */ }, [tab]);

  async function fetchTab(m: "P"|"H"|"S"|"E") {
    setLoading(true);
    setErr(null);
    try {
      // 先 POST
      const res = await Taro.request({
        url: `${API_BASE}/api/recommend`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { user, motivation: m, includeFields: ["ingredients_core"] }
      });
      const ok = res.statusCode >= 200 && res.statusCode < 300 && !!res.data?.groups;
      if (!ok) throw new Error(`POST ${res.statusCode}`);
      const group = (res.data.groups as any[]).find(g => g.motivation === m);
      setServerBlocks(group?.categories || []);
    } catch {
      try {
        // 降级 GET
        const res2 = await Taro.request({ url: `${API_BASE}/api/recommend`, method: "GET" });
        const group2 = (res2.data?.groups as any[] || []).find(g => g.motivation === m);
        setServerBlocks(group2?.categories || []);
      } catch {
        // 最后兜底：mock
        const groups = mockGroups();
        const g = groups.find(x => (x as any).motivation === m) as any;
        setServerBlocks(g?.categories || []);
        setErr("后端未连通，使用演示数据");
      }
    } finally {
      setLoading(false);
    }
  }

  // —— 用元数据补齐：无论后端回多少，前端总是把 3 个动因类目凑齐
  const filledBlocks = useMemo(() => {
    const metas = GROUPED_CATEGORY_META[tab];
    const map = new Map((serverBlocks||[]).map(b => [b.code, b]));
    return metas.map(meta => {
      const hit = map.get(meta.code);
      return hit ? hit : {
        code: meta.code,
        motivation: meta.motivation,
        name: meta.name,
        one_line_desc: meta.one_line_desc,
        items: [] as Item[],
      };
    });
  }, [serverBlocks, tab]);

  // —— 食材/菜单过滤（C 端只用食材；菜单这块等 ToB 再开）
  const filtered = useMemo(() => {
    const norm = (s:string) => (s||"").toLowerCase().replace(/\s+/g,"");
    const menuSet = new Set((menuCandidates||[]).map(norm));
    const hasMenu = menuSet.size > 0;
    const hasPantry = (ingredientWhitelist||[]).length > 0;

    const byPantry = (it: Item) => {
      if (!hasPantry) return true;
      const ings = it.ingredients_core || [];
      if (!ings.length) return true;
      const pantry = new Set(ingredientWhitelist!.map(x => norm(x)));
      const hit = ings.filter(x => pantry.has(norm(x))).length;
      return ings.length === 0 ? true : (hit / ings.length) >= 0.7;
    };

    const byMenu = (it: Item) => {
      if (!hasMenu) return true;
      const n = norm(it.name_cn);
      return menuSet.has(n) || Array.from(menuSet).some(m => n.includes(m) || m.includes(n));
    };

    return (filledBlocks||[]).map(b => ({
      ...b,
      items: (b.items||[]).filter(it => byPantry(it) && byMenu(it))
    }));
  }, [filledBlocks, ingredientWhitelist, menuCandidates]);

  return (
    <View className="reco-panel">
      <View className="mot-tabs sticky">
        {(["P","H","S","E"] as const).map(m =>
          <Button key={m} size="mini" className={tab===m ? "active" : ""} onClick={()=>setTab(m)}>
            {m==="P"?"自护":m==="H"?"习惯":m==="S"?"社交":"情绪"}
          </Button>
        )}
      </View>

      {loading && (
        <View className="skeleton">
          <View className="sk-card" /><View className="sk-card" />
          <Text className="muted">加载中…</Text>
        </View>
      )}

      {!loading && !!filtered.length && (
        <ScrollView scrollY className="cats">
          {filtered.map(cat => (
            <View key={cat.code} className="cat-card">
              <View className="cat-hd">
                <Text className="cat-name">{cat.name}</Text>
                {cat.one_line_desc && <Text className="cat-desc">{cat.one_line_desc}</Text>}
                <Text className="badge">示例</Text>
              </View>
              <View className="items">
                {cat.items?.length ? cat.items.slice(0,5).map((it,i)=>(
                  <View key={it.id} className="item">
                    <Text className="item-name">{i+1}. {it.name_cn}</Text>
                    {it.explanation && <Text className="item-exp">{it.explanation}</Text>}
                    {it.substitutions && !!Object.keys(it.substitutions).length && (
                      <Text className="item-sub">
                        可替换：{
                          Object.entries(it.substitutions).slice(0,2)
                            .map(([k,arr])=>`${k}→${(arr||[]).slice(0,2).join("/")}`).join("；")
                        }
                      </Text>
                    )}
                  </View>
                )) : <Text className="muted">（本类别暂无符合当前候选集的样本菜）</Text>}
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
    </View>
  );
}
