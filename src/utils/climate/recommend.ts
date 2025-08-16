import { computeClimateWeights, ClimateData } from "./computeWeights";
import { getSeasonFromDate } from "./season";
import { mapWeightsToFoodTags } from "./tagMapping";
import { regionClimateTagWeights } from "./regionTagMap";
import { provinceToRegion } from "./provinceToRegion";

export interface FoodRecommendation {
  directionRanking: string[];
  recommendedFoodTags: string[];
  avoidTags: string[];
  seasonalTips: string;
}

export function generateFoodRecommendation(data: ClimateData): FoodRecommendation {
  const baseWeights = computeClimateWeights(data);
  const season = getSeasonFromDate(data.date);

  // ✅ 地域匹配逻辑（从省名映射到区域）
  const region = provinceToRegion[data.city];

  if (region && regionClimateTagWeights[region]) {
    const regionBias = regionClimateTagWeights[region];
    const seasonalBoost = regionBias.seasonalBias?.[season] || [];
    const defaultBoost = regionBias.defaultTags || [];

    for (const tag of [...seasonalBoost, ...defaultBoost]) {
      baseWeights[tag] = (baseWeights[tag] || 0) + 1;
    }
  }

  const sortedDirections = Object.entries(baseWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);

  const recommendedTags = mapWeightsToFoodTags(baseWeights);
  const avoidTags = baseWeights["清热祛暑"] < 1 ? ["寒凉水果", "冰镇饮品"] : [];
  const seasonalTips = `当前为 ${season} 季，优先关注「${sortedDirections[0]}」食疗${region ? `，结合${region}地区气候偏好强化推荐` : ""}。`;

  return {
    directionRanking: sortedDirections,
    recommendedFoodTags: recommendedTags,
    avoidTags,
    seasonalTips
  };
}
