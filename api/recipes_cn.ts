// api/recipes_cn.ts
// 仅用 TheMealDB 一个库；服务端把标题/做法/配料翻成中文，并把单位/温度本地化。
// 可选翻译：DEEPL_API_KEY 或 BAIDU_APPID+BAIDU_KEY；无 Key 时用内置词典 fallback。

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

type Recipe = {
  id: string;
  title: string;
  thumb?: string;
  instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  source?: string;
};

// —— 12 个标签 → TheMealDB 的分类/关键词映射（可按需改）
const MAP: Record<string, { categories?: string[]; keywords?: string[] }> = {
  // P 自护
  "P-HP-Lite": { categories: ["Chicken", "Seafood", "Beef"], keywords: ["grill", "steam", "poach", "bake"] },
  "P-LowGI": { categories: ["Chicken", "Seafood", "Vegetarian"], keywords: ["bake", "steam", "stew", "salad"] },
  "P-WarmLowOil": { categories: ["Beef", "Chicken", "Seafood"], keywords: ["soup", "stew", "braise"] },
  // H 习惯
  "H-OneBowl": { categories: ["Pasta", "Chicken", "Vegetarian"], keywords: ["bowl", "rice", "noodle", "pasta"] },
  "H-Homey": { categories: ["Chicken", "Beef", "Pork", "Vegetarian"], keywords: ["home", "stew", "tomato", "egg"] },
  "H-PrepLite": { categories: ["Vegetarian", "Breakfast", "Chicken"], keywords: ["oat", "wrap", "salad"] },
  // S 社交
  "S-GroupFriendly": { categories: ["Chicken", "Beef", "Seafood", "Vegetarian"], keywords: ["bake", "grill", "party"] },
  "S-LightSpicy": { categories: ["Chicken", "Beef", "Seafood", "Vegetarian"], keywords: ["chili", "spicy", "pepper"] },
  "S-SharePlatter": { categories: ["Starter", "Side", "Vegetarian"], keywords: ["platter", "dip", "bread", "salad"] },
  // E 情绪
  "E-WarmSoup": { categories: ["Chicken", "Beef", "Seafood", "Vegetarian"], keywords: ["soup", "broth", "stew"] },
  "E-ComfortCarb": { categories: ["Pasta", "Breakfast", "Vegetarian"], keywords: ["rice", "noodle", "pasta", "porridge"] },
  "E-Refreshing": { categories: ["Seafood", "Vegetarian"], keywords: ["salad", "lemon", "mint", "cucumber"] },
};

const THEMEALDB = "https://www.themealdb.com/api/json/v1/1";

// —— 中文食材→英文粗映射（用于“今日食材”排序）
const ZH2EN: Record<string, string[]> = {
  "鱼": ["fish", "salmon", "tuna", "cod", "seabass"],
  "鸡胸": ["chicken breast", "chicken"],
  "鸡蛋": ["egg", "eggs"],
  "牛肉": ["beef", "brisket"],
  "猪肉": ["pork"],
  "虾": ["shrimp", "prawn", "prawns"],
  "西兰花": ["broccoli"],
  "米饭": ["rice", "cooked rice"],
  "面条": ["noodle", "noodles", "spaghetti", "pasta"],
  "豆腐": ["tofu"],
  "番茄": ["tomato", "tomatoes"],
  "洋葱": ["onion", "onions"],
  "大蒜": ["garlic"],
  "姜": ["ginger"],
};

