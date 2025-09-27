// pages/api/recommend.ts
import type { NextApiRequest, NextApiResponse } from "next";

const cats = [
  { code:"P-HP-Lite", motivation:"P", name:"高蛋白·清淡", one_line_desc:"增肌恢复，轻负担" },
  { code:"P-LowGI",   motivation:"P", name:"稳糖·低GI", one_line_desc:"平稳不犯困" },
  { code:"H-OneBowl", motivation:"H", name:"省事·一碗餐", one_line_desc:"主配齐活" },
  { code:"S-GroupFriendly", motivation:"S", name:"聚餐·通用口味", one_line_desc:"多人适配" },
  { code:"E-WarmSoup", motivation:"E", name:"温热·汤炖", one_line_desc:"安抚系" },
];
const items = [
  { id:"m1", name_cn:"清蒸鱼（少盐）", score:0.92, explanation:"清蒸少油更稳；高蛋白饱腹。",
    substitutions:{ "鱼":["虾","鸡胸"] }, ingredients_core:["鲈鱼","姜","葱"] },
  { id:"m2", name_cn:"西兰花鸡胸碗", score:0.88, explanation:"高蛋白+高纤维，清爽不腻。",
    ingredients_core:["鸡胸","西兰花","米饭"] },
  { id:"m3", name_cn:"番茄牛腩汤", score:0.86, explanation:"温热汤炖，安抚但不过油。",
    ingredients_core:["牛腩","番茄","洋葱"] },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const motivation = (req.body && (req.body as any).motivation) || undefined;
  const filtered = motivation ? cats.filter(c=>c.motivation===motivation) : cats;
  const categories = filtered.map(c => ({ ...c, items: items.slice(0,3) }));
  const groups = ["P","H","S","E"].map(m => ({
    motivation: m,
    categories: categories.filter(c => c.motivation === m)
  }));
  res.status(200).json({ groups });
}
