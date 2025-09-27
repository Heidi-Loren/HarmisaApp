// src/app/api/recommend/route.ts
import { NextRequest, NextResponse } from "next/server";

// 让 Next/Vercel 一定用 Node 运行时，且不要静态化
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- 简单演示数据（Supabase 不可用时回退使用）
const demoCats = [
  { code:"P-HP-Lite", motivation:"P", name:"高蛋白·清淡", one_line_desc:"增肌恢复，轻负担" },
  { code:"P-LowGI",   motivation:"P", name:"稳糖·低GI", one_line_desc:"平稳不犯困" },
  { code:"H-OneBowl", motivation:"H", name:"省事·一碗餐", one_line_desc:"主配齐活" },
  { code:"S-GroupFriendly", motivation:"S", name:"聚餐·通用口味", one_line_desc:"多人适配" },
  { code:"E-WarmSoup", motivation:"E", name:"温热·汤炖", one_line_desc:"安抚系" }
];
const demoItems = [
  { id:"m1", name_cn:"清蒸鱼（少盐）", score:0.92, explanation:"清蒸少油更稳；高蛋白饱腹。",
    substitutions:{ "鱼":["虾","鸡胸"] }, ingredients_core:["鲈鱼","姜","葱"] },
  { id:"m2", name_cn:"西兰花鸡胸碗", score:0.88, explanation:"高蛋白+高纤维，清爽不腻。",
    ingredients_core:["鸡胸","西兰花","米饭"] },
  { id:"m3", name_cn:"番茄牛腩汤", score:0.86, explanation:"温热汤炖，安抚但不过油。",
    ingredients_core:["牛腩","番茄","洋葱"] }
];

function buildDemoGroups(motivation?: string) {
  const filtered = motivation ? demoCats.filter(c => c.motivation === motivation) : demoCats;
  const categories = filtered.map(c => ({ ...c, items: demoItems.slice(0,3) }));
  const groups = ["P","H","S","E"].map(m => ({
    motivation: m,
    categories: categories.filter(c => c.motivation === m)
  }));
  return groups;
}

// 方便你直接在浏览器里测通（GET 不带 body）
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "use POST with { user, motivation }",
    groups: buildDemoGroups()
  });
}

