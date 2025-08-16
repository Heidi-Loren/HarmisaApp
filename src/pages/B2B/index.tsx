"use client";

import React from "react";
import { mockDishes } from "@/utils/recommendation/mockDishes";
import { generateUnifiedRecommendations } from "@/utils/recommendation/generateUnifiedRecommendations";
import { TagBadge } from "@/components/TagBadge";
import type { Dish } from "@/utils/recommendation/types";
import type { UserProfile } from "@/utils/profile/types";
import type { DishExplanation } from "@/utils/recommendation/explanation"; // ✅ 加入这句！

export default function RecommendPage() {
  // 模拟完整用户画像（体质 + 气候 + 动因）
  const userProfile: UserProfile = {
    constitution: {
      main: "阳虚质",
      secondary: ["痰湿质"],
      scoreMap: { 阳虚质: 90, 痰湿质: 75 }
    },
    climate: {
      season: "秋",
      location: "广州",
      climateTags: ["润燥", "健脾"]
    },
    motivation: {
      main: "E",
      secondary: ["H"],
      ratio: { P: 20, H: 30, S: 10, E: 40 }
    }
  };

  // ✅ 加上正确类型（explanation 是结构对象，不是 string）
  const recommendedDishes: Array<Dish & { finalScore: number; explanation: DishExplanation }> =
    generateUnifiedRecommendations(mockDishes, userProfile);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">个性化推荐结果</h1>

      <p className="text-sm text-gray-500">
        当前动因画像：
        <strong>{userProfile.motivation.main}</strong>（主） /
        {userProfile.motivation.secondary.map((s) => (
          <span key={s}> {s} </span>
        ))}（副）
      </p>

      <ul className="space-y-4">
        {recommendedDishes.map((dish, index) => (
          <li key={dish.name} className="p-4 border rounded shadow">
            <p className="text-lg font-semibold">{index + 1}. {dish.name}</p>
            <p className="text-sm text-gray-700">得分：{dish.finalScore}</p>

            <div className="flex flex-wrap gap-1 mt-1">
              {dish.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-2 font-medium">推荐理由：</p>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              {dish.explanation.constitution && <li>{dish.explanation.constitution}</li>}
              {dish.explanation.climate && <li>{dish.explanation.climate}</li>}
              {dish.explanation.motivation && <li>{dish.explanation.motivation}</li>}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
