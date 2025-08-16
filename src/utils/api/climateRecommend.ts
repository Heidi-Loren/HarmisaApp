// src/utils/climate/climateRecommend.ts

import { generateFoodRecommendation } from '@/utils/climate/recommend'

export function getClimateRecommendation({
  date,
  temperature,
  humidity,
  windSpeed,
  precipitation,
  sunshineHours = 0,
}: {
  date: string
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
  sunshineHours?: number
}) {
  if (
    date === undefined ||
    temperature === undefined ||
    humidity === undefined ||
    windSpeed === undefined ||
    precipitation === undefined
  ) {
    throw new Error('缺少必要的参数')
  }

  const recommendation = generateFoodRecommendation({
    date,
    temperature,
    humidity,
    windSpeed,
    precipitation,
    sunshineHours,
    city: 'Shanghai'
  })

  console.log('✅ Recommendation:', recommendation)
  console.log('✅ JSON preview:', JSON.stringify(recommendation))

  return recommendation
}
