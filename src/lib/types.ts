// 统一TS类型（Dish/UserContext/CategoryTemplate）
export type Vector = Record<string, number>;

export type FitVector = {
  constitution: Vector;   // 体质向量
  environment:  Vector;   // 环境(季节+天气+地域)
  motive:       Vector;   // P/H/S/E
};

export type Dish = {
  id: string;
  name_cn: string;
  name_en?: string;
  food_group?: string[];
  cuisine?: string;
  course?: string;
  ingredients_core: string[];
  method: "蒸"|"煮"|"炖"|"焯"|"烤"|"炒"|"炸"|"焗"|"凉拌"|"腌/拌";
  oil_level: 0|1|2|3;
  spicy_level: 0|1|2|3;
  sodium_level?: 0|1|2|3;
  diet_rules: string[];
  allergens: string[];
  tcm_props?: { thermal: "寒"|"凉"|"平"|"温"|"热"; effect?: string };
  env_tags?: string[];
  substitutions?: Record<string,string[]>;
  fit_vector: FitVector;
  explanation_snippets?: string[];
};

export type UserContext = {
  constitution_vector: Vector; // 来自你的体质问卷
  environment_vector:  Vector; // 季节+天气+地域折算
  motive_vector:       Vector; // 四维动因(P/H/S/E)
  hard_filters?: {
    allergens_block?: string[];
    diet_rules_required?: string[];
    oil_max?: 0|1|2|3;
    spicy_max?: 0|1|2|3;
    sodium_max?: 0|1|2|3;
  }
};

export type CategoryTemplate = {
  id?: string;
  code: string;                 // "P-HP-Lite"
  motivation: "P"|"H"|"S"|"E";
  name: string;
  one_line_desc?: string;
  boost?: FitVector;
  filters?: Record<string, any>;
  sort_order?: number;
};
