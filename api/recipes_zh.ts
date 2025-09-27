// api/recipes_zh.ts —— 中文食谱聚合：TianAPI 优先 → 极速/京东万象 → 英文库(轻量中文化)
// 环境变量：TIANAPI_KEY（必填）；JISUAPI_APPKEY（可选）

import type { VercelRequest, VercelResponse } from "@vercel/node";

type Recipe = {
  id: string; title: string; thumb?: string;
  instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  source?: string;
};

const KEYWORDS: Record<string, string[]> = {
  "P-HP-Lite":   ["清蒸 鸡胸", "清蒸 鱼", "水煮 鸡胸"],
  "P-LowGI":     ["低GI", "粗粮 沙拉", "荞麦 面"],
  "P-WarmLowOil":["清炖", "番茄 牛腩汤", "鸡汤"],
  "H-OneBowl":   ["盖浇饭", "拌面", "一碗饭"],
  "H-Homey":     ["家常 菜", "番茄 炒蛋", "土豆 炖"],
  "H-PrepLite":  ["轻备餐", "隔夜 燕麦", "便当"],
  "S-GroupFriendly": ["聚餐 合菜", "大盘 菜", "分享 拼盘"],
  "S-LightSpicy":    ["小辣", "青椒 炒肉", "酸辣 汤"],
  "S-SharePlatter":  ["凉菜 拼盘", "沙拉", "蘸酱"],
  "E-WarmSoup":  ["汤", "清炖", "粥"],
  "E-ComfortCarb":["软糯 主食", "南瓜 粥", "土豆 泥"],
  "E-Refreshing": ["清爽 凉拌", "柠檬 沙拉", "薄荷"],
};

function parseCnIngs(yuanliao?: string, tiaoliao?: string) {
  const chunks = [yuanliao, tiaoliao].filter(Boolean) as string[];
  const parts = chunks.join("；").split(/[；;、]/).map(s => s.trim()).filter(Boolean);
  return parts.map(s => {
    const m = s.match(/^(.+?)[\s：:]+(.+)$/);
    return m ? { name: m[1], measure: m[2] } : { name: s, measure: "" };
  });
}

function uniqBy<T, K extends string | number>(arr: T[], pick: (t:T)=>K) {
  const m = new Map<K, T>(); arr.forEach(it => { const k = pick(it); if (!m.has(k)) m.set(k, it); });
  return Array.from(m.values());
}

/** —— 1) TianAPI：菜谱查询（官方中文，支持分页） */
async function callTian(word: string, num = 10, page = 1): Promise<Recipe[]> {
  const key = process.env.TIANAPI_KEY;
  if (!key) throw new Error("TIANAPI_KEY_MISSING");
  const form = new URLSearchParams();
  form.set("key", key); if (word) form.set("word", word);
  form.set("num", String(num)); form.set("page", String(page));
  const r = await fetch("https://apis.tianapi.com/caipu/index", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(),
  });
  const j = await r.json();
  if (j?.code !== 200) return [];
  const list = j?.result?.list || j?.result?.newslist || [];
  return list.map((x: any) => ({
    id: String(x.id ?? x.cp_name ?? x.hash ?? Math.random()),
    title: String(x.cp_name ?? x.name ?? x.title ?? ""),
    thumb: x.picurl || x.pic || x.cover || undefined,
    instructions: String(x.zuofa ?? x.content ?? x.message ?? "").replace(/\s+/g, " ").trim(),
    ingredients: parseCnIngs(x.yuanliao, x.tiaoliao),
    source: "tianapi",
  }));
}

/** —— 2) 极速数据/京东万象：菜谱大全（关键词 + start/num 分页） */
async function callJisu(keyword: string, num = 10, page = 1): Promise<Recipe[]> {
  const appkey = process.env.JISUAPI_APPKEY;
  if (!appkey) return [];
  const start = (page - 1) * num;
  const url = `https://api.jisuapi.com/recipe/search?keyword=${encodeURIComponent(keyword)}&num=${num}&start=${start}&appkey=${appkey}`;
  const j = await fetch(url).then(r=>r.json()).catch(()=>null);
  if (!j || j.status !== 0) return [];
  const arr = j.result?.list || [];
  return arr.map((x: any) => ({
    id: String(x.id ?? x.name ?? Math.random()),
    title: String(x.name ?? ""),
    thumb: x.pic || undefined,
    instructions: String(x.content ?? "").replace(/\s+/g," ").trim(),
    ingredients: Array.isArray(x.material)
      ? x.material.map((m:any)=>({ name: m.mname, measure: m.amount || "" }))
      : [],
    source: "jisuapi",
  }));
}

