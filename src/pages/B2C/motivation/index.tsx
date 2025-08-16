"use client";
import 'whatwg-fetch'
import { saveMotivationProfile } from "@/utils/motivation/save";
import { createClient } from '@supabase/supabase-js';

import React, { useState } from "react";
import { calculateMotivationProfile, Option } from "@/utils/motivation/score";
import { generateMotivationExplanation } from "@/utils/motivation/explain";

import {
  RadarChart as RawRadarChart,
  PolarGrid,
  PolarAngleAxis as RawPolarAngleAxis,
  Radar as RawRadar,
  ResponsiveContainer
} from "recharts";

const RadarChart = RawRadarChart as any;
const PolarAngleAxis = RawPolarAngleAxis as any;
const Radar = RawRadar as any;

const questions = [
  "你最常考虑什么因素来决定吃什么？",
  "健身/学习期间，你如何选择饮食？",
  "你是否愿意查阅营养信息来规划饮食？",
  "你偏好的饮食报告格式是？",
  "你改变饮食习惯的最大动因是？",
  "你更容易开始健康饮食的方式是？",
  "你希望App提醒饮食频率是？",
  "你看到推荐推送时的反应是？",
  "情绪低落时你会？",
  "下班后你更常吃的类型？",
  "换城市生活时你如何选饮食？",
  "你饮食会随天气/季节变化吗？"
];

const options: Record<Option, string> = {
  A: "A. 健康目标/计划导向",
  B: "B. 习惯和熟悉度",
  C: "C. 社交场景影响",
  D: "D. 情绪与当下状态"
};

export default function MotivationPage() {
  const [answers, setAnswers] = useState<(Option | null)[]>(Array(12).fill(null));
  const [result, setResult] = useState<null | ReturnType<typeof calculateMotivationProfile>>(null);

  const handleSelect = (index: number, value: Option) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.includes(null)) {
      alert("请完成所有问题");
      return;
    }

    const res = calculateMotivationProfile(answers as Option[]);
    setResult(res);

    try {
      const supabase = createClient(
  'https://saqtujjgtkopomwhjult.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcXR1ampndGtvcG9td2hqdWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjUxOTksImV4cCI6MjA2NjU0MTE5OX0.yeoOdJKCj1jebH4WHDz0GIQ-xjRw_-Vb-FTJ65BMjsc'
);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await saveMotivationProfile(user.id, res);
        console.log("保存成功");
      } else {
        console.warn("未登录，无法保存结果");
      }
    } catch (err) {
      console.error("保存失败", err);
    }
  };

  const radarData = result
    ? Object.entries(result.ratio).map(([key, value]) => ({
        dimension:
          key === "P"
            ? "自我管理"
            : key === "H"
            ? "习惯驱动"
            : key === "S"
            ? "社交导向"
            : "情绪调节",
        score: value
      }))
    : [];

  const explanation = result ? generateMotivationExplanation(result) : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">四维动因问卷</h1>
      {questions.map((q, i) => (
        <div key={i} className="border rounded p-4 shadow">
          <p className="font-medium mb-2">{i + 1}. {q}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B", "C", "D"] as Option[]).map(opt => (
              <label key={opt} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`q${i}`}
                  value={opt}
                  checked={answers[i] === opt}
                  onChange={() => handleSelect(i, opt)}
                />
                <span>{options[opt]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow"
      >
        提交问卷
      </button>

      {result && explanation && (
        <div className="mt-8 border-t pt-6 space-y-4">
          <h2 className="text-xl font-semibold">你的动因画像</h2>
          <p><strong>主标签：</strong>{result.main} - {explanation.mainLabel}</p>
          <p><strong>副标签：</strong>{result.secondary.join(" / ")}</p>

          <h3 className="mt-4 font-medium">动因分布雷达图：</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <Radar
                  name="动因分布"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-2 bg-gray-50 border rounded p-4 text-sm leading-relaxed">
            <h4 className="font-semibold">主标签解释</h4>
            <p>{explanation.mainText}</p>

            {explanation.secondaryText && (
              <>
                <h4 className="font-semibold mt-4">副标签解释</h4>
                <p>{explanation.secondaryText}</p>
              </>
            )}

            <h4 className="font-semibold mt-4">总结</h4>
            <p>{explanation.summaryText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
