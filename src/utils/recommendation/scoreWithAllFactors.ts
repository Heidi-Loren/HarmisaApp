import { Dish } from "./types";
import { UserProfile } from "../profile/types";
import { motivationTagWeights } from "./motivationWeights"; // 复用现有动因打分规则
import { constitutionTagMap } from "../constitution/tagMap"; // 每个体质适宜的标签
// import { climateTagMap } from "../climate/tagMap"; // 每个季节/气候的推荐标签

// 权重参数（可调整）
const WEIGHTS = {
  constitution: 4,
  climate: 3,
  motivation: 3
};

// 🔹 总打分函数：输入菜品 + 用户画像，输出总分
export function scoreWithAllFactors(dish: Dish, profile: UserProfile): number {
  let score = dish.baseScore;

  // 1️⃣ 体质层匹配加分（主型、副型适宜标签命中则加分）
  const constitutionTags = [
    ...(constitutionTagMap[profile.constitution.main] || []),
    ...profile.constitution.secondary.flatMap((t) => constitutionTagMap[t] || [])
  ];
  const constitutionBonus = dish.tags.filter((tag) => constitutionTags.includes(tag)).length * WEIGHTS.constitution;
  score += constitutionBonus;

  // 2️⃣ 气候层匹配加分（当前推荐方向标签命中加分）
  const climateTags = profile.climate.climateTags;
  const climateBonus = dish.tags.filter((tag) => climateTags.includes(tag)).length * WEIGHTS.climate;
  score += climateBonus;

  // 3️⃣ 动因层打分（主副型动因权重打分逻辑）
  let motivationBonus = 0;
  const allTypes = [profile.motivation.main, ...profile.motivation.secondary];

  for (const tag of dish.tags) {
    for (const type of allTypes) {
      const weightsForType = motivationTagWeights[type];
      if (weightsForType && tag in weightsForType) {
        motivationBonus += weightsForType[tag as keyof typeof weightsForType];
      }
    }
  }


  score += motivationBonus * WEIGHTS.motivation; // 动因得分也按权重加成

  return score;
}
