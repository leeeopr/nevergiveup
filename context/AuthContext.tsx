'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured, supabase, validateSupabaseEnv } from '@/lib/supabase'
import { AuthState, UserProfile, UserRole, Permission, AuthFsmState, TypedAuthError } from '@/types/auth'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
  resetAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'movements:read',
    'movements:create',
    'movements:update',
    'movements:delete',
    'profile:read',
    'profile:update',
    'admin:dashboard'
  ],
  editor: [
    'movements:read',
    'movements:create',
    'movements:update',
    'profile:read',
    'profile:update'
  ],
  viewer: [
    'movements:read',
    'profile:read'
  ]
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    permissions: [],
    loading: true,
    isIdentityResolved: false,
    error: null,
    
    // Safe initialization states matching a high-reliability cloud database system
    fsmState: 'hydrating',
    isDbConnected: false,
    isDbUnavailable: true,
    isAuthLoading: false,
    isHydrating: true,
    isOffline: false,
    authErrorType: null,
    authErrorMessage: null,
    networkError: null
  })

  const OWNER_PERMISSIONS = ROLE_PERMISSIONS['admin']

  // Keep Offline and Online statuses synced automatically with the navigator interface
  useEffect(() => {
    const updateOnlineStatus = () => {
      const offlineStatus = !navigator.onLine
      setState(prev => ({ 
        ...prev, 
        isOffline: offlineStatus,
        fsmState: offlineStatus ? 'network-error' : (prev.fsmState === 'network-error' ? 'idle' : prev.fsmState),
        networkError: offlineStatus ? 'Comunicação indisponível. Sem conexão à internet dectada no seu navegador.' : null
      }))
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    const currentOffline = !navigator.onLine

    // Asynchronous bootstrap to resolve dynamic environment configuration before hydration completes
    const bootstrapSession = async () => {
      try {
        const res = await fetch('/api/config')
        if (res.ok) {
          const config = await res.json()
          if (config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            ;(window as any).__SUPABASE_DYNAMIC_URL = config.NEXT_PUBLIC_SUPABASE_URL
            ;(window as any).__SUPABASE_DYNAMIC_KEY = config.NEXT_PUBLIC_SUPABASE_ANON_KEY
            // Clear any cached or instance values if they were initialized to null previously due to race conditions
          }
        }
      } catch (err) {
        console.warn('Failed to retrieve server dynamic configuration, relying on client compile bundle:', err)
      } finally {
        setState(prev => ({
          ...prev,
          isHydrating: false,
          isOffline: currentOffline,
          networkError: currentOffline ? 'Sem conexão de rede dectada.' : null
        }))
      }
    }

    bootstrapSession()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const ensureProfileSync = useCallback(async (user: User): Promise<UserProfile | null> => {
    const client = getSupabase()
    if (!client) return null
    
    try {
      const { data: profile, error: fetchError } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) return profile as UserProfile

      // Auto-Sync creation if PGRST116 (NotFound) occurs
      if (fetchError?.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await client
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'admin'
          })
          .select()
          .single()

        if (createError) throw createError
        return newProfile as UserProfile
      }
      
      throw fetchError
    } catch (err) {
      console.warn('Profile Identity Sync failed:', err)
      throw err // Bubble up to main handler so DB errors are fully visible
    }
  }, [])

  const resolveAuthState = useCallback(async (session: Session | null, targetFsmState: AuthFsmState) => {
    if (!session) {
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        profile: null,
        permissions: [],
        loading: false,
        isIdentityResolved: true,
        fsmState: targetFsmState,
        isDbConnected: isSupabaseConfigured(),
        isDbUnavailable: !isSupabaseConfigured(),
        isAuthLoading: false
      }))
      return
    }

    try {
      const profile = await ensureProfileSync(session.user)
      const role: UserRole = profile?.role || 'admin' 
      const permissions = ROLE_PERMISSIONS[role] || OWNER_PERMISSIONS

      setState(prev => ({
        ...prev,
        user: session.user,
        session,
        profile,
        permissions,
        loading: false,
        isIdentityResolved: true,
        fsmState: 'authenticated',
        isDbConnected: true,
        isDbUnavailable: false,
        isAuthLoading: false,
        error: null,
        authErrorType: null,
        authErrorMessage: null
      }))
    } catch (err: any) {
      console.error('Error in identity resolution chain:', err)
      setState(prev => ({
        ...prev,
        user: session.user,
        session,
        profile: null,
        permissions: OWNER_PERMISSIONS, // Prevent locks under database failures
        loading: false,
        isIdentityResolved: true,
        fsmState: 'db-unavailable',
        isDbConnected: true,
        isDbUnavailable: false,
        isAuthLoading: false,
        authErrorType: 'DB_UNAVAILABLE',
        authErrorMessage: `Erro de integridade ao ler perfil do banco de dados: ${err.message || err}`
      }))
    }
  }, [ensureProfileSync, OWNER_PERMISSIONS])

  // Central Auth Listener & Handlers
  useEffect(() => {
    if (state.isHydrating) return

    const envVerify = validateSupabaseEnv()
    
    console.log('[Supabase-Forensic] Central Auth Listener initialization audit:', {
      stage: 'hydration-complete-activation',
      isValid: envVerify.isValid,
      errorType: envVerify.errorType,
      errorMessage: envVerify.errorMessage,
      bundleUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      bundleKeyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      windowDynamicUrl: typeof window !== 'undefined' ? (window as any).__SUPABASE_DYNAMIC_URL : undefined,
      windowDynamicKeyPresent: typeof window !== 'undefined' ? !!(window as any).__SUPABASE_DYNAMIC_KEY : undefined,
    })

    let client
    try {
      client = getSupabase()
    } catch (err: any) {
      console.error('[Supabase-Forensic] Graceful silent client instantiation catch:', err)
    }

    setState(prev => ({
      ...prev,
      fsmState: 'session-restoring',
      isDbConnected: envVerify.isValid,
      isDbUnavailable: !envVerify.isValid,
      loading: true,
      authErrorType: !envVerify.isValid ? 'ENV_MISSING' : null,
      authErrorMessage: !envVerify.isValid ? envVerify.errorMessage : null
    }))

    let active = true

    if (client) {
      // Fetch initial session
      client.auth.getSession()
        .then(({ data: { session } }) => {
          if (!active) return
          if (session) {
            resolveAuthState(session, 'authenticated')
          } else {
            resolveAuthState(null, 'idle')
          }
        })
        .catch((err) => {
          console.error('[Supabase-Forensic] Direct catch on resolving initial session route:', err)
          if (!active) return
          setState(prev => ({
            ...prev,
            fsmState: 'idle',
            loading: false,
            isIdentityResolved: true,
            authErrorType: 'NETWORK_FAILURE',
            authErrorMessage: 'Falha de requisição ou rede ao tentar validar sessão: ' + (err.message || err)
          }))
        })

      // Auth events channel
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (!active) return

        console.log('[Supabase-Forensic] Auth state transitioned event stream:', event, !!session)

        if (event === 'SIGNED_IN') {
          setState(prev => ({ ...prev, fsmState: 'authenticating', loading: true }))
          await resolveAuthState(session, 'authenticated')
        } else if (event === 'SIGNED_OUT') {
          setState(prev => ({ ...prev, fsmState: 'authenticating', loading: true }))
          await resolveAuthState(null, 'idle')
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await resolveAuthState(session, 'authenticated')
        }
      })

      return () => {
        active = false
        subscription.unsubscribe()
      }
    } else {
      // Fallback if client is entirely missing
      setState(prev => ({
        ...prev,
        fsmState: 'idle',
        loading: false,
        isIdentityResolved: true
      }))
    }
  }, [state.isHydrating, resolveAuthState])

  // Helper helper to wrap asynchronous task with accurate connection timeouts
  function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      )
    ])
  }

  const signInWithEmail = async (email: string, password: string) => {
    setState(prev => ({
      ...prev,
      fsmState: 'validating',
      authErrorType: null,
      authErrorMessage: null,
      isAuthLoading: true
    }))

    if (!email || !password) {
      const msg = 'Os campos e-mail e senha são obrigatórios.'
      setState(prev => ({
        ...prev,
        fsmState: 'idle',
        authErrorType: 'INVALID_CREDENTIALS',
        authErrorMessage: msg,
        isAuthLoading: false
      }))
      throw new Error(msg)
    }

    setState(prev => ({ ...prev, fsmState: 'connecting' }))
    const envVerify = validateSupabaseEnv()
    console.log('[Supabase-Forensic] signInWithEmail submit validation:', {
      stage: 'submission-init',
      isValid: envVerify.isValid,
      errorType: envVerify.errorType,
      errorMessage: envVerify.errorMessage,
      emailSent: email
    })

    const client = getSupabase()
    try {
      setState(prev => ({ ...prev, fsmState: 'authenticating' }))
      
      const { data, error } = await withTimeout(
        client.auth.signInWithPassword({ email, password }),
        15000,
        'O servidor do Supabase demorou muito para responder (Tempo Limite de 15 segundos Excedido). Pode haver instabilidade de conexão.'
      )

      if (error) throw error

      if (data.session) {
        await resolveAuthState(data.session, 'authenticated')
      }
    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido ao tentar acessar.'
      let errorType: TypedAuthError = 'UNKNOWN_ERROR'
      let targetFsm: AuthFsmState = 'idle'

      if (msg.toLowerCase().includes('tempo limite') || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('excedido')) {
        errorType = 'NETWORK_FAILURE'
        targetFsm = 'timeout'
      } else if (
        msg.toLowerCase().includes('invalid') || 
        msg.toLowerCase().includes('credentials') || 
        msg.toLowerCase().includes('password') || 
        msg.toLowerCase().includes('senha') || 
        msg.toLowerCase().includes('e-mail')
      ) {
        errorType = 'INVALID_CREDENTIALS'
        targetFsm = 'invalid-credentials'
      } else if (
        msg.toLowerCase().includes('network') || 
        msg.toLowerCase().includes('fetch') || 
        msg.toLowerCase().includes('networkerror')
      ) {
        errorType = 'NETWORK_FAILURE'
        targetFsm = 'network-error'
      } else if (msg.toLowerCase().includes('database') || msg.toLowerCase().includes('rls')) {
        errorType = 'RLS_DENIED'
        targetFsm = 'db-unavailable'
      }

      setState(prev => ({
        ...prev,
        fsmState: targetFsm,
        authErrorType: errorType,
        authErrorMessage: msg,
        isAuthLoading: false
      }))
      throw err
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    setState(prev => ({
      ...prev,
      fsmState: 'validating',
      authErrorType: null,
      authErrorMessage: null,
      isAuthLoading: true
    }))

    if (!email || !password || password.length < 6) {
      const msg = 'O e-mail e uma senha de no mínimo 6 caracteres são requeridos.'
      setState(prev => ({
        ...prev,
        fsmState: 'idle',
        authErrorType: 'INVALID_CREDENTIALS',
        authErrorMessage: msg,
        isAuthLoading: false
      }))
      throw new Error(msg)
    }

    setState(prev => ({ ...prev, fsmState: 'connecting' }))
    const envVerify = validateSupabaseEnv()
    console.log('[Supabase-Forensic] signUpWithEmail submit validation:', {
      stage: 'submission-init',
      isValid: envVerify.isValid,
      errorType: envVerify.errorType,
      errorMessage: envVerify.errorMessage,
      emailSent: email
    })

    const client = getSupabase()
    try {
      setState(prev => ({ ...prev, fsmState: 'authenticating' }))
      
      const { data, error } = await withTimeout(
        client.auth.signUp({ email, password }),
        15000,
        'O servidor do Supabase demorou muito para responder (Tempo Limite de 15 segundos Excedido).'
      )

      if (error) throw error

      setState(prev => ({
        ...prev,
        fsmState: 'idle',
        isAuthLoading: false,
        authErrorType: null,
        authErrorMessage: null
      }))
    } catch (err: any) {
      const msg = err.message || 'Erro ao criar sua conta.'
      let errorType: TypedAuthError = 'UNKNOWN_ERROR'
      let targetFsm: AuthFsmState = 'idle'

      if (msg.toLowerCase().includes('tempo limite') || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('excedido')) {
        errorType = 'NETWORK_FAILURE'
        targetFsm = 'timeout'
      } else if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('uso')) {
        errorType = 'INVALID_CREDENTIALS'
        targetFsm = 'invalid-credentials'
      } else if (
        msg.toLowerCase().includes('network') || 
        msg.toLowerCase().includes('fetch') || 
        msg.toLowerCase().includes('networkerror')
      ) {
        errorType = 'NETWORK_FAILURE'
        targetFsm = 'network-error'
      }

      setState(prev => ({
        ...prev,
        fsmState: targetFsm,
        authErrorType: errorType,
        authErrorMessage: msg,
        isAuthLoading: false
      }))
      throw err
    }
  }

  const signOut = async () => {
    let client
    try {
      client = getSupabase()
    } catch {
      // safe fallback if unconfigured
      await resolveAuthState(null, 'idle')
      return
    }

    setState(prev => ({ 
      ...prev, 
      fsmState: 'authenticating', 
      loading: true, 
      isIdentityResolved: false,
      isAuthLoading: true
    }))
    
    try {
      await withTimeout(client.auth.signOut(), 8000, 'Signout timeout')
    } catch (err) {
      console.error('Signout failed safely:', err)
    } finally {
      await resolveAuthState(null, 'idle')
    }
  }

  const hasPermission = (permission: Permission) => {
    if (state.profile?.role === 'admin') return true
    if (state.permissions.includes(permission)) return true
    if (!state.isIdentityResolved && state.user) return true
    return false
  }

  const refreshProfile = async () => {
    if (state.user) {
      try {
        const profile = await ensureProfileSync(state.user)
        if (profile) {
          const role: UserRole = profile.role
          const permissions = ROLE_PERMISSIONS[role] || []
          
          setState(prev => ({
            ...prev,
            profile,
            permissions
          }))
        }
      } catch (err) {
        console.error('refreshProfile error:', err)
      }
    }
  }

  const resetAuthError = useCallback(() => {
    setState(prev => ({
      ...prev,
      authErrorType: null,
      authErrorMessage: null,
      fsmState: prev.fsmState === 'invalid-credentials' || prev.fsmState === 'network-error' || prev.fsmState === 'timeout' ? 'idle' : prev.fsmState
    }))
  }, [])

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        signInWithEmail,
        signUpWithEmail,
        signOut, 
        hasPermission,
        refreshProfile,
        resetAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
