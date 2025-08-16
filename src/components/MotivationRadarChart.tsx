"use client";

import React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";

interface Props {
  ratio: Record<"P" | "H" | "S" | "E", number>;
}

export default function MotivationRadarChart({ ratio }: Props) {
  const data = Object.entries(ratio).map(([key, value]) => ({
    dimension: key,
    score: value
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <RadarChart data={data}>
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
  );
}
