// 📄 src/modules/recommendation/tagTypes.ts

export type TagCategory =
  | "functional"
  | "restriction"
  | "behavioral"
  | "dishType"
  | "climateSeason"
  | "climateWeather";

export interface TagDefinition {
  key: string; // 英文唯一 key（推荐命名风格为 camelCase）
  label: string; // 中文名称
  category: TagCategory;
  appliesTo: ("constitution" | "climate" | "motivation")[];
  description?: string;
  motivationWeights?: Partial<Record<"P" | "H" | "S" | "E", number>>;
  relatedBodyTypes?: string[]; // 体质标签映射
  climateSeasons?: string[]; // ["春", "夏", "秋", "冬"]
  climateWeathers?: string[]; // ["湿热", "寒湿", "干热"]
}
