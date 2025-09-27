// api/recipes_zh.ts —— 中文食谱（天行数据）代理，统一成前端的 Recipe 结构
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Recipe = {
  id: string; title: string; thumb?: string;
  category?: string; area?: string; tags?: string[];
  instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  source?: string;
};

// 12 个标签 → 中文关键词（可随时微调）
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

// 解析“原料/调料”成统一结构
function parseIngs(yuanliao?: string, tiaoliao?: string) {
  const chunks = [yuanliao, tiaoliao].filter(Boolean) as string[];
  const parts = chunks.join("；").split(/[；;、]/).map(s => s.trim()).filter(Boolean);
  return parts.map(s => {
    // 形如 “鸡胸 200克”
    const m = s.match(/^(.+?)[\s：:]+(.+)$/);
    return m ? { name: m[1], measure: m[2] } : { name: s, measure: "" };
  });
}

async function callTian(word: string, num = 10) {
  const key = process.env.TIANAPI_KEY;
  if (!key) throw new Error("TIANAPI_KEY_MISSING");
  const form = new URLSearchParams();
  form.set("key", key);
  if (word) form.set("word", word);
  form.set("num", String(num));

  const r = await fetch("https://apis.tianapi.com/caipu/index", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const j = await r.json();
  if (j?.code !== 200) return [];
  const arr = j?.result?.newslist || j?.result?.list || [];
  // 不同版本字段名稍有差异，这里做宽松兼容
  return arr.map((x: any) => ({
    id: String(x.id ?? x.cp_name ?? x.hash ?? Math.random()),
    title: String(x.cp_name ?? x.name ?? x.title ?? ""),
    thumb: x.picurl || x.pic || x.cover || undefined,
    instructions: String(x.zuofa ?? x.content ?? x.message ?? "").replace(/\s+/g, " ").trim(),
    ingredients: parseIngs(x.yuanliao, x.tiaoliao),
    source: "TianAPI",
  })) as Recipe[];
}

function uniqBy<T, K extends string | number>(arr: T[], pick: (t:T)=>K) {
  const m = new Map<K, T>();
  arr.forEach(it => { const k = pick(it); if (!m.has(k)) m.set(k, it); });
  return Array.from(m.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method === "GET" ? (req.query.limit || 4) : (req.body?.limit || 4));
  // 你的小程序“可用食材”，中文逗号分隔；命中会加分；如果导致为空会自动放宽
  const ings = ((method === "GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "")
    .split(",").map(s=>s.trim()).filter(Boolean);

  try {
    const kws = KEYWORDS[code] || ["家常 菜"];
    let pool: Recipe[] = [];

    // 1) 逐个关键词抓，合并去重
    for (const w of kws) {
      const part = await callTian(w, 12);
      pool = uniqBy(pool.concat(part), x => x.id);
      if (pool.length >= 20) break;
    }

    // 2) 轻权重排序：做法中是否包含“蒸/炖/汤/辣”等 + 食材词是否出现在用料
    const hit = (text: string, words: string[]) =>
      words.some(k => text.toLowerCase().includes(String(k).toLowerCase()));
    const weights = (r: Recipe) => {
      let s = 0;
      const ins = (r.instructions || "");
      // 根据标签粗略加分（只举例，不同 code 可扩）
      if (code.startsWith("P-HP")) if (hit(ins, ["蒸","清炖","水煮","烤"])) s += 1;
      if (code.includes("LowGI")) if (hit(ins, ["粗粮","全麦","蒸"])) s += 1;
      if (code.startsWith("E-WarmSoup")) if (hit(ins, ["汤","炖"])) s += 1;
      // 食材命中
      const ingText = (r.ingredients||[]).map(x=>x.name).join(",");
      ings.forEach(z => { if (ingText.includes(z)) s += 1; });
      return s;
    };
    pool.sort((a,b)=>weights(b)-weights(a));

    // 3) 若因食材过窄导致 0 条 —— 放宽为“忽略食材打分”的通用列表
    let out = pool.slice(0, Math.max(1, limit));
    if (!out.length) {
      const fallback = await callTian(kws[0] || "家常 菜", 12);
      out = fallback.slice(0, Math.max(1, limit));
    }

    return res.status(200).json({ code, recipes: out, source: "tianapi" });
  } catch (e:any) {
    // 兜底到英文库（保证前端有内容）
    try {
      const r = await fetch(`https://harmisa-app.vercel.app/api/recipes`, { method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ code, limit, ings: "" })
      }).then(r=>r.json());
      return res.status(200).json({ code, recipes: r.recipes || [], source: "fallback_mealdb" });
    } catch {
      return res.status(200).json({ code, recipes: [], source: "none" });
    }
  }
}
