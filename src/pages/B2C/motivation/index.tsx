// src/pages/B2C/motivation/index.tsx
import React, { useMemo, useRef, useState } from 'react'
import { View, Text, Radio, RadioGroup, Label, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

import { calculateMotivationProfile, type Option } from '@/utils/motivation/score'
import { generateMotivationExplanation } from '@/utils/motivation/explain'
import { saveMotivation } from '@/utils/motivation/save'
import { getOrCreateDeviceId } from '@/utils/device'

// —— 题目（12题）
const QUESTIONS: string[] = [
  '你最常考虑什么因素来决定吃什么？',
  '健身/学习期间，你如何选择饮食？',
  '你是否愿意查阅营养信息来规划饮食？',
  '你偏好的饮食报告格式是？',
  '你改变饮食习惯的最大动因是？',
  '你更容易开始健康饮食的方式是？',
  '你希望App提醒饮食频率是？',
  '你看到推荐推送时的反应是？',
  '情绪低落时你会？',
  '下班后你更常吃的类型？',
  '换城市生活时你如何选饮食？',
  '你饮食会随天气/季节变化吗？'
]

// —— 选项文案
const OPTION_LABEL: Record<Option, string> = {
  A: 'A. 健康目标/计划导向',
  B: 'B. 习惯和熟悉度',
  C: 'C. 社交场景影响',
  D: 'D. 情绪与当下状态'
}

// —— A/B/C/D → 数值（提交答案用）
function optionToScore(opt: Option) {
  return opt === 'A' ? 1 : opt === 'B' ? 2 : opt === 'C' ? 3 : 4
}

export default function MotivationPage() {
  const [answers, setAnswers] = useState<Array<Option | ''>>(Array(12).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReturnType<typeof calculateMotivationProfile> | null>(null)
  const [explain, setExplain] = useState<ReturnType<typeof generateMotivationExplanation> | null>(null)
  const submittingRef = useRef(false)

  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers])
  const allAnswered = answeredCount === QUESTIONS.length

  function onChange(i: number, v: string) {
    const next = [...answers]
    next[i] = v as Option
    setAnswers(next)
  }

  async function onSubmit() {
    if (submittingRef.current) return
    setError('')
    setResult(null)
    setExplain(null)

    if (!allAnswered) {
      const first = answers.findIndex(v => !v)
      const msg = `请完成第 ${first + 1} 题`
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
      return
    }

    try {
      submittingRef.current = true
      setLoading(true)

      // 1) 本地计算动因画像
      const r = calculateMotivationProfile(answers as Option[])
      setResult(r)
      const exp = generateMotivationExplanation(r)
      setExplain(exp)

      // 2) 提交到后端
      const deviceId = getOrCreateDeviceId()
      await saveMotivation({
        userId: null,            // 现阶段无登录
        deviceId,                // ✅ 带上设备ID
        answers: (answers as Option[]).map((opt, i) => ({
          id: i + 1,
          score: optionToScore(opt)
        }))
      })

      // 3) 提交成功后触发一次汇总，落到 device_profiles（失败不阻断）
      try {
        await Taro.request({
          url: 'https://harmisa-app.vercel.app/api/profile/recompute',
          method: 'POST',
          data: { deviceId },
          header: { 'Content-Type': 'application/json' },
          timeout: 20000
        })
      } catch {
        // 静默忽略
      }

      Taro.showToast({ title: '提交成功', icon: 'success' })
    } catch (e: any) {
      const msg = e?.message || '提交失败，请稍后重试'
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  function onReset() {
    setAnswers(Array(12).fill(''))
    setResult(null)
    setExplain(null)
    setError('')
  }

  return (
    <View className='page motivation'>
      <View className='header'>
        <Text className='title'>四维动因问卷</Text>
        <Text className='progress'>已答 {answeredCount}/{QUESTIONS.length}</Text>
      </View>

      {QUESTIONS.map((q, i) => (
        <View key={i} className='question-card'>
          <Text className='q-index'>{i + 1}</Text>
          <Text className='q-text'>{q}</Text>

          <RadioGroup
            className='options'
            onChange={(e: any) => onChange(i, e?.detail?.value as string)}
          >
            {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
              <Label
                key={opt}
                className={`option-item ${answers[i] === opt ? 'active' : ''}`}
                for={`q${i + 1}-opt${opt}`}
              >
                <Radio id={`q${i + 1}-opt${opt}`} value={opt} checked={answers[i] === opt} />
                <Text className='opt-label'>{OPTION_LABEL[opt]}</Text>
              </Label>
            ))}
          </RadioGroup>
        </View>
      ))}

      {error ? <Text className='error'>{error}</Text> : null}

      <View className='submit-bar'>
        <Button
          className='submit-btn'
          onClick={onSubmit}
          loading={loading}
          disabled={!allAnswered || loading}
        >
          {allAnswered ? (loading ? '提交中...' : '提交问卷') : '请先答完全部题目'}
        </Button>
        <Button className='reset-btn' onClick={onReset} disabled={loading}>
          重置
        </Button>
      </View>

      {result && explain && (
        <View className='result-box'>
          <Text className='result-title'>动因画像</Text>

          <View className='row'>
            <Text className='label'>主标签：</Text>
            <Text className='value'>{result.main} · {explain.mainLabel}</Text>
          </View>

          <View className='row'>
            <Text className='label'>副标签：</Text>
            <Text className='value'>
              {result.secondary.length ? result.secondary.join(' / ') : '无'}
            </Text>
          </View>

          <View className='ratio'>
            <Text className='label'>动因比例：</Text>
            <View className='ratio-items'>
              <Text>P {result.ratio.P}</Text>
              <Text>H {result.ratio.H}</Text>
              <Text>S {result.ratio.S}</Text>
              <Text>E {result.ratio.E}</Text>
            </View>
          </View>

          <View className='explain'>
            <Text className='ex-title'>主标签解释</Text>
            <Text className='ex-text'>{explain.mainText}</Text>

            {!!explain.secondaryText && (
              <>
                <Text className='ex-title'>副标签解释</Text>
                <Text className='ex-text'>{explain.secondaryText}</Text>
              </>
            )}

            <Text className='ex-title'>总结</Text>
            <Text className='ex-text'>{explain.summaryText}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