// —— 术语&食材“英→中”词典（标题/做法/配料名用）
const EN2ZH_TERMS: Array<[RegExp, string]> = [
  // 常见食材
  [/\bchicken breast\b/gi, "鸡胸"], [/\bchicken thighs?\b/gi, "鸡腿肉"], [/\bchicken\b/gi, "鸡肉"],
  [/\bbeef brisket\b/gi, "牛腩"], [/\bbeef\b/gi, "牛肉"], [/\bpork\b/gi, "猪肉"],
  [/\bshrimp(s)?\b/gi, "虾"], [/\bprawn(s)?\b/gi, "虾"], [/\bsalmon\b/gi, "三文鱼"], [/\bfish\b/gi, "鱼"],
  [/\btofu\b/gi, "豆腐"], [/\bnoodle(s)?\b/gi, "面条"], [/\bpasta\b/gi, "意面/面食"], [/\brice\b/gi, "米饭"],
  [/\bgarlic\b/gi, "蒜"], [/\bginger\b/gi, "姜"], [/\bonion(s)?\b/gi, "洋葱"], [/\bcilantro\b/gi, "香菜"], [/\bparsley\b/gi, "欧芹"],
  [/\bcoriander\b/gi, "芫荽"], [/\bscallion(s)?\b/gi, "葱"], [/\bchili(es)?\b/gi, "辣椒"],
  // 工具/方式
  [/\bskillet\b/gi, "平底锅"], [/\bsaucepan\b/gi, "小锅"], [/\bwok\b/gi, "炒锅"], [/\boven\b/gi, "烤箱"],
  [/\bbake(d|s|ing)?\b/gi, "烘烤"], [/\broast(ed|ing)?\b/gi, "烤制"], [/\bbroil(ed|ing)?\b/gi, "上火烤"],
  [/\bgrill(ed|ing)?\b/gi, "炙烤"], [/\bsteam(ed|ing)?\b/gi, "清蒸"], [/\bstew(ed|ing)?\b/gi, "炖煮"],
  [/\bsaute(e|ed|ing)?\b/gi, "煸炒"], [/\bstir[- ]?fry(ing|)?\b/gi, "翻炒"], [/\bboil(ed|ing)?\b/gi, "水煮"],
  [/\bmarinate(d|ing)?\b/gi, "腌制"], [/\bsimmer(ing)?\b/gi, "小火慢煮"],
  // 其他
  [/\bsalad\b/gi, "沙拉"], [/\bsoup\b/gi, "汤"], [/\bstock\b/gi, "高汤/高汤底"],
];

// —— 轻量中文替换（无翻译 API 时使用）
function zhify(s: string) {
  let t = s || "";
  EN2ZH_TERMS.forEach(([re, cn]) => (t = t.replace(re, cn)));
  return t;
}

