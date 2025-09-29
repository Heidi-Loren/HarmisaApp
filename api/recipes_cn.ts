// api/recipes_cn.ts
// TheMealDB → 全中文输出：标题/做法/配料中文化，单位换算，华氏→摄氏；支持严格中文过滤(forceZh)。
// 可选翻译：DEEPL_API_KEY 或 BAIDU_APPID + BAIDU_KEY；没配就走词典替换 fallback。

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

const THEMEALDB = "https://www.themealdb.com/api/json/v1/1";

// —— 类别 code → TheMealDB 分类/关键词（和你的 12 个标签对齐）
const MAP: Record<string, { categories?: string[]; keywords?: string[] }> = {
  "P-HP-Lite": { categories: ["Chicken", "Seafood", "Beef"], keywords: ["grill","steam","poach","bake"] },
  "P-LowGI": { categories: ["Chicken", "Seafood", "Vegetarian"], keywords: ["bake","steam","stew","salad"] },
  "P-WarmLowOil": { categories: ["Beef","Chicken","Seafood"], keywords: ["soup","stew","braise"] },
  "H-OneBowl": { categories: ["Pasta","Chicken","Vegetarian"], keywords: ["bowl","rice","noodle","pasta"] },
  "H-Homey": { categories: ["Chicken","Beef","Pork","Vegetarian"], keywords: ["home","stew","tomato","egg"] },
  "H-PrepLite": { categories: ["Vegetarian","Breakfast","Chicken"], keywords: ["oat","wrap","salad"] },
  "S-GroupFriendly": { categories: ["Chicken","Beef","Seafood","Vegetarian"], keywords: ["bake","grill","party"] },
  "S-LightSpicy": { categories: ["Chicken","Beef","Seafood","Vegetarian"], keywords: ["chili","spicy","pepper"] },
  "S-SharePlatter": { categories: ["Starter","Side","Vegetarian"], keywords: ["platter","dip","bread","salad"] },
  "E-WarmSoup": { categories: ["Chicken","Beef","Seafood","Vegetarian"], keywords: ["soup","broth","stew"] },
  "E-ComfortCarb": { categories: ["Pasta","Breakfast","Vegetarian"], keywords: ["rice","noodle","pasta","porridge"] },
  "E-Refreshing": { categories: ["Seafood","Vegetarian"], keywords: ["salad","lemon","mint","cucumber"] },
};

// —— “中文食材”→“英文关键词”（用于按今日食材排序）
const ZH2EN: Record<string, string[]> = {
  "鱼": ["fish","salmon","tuna","cod","seabass"],
  "鸡胸": ["chicken breast","chicken"],
  "鸡蛋": ["egg","eggs"],
  "牛肉": ["beef","brisket"],
  "猪肉": ["pork"],
  "虾": ["shrimp","prawn","prawns"],
  "西兰花": ["broccoli"],
  "米饭": ["rice","cooked rice"],
  "面条": ["noodle","noodles","spaghetti","pasta"],
  "豆腐": ["tofu"],
  "番茄": ["tomato","tomatoes"],
  "洋葱": ["onion","onions"],
  "大蒜": ["garlic"],
  "姜": ["ginger"],
};

