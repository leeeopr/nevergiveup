'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const { signInWithEmail, isOffline } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfigured = isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signInWithEmail(email, password)
    } catch (err: any) {
      console.error('Login error:', err)
      const message = err?.message || String(err)
      
      if (
        message.includes('Invalid login credentials') || 
        message.includes('invalid_credentials') || 
        message.toLowerCase().includes('senha incorreta') || 
        message.toLowerCase().includes('perfil inválido') ||
        message.toLowerCase().includes('invalid email')
      ) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha de acesso.')
      } else if (
        message.toLowerCase().includes('fetch') || 
        message.toLowerCase().includes('network') || 
        message.toLowerCase().includes('failed to fetch')
      ) {
        setError('Erro de conexão. Verifique sua rede e certifique-se de que as chaves do Supabase estão configuradas via Secrets.')
      } else {
        setError(message || 'Ocorreu um erro inesperado ao conectar ao banco de dados.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="login-container" className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div id="login-card" className="w-full max-w-md bg-zinc-900 border border-zinc-850 rounded-[32px] p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-4">
            <Lock className="text-rose-400" size={22} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-sans">Financeira Pro</h1>
          <p className="text-zinc-400 text-[10px] mt-1.5 font-bold font-mono uppercase tracking-wider">Acesso Operacional</p>
        </div>

        {/* Missing Env Prompt (Discreet advice without blockages) */}
        {!isConfigured && (
          <div id="config-notice" className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5 text-left">
            <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <div className="text-xs font-sans">
              <p className="font-semibold text-amber-300">Variáveis Não Configuradas</p>
              <p className="text-amber-400/70 mt-0.5 leading-relaxed">
                As chaves NEXT_PUBLIC_SUPABASE_URL e KEY não foram definidas na ferramenta {"'Secrets'"} do console. Insira chaves de teste para realizar uma autenticação real.
              </p>
            </div>
          </div>
        )}

        {/* Offline Notice */}
        {isOffline && (
          <div id="offline-notice" className="mb-6 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex items-start gap-2.5 text-left">
            <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
            <div className="text-xs font-sans">
              <p className="font-semibold text-rose-300">Navegador Desconectado</p>
              <p className="text-rose-400/70 mt-0.5 leading-relaxed">
                Nenhuma conexão de rede detectada pelo navegador. A requisição poderá falhar.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono" htmlFor="email">
              E-mail corporativo
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                placeholder="nome@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/40 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono" htmlFor="password">
              Senha de segurança
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/40 transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-350 transition-colors"
                id="toggle-password"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div id="error-message-box" className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2 font-medium font-sans">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-lg text-sm mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
