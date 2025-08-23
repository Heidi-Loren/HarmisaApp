// src/utils/api/config.ts

// 固定写死线上 API 域名
export const API_HOST = 'https://harmisa-app.vercel.app';

// 拼接工具函数
export const apiUrl = (path: string) =>
  `${API_HOST}${path.startsWith('/') ? path : `/${path}`}`;
