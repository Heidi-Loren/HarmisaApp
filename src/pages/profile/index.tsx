"use client";

import React from "react";
import {
  ConstitutionProfile,
  ClimateProfile,
  MotivationProfile,
  UserProfile
} from "@/utils/profile/types";
import { generateUserProfile } from "@/utils/profile/generateProfile";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";

// 🔸 模拟三类模块结果（你之后可以接 Supabase 或算法真实输出）
const constitutionResult: ConstitutionProfile = {
  main: "阳虚质",
  secondary: ["气虚质"],
  scoreMap: {
    阳虚质: 85,
    气虚质: 72,
    平和质: 60
  }
};

const climateResult: ClimateProfile = {
  season: "春",
  location: "广州",
  climateTags: ["疏肝", "清热", "润燥"]
};

const motivationResult: MotivationProfile = {
  main: "E",
  secondary: ["H"],
  ratio: { P: 15, H: 25, S: 20, E: 40 }
};

// 🔹 生成整合画像
const userProfile: UserProfile = generateUserProfile(
  constitutionResult,
  climateResult,
  motivationResult
);

// 🔹 构造动因比例雷达图数据
const radarData = Object.entries(userProfile.motivation.ratio).map(([key, value]) => ({
  dimension: key,
  score: value
}));

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-3xl font-bold">我的健康画像</h1>

      {/* 🔹 Section 1: 体质画像 */}
      <section>
        <h2 className="text-xl font-semibold">🌿 中医体质</h2>
        <p>
          主型：<strong>{userProfile.constitution.main}</strong>
        </p>
        <p>
          副型：{userProfile.constitution.secondary.join(" / ")}
        </p>
        <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
          {Object.entries(userProfile.constitution.scoreMap).map(([type, score]) => (
            <li key={type}>
              {type}: {score}
            </li>
          ))}
        </ul>
      </section>

      {/* 🔹 Section 2: 气候画像 */}
      <section>
        <h2 className="text-xl font-semibold">☀️ 当前环境</h2>
        <p>
          所在地：{userProfile.climate.location}，季节：{userProfile.climate.season}
        </p>
        <p className="text-sm text-gray-600">
          推荐调理方向：{userProfile.climate.climateTags.join(" / ")}
        </p>
      </section>

      {/* 🔹 Section 3: 动因画像 */}
      <section>
        <h2 className="text-xl font-semibold">🧠 饮食动因倾向</h2>
        <p>
          主型：<strong>{userProfile.motivation.main}</strong>，副型：
          {userProfile.motivation.secondary.join(" / ")}
        </p>

        <div className="w-full h-72 mt-4">
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="动因比例"
                dataKey="score"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