// —— 术语/食材英→中（在没翻译 Key 时兜底）
const EN2ZH_TERMS: Array<[RegExp, string]> = [
  [/\bchicken breast\b/gi,"鸡胸"], [/\bchicken thighs?\b/gi,"鸡腿肉"], [/\bchicken\b/gi,"鸡肉"],
  [/\bbeef brisket\b/gi,"牛腩"], [/\bbeef\b/gi,"牛肉"], [/\bpork\b/gi,"猪肉"],
  [/\bshrimp(s)?\b/gi,"虾"], [/\bprawn(s)?\b/gi,"虾"], [/\bsalmon\b/gi,"三文鱼"], [/\bfish\b/gi,"鱼"],
  [/\btofu\b/gi,"豆腐"], [/\bnoodle(s)?\b/gi,"面条"], [/\bpasta\b/gi,"意面/面食"], [/\brice\b/gi,"米饭"],
  [/\bgarlic\b/gi,"蒜"], [/\bginger\b/gi,"姜"], [/\bonion(s)?\b/gi,"洋葱"], [/\bcilantro\b/gi,"香菜"],
  [/\bparsley\b/gi,"欧芹"], [/\bcoriander\b/gi,"芫荽"], [/\bscallion(s)?\b/gi,"葱"], [/\bchili(es)?\b/gi,"辣椒"],
  [/\bskillet\b/gi,"平底锅"], [/\bsaucepan\b/gi,"小锅"], [/\bwok\b/gi,"炒锅"], [/\boven\b/gi,"烤箱"],
  [/\bbake(d|s|ing)?\b/gi,"烘烤"], [/\broast(ed|ing)?\b/gi,"烤制"], [/\bbroil(ed|ing)?\b/gi,"上火烤"],
  [/\bgrill(ed|ing)?\b/gi,"炙烤"], [/\bsteam(ed|ing)?\b/gi,"清蒸"], [/\bstew(ed|ing)?\b/gi,"炖煮"],
  [/\bsaute(e|ed|ing)?\b/gi,"煸炒"], [/\bstir[- ]?fry(ing|)?\b/gi,"翻炒"], [/\bboil(ed|ing)?\b/gi,"水煮"],
  [/\bmarinate(d|ing)?\b/gi,"腌制"], [/\bsimmer(ing)?\b/gi,"小火慢煮"],
  [/\bsalad\b/gi,"沙拉"], [/\bsoup\b/gi,"汤"], [/\bstock\b/gi,"高汤/汤底"],
];

const zhify = (s: string) => {
  let t = s || "";
  EN2ZH_TERMS.forEach(([re, cn]) => (t = t.replace(re, cn)));
  // STEP/Min 等兜底
  t = t.replace(/\bSTEP\s+(\d+)/gi, "步骤 $1")
       .replace(/\bmins?\b/gi, "分钟")
       .replace(/\bhours?\b/gi, "小时")
       .replace(/\bmedium heat\b/gi, "中火")
       .replace(/\bhigh heat\b/gi, "大火")
       .replace(/\blow heat\b/gi, "小火");
  return t;
};

const hasHan = (s?: string) => !!s && /[\u4e00-\u9fa5]/.test(s);
const looksEnglishHeavy = (s?: string) => !!s && /[A-Za-z]{3,}/.test(s);

// —— 翻译器：DeepL 优先，其次百度；都没有就 zhify
async function translateBatch(texts: string[]): Promise<string[]> {
  const deepLKey = process.env.DEEPL_API_KEY;
  const baiduAppId = process.env.BAIDU_APPID;
  const baiduKey = process.env.BAIDU_KEY;

  const idx: number[] = [];
  const payload: string[] = [];
  texts.forEach((t, i) => {
    const v = (t || "").trim();
    if (v) { idx.push(i); payload.push(v); }
  });

  async function viaDeepL(): Promise<string[]|null> {
    if (!deepLKey) return null;
    const form = new URLSearchParams();
    payload.forEach((t) => form.append("text", t));
    form.set("target_lang", "ZH");
    form.set("source_lang", "EN");
    const r = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { "Authorization": `DeepL-Auth-Key ${deepLKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out = [...texts];
    j.translations?.forEach((tr: any, k: number) => { out[idx[k]] = tr.text; });
    return out;
  }

  async function viaBaidu(): Promise<string[]|null> {
    if (!baiduAppId || !baiduKey) return null;
    const out = [...texts];
    for (const i of idx) {
      const q = texts[i];
      const salt = Date.now().toString();
      const sign = crypto.createHash("md5").update(baiduAppId + q + salt + baiduKey).digest("hex");
      const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(q)}&from=en&to=zh&appid=${baiduAppId}&salt=${salt}&sign=${sign}`;
      const r = await fetch(url).then(r=>r.json()).catch(()=>null);
      const zh = r?.trans_result?.[0]?.dst as string | undefined;
      out[i] = zh || zhify(q);
    }
    return out;
  }

  const deepl = await viaDeepL(); if (deepl) return deepl;
  const baidu = await viaBaidu(); if (baidu) return baidu;
  return texts.map(t => zhify(t || ""));
}

