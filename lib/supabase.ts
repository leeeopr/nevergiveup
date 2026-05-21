import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface EnvValidationResult {
  isValid: boolean;
  errorType: 'MISSING' | 'INVALID_URL' | 'INVALID_KEY' | 'PLACEHOLDER' | null;
  errorMessage: string | null;
}

export const validateSupabaseEnv = (): EnvValidationResult => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isValid: false,
      errorType: 'MISSING',
      errorMessage: 'Credenciais de comunicação ausentes. NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão definidas nas variáveis de ambiente.'
    }
  }

  const urlStr = supabaseUrl.trim()
  const keyStr = supabaseAnonKey.trim()

  if (urlStr === '' || keyStr === '') {
    return {
      isValid: false,
      errorType: 'MISSING',
      errorMessage: 'As variáveis de ambiente do Supabase estão vazias (strings em branco).'
    }
  }

  const placeholders = [
    'https://your-project.supabase.co',
    'your-project',
    'placeholder',
    'your-anon-key'
  ]

  for (const placeholder of placeholders) {
    if (urlStr.includes(placeholder) || keyStr.includes(placeholder)) {
      return {
        isValid: false,
        errorType: 'PLACEHOLDER',
        errorMessage: `Credenciais inválidas: detectado o valor padrão (placeholder) "${placeholder}" nas variáveis de ambiente do Supabase.`
      }
    }
  }

  if (!urlStr.startsWith('https://')) {
    return {
      isValid: false,
      errorType: 'INVALID_URL',
      errorMessage: `A URL do Supabase "${urlStr}" é malformada. Ela precisa de prefixo seguro (começar com "https://").`
    }
  }

  if (keyStr.length < 20) {
    return {
      isValid: false,
      errorType: 'INVALID_KEY',
      errorMessage: 'A chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY) é curta demais ou inválida.'
    }
  }

  return {
    isValid: true,
    errorType: null,
    errorMessage: null
  }
}

export const isSupabaseConfigured = (): boolean => {
  return validateSupabaseEnv().isValid
}

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance

  const validation = validateSupabaseEnv()
  if (!validation.isValid) {
    throw new Error(
      `SUPABASE_INITIALIZATION_ERROR: ${validation.errorMessage}\n` +
      `Por favor, cadastre as variáveis reais no painel de segredos (Secrets) da sua plataforma de hospedagem ou no arquivo .env local.`
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  
  return supabaseInstance
}

// Transparent safety wrapper (ES6 Proxy) that guarantees that a SupabaseClient is always resolved
// at runtime, or else it throws an explicit, high-grade descriptive exception immediately.
// This prevents silent nulls, hydration errors, and dead buttons.
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = getSupabase()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})
