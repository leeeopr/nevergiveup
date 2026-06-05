'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured, isLocalFallbackActive } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  permissions: string[];
  loading: boolean;
  isIdentityResolved: boolean;
  isDbConnected: boolean;
  isOffline: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return !navigator.onLine
    }
    return false
  })

  const isDbConnected = isSupabaseConfigured()

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync user profile database row with local state (with immediate fallback)
  const fetchProfile = useCallback(async (userId: string, email: string | null): Promise<UserProfile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        return data as UserProfile
      }

      // Safe fallback if profile is not created yet
      const fallbackProfile: UserProfile = {
        id: userId,
        email,
        role: 'admin',
        full_name: email ? email.split('@')[0] : 'Convidado',
        avatar_url: null,
        updated_at: new Date().toISOString()
      }

      // Promptly save fallback to avoid multi-row misses
      await supabase.from('profiles').insert(fallbackProfile).select().single()
      return fallbackProfile
    } catch {
      return {
        id: userId,
        email,
        role: 'admin',
        full_name: email ? email.split('@')[0] : 'Convidado',
        avatar_url: null,
        updated_at: new Date().toISOString()
      }
    }
  }, [])

  // Session tracking refs to avoid race conditions and redundant triggers during double login / mount transitions
  const activeResolutionRef = useRef<string | null>(null)
  const resolvedUserRef = useRef<string | null>(null)

  // Action helper to resolve active sessions
  const resolveSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      activeResolutionRef.current = null
      resolvedUserRef.current = null
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const currentUserId = currentSession.user.id

    // If we have already fully resolved this user and nothing has cleared it, keep it stable
    if (resolvedUserRef.current === currentUserId && profile !== null) {
      setSession(currentSession)
      setUser(currentSession.user)
      setLoading(false)
      return
    }

    // Guard against redundant parallel profile lookups for the same user
    if (activeResolutionRef.current === currentUserId) {
      return
    }

    activeResolutionRef.current = currentUserId
    setLoading(true)

    setSession(currentSession)
    setUser(currentSession.user)

    try {
      const activeProfile = await fetchProfile(currentUserId, currentSession.user.email || null)
      setProfile(activeProfile)
      resolvedUserRef.current = currentUserId
    } catch {
      setProfile({
        id: currentUserId,
        email: currentSession.user.email || null,
        role: 'admin',
        full_name: currentSession.user.email ? currentSession.user.email.split('@')[0] : 'Convidado',
        avatar_url: null
      })
      resolvedUserRef.current = currentUserId
    } finally {
      if (activeResolutionRef.current === currentUserId) {
        activeResolutionRef.current = null
      }
      setLoading(false)
    }
  }, [fetchProfile, profile])

  // Wrap resolveSession in a stable Ref to protect the mounting effect against tear-down reload loops
  const resolveSessionRef = useRef(resolveSession)
  useEffect(() => {
    resolveSessionRef.current = resolveSession
  }, [resolveSession])

  // Mount session validation
  useEffect(() => {
    let active = true

    async function initSession() {
      if (isLocalFallbackActive()) {
        const storedLocalUser = typeof window !== 'undefined' ? localStorage.getItem('financeira_local_user') : null
        if (storedLocalUser && active) {
          try {
            const parsed = JSON.parse(storedLocalUser)
            setUser(parsed.user)
            setProfile(parsed.profile)
            setSession(parsed.session)
            setLoading(false)
            return
          } catch {}
        }
        // Auto-provision default local admin to keep onboarding extremely friction-free
        const defaultUser = {
          id: 'local-user-id',
          email: 'admin@financeira.local',
          user_metadata: {}
        } as User
        const defaultProfile: UserProfile = {
          id: 'local-user-id',
          email: 'admin@financeira.local',
          role: 'admin',
          full_name: 'Administrador Local',
        }
        setUser(defaultUser)
        setProfile(defaultProfile)
        setLoading(false)
        return
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (active) {
          await resolveSessionRef.current(initialSession)
        }
      } catch (err) {
        console.error('Failed to restore initial login session:', err)
        if (active) setLoading(false)
      }
    }

    initSession()

    let unsubscribe: (() => void) | null = null

    if (!isLocalFallbackActive()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!active) return
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await resolveSessionRef.current(newSession)
        } else if (event === 'SIGNED_OUT') {
          await resolveSessionRef.current(null)
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    }

    return () => {
      active = false
      if (unsubscribe) unsubscribe()
    }
  }, []) // Empty dependencies ensure mounting event runs exactly once without recreate-teardown loops

  const signInWithEmail = async (email: string, password: string) => {
    if (isLocalFallbackActive()) {
      const defaultUser = {
        id: 'local-user-id',
        email: email,
        user_metadata: {}
      } as User
      const defaultProfile: UserProfile = {
        id: 'local-user-id',
        email: email,
        role: email.toLowerCase().includes('viewer') ? 'viewer' : 'admin',
        full_name: email.split('@')[0],
      }
      const mockSession = {
        access_token: 'local-access-token',
        user: defaultUser
      } as Session

      const localSession = { user: defaultUser, profile: defaultProfile, session: mockSession }
      localStorage.setItem('financeira_local_user', JSON.stringify(localSession))
      setUser(defaultUser)
      setProfile(defaultProfile)
      setSession(mockSession)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Rely exclusively on the global onAuthStateChange listener to trigger and deserialize current user sequence safely
  }

  const signOut = async () => {
    setLoading(true)
    try {
      if (isLocalFallbackActive()) {
        localStorage.removeItem('financeira_local_user')
      } else {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.error('Supabase signout call threw:', err)
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
    }
  }

  const hasPermission = useCallback((permission: string) => {
    // Todos os usuários autenticados possuem permissão total para todas as operações
    return !!user
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const updated = await fetchProfile(user.id, user.email || null)
      setProfile(updated)
    }
  }, [user, fetchProfile])

  // Qualquer usuário autenticado recebe a lista completa de permissões operacionais
  const permissions = [
    'movements:read',
    'movements:create',
    'movements:update',
    'movements:delete',
    'expenses:read',
    'expenses:create',
    'expenses:update',
    'expenses:delete',
    'profile:read',
    'profile:update'
  ]

  const value: AuthContextType = {
    user,
    session,
    profile,
    permissions,
    loading,
    isIdentityResolved: !loading,
    isDbConnected,
    isOffline,
    signInWithEmail,
    signOut,
    hasPermission,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
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
