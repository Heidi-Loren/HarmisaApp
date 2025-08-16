// src/pages/api/constitution/questions.ts
import type { NextApiRequest, NextApiResponse } from 'next'

type Question = { id: number; text: string; reverse?: boolean }
type Resp = { algorithmVersion: string; questions: Question[] }

const ALGO_VERSION = '1.0.0'

// 和后端 score.ts 中题号保持一致
const QUESTIONS: Question[] = [
  { id: 1,  text: '您精力充沛吗？',           reverse: true  },
  { id: 2,  text: '您容易疲乏吗？'                           },
  { id: 3,  text: '您手脚发凉吗？'                           },
  { id: 4,  text: '您感到手脚心发热吗？'                     },
  { id: 5,  text: '您容易便秘或大便干燥吗？'                 },
  { id: 6,  text: '您面部或鼻部有油腻感吗？'                 },
  { id: 7,  text: '您感到身体沉重不轻松吗？'                 },
  { id: 8,  text: '您的皮肤容易出现青紫瘀斑吗？'             },
  { id: 9,  text: '您感到闷闷不乐吗？'                       },
  { id:10,  text: '您容易过敏吗？'                           },
  { id:11,  text: '您比一般人怕冷吗？'                       },
  { id:12,  text: '您适应环境变化的能力如何？', reverse: true }
]

export default function handler(_req: NextApiRequest, res: NextApiResponse<Resp>) {
  return res.status(200).json({ algorithmVersion: ALGO_VERSION, questions: QUESTIONS })
}
