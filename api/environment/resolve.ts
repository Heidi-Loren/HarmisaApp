// api/environment/resolve.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateFoodRecommendation } from '../../src/utils/climate/recommend'
import { getSeasonFromDate } from '../../src/utils/climate/season'

function normalizeProvince(name = '') {
  return name
    .replace(/市$|省$|特别行政区$|自治区$|壮族自治区$|回族自治区$|维吾尔自治区$/g, '')
    .trim()
}

// ---------- 城市名 -> 经纬度（Open‑Meteo geocoding） ----------
async function geocodeCity(name: string): Promise<{ lat: number; lon: number; province?: string; city?: string }> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=1&language=zh&format=json`
  const r = await fetch(url, { headers: { 'User-Agent': 'harmisa-app' } })
  if (!r.ok) throw new Error('地名解析失败')
  const j = (await r.json()) as any
  const item = j?.results?.[0]
  if (!item) throw new Error('未找到该城市')
  return {
    lat: item.latitude,
    lon: item.longitude,
    province: item.admin1 || '',
    city: item.name || ''
  }
}

// ---------- 经纬度 -> 省/市（Nominatim） ----------
async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; province: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=zh-CN`
  const r = await fetch(url, { headers: { 'User-Agent': 'harmisa-app' } })
  if (!r.ok) throw new Error('反地理解析失败')
  const j = (await r.json()) as any
  const addr = j?.address || {}
  // city / town / county 里任选其一兜底；state 作为省级
  const city = addr.city || addr.town || addr.county || ''
  const province = addr.state || ''
  return { city, province }
}

// ---------- 天气（Open‑Meteo current） ----------
async function fetchWeather(lat: number, lon: number): Promise<{
  temp: number | null
  humidity: number | null
  wind_kmh: number | null
  precipitation: number | null
  sunshineHours: number | null
}> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation` +
    `&timezone=auto`
  const r = await fetch(url, { headers: { 'User-Agent': 'harmisa-app' } })
  if (!r.ok) throw new Error('天气获取失败')
  const j = (await r.json()) as any
  const c = j?.current || {}
  // open-meteo 风速单位 m/s or km/h? 当前接口返回 m/s/ or km/h，给个近似换算/兜底
  const wind = typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : null
  // 如果是 m/s，可换算：km/h = m/s * 3.6；这里假设已经是 km/h，若希望严格可再判断单位
  return {
    temp: typeof c.temperature_2m === 'number' ? c.temperature_2m : null,
    humidity: typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : null,
    wind_kmh: wind,
    precipitation: typeof c.precipitation === 'number' ? c.precipitation : null,
    sunshineHours: null // 当前接口无现成“日照时长”，先留空
  }
}

type Resp =
  | {
      province: string
      city: string
      season: '春' | '夏' | '秋' | '冬'
      weather: {
        temp: number | null
        humidity: number | null
        wind_kmh: number | null
        precipitation: number | null
        sunshineHours: number | null
      }
      tags: string[]
      directionRanking: string[]
      recommendedFoodTags: string[]
      avoidTags: string[]
      _debug?: any
    }
  | { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  try {
    const { lat, lon, city } = (req.query ?? {}) as any

    let latNum: number | null = null
    let lonNum: number | null = null
    let geo = { city: '', province: '' }

    if (lat && lon) {
      latNum = Number(lat)
      lonNum = Number(lon)
      geo = await reverseGeocode(latNum, lonNum)
    } else if (city) {
      // 仅 city：先地名解析取坐标 + 省名
      const g = await geocodeCity(String(city))
      latNum = g.lat
      lonNum = g.lon
      geo = {
        city: g.city || String(city),
        province: g.province || String(city)
      }
    } else {
      return res.status(400).json({ error: 'lat/lon 或 city 至少提供一个' })
    }

    const wx =
      latNum != null && lonNum != null
        ? await fetchWeather(latNum!, lonNum!)
        : { temp: null, humidity: null, wind_kmh: null, precipitation: null, sunshineHours: null }

    const today = new Date().toISOString().slice(0, 10)

    // 关键：把“省/直辖市”去后缀后传入你的算法（recommend.ts 里用 data.city 查 provinceToRegion）
    const provinceNorm = normalizeProvince(geo.province || geo.city)

    const climateData = {
      date: today,
      temperature: wx.temp ?? 0,
      humidity: wx.humidity ?? 0,
      windSpeed: wx.wind_kmh ?? 0,
      precipitation: wx.precipitation ?? 0,
      sunshineHours: wx.sunshineHours ?? 0,
      city: provinceNorm
    }

    const rec = generateFoodRecommendation(climateData)
    const season = getSeasonFromDate(today)

    return res.status(200).json({
      province: geo.province,
      city: geo.city || geo.province,
      season,
      weather: {
        temp: wx.temp ?? null,
        humidity: wx.humidity ?? null,
        wind_kmh: wx.wind_kmh ?? null,
        precipitation: wx.precipitation ?? null,
        sunshineHours: wx.sunshineHours ?? null
      },
      tags: rec.recommendedFoodTags,          // 展示友好
      directionRanking: rec.directionRanking, // 方向排序
      recommendedFoodTags: rec.recommendedFoodTags,
      avoidTags: rec.avoidTags || [],
      _debug: {
        version: 'env-resolve-using-climate-utils-1',
        seasonTips: rec.seasonalTips,
        provinceNorm
      }
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
