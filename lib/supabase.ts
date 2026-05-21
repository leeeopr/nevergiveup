import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate that the keys are present and are NOT the placeholders or empty strings
  const isValid = 
    supabaseUrl && 
    supabaseAnonKey && 
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.startsWith('https://')

  if (!isValid) {
    if (typeof window !== 'undefined') {
      console.error('[SUPABASE_INIT_FAILURE]', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlIsPlaceholder: supabaseUrl ? supabaseUrl.includes('placeholder') : true,
        startsWithHttps: supabaseUrl ? supabaseUrl.startsWith('https://') : false,
        isProduction: process.env.NODE_ENV === 'production',
        origin: window.location.origin
      })
    }
    return null
  }

  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!)
    return supabaseInstance
  } catch (error) {
    console.error('[SUPABASE_CLIENT_CREATION_FAILED]', error)
    return null
  }
}

// Global reference for simple usage (fully isomorphic via lazy getter Proxy)
export const supabase = typeof window !== 'undefined'
  ? new Proxy({} as SupabaseClient, {
      get(target, prop, receiver) {
        const client = getSupabase()
        if (!client) {
          console.warn(`[SUPABASE_LAZY_WARNING] Attempted to access property "${String(prop)}" but the client is not initialized.`)
          return undefined
        }
        const val = Reflect.get(client, prop, receiver)
        if (typeof val === 'function') {
          return val.bind(client)
        }
        return val
      }
    })
  : null

