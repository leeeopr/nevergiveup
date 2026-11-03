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

// Schema Compatibility: Detect whether the database has executed the management groups migration (group_id column)
let hasGroupIdColumnCache: boolean | null = null

export function getHasGroupIdColumn(): boolean | null {
  if (hasGroupIdColumnCache !== null) return hasGroupIdColumnCache
  if (typeof window !== 'undefined') {
    const stored = window.sessionStorage.getItem('financeira_has_group_id_col')
    if (stored === 'false') hasGroupIdColumnCache = false
    if (stored === 'true') hasGroupIdColumnCache = true
  }
  return hasGroupIdColumnCache
}

export function setHasGroupIdColumn(available: boolean) {
  hasGroupIdColumnCache = available
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('financeira_has_group_id_col', available ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('financeira_schema_group_id_changed', { detail: { available } }))
  }
}

export function isMissingColumnError(error: any, columnName: string = 'group_id'): boolean {
  if (!error) return false
  const msg = (error.message || String(error)).toLowerCase()
  const col = columnName.toLowerCase()
  const code = String(error.code || '')
  return (
    code === '42703' || // Postgres undefined_column
    code === 'PGRST204' || // PostgREST column not found
    (msg.includes('column') && msg.includes(col) && (msg.includes('does not exist') || msg.includes('não existe') || msg.includes('not found') || msg.includes('could not find')))
  )
}

