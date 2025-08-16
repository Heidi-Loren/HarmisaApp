// src/utils/constitution/score.ts

type OptionScore = 1 | 2 | 3 | 4 | 5

export interface QuestionAnswer {
  id: number            // 题号 1~12
  score: OptionScore    // 用户选择分数 1~5
}

type ConstitutionType =
  | '平和'
  | '气虚'
  | '阳虚'
  | '阴虚'
  | '湿热'
  | '痰湿'
  | '血瘀'
  | '气郁'
  | '特禀'

interface ConstitutionWeight {
  [constitutionType: string]: number
}

interface QuestionMeta {
  id: number
  reverse?: boolean            // 是否反向计分
  weights: ConstitutionWeight  // 该题对各体质的权重
}

// ⚠️ 仅后端持有：题号 + 是否反向 + 权重矩阵
const QUESTION_META: QuestionMeta[] = [
  { id: 1,  reverse: true,  weights: { 平和: 1.0, 气虚: 0.6 } },
  { id: 2,  weights: { 气虚: 1.0, 阳虚: 0.5 } },
  { id: 3,  weights: { 阳虚: 1.0, 气虚: 0.3 } },
  { id: 4,  weights: { 阴虚: 1.0, 湿热: 0.4 } },
  { id: 5,  weights: { 阴虚: 0.7, 气虚: 0.3 } },
  { id: 6,  weights: { 湿热: 1.0, 痰湿: 0.6 } },
  { id: 7,  weights: { 痰湿: 1.0, 气虚: 0.4 } },
  { id: 8,  weights: { 血瘀: 1.0, 气虚: 0.3 } },
  { id: 9,  weights: { 气郁: 1.0, 血瘀: 0.3 } },
  { id:10,  weights: { 特禀: 1.0, 气虚: 0.2 } },
  { id:11,  weights: { 阳虚: 0.8, 气虚: 0.5 } },
  { id:12,  reverse: true,  weights: { 平和: 1.0, 气郁: 0.6 } },
]

// 计算所有体质的累计得分
export function calculateScores(answers: QuestionAnswer[]) {
  const scores: Record<ConstitutionType, number> = {
    平和: 0, 气虚: 0, 阳虚: 0, 阴虚: 0, 湿热: 0, 痰湿: 0, 血瘀: 0, 气郁: 0, 特禀: 0,
  }

  for (const { id, score } of answers) {
    const meta = QUESTION_META.find(q => q.id === id)
    if (!meta) continue
    const finalScore = meta.reverse ? (6 - score) : score // 1..5
    for (const [ctype, weight] of Object.entries(meta.weights)) {
      const key = ctype as ConstitutionType
      scores[key] = (scores[key] ?? 0) + finalScore * weight
    }
  }

  return scores
}

/**
 * 根据得分返回 主体质 + 副体质
 * - 主体质：分最高的一个
 * - 副体质：取后续分数 >= 主体质分数 * 阈值 的前若干（默认2个）
 */
export function calculateConstitutionResult(
  answers: QuestionAnswer[],
  opts?: { subTopK?: number; subThresholdRatio?: number }
) {
  const { subTopK = 2, subThresholdRatio = 0.5 } = opts || {}
  const scores = calculateScores(answers)

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]) as [ConstitutionType, number][]

  const mainType = sorted[0]?.[0] ?? '平和'
  const maxScore = sorted[0]?.[1] ?? 0
  const subTypes = sorted
    .slice(1)
    .filter(([, s]) => s >= maxScore * subThresholdRatio)
    .slice(0, subTopK)
    .map(([t]) => t)

  return { mainType, subTypes }
}
