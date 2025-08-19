// src/lib/supabase.ts
// 统一入口：
// - weapp：禁止使用 Supabase SDK（抛错，不导入 SDK）
// - h5：动态导入 @supabase/supabase-js，再创建客户端

export async function getSupabaseClient() {
  // Taro 构建时会注入 TARO_ENV
  if (process.env.TARO_ENV !== 'h5') {
    throw new Error('Supabase SDK 在 weapp 不可用，请改用后端 API（Taro.request）')
  }

  // 只有在 h5 才加载 SDK，避免被打进 weapp 包
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  })
}
