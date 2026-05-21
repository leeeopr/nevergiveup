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
    console.error('CRITICAL: Supabase environment variables are missing or invalid.')
    console.error('Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the project Secrets.')
    return null
  }

  supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!)
  return supabaseInstance
}

// Global reference for simple usage (fully isomorphic)
export const supabase = getSupabase()
