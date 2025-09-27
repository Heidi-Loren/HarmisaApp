// src/pages/B2B/components/CategoryExplorer.tsx
import { useEffect, useState } from "react";
import { View, Text, Input, Button, ScrollView, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { addItems, readShoppingList, clearShopping, removeItem } from "@/utils/pantry/shopping";

type Recipe = {
  id: string; title: string; thumb?: string; instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
};

export default function CategoryExplorer({
  visible, code, title, todayIngs, onClose
}: { visible: boolean; code: string; title: string; todayIngs: string[]; onClose: ()=>void }) {
  const apiBase = String(Taro.getStorageSync?.("API_BASE") || "https://harmisa-app.vercel.app");
  const [q, setQ] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Recipe[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState(readShoppingList());

  useEffect(() => { if (visible) resetAndFetch(); }, [visible, code]);

  function resetAndFetch() {
    setPage(1); setList([]); setHasMore(true); void fetchPage(1, false);
  }

  async function fetchPage(p: number, append = true) {
    if (!visible || loading || (!hasMore && append)) return;
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${apiBase}/api/recipes_zh`,
        method: "POST",
        header: { "Content-Type":"application/json" },
        data: {
          code, page: p, limit: 10,
          q: q.trim(),
          ings: onlyToday ? todayIngs.join(",") : ""
        }
      });
      const arr = (res.data?.recipes || []) as Recipe[];
      setHasMore(!!res.data?.has_more && arr.length > 0);
      setList(prev => append ? prev.concat(arr) : arr);
      setPage(p);
    } finally { setLoading(false); }
  }

  function addRecipeToCart(r: Recipe) {
    const names = (r.ingredients || []).map(x => x.name).filter(Boolean);
    addItems(names);
    setShop(readShoppingList());
    Taro.showToast({ title: "已加入购物清单", icon: "none" });
  }

  if (!visible) return null;

  return (
    <View className="cat-explorer">
      <View className="ex-hdr">
        <Text className="title">{title}</Text>
        <Button size="mini" onClick={onClose}>关闭</Button>
      </View>

      <View className="ex-toolbar">
        <Input
          className="ipt" value={q} placeholder="搜菜名/做法关键词"
          confirmType="search"
          onInput={e=>setQ((e.detail as any).value)}
          onConfirm={()=>resetAndFetch()}
        />
        <Button size="mini" onClick={()=>resetAndFetch()}>搜索</Button>
        <Button size="mini" className={onlyToday ? "primary": ""} onClick={()=>{ setOnlyToday(!onlyToday); setTimeout(resetAndFetch,0); }}>
          仅看匹配今日食材
        </Button>
      </View>

      <ScrollView scrollY className="ex-list" onScrollToLower={()=>fetchPage(page+1,true)}>
        {list.map(r => (
          <View key={r.id} className="ex-item">
            {r.thumb && <Image className="thumb" src={r.thumb} mode="aspectFill" />}
            <View className="meta">
              <Text className="name">{r.title}</Text>
              {r.instructions && <Text className="ins">{String(r.instructions).replace(/\s+/g," ").slice(0,120)}…</Text>}
              {!!r.ingredients?.length && (
                <Text className="ings">用料：{r.ingredients.slice(0,6).map(x=>x.name).join("、")}{r.ingredients.length>6?"…":""}</Text>
              )}
              <View className="ops">
                <Button size="mini" onClick={()=>addRecipeToCart(r)}>加入购物清单</Button>
              </View>
            </View>
          </View>
        ))}
        {loading && <Text className="muted pad">加载中…</Text>}
        {!loading && !list.length && <Text className="muted pad">暂无结果，试试改下搜索词或关闭“仅看匹配今日食材”</Text>}
        {!loading && !!list.length && !hasMore && <Text className="muted pad">已经到底了</Text>}
      </ScrollView>

      <View className="ex-cart">
        <Text className="cart-title">购物清单（{shop.length}）</Text>
        <ScrollView scrollY className="cart-list">
          {shop.map(s => (
            <View key={s.name} className="cart-item">
              <Text>{s.name} ×{s.count||1}</Text>
              <Text className="rm" onClick={()=>{ removeItem(s.name); setShop(readShoppingList()); }}>移除</Text>
            </View>
          ))}
          {!shop.length && <Text className="muted">（还没有添加）</Text>}
        </ScrollView>
        <View className="cart-ops">
          <Button size="mini" onClick={()=>{ clearShopping(); setShop([]); }}>清空</Button>
        </View>
      </View>
    </View>
  );
}