// —— MealDB 基本请求
async function searchByKeyword(q: string) {
  const j = await fetch(`${THEMEALDB}/search.php?s=${encodeURIComponent(q)}`).then(r=>r.json()).catch(()=>null);
  return j?.meals || [];
}
async function listByCategory(cat: string) {
  const j = await fetch(`${THEMEALDB}/filter.php?c=${encodeURIComponent(cat)}`).then(r=>r.json()).catch(()=>null);
  return j?.meals || [];
}
async function lookupById(id: string) {
  const j = await fetch(`${THEMEALDB}/lookup.php?i=${encodeURIComponent(id)}`).then(r=>r.json()).catch(()=>null);
  return j?.meals?.[0] || null;
}

// —— 解析英文详情
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

// —— 温度/单位/用语本地化
function localizeTemperatureInText(text?: string) {
  if (!text) return "";
  return text.replace(/(\d{2,3})\s*°?\s*F\b/gi, (_m, fStr) => {
    const f = parseInt(String(fStr), 10);
    const c = Math.round(((f - 32) * 5) / 9);
    return `${c}℃`;
  });
}
function roundTo(n: number, step: number) { return Math.round(n/step)*step; }
function parseAmountToken(token: string): number | null {
  const frac: Record<string, number> = { "½":0.5,"¼":0.25,"¾":0.75,"⅓":1/3,"⅔":2/3,"⅛":0.125 };
  token = token.trim();
  if (frac[token] != null) return frac[token];
  const mix = token.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (mix) return +mix[1] + (+mix[2]/+mix[3]);
  const fr  = token.match(/^(\d+)\/(\d+)$/);        if (fr)  return +fr[1]/+fr[2];
  const num = Number(token.replace(/[^0-9.]/g,""));
  return isNaN(num) ? null : num;
}
function trimTrailingZeros(n: number) { return Number.isInteger(n) ? String(n) : String(+n.toFixed(2)); }

function convertSingle(amount: number, unit: string): string | null {
  unit = unit.toLowerCase();
  if (!unit || /piece|slice|clove|pinch|taste/.test(unit)) return `${trimTrailingZeros(amount)} 份`;
  if (["tsp","teaspoon","tsps","teaspoons"].includes(unit)) return `${roundTo(amount*5,1)} 毫升（≈${trimTrailingZeros(amount)} 茶匙）`;
  if (["tbsp","tablespoon","tbsps","tablespoons"].includes(unit)) return `${roundTo(amount*15,1)} 毫升（≈${trimTrailingZeros(amount)} 汤匙）`;
  if (["cup","cups"].includes(unit)) return `${roundTo(amount*240,1)} 毫升（≈${trimTrailingZeros(amount)} 杯）`;
  if (["fl","floz","fl.oz","fl oz","fluidounce","fluidounces"].includes(unit)) return `${roundTo(amount*29.57,1)} 毫升（≈${trimTrailingZeros(amount)} 液体盎司）`;
  if (unit==="ml") return `${trimTrailingZeros(amount)} 毫升`;
  if (["l","liter","litre","liters","litres"].includes(unit)) {
    const ml = amount*1000; return ml>=1000 ? `${roundTo(ml/1000,2)} 升` : `${roundTo(ml,1)} 毫升`;
  }
  if (["oz","ounce","ounces"].includes(unit)) return `${roundTo(amount*28.35,1)} 克（≈${trimTrailingZeros(amount)} 盎司）`;
  if (["lb","lbs","pound","pounds"].includes(unit)) return `${roundTo(amount*453.592,1)} 克（≈${trimTrailingZeros(amount)} 磅）`;
  if (["g","gram","grams"].includes(unit)) return `${trimTrailingZeros(amount)} 克`;
  if (["kg","kilogram","kilograms"].includes(unit)) return `${roundTo(amount*1000,1)} 克`;
  return `${trimTrailingZeros(amount)} ${unit}`.replace(/\bkg\b/gi,"千克").replace(/\bg\b/gi,"克").replace(/\bml\b/gi,"毫升").replace(/\bl\b/gi,"升");
}

