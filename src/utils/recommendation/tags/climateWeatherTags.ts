import { TagDefinition } from "../tagTypes";

export const climateWeatherTags: TagDefinition[] = [
  {
    key: "humidHot",
    label: "湿热天气",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "气候闷热、湿度高，易困倦乏力，应清热利湿。",
    climateWeathers: ["湿热"]
  },
  {
    key: "dryHeat",
    label: "干热天气",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "高温少雨，燥热伤津，应润燥养阴、清火降热。",
    climateWeathers: ["干热"]
  },
  {
    key: "coldWet",
    label: "寒湿天气",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "寒冷潮湿，易困脾阳，应温阳化湿、补中益气。",
    climateWeathers: ["寒湿"]
  },
  {
    key: "windCold",
    label: "风寒天气",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "气温突降、大风夹寒，易伤表阳，应祛风散寒。",
    climateWeathers: ["风寒"]
  },
  {
    key: "tempDrop",
    label: "气温骤降",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "短期温差变化剧烈，建议食用温补抗寒类食物。",
    climateWeathers: ["骤降"]
  },
  {
    key: "muggy",
    label: "闷湿闷热",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "体感粘腻、乏力重、食欲差，宜健脾祛湿化滞。",
    climateWeathers: ["闷湿"]
  },
  {
    key: "dryCool",
    label: "干冷天气",
    category: "climateWeather",
    appliesTo: ["climate"],
    description: "风大干冷，易燥咳、鼻干，应润肺暖身、少食寒凉。",
    climateWeathers: ["干冷"]
  }
];
