// api/constitution/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { calculateConstitutionResult } from '../../src/utils/constitution/score'
import { constitutionTagMap } from '../../src/utils/constitution/tagMap'

const ALGO_VERSION = '1.0.0'

// 简单 UUID 校验
function isUUID(v?: string) {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

type OptionScore = 1 | 2 | 3 | 4 | 5
type Answer = { id: number; score: OptionScore }

type Resp =
  | {
      resultId: string | number | null
      mainType: string
      subTypes: string[]
      tags: string[]
      algorithmVersion: string
      createdAt: string
      _debug?: any
    }
  | { error: string; _debug?: any }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', _debug: { version: 'submit-2025-08-19-2' } })
  }

  // —— 环境变量检查（缺就直接报错）
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Server DB not configured',
      _debug: { version: 'submit-2025-08-19-2', dbConfigured: false, supabaseUrlPresent: !!supabaseUrl }
    })
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    const { userId, answers } = (req.body ?? {}) as { userId?: string; answers?: Answer[] }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Invalid input: answers required', _debug: { version: 'submit-2025-08-19-2' } })
    }
    for (const a of answers) {
      if (!a || typeof a.id !== 'number' || a.id <= 0) {
        return res.status(400).json({ error: 'Invalid answer id', _debug: { version: 'submit-2025-08-19-2' } })
      }
      if (![1, 2, 3, 4, 5].includes(a.score)) {
        return res.status(400).json({ error: 'Invalid answer score', _debug: { version: 'submit-2025-08-19-2' } })
      }
    }

    // —— 计算
    const { mainType, subTypes } = calculateConstitutionResult(answers, { subTopK: 2, subThresholdRatio: 0.55 })
    const tags = constitutionTagMap[mainType] || []
    const createdAt = new Date().toISOString()

    // —— 待插入行（字段名与表一致）
    const row = {
      user_id: isUUID(userId) ? userId : null, // 你现在传的是 deviceId，非 uuid → 写 null
      answers,                  // jsonb
      main_type: mainType,      // text
      sub_types: subTypes,      // jsonb（确保表有）
      tags,                     // jsonb（确保表有）
      algorithm_version: ALGO_VERSION, // text（确保表有）
      created_at: createdAt     // timestamptz（确保表有默认值也可）
    }

    const { data, error } = await supabase
      .from('constitution_results')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      return res.status(500).json({
        error: error.message,
        _debug: { version: 'submit-2025-08-19-2', dbConfigured: true, supabaseHost: new URL(supabaseUrl).host }
      })
    }

    return res.status(200).json({
      resultId: (data as any)?.id ?? null,
      mainType,
      subTypes,
      tags,
      algorithmVersion: ALGO_VERSION,
      createdAt,
      _debug: { version: 'submit-2025-08-19-2', dbConfigured: true, supabaseHost: new URL(supabaseUrl).host }
    })
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || 'Server error',
      _debug: { version: 'submit-2025-08-19-2', dbConfigured: true }
    })
  }
}
