// api/recipes.ts  —— Vercel Serverless 函数：把公共食谱源（TheMealDB）统一成你前端要的结构
import type { VercelRequest, VercelResponse } from "@vercel/node";

// 12 个标签到 TheMealDB 的“取数策略”映射（先简单规则，后续随时可调）
const CATEGORY_TO_MEALDB: Record<string, {
  categories?: string[];          // TheMealDB 的分类
  preferIngredients?: string[];   // 偏好食材（英文）
  avoidInstruct?: string[];       // 做法里尽量避免的词
  preferInstruct?: string[];      // 做法里偏好的词
}> = {
  // P 自护
  "P-HP-Lite":   { categories:["Chicken","Seafood","Beef"], preferIngredients:["chicken","beef","fish","salmon","tuna"], avoidInstruct:["deep-fry","deep fry"], preferInstruct:["grill","steam","bake","poach"] },
  "P-LowGI":     { categories:["Chicken","Seafood","Vegetarian"], preferIngredients:["chicken","broccoli","egg","tofu","fish"], avoidInstruct:["sugar","syrup","deep fry"], preferInstruct:["bake","steam","stew","poach"] },
  "P-WarmLowOil":{ categories:["Chicken","Beef","Seafood"], preferIngredients:["ginger","onion","broth","beef","chicken"], avoidInstruct:["deep fry"], preferInstruct:["simmer","stew","braise"] },

  // H 习惯
  "H-OneBowl":   { categories:["Chicken","Pasta","Vegetarian"], preferIngredients:["rice","noodle","pasta","egg","chicken"], avoidInstruct:[], preferInstruct:["boil","stir-fry","bake"] },
  "H-Homey":     { categories:["Chicken","Beef","Pork","Vegetarian"], preferIngredients:["tomato","egg","onion","potato"], avoidInstruct:[], preferInstruct:["stir","stew","simmer"] },
  "H-PrepLite":  { categories:["Vegetarian","Chicken"], preferIngredients:["oat","egg","tofu","salad"], avoidInstruct:["deep fry"], preferInstruct:["bake","mix","chill"] },

  // S 社交
  "S-GroupFriendly": { categories:["Chicken","Beef","Seafood","Vegetarian"], preferIngredients:["chicken","beef","shrimp","rice","noodle"], avoidInstruct:[], preferInstruct:["bake","grill","stir"] },
  "S-LightSpicy":    { categories:["Chicken","Beef","Seafood","Vegetarian"], preferIngredients:["chili","pepper","ginger","garlic"], avoidInstruct:[], preferInstruct:["stir","sauté","marinate"] },
  "S-SharePlatter":  { categories:["Side","Starter","Vegetarian"], preferIngredients:["salad","bread","dip"], avoidInstruct:[], preferInstruct:["mix","bake","grill"] },

  // E 情绪
  "E-WarmSoup":     { categories:["Chicken","Beef","Seafood","Vegetarian"], preferIngredients:["soup","broth","stock","stew"], avoidInstruct:["deep fry"], preferInstruct:["simmer","stew","boil"] },
  "E-ComfortCarb":  { categories:["Pasta","Breakfast","Dessert"], preferIngredients:["rice","noodle","pasta","oat","pumpkin"], avoidInstruct:[], preferInstruct:["bake","boil","simmer"] },
  "E-Refreshing":   { categories:["Seafood","Vegetarian"], preferIngredients:["lemon","mint","cucumber","salad"], avoidInstruct:["deep fry"], preferInstruct:["chill","mix","steam"] },
};

type Recipe = {
  id: string;
  title: string;
  thumb?: string;
  category?: string;
  area?: string;
  tags?: string[];
  instructions?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  source?: string;
  youtube?: string;
};

const THEMEALDB = "https://www.themealdb.com/api/json/v1/1";

// 取分类下的菜，再逐个补全详情
async function fetchMealDbByCategory(cat: string): Promise<any[]> {
  const lst = await fetch(`${THEMEALDB}/filter.php?c=${encodeURIComponent(cat)}`).then(r=>r.json()).then(j=>j.meals||[]);
  // 只取前 20 个避免过慢
  const top = lst.slice(0, 20);
  const details = await Promise.all(top.map((m:any) =>
    fetch(`${THEMEALDB}/lookup.php?i=${m.idMeal}`).then(r=>r.json()).then(j=>j.meals?.[0]).catch(()=>null)
  ));
  return details.filter(Boolean);
}

function normalizeRecipe(meal:any): Recipe {
  const ings: Array<{name:string;measure:string}> = [];
  for (let i=1;i<=20;i++){
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && String(name).trim()) ings.push({ name: String(name).trim(), measure: String(measure||"").trim() });
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

function scoreRecipe(meal: any, pref: {preferIngredients?:string[], avoidInstruct?:string[], preferInstruct?:string[]}) {
  const text = (meal.strInstructions||"").toLowerCase();
  const ings = new Set<string>();
  for (let i=1;i<=20;i++){ const n = (meal[`strIngredient${i}`]||"").toLowerCase(); if(n) ings.add(n); }

  let s = 0;
  pref.preferIngredients?.forEach(k => { if (ings.has(k.toLowerCase())) s += 2; });
  pref.preferInstruct?.forEach(k => { if (text.includes(k.toLowerCase())) s += 1; });
  pref.avoidInstruct?.forEach(k => { if (text.includes(k.toLowerCase())) s -= 2; });
  return s;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || "GET";
  if (!["GET","POST"].includes(method)) return res.status(405).json({ error: "Method Not Allowed" });

  const code = (method==="GET" ? (req.query.code as string) : (req.body?.code as string)) || "";
  const limit = Number(method==="GET" ? (req.query.limit || 5) : (req.body?.limit || 5));
  const ingsCSV = (method==="GET" ? (req.query.ings as string) : (req.body?.ings as string)) || "";
  const userIngs = ingsCSV ? ingsCSV.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean) : [];

  const strat = CATEGORY_TO_MEALDB[code] || { categories:["Chicken","Seafood","Vegetarian"] };

  try {
    // 拉多个分类，合并去重
    const detailLists = await Promise.all((strat.categories||["Chicken"]).map(fetchMealDbByCategory));
    const all = detailLists.flat();

    // 轻权重：用户食材命中 + 预设策略匹配
    const scored = all.map((meal:any) => {
      let s = scoreRecipe(meal, strat);
      // 用户食材命中（若传了）
      if (userIngs.length) {
        let hit = 0;
        for (let i=1;i<=20;i++){
          const n = (meal[`strIngredient${i}`]||"").toLowerCase();
          if (n && userIngs.includes(n)) hit++;
        }
        s += hit; // 每命中 1 个 +1
      }
      return { meal, s };
    });

    // 排序 + 去重（按 id）
    const uniqMap = new Map<string, {meal:any,s:number}>();
    scored.sort((a,b)=>b.s-a.s).forEach(x => {
      if (!uniqMap.has(x.meal.idMeal)) uniqMap.set(x.meal.idMeal, x);
    });

    const top = Array.from(uniqMap.values()).slice(0, Math.max(1, limit));
    const out = top.map(x => normalizeRecipe(x.meal));

    return res.status(200).json({ code, total: out.length, recipes: out });
  } catch (e:any) {
    return res.status(200).json({ code, recipes: [], error: e?.message || String(e) });
  }
}
