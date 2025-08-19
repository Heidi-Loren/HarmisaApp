// //import { supabase } from "@/lib/supabase"; // ✅ 改这一句

// import { MotivationResult } from "./score";

// export async function saveMotivationProfile(userId: string, result: MotivationResult) {
//   const { error } = await supabase.from("motivation_profile").upsert({
//     user_id: userId,
//     score_p: result.score.P,
//     score_h: result.score.H,
//     score_s: result.score.S,
//     score_e: result.score.E,
//     ratio_p: result.ratio.P,
//     ratio_h: result.ratio.H,
//     ratio_s: result.ratio.S,
//     ratio_e: result.ratio.E,
//     main_tag: result.main,
//     secondary_tags: result.secondary,
//     created_at: new Date().toISOString()
//   }, { onConflict: "user_id" });

//   if (error) throw error;
// }

import Taro from '@tarojs/taro'

export interface MotivationAnswer { id: number; score: number }
export interface MotivationSubmitPayload { userId?: string; answers: MotivationAnswer[] }
export interface MotivationSubmitResult { id: number | string | null; createdAt?: string }

const API_BASE = 'https://harmisa-app.vercel.app/api/motivation'

export async function saveMotivation(payload: MotivationSubmitPayload): Promise<MotivationSubmitResult> {
  const res = await Taro.request<MotivationSubmitResult>({
    url: `${API_BASE}/submit`,
    method: 'POST',
    data: payload,
    header: { 'Content-Type': 'application/json' },
    timeout: 20000
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const msg = (res.data as any)?.error || `服务器错误：${res.statusCode}`
    throw new Error(msg)
  }
  if (!res.data) throw new Error('响应为空')
  return res.data
}
