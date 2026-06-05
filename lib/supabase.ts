import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// We initialize Supabase. If the keys are missing in build time, we use placeholders to avoid crashes during static builds,
// but let the runtime trigger transparent connection states.
const finalUrl = supabaseUrl || 'https://bpqyzhjcrcrpkngbhbpi.supabase.co'
const finalKey = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Export for backward compatibility with financial services
export const getSupabase = (): SupabaseClient => supabase
export const isSupabaseConfigured = (): boolean => !!supabaseUrl && !!supabaseAnonKey
export const isLocalFallbackActive = (): boolean => {
  if (typeof window === 'undefined') return !isSupabaseConfigured();
  return !isSupabaseConfigured() || window.localStorage.getItem('financeira_local_mode') === 'true';
}
export const setLocalFallbackActive = (active: boolean) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('financeira_local_mode', active ? 'true' : 'false');
  }
}
export const validateSupabaseEnv = () => ({
  isValid: isSupabaseConfigured(),
  errorType: isSupabaseConfigured() ? null : 'MISSING',
  errorMessage: isSupabaseConfigured() ? null : 'Supabase environment variables are missing.'
})
