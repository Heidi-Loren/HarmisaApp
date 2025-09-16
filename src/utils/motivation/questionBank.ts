// src/utils/motivation/questionBank.ts
export type Motive = "P" | "H" | "S" | "E";
export type MQType = "baseline" | "context" | "check" | "consistency";

export interface MQItem {
  id: string;
  text: string;
  motive: Motive | null;
  reverse?: boolean;
  weight?: number;
  type?: MQType;
  meta?: { hint?: string };
}

export const MQ: MQItem[] = [
  { id: "Q1",  text: "我会据健康目标规划饮食，比如控糖/控脂/增肌。", motive: "P", type: "baseline" },
  { id: "Q2",  text: "没有特殊目标时，我更愿意维持原有饮食节奏。", motive: "H", type: "baseline" },
  { id: "Q3",  text: "如果一顿饭能促进与朋友的互动，我更愿意选择它。", motive: "S", type: "baseline" },
  { id: "Q4",  text: "当状态不佳时，我更倾向选择能让我“被安慰”的食物。", motive: "E", type: "baseline" },

  { id: "Q5",  text: "我会查阅营养信息并据此调整饮食结构。", motive: "P", type: "baseline" },
  { id: "Q6",  text: "我通常不太愿意为饮食做功课，熟悉即可。", motive: "H", reverse: true, type: "baseline" },
  { id: "Q7",  text: "看到他人（KOL/朋友）推荐后，我更愿意尝试。", motive: "S", type: "baseline" },
  { id: "Q8",  text: "我不喜欢冷冰冰的数据，更希望系统“懂我的感觉”。", motive: "E", type: "baseline" },

  { id: "Q9",  text: "与人结伴（打卡、挑战）会明显提升我执行饮食计划的概率。", motive: "S", type: "baseline" },
  { id: "Q10", text: "即使朋友建议不同，只要不符合我目标，我也会坚持自己的选择。", motive: "P", reverse: true, type: "consistency" },
  { id: "Q11", text: "只要是习惯中的几家店，我基本不愿换。", motive: "H", type: "baseline" },
  { id: "Q12", text: "近期情绪波动时，我更容易放弃原定饮食安排。", motive: "E", type: "baseline" },

  { id: "Q13", text: "我希望系统提供每周一次有用的目标追踪与结构建议。", motive: "P", type: "baseline" },
  { id: "Q14", text: "若推荐与我习惯差异大，我会直接忽略。", motive: "H", type: "baseline" },
  { id: "Q15", text: "若朋友参与同一活动/榜单，我会更频繁地查看与互动。", motive: "S", type: "baseline" },
  { id: "Q16", text: "如果推荐文案击中了我的情绪/当下心境，我更愿意点击。", motive: "E", type: "baseline" },

  { id: "Q17", text: "换城市/季节变化时，我会主动重建饮食结构。", motive: "P", type: "context", weight: 0.5 },
  { id: "Q18", text: "我会在阴天/加班后倾向于选择“安慰型”的食物。", motive: "E", type: "context", weight: 0.5 },

  { id: "Q19", text: "⚑ 注意力：请选择“同意”（中间档）以确认你在认真作答。", motive: null, type: "check" },
  { id: "Q20", text: "我经常“跟随朋友吃什么就吃什么”。", motive: "S", type: "consistency" },
  { id: "Q21", text: "我更倾向按自己计划吃饭而非受别人影响。", motive: "P", reverse: true, type: "consistency" }
];

export default MQ;
