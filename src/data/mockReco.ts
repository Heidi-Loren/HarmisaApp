// src/data/mockReco.ts
export type MockItem = {
  id: string; name_cn: string; score: number;
  explanation?: string; substitutions?: Record<string,string[]>;
  ingredients_core?: string[];
};
export type MockBlock = {
  code: string; motivation: "P"|"H"|"S"|"E"; name: string; one_line_desc?: string;
  items: MockItem[];
};

const itemsP: MockItem[] = [
  { id:"m1", name_cn:"清蒸鱼（少盐）", score:0.92,
    explanation:"今日湿热偏高，清蒸少油更稳；高蛋白饱腹。",
    substitutions:{ "鱼":["虾","鸡胸"] }, ingredients_core:["鲈鱼","姜","葱"] },
  { id:"m2", name_cn:"西兰花鸡胸碗", score:0.88,
    explanation:"高蛋白+高纤维，清爽不腻。", ingredients_core:["鸡胸","西兰花","米饭"] },
  { id:"m3", name_cn:"豆腐青菜汤", score:0.81, explanation:"清淡易消化，补充蛋白与水分。",
    ingredients_core:["豆腐","青江菜"] },
];
const itemsH: MockItem[] = [
  { id:"m4", name_cn:"番茄鸡蛋盖饭", score:0.83, explanation:"家常味，低决策成本。",
    ingredients_core:["番茄","鸡蛋","米饭"] },
  { id:"m5", name_cn:"咖喱鸡腿饭（少油）", score:0.8, explanation:"一碗餐，饱腹稳定。",
    ingredients_core:["鸡腿","土豆","米饭"] },
];
const itemsS: MockItem[] = [
  { id:"m6", name_cn:"清炒时蔬拼盘", score:0.75, explanation:"通用口味，适合分享。",
    ingredients_core:["西兰花","胡萝卜"] },
  { id:"m7", name_cn:"小辣口水鸡（少油）", score:0.74, explanation:"轻度刺激，开胃不重口。",
    ingredients_core:["鸡腿","辣椒"] },
];
const itemsE: MockItem[] = [
  { id:"m8", name_cn:"番茄牛腩汤", score:0.86, explanation:"温热汤炖，安抚但不过油。",
    ingredients_core:["牛腩","番茄","洋葱"] },
  { id:"m9", name_cn:"南瓜小米粥", score:0.78, explanation:"清甜少负担，胃舒适。",
    ingredients_core:["南瓜","小米"] },
];

const blocks: MockBlock[] = [
  { code:"P-HP-Lite", motivation:"P", name:"高蛋白·清淡", one_line_desc:"增肌恢复，轻负担", items: itemsP },
  { code:"P-LowGI", motivation:"P", name:"稳糖·低GI", one_line_desc:"平稳不犯困", items: itemsP.slice(0,2) },

  { code:"H-OneBowl", motivation:"H", name:"省事·一碗餐", one_line_desc:"主配齐活", items: itemsH },
  { code:"H-Homey", motivation:"H", name:"常吃·家常味", one_line_desc:"熟悉稳妥", items: itemsH.slice(0,1) },

  { code:"S-GroupFriendly", motivation:"S", name:"聚餐·通用口味", one_line_desc:"多人适配", items: itemsS },
  { code:"S-LightSpicy", motivation:"S", name:"小辣·开胃", one_line_desc:"轻刺激", items: itemsS.slice(0,1) },

  { code:"E-WarmSoup", motivation:"E", name:"温热·汤炖", one_line_desc:"安抚系", items: itemsE },
  { code:"E-LightSweet", motivation:"E", name:"清甜·少负担", one_line_desc:"舒缓不腻", items: itemsE.slice(0,1) },
];

export function mockGroups() {
  const map: Record<"P"|"H"|"S"|"E", MockBlock[]> = { P:[],H:[],S:[],E:[] };
  blocks.forEach(b => map[b.motivation].push(b));
  return ["P","H","S","E"].map(m => ({ motivation: m, categories: map[m as "P"|"H"|"S"|"E"] }));
}
