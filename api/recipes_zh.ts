// api/recipes_zh.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Recipe = {
  id: string; title: string; thumb?: string;
  category?: string; area?: string; tags?: string[];
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
  "H-PrepLite":  ["轻备餐", "隔夜燕麦", "便当"],
  "S-GroupFriendly": ["多人 聚餐", "家常 大盘", "合菜"],
  "S-LightSpicy":    ["小辣", "青椒 炒肉", "酸辣 汤"],
  "S-SharePlatter":  ["凉菜 拼盘", "沙拉", "蘸酱"],
  "E-WarmSoup":  ["汤", "炖", "粥"],
  "E-ComfortCarb":["软糯 主食", "南瓜 粥", "土豆 泥"],
  "E-Refreshing": ["清爽 凉拌", "柠檬 沙拉", "薄荷"],
};

function parseIngs(yuanliao?: string, tiaoliao?: string) {
  const chunks = [yuanliao, tiaoliao].filter(Boolean) as string[];
  const parts = chunks.join("；").split(/[；;、]/).map(s => s.trim()).filter(Boolean);
  return parts.map(s => {
    const m = s.match(/^(.+?)[\s：:]+(.+)$/);
    return m ? { name: m[1], measure: m[2] } : { name: s, measure: "" };
  });
}

async function callTian(word: string, num = 10, page = 1) {
  const key = process.env.TIANAPI_KEY;
  if (!key) throw new Error("TIANAPI_KEY_MISSING");
  const form = new URLSearchParams();
  form.set("key", key);
  if (word) form.set("word", word);
  form.set("num", String(num));
  form.set("page", String(page));
  const r = await fetch("https://apis.tianapi.com/caipu/index", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const j = await r.json();
  if (j?.code !== 200) return { list: [], has_more: false };
  const arr = (j?.result?.newslist || j?.result?.list || []).map((x: any) => ({
    id: String(x.id ?? x.cp_name ?? x.hash ?? Math.random()),
    title: String(x.cp_name ?? x.name ?? x.title ?? ""),
    thumb: x.picurl || x.pic || x.cover || undefined,
    instructions: String(x.zuofa ?? x.content ?? x.message ?? "").replace(/\s+/g, " ").trim(),
    ingredients: parseIngs(x.yuanliao, x.tiaoliao),
    source: "TianAPI",
  })) as Recipe[];
  // TianAPI 不回总数，这里用“到手条数<请求条数且下一页也空”作为 has_more 的近似
  return { list: arr, has_more: arr.length >= num };
}

function uniqBy<T, K extends string | number>(arr: T[], pick: (t:T)=>K) {
  const m = new Map<K, T>();
  arr.forEach(it => { const k = pick(it); if (!m.has(k)) m.set(k, it); });
  return Array.from(m.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method === "GET" ? (req.query.limit || 10) : (req.body?.limit || 10));
  const page  = Number(method === "GET" ? (req.query.page  || 1)  : (req.body?.page  || 1));
  const q     = (method === "GET" ? (req.query.q as string) : (req.body?.q as string)) || ""; // 额外搜索词
  const ingsCSV = (method === "GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "";
  const ings = ingsCSV.split(",").map(s=>s.trim()).filter(Boolean);

  try {
    const kws = KEYWORDS[code] || ["家常 菜"];
    // 组合：用户搜索词优先，其次标签关键词（取首个）
    const word = q ? q : kws[0];
    let { list, has_more } = await callTian(word, limit, page);

    // 少量加权：食材命中（用料里包含用户 today 的词）
    const hit = (r:Recipe) => {
      const text = (r.ingredients||[]).map(x=>x.name).join(",");
      return ings.reduce((s,z)=> s + (text.includes(z) ? 1 : 0), 0);
    };
    list.sort((a,b)=> hit(b)-hit(a));

    // 去重（跨页去重交给前端；同页去重这里做一次）
    list = uniqBy(list, x => x.id);

    return res.status(200).json({ code, recipes: list, page, has_more, word, source: "tianapi" });
  } catch (e:any) {
    // 兜底：英文库（不分页）
    try {
      const r = await fetch(`${req.headers["x-forwarded-proto"]==="http"?"http":"https"}://${req.headers.host}/api/recipes`, {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ code, limit })
      }).then(r=>r.json());
      return res.status(200).json({ code, recipes: r.recipes || [], page:1, has_more:false, source: "fallback_mealdb" });
    } catch {
      return res.status(200).json({ code, recipes: [], page:1, has_more:false, source: "none" });
    }
  }
}
