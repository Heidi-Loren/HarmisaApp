// utils-api-recommend.ts (RENAME 建议：src/utils/api/recommendHandler.ts)

import { mockDishes } from "@/utils/recommendation/mockDishes";
import { generateUnifiedRecommendations } from "@/utils/recommendation/generateUnifiedRecommendations";
import type { UserProfile } from "@/utils/profile/types";

export function handleRecommend(profile: UserProfile) {
  try {
    const result = generateUnifiedRecommendations(mockDishes, profile);
    return { result };
  } catch (error) {
    throw new Error("推荐失败，请检查输入格式是否为完整 UserProfile 结构。");
  }
}
