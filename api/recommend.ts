// api/recommend.ts  —— Vercel Serverless 函数（框架无关）
// 文档: https://vercel.com/docs/functions/serverless-functions
import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- 演示数据（后端不可用时兜底返回）
const demoCats = [
  { code:"P-HP-Lite", motivation:"P", name:"高蛋白·清淡", one_line_desc:"增肌恢复，轻负担" },
  { code:"P-LowGI",   motivation:"P", name:"稳糖·低GI",   one_line_desc:"平稳不犯困" },
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
function buildDemoGroups(m?: string) {
  const filtered = m ? demoCats.filter(c => c.motivation === m) : demoCats;
  const categories = filtered.map(c => ({ ...c, items: demoItems.slice(0,3) }));
  const groups = ["P","H","S","E"].map(x => ({
    motivation: x, categories: categories.filter(c => c.motivation === x)
  }));
  return groups;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 允许 GET 直测
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, groups: buildDemoGroups() });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const mot = (req.body && (req.body as any).motivation) as 'P'|'H'|'S'|'E' | undefined;

  // 如果你想连 Supabase，在这段 try 里实现；失败就回退 demo
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('no-supabase-env');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- 下面是最小取数+拼装（表结构按你自己的来）
    const { data: dishRows, error: dishErr } = await supabase.from('dishes').select('*').limit(500);
    if (dishErr) throw dishErr;
    const { data: catRows, error: catErr } = await supabase.from('category_templates')
      .select('*').order('sort_order', { ascending: true });
    if (catErr) throw catErr;

    // 简单把每个模板塞 3 个 demoItems（占位，等你替换真实打分）
    const categories = (catRows||[]).map((tpl:any) => ({
      code: tpl.code, motivation: tpl.motivation, name: tpl.name,
      one_line_desc: tpl.one_line_desc, items: demoItems.slice(0,3)
    }));
    const groups = ["P","H","S","E"].map(x => ({
      motivation: x, categories: categories.filter((c:any)=>c.motivation===x)
    }));
    return res.status(200).json({ groups, source: 'supabase' });
  } catch (err) {
    // 兜底：始终返回 200，确保前端不“点不动”
    return res.status(200).json({ groups: buildDemoGroups(mot), source: 'demo' });
  }
}
