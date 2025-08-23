// src/utils/device.ts
import Taro from '@tarojs/taro'

const DEVICE_ID_KEY = 'deviceId'

/** 读取或生成稳定的匿名设备ID（持久化在小程序本地存储） */
export function getOrCreateDeviceId(): string {
  let id = Taro.getStorageSync<string>(DEVICE_ID_KEY)
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    Taro.setStorageSync(DEVICE_ID_KEY, id)
  }
  return id
}

/** 仅读取（不存在则返回空串），用于不希望触发生成的场景 */
export function getDeviceId(): string {
  return Taro.getStorageSync<string>(DEVICE_ID_KEY) || ''
}
