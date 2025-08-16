// 功能：批量推荐生成函数

// 输入：菜品列表 + 用户动因画像

// 调用：内部使用 scoreWithMotivation() 给每道菜评分

// 输出：排序后的推荐列表（每项含 finalScore 字段）

// 作用：推荐结果生成器（推荐接口主入口）

import { Dish } from "./types";
import { scoreWithMotivation } from "./scoreWithMotivation";

export interface UserMotivation {
  main: "P" | "H" | "S" | "E";
  secondary: ("P" | "H" | "S" | "E")[];
}

export function generateMotivatedRecommendations(
  baseDishes: Dish[],
  motivation: UserMotivation
): Dish[] {
  return baseDishes
    .map((dish) => ({
      ...dish,
      finalScore: scoreWithMotivation(dish, motivation.main, motivation.secondary)
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}
