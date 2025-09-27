// src/data/categoryMeta.ts
export type CategoryMeta = {
  code: string;
  motivation: "P" | "H" | "S" | "E";
  name: string;
  one_line_desc: string;
};

// 12 个固定标签（3 x 4 动因）——你后续可改文案，但 code 不要变
export const ALL_CATEGORY_TEMPLATES: CategoryMeta[] = [
  // P 自护（Proactive）
  { code: "P-HP-Lite",   motivation: "P", name: "高蛋白·清淡", one_line_desc: "增肌恢复，轻负担" },
  { code: "P-LowGI",     motivation: "P", name: "稳糖·低GI",   one_line_desc: "血糖平稳，不犯困" },
  { code: "P-WarmLowOil",motivation: "P", name: "温补·少油",   one_line_desc: "暖胃护阳，油盐友好" },

  // H 习惯（Habit）
  { code: "H-OneBowl",   motivation: "H", name: "省事·一碗餐", one_line_desc: "主配齐活，减少决策" },
  { code: "H-Homey",     motivation: "H", name: "常吃·家常味", one_line_desc: "熟悉稳妥，稳定坚持" },
  { code: "H-PrepLite",  motivation: "H", name: "规律·轻备餐", one_line_desc: "好备好存，方便复用" },

  // S 社交（Social）
  { code: "S-GroupFriendly", motivation: "S", name: "聚餐·通用口味", one_line_desc: "众口难调的稳妥选" },
  { code: "S-LightSpicy",    motivation: "S", name: "小辣·开胃",     one_line_desc: "轻度刺激，少油少盐" },
  { code: "S-SharePlatter",  motivation: "S", name: "共享·拼盘",     one_line_desc: "可分食、搭配自由" },

  // E 情绪（Emotion）
  { code: "E-WarmSoup",   motivation: "E", name: "温热·汤炖",   one_line_desc: "暖身暖胃，慢节奏" },
  { code: "E-ComfortCarb",motivation: "E", name: "安抚·软糯主食", one_line_desc: "柔软饱腹，情绪稳定" },
  { code: "E-Refreshing", motivation: "E", name: "清新·开胃",   one_line_desc: "解腻提神，轻负担" },
];

// 方便按动因取列表
export const GROUPED_CATEGORY_META: Record<"P"|"H"|"S"|"E", CategoryMeta[]> = {
  P: ALL_CATEGORY_TEMPLATES.filter(x => x.motivation === "P"),
  H: ALL_CATEGORY_TEMPLATES.filter(x => x.motivation === "H"),
  S: ALL_CATEGORY_TEMPLATES.filter(x => x.motivation === "S"),
  E: ALL_CATEGORY_TEMPLATES.filter(x => x.motivation === "E"),
};
