// src/modules/recommendation/mockDishes.ts

/**
 * 模拟推荐候选菜品数据
 * 用于测试推荐排序引擎（体质、气候、动因打分输出后作为候选集）
 */

// 功能	说明
// 🎯 测试数据来源	模拟一批推荐候选菜品，供推荐引擎使用
// 🧠 含标签字段	每道菜含 tags 字段，用于动因加权匹配
// 🧪 开发验证	你可以用不同用户画像（动因主副型）进行排序测试

import { Dish } from "./types";

export const mockDishes: Dish[] = [
  {
    name: "番茄牛腩",
    baseScore: 80,
    tags: ["mainDish", "熟悉感强", "营养均衡", "家常味", "补气"]
  },
  {
    name: "凉拌黄瓜",
    baseScore: 75,
    tags: ["coldDish", "低脂", "清淡口味", "寒凉食物", "清热"]
  },
  {
    name: "宫保鸡丁",
    baseScore: 78,
    tags: ["mainDish", "甜辣满足", "情绪慰藉", "辛辣刺激", "多人适配"]
  },
  {
    name: "三文鱼寿司",
    baseScore: 76,
    tags: ["mainDish", "社交友好", "冷食", "润燥", "高蛋白"]
  },
  {
    name: "红枣银耳羹",
    baseScore: 70,
    tags: ["dessert", "润肺", "甜品", "治愈系", "补气"]
  },
  {
    name: "牛油果沙拉",
    baseScore: 74,
    tags: ["salad", "高纤维", "低脂", "清淡口味", "润燥"]
  },
  {
    name: "水煮鱼",
    baseScore: 79,
    tags: ["mainDish", "甜辣满足", "辛辣刺激", "多人适配", "放纵式满足"]
  },
  {
    name: "烤鸡全腿饭",
    baseScore: 77,
    tags: ["mainDish", "常吃", "家常味", "营养均衡", "熟悉感强"]
  },
  {
    name: "干锅花菜",
    baseScore: 73,
    tags: ["sideDish", "熟悉感强", "高纤维", "分享型", "辛辣刺激"]
  },
  {
    name: "海鲜焗饭",
    baseScore: 76,
    tags: ["mainDish", "社交友好", "营养均衡", "油腻高脂", "烘焙类"]
  },
  {
    name: "菌菇炖鸡汤",
    baseScore: 82,
    tags: ["soup", "温补", "补气", "润燥", "清淡口味"]
  },
  {
    name: "炸鸡块",
    baseScore: 72,
    tags: ["fried", "油腻高脂", "情绪慰藉", "放纵式满足", "小吃"]
  },
  {
    name: "羊肉火锅",
    baseScore: 78,
    tags: ["hotPot", "温阳", "社交友好", "多人适配", "辛辣刺激"]
  },
  {
    name: "紫薯燕麦粥",
    baseScore: 74,
    tags: ["mainDish", "高纤维", "低脂", "健脾", "润燥"]
  },
  {
    name: "绿豆百合汤",
    baseScore: 73,
    tags: ["dessert", "清热", "润燥", "润肺", "寒凉食物"]
  },
  {
    name: "烤南瓜",
    baseScore: 76,
    tags: ["sideDish", "健脾", "营养均衡", "清淡口味", "烘焙类"]
  },
  {
    name: "椒盐鱿鱼圈",
    baseScore: 70,
    tags: ["fried", "油腻高脂", "分享型", "多人适配", "辛辣刺激"]
  },
  {
    name: "红豆汤圆",
    baseScore: 72,
    tags: ["dessert", "情绪慰藉", "甜品", "甜辣满足", "易致敏"]
  },
  {
    name: "苦瓜炒蛋",
    baseScore: 71,
    tags: ["mainDish", "清热", "健脾", "熟悉感强", "高纤维"]
  },
  {
    name: "清蒸鲈鱼",
    baseScore: 80,
    tags: ["mainDish", "营养均衡", "清淡口味", "助阳", "润燥"]
  }
];
