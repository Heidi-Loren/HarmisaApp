// api/constitution/submit.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 相对导入你已写好的算法与标签（不要用 @ 别名）
import { calculateConstitutionResult } from '../../src/utils/constitution/score'
import { constitutionTagMap } from '../../src/utils/constitution/tagMap'

const ALGO_VERSION = '1.0.0'

// --------- Supabase（仅服务端使用 Service Role；也可先不用入库）---------
const supabaseUrl = process.env.SUPABASE_URL as string | undefined
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null
// -------------------------------------------------------------------------

type OptionScore = 1 | 2 | 3 | 4 | 5
type Answer = { id: number; score: OptionScore }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = (req.body ?? {}) as { userId?: string; answers?: Answer[] }
    const { userId, answers } = body

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
      subThresholdRatio: 0.55,
    })
    const tags = constitutionTagMap[mainType] || []

    // —— 入库（如果你在 Vercel 配好 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）
    if (supabase) {
      const { error } = await supabase.from('constitution_results').insert({
        user_id: userId ?? null,
        answers,                 // jsonb
        main_type: mainType,
        sub_types: subTypes,     // jsonb
        tags,                    // jsonb
        algorithm_version: ALGO_VERSION,
      })
      if (error) console.error('Supabase insert error:', error)
    } else {
      // 没配环境变量就跳过入库，仅返回结果
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase env not set, skip DB insert.')
      }
    }

    return res.status(200).json({
      mainType,
      subTypes,
      tags,
      algorithmVersion: ALGO_VERSION,
      createdAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('submit error:', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
