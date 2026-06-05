'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      document.body.className = theme === 'dark' 
        ? 'font-sans antialiased bg-velvet-deep text-silver-polished min-h-screen transition-colors duration-200' 
        : 'font-sans antialiased bg-[#F4F6F9] text-[#111827] min-h-screen transition-colors duration-200'
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
      
      // Persistir no perfil local se estiver em fallback mode
      try {
        const storedLocalUser = localStorage.getItem('financeira_local_user')
        if (storedLocalUser) {
          const parsed = JSON.parse(storedLocalUser)
          if (parsed && parsed.user) {
            parsed.user.theme = newTheme
            localStorage.setItem('financeira_local_user', JSON.stringify(parsed))
          }
        }
      } catch (e) {
        console.error('Error saving theme to local storage fallback:', e)
      }

      // Persistir na sessão remota do Supabase utilizando user_metadata
      supabase.auth.updateUser({
        data: { theme: newTheme }
      }).catch((err) => {
        console.warn('Could not update user metadata theme directly:', err)
      })
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
