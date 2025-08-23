// src/utils/constitution/save.ts
import Taro from '@tarojs/taro'
import { apiUrl } from '@/utils/api/config'

// —— 类型
export type OptionScore = 1 | 2 | 3 | 4 | 5
export interface Answer { id: number; score: OptionScore }

export interface SubmitPayload {
  userId?: string | null
  deviceId?: string | null   // ✅ 支持 deviceId
  answers: Answer[]
}

export interface SubmitResp {
  resultId: string | number | null
  mainType: string
  subTypes: string[]
  tags: string[]
  algorithmVersion: string
  createdAt: string
  error?: string
}

export async function saveConstitution(payload: SubmitPayload): Promise<SubmitResp> {
  const res = await Taro.request<SubmitResp>({
    url: apiUrl('/api/constitution/submit'),
    method: 'POST',
    data: payload, // 包含 deviceId
    header: { 'Content-Type': 'application/json' },
    timeout: 20000,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error((res.data as any)?.error || `服务器错误：${res.statusCode}`)
  }
  if (!res.data) throw new Error('响应为空')
  return res.data
}
