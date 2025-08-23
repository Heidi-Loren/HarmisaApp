// api/environment/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type OkResp = { resultId: string | number | null; createdAt: string; _debug?: any }
type ErrResp = { error: string; _debug?: any }
type Resp = OkResp | ErrResp

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', _debug: { version: 'env-submit-2025-08-20' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Server DB not configured',
      _debug: { version: 'env-submit-2025-08-20', dbConfigured: false, supabaseUrlPresent: !!supabaseUrl }
    })
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const { userId, deviceId, city, province, season, weather, tags, avoidTags, algorithmVersion } = req.body ?? {}

    const createdAt = new Date().toISOString()
    const row = {
      user_id: userId ?? null,
      device_id: deviceId ?? null,         // ✅ 新增：保存设备ID
      city,
      province,
      season,
      weather_json: weather,               // 建议表里建一列 weather_json jsonb
      tags,                                // jsonb
      avoid_tags: avoidTags ?? null,       // 可选列
      algorithm_version: algorithmVersion || '1.0.0',
      created_at: createdAt
    }

    const { data, error } = await supabase
      .from('environment_results')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      return res.status(500).json({
        error: error.message,
        _debug: { version: 'env-submit-2025-08-20', dbConfigured: true, supabaseHost: new URL(supabaseUrl).host }
      })
    }

    return res.status(200).json({
      resultId: (data as any)?.id ?? null,
      createdAt,
      _debug: { version: 'env-submit-2025-08-20', dbConfigured: true, supabaseHost: new URL(supabaseUrl).host }
    })
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || 'Server error',
      _debug: { version: 'env-submit-2025-08-20', dbConfigured: true }
    })
  }
}
