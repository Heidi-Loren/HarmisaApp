// api/profile/recompute.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type Snapshot = {
  // constitution
  main_type: string | null
  sub_types: any | null
  constitution_tags: any | null
  constitution_at: string | null
  // environment
  city: string | null
  province: string | null
  season: string | null
  env_tags: any | null
  weather_json: any | null
  environment_at: string | null
  // motivation
  motivation_main: string | null
  ratio: any | null
  secondary: any | null
  motivation_at: string | null
  // meta
  updated_at: string
}

type Ok = {
  ok: true
  deviceId: string
  snapshot: Snapshot
  // 调试字段：看看是否命中最新记录
  found: {
    constitution_at: string | null
    environment_at: string | null
    motivation_at: string | null
  }
}
type Err = { error: string }
type Resp = Ok | Err

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server DB not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    const deviceId = String(
      (req.method === 'POST' ? (req.body as any)?.deviceId : req.query?.deviceId) || ''
    )
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' })

    // 体质：该 device_id 最新一条
    const { data: c, error: ce } = await supabase
      .from('constitution_results')
      .select('main_type, sub_types, tags, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ce) return res.status(500).json({ error: ce.message })

    // 环境：该 device_id 最新一条
    const { data: e, error: ee } = await supabase
      .from('environment_results')
      .select('city, province, season, tags, weather_json, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ee) return res.status(500).json({ error: ee.message })

    // 动因：该 device_id 最新一条
    const { data: m, error: me } = await supabase
      .from('motivation_results')
      .select('main, ratio, secondary, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (me) return res.status(500).json({ error: me.message })

    const snapshot: Snapshot = {
      // constitution
      main_type: c?.main_type ?? null,
      sub_types: c?.sub_types ?? null,
      constitution_tags: c?.tags ?? null,
      constitution_at: c?.created_at ?? null,
      // environment
      city: e?.city ?? null,
      province: e?.province ?? null,
      season: e?.season ?? null,
      env_tags: e?.tags ?? null,
      weather_json: e?.weather_json ?? null,
      environment_at: e?.created_at ?? null,
      // motivation
      motivation_main: m?.main ?? null,
      ratio: m?.ratio ?? null,
      secondary: m?.secondary ?? null,
      motivation_at: m?.created_at ?? null,
      // meta
      updated_at: new Date().toISOString()
    }

    const { error: upsertErr } = await supabase
      .from('device_profiles')
      .upsert({ device_id: deviceId, ...snapshot }, { onConflict: 'device_id' })

    if (upsertErr) return res.status(500).json({ error: upsertErr.message })

    return res.status(200).json({
      ok: true,
      deviceId,
      snapshot,
      found: {
        constitution_at: c?.created_at ?? null,
        environment_at: e?.created_at ?? null,
        motivation_at: m?.created_at ?? null
      }
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}
