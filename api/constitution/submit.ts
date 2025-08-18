// api/constitution/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// 相对导入你已写好的算法与标签
import { calculateConstitutionResult } from '../../src/utils/constitution/score'
import { constitutionTagMap } from '../../src/utils/constitution/tagMap'

const ALGO_VERSION = '1.0.0'

// 从环境变量创建服务端 Supabase 客户端
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 仅服务端
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null

type OptionScore = 1 | 2 | 3 | 4 | 5
type Answer = { id: number; score: OptionScore }

type Resp =
  | {
      resultId: number | string | null
      mainType: string
      subTypes: string[]
      tags: string[]
      algorithmVersion: string
      createdAt: string
    }
  | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, answers } = (req.body ?? {}) as {
      userId?: string
      answers?: Answer[]
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Invalid input: answers required' })
    }

    for (const a of answers) {
      if (!a || typeof a.id !== 'number' || a.id <= 0) {
        return res.status(400).json({ error: 'Invalid answer id' })
      }
      if (![1, 2, 3, 4, 5].includes(a.score)) {
        return res.status(400).json({ error: 'Invalid answer score' })
      }
    }

    // —— 权威计算（仅后端持有权重）
    const { mainType, subTypes } = calculateConstitutionResult(answers, {
      subTopK: 2,
      subThresholdRatio: 0.55
    })
    const tags = constitutionTagMap[mainType] || []

    // —— 入库并返回主键 id（bigserial 或 uuid 都支持）
    let insertedId: number | string | null = null
    if (supabase) {
      const { data, error } = await supabase
        .from('constitution_results')
        .insert({
          user_id: userId ?? null, // 暂用 deviceId/登录用户 id
          answers, // jsonb
          main_type: mainType,
          sub_types: subTypes, // jsonb
          tags, // jsonb
          algorithm_version: ALGO_VERSION
        })
        .select('id') // 关键：返回新插入行的 id
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
      } else {
        insertedId = (data as any)?.id ?? null
      }
    } else {
      console.warn('Supabase env not set, skip DB insert.')
    }

    return res.status(200).json({
      resultId: insertedId,
      mainType,
      subTypes,
      tags,
      algorithmVersion: ALGO_VERSION,
      createdAt: new Date().toISOString()
    })
  } catch (e: any) {
    console.error('submit error:', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
