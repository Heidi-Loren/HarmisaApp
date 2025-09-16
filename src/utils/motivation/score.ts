// src/utils/motivation/score.ts
import MQ, { MQItem, Motive } from "./questionBank";

export interface Answer { id: string; value: number } // 1..5
export interface ScoreResult {
  rawScore: Record<Motive, number>;
  normScore: Record<Motive, number>;
  main: Motive;
  secondary: Motive | null;
  flags: {
    attentionPassed: boolean;
    consistencyOK: boolean;
    stability: "high" | "mid" | "low";
    note?: string;
  };
  debug?: { totalRawSum: number; ordered: Array<{ motive: Motive; value: number }> };
}

const CONFIG = {
  attentionRequiredValue: 3,
  consistencyDiffThreshold: 2,
  tieRatioThreshold: 0.08,
  stabilityHighRatioGap: 0.15,
  stabilityLowIfAttentionFail: true
};

export function scoreMotivation(answers: Answer[]): ScoreResult {
  // 初始化分值
  const rawScore: Record<Motive, number> = { P: 0, H: 0, S: 0, E: 0 };

  // lookup map for MQ items
  const mqMap: Record<string, MQItem | undefined> = {};
  for (const it of MQ) mqMap[it.id] = it;

  // flags
  let attentionPassed = true;
  const consistencyPairs: [string, string][] = [["Q20", "Q21"]];
  let consistencyOK = true;

  // 累计分数
  for (const ans of answers) {
    const item = mqMap[ans.id];
    if (!item) continue;

    // 注意力题处理
    if (item.type === "check") {
      if (ans.value !== CONFIG.attentionRequiredValue) attentionPassed = false;
      continue;
    }

    // 规范 value 范围（容错）
    let v = Math.min(5, Math.max(1, Math.round(ans.value)));

    // 反向处理
    if (item.reverse) v = 6 - v; // 1->5, 2->4, 3->3, etc.

    // 权重
    const w = item.weight ?? (item.type === "context" ? 0.5 : 1);

    if (item.motive) {
      rawScore[item.motive] += v * w;
    }
  }

  // 一致性对处理
  for (const [idA, idB] of consistencyPairs) {
    const aAns = answers.find(a => a.id === idA);
    const bAns = answers.find(a => a.id === idB);
    if (!aAns || !bAns) continue;

    const itemA = mqMap[idA]!;
    const itemB = mqMap[idB]!;
    let va = Math.min(5, Math.max(1, Math.round(aAns.value)));
    let vb = Math.min(5, Math.max(1, Math.round(bAns.value)));
    if (itemA.reverse) va = 6 - va;
    if (itemB.reverse) vb = 6 - vb;

    const diff = Math.abs(va - vb);
    if (diff > CONFIG.consistencyDiffThreshold) {
      consistencyOK = false;
    }
  }

  // 归一化
  const totalRaw = rawScore.P + rawScore.H + rawScore.S + rawScore.E;
  const normScore: Record<Motive, number> = { P: 0, H: 0, S: 0, E: 0 };
  if (totalRaw > 0) {
    normScore.P = rawScore.P / totalRaw;
    normScore.H = rawScore.H / totalRaw;
    normScore.S = rawScore.S / totalRaw;
    normScore.E = rawScore.E / totalRaw;
  }

  // 决定主副型与稳定性
  const ordered = Object.entries(normScore)
    .map(([k, v]) => ({ motive: k as Motive, value: v }))
    .sort((a, b) => b.value - a.value);

  const main = ordered[0].motive;
  const second = ordered[1].motive;
  const diffRatio = ordered[0].value - ordered[1].value;

  let secondary: Motive | null = null;
  if (diffRatio < CONFIG.tieRatioThreshold) secondary = second;
  else secondary = second;

  let stability: "high" | "mid" | "low" = "mid";
  if (!attentionPassed && CONFIG.stabilityLowIfAttentionFail) {
    stability = "low";
  } else if (!consistencyOK) {
    stability = "mid";
  } else {
    stability = diffRatio >= CONFIG.stabilityHighRatioGap ? "high" : "mid";
  }

  const flags = {
    attentionPassed,
    consistencyOK,
    stability,
    note: !attentionPassed ? "注意力检测未通过，结果可信度低。" : (!consistencyOK ? "一致性偏差，建议复测。" : undefined)
  };

  return {
    rawScore,
    normScore,
    main,
    secondary,
    flags,
    debug: {
      totalRawSum: totalRaw,
      ordered
    }
  };
}

export default scoreMotivation;
