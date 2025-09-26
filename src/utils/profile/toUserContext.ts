import type { UserContext } from "@/lib/types";
import type { UserProfile } from "@/utils/profile/types";

export function toUserContext(p: UserProfile): UserContext {
  // 体质向量（示例映射，可按你的评分表替换）
  const constitution_vector: Record<string, number> = {};
  constitution_vector["阳虚"] = norm(p?.constitution?.scoreMap?.["阳虚质"]);
  constitution_vector["阴虚"] = norm(p?.constitution?.scoreMap?.["阴虚质"]);
  constitution_vector["痰湿"] = norm(p?.constitution?.scoreMap?.["痰湿质"]);
  constitution_vector["平"]   = 0.3; // 最小兜底

  // 环境向量（季节+地域）
  const environment_vector: Record<string, number> = {};
  if (p?.climate?.season) environment_vector[p.climate.season] = 0.5;
  if (p?.climate?.location) environment_vector[p.climate.location] = 0.2;
  (p?.climate?.climateTags||[]).forEach((t:string)=>environment_vector[t]=Math.max(environment_vector[t]||0,0.3));

  // 动因向量（P/H/S/E）
  const ratio = p?.motivation?.ratio || { P:25,H:25,S:25,E:25 };
  const motive_vector = { P: ratio.P/100, H: ratio.H/100, S: ratio.S/100, E: ratio.E/100 };

  return {
    constitution_vector,
    environment_vector,
    motive_vector,
    hard_filters: { spicy_max: 1, oil_max: 2 } // 你也可以从偏好里带
  };
}

function norm(x?: number){ return Math.max(0, Math.min(1, (x||0)/100)); }
