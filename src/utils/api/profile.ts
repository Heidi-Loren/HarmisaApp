import Taro from '@tarojs/taro';
import { apiUrl } from '@/utils/api/config';

export async function recomputeProfile(deviceId: string) {
  const res = await Taro.request<{ ok: true; error?: string }>({
    url: apiUrl('/api/profile/recompute'),
    method: 'POST',
    data: { deviceId },
    header: { 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  if (res.statusCode < 200 || res.statusCode >= 300 || (res.data as any)?.error) {
    throw new Error((res.data as any)?.error || `服务器错误：${res.statusCode}`);
  }
  return res.data;
}

export async function getProfile(deviceId: string) {
  const res = await Taro.request<any>({
    url: apiUrl('/api/profile'),
    method: 'GET',
    data: { deviceId },
    timeout: 20000,
  });
  if (res.statusCode < 200 || res.statusCode >= 300 || (res.data as any)?.error) {
    throw new Error((res.data as any)?.error || `服务器错误：${res.statusCode}`);
  }
  return res.data;
}
