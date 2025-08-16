import { getSeasonFromDate } from './season';

export interface ClimateData {
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  sunshineHours: number;
  city: string;
}

export function computeClimateWeights(data: ClimateData): Record<string, number> {
  const season = getSeasonFromDate(data.date);

  const baseWeights = {
    温补助阳: 0,
    清热祛暑: 0,
    祛湿健脾: 0,
    滋阴润肺: 0,
    疏肝理气: 0,
  };

  // 季节加权
  if (season === '冬') baseWeights['温补助阳'] += 3;
  if (season === '夏') baseWeights['清热祛暑'] += 3;
  if (season === '春') baseWeights['疏肝理气'] += 2;
  if (season === '秋') baseWeights['滋阴润肺'] += 2;

  // 气温
  if (data.temperature < 10) baseWeights['温补助阳'] += 2;
  else if (data.temperature > 30) baseWeights['清热祛暑'] += 2;
  else if (data.temperature >= 25 && data.temperature <= 30) baseWeights['滋阴润肺'] += 1;

  // 湿度
  if (data.humidity > 85) baseWeights['祛湿健脾'] += 2;
  else if (data.humidity < 40) baseWeights['滋阴润肺'] += 1;

  // 风
  if (data.windSpeed >= 25) baseWeights['温补助阳'] += 1;

  // 降雨
  if (data.precipitation > 10) baseWeights['祛湿健脾'] += 2;

  // 日照
  if (data.sunshineHours < 2) baseWeights['疏肝理气'] += 1;

  return baseWeights;
}
