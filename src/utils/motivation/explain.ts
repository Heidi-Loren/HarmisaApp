import { MotivationResult } from "./score";

const explanationMap: Record<string, string> = {
  P: "你重视饮食与健康目标之间的连接，善于主动规划饮食结构，并愿意为此查阅资料、坚持执行。你倾向于遵循计划吃饭，并期待饮食带来长期的正面回馈。",
  H: "你偏好稳定的饮食节奏，不太喜欢大幅调整或尝试新食物。熟悉和安全感是你选择食物的重要因素，你倾向于自动化决策，而不是频繁改变。",
  S: "你把饮食当作一种社交行为，和谁一起吃、是否能分享是你做出选择的重要依据。你也更容易受到朋友推荐、集体行动等影响。",
  E: "你的饮食常与情绪状态相连。当你情绪低落、压力大或疲惫时，容易通过“慰藉型食物”来照顾自己。食物对你来说，不只是营养，也是一种心理支持。"
};

const labelMap: Record<string, string> = {
  P: "主动自我管理型",
  H: "习惯驱动型",
  S: "社交导向型",
  E: "情绪调节型"
};

export function generateMotivationExplanation(result: MotivationResult) {
  const main = result.main;
  const mainLabel = labelMap[main];
  const mainText = explanationMap[main];

  const secondaryText = result.secondary
    .map(key => `【${labelMap[key]}】：${explanationMap[key]}`)
    .join("\n\n");

  const summaryText = `你在饮食决策中最显著的动因是【${mainLabel}】。平台将在推荐中优先考虑你在该维度的偏好：例如你可能更重视${main === "P" ? "营养结构与计划匹配" : main === "E" ? "舒适感与情绪调节" : main === "S" ? "社交适配性" : "熟悉与稳定性"}。同时，我们也注意到你在 ${result.secondary.map(k => labelMap[k]).join("、")} 等方面也有倾向，将在推荐中适度融合。`;

  return {
    mainLabel,
    mainText,
    secondaryText,
    summaryText
  };
}
