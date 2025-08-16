import { scoreWithAllFactors } from "./scoreWithAllFactors";
import { generateDishExplanation, DishExplanation } from "./explanation";
import { Dish } from "./types";
import { UserProfile } from "../profile/types";

export function generateUnifiedRecommendations(
  dishes: Dish[],
  profile: UserProfile
): Array<Dish & { finalScore: number; explanation: DishExplanation }> {
  return dishes
    .map((dish) => ({
      ...dish,
      finalScore: scoreWithAllFactors(dish, profile),
      explanation: generateDishExplanation(dish, profile)
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}
