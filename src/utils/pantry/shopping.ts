// src/utils/pantry/shopping.ts
import Taro from "@tarojs/taro";
import { getOrCreateDeviceId } from "@/utils/device";

const key = () => `shopping_list:${getOrCreateDeviceId()}`;

export type ShopItem = { name: string; count?: number; note?: string };

export function readShoppingList(): ShopItem[] {
  const v = Taro.getStorageSync(key());
  return Array.isArray(v) ? v : [];
}
export function saveShoppingList(list: ShopItem[]) {
  Taro.setStorageSync(key(), list);
}
export function addItems(names: string[]) {
  const list = readShoppingList();
  const map = new Map<string, ShopItem>(list.map(x => [x.name, x]));
  names.forEach(n => {
    const name = String(n).trim();
    if (!name) return;
    const cur = map.get(name);
    if (cur) cur.count = (cur.count || 1) + 1;
    else map.set(name, { name, count: 1 });
  });
  saveShoppingList(Array.from(map.values()));
}
export function removeItem(name: string) {
  saveShoppingList(readShoppingList().filter(x => x.name !== name));
}
export function clearShopping() { saveShoppingList([]); }
