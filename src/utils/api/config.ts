// src/utils/api/config.ts
// 单一后台域名；本地开发可用 .env 覆盖 TARO_APP_API_HOST
export const API_HOST =
  process.env.TARO_APP_API_HOST || 'https://harmisa-app.vercel.app';

export const apiUrl = (path: string) =>
  `${API_HOST}${path.startsWith('/') ? path : `/${path}`}`;