/** —— 3) 英文库兜底（TheMealDB）+ 轻量中文化（常用词典替换） */
const EN2ZH: Array<[RegExp, string]> = [
  [/\bchicken\b/gi, "鸡肉"], [/\bbeef\b/gi, "牛肉"], [/\bpork\b/gi, "猪肉"], [/\bshrimp|prawn(s)?\b/gi, "虾"],
  [/\bsalmon\b/gi, "三文鱼"], [/\bfish\b/gi, "鱼"], [/\bnoodle(s)?\b/gi, "面条"], [/\bpasta\b/gi, "意面/面食"],
  [/\brice\b/gi, "米饭"], [/\bsoup\b/gi, "汤"], [/\bstew|braise(d)?\b/gi, "炖"], [/\bsteam(ed)?\b/gi, "清蒸"],
  [/\bbake(d|ing)?\b/gi, "烤"], [/\bgrill(ed|ing)?\b/gi, "炙烤"], [/\bboil(ed|ing)?\b/gi, "水煮"],
  [/\bgarlic\b/gi, "蒜"], [/\bginger\b/gi, "姜"], [/\bonion(s)?\b/gi, "洋葱"],
];
function zhify(s: string){ let t = s; EN2ZH.forEach(([re,cn])=>{ t = t.replace(re, cn); }); return t; }

async function callMealDB(keyword: string, num = 10): Promise<Recipe[]> {
  // 先按关键词搜，没搜到再按分类补
  const search = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keyword)}`)
    .then(r=>r.json()).then(j=>j.meals||[]).catch(()=>[]);
  const list = search.slice(0, num);
  return list.map((m:any) => {
    // 取前 20 个配料
    const ings: Array<{name:string;measure:string}> = [];
    for (let i=1;i<=20;i++){
      const name = m[`strIngredient${i}`]; const measure = m[`strMeasure${i}`];
      if (name && String(name).trim()) ings.push({ name: zhify(String(name).trim()), measure: String(measure||"").trim() });
    }
    return {
      id: m.idMeal,
      title: zhify(m.strMeal || ""),
      thumb: m.strMealThumb || undefined,
      instructions: m.strInstructions ? zhify(String(m.strInstructions)) : "",
      ingredients: ings,
      source: "mealdb_zh-lite",
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method === "GET" ? (req.query.limit || 10) : (req.body?.limit || 10));
  const page  = Number(method === "GET" ? (req.query.page  || 1)  : (req.body?.page  || 1));
  const q     = (method === "GET" ? (req.query.q as string) : (req.body?.q as string)) || ""; // 额外搜索词
  const ingsCSV = (method === "GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "";
  const ings = ingsCSV.split(",").map(s=>s.trim()).filter(Boolean);

  const kws = KEYWORDS[code] || ["家常 菜"];
  const word = q || kws[0];

  try {
    // 1) TianAPI 优先
    let pool = await callTian(word, limit, page);

    // 2) 如果为 0，尝试 极速/京东万象
    if (!pool.length) pool = await callJisu(word, limit, page);

    // 3) 仍为空，英文库兜底并中文化
    if (!pool.length) pool = await callMealDB(word, limit);

    // 4) 轻排序：命中今日食材加分（标题/用料/做法）
    const hitScore = (r:Recipe) => {
      const text = [r.title, r.instructions, (r.ingredients||[]).map(x=>x.name).join(",")].join("，");
      return ings.reduce((s,z)=> s + (z && text.includes(z) ? 1 : 0), 0);
    };
    pool.sort((a,b)=> hitScore(b) - hitScore(a));

    // 5) 去重 + 截断
    const out = uniqBy(pool, x=>x.id).slice(0, Math.max(1, limit));

    return res.status(200).json({ code, word, page, recipes: out, source: out[0]?.source || "none" });
  } catch (e:any) {
    return res.status(200).json({ code, recipes: [], error: e?.message || String(e) });
  }
}
