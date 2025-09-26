// 打分 + 类别模板再排序
import { Dish, UserContext, Vector, CategoryTemplate } from "../types";

const dot = (p: Vector = {}, q: Vector = {}) =>
  Object.keys(p).reduce((s, k) => s + (p[k] || 0) * (q[k] || 0), 0);

export function scoreDish(d: Dish, u: UserContext, w = { a: 0.4, b: 0.35, c: 0.25 }) {
  // 硬过滤
  if (u.hard_filters?.allergens_block?.some(a => d.allergens?.includes(a))) return -Infinity;
  if (u.hard_filters?.diet_rules_required?.some(r => !d.diet_rules?.includes(r))) return -Infinity;
  if (u.hard_filters?.oil_max !== undefined && d.oil_level > u.hard_filters.oil_max) return -Infinity;
  if (u.hard_filters?.spicy_max !== undefined && d.spicy_level > u.hard_filters.spicy_max) return -Infinity;

  // 基础分
  let s = 0;
  s += w.a * dot(d.fit_vector.constitution, u.constitution_vector);
  s += w.b * dot(d.fit_vector.environment,  u.environment_vector);
  s += w.c * dot(d.fit_vector.motive,       u.motive_vector);

  // 轻惩罚（示例）
  if ((d.tcm_props?.thermal === "寒") && (u.constitution_vector["阳虚"] ?? 0) > 0.4) s -= 0.3;
  if (d.sodium_level && u.hard_filters?.sodium_max !== undefined && d.sodium_level > u.hard_filters.sodium_max) s -= 0.2;

  return s;
}

export function applyCategoryTemplate(
  list: Dish[], tpl: CategoryTemplate, u: UserContext
) {
  // 简化：把模板boost加到用户向量上（不改原对象）
  const boosted: UserContext = {
    ...u,
    constitution_vector: addVec(u.constitution_vector, tpl.boost?.constitution),
    environment_vector:  addVec(u.environment_vector,  tpl.boost?.environment),
    motive_vector:       addVec(u.motive_vector,       tpl.boost?.motive),
  };

  // 过滤
  const filtered = list.filter(d => passTemplateFilters(d, tpl));

  // 再算分 & 排序
  return filtered
    .map(d => ({ dish: d, score: scoreDish(d, boosted) }))
    .filter(x => x.score !== -Infinity)
    .sort((a, b) => b.score - a.score);
}

function addVec(a: Vector = {}, b: Vector = {}): Vector {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Vector = {};
  keys.forEach(k => (out[k] = (a[k] || 0) + (b[k] || 0)));
  return out;
}

function passTemplateFilters(d: Dish, tpl: CategoryTemplate) {
  const f = tpl.filters || {};
  if (f.oil_level?.lte !== undefined && d.oil_level > f.oil_level.lte) return false;
  if (f.spicy_level?.lte !== undefined && d.spicy_level > f.spicy_level.lte) return false;
  // 需要再加就继续
  return true;
}
