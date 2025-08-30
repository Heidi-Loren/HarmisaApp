// src/utils/recommendation/autoWeights.ts
import type { UserProfile } from '@/utils/profile/types'

export type AutoHints = {
  // 环境
  tempZ?: number; humidityZ?: number; windZ?: number;
  tagStrength?: number;         // 0..1；不传就按 climateTags 数量估
  weatherHoursSince?: number;   // 天气数据新鲜度（小时）
  // 体质 & 动因
  constitutionDaysSince?: number;  // 体质测评距今天数
  motivationDaysSince?: number;    // 动因测评距今天数
  // 即时偏好
  craveCount?: number;             // “今天想吃”命中词个数
}

export type Weights = { constitution: number; environment: number; drivers: number }
export type AutoWeightsResult = { weights: Weights; why: string[] }

const clamp01 = (x:number)=> Math.max(0, Math.min(1, x))
const sigmoid = (x:number)=> 1/(1+Math.exp(-x))
const decay = (age:number|undefined, halfLife:number)=> {
  if (age==null) return 1;
  return Math.pow(0.5, Math.max(0, age)/halfLife);
}

// —— 指标
function rConst(profile: UserProfile, days?: number) {
  const map = profile.constitution.scoreMap || {}
  const main = map[profile.constitution.main] ?? 0
  const second = Math.max(...Object.entries(map).filter(([k])=>k!==profile.constitution.main).map(([,v])=>v), 0)
  const conf = clamp01(sigmoid(( (main - second) - 10) / 10))
  return conf * decay(days, 180) // 半年折半
}

function rEnv(profile: UserProfile, h?: AutoHints) {
  const zSum = Math.abs(h?.tempZ||0) + Math.abs(h?.humidityZ||0) + Math.abs(h?.windZ||0)
  const fromZ = clamp01(zSum / 6)
  const tags = profile.climate.climateTags || []
  const tagStrength = h?.tagStrength ?? Math.min(1, tags.length / 6)
  const strength = clamp01(fromZ * 0.7 + tagStrength * 0.3)
  return strength * decay(h?.weatherHoursSince, 24) // 一天折半
}

function rMot(profile: UserProfile, h?: AutoHints) {
  const r = profile.motivation.ratio
  const total = (r.P||0)+(r.H||0)+(r.S||0)+(r.E||0) || 1
  const p = [r.P/total, r.H/total, r.S/total, r.E/total]
  const H = -p.reduce((s,x)=> s + (x>0? x*Math.log(x):0), 0)
  const focus = clamp01(1 - H/Math.log(4)) // 0..1
  const craveBoost = Math.min(0.3, 0.05 * (h?.craveCount || 0))
  return clamp01(focus + craveBoost) * decay(h?.motivationDaysSince, 60) // 两个月折半
}

// —— 主函数：先验 + 证据分配
export function computeAutoWeights(profile: UserProfile, hints?: AutoHints): AutoWeightsResult {
  const rc = rConst(profile, hints?.constitutionDaysSince)
  const re = rEnv(profile, hints)
  const rm = rMot(profile, hints)

  // 先验下限（可配置）
  const FLOOR = { c: 0.45, e: 0.25, m: 0.20 }
  const leftover = 1 - (FLOOR.c + FLOOR.e + FLOOR.m) // = 0.10

  const sumR = (rc + re + rm) || 1
  let wc = FLOOR.c + leftover * (rc / sumR)
  let we = FLOOR.e + leftover * (re / sumR)
  let wm = FLOOR.m + leftover * (rm / sumR)

  // 上限保护
  we = Math.min(0.55, we)
  wm = Math.min(0.45, wm)

  // 轻微归一避免浮点误差
  const s = wc+we+wm; wc/=s; we/=s; wm/=s;

  const why: string[] = []
  if (rc > 0.6)  why.push('体质主副差大/测评新鲜 → 体质↑')
  if (re > 0.5)  why.push('天气异常或调理标签强 → 环境↑')
  if (rm > 0.5)  why.push('动因集中或“今天想吃” → 动因↑')
  if (!why.length)  why.push('按先验下限分配（体质为根基）')

  return { weights: { constitution: +wc.toFixed(2), environment: +we.toFixed(2), drivers: +wm.toFixed(2) }, why }
}
