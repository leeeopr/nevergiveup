import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const isSupabaseConfigured = (): boolean => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key' &&
    !supabaseAnonKey.includes('your-anon-key') &&
    supabaseUrl.startsWith('https://')
  )
}

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance

  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured yet with valid credentials.')
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Transparent safety wrapper (ES6 Proxy)
// Throws highly scannable production-grade errors instead of generic null pointer crashes.
export const supabase = typeof window !== 'undefined' || true
  ? new Proxy({} as SupabaseClient, {
      get(target, prop, receiver) {
        const client = getSupabase()
        if (!client) {
          throw new Error(
            `ENV_MISSING: O cliente do Supabase não foi configurado. Atribua as propriedades NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas configurações de Secrets do projeto para viabilizar a persistência de dados permanente.`
          )
        }
        const value = Reflect.get(client, prop, receiver)
        if (typeof value === 'function') {
          return value.bind(client)
        }
        return value
      }
    })
  : (null as unknown as SupabaseClient)
