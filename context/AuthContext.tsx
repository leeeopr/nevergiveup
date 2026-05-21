'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthState, UserProfile, UserRole, Permission } from '@/types/auth'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
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
    error: null
  })

  // Fallback Permissions for Owners (Migration/Recovery state)
  const OWNER_PERMISSIONS = ROLE_PERMISSIONS['admin']

  const ensureProfileSync = useCallback(async (user: User): Promise<UserProfile | null> => {
    if (!supabase) return null
    
    try {
      // 1. Attempt to fetch
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) return profile as UserProfile

      // 2. If missing, attempt to create (Auto-Sync)
      if (fetchError?.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'admin' // Initial users are treated as owners/admins
          })
          .select()
          .single()

        if (createError) throw createError
        return newProfile as UserProfile
      }
      
      throw fetchError
    } catch (err) {
      console.warn('Identity Sync Warning:', err)
      return null
    }
  }, [])

  const resolveAuthState = useCallback(async (session: Session | null) => {
    if (!session) {
      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        profile: null,
        permissions: [],
        loading: false,
        isIdentityResolved: true
      }))
      return
    }

    // Crucial: Step-by-step resolution to avoid viewer-trap
    const profile = await ensureProfileSync(session.user)
    
    // Recovery Logic: If profile failed to sync, we treat them as owner temporarily
    // to prevent lockout while backend stabilizes.
    const role: UserRole = profile?.role || 'admin' 
    const permissions = ROLE_PERMISSIONS[role] || OWNER_PERMISSIONS

    setState({
      user: session.user,
      session: session,
      profile,
      permissions,
      loading: false,
      isIdentityResolved: true,
      error: null
    })
  }, [ensureProfileSync, OWNER_PERMISSIONS])

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false, isIdentityResolved: true }))
      return
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Set loading for state transition
      if (event === 'SIGNED_IN') {
        setState(prev => ({ ...prev, loading: true }))
      }
      
      if (event === 'SIGNED_OUT') {
        resolveAuthState(null)
      } else {
        resolveAuthState(session)
      }
    })

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuthState(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [resolveAuthState])

  const signOut = async () => {
    if (!supabase) return
    setState(prev => ({ ...prev, loading: true, isIdentityResolved: false }))
    await supabase.auth.signOut()
  }

  const hasPermission = (permission: Permission) => {
    // If we have a profile but it's restricted, we respect that.
    // However, if we're still resolving or profile is missing, we check fallback.
    if (state.profile?.role === 'admin') return true
    if (state.permissions.includes(permission)) return true
    
    // Migration Fallback: If identity isn't resolved yet but we have a user, 
    // grant temporary owner access to prevent FAB removal flicker.
    if (!state.isIdentityResolved && state.user) return true
    
    return false
  }

  const refreshProfile = async () => {
    if (state.user) {
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
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        signOut, 
        hasPermission,
        refreshProfile
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
