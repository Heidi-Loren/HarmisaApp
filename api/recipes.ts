// api/recipes.ts —— Vercel Serverless 函数：公开食谱代理（TheMealDB）
// 目标：1) 先按标签分类取；2) 优先用用户食材加分；3) 无结果则去掉食材再取；4) 仍无则关键字兜底。
// 备注：无需鉴权；只要前端请求你的域名即可。

import type { VercelRequest, VercelResponse } from "@vercel/node";

type Recipe = {
  id: string; title: string; thumb?: string;
  category?: string; area?: string; tags?: string[];
  instructions?: string; ingredients?: Array<{ name: string; measure: string }>;
  source?: string; youtube?: string;
};

const THEMEALDB = "https://www.themealdb.com/api/json/v1/1";

// —— 标签到 TheMealDB 分类/关键词的映射（可随时改文案，但 code 不变）
const CAT = {
  "P-HP-Lite":   { categories:["Chicken","Seafood","Beef"], keywords:["grill","steam","bake","poach"] },
  "P-LowGI":     { categories:["Chicken","Seafood","Vegetarian"], keywords:["bake","steam","stew","poach"] },
  "P-WarmLowOil":{ categories:["Chicken","Beef","Seafood"], keywords:["soup","stew","braise"] },

  "H-OneBowl":   { categories:["Pasta","Chicken","Vegetarian"], keywords:["bowl","rice","noodle","pasta"] },
  "H-Homey":     { categories:["Chicken","Beef","Pork","Vegetarian"], keywords:["home","stew","tomato","egg"] },
  "H-PrepLite":  { categories:["Vegetarian","Breakfast","Chicken"], keywords:["oat","salad","wrap"] },

  "S-GroupFriendly": { categories:["Chicken","Beef","Seafood","Vegetarian"], keywords:["bake","grill","party"] },
  "S-LightSpicy":    { categories:["Chicken","Beef","Seafood","Vegetarian"], keywords:["chili","spicy","pepper"] },
  "S-SharePlatter":  { categories:["Starter","Side","Vegetarian"], keywords:["platter","dip","bread","salad"] },

  "E-WarmSoup":     { categories:["Chicken","Beef","Seafood","Vegetarian"], keywords:["soup","broth","stock","stew"] },
  "E-ComfortCarb":  { categories:["Pasta","Breakfast","Vegetarian"], keywords:["rice","noodle","pasta","porridge"] },
  "E-Refreshing":   { categories:["Seafood","Vegetarian"], keywords:["salad","lemon","mint","cucumber"] },
} as const;

// —— 简单的中→英食材映射（来自你界面里的常用素材）
const ZH2EN: Record<string, string[]> = {
  "鸡胸": ["chicken breast","chicken"],
  "鸡蛋": ["egg","eggs"],
  "西兰花": ["broccoli"],
  "胡萝卜": ["carrot","carrots"],
  "番茄": ["tomato","tomatoes"],
  "生菜": ["lettuce"],
  "土豆": ["potato","potatoes"],
  "玉米": ["corn","sweetcorn"],
  "米饭": ["rice","cooked rice"],
  "面条": ["noodle","noodles","spaghetti","pasta"],
  "豆腐": ["tofu","bean curd"],
  "三文鱼": ["salmon"],
  "鲈鱼": ["sea bass","seabass"],
  "鲫鱼": ["carp"],
  "虾": ["shrimp","prawn","prawns"],
  "香菇": ["shiitake","mushroom","mushrooms"],
  "青江菜": ["bok choy","pak choi","cabbage"],
  "牛腩": ["beef brisket","beef"],
  "青椒": ["green pepper","bell pepper","capsicum"],
  "洋葱": ["onion","onions"],
  "蒜": ["garlic"],
  "姜": ["ginger"],
};

function normalizePantry(csv: string | string[] | undefined): string[] {
  const raw = Array.isArray(csv) ? csv : (csv ? String(csv).split(",") : []);
  const out: string[] = [];
  raw.forEach(z => {
    const key = String(z).trim();
    if (!key) return;
    const en = ZH2EN[key] || [key];
    en.forEach(e => out.push(e.toLowerCase()));
  });
  return Array.from(new Set(out));
}

