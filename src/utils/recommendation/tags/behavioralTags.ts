import { TagDefinition } from "../tagTypes";

export const behavioralTags: TagDefinition[] = [
  {
    key: "emotionalComfort",
    label: "情绪慰藉",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "可带来放松与满足感，常见于甜食、热食或熟悉味道。",
    motivationWeights: { E: 5, H: 2 }
  },
  {
    key: "familiar",
    label: "熟悉感强",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "习惯性食物，有安全感，倾向于一贯选择。",
    motivationWeights: { H: 5, E: 2 }
  },
  {
    key: "nutritious",
    label: "营养均衡",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "合理搭配主副食，符合营养摄入规划。",
    motivationWeights: { P: 5 }
  },
  {
    key: "lowFat",
    label: "低脂",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "低油脂、轻食类菜品，适合健康管理人群。",
    motivationWeights: { P: 3 }
  },
  {
    key: "highFiber",
    label: "高纤维",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "富含蔬菜和粗粮，有助于肠道健康。",
    motivationWeights: { P: 3 }
  },
  {
    key: "lightFlavor",
    label: "清淡口味",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "低盐少油，适合长期健康管理。",
    motivationWeights: { P: 2, H: 2 }
  },
  {
    key: "sharedDish",
    label: "社交友好",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "适合多人分享的菜品，如火锅、小吃拼盘。",
    motivationWeights: { S: 5 }
  },
  {
    key: "ritualValue",
    label: "仪式感强",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "摆盘精致或有节庆特色，满足社交或情感需要。",
    motivationWeights: { S: 3, E: 2 }
  },
  {
    key: "indulgent",
    label: "放纵式满足",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "高热量、甜辣浓郁食物，适合压力释放场景。",
    motivationWeights: { E: 5 }
  },
  {
    key: "controlSense",
    label: "掌控感",
    category: "behavioral",
    appliesTo: ["motivation"],
    description: "搭配自选、热量可计算，符合目标导向偏好。",
    motivationWeights: { P: 4 }
  }
];
