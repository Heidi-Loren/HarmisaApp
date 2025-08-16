import { supabase } from "@/lib/supabase"; // ✅ 改这一句

import { MotivationResult } from "./score";

export async function saveMotivationProfile(userId: string, result: MotivationResult) {
  const { error } = await supabase.from("motivation_profile").upsert({
    user_id: userId,
    score_p: result.score.P,
    score_h: result.score.H,
    score_s: result.score.S,
    score_e: result.score.E,
    ratio_p: result.ratio.P,
    ratio_h: result.ratio.H,
    ratio_s: result.ratio.S,
    ratio_e: result.ratio.E,
    main_tag: result.main,
    secondary_tags: result.secondary,
    created_at: new Date().toISOString()
  }, { onConflict: "user_id" });

  if (error) throw error;
}
