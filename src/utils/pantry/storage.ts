import Taro from "@tarojs/taro";
import { getOrCreateDeviceId } from "@/utils/device";

function dedup(arr: string[]) {
  return Array.from(new Set(arr.map(s => s.trim()).filter(Boolean)));
}
function keys() {
  const id = getOrCreateDeviceId();
  return {
    history: `pantry_history:${id}`,   // 历史所有食材（去重累积）
    today:   `pantry_today:${id}`,     // 今日勾选
  };
}

export function readPantryHistory(): string[] {
  const v = Taro.getStorageSync(keys().history);
  return Array.isArray(v) ? v : [];
}
export function savePantryHistory(list: string[]) {
  Taro.setStorageSync(keys().history, dedup(list));
}
export function upsertPantryHistory(add: string[]) {
  savePantryHistory(dedup(readPantryHistory().concat(add)));
}

export function readPantryToday(): string[] {
  const v = Taro.getStorageSync(keys().today);
  return Array.isArray(v) ? v : [];
}
export function savePantryToday(list: string[]) {
  Taro.setStorageSync(keys().today, dedup(list));
}
