// src/utils/api/environment.ts
import Taro from '@tarojs/taro'

export type EnvInfo = {
  province: string
  city: string
  season: '春'|'夏'|'秋'|'冬'
  weather: { temp: number|null; humidity?: number|null; wind_kmh?: number|null; code?: number|null }
  tags: string[]
  directionRanking: string[]
  recommendedFoodTags: string[]
  avoidTags: string[]
  _debug?: any
}

const API_BASE = 'https://harmisa-app.vercel.app/api/environment' // 你的后端域名

export async function resolveEnvByLocation(lat: number, lon: number) {
  const res = await Taro.request<EnvInfo>({ url: `${API_BASE}/resolve`, method: 'GET', data: { lat, lon }, timeout: 20000 })
  if (res.statusCode < 200 || res.statusCode >= 300 || (res.data as any)?.error) throw new Error((res.data as any)?.error || '环境获取失败')
  return res.data
}

export async function resolveEnvByCity(city: string) {
  const res = await Taro.request<EnvInfo>({ url: `${API_BASE}/resolve`, method: 'GET', data: { city }, timeout: 20000 })
  if (res.statusCode < 200 || res.statusCode >= 300 || (res.data as any)?.error) throw new Error((res.data as any)?.error || '环境获取失败')
  return res.data
}

export async function submitEnvResult(payload: {
  userId?: string|null
  city?: string
  province?: string
  season?: string
  weather?: any
  tags?: string[]
  algorithmVersion?: string
}) {
  const res = await Taro.request<{ resultId?: string|number }>({
    url: `${API_BASE}/submit`,
    method: 'POST',
    data: payload,
    timeout: 20000,
    header: { 'Content-Type': 'application/json' }
  })
  if (res.statusCode < 200 || res.statusCode >= 300 || (res.data as any)?.error) throw new Error((res.data as any)?.error || '保存失败')
  return res.data
}
