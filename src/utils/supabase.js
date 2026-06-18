// src/lib/supabase.js
const SUPABASE_URL = 'https://omdvnfyemcbqyszpaggw.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_M3DEFV_b16eHQv_QbP7cuQ_qEZ-iEhy'

// 从 CDN 挂到 window 上的全局变量
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)