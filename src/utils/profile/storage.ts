import Taro from '@tarojs/taro'
import { saveConstitution } from '@/utils/constitution/save'
import type { SubmitPayload } from '@/utils/constitution/save'
import type { UserProfile } from '@/utils/profile/types'

export const STORAGE_KEYS = {
  constitution: 'constitution_result',
  motivation: 'motivation_result',
  environment: 'env_context',
} as const

type ConstitutionSnapshot = {
  primary: string
  secondary: string[]
  tags: string[]
  createdAt: string
  algorithmVersion?: string
}

/** 提交体质 → 缓存关键结果到本地 */
export async function saveAndCacheConstitution(payload: SubmitPayload) {
  const data = await saveConstitution(payload)
  const snap: ConstitutionSnapshot = {
    primary: data.mainType,
    secondary: data.subTypes ?? [],
    tags: data.tags ?? [],
    createdAt: data.createdAt,
    algorithmVersion: data.algorithmVersion,
  }
  Taro.setStorageSync(STORAGE_KEYS.constitution, snap)
  return data
}

/** 从本地读取三层画像并拼成 UserProfile（缺哪层就兜底） */
export function readUserProfileFromStorage(): UserProfile | null {
  const c = Taro.getStorageSync(STORAGE_KEYS.constitution)
  const m = Taro.getStorageSync(STORAGE_KEYS.motivation)
  const e = Taro.getStorageSync(STORAGE_KEYS.environment)

  if (!c && !m && !e) return null

  return {
    constitution: {
      main: c?.primary ?? '平和质',
      secondary: c?.secondary ?? [],
      scoreMap: {}, // 后端暂未返回，给空对象
    },
    climate: {
      season: e?.season ?? '秋',
      location: e?.region ?? '未知',
      climateTags: e?.climateTags ?? [],
    },
    motivation: {
      main: m?.main ?? 'H',
      secondary: m?.secondary ?? [],
      ratio: m?.ratio ?? { P: 25, H: 25, S: 25, E: 25 },
    },
  }
}

/** 可选：动因/环境结果产出后调用这两个写入本地 */
export function cacheMotivation(m: any) {
  Taro.setStorageSync(STORAGE_KEYS.motivation, m)
}
export function cacheEnvironment(e: any) {
  Taro.setStorageSync(STORAGE_KEYS.environment, e)
}
