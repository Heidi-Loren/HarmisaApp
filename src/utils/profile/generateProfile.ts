import { ConstitutionProfile, ClimateProfile, MotivationProfile, UserProfile } from "./types";

/**
 * 将三个模块的输出整合为统一用户画像结构
 */
export function generateUserProfile(
  constitution: ConstitutionProfile,
  climate: ClimateProfile,
  motivation: MotivationProfile
): UserProfile {
  return {
    constitution,
    climate,
    motivation
  };
}
