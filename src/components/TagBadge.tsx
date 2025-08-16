// 通用标签徽章组件

import React from "react";

type TagBadgeProps = {
  tag: string;
};

const tagColors: Record<string, string> = {
  // 动因行为
  情绪慰藉: "bg-pink-100 text-pink-700",
  营养均衡: "bg-green-100 text-green-700",
  熟悉感强: "bg-yellow-100 text-yellow-700",
  社交友好: "bg-indigo-100 text-indigo-700",
  甜辣满足: "bg-red-100 text-red-700",
  // 功能调理
  润燥: "bg-blue-100 text-blue-700",
  清热: "bg-blue-100 text-blue-700",
  温补: "bg-orange-100 text-orange-700",
  健脾: "bg-teal-100 text-teal-700",
  // 结构分类
  主食: "bg-gray-100 text-gray-700",
  火锅类: "bg-gray-100 text-gray-700",
  汤品: "bg-purple-100 text-purple-700",
  // 其他默认
  默认: "bg-gray-200 text-gray-600"
};

export function TagBadge({ tag }: TagBadgeProps) {
  const colorClass = tagColors[tag] || tagColors["默认"];

  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colorClass}`}>
      {tag}
    </span>
  );
}
