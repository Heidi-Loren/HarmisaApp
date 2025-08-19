import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'

export default function EnvironmentPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useDidShow(() => {
    getEnvResult()
  })

  async function getEnvResult() {
    setLoading(true)
    try {
      const loc = await Taro.getLocation({ type: 'wgs84' })
      const res = await Taro.request({
        url: 'https://harmisa-app.vercel.app/api/environment/resolve',
        method: 'GET',
        data: { lat: loc.latitude, lon: loc.longitude }
      })
      setResult(res.data)
    } catch (e) {
      Taro.showToast({ title: '定位失败，使用默认城市', icon: 'none' })
      const res = await Taro.request({
        url: 'https://harmisa-app.vercel.app/api/environment/resolve',
        method: 'GET',
        data: { city: '上海市' }
      })
      setResult(res.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='env-page'>
      <Text className='title'>🌦 环境饮食推荐</Text>
      {loading && <Text>加载中...</Text>}
      {result && (
        <View>
          <Text>📍 地点：{result.city} {result.province}</Text>
          <Text>🍂 季节：{result.season}</Text>
          <Text>🌡 温度：{result.weather.temp}℃</Text>

          <Text>📌 建议方向：</Text>
          {result.tags.map((t: string, i: number) => <Text key={i}>{t}</Text>)}

          <Text>✅ 推荐食材：</Text>
          {result.recommendedFoodTags.map((f: string, i: number) => <Text key={i}>{f}</Text>)}

          {result.avoidTags?.length > 0 && (
            <Text>⚠️ 忌口：{result.avoidTags.join('、')}</Text>
          )}
        </View>
      )}
      <Button onClick={getEnvResult}>刷新</Button>
    </View>
  )
}
