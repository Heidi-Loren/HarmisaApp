import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CategoryTemplate, Dish, UserContext } from "@/lib/types";
import { scoreDish, applyCategoryTemplate } from "@/lib/reco/score";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user: UserContext = body.user; // 前端/服务端已算好的三层向量
  const motTab: "P"|"H"|"S"|"E" | undefined = body.motivation; // 某个动因页签（可选）

  // 1) 拉菜（先拉前几百条即可）
  const { data: dishRows } = await supabase
    .from("dishes")
    .select("*")
    .limit(500);
  const dishes = (dishRows || []) as unknown as Dish[];

  // 2) 拉类别模板（可按动因筛）
  let q = supabase.from("category_templates").select("*").order("sort_order", { ascending: true });
  if (motTab) q = q.eq("motivation", motTab);
  const { data: catRows } = await q;
  const cats = (catRows || []) as unknown as CategoryTemplate[];

  // 3) 先做基础分，截断候选集
  const baseRank = dishes
    .map(d => ({ dish: d, score: scoreDish(d, user) }))
    .filter(x => x.score !== -Infinity)
    .sort((a,b) => b.score - a.score)
    .slice(0, 150); // 候选集

  // 4) 对每个类别模板做再排序，取前3~5
  const categories = cats.map(tpl => {
    const rerank = applyCategoryTemplate(baseRank.map(x => x.dish), tpl, user).slice(0, 5);
    return {
      code: tpl.code,
      motivation: tpl.motivation,
      name: tpl.name,
      one_line_desc: tpl.one_line_desc,
      items: rerank.map(x => ({
        id: x.dish.id,
        name_cn: x.dish.name_cn,
        score: Number(x.score.toFixed(3)),
        substitutions: x.dish.substitutions || {},
        explanation: buildExplanation(x.dish, user) // 你可以换成更复杂的拼接
      }))
    };
  });

  // 5) 前端四个动因Tab：按 motivation 分组
  const grouped = ["P","H","S","E"].map(m => ({
    motivation: m,
    categories: categories.filter(c => c.motivation === m)
  }));

  return NextResponse.json({ groups: grouped });
}

function buildExplanation(d: Dish, u: UserContext) {
  // 最小可解释：取三层各一个高命中关键词（可换更细的模板）
  const pickTop = (v:Record<string,number>) =>
    Object.entries(v||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const c = pickTop(d.fit_vector.constitution);
  const e = pickTop(d.fit_vector.environment);
  const m = pickTop(d.fit_vector.motive);
  return `体质命中：${c||"平衡"}；环境命中：${e||"当季适配"}；动因：${m||"综合"}`;
}
