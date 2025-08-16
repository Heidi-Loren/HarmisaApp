// src/modules/recommendation/types.ts

export interface Dish {
  name: string;
  baseScore: number;
  tags: string[];
  // 可拓展字段
  id?: string;
  imageUrl?: string;
  description?: string;
}
export interface Dish {
  name: string;
  baseScore: number;
  tags: string[];
  finalScore?: number; // ← 加上这个！
}
// src/modules/recommendation/types.ts

export type Motivation = "P" | "H" | "S" | "E";

export interface UserMotivation {
  main: Motivation;
  secondary: Motivation[];
  ratio: Record<Motivation, number>;
}
