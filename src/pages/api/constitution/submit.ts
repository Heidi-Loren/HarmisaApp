// src/pages/api/constitution/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { calculateConstitutionResult } from '@/utils/constitution/score'
import { constitutionTagMap } from '@/utils/constitution/tagMap'

const ALGO_VERSION = '1.0.0'

type OptionScore = 1 | 2 | 3 | 4 | 5
type Answer = { id: number; score: OptionScore }

type Resp =
  | { mainType: string; subTypes: string[]; tags: string[]; algorithmVersion: string; createdAt: string }
  | { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { userId, answers } = req.body as { userId?: string; answers?: Answer[] }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Invalid input: answers required' })
    }
    // 基础校验：score范围、id为正
    for (const a of answers) {
      if (!a || typeof a.id !== 'number' || a.id <= 0) return res.status(400).json({ error: 'Invalid answer id' })
      if (![1, 2, 3, 4, 5].includes(a.score)) return res.status(400).json({ error: 'Invalid answer score' })
    }

    // 权威计算（仅后端持有权重）
    const { mainType, subTypes } = calculateConstitutionResult(answers)
    const tags = constitutionTagMap[mainType] || []

    // 入库（可按需调整表名/字段）
    const { error: dbErr } = await supabase.from('constitution_results').insert({
      user_id: userId ?? null,
      answers,                       // jsonb
      main_type: mainType,
      sub_types: subTypes,           // jsonb
      tags,                          // jsonb
      algorithm_version: ALGO_VERSION
    })
    if (dbErr) {
      // 不阻断返回给前端的结果，但记录错误
      console.error('Supabase insert error:', dbErr)
    }

    return res.status(200).json({
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
