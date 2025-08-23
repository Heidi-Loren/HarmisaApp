// src/utils/motivation/save.ts
import Taro from '@tarojs/taro'
import { apiUrl } from '@/utils/api/config'

export interface MotivationAnswer { id: number; score: 1 | 2 | 3 | 4 }

export interface MotivationSubmitPayload {
  userId?: string | null
  deviceId?: string | null   // ✅ 支持 deviceId
  answers: MotivationAnswer[]
}

export interface MotivationSubmitResult {
  id: number | string | null
  createdAt?: string
  main?: string
  ratio?: Record<'P' | 'H' | 'S' | 'E', number>
  secondary?: string[]
  algorithmVersion?: string
  error?: string
}

export async function saveMotivation(payload: MotivationSubmitPayload): Promise<MotivationSubmitResult> {
  const res = await Taro.request<MotivationSubmitResult>({
    url: apiUrl('/api/motivation/submit'),
    method: 'POST',
    data: payload, // ✅ 包含 deviceId
    header: { 'Content-Type': 'application/json' },
    timeout: 20000,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg = (res.data as any)?.error || `服务器错误：${res.statusCode}`
    throw new Error(msg)
  }
  if (!res.data) throw new Error('响应为空')

  return res.data
}
