// src/pages/api/saveConstitution.ts

import type { NextApiRequest, NextApiResponse } from 'next'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: '仅支持 POST 请求' })
  }

  console.log('✅ [POST] /api/saveConstitution 被调用')

  try {
    const { answers, userId } = req.body
    console.log('请求数据:', req.body)

    const { data, error } = await supabase
      .from('constitution')
      .insert([{ answers, user_id: userId }])

    if (error) {
      console.error('❌ Supabase 插入失败:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ data })
  } catch (e: any) {
    console.error('❌ 接口错误:', e.message)
    return res.status(500).json({ error: '服务器异常' })
  }
}
