// src/pages/B2C/constitution/index.tsx
import React, { useMemo, useState } from 'react'
import { View, Text, Radio, RadioGroup, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

type Question = { id: number; text: string; reverse?: boolean }
type Answer = { id: number; score: 1 | 2 | 3 | 4 | 5 }
type Result = {
  mainType: string
  subTypes: string[]
  tags?: string[]
  algorithmVersion?: string
  createdAt?: string
}

const API_BASE = 'https://your-backend-domain.com/api/constitution'
// const BACKEND_URL = 'https://harmisa.vercel.app/api/constitution/submit'
const LABELS = ['从不', '偶尔', '有时', '经常', '总是']

// 前端仅保留题面（无权重）
const QUESTIONS: Question[] = [
  { id: 1,  text: '您精力充沛吗？',           reverse: true },
  { id: 2,  text: '您容易疲乏吗？'                           },
  { id: 3,  text: '您手脚发凉吗？'                           },
  { id: 4,  text: '您感到手脚心发热吗？'                     },
  { id: 5,  text: '您容易便秘或大便干燥吗？'                 },
  { id: 6,  text: '您面部或鼻部有油腻感吗？'                 },
  { id: 7,  text: '您感到身体沉重不轻松吗？'                 },
  { id: 8,  text: '您的皮肤容易出现青紫瘀斑吗？'             },
  { id: 9,  text: '您感到闷闷不乐吗？'                       },
  { id:10,  text: '您容易过敏吗？'                           },
  { id:11,  text: '您比一般人怕冷吗？'                       },
  { id:12,  text: '您适应环境变化的能力很强？', reverse: true }
]

export default function ConstitutionPage() {
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(0))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers])
  const allAnswered = answeredCount === QUESTIONS.length

  const onChange = (i: number, value: string) => {
    const v = Number(value) as 1 | 2 | 3 | 4 | 5
    const next = [...answers]
    next[i] = v
    setAnswers(next)
  }

  const onSubmit = async () => {
    setError('')
    setResult(null)
    if (!allAnswered) {
      const first = answers.findIndex(v => !v)
      const msg = `请完成第 ${first + 1} 题`
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const payload = { answers: answers.map((score, i) => ({ id: QUESTIONS[i].id, score })) as Answer[] }
      const res = await Taro.request<Result>({
        url: `${API_BASE}/submit`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: payload
      })
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
        setResult(res.data)
        Taro.showToast({ title: '测评完成', icon: 'success' })
      } else {
        throw new Error(`服务器错误：${res.statusCode}`)
      }
    } catch (e: any) {
      const msg = e?.message || '提交失败，请稍后重试'
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='page'>
      <View className='header'>
        <Text className='title'>中医体质测评问卷</Text>
        <Text className='progress'>已答 {answeredCount}/{QUESTIONS.length}</Text>
      </View>

      {QUESTIONS.map((q, i) => (
        <View key={q.id} className='question-card'>
          <Text className='q-index'>{i + 1}</Text>
          <Text className='q-text'>{q.text}</Text>

          <RadioGroup className='options' onChange={(e) => onChange(i, e.detail.value)}>
            {[1, 2, 3, 4, 5].map((v) => (
              <View key={v} className={`option-item ${answers[i] === v ? 'active' : ''}`}>
                <Radio value={String(v)} checked={answers[i] === v} />
                <Text className='opt-label'>{LABELS[v - 1]}</Text>
              </View>
            ))}
          </RadioGroup>
        </View>
      ))}

      {error ? <Text className='error'>{error}</Text> : null}

      <View className='submit-bar'>
        <Button className='submit-btn' onClick={onSubmit} loading={loading} disabled={!allAnswered || loading}>
          {allAnswered ? (loading ? '提交中...' : '提交') : '请先答完全部题目'}
        </Button>
      </View>

      {result && (
        <View className='result-box'>
          <Text className='result-title'>测评结果</Text>
          <Text>主体质：{result.mainType}</Text>
          <Text>副体质：{result.subTypes?.length ? result.subTypes.join('、') : '无'}</Text>
          {result.tags?.length ? <Text>推荐方向：{result.tags.join('、')}</Text> : null}
          {result.algorithmVersion ? <Text className='ver'>算法版本：{result.algorithmVersion}</Text> : null}
          {result.createdAt ? <Text className='ver'>评估时间：{result.createdAt}</Text> : null}
        </View>
      )}
    </View>
  )
}


