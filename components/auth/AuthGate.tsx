'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'motion/react'
import { Wallet, Loader2 } from 'lucide-react'
import { AuthOverlay } from './AuthOverlay'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isIdentityResolved } = useAuth()

  if (!isIdentityResolved) {
    return (
      <div className="fixed inset-0 min-h-screen bg-velvet-deep text-silver-polished flex flex-col justify-center items-center z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center relative max-w-sm px-6 w-full"
        >
          {/* Glowing Ambient Backgrounds */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />

          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <div className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />
            <Wallet className="text-white animate-pulse" size={32} />
          </div>

          <h1 className="text-xl font-black text-silver-polished tracking-widest uppercase mb-1">
            Financeira Pro
          </h1>
          <p className="text-[10px] text-silver-brushed/40 font-black uppercase tracking-[0.2em] mb-8">
            Verificando Credenciais...
          </p>

          <div className="flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-rose-500" size={16} />
            <span className="text-xs text-silver-brushed/60 font-medium">Conectando ao terminal de dados</span>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-velvet-deep flex flex-col justify-center items-center p-4">
        <AuthOverlay />
      </div>
    )
  }

  return <>{children}</>
}
