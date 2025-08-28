import type { UserProfile } from '@/utils/profile/types'

// —— 外部可选环境提示（有则更准，没有也能跑）
export type AutoEnvHints = {
  tempZ?: number; humidityZ?: number; windZ?: number;
  tagStrength?: number; // 0..1，不传就按 climateTags 数量估
}

// 内部权重类型（与 WeightControls.Weights 结构相同）
export type AutoWeights = { constitution: number; environment: number; drivers: number }

const clamp01 = (x:number)=> Math.max(0, Math.min(1, x))
const sigmoid = (x:number)=> 1/(1+Math.exp(-x))
const norm = (w:AutoWeights)=> {
  const s = w.constitution + w.environment + w.drivers || 1
  return {
    constitution: +(w.constitution / s).toFixed(2),
    environment:  +(w.environment  / s).toFixed(2),
    drivers:      +(w.drivers      / s).toFixed(2),
  }
}

function focusFromMotivationRatio(r: Record<'P'|'H'|'S'|'E', number>) {
  const maxV = Math.max(r.P||0, r.H||0, r.S||0, r.E||0)
  return clamp01(maxV / 100) // 0..1
}

function constitutionConfidence(profile: UserProfile) {
  const map = profile.constitution.scoreMap || {}
  const mainScore = map[profile.constitution.main] ?? 0
  const secondScore = Math.max(
    ...Object.entries(map)
      .filter(([k]) => k !== profile.constitution.main)
      .map(([,v]) => v), 0
  )
  const diff = mainScore - secondScore // 常见 0..40
  return clamp01(sigmoid((diff - 10)/10)) // ~0.27..0.88
}

function environmentExtreme(profile: UserProfile, hints?: AutoEnvHints) {
  if (hints && (hints.tempZ!=null || hints.humidityZ!=null || hints.windZ!=null)) {
    const z = Math.abs(hints.tempZ||0) + Math.abs(hints.humidityZ||0) + Math.abs(hints.windZ||0)
    return clamp01(z/6)
  }
  const tags = profile.climate.climateTags || []
  const strength = hints?.tagStrength ?? Math.min(1, tags.length / 6)
  return clamp01(strength)
}

export type AutoWeightsResult = { weights: AutoWeights; why: string[] }

export function computeAutoWeights(profile: UserProfile, hints?: AutoEnvHints): AutoWeightsResult {
  const cConf = constitutionConfidence(profile)               // 0..1
  const eExt  = environmentExtreme(profile, hints)            // 0..1
  const mFocus= focusFromMotivationRatio(profile.motivation.ratio) // 0..1

  // 线性映射到合理区间，然后统一归一
  let wc = 0.40 + 0.25 * cConf   // 0.40..0.65
  let we = 0.20 + 0.35 * eExt    // 0.20..0.55
  let wm = 0.10 + 0.30 * mFocus  // 0.10..0.40

  // 软边界
  wc = Math.max(0.45, wc)
  we = Math.min(0.55, we)
  wm = Math.min(0.40, wm)

  const weights = norm({ constitution: wc, environment: we, drivers: wm })

  const why: string[] = []
  if (cConf > 0.6)  why.push('体质主副差明显 → 体质权重↑')
  if (eExt  > 0.5)  why.push('天气/季节影响较强 → 环境权重↑')
  if (mFocus> 0.5)  why.push('动因集中 → 动因权重↑')
  if (!why.length)  why.push('使用基准权重（体质为根基）')

  return { weights, why }
}
