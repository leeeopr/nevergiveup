'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
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
    user: { id: 'anon-user', email: 'local@financeirapro.local' } as any,
    session: { user: { id: 'anon-user', email: 'local@financeirapro.local' } } as any,
    profile: { id: 'anon-user', email: 'local@financeirapro.local', role: 'admin' } as any,
    permissions: [
      'movements:read',
      'movements:create',
      'movements:update',
      'movements:delete',
      'profile:read',
      'profile:update',
      'admin:dashboard'
    ],
    loading: false,
    isIdentityResolved: true,
    error: null
  })

  const signOut = async () => {
    console.log('Sign-out requested in single-user mode. Cleared caches.')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('financial_movements_cache')
      localStorage.removeItem('structural_expenses_cache_anon-user')
      localStorage.removeItem('structural_expenses_cache_anon')
      window.location.reload()
    }
  }

  const hasPermission = (permission: Permission) => {
    // Single-user mode automatically grants all permissions
    return true
  }

  const refreshProfile = async () => {
    // No-op in single-user offline mode
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