function normalizeRecipe(meal:any): Recipe {
  const ings: Array<{name:string;measure:string}> = [];
  for (let i=1;i<=20;i++){
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && String(name).trim())
      ings.push({ name: String(name).trim(), measure: String(measure||"").trim() });
  }
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    thumb: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
    tags: meal.strTags ? String(meal.strTags).split(",").map((x:string)=>x.trim()).filter(Boolean) : [],
    instructions: meal.strInstructions,
    ingredients: ings,
    source: meal.strSource || undefined,
    youtube: meal.strYoutube || undefined,
  };
}

async function fetchByCategory(cat: string): Promise<any[]> {
  const lst = await fetch(`${THEMEALDB}/filter.php?c=${encodeURIComponent(cat)}`)
    .then(r=>r.json()).then(j=>j.meals||[]);
  const top = lst.slice(0, 25); // 控制数量
  const details = await Promise.all(top.map((m:any) =>
    fetch(`${THEMEALDB}/lookup.php?i=${m.idMeal}`).then(r=>r.json()).then(j=>j.meals?.[0]).catch(()=>null)
  ));
  return details.filter(Boolean);
}

async function searchByKeyword(q: string): Promise<any[]> {
  const lst = await fetch(`${THEMEALDB}/search.php?s=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(j=>j.meals||[]);
  return lst;
}

function score(meal:any, pantryEN: string[], keywords: string[]): number {
  const text = (meal.strInstructions || "").toLowerCase();
  const ingSet = new Set<string>();
  for (let i=1;i<=20;i++){
    const v = (meal[`strIngredient${i}`] || "").toLowerCase(); if (v) ingSet.add(v);
  }
  let s = 0;
  // 食材命中
  pantryEN.forEach(p => { if (ingSet.has(p)) s += 1; });
  // 做法/关键词命中
  keywords.forEach(k => { if (text.includes(k.toLowerCase())) s += 0.5; });
  return s;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  const code = (method === "GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method === "GET" ? (req.query.limit || 4) : (req.body?.limit || 4));
  const strict = String(method === "GET" ? (req.query.strict || "false") : (req.body?.strict || "false")).toLowerCase() === "true";
  const pantryEN = normalizePantry(method === "GET" ? (req.query.ings as string) : (req.body?.ings as string));

  const strat = (CAT as any)[code] || { categories:["Chicken","Seafood","Vegetarian"], keywords:["bake","stew","salad"] };

  try {
    // 1) 先按分类抓
    const byCats = await Promise.all((strat.categories || ["Chicken"]).map(fetchByCategory));
    let candidates = byCats.flat();

    // 2) 打分排序（带食材加分）
    let scored = candidates.map(m => ({ meal: m, s: score(m, pantryEN, strat.keywords || []) }));
    scored.sort((a,b)=>b.s-a.s);

    // 3) 如 strict 且分=0 的剔除；否则保留
    let list = strict ? scored.filter(x => x.s > 0) : scored;

    // 4) 食材太“窄”导致空 → 去掉食材再来一次
    if (!list.length) {
      list = candidates.map(m => ({ meal: m, s: score(m, [], strat.keywords || []) }))
                       .sort((a,b)=>b.s-a.s);
    }

    // 5) 仍不够 → 关键词兜底搜索（soup/salad/noodle…）
    if (!list.length || list.length < limit) {
      const kw = (strat.keywords || ["soup","salad"]).slice(0,3);
      for (const k of kw) {
        const more = await searchByKeyword(k);
        if (more?.length) {
          more.forEach(m => list.push({ meal: m, s: score(m, pantryEN, strat.keywords||[]) }));
        }
      }
      // 去重
      const seen = new Set<string>();
      list = list.filter(x => { const id = String(x.meal.idMeal); if (seen.has(id)) return false; seen.add(id); return true; });
      list.sort((a,b)=>b.s-a.s);
    }

    const out = list.slice(0, Math.max(1, limit)).map(x => normalizeRecipe(x.meal));
    return res.status(200).json({ code, recipes: out, usedPantry: pantryEN, strict });
  } catch (e:any) {
    return res.status(200).json({ code, recipes: [], error: e?.message || String(e) });
  }
}
