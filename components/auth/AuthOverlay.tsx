'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'motion/react'
import { 
  LogIn, 
  Sparkles, 
  Shield, 
  Wallet, 
  Mail, 
  Lock, 
  UserPlus, 
  Loader2, 
  AlertTriangle, 
  WifiOff, 
  Database,
  CheckCircle2,
  XCircle
} from 'lucide-react'

import { DialogShell } from '../ui/DialogShell'

export function AuthOverlay() {
  const { 
    session, 
    fsmState,
    isDbConnected,
    isDbUnavailable,
    isAuthLoading,
    isOffline,
    authErrorType,
    authErrorMessage,
    signInWithEmail,
    signUpWithEmail,
    resetAuthError
  } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [successSignUpMessage, setSuccessSignUpMessage] = useState<string | null>(null)
  const [localValidationError, setLocalValidationError] = useState<string | null>(null)

  // Clean notifications when switching tabs explicitly handled in interaction

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalValidationError(null)
    setSuccessSignUpMessage(null)
    
    if (!email) {
      setLocalValidationError('Por favor, informe seu endereço de e-mail.')
      return
    }
    if (!password || password.length < 6) {
      setLocalValidationError('A senha precisa ter no mínimo 6 caracteres.')
      return
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
        setSuccessSignUpMessage('Sua conta foi pré-registrada com sucesso! Verifique sua caixa de entrada de e-mail para confirmar seu cadastro.')
        setEmail('')
        setPassword('')
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      console.warn('Authentication request rejected on submit:', err)
    }
  }

  // Prevent flickering and render shell during server routing verification
  if (fsmState === 'hydrating' || fsmState === 'session-restoring') {
    return (
      <DialogShell isOpen={true} onClose={() => {}} type="modal" maxWidth="max-w-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="animate-spin text-rose-500 mb-4" size={32} />
          <h3 className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Caminho de Autenticação</h3>
          <p className="text-xs text-zinc-500 mt-1">Garantindo ciclo de consistência com o servidor...</p>
        </div>
      </DialogShell>
    )
  }

  // If session is already resolved & verified, transition modal out of view
  if (session) return null

  return (
    <DialogShell 
      isOpen={true} 
      onClose={() => {}} 
      type="modal"
      maxWidth="max-w-sm"
    >
      <div className="text-center relative py-4">
        {/* Ambient background blur elements for distinctive look */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative">
          {/* Brand Shield Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <Wallet className="text-white" size={32} />
          </div>

          <h2 className="text-2xl font-black mb-1 text-zinc-100 tracking-tight">
            {isSignUp ? 'Criar Conta' : 'Acesse seu painel'}
          </h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            {isSignUp 
              ? 'Cadastre-se para começar a gerenciar suas finanças.' 
              : 'Entre com seus dados para acessar suas métricas estruturais.'}
          </p>

          {/* Fully Reactive Status / Error Banners */}
          <AnimatePresence mode="wait">
            {/* 1. Offline Banner */}
            {isOffline && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-5 text-left flex gap-3 items-start"
              >
                <WifiOff className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">Modo Desconectado</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">Sem conexão de rede dectada. Suas alterações não poderão ser enviadas ao servidor.</p>
                </div>
              </motion.div>
            )}

            {/* 2. Missing Environment Creds Banner */}
            {isDbUnavailable && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 mb-5 text-left flex gap-3 items-start"
              >
                <Database className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-wider">Banco de Dados Indisponível</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Credenciais de comunicação ausentes. Registre as variáveis <code className="text-zinc-250 font-mono text-zinc-200 bg-zinc-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="text-zinc-250 font-mono text-zinc-200 bg-zinc-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no painel de Secrets da plataforma.
                  </p>
                </div>
              </motion.div>
            )}

            {/* 3. Success Message Banner */}
            {successSignUpMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-5 text-left flex gap-3 items-start"
              >
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-0.5">
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Verifique seu E-mail</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">{successSignUpMessage}</p>
                </div>
              </motion.div>
            )}

            {/* 4. Local Validation / Form Error */}
            {localValidationError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-5 text-left flex gap-3 items-center"
              >
                <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                <div className="flex-1">
                  <p className="text-rose-400 text-xs font-semibold leading-tight">{localValidationError}</p>
                </div>
                <button 
                  onClick={() => setLocalValidationError(null)} 
                  className="text-zinc-400 text-[10px] uppercase font-bold hover:text-rose-400"
                >
                  OK
                </button>
              </motion.div>
            )}

            {/* 5. Server Auth / Session FSM Error Banner */}
            {authErrorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-5 text-left flex gap-3 items-start relative overflow-hidden"
              >
                <XCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1 flex-1">
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-wider">
                    {authErrorType === 'INVALID_CREDENTIALS' && 'Credenciais Inválidas'}
                    {authErrorType === 'NETWORK_FAILURE' && 'Falha na Transmissão de Rede'}
                    {authErrorType === 'DB_UNAVAILABLE' && 'Falha no Banco de Dados'}
                    {authErrorType === 'RLS_DENIED' && 'Acesso Negado (RLS)'}
                    {authErrorType === 'UNKNOWN_ERROR' && 'Erro Inesperado'}
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">{authErrorMessage}</p>
                </div>
                <button 
                  onClick={resetAuthError}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-100 text-[10px] font-bold uppercase"
                >
                  Limpar
                </button>
              </motion.div>
            )}

            {/* 6. Active Progression States (Machine Feedback) */}
            {isAuthLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-800/80 border border-zinc-700/30 rounded-2xl p-3 mb-5 text-center flex items-center justify-center gap-2"
              >
                <Loader2 className="animate-spin text-rose-500" size={14} />
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                  {fsmState === 'validating' && 'Validando formulário...'}
                  {fsmState === 'connecting' && 'Contato com o banco de dados...'}
                  {fsmState === 'authenticating' && 'Processando token de segurança...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div className="space-y-1" id="field-email-container">
              <label htmlFor="auth-email-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  disabled={isAuthLoading || isDbUnavailable}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all disabled:opacity-40"
                />
              </div>
            </div>

            <div className="space-y-1" id="field-password-container">
              <label htmlFor="auth-password-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  disabled={isAuthLoading || isDbUnavailable}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all disabled:opacity-40"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isAuthLoading || isDbUnavailable}
              className="w-full bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group mt-2 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? (
                <Loader2 className="animate-spin text-zinc-950" size={18} />
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

          {/* Toggle Button */}
          <button
            id="auth-toggle-view-btn"
            onClick={() => {
              setIsSignUp(!isSignUp)
              resetAuthError()
              setLocalValidationError(null)
              setSuccessSignUpMessage(null)
            }}
            disabled={isAuthLoading}
            className="mt-6 text-zinc-400 text-xs font-medium hover:text-rose-400 transition-colors disabled:opacity-40"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
          </button>
          
          <div className="flex items-center justify-center gap-4 pt-8 border-t border-zinc-800/50 mt-8">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Shield size={12} />
              Privacidade Garantida
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Sparkles size={12} />
              Sincronização Nuvem
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  )
}
