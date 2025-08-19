// api/environment/resolve.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// --------- Types ---------
type Season = '春' | '夏' | '秋' | '冬'
type WeatherInfo = {
  temp: number | null
  humidity?: number | null
  windKmh?: number | null
  code?: number | null
}
type RespOk = {
  province: string
  city: string
  season: Season
  weather: WeatherInfo
  tags: string[]                 // 功效方向（清热/祛湿/润燥/温阳…）
  directionRanking: string[]     // 方向排序（权重从高到低）
  recommendedFoodTags: string[]  // 食材/功效标签（MVP：先用方向词，后续换你自己的tagMap）
  avoidTags: string[]            // 忌口方向
  _debug?: any
}
type RespErr = { error: string; _debug?: any }

// --------- Helpers ---------
function getSeasonByMonth(m: number): Season {
  if ([3, 4, 5].includes(m)) return '春'
  if ([6, 7, 8].includes(m)) return '夏'
  if ([9, 10, 11].includes(m)) return '秋'
  return '冬'
}

// 简单城市到省份映射兜底（如果只给 city）
const cityToProvinceFallback: Record<string, string> = {
  '北京市': '北京市', '上海市': '上海市', '广州市': '广东省', '深圳市': '广东省'
  // TODO: 补全或改用你的 provinceToRegion.ts
}

async function reverseGeocode(lat: string, lon: string) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`
  const resp = await fetch(url, { headers: { 'User-Agent': 'HarmisaApp MVP' } })
  const data = await resp.json().catch(() => null as any)
  const province =
    data?.address?.state || data?.address?.province || data?.address?.region || ''
  const city =
    data?.address?.city ||
    data?.address?.town ||
    data?.address?.county ||
    data?.address?.district ||
    ''
  return { province, city }
}

async function getCurrentWeather(lat: string, lon: string): Promise<WeatherInfo> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
    lat
  )}&longitude=${encodeURIComponent(
    lon
  )}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
  const resp = await fetch(url)
  const j = await resp.json().catch(() => null as any)
  const cur = j?.current || {}
  return {
    temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : null,
    humidity:
      typeof cur.relative_humidity_2m === 'number'
        ? cur.relative_humidity_2m
        : null,
    windKmh:
      typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : null,
    code: typeof cur.weather_code === 'number' ? cur.weather_code : null
  }
}

// MVP 打分规则（季节 + 气象 → 方向）
function computeDirections(season: Season, w: WeatherInfo) {
  const score: Record<string, number> = {
    清热: 0,
    生津: 0,
    祛湿: 0,
    润燥: 0,
    温阳: 0,
    驱寒: 0,
    健脾: 0,
    清淡解腻: 0,
    营养均衡: 0
  }
  const t = w.temp ?? 0
  const h = w.humidity ?? 0
  const wind = w.windKmh ?? 0

  // 季节基线
  if (season === '夏') {
    score['清热'] += 2
    score['生津'] += 1.5
    score['清淡解腻'] += 1
  } else if (season === '冬') {
    score['温阳'] += 2
    score['驱寒'] += 1.5
  } else if (season === '秋') {
    score['润燥'] += 2
  } else if (season === '春') {
    score['健脾'] += 1
    score['清淡解腻'] += 0.5
  }

  // 气温
  if (t >= 30) {
    score['清热'] += 2
    score['生津'] += 1
  } else if (t <= 10) {
    score['温阳'] += 1.5
    score['驱寒'] += 1
  }

  // 湿度
  if (h >= 70) {
    score['祛湿'] += 2
    score['健脾'] += 1
  } else if (h <= 35) {
    score['润燥'] += 1.5
  }

  // 风
  if (wind >= 30) {
    // 大风天，少生冷，偏温和/健脾
    score['健脾'] += 0.8
    score['温阳'] += 0.5
  }

  // 兜底
  if (Object.values(score).every(v => v <= 0)) score['营养均衡'] = 1

  const ranking = Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)

  // 推荐 & 忌口（MVP：先用方向词，后续可替换成你的 tagMap）
  const top3 = ranking.slice(0, 3)
  const avoid: string[] = []
  if (t >= 32) avoid.push('温补厚腻')
  if (t <= 8) avoid.push('寒凉生冷')
  if (h >= 75) avoid.push('重口油腻')
  if (season === '秋') avoid.push('辛辣燥热')

  return {
    tags: Array.from(new Set(top3)),
    directionRanking: ranking,
    recommendedFoodTags: top3, // TODO: 用你的 tagMapping.ts 映射到食材标签
    avoidTags: Array.from(new Set(avoid))
  }
}

// --------- Handler ---------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RespOk | RespErr>
) {
  try {
    const { lat, lon, city: manualCity } = req.query as {
      lat?: string
      lon?: string
      city?: string
    }

    if (!manualCity && (!lat || !lon)) {
      return res
        .status(400)
        .json({ error: 'lat/lon or city required', _debug: { q: req.query } })
    }

    // 1) 城市/省份
    let province = ''
    let city = manualCity || ''
    if (!city && lat && lon) {
      const g = await reverseGeocode(lat, lon)
      province = g.province || ''
      city = g.city || ''
    }
    if (!province && city) {
      province = cityToProvinceFallback[city] || ''
    }

    // 2) 季节
    const season = getSeasonByMonth(new Date().getMonth() + 1)

    // 3) 天气（若没有经纬度，天气留空但依然给规则输出）
    const weather = lat && lon ? await getCurrentWeather(lat, lon) : { temp: null }

    // 4) 规则 → 方向/标签
    // TODO: 这里可以换成你 utils/climate/recommend.ts 的入口
    const rec = computeDirections(season, weather)

    // 5) 汇总响应
    const payload: RespOk = {
      province,
      city,
      season,
      weather,
      tags: rec.tags,
      directionRanking: rec.directionRanking,
      recommendedFoodTags: rec.recommendedFoodTags,
      avoidTags: rec.avoidTags,
      _debug: {
        version: 'env-resolve-1',
        hasLatLon: !!(lat && lon),
        hadProvince: !!province
      }
    }

    return res.status(200).json(payload)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'server error' })
  }
}
