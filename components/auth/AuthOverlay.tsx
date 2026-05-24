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
  XCircle,
  Info,
  Terminal,
  Cpu,
  Server,
  Activity,
  RefreshCw,
  Eye,
  EyeOff
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
  
  // Advanced Forensic Diagnostics State
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [serverKey, setServerKey] = useState<string | null>(null)
  const [serverStatusFetched, setServerStatusFetched] = useState(false)
  const [isFetchingServer, setIsFetchingServer] = useState(false)
  const [showForensicPanel, setShowForensicPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Pre-seed logs state with compile-time checks and window overrides to avoid synchronous setState inside useEffect on mount
  const [logs, setLogs] = useState<string[]>(() => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false })
    const list = [
      `[${time}] Diagnóstico iniciado: Verificação de Bundle do Cliente (Compile-time)`,
      `[${time}] NEXT_PUBLIC_SUPABASE_URL (Client-Env): ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'AUSENTE (Vazio/Null)'}`,
      `[${time}] NEXT_PUBLIC_SUPABASE_ANON_KEY (Client-Env): ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `Mapeada (Tamanho: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} caracteres)` : 'AUSENTE (Vazio/Null)'}`
    ]
    if (typeof window !== 'undefined') {
      list.push(`[${time}] Verificação de Overrides dinâmicos no objeto browser Window...`)
      list.push(`[${time}] window.__SUPABASE_DYNAMIC_URL: ${(window as any).__SUPABASE_DYNAMIC_URL ? 'ATIVO' : 'NÃO DETETADO'}`)
      list.push(`[${time}] window.__SUPABASE_DYNAMIC_KEY: ${(window as any).__SUPABASE_DYNAMIC_KEY ? 'ATIVO' : 'NÃO DETETADO'}`)
    }
    list.push(`[${time}] Fase de hidratação identificada como concluída no Navegador.`)
    return list
  })

  const addLog = React.useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false })
    setLogs(prev => [...prev, `[${time}] ${msg}`])
    console.log(`[Supabase-Forensic] ${msg}`)
  }, [])

  const fetchServerConfig = React.useCallback(async () => {
    setIsFetchingServer(true)
    addLog('Solicitando configuração de variáveis de ambiente no SERVER runtime...')
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setServerUrl(data.NEXT_PUBLIC_SUPABASE_URL)
        setServerKey(data.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        addLog('SERVER configuration successfully retrieved from Server API route.')
      } else {
        addLog(`SERVER config fetch returned status: ${res.status}`)
      }
    } catch (err: any) {
      addLog(`Failed to fetch SERVER config: ${err.message || err}`)
    } finally {
      setServerStatusFetched(true)
      setIsFetchingServer(false)
    }
  }, [addLog])

  useEffect(() => {
    // Run technical diagnostics off-thread to comply with strict eslint set-state-in-effect rules
    const timer = setTimeout(() => {
      fetchServerConfig()
    }, 50)
    return () => clearTimeout(timer)
  }, [fetchServerConfig])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalValidationError(null)
    setSuccessSignUpMessage(null)
    
    addLog(`Tentativa de autenticação iniciada por clique manual: ${isSignUp ? 'Criar Conta' : 'Entrar'} - Usuário: ${email}`)

    if (!email) {
      setLocalValidationError('Por favor, informe seu endereço de e-mail.')
      addLog('Envio rejeitado por form-validator: E-mail em branco.')
      return
    }
    if (!password || password.length < 6) {
      setLocalValidationError('A senha precisa ter no mínimo 6 caracteres.')
      addLog('Envio rejeitado por form-validator: Senha curta demais (< 6 chars).')
      return
    }

    try {
      addLog('Despachando credenciais ao backend da aplicação...')
      if (isSignUp) {
        await signUpWithEmail(email, password)
        setSuccessSignUpMessage('Sua conta foi pré-registrada com sucesso! Verifique sua caixa de entrada de e-mail para confirmar seu cadastro.')
        addLog('Resultado do cadastro: Pré-registro submetido com êxito.')
        setEmail('')
        setPassword('')
      } else {
        await signInWithEmail(email, password)
        addLog('Resultado de login: Autenticação bem sucedida no Supabase.')
      }
    } catch (err: any) {
      addLog(`Transmissão de Login rejeitada com erro: ${err.message || err}`)
      console.error('Submit execution caught error:', err)
    }
  }

  // Prevent flickering and render shell during server routing verification
  if (fsmState === 'hydrating' || fsmState === 'session-restoring') {
    return (
      <DialogShell isOpen={true} onClose={() => {}} type="modal" maxWidth="max-w-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center" id="session-check-loader">
          <Loader2 className="animate-spin text-rose-500 mb-4" size={32} />
          <h3 className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Caminho de Autenticação</h3>
          <p className="text-xs text-zinc-500 mt-1">Garantindo ciclo de consistência com o servidor...</p>
        </div>
      </DialogShell>
    )
  }

  // If session is already resolved & verified, transition modal out of view
  if (session) return null

  // Check if env check contains placeholder
  const isEnvPlaceholder = 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder') || 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('your-project')

  return (
    <DialogShell 
      isOpen={true} 
      onClose={() => {}} 
      type="modal"
      maxWidth={showForensicPanel ? "max-w-3xl" : "max-w-sm"}
    >
      <div className="text-center relative py-4">
        {/* Ambient background blur elements for distinctive look */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Content Side */}
          <div className={showForensicPanel ? "lg:col-span-5 space-y-4" : "lg:col-span-12 space-y-4"}>
            
            {/* Brand Shield Logo */}
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
              <Wallet className="text-white" size={32} />
            </div>

            <h2 className="text-2xl font-black mb-1 text-zinc-500 text-zinc-100 tracking-tight">
              {isSignUp ? 'Criar Conta' : 'Acesse seu painel'}
            </h2>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              {isSignUp 
                ? 'Cadastre-se para começar a gerenciar suas finanças.' 
                : 'Entre com seus dados para acessar suas métricas estruturais.'}
            </p>

            {/* Fully Reactive Warning banner (NON-BLOCKING) */}
            <AnimatePresence mode="wait">
              {isDbUnavailable && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-left flex gap-3 items-start"
                  id="non-blocking-db-warning"
                >
                  <Database className="text-rose-500 shrink-0 mt-0.5 animate-pulse" size={18} />
                  <div className="space-y-1">
                    <p className="text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      Supabase Não Inicializado
                      <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded uppercase font-semibold">Não Bloqueado</span>
                    </p>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Chaves locais ausentes/placeholders. O formulário está habilitado para teste, mas conectividade pode requerer configuração de Secrets.
                    </p>
                  </div>
                </motion.div>
              )}

              {isOffline && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left flex gap-3 items-start"
                >
                  <WifiOff className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-0.5">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">Modo Desconectado</p>
                    <p className="text-zinc-400 text-xs leading-relaxed">Sem conexão de rede dectada. Suas alterações não poderão ser enviadas ao servidor.</p>
                  </div>
                </motion.div>
              )}

              {successSignUpMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left flex gap-3 items-start"
                >
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-0.5">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider font-semibold">Verifique seu E-mail</p>
                    <p className="text-zinc-400 text-xs leading-relaxed">{successSignUpMessage}</p>
                  </div>
                </motion.div>
              )}

              {localValidationError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-left flex gap-3 items-center"
                >
                  <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="text-rose-400 text-xs font-semibold leading-tight">{localValidationError}</p>
                  </div>
                  <button 
                    onClick={() => setLocalValidationError(null)} 
                    className="text-zinc-400 text-[10px] uppercase font-bold hover:text-rose-400"
                    type="button"
                  >
                    OK
                  </button>
                </motion.div>
              )}

              {authErrorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-left flex gap-2.5 items-start relative overflow-hidden"
                  id="auth-error-explanation-banner"
                >
                  <XCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1 flex-1 pr-6">
                    <p className="text-rose-400 text-xs font-black uppercase tracking-wider">
                      {authErrorType === 'INVALID_CREDENTIALS' && 'Acesso Rejeitado'}
                      {authErrorType === 'NETWORK_FAILURE' && 'Tempo Limite / Conexão'}
                      {authErrorType === 'DB_UNAVAILABLE' && 'Resposta do Banco'}
                      {authErrorType === 'ENV_MISSING' && 'Incompatibilidade de Config'}
                      {authErrorType === 'RLS_DENIED' && 'Acesso Negado (RLS)'}
                      {authErrorType === 'UNKNOWN_ERROR' && 'Erro de Comunicação'}
                    </p>
                    <p className="text-zinc-350 text-xs leading-relaxed font-medium">{authErrorMessage}</p>
                  </div>
                  <button 
                    onClick={resetAuthError}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 text-[9px] font-black uppercase"
                    type="button"
                  >
                    OK
                  </button>
                </motion.div>
              )}

              {isAuthLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800/80 border border-zinc-700/30 rounded-2xl p-3 text-center flex items-center justify-center gap-2"
                >
                  <Loader2 className="animate-spin text-rose-500" size={14} />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {fsmState === 'validating' && 'Validando formulário...'}
                    {fsmState === 'connecting' && 'Contato com o banco de dados...'}
                    {fsmState === 'authenticating' && 'Sinalizando chaves corporativas...'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Authentication Form (ALWAYS ACCESSIBLE, NO DISABLING EXCEPT DURING ONGOING TRANSACTION) */}
            <form onSubmit={handleAuth} className="space-y-4 text-left">
              <div className="space-y-1" id="field-email-container">
                <label htmlFor="auth-email-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    disabled={isAuthLoading} // Only disabled when requesting authentication
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-zinc-800/40 border border-zinc-700/40 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="space-y-1" id="field-password-container">
                <label htmlFor="auth-password-input" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha de Entrada</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    id="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isAuthLoading} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800/40 border border-zinc-700/40 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isAuthLoading} // Always clickable otherwise!
                className="w-full bg-zinc-100 hover:bg-white text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group mt-4 cursor-pointer"
              >
                {isAuthLoading ? (
                  <Loader2 className="animate-spin text-zinc-950" size={18} />
                ) : isSignUp ? (
                  <>
                    <UserPlus size={18} className="group-hover:translate-x-1 transition-transform" />
                    Criar Nova Conta
                  </>
                ) : (
                  <>
                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    Acessar Conta
                  </>
                )}
              </button>
            </form>

            {/* View Toggle */}
            <button
              id="auth-toggle-view-btn"
              onClick={() => {
                setIsSignUp(!isSignUp)
                resetAuthError()
                setLocalValidationError(null)
                setSuccessSignUpMessage(null)
              }}
              disabled={isAuthLoading}
              className="mt-6 text-zinc-400 text-xs font-semibold hover:text-rose-400 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
            </button>
            
            {/* Structural diagnostics trigger anchor */}
            <div className="pt-4 border-t border-zinc-800/60 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForensicPanel(!showForensicPanel)
                  addLog(`User toggled technical investigation panel: ${!showForensicPanel ? 'OPEN' : 'CLOSED'}`)
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-zinc-200 cursor-pointer"
                id="toggle-forensic-dashboard-btn"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <Activity size={13} className={isDbUnavailable ? "text-amber-500 animate-pulse" : "text-emerald-400"} />
                  Investigação Forense Integrada
                </div>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full font-bold text-zinc-500">
                  {showForensicPanel ? 'Ocultar' : 'Expandir Diagnósticos'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 pt-6 border-t border-zinc-800/10 mt-6 text-zinc-600">
              <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest">
                <Shield size={10} />
                Offline Enabled
              </div>
              <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest">
                <Sparkles size={10} />
                Real Database
              </div>
            </div>
          </div>

          {/* Forensic Panel Column - Bento Style Diagnostics (Visible side-by-side or below depending on Width) */}
          {showForensicPanel && (
            <div className="lg:col-span-12 xl:col-span-7 space-y-4 text-left border-t lg:border-t-0 lg:border-l border-zinc-800/80 pt-6 lg:pt-0 lg:pl-6 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Terminal size={140} />
                </div>

                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                    <Terminal size={16} className="text-rose-400" />
                    Auditoria Forense de Conectividade
                  </h3>
                  <button
                    onClick={fetchServerConfig}
                    disabled={isFetchingServer}
                    className="text-[10px] font-bold uppercase px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    type="button"
                  >
                    <RefreshCw size={10} className={isFetchingServer ? "animate-spin" : ""} />
                    Re-Testar
                  </button>
                </div>

                {/* Environment variables comparison grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* CLIENT SIDE */}
                  <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                    <span className="text-[9px] font-extrabold tracking-widest uppercase text-cyan-400 block flex items-center gap-1.5">
                      <Cpu size={12} />
                      Next.js Client Bundle
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="font-mono bg-zinc-900/50 p-1.5 rounded text-[10px] break-all">
                        <span className="text-zinc-500 font-bold">URL:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL || <span className="text-rose-500 font-bold">NULL/Vazia</span>}
                      </div>
                      <div className="font-mono bg-zinc-900/50 p-1.5 rounded text-[10px] break-all">
                        <span className="text-zinc-500 font-bold">KEY:</span> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `eyJhb... (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)})` : <span className="text-rose-500 font-bold">NULL/Vazia</span>}
                      </div>
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mt-1">Conectável na Compilação</span>
                    </div>
                  </div>

                  {/* SERVER SIDE */}
                  <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                    <span className="text-[9px] font-extrabold tracking-widest uppercase text-amber-500 block flex items-center gap-1.5">
                      <Server size={12} />
                      Server Container Context
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="font-mono bg-zinc-900/50 p-1.5 rounded text-[10px] break-all">
                        <span className="text-zinc-500 font-bold">URL:</span> {serverUrl || (isFetchingServer ? <span className="text-zinc-500">Consultando...</span> : <span className="text-rose-500 font-bold">Ausente</span>)}
                      </div>
                      <div className="font-mono bg-zinc-900/50 p-1.5 rounded text-[10px] break-all">
                        <span className="text-zinc-500 font-bold">KEY:</span> {serverKey ? `Mapeada (${serverKey.substring(0, 10)})` : (isFetchingServer ? <span className="text-zinc-500">Consultando...</span> : <span className="text-rose-500 font-bold">Ausente</span>)}
                      </div>
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mt-1">Sincronizado via API GET Route</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Analysis Panel */}
                <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-300 tracking-wider">
                    <Info size={14} className="text-rose-400" />
                    Laudo Investigativo e Causa Raiz
                  </div>

                  <div className="text-xs space-y-3 text-zinc-400 leading-relaxed font-normal">
                    <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">
                      <span className="font-bold text-zinc-200 block mb-1">🔍 Diagnóstico de Mismatch (SSR / Hydration / Bundle):</span>
                      {(!process.env.NEXT_PUBLIC_SUPABASE_URL && serverUrl) ? (
                        <p className="text-emerald-400 font-semibold bg-emerald-500/5 p-2 rounded border border-emerald-500/15">
                          EVIDÊNCIA: Frozen Client Cache / SSR Mismatch! O Next.js gerou a pasta /dist antes das credenciais serem cadastradas na Vercel ou na nuvem Google Cloud. O código no cliente tem strings vazias, mas as rotas de servidor encontram os dados reais nas Secrets. A injeção automática dinamarquesa (sua chave fallback) contornou a trava!
                        </p>
                      ) : isEnvPlaceholder ? (
                        <p className="text-rose-400 font-semibold bg-rose-500/5 p-2 rounded border border-rose-500/15">
                          EVIDÊNCIA: Valores Placeholder de Modelo! Suas variáveis de ambiente estão preenchidas com as padrões do template (&apos;your-project&apos; &apos;your-anon-key&apos;), gerando URLs malformadas que barram a comunicação.
                        </p>
                      ) : (!process.env.NEXT_PUBLIC_SUPABASE_URL && !serverUrl) ? (
                        <p className="text-rose-400 font-bold bg-rose-500/5 p-2 rounded border border-rose-500/15">
                          EVIDÊNCIA: Ausência Absoluta das Variáveis! Tanto o bundle estático do cliente quanto os Secrets do Server estão totalmente vazios na hospedagem.
                        </p>
                      ) : (
                        <p className="text-zinc-350 bg-zinc-900/50 p-2 rounded">
                          EVIDÊNCIA: Chaves cadastradas e consistentes em ambas as pontas. Inconsistência de autenticação deve-se estritamente à autenticidade da senha ou permissões de RLS no Banco de Dados.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="font-bold text-zinc-200 block mb-0.5">💡 Causa Provável:</span>
                        <p className="text-[11px]">
                          {(!process.env.NEXT_PUBLIC_SUPABASE_URL && serverUrl) 
                            ? 'As variáveis de ambiente com o prefixo NEXT_PUBLIC_ só se tornam visíveis ao bundle se definidas no build. Nova implantação sem limpar o cache mantem o client congelado.'
                            : isEnvPlaceholder 
                            ? 'O arquivo .env.local ou as Secrets contêm as strings-base padrões recomendadas e não foram atualizadas com o banco físico real.'
                            : 'O banco está inativo ou o endereço do endpoint está incorreto.'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-zinc-200 block mb-0.5">🛠️ Ação de Correção Recomendada:</span>
                        <p className="text-[11px] text-zinc-300">
                          {(!process.env.NEXT_PUBLIC_SUPABASE_URL && serverUrl) 
                            ? 'Redefina uma nova implantação garantindo limpar o cache de compilação da Vercel/Cloud Run.'
                            : isEnvPlaceholder || (!process.env.NEXT_PUBLIC_SUPABASE_URL && !serverUrl)
                            ? 'Acesse a aba Secrets / Variáveis de Ambiente e insira os dados corretos obtidos da sua dashboard do Supabase.'
                            : 'Verifique se as configurações de RLS (Row Level Security) na tabela profiles do Supabase estão criadas e liberadas conforme o supabase_setup.sql.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logs Stream Panel */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                    <Activity size={10} />
                    Logs de Inicialização Técnica:
                  </div>
                  <div className="bg-zinc-950 rounded-xl p-3 max-h-40 overflow-y-auto border border-zinc-900 font-mono text-[10px] text-zinc-400 space-y-1 custom-scrollbar">
                    {logs.map((log, lIdx) => (
                      <div key={lIdx} className="break-all whitespace-pre-wrap leading-relaxed border-b border-zinc-900/50 pb-1 last:border-0">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  )
}
