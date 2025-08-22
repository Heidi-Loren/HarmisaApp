// api/motivation/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// 用你已经写好的算法（保证和前端一致）
import { calculateMotivationProfile, type Option } from '../../src/utils/motivation/score'

const ALGO_VERSION = '1.0.0'

// 环境变量（只在服务端）
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 只用服务端的 Service Role Key
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

type Answer = { id: number; score: 1 | 2 | 3 | 4 } // 1~4 来自 A/B/C/D 映射
type Resp =
  | {
      id: string | number | null
      createdAt: string
      main: string
      ratio: Record<'P'|'H'|'S'|'E', number>
      secondary: string[]
      algorithmVersion: string
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

    if (!Array.isArray(answers) || answers.length !== 12) {
      return res.status(400).json({ error: 'Invalid input: 需要 12 个答案' })
    }

    // 后端把 1/2/3/4 映射回 A/B/C/D，再做一次权威计算
    const mapNumToOpt: Record<number, Option> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }
    const opts: Option[] = answers
      .sort((a, b) => a.id - b.id)
      .map(a => mapNumToOpt[a.score])

    if (opts.some(v => !v)) {
      return res.status(400).json({ error: 'Invalid input: 选项必须在 A~D' })
    }

    const prof = calculateMotivationProfile(opts) // { score, ratio, main, secondary }

    // 入库（若没配置 env，就跳过数据库，但仍返回结果）
    let insertedId: string | number | null = null
    if (supabase) {
      const { data, error } = await supabase
        .from('motivation_results')
        .insert({
          user_id: userId ?? null,
          answers,                 // 原始答案（jsonb）
          main: prof.main,         // text
          ratio: prof.ratio,       // jsonb
          secondary: prof.secondary, // jsonb 或 text[]（见建表）
          algorithm_version: ALGO_VERSION,
        })
        .select('id')
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
      id: insertedId,
      createdAt: new Date().toISOString(),
      main: prof.main,
      ratio: prof.ratio,
      secondary: prof.secondary,
      algorithmVersion: ALGO_VERSION,
    })
  } catch (e: any) {
    console.error('motivation submit error:', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
