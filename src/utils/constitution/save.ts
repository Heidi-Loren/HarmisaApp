// src/utils/constitution/save.ts
import Taro from '@tarojs/taro'

export type OptionScore = 1 | 2 | 3 | 4 | 5
export interface Answer { id: number; score: OptionScore }
export interface SubmitPayload { userId?: string; answers: Answer[] }
export interface SubmitResult {
  resultId: number | string | null
  mainType: string
  subTypes: string[]
  tags: string[]
  algorithmVersion: string
  createdAt: string
}

// 这里用你部署在 Vercel 的域名；若有自定义域名，替换掉即可
const API_BASE = 'https://harmisa-app.vercel.app/api/constitution'

export async function saveConstitution(payload: SubmitPayload): Promise<SubmitResult> {
  const res = await Taro.request<SubmitResult>({
    url: `${API_BASE}/submit`,
    method: 'POST',
    data: payload,
    header: { 'Content-Type': 'application/json' },
    timeout: 20000
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    // 将后端 error 透出，便于定位
    const maybe = (res.data as any) as { error?: string }
    throw new Error(maybe?.error ? `服务器错误：${maybe.error}` : `服务器错误：${res.statusCode}`)
  }
  if (!res.data || typeof (res.data as any).mainType !== 'string') {
    throw new Error('响应格式异常')
  }
  return res.data
}
