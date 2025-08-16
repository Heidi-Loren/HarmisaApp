import { TagDefinition } from "../tagTypes";

export const functionalTags: TagDefinition[] = [
  {
    key: "warming",
    label: "温阳",
    category: "functional",
    appliesTo: ["constitution", "climate"],
    description: "具有温补阳气、驱寒的作用，适合阳虚体质及寒冷环境。",
    relatedBodyTypes: ["阳虚质", "气虚质"]
  },
  {
    key: "cooling",
    label: "清热",
    category: "functional",
    appliesTo: ["constitution", "climate"],
    description: "有助于清泄内热，适用于湿热体质、上火等情况。",
    relatedBodyTypes: ["湿热质", "阳盛体质"]
  },
  {
    key: "moistening",
    label: "润燥",
    category: "functional",
    appliesTo: ["constitution", "climate"],
    description: "润肺生津，适合燥热气候及阴虚体质。",
    relatedBodyTypes: ["燥热质", "阴虚质"]
  },
  {
    key: "dampResolving",
    label: "祛湿",
    category: "functional",
    appliesTo: ["constitution", "climate"],
    description: "帮助去除体内湿气，适合湿热、痰湿体质。",
    relatedBodyTypes: ["湿热质", "痰湿质"]
  },
  {
    key: "qiTonifying",
    label: "补气",
    category: "functional",
    appliesTo: ["constitution"],
    description: "增强体力与免疫，适合气虚体质者。",
    relatedBodyTypes: ["气虚质"]
  },
  {
    key: "bloodNourishing",
    label: "养血",
    category: "functional",
    appliesTo: ["constitution"],
    description: "补充营养、改善面色，适合血虚体质女性。",
    relatedBodyTypes: ["血虚质"]
  },
  {
    key: "yinNourishing",
    label: "养阴",
    category: "functional",
    appliesTo: ["constitution"],
    description: "滋阴清热，适合阴虚内热体质。",
    relatedBodyTypes: ["阴虚质"]
  },
  {
    key: "yangSupporting",
    label: "助阳",
    category: "functional",
    appliesTo: ["constitution"],
    description: "温肾助阳，适合年老体弱、腰膝酸软等。",
    relatedBodyTypes: ["阳虚质"]
  },
  {
    key: "qiRegulating",
    label: "理气",
    category: "functional",
    appliesTo: ["constitution", "climate"],
    description: "舒缓肝气、缓解郁结，适合肝郁气滞型人群。",
    relatedBodyTypes: ["气郁质"]
  },
  {
    key: "appetiteBoosting",
    label: "健脾开胃",
    category: "functional",
    appliesTo: ["constitution"],
    description: "适合脾虚、食欲不振、疲乏体质。",
    relatedBodyTypes: ["气虚质", "脾虚体质"]
  }
];
