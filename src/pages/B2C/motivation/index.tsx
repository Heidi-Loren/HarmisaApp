// src/pages/B2C/motivation/index.tsx
import React, { useMemo, useRef, useState } from 'react'
import { View, Text, Radio, RadioGroup, Label, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

/**
 * 新量表前端页面（5 点 Likert）
 * - 题库和打分在 src/utils/motivation/{questionBank,score}.ts
 * - 本文件负责渲染、校验、调用本地打分、提交并缓存
 *
 * 提交到后端时：
 * - 为兼容后端旧接口（score: 1|2|3|4），把每题的 motive 映射为 legacyScore（1..4）
 * - 同时在 payload 中加上 likert 字段保存 1..5 强度（后端若接受额外字段可记录）
 * - 因为 saveMotivation 的 types 仍然期望 MotivationAnswer.score 是 1|2|3|4，
 *   所以我们把 answers 做类型断言 (as unknown as MotivationAnswer[]) 来避免 TS 报错
 */

import MQ from '@/utils/motivation/questionBank'
import { scoreMotivation } from '@/utils/motivation/score'
import { generateMotivationExplanation } from '@/utils/motivation/explain'
import { saveMotivation } from '@/utils/motivation/save'
import { getOrCreateDeviceId } from '@/utils/device'
import { cacheMotivation } from '@/utils/profile/storage'

// helper: 把 Motive (P/H/S/E | null) 映射到后端 legacy score 1..4
function motiveToLegacyScore(motive: 'P' | 'H' | 'S' | 'E' | null): 1 | 2 | 3 | 4 {
  switch (motive) {
    case 'P': return 1
    case 'H': return 2
    case 'S': return 3
    case 'E': return 4
    default: return 2 // 中性回退到 2（历史上 B）
  }
}

export default function MotivationPage() {
  // 初始：未答用空字符串 '' 表示
  const initialAnswers = MQ.map(() => '') as Array<number | ''>
  const [answers, setAnswers] = useState<Array<number | ''>>(initialAnswers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null) // 兼容 generateMotivationExplanation 的输入
  const [explain, setExplain] = useState<any>(null)
  const submittingRef = useRef(false)

  const answeredCount = useMemo(() => answers.filter(a => a !== '').length, [answers])
  const allAnswered = answeredCount === MQ.length

  function onChange(i: number, v: string) {
    const val = Number(v)
    const next = [...answers]
    next[i] = Number.isNaN(val) ? '' : val
    setAnswers(next)
  }

  async function onSubmit() {
    if (submittingRef.current) return
    setError('')
    setResult(null)
    setExplain(null)

    if (!allAnswered) {
      const first = answers.findIndex(v => v === '')
      const msg = `请完成第 ${first + 1} 题`
      setError(msg)
      Taro.showToast({ title: msg, icon: 'none' })
      return
    }

    try {
      submittingRef.current = true
      setLoading(true)

      // 1) 本地计算画像（新 scoreMotivation）
      const answerArr = answers.map((v, idx) => ({ id: MQ[idx].id, value: Number(v) }))
      const scored = scoreMotivation(answerArr)

      // 兼容旧 explain 的结构：{ main, secondary: string[], ratio }
      const compatibleResult = {
        main: scored.main,
        secondary: scored.secondary ? (Array.isArray(scored.secondary) ? scored.secondary : [scored.secondary]) : [],
        ratio: {
          P: Number((scored.normScore.P ?? 0).toFixed(3)),
          H: Number((scored.normScore.H ?? 0).toFixed(3)),
          S: Number((scored.normScore.S ?? 0).toFixed(3)),
          E: Number((scored.normScore.E ?? 0).toFixed(3))
        },
        _internalFlags: scored.flags
      }

      setResult(compatibleResult)
      const exp = generateMotivationExplanation(compatibleResult)
      setExplain(exp)

      // 2) 准备提交数据：保留 likert 强度，并提供 legacy score（motive 映射为 1..4）
      const deviceId = getOrCreateDeviceId()
      const payloadAnswers = answers.map((v, i) => {
        const likertVal = Number(v)
        const motive = MQ[i].motive ?? null
        const legacyScore = motiveToLegacyScore(motive) // 1..4
        return {
          id: i + 1,           // 保持题号为 1..N（后端期望）
          score: legacyScore,  // legacy 兼容字段 (1|2|3|4)
          likert: likertVal    // 新字段：强度 1..5（额外信息，可被后端记录）
        }
      })

      // 3) 提交（类型断言以兼容旧类型声明：saveMotivation 仍期望 MotivationAnswer.score 是 1|2|3|4）
      // 注意：我们确保 score 字段值为 1..4，符合类型；likert 是额外字段，可能会被后端忽略
      await saveMotivation({
        userId: null,
        deviceId,
        // as unknown cast 用于允许额外字段 likert 存在而不被 TS 类型阻止
        answers: payloadAnswers as unknown as Parameters<typeof saveMotivation>[0]['answers']
      })

      // 4) 提交成功后写入本地 cache（保持原接口）
      cacheMotivation({
        main: compatibleResult.main,
        secondary: compatibleResult.secondary,
        ratio: compatibleResult.ratio
      })

      // 5) 可选：触发一次服务端画像重算（失败不阻断）
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

      // 6) 提示（若检测到注意力未通过等）
      if (scored.flags && scored.flags.attentionPassed === false) {
        Taro.showToast({ title: '提交成功（注意：答题检测未通过，结果可信度可能较低）', icon: 'none', duration: 2500 })
      } else {
        Taro.showToast({ title: '提交成功', icon: 'success' })
      }
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
    setAnswers(MQ.map(() => '') as Array<number | ''>)
    setResult(null)
    setExplain(null)
    setError('')
  }

  return (
    <View className='page motivation'>
      <View className='header'>
        <Text className='title'>四维动因问卷（5 点量表）</Text>
        <Text className='progress'>已答 {answeredCount}/{MQ.length}</Text>
      </View>

      {MQ.map((q, i) => (
        <View key={q.id} className='question-card'>
          <Text className='q-index'>{i + 1}</Text>
          <Text className='q-text'>{q.text}</Text>

          <RadioGroup
            className='options'
            onChange={(e: any) => onChange(i, e?.detail?.value as string)}
          >
            {[1,2,3,4,5].map(v => (
              <Label
                key={v}
                className={`option-item ${answers[i] === v ? 'active' : ''}`}
                for={`${q.id}-opt${v}`}
              >
                <Radio id={`${q.id}-opt${v}`} value={String(v)} checked={answers[i] === v} />
                <Text className='opt-label'>{v}</Text>
              </Label>
            ))}
            <View className='likert-legend'>
              <Text className='legend-item'>1 非常不同意</Text>
              <Text className='legend-item'>2 不同意</Text>
              <Text className='legend-item'>3 中立/一般</Text>
              <Text className='legend-item'>4 同意</Text>
              <Text className='legend-item'>5 非常同意</Text>
            </View>
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
          {allAnswered ? (loading ? '提交中...' : '提交问卷') : `请先答完全部题目 (${answeredCount}/${MQ.length})`}
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
              {result.secondary && result.secondary.length ? result.secondary.join(' / ') : '无'}
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

          {result._internalFlags && (
            <View className='stability-note'>
              <Text>检测：</Text>
              <Text>
                {result._internalFlags.stability ? `稳定性: ${result._internalFlags.stability}； ` : ''}
                {result._internalFlags.attentionPassed === false ? '未通过注意力检测。' : ''}
                {result._internalFlags.consistencyOK === false ? '一致性检测提示复测。' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
