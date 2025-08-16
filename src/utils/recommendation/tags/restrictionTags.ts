import { TagDefinition } from "../tagTypes";

export const restrictionTags: TagDefinition[] = [
  {
    key: "coldNature",
    label: "寒凉食物",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "性质寒凉，容易损阳伤脾，阳虚或脾胃虚寒者忌用。",
    relatedBodyTypes: ["阳虚质", "气虚质", "脾虚体质"]
  },
  {
    key: "hotAndDry",
    label: "燥热刺激",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "性热或辛燥，易上火，湿热、阴虚体质应少食。",
    relatedBodyTypes: ["湿热质", "阴虚质"]
  },
  {
    key: "greasyFatty",
    label: "油腻高脂",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "肥甘厚腻，影响脾胃运化，痰湿、湿热体质应避免。",
    relatedBodyTypes: ["痰湿质", "湿热质", "气虚质"]
  },
  {
    key: "rawCold",
    label: "生冷不熟",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "生冷瓜果、生拌凉菜等，脾胃虚弱及阳虚体质不宜多食。",
    relatedBodyTypes: ["阳虚质", "气虚质", "脾虚体质"]
  },
  {
    key: "stimulant",
    label: "辛辣刺激",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "辣椒、花椒、蒜等，容易耗气伤阴，湿热体质或阴虚体质应忌食。",
    relatedBodyTypes: ["湿热质", "阴虚质"]
  },
  {
    key: "allergenPotential",
    label: "易致敏",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "如海鲜、坚果等高敏食物，易引发过敏体质反应。",
    relatedBodyTypes: ["特禀质"]
  },
  {
    key: "hardToDigest",
    label: "难消化",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "油炸干硬或高蛋白难消食物，脾胃虚弱、气虚体质应慎用。",
    relatedBodyTypes: ["脾虚体质", "气虚质"]
  },
  {
    key: "excessiveSweet",
    label: "过甜",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "高糖食物易助湿生痰，不利于痰湿、气虚体质。",
    relatedBodyTypes: ["痰湿质", "气虚质"]
  },
  {
    key: "excessiveColdDrink",
    label: "冰镇饮品",
    category: "restriction",
    appliesTo: ["constitution"],
    description: "冰镇茶饮、冷饮等损伤脾阳，脾胃虚寒、阳虚体质忌食。",
    relatedBodyTypes: ["阳虚质", "气虚质", "脾虚体质"]
  }
];
