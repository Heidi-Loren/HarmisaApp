'use client'

import { useState } from 'react'

export default function ClimateRecommendationPage() {
  const [formData, setFormData] = useState({
    date: '',
    temperature: '',
    humidity: '',
    windSpeed: '',
    precipitation: '',
    sunshineHours: '',
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/climate-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity),
          windSpeed: parseFloat(formData.windSpeed),
          precipitation: parseFloat(formData.precipitation),
          sunshineHours: parseFloat(formData.sunshineHours),
        }),
      })

      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error('❌ Error:', err)
      setResult({ error: '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🌦 气候饮食推荐</h1>
      <div className="space-y-4">
        {['date', 'temperature', 'humidity', 'windSpeed', 'precipitation', 'sunshineHours'].map((field) => (
          <div key={field}>
            <label className="block mb-1 font-medium">{field}</label>
            <input
              type={field === 'date' ? 'date' : 'number'}
              name={field}
              value={(formData as any)[field]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={loading}
        >
          {loading ? '加载中...' : '获取推荐'}
        </button>
      </div>

      {result && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">🍽 推荐结果</h2>
          {result.error ? (
            <p className="text-red-600">{result.error}</p>
          ) : (
            <div className="space-y-2">
              <p>📌 季节建议：{result.seasonalTips}</p>
              <p>📊 推荐方向排序：</p>
              <ul className="list-disc pl-5">
                {result.directionRanking.map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              <p>✅ 推荐食材标签：</p>
              <ul className="list-disc pl-5">
                {result.recommendedFoodTags.map((tag: string, i: number) => (
                  <li key={i}>{tag}</li>
                ))}
              </ul>
              {result.avoidTags?.length > 0 && (
                <>
                  <p>⚠️ 忌口标签：</p>
                  <ul className="list-disc pl-5 text-red-500">
                    {result.avoidTags.map((tag: string, i: number) => (
                      <li key={i}>{tag}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
