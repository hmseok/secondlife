import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ============================================
// Supabase 클라이언트 (AsyncStorage 세션 관리)
// 웹과 동일한 Supabase 프로젝트
// ============================================

const SUPABASE_URL = 'https://uiyiwgkpchnvuvpsjfxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeWl3Z2twY2hudnV2cHNqZnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjkwNDgsImV4cCI6MjA4NTI0NTA0OH0.GV9zeRh5eJrbJyNY-ma1N9KUQaMGxdcn0FR6u-9vOLg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
