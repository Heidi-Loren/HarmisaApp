// src/pages/B2C/environment/index.tsx
import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import {
  resolveEnvByLocation,
  resolveEnvByCity,
  submitEnvResult,
  type EnvInfo
} from '@/utils/api/environment'
import { provinceToRegion } from '@/utils/climate/provinceToRegion'
import { getOrCreateDeviceId } from '@/utils/device'
import './index.scss'

// 固定区域顺序
const REGION_ORDER = ['华东', '华南', '华北', '西南', '西北'] as const

// 反向映射：“区域 -> 省[]”，并做规范化
const REGION_TO_PROVINCES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  REGION_ORDER.forEach((r) => (map[r] = []))
  Object.entries(provinceToRegion).forEach(([prov, region]) => {
    const r = String(region || '').trim()
    if (!map[r]) map[r] = []
    map[r].push(prov)
  })
  Object.keys(map).forEach((k) => map[k].sort())
  return map
})()

export default function EnvironmentPage() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useDidShow(() => {
    bootstrap()
  })

  async function bootstrap() {
    setError('')
    setLoading(true)
    try {
      const authed = await ensureLocationAuth()
      if (authed) {
        const loc = await Taro.getLocation({ type: 'wgs84', isHighAccuracy: true })
        const info = await resolveEnvByLocation(loc.latitude, loc.longitude)
        setEnv(info)
      } else {
        await pickCity()
      }
    } catch (e: any) {
      setEnv(null)
      setError(e?.message || '获取环境信息失败')
      Taro.showToast({ title: '定位/天气获取失败，可手动选择城市', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  async function ensureLocationAuth(): Promise<boolean> {
    try {
      const s = await Taro.getSetting()
      if (s.authSetting['scope.userLocation']) return true
      const r = await Taro.authorize({ scope: 'scope.userLocation' })
      return r.errMsg?.includes('ok')
    } catch {
      return false
    }
  }

  // 两步 ActionSheet：区域 -> 省份
  async function pickCity() {
    try {
      const resRegion = await Taro.showActionSheet({
        itemList: REGION_ORDER as unknown as string[]
      })
      const region = REGION_ORDER[resRegion.tapIndex]
      if (!region) return

      const provList = (REGION_TO_PROVINCES[region] || []).map((s) => s.trim())
      if (!provList.length) {
        Taro.showToast({ title: '该区域暂无可选省份', icon: 'none' })
        return
      }

      const resProv = await Taro.showActionSheet({ itemList: provList })
      const province = provList[resProv.tapIndex]
      if (!province) return

      setLoading(true)
      const info = await resolveEnvByCity(province) // 后端会做规范化
      setEnv(info)

      // 想记住选择：Taro.setStorageSync('envPreferredCity', province)
    } catch {
      // 用户取消
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (!env) return
    try {
      const deviceId = getOrCreateDeviceId() // ✅ 带上设备ID
      await submitEnvResult({
        userId: null,
        deviceId, // ✅ 新增
        city: env.city,
        province: env.province,
        season: env.season,
        weather: env.weather,
        tags: env.tags,
        avoidTags: env.avoidTags,
        algorithmVersion: env._debug?.version || '1.0.0'
      })
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' })
    }
  }

  // 头部文案：若 city 与 province 相同或为空，就只显示 province
  function headerTitle() {
    if (!env) return '定位中...'
    const city = String(env.city || '').trim()
    const prov = String(env.province || '').trim()
    if (!city || city === prov) return prov || city || '未识别'
    return `${city} · ${prov}`
  }

  return (
    <View className='env-page'>
      <View className='header'>
        <Text className='city'>{headerTitle()}</Text>
        {env ? <Text className='season'>{env.season}</Text> : null}
      </View>

      {loading && <Text className='hint'>环境饮食推荐加载中…</Text>}
      {error && <Text className='error'>{error}</Text>}

      {env && (
        <>
          <View className='card weather'>
            <Text className='temp'>
              {env?.weather?.temp != null ? Math.round(env.weather.temp) : '--'}°
            </Text>
            <Text className='meta'>
              湿度 {env?.weather?.humidity ?? '--'}% · 风 {env?.weather?.wind_kmh ?? '--'} km/h
            </Text>
          </View>

          <View className='card suggest'>
            <Text className='title'>建议方向</Text>
            <View className='tags'>
              {env.tags.map((t) => (
                <Text key={t} className='tag'>
                  {t}
                </Text>
              ))}
            </View>
          </View>

          {!!env.avoidTags?.length && (
            <View className='card avoid'>
              <Text className='title'>忌口</Text>
              <View className='tags'>
                {env.avoidTags.map((t) => (
                  <Text key={t} className='tag warn'>
                    {t}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <Text className='foot'>
            来源：Open‑Meteo · 版本 {env._debug?.version || '1.0.0'}
          </Text>
        </>
      )}

      <View className='actions'>
        <Button onClick={bootstrap} loading={loading} disabled={loading}>
          刷新
        </Button>
        <Button onClick={pickCity} disabled={loading}>
          选择地域
        </Button>
        <Button onClick={onSave} disabled={!env || loading}>
          保存本次结果
        </Button>
      </View>
    </View>
  )
}