// —— 翻译器（DeepL 优先，次选百度；都没有就 zhify）
async function translateBatch(texts: string[]): Promise<string[]> {
  const deepLKey = process.env.DEEPL_API_KEY;
  const baiduAppId = process.env.BAIDU_APPID;
  const baiduKey = process.env.BAIDU_KEY;

  const idx: number[] = [];
  const payload: string[] = [];
  texts.forEach((t, i) => {
    const v = (t || "").trim();
    if (v) {
      idx.push(i);
      payload.push(v);
    }
  });

  async function viaDeepL(): Promise<string[] | null> {
    if (!deepLKey) return null;
    const form = new URLSearchParams();
    payload.forEach((t) => form.append("text", t));
    form.set("target_lang", "ZH");
    form.set("source_lang", "EN");
    const r = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${deepLKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out = [...texts];
    j.translations?.forEach((tr: any, k: number) => {
      out[idx[k]] = tr.text;
    });
    return out;
  }

  async function viaBaidu(): Promise<string[] | null> {
    if (!baiduAppId || !baiduKey) return null;
    const out = [...texts];
    for (const i of idx) {
      const q = texts[i];
      const salt = Date.now().toString();
      const sign = crypto.createHash("md5").update(baiduAppId + q + salt + baiduKey).digest("hex");
      const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
        q
      )}&from=en&to=zh&appid=${baiduAppId}&salt=${salt}&sign=${sign}`;
      const r = await fetch(url).then((r) => r.json()).catch(() => null);
      const zh = r?.trans_result?.[0]?.dst as string | undefined;
      out[i] = zh || zhify(q);
    }
    return out;
  }

  const deepl = await viaDeepL();
  if (deepl) return deepl;
  const baidu = await viaBaidu();
  if (baidu) return baidu;
  return texts.map((t) => zhify(t || ""));
}

// —— TheMealDB 基础请求
async function searchByKeyword(q: string): Promise<any[]> {
  const j = await fetch(`${THEMEALDB}/search.php?s=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => null);
  return j?.meals || [];
}
async function listByCategory(cat: string): Promise<any[]> {
  const j = await fetch(`${THEMEALDB}/filter.php?c=${encodeURIComponent(cat)}`).then((r) => r.json()).catch(() => null);
  return j?.meals || []; // 只有 id/name/thumb，需要再 lookup
}
async function lookupById(id: string): Promise<any | null> {
  const j = await fetch(`${THEMEALDB}/lookup.php?i=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
  return j?.meals?.[0] || null;
}

// —— 解析配料（英文原始）
function normalizeEN(meal: any): Recipe {
  const ings: Array<{ name: string; measure: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && String(name).trim()) ings.push({ name: String(name).trim(), measure: String(measure || "").trim() });
  }
  return {
    id: meal.idMeal,
    title: meal.strMeal || "",
    thumb: meal.strMealThumb || undefined,
    instructions: (meal.strInstructions || "").toString(),
    ingredients: ings,
    source: "mealdb",
  };
}

// —— “今日食材”（中文）→ 英文关键词
function zhPantryToEN(ingsCSV: string): string[] {
  const raw = ingsCSV.split(",").map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  raw.forEach((z) => (ZH2EN[z] || [z]).forEach((e) => out.push(e.toLowerCase())));
  return Array.from(new Set(out));
}

function uniqBy<T, K extends string | number>(arr: T[], pick: (t: T) => K) {
  const m = new Map<K, T>();
  arr.forEach((it) => {
    const k = pick(it);
    if (!m.has(k)) m.set(k, it);
  });
  return Array.from(m.values());
}

/* =========================
 *  单位/温度 本地化工具集
 * ========================= */

// 将 “1 1/2”、“½”、“1-2”、“1–2” 这类解析为数值或区间
function parseAmountToken(token: string): number | null {
  const fracMap: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };
  token = token.trim();
  if (fracMap[token] != null) return fracMap[token];
  // 1 1/2
  const mix = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mix) return parseInt(mix[1]) + parseInt(mix[2]) / parseInt(mix[3]);
  // 3/4
  const fr = token.match(/^(\d+)\/(\d+)$/);
  if (fr) return parseInt(fr[1]) / parseInt(fr[2]);
  // decimal
  const num = Number(token.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

function normalizeUnitToCN(measureRaw: string): string {
  if (!measureRaw) return "";
  const m = measureRaw.trim();

  // 语义化词
  const txt = m.toLowerCase();
  if (/to taste|适量/.test(txt)) return "适量";
  if (/pinch/.test(txt)) return "少许";
  if (/clove(s)?/.test(txt)) return m.replace(/clove(s)?/i, "瓣");
  if (/slice(s)?/.test(txt)) return m.replace(/slice(s)?/i, "片");
  if (/piece(s)?/.test(txt)) return m.replace(/piece(s)?/i, "块");
  if (/fillet(s)?/.test(txt)) return m.replace(/fillet(s)?/i, "鱼片/肉片");

  // 区间
  const range = txt.match(/^([\d\s\/½¼¾⅓⅔⅛\.]+)\s*[-–~～]\s*([\d\s\/½¼¾⅓⅔⅛\.]+)\s*([a-zA-Z]+)?/);
  if (range) {
    const a = parseAmountToken(range[1]); const b = parseAmountToken(range[2]);
    const unit = (range[3] || "").toLowerCase();
    if (a != null && b != null) {
      const left = convertSingle(a, unit);
      const right = convertSingle(b, unit);
      if (left && right) return `${left}–${right}`;
    }
  }

  // 单值 “1 1/2 cup” / “½ cup”
  const single = txt.match(/^([\d\s\/½¼¾⅓⅔⅛\.]+)\s*([a-zA-Z]+)?/);
  if (single) {
    const val = parseAmountToken(single[1]);
    const unit = (single[2] || "").toLowerCase();
    if (val != null) {
      const out = convertSingle(val, unit);
      if (out) return out;
    }
  }

  // 没有数值：只做单位词替换
  return m
    .replace(/\btsp\b/gi, "茶匙")
    .replace(/\bteaspoon(s)?\b/gi, "茶匙")
    .replace(/\btbsp\b/gi, "汤匙")
    .replace(/\btablespoon(s)?\b/gi, "汤匙")
    .replace(/\bcup(s)?\b/gi, "杯")
    .replace(/\bfl\.?\s*oz\b/gi, "液体盎司")
    .replace(/\boz\b/gi, "盎司")
    .replace(/\blb(s)?\b/gi, "磅")
    .replace(/\bg\b/gi, "克")
    .replace(/\bkg\b/gi, "千克")
    .replace(/\bml\b/gi, "毫升")
    .replace(/\bl\b/gi, "升");
}

function convertSingle(amount: number, unit: string): string | null {
  // 标准化
  unit = unit.toLowerCase();
  if (!unit || /piece|slice|clove|pinch|taste/.test(unit)) {
    // 无单位或语义单位，保留原意
    return `${trimTrailingZeros(amount)} 份`;
  }

  // 容积 → 毫升
  if (unit === "tsp" || unit === "teaspoon" || unit === "tsps" || unit === "teaspoons")
    return `${roundTo(amount * 5, 1)} 毫升（≈${trimTrailingZeros(amount)} 茶匙）`;
  if (unit === "tbsp" || unit === "tablespoon" || unit === "tbsps" || unit === "tablespoons")
    return `${roundTo(amount * 15, 1)} 毫升（≈${trimTrailingZeros(amount)} 汤匙）`;
  if (unit === "cup" || unit === "cups")
    return `${roundTo(amount * 240, 1)} 毫升（≈${trimTrailingZeros(amount)} 杯）`;
  if (unit === "fl" || unit === "floz" || unit === "fl.oz" || unit === "fl oz" || unit === "fluidounce" || unit === "fluidounces")
    return `${roundTo(amount * 29.57, 1)} 毫升（≈${trimTrailingZeros(amount)} 液体盎司）`;
  if (unit === "ml") return `${trimTrailingZeros(amount)} 毫升`;
  if (unit === "l" || unit === "liter" || unit === "litre" || unit === "liters" || unit === "litres") {
    const ml = amount * 1000;
    return ml >= 1000 ? `${roundTo(ml / 1000, 2)} 升` : `${roundTo(ml, 1)} 毫升`;
  }

  // 质量 → 克
  if (unit === "oz" || unit === "ounce" || unit === "ounces")
    return `${roundTo(amount * 28.35, 1)} 克（≈${trimTrailingZeros(amount)} 盎司）`;
  if (unit === "lb" || unit === "lbs" || unit === "pound" || unit === "pounds")
    return `${roundTo(amount * 453.592, 1)} 克（≈${trimTrailingZeros(amount)} 磅）`;
  if (unit === "g" || unit === "gram" || unit === "grams") return `${trimTrailingZeros(amount)} 克`;
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms")
    return `${roundTo(amount * 1000, 1)} 克`;

  // 未识别单位：直接显示原单位（英文→中文名）
  return `${trimTrailingZeros(amount)} ${unit}`
    .replace(/\bkg\b/gi, "千克")
    .replace(/\bg\b/gi, "克")
    .replace(/\bml\b/gi, "毫升")
    .replace(/\bl\b/gi, "升");
}

function trimTrailingZeros(n: number) {
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}

// 把文本中的华氏温度替换为摄氏（如 375°F → 190℃）
function localizeTemperatureInText(text?: string): string {
  if (!text) return "";
  return text.replace(/(\d{2,3})\s*°?\s*F\b/gi, (_m, fStr) => {
    const f = parseInt(String(fStr), 10);
    const c = Math.round(((f - 32) * 5) / 9);
    return `${c}℃`;
  });
}

// 指令文本里常见英文单位/用具补充替换（翻译残留兜底）
function polishChineseText(s: string): string {
  let t = s || "";
  t = t.replace(/\btsp\b/gi, "茶匙")
       .replace(/\btbsp\b/gi, "汤匙")
       .replace(/\bcup(s)?\b/gi, "杯")
       .replace(/\boz\b/gi, "盎司")
       .replace(/\blb(s)?\b/gi, "磅")
       .replace(/\bskillet\b/gi, "平底锅")
       .replace(/\bsaucepan\b/gi, "小锅")
       .replace(/\bwok\b/gi, "炒锅")
       .replace(/\boven\b/gi, "烤箱");
  return t;
}

// 把配料表做“中文名 + 中国习惯单位”本地化
function localizeIngredients(ings: Array<{ name: string; measure: string }>): Array<{ name: string; measure: string }> {
  return (ings || []).map((it) => {
    const nameCN = zhify(it.name);
    const mCN = normalizeUnitToCN(it.measure || "");
    return { name: nameCN, measure: mCN };
  });
}

/* =========================
 *        处理入口
 * ========================= */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method === "GET" ? (req.query.limit || 10) : (req.body?.limit || 10));
  const page = Number(method === "GET" ? (req.query.page || 1) : (req.body?.page || 1));
  const q = (method === "GET" ? (req.query.q as string) : (req.body?.q as string)) || "";
  const ingsCSV = (method === "GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "";

  const strat = MAP[code] || { categories: ["Chicken", "Seafood", "Vegetarian"], keywords: ["soup", "salad"] };

  try {
    let poolEN: Recipe[] = [];
    if (q) {
      // 关键词搜索：直接返回详情
      const meals = await searchByKeyword(q);
      poolEN = meals.map(normalizeEN);
    } else {
      // 按分类列举 ID，再分页拿详情
      const lists = await Promise.all((strat.categories || ["Chicken"]).map(listByCategory));
      const ids = uniqBy(lists.flat(), (m: any) => m.idMeal).map((m: any) => m.idMeal);
      const start = Math.max(0, (page - 1) * limit);
      const idsPage = ids.slice(start, start + limit * 2); // 多取一些，便于后续过滤排序
      const details = await Promise.all(idsPage.map((id: string) => lookupById(id)));
      poolEN = details.filter(Boolean).map(normalizeEN);
    }

    // 轻筛选（关键词策略）
    const kw = strat.keywords || [];
    if (!q && kw.length) {
      const hasKW = (txt: string) => kw.some((k) => (txt || "").toLowerCase().includes(k));
      poolEN = poolEN.filter(
        (r) =>
          hasKW(r.title) ||
          hasKW(r.instructions || "") ||
          (r.ingredients || []).some((x) => hasKW(x.name) || hasKW(x.measure))
      );
    }

    // 用“今日食材”参与排序
    const pantryEN = zhPantryToEN(ingsCSV);
    const scoreEN = (r: Recipe) => {
      if (!pantryEN.length) return 0;
      const ingSet = new Set((r.ingredients || []).map((x) => x.name.toLowerCase()));
      return pantryEN.reduce((s, k) => s + (ingSet.has(k) ? 1 : 0), 0);
    };
    poolEN.sort((a, b) => scoreEN(b) - scoreEN(a));

    // 分页截断
    const start = Math.max(0, (page - 1) * limit);
    const pageEN = poolEN.slice(start, start + limit);

    // —— 翻译标题/做法
    const texts = pageEN.flatMap((r) => [r.title, r.instructions || ""]);
    const translated = await translateBatch(texts);

    // —— 温度/单位/术语本地化
    const zhList: Recipe[] = pageEN.map((r, i) => {
      const titleZh = translated[i * 2] || zhify(r.title);
      const insEn = r.instructions || "";
      const insTr = translated[i * 2 + 1] || zhify(insEn);
      const insTemp = localizeTemperatureInText(insTr);
      const insPolished = polishChineseText(insTemp);
      const ingsZh = localizeIngredients(r.ingredients || []);
      return {
        ...r,
        title: titleZh,
        instructions: insPolished,
        ingredients: ingsZh,
        source: "mealdb+zh",
      };
    });

    return res.status(200).json({
      code,
      q,
      page,
      limit,
      recipes: zhList,
      has_more: !q && zhList.length === limit, // 近似
      source: "mealdb",
    });
  } catch (e: any) {
    return res.status(200).json({ code, recipes: [], error: e?.message || String(e) });
  }
}
