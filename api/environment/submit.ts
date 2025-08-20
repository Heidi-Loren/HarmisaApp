import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type Resp = { resultId: string|number|null } | { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Server DB not configured' })
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const { userId, city, province, season, weather, tags, algorithmVersion } = req.body ?? {}
    const row = {
      user_id: null,                 // 你现在 deviceId 非 uuid，先写 null；需要可加 device_id text 列
      city, province, season,
      weather_json: weather,         // 建议表中列名为 weather_json jsonb
      tags,                          // jsonb
      algorithm_version: algorithmVersion || '1.0.0',
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('environment_results').insert(row).select('id').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ resultId: (data as any)?.id ?? null })
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