function normalizeUnitToCN(measureRaw: string): string {
  if (!measureRaw) return "";
  const m = measureRaw.trim().toLowerCase();

  const range = m.match(/^([\d\s\/½¼¾⅓⅔⅛\.]+)\s*[-–~～]\s*([\d\s\/½¼¾⅓⅔⅛\.]+)\s*([a-zA-Z]+)?/);
  if (range) {
    const a = parseAmountToken(range[1]); const b = parseAmountToken(range[2]); const unit = (range[3]||"").toLowerCase();
    if (a!=null && b!=null) { const L = convertSingle(a,unit); const R = convertSingle(b,unit); if (L && R) return `${L}–${R}`; }
  }
  const single = m.match(/^([\d\s\/½¼¾⅓⅔⅛\.]+)\s*([a-zA-Z]+)?/);
  if (single) { const val = parseAmountToken(single[1]); const unit = (single[2]||"").toLowerCase(); if (val!=null) { const out = convertSingle(val,unit); if (out) return out; } }

  return measureRaw
    .replace(/\btsp\b/gi,"茶匙").replace(/\bteaspoon(s)?\b/gi,"茶匙")
    .replace(/\btbsp\b/gi,"汤匙").replace(/\btablespoon(s)?\b/gi,"汤匙")
    .replace(/\bcup(s)?\b/gi,"杯").replace(/\bfl\.?\s*oz\b/gi,"液体盎司")
    .replace(/\boz\b/gi,"盎司").replace(/\blb(s)?\b/gi,"磅")
    .replace(/\bg\b/gi,"克").replace(/\bkg\b/gi,"千克")
    .replace(/\bml\b/gi,"毫升").replace(/\bl\b/gi,"升");
}

function polishChineseText(s: string) {
  let t = s || "";
  t = t.replace(/\btsp\b/gi,"茶匙").replace(/\btbsp\b/gi,"汤匙").replace(/\bcup(s)?\b/gi,"杯")
       .replace(/\boz\b/gi,"盎司").replace(/\blb(s)?\b/gi,"磅")
       .replace(/\bskillet\b/gi,"平底锅").replace(/\bsaucepan\b/gi,"小锅").replace(/\bwok\b/gi,"炒锅").replace(/\boven\b/gi,"烤箱");
  return t;
}

