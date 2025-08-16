// 用户画像结构定义：整合体质 + 气候 + 动因

// 🔹 Constitution（体质）结构
export interface ConstitutionProfile {
  main: string; // 主型，如 "阳虚质"
  secondary: string[]; // 副型数组
  scoreMap: Record<string, number>; // 各体质得分
}

// 🔹 Climate（气候）结构
export interface ClimateProfile {
  season: string; // 当前季节，如 "春"
  location: string; // 地域，如 "广州"
  climateTags: string[]; // 推荐标签，如 ["清热", "润肺"]
}

// 🔹 Motivation（动因）结构
export interface MotivationProfile {
  main: "P" | "H" | "S" | "E";
  secondary: ("P" | "H" | "S" | "E")[];
  ratio: Record<"P" | "H" | "S" | "E", number>; // 比例如 {P: 40, H: 30, S: 20, E: 10}
}

// 🔸 综合画像结构
export interface UserProfile {
  constitution: ConstitutionProfile;
  climate: ClimateProfile;
  motivation: MotivationProfile;
}