export async function POST(req: NextRequest) {
  // 先解析 body 里的 motivation（可选）
  let body: any = {};
  try { body = await req.json(); } catch {}
  const motTab: "P"|"H"|"S"|"E" | undefined = body?.motivation;

  // 如果配置了 Supabase，就走你原来的实时计算逻辑；否则回退 demo
  const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // 回退：不报错，直接返回演示数据，保证 200
    return NextResponse.json({ groups: buildDemoGroups(motTab) });
  }

  // --- 有 Supabase：调用你原来的逻辑（尽量保持不变）
  try {
    const { createClient } = await import("@supabase/supabase-js");
    // 注意：服务端用 service key，运行在 Node 环境
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 按你原来的类型约束（这里用 any 防止路径别名在构建期出错）
    type Vector = Record<string, number>;
    type FitVector = { constitution: Vector; environment: Vector; motive: Vector; };
    type Dish = {
      id: string; name_cn: string; substitutions?: Record<string,string[]>;
      fit_vector: FitVector; ingredients_core?: string[];
      tcm_props?: any; oil_level?: number; spicy_level?: number; sodium_level?: number;
      allergens?: string[]; diet_rules?: string[];
    };
    type UserContext = {
      constitution_vector: Vector; environment_vector: Vector; motive_vector: Vector;
      hard_filters?: { allergens_block?: string[]; diet_rules_required?: string[]; oil_max?: number; spicy_max?: number; sodium_max?: number; }
    };
    type CategoryTemplate = {
      code: string; motivation: "P"|"H"|"S"|"E"; name: string; one_line_desc?: string;
      boost?: FitVector; filters?: any;
    };

    const user: UserContext = body?.user;

    // 拉菜
    const { data: dishRows, error: dishErr } = await supabase.from("dishes").select("*").limit(500);
    if (dishErr) throw dishErr;
    const dishes = (dishRows || []) as unknown as Dish[];

    // 拉类别模板
    let q = supabase.from("category_templates").select("*").order("sort_order", { ascending: true });
    if (motTab) q = q.eq("motivation", motTab);
    const { data: catRows, error: catErr } = await q;
    if (catErr) throw catErr;
    const cats = (catRows || []) as unknown as CategoryTemplate[];

    // 打分（用你之前的最小实现）
    const dot = (p: Vector = {}, q: Vector = {}) =>
      Object.keys(p).reduce((s, k) => s + (p[k] || 0) * (q[k] || 0), 0);

    function scoreDish(d: Dish, u: UserContext, w = { a: 0.4, b: 0.35, c: 0.25 }) {
      // 硬过滤
      if (u?.hard_filters?.allergens_block?.some(a => d.allergens?.includes(a))) return -Infinity;
      if (u?.hard_filters?.diet_rules_required?.some(r => !d.diet_rules?.includes(r))) return -Infinity;
      if (u?.hard_filters?.oil_max !== undefined && (d.oil_level ?? 0) > u.hard_filters.oil_max) return -Infinity;
      if (u?.hard_filters?.spicy_max !== undefined && (d.spicy_level ?? 0) > u.hard_filters.spicy_max) return -Infinity;

      let s = 0;
      s += w.a * dot(d.fit_vector?.constitution, u.constitution_vector);
      s += w.b * dot(d.fit_vector?.environment,  u.environment_vector);
      s += w.c * dot(d.fit_vector?.motive,       u.motive_vector);

      // 轻惩罚示例
      if ((d as any)?.tcm_props?.thermal === "寒" && (u.constitution_vector["阳虚"] ?? 0) > 0.4) s -= 0.3;
      if ((d.sodium_level ?? 0) > (u?.hard_filters?.sodium_max ?? 9)) s -= 0.2;

      return s;
    }

    function addVec(a: Vector = {}, b: Vector = {}) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]); const out: Vector = {};
      keys.forEach(k => (out[k] = (a[k] || 0) + (b[k] || 0)));
      return out;
    }

    function passTemplateFilters(d: Dish, tpl: CategoryTemplate) {
      const f = tpl.filters || {};
      if (f.oil_level?.lte !== undefined && (d.oil_level ?? 0) > f.oil_level.lte) return false;
      if (f.spicy_level?.lte !== undefined && (d.spicy_level ?? 0) > f.spicy_level.lte) return false;
      if (f.sodium_level?.lte !== undefined && (d.sodium_level ?? 0) > f.sodium_level.lte) return false;
      return true;
    }

    function applyCategoryTemplate(list: Dish[], tpl: CategoryTemplate, u: UserContext) {
      const boostedUser: UserContext = {
        ...u,
        constitution_vector: addVec(u.constitution_vector, tpl.boost?.constitution),
        environment_vector:  addVec(u.environment_vector,  tpl.boost?.environment),
        motive_vector:       addVec(u.motive_vector,       tpl.boost?.motive),
      };
      const filtered = list.filter(d => passTemplateFilters(d, tpl));
      return filtered
        .map(d => ({ dish: d, score: scoreDish(d, boostedUser) }))
        .filter(x => x.score !== -Infinity)
        .sort((a, b) => b.score - a.score);
    }

    const baseRank = dishes
      .map(d => ({ dish: d, score: scoreDish(d, user) }))
      .filter(x => x.score !== -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, 150);

    const categories = cats.map(tpl => {
      const rerank = applyCategoryTemplate(baseRank.map(x => x.dish), tpl, user).slice(0, 5);
      return {
        code: tpl.code,
        motivation: tpl.motivation,
        name: tpl.name,
        one_line_desc: (tpl as any).one_line_desc,
        items: rerank.map(x => ({
          id: (x.dish as any).id,
          name_cn: (x.dish as any).name_cn,
          score: Number(x.score.toFixed(3)),
          substitutions: (x.dish as any).substitutions || {},
          ingredients_core: (x.dish as any).ingredients_core || [],
          explanation: buildExplanation(x.dish, user)
        }))
      };
    });

    const grouped = ["P","H","S","E"].map(m => ({
      motivation: m,
      categories: categories.filter(c => c.motivation === m)
    }));

    return NextResponse.json({ groups: grouped });
  } catch (err: any) {
    // 若 Supabase 报错，仍然返回 demo，保证前端不“点不动”
    console.error("[/api/recommend] supabase branch error:", err?.message || err);
    return NextResponse.json({ groups: buildDemoGroups(motTab), error: "fallback_demo" });
  }
}

function buildExplanation(d: any, u: any) {
  const pickTop = (v:Record<string,number>) => Object.entries(v||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const c = pickTop(d?.fit_vector?.constitution);
  const e = pickTop(d?.fit_vector?.environment);
  const m = pickTop(d?.fit_vector?.motive);
  return `体质命中：${c||"平衡"}；环境命中：${e||"当季适配"}；动因：${m||"综合"}`;
}