// —— 今日食材(中文) → 英文关键词
function zhPantryToEN(ingsCSV: string) {
  const raw = ingsCSV.split(",").map(s=>s.trim()).filter(Boolean);
  const out: string[] = [];
  raw.forEach(z => (ZH2EN[z] || [z]).forEach(e => out.push(e.toLowerCase())));
  return Array.from(new Set(out));
}
function uniqBy<T, K extends string|number>(arr: T[], pick: (t:T)=>K) {
  const m = new Map<K, T>(); arr.forEach(it => { const k = pick(it); if (!m.has(k)) m.set(k, it); });
  return Array.from(m.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code   = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit  = Number(method === "GET" ? (req.query.limit || 10) : (req.body?.limit || 10));
  const page   = Number(method === "GET" ? (req.query.page  || 1)  : (req.body?.page  || 1));
  const q      = (method === "GET" ? (req.query.q as string) : (req.body?.q as string)) || "";
  const ingsCSV= (method === "GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "";
  const forceZh= ((method === "GET" ? (req.query.forceZh as string) : (req.body?.forceZh as string)) || "0") === "1";

  const strat = MAP[code] || { categories: ["Chicken","Seafood","Vegetarian"], keywords: ["soup","salad"] };

  try {
    // 1) 拉英文原始
    let poolEN: Recipe[] = [];
    if (q) {
      const meals = await searchByKeyword(q);
      poolEN = meals.map(normalizeEN);
    } else {
      const lists = await Promise.all((strat.categories || ["Chicken"]).map(listByCategory));
      const ids   = uniqBy(lists.flat(), (m:any)=>m.idMeal).map((m:any)=>m.idMeal);
      const start = Math.max(0, (page-1)*limit);
      const idsPage = ids.slice(start, start + limit * 2);
      const details = await Promise.all(idsPage.map((id:string)=>lookupById(id)));
      poolEN = details.filter(Boolean).map(normalizeEN);
    }

    // 2) 关键词轻筛
    const kw = strat.keywords || [];
    if (!q && kw.length) {
      const hasKW = (txt:string) => kw.some(k => (txt||"").toLowerCase().includes(k));
      poolEN = poolEN.filter(r => hasKW(r.title) || hasKW(r.instructions||"") || (r.ingredients||[]).some(x => hasKW(x.name) || hasKW(x.measure)));
    }

    // 3) 今日食材参与排序
    const pantryEN = zhPantryToEN(ingsCSV);
    const scoreEN = (r:Recipe) => {
      if (!pantryEN.length) return 0;
      const set = new Set((r.ingredients||[]).map(x=>x.name.toLowerCase()));
      return pantryEN.reduce((s,k)=>s + (set.has(k) ? 1 : 0), 0);
    };
    poolEN.sort((a,b)=>scoreEN(b)-scoreEN(a));

    // 4) 分页截断
    const start = Math.max(0, (page-1)*limit);
    const pageEN = poolEN.slice(start, start+limit);

    // 5) 一次性翻译：标题 + 做法 + 配料名
    const titles = pageEN.map(r=>r.title||"");
    const ins    = pageEN.map(r=>r.instructions||"");
    const ingNames = pageEN.flatMap(r => (r.ingredients||[]).map(i => i.name || ""));
    const trans  = await translateBatch([...titles, ...ins, ...ingNames]);

    // 6) 组装中文，并做温度/单位本地化
    const zhList: Recipe[] = [];
    let cursor = titles.length + ins.length; // 指向配料名中文的起始下标

    for (let i=0; i<pageEN.length; i++) {
      const r = pageEN[i];
      const titleZh = trans[i] || zhify(r.title);
      const insTr   = trans[titles.length + i] || zhify(r.instructions || "");
      const insTemp = localizeTemperatureInText(insTr);
      const insCN   = polishChineseText(insTemp);

      // 配料名中文 & 用量转换
      const ingsEN  = r.ingredients || [];
      const ingsCN  = ingsEN.map(en => {
        const nameCn = trans[cursor++] || zhify(en.name);
        const mCN    = normalizeUnitToCN(en.measure || "");
        return { name: nameCn, measure: mCN };
      });

      // 严格中文：标题/做法必须含中文，且不大量夹英
      if (forceZh) {
        const ok = hasHan(titleZh) && hasHan(insCN) && !looksEnglishHeavy(titleZh) && !looksEnglishHeavy(insCN);
        if (!ok) continue;
      }

      zhList.push({
        ...r,
        title: titleZh,
        instructions: insCN,
        ingredients: ingsCN,
        source: "mealdb+zh",
      });
    }

    return res.status(200).json({
      code, q, page, limit,
      recipes: zhList,
      has_more: !q && zhList.length === limit,
      source: "mealdb",
    });
  } catch (e:any) {
    return res.status(200).json({ code, recipes: [], error: e?.message || String(e) });
  }
}
