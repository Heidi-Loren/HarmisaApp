import { Dish } from "./types";
import { UserProfile } from "../profile/types";
import { constitutionTagMap } from "../constitution/tagMap";
import { motivationTagWeights } from "./motivationWeights";

export interface MatchedTagScore {
  tag: string;
  score?: number;
}

export interface DishExplanation {
  constitution?: string;
  climate?: string;
  motivation?: string;

  constitutionMatchedTags?: string[];
  climateMatchedTags?: string[];
  motivationMatchedTags?: MatchedTagScore[];
}

export function generateDishExplanation(
  dish: Dish,
  profile: UserProfile
): DishExplanation {
  const result: DishExplanation = {};

  // 🍃 体质层匹配
  const constitutionTags = [
    ...(constitutionTagMap[profile.constitution.main] || []),
    ...profile.constitution.secondary.flatMap((t) => constitutionTagMap[t] || [])
  ];
  const constitutionHits = dish.tags.filter((tag) => constitutionTags.includes(tag));
  if (constitutionHits.length > 0) {
    result.constitution = `你属于「${profile.constitution.main}」体质，推荐含有【${constitutionHits.join(" / ")}】等体质调理食材`;
    result.constitutionMatchedTags = constitutionHits;
  }

  // ☁️ 气候层匹配
  const climateHits = dish.tags.filter((tag) => profile.climate.climateTags.includes(tag));
  if (climateHits.length > 0) {
    result.climate = `当前为「${profile.climate.season}」季节，所在城市「${profile.climate.location}」气候下推荐【${climateHits.join(" / ")}】方向食物`;
    result.climateMatchedTags = climateHits;
  }

  // 🧠 动因层匹配 + 加分说明
  const allTypes = [profile.motivation.main, ...profile.motivation.secondary];
  const motivationMatched: MatchedTagScore[] = [];

  for (const tag of dish.tags) {
    let totalScore = 0;
    for (const type of allTypes) {
      const weights = motivationTagWeights[type];
      if (weights && tag in weights) {
        totalScore += weights[tag as keyof typeof weights];
      }
    }
    if (totalScore > 0) {
      motivationMatched.push({ tag, score: totalScore });
    }
  }

  if (motivationMatched.length > 0) {
    result.motivation = `你倾向于「${profile.motivation.main}」动因，推荐含【${motivationMatched.map(t => t.tag).join(" / ")}】等偏好标签的菜品`;
    result.motivationMatchedTags = motivationMatched;
  }

  return result;
}
