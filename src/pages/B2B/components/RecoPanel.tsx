// src/pages/B2B/components/RecoPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { UserContext } from "@/lib/types";

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
  menuCandidates?: string[];
};

// ---- 只从小程序本地读取 API_BASE，读不到就用你的 vercel 域名
function getApiBase(): string {
  const fromStorage = Taro.getStorageSync?.("API_BASE");
  if (fromStorage) return String(fromStorage);
  return "https://harmisa-app.vercel.app"; // 你的 vercel 地址
}
const API_BASE = getApiBase();

export default function RecoPanel({ user, ingredientWhitelist, menuCandidates }: Props) {
  const [tab, setTab] = useState<"P"|"H"|"S"|"E">("P");
  const [blocks, setBlocks] = useState<CategoryBlock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchTab(tab); /* eslint-disable-next-line */ }, [tab]);

  async function fetchTab(m: "P"|"H"|"S"|"E") {
    if (!API_BASE) {
      Taro.showToast({ title: "API_BASE 未配置", icon: "none" });
      setBlocks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${API_BASE}/api/recommend`,
        method: "POST",
        data: { user, motivation: m, includeFields: ["ingredients_core"] }
      });
      const group = (res.data?.groups || []).find((g:any)=>g.motivation===m);
      setBlocks(group?.categories || []);
    } catch (e) {
      console.error("[RecoPanel] /api/recommend error:", e);
      Taro.showToast({ title: "获取推荐失败", icon: "none" });
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }

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

    return (blocks||[]).map(b => ({
      ...b,
      items: (b.items||[]).filter(it => byPantry(it) && byMenu(it))
    }));
  }, [blocks, ingredientWhitelist, menuCandidates]);

  return (
    <View className="reco-panel">
      <View className="mot-tabs">
        {(["P","H","S","E"] as const).map(m =>
          <Button key={m} size="mini" className={tab===m ? "active" : ""} onClick={()=>setTab(m)}>
            {m==="P"?"自护":m==="H"?"习惯":m==="S"?"社交":"情绪"}
          </Button>
        )}
      </View>

      {loading ? <Text className="muted">加载中…</Text> : (
        <ScrollView scrollY className="cats">
          {(filtered||[]).map(cat => (
            <View key={cat.code} className="cat-card">
              <View className="cat-hd">
                <Text className="cat-name">{cat.name}</Text>
                {cat.one_line_desc && <Text className="cat-desc">{cat.one_line_desc}</Text>}
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
                )) : <Text className="muted">（本类别暂无符合当前候选集的菜）</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
