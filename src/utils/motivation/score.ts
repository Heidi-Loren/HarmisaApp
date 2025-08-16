// src/modules/motivation/score.ts

export type Option = "A" | "B" | "C" | "D";
export type Motivation = "P" | "H" | "S" | "E";

export interface MotivationResult {
  score: Record<Motivation, number>;
  ratio: Record<Motivation, number>;
  main: Motivation;
  secondary: Motivation[];
}

const answerMap: Record<number, Record<Option, Motivation>> = {};
for (let i = 0; i < 12; i++) {
  answerMap[i] = { A: "P", B: "H", C: "S", D: "E" };
}

export function calculateMotivationProfile(answers: Option[]): MotivationResult {
  if (answers.length !== 12) throw new Error("需要12个答案");

  const score: Record<Motivation, number> = { P: 0, H: 0, S: 0, E: 0 };

  answers.forEach((answer, index) => {
    const motivation = answerMap[index][answer];
    score[motivation]++;
  });

  const total = 12;
  const ratio: Record<Motivation, number> = {
    P: parseFloat((score.P / total).toFixed(2)),
    H: parseFloat((score.H / total).toFixed(2)),
    S: parseFloat((score.S / total).toFixed(2)),
    E: parseFloat((score.E / total).toFixed(2)),
  };

  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const main = sorted[0][0] as Motivation;

  const secondValue = sorted[1][1];
  const secondary: Motivation[] = [];
  sorted.slice(1).forEach(([k, v]) => {
    if (v === secondValue) secondary.push(k as Motivation);
  });

  return { score, ratio, main, secondary };
}
