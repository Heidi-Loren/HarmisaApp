// 功能：打分函数

// 输入：某一道菜品（含标签）+ 用户主副型动因标签

// 输出：该菜在该动因画像下的加权得分

// 作用：评分公式模块（支持单个推荐项）


//核心加权函数
// src/modules/recommendation/scoreWithMotivation.ts

type Motivation = "P" | "H" | "S" | "E";

export interface Dish {
  name: string;
  baseScore: number; // 来自体质+气候打分
  tags: string[]; // 该菜品的特征标签，如 ["熟悉感强", "情绪慰藉", "社交友好"]
}

interface MotivationWeight {
  [tag: string]: number; // tag关键词 → 加分权重
}

const motivationTagWeights: Record<Motivation, MotivationWeight> = {
  P: {
    "营养均衡": 5,
    "低脂": 3,
    "高纤维": 3,
    "清淡": 2
  },
  H: {
    "熟悉感强": 5,
    "常吃": 4,
    "家常味": 3
  },
  S: {
    "社交友好": 5,
    "分享型": 4,
    "多人适配": 3
  },
  E: {
    "情绪慰藉": 5,
    "治愈系": 4,
    "甜辣满足": 3
  }
};

// 💡 核心函数：返回一个“加权后的综合评分”
export function scoreWithMotivation(
  dish: Dish,
  main: Motivation,
  secondary: Motivation[] = []
): number {
  const weightMap = motivationTagWeights;

  let bonus = 0;

  const allWeights: Motivation[] = [main, ...secondary];

  for (const tag of dish.tags) {
    for (const type of allWeights) {
      const w = weightMap[type][tag];
      if (w) bonus += w;
    }
  }

  return dish.baseScore + bonus;
}
