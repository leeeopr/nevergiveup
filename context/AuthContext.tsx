'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
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

  // Action helper to resolve active sessions
  const resolveSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setSession(currentSession)
    setUser(currentSession.user)

    try {
      const activeProfile = await fetchProfile(currentSession.user.id, currentSession.user.email || null)
      setProfile(activeProfile)
    } catch {
      setProfile({
        id: currentSession.user.id,
        email: currentSession.user.email || null,
        role: 'admin',
        full_name: currentSession.user.email ? currentSession.user.email.split('@')[0] : 'Convidado',
        avatar_url: null
      })
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  // Mount session validation
  useEffect(() => {
    let active = true

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (active) {
          await resolveSession(initialSession)
        }
      } catch (err) {
        console.error('Failed to restore initial login session:', err)
        if (active) setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await resolveSession(newSession)
      } else if (event === 'SIGNED_OUT') {
        await resolveSession(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [resolveSession])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session) {
      await resolveSession(data.session)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
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
    if (profile?.role === 'viewer') {
      return permission === 'movements:read' || permission === 'profile:read'
    }
    return true
  }, [profile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const updated = await fetchProfile(user.id, user.email || null)
      setProfile(updated)
    }
  }, [user, fetchProfile])

  const permissions = profile?.role === 'viewer' 
    ? ['movements:read', 'profile:read'] 
    : ['admin:dashboard', 'movements:read', 'movements:create', 'movements:update', 'movements:delete', 'profile:read', 'profile:update']

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
