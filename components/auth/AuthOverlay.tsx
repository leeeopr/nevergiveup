'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'motion/react'
import { LogIn, Sparkles, Shield, Wallet, Mail, Lock, UserPlus, Loader2 } from 'lucide-react'

import { DialogShell } from '../ui/DialogShell'

export function AuthOverlay() {
  const { session, loading: authLoadingState } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submissionLoading, setSubmissionLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setSubmissionLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('Verifique seu e-mail para confirmar o cadastro!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSubmissionLoading(false)
    }
  }

  if (authLoadingState) return null

  return (
    <DialogShell 
      isOpen={!session} 
      onClose={() => {}} 
      type="modal"
      maxWidth="max-w-sm"
    >
      <div className="text-center relative py-4">
        {/* Background Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <Wallet className="text-white" size={32} />
          </div>

          <h2 className="text-2xl font-black mb-1 text-zinc-100 tracking-tight">
            {isSignUp ? 'Criar Conta' : 'Acesse seu painel'}
          </h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            {isSignUp 
              ? 'Cadastre-se para começar a gerenciar suas finanças.' 
              : 'Entre com seus dados para acessar suas métricas.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submissionLoading}
              className="w-full bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group mt-2"
            >
              {submissionLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} className="group-hover:translate-x-1 transition-transform" />
                  Criar Conta
                </>
              ) : (
                <>
                  <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                  Entrar
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-6 text-zinc-400 text-xs font-medium hover:text-rose-400 transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
          </button>
          
          <div className="flex items-center justify-center gap-4 pt-8 border-t border-zinc-800/50 mt-8">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Shield size={12} />
              Private
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Sparkles size={12} />
              Secure
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  )
}
