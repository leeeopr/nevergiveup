'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics'
import { PerformanceHeader } from '@/components/metrics/PerformanceHeader'
import { SavingsCard } from '@/components/metrics/SavingsCard'
import { CostOfLivingCard } from '@/components/metrics/CostOfLivingCard'
import { DailyAverageCard } from '@/components/metrics/DailyAverageCard'
import { DistributionCard } from '@/components/metrics/DistributionCard'
import { ForecastCard } from '@/components/metrics/ForecastCard'
import { MonthSelector } from '@/components/metrics/MonthSelector'
import { SkeletonCard } from '@/components/metrics/SkeletonCard'
import { FloatingActionButton } from '@/components/metrics/FloatingActionButton'
import { MovementsTab } from '@/components/metrics/MovementsTab'
import { ProgressionTab } from '@/components/metrics/ProgressionTab'
import { StructuralTab } from '@/components/metrics/StructuralTab'
import { FinancialProjectionTab } from '@/components/metrics/FinancialProjectionCard'
import { GoogleCalendarSettingsCard } from '@/components/metrics/GoogleCalendarSettingsCard'
import { EmpresaTab } from '@/components/empresa/EmpresaTab'
import { DailyBalanceHeader } from '@/components/metrics/DailyBalanceHeader'
import { CobrancasSummary } from '@/components/metrics/CobrancasSummary'
import { RollingBalanceEngine } from '@/services/RollingBalanceEngine'
import { AlertCircle, PlusCircle, Database, LogOut, Wifi, WifiOff, Lock, Activity, RotateCcw, Sun, Moon, Calendar, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { LoginPage } from '@/components/auth/LoginPage'
import { DialogShell } from '@/components/ui/DialogShell'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { DesktopHeader } from '@/components/layout/DesktopHeader'

export default function MetricsPage() {
  const { user, profile, loading: authLoading, signOut, isDbConnected, isOffline, toggleEmpresaMode } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'metrics' | 'projection' | 'movements' | 'progression' | 'structural' | 'calendar' | 'empresa'>('metrics')
  const [addStructuralTrigger, setAddStructuralTrigger] = useState(0)
  const [externalFabTrigger, setExternalFabTrigger] = useState(0)

  const { metrics, loading, error, movements, refresh, updatePersonalBudget } = useFinancialMetrics(
    currentDate.getFullYear(),
    currentDate.getMonth()
  )

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [tempBudget, setTempBudget] = useState(1200)

  const dailyData = useMemo(() => {
    return RollingBalanceEngine.calculateDailyProgression(movements, currentDate)
  }, [movements, currentDate])

  const totalBalance = dailyData.length > 0 ? dailyData[dailyData.length - 1].rollingBalance : 0
  const todayData = dailyData.find(d => d.date === new Date().toISOString().split('T')[0])
  const todayBalance = todayData ? todayData.dailyBalance : 0

  if (authLoading) {
    return (
      <main className="min-h-screen p-6 flex flex-col items-center justify-center bg-zinc-950 text-silver-polished font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
          <p className="text-xs font-semibold text-zinc-500 font-mono tracking-widest uppercase">Carregando Sessão...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Decorative background glows */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative text-center mb-8">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-rose-500" size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-100">Interrupção de Sistema</h2>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed font-medium">
              Ocorreu uma falha crítica ao tentar ler as métricas e o histórico operacional do banco de dados. Refira-se aos diagnósticos de integridade abaixo.
            </p>
          </div>

          {/* Bento Health Diagnostics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* 1. Database Connection */}
            <div className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-2xl text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Database size={16} className={isDbConnected ? "text-emerald-400" : "text-rose-500"} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Conexão de Banco</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">
                {isDbConnected ? "Supabase Ativo" : "Supabase Inativo"}
              </p>
            </div>

            {/* 2. Backend Health State */}
            <div className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-2xl text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity size={16} className={isDbConnected ? "text-emerald-400 animate-pulse" : "text-rose-500"} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Integridade Backend</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">
                {isDbConnected ? "Operando Normal" : "Disrupção Detetada"}
              </p>
            </div>

            {/* 3. Auth Availability */}
            <div className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-2xl text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Lock size={16} className={user ? "text-emerald-400" : "text-amber-500"} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status de Autenticação</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {user ? user.email : "Desconectado"}
              </p>
            </div>

            {/* 4. Network State */}
            <div className="bg-zinc-800/40 border border-zinc-800 p-4 rounded-2xl text-left">
              <div className="flex items-center gap-2 mb-1.5">
                {!isOffline ? (
                  <Wifi size={16} className="text-emerald-400" />
                ) : (
                  <WifiOff size={16} className="text-rose-500" />
                )}
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Conexão de Rede</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">
                {!isOffline ? "Acesso à Rede Ativo" : "Rede Indisponível"}
              </p>
            </div>
          </div>

          {/* Detailed Diagnostic Log Code block */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 mb-8 text-left">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-2 font-mono">Erro Retornado (Supabase SOT):</span>
            <code className="text-zinc-300 font-mono text-xs leading-relaxed break-words block whitespace-pre-wrap">
              {error.message || String(error)}
            </code>
          </div>

          {/* Action Button Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => refresh()}
              className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm"
            >
              <RotateCcw size={16} />
              Tentar Novamente
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('financeira_local_mode', 'true');
                  window.location.reload();
                }
              }}
              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] text-sm border border-amber-500/20 cursor-pointer"
            >
              Forçar Modo Local (Offline)
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] text-sm border border-zinc-800/80 cursor-pointer"
            >
              Recarregar
            </button>
          </div>
        </div>
      </main>
    )
  }

  const hasData = movements.length > 0

  return (
    <div key={user ? user.id : 'anonymous'} className="min-h-screen lg:flex bg-[var(--bg)] text-[var(--text-main)] selection:bg-silver-brushed selection:text-velvet-deep">
      {/* Permanent Desktop Sidebar (Hidden on Mobile) */}
      <DesktopSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onNewMovementClick={() => setExternalFabTrigger(prev => prev + 1)} 
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 pb-32 lg:pb-12 min-w-0">
        {/* Desktop Top Header (Hidden on Mobile) */}
        <DesktopHeader 
          activeTab={activeTab} 
          currentDate={currentDate} 
          onDateChange={setCurrentDate} 
          onRefresh={refresh}
          loading={loading}
        />

        {/* Mobile Top Status & Profile Bar (Hidden on Desktop) */}
        <div className="flex lg:hidden flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-velvet-soft/30 border border-silver-brushed/5 rounded-[28px] p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/20 rounded-xl flex items-center justify-center">
              <Lock className="text-rose-400" size={18} />
            </div>
            <div className="text-left">
              <h1 className="text-xs font-black uppercase tracking-wider text-silver-polished flex items-center gap-2">
                Painel Corporativo
                <span className="text-[9px] font-black text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">v1.2</span>
              </h1>
              {user ? (
                <p className="text-[10px] text-silver-brushed/40 font-semibold mt-0.5">
                  Conectado como: <span className="text-zinc-350">{user.email}</span>
                </p>
              ) : (
                <p className="text-[10px] text-silver-brushed/45 font-semibold mt-0.5">Módulo de sincronização pendente</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* DB Connection Health indicator */}
            <div className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
              isDbConnected 
                ? 'bg-emerald-500/5 text-emerald-400 border-emerald-400/10' 
                : 'bg-rose-500/5 text-rose-400 border-rose-500/10'
            }`}>
              <Database size={10} className={isDbConnected ? 'text-emerald-400' : 'text-rose-400'} />
              {isDbConnected ? 'Supabase Conectado' : 'Supabase Inativo'}
            </div>

            {/* Network Connection Health indicator */}
            <div className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
              !isOffline 
                ? 'bg-emerald-500/5 text-emerald-400 border-emerald-400/10' 
                : 'bg-amber-500/5 text-amber-400 border-amber-400/10'
            }`}>
              {!isOffline ? <Wifi size={10} className="text-emerald-400" /> : <WifiOff size={10} className="text-amber-400" />}
              {!isOffline ? 'Rede Ativa' : 'Desconectado'}
            </div>

            {/* Empresa Toggle / Mode Shortcut on Mobile Header */}
            {profile?.empresa_enabled ? (
              <button
                onClick={() => setActiveTab('empresa')}
                className={`px-3 py-1.5 border rounded-full text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  activeTab === 'empresa'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                }`}
                title="Modo Empresa Ativo"
              >
                <Building2 size={10} className="text-emerald-400" />
                Empresa
              </button>
            ) : (
              <button
                onClick={() => {
                  toggleEmpresaMode(true)
                  setActiveTab('empresa')
                }}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Ativar Modo Empresa"
              >
                <Building2 size={10} className="text-emerald-400" />
                + Ativar Empresa
              </button>
            )}

            {/* Google Calendar Quick Shortcut */}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 border rounded-full text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-silver-brushed/10 hover:bg-silver-brushed/20 border-silver-brushed/20 text-silver-polished'
              }`}
              title="Google Calendar"
            >
              <Calendar size={10} className="text-emerald-400" />
              Google Calendar
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-full text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {theme === 'dark' ? <Sun size={10} className="text-amber-400" /> : <Moon size={10} className="text-indigo-400/90" />}
              {theme === 'dark' ? "Modo Claro" : "Modo Escuro"}
            </button>

            {/* Sign Out Action */}
            {user && (
              <button
                onClick={signOut}
                className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 hover:text-rose-400 border border-zinc-700/30 text-zinc-400 rounded-full text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5"
              >
                <LogOut size={10} />
                Sair
              </button>
            )}
          </div>
        </div>

        {/* Mobile Month Selector (Hidden on Desktop) */}
        <div className="lg:hidden mb-6">
          <MonthSelector currentDate={currentDate} onChange={setCurrentDate} />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'metrics' ? (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Executive Summary Row: 2 Column Grid on Desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DailyBalanceHeader 
                  totalBalance={totalBalance} 
                  todayBalance={todayBalance} 
                  isStable={totalBalance >= 0}
                />
                <CobrancasSummary movements={movements} />
              </div>

              {/* Middle Section: Performance & Forecast */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 w-24 bg-zinc-800 rounded" />
                    <div className="h-10 w-48 bg-zinc-800 rounded" />
                    <div className="h-12 w-full bg-zinc-800 rounded-[24px]" />
                  </div>
                ) : (
                  <>
                    <PerformanceHeader 
                      performance={metrics.performance} 
                      change={metrics.performanceChange} 
                    />
                    
                    <ForecastCard 
                      projection={metrics.balanceProjection}
                      onOpenProjection={() => setActiveTab('projection')}
                    />
                  </>
                )}
              </div>

              {/* Lower Section: Detailed Metrics Bento Grid (3-columns on desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : !hasData ? (
                  <div className="col-span-full py-20 text-center bg-velvet-soft/40 border border-silver-brushed/5 rounded-[40px] backdrop-blur-md">
                    <PlusCircle size={40} className="text-silver-brushed/20 mx-auto mb-6" />
                    <h3 className="text-xl font-bold mb-2 tracking-tight">Silêncio Operacional</h3>
                    <p className="text-sm text-silver-brushed/40 max-w-xs mx-auto mb-8 font-medium">
                      Nenhuma atividade registrada para este ciclo temporal.
                    </p>
                    <button 
                      onClick={() => setExternalFabTrigger(prev => prev + 1)}
                      className="px-8 py-3 bg-silver-brushed text-velvet-deep rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform cursor-pointer"
                    >
                      Iniciar Registro
                    </button>
                  </div>
                ) : (
                  <>
                    <SavingsCard 
                      rate={metrics.savingsRate} 
                      amount={metrics.savingsAmount} 
                    />

                    <CostOfLivingCard 
                      personalBudget={metrics.personalBudget}
                      personalBudgetUsed={metrics.personalBudgetUsed}
                      personalBudgetRemaining={metrics.personalBudgetRemaining}
                      personalBudgetDailyRemaining={metrics.personalBudgetDailyRemaining}
                      personalBudgetPercentUsed={metrics.personalBudgetPercentUsed}
                      personalBudgetProjected={metrics.personalBudgetProjected}
                      orcamentoDiario={metrics.orcamentoDiario}
                      onDefineBudget={() => {
                        setTempBudget(metrics.personalBudget)
                        setIsBudgetModalOpen(true)
                      }}
                    />

                    <DailyAverageCard 
                      current={metrics.dailyAverageReal}
                      change={metrics.dailyAverageChange}
                    />

                    <div className="bg-velvet-soft border border-silver-brushed/10 rounded-[32px] p-8 flex flex-col justify-center items-center text-center shadow-xl group hover:border-silver-brushed/30 transition-colors">
                      <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em] mb-4">Precision Rating</p>
                      <div className="text-6xl font-black text-silver-brushed mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                        {metrics.savingsRate > 20 ? 'A+' : metrics.savingsRate > 10 ? 'B' : 'C'}
                      </div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full border ${metrics.savingsRate > 10 ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-amber-400 border-amber-400/20 bg-amber-400/5'}`}>
                        {metrics.savingsRate > 10 ? 'Peak Excellence' : 'Marginal Gains'}
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                      <DistributionCard 
                        data={metrics.distribution}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'projection' ? (
            <motion.div
              key="projection"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <FinancialProjectionTab />
            </motion.div>
          ) : activeTab === 'progression' ? (
            <motion.div
              key="progression"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <ProgressionTab 
                movements={movements} 
                onRefresh={refresh} 
                loading={loading}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
              />
            </motion.div>
          ) : activeTab === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <GoogleCalendarSettingsCard movements={movements} onRefreshMovements={refresh} />
            </motion.div>
          ) : activeTab === 'empresa' ? (
            <motion.div
              key="empresa"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <EmpresaTab />
            </motion.div>
          ) : activeTab === 'structural' ? (
            <motion.div
              key="structural"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <StructuralTab addTrigger={addStructuralTrigger} />
            </motion.div>
          ) : (
            <motion.div
              key="movements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <MovementsTab 
                movements={movements} 
                onRefresh={refresh} 
                loading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button Handler */}
      <FloatingActionButton 
        onRefresh={refresh} 
        activeTab={activeTab}
        onAddStructuralExpense={() => setAddStructuralTrigger(prev => prev + 1)}
        externalOpenTrigger={externalFabTrigger}
      />

      {/* Mobile Bottom Fixed Navigation (Hidden on Desktop) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 sm:p-6 flex justify-center z-40">
        <div className="bg-wood-teak/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex items-center gap-1 sm:gap-2 max-w-[calc(100vw-1.5rem)] sm:max-w-none overflow-x-auto custom-scrollbar relative z-10">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'metrics' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Métricas
          </button>

          <button
            onClick={() => setActiveTab('projection')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'projection' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Projeção
          </button>

          <button
            onClick={() => setActiveTab('structural')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'structural' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Custo Fixo
          </button>

          {/* Central Context-Aware Dynamic FAB */}
          <FloatingActionButton 
            onRefresh={refresh} 
            activeTab={activeTab}
            onAddStructuralExpense={() => setAddStructuralTrigger(prev => prev + 1)}
            isInline={true}
          />

          <button
            onClick={() => setActiveTab('progression')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'progression' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Progressão
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'movements' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Histórico
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'calendar' 
                ? 'bg-silver-brushed text-velvet-deep shadow-lg scale-[1.02]' 
                : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            Google Calendar
          </button>

          {profile?.empresa_enabled ? (
            <button
              onClick={() => setActiveTab('empresa')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'empresa' 
                  ? 'bg-emerald-500 text-zinc-950 shadow-lg scale-[1.02]' 
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              Empresa
            </button>
          ) : (
            <button
              onClick={() => {
                toggleEmpresaMode(true)
                setActiveTab('empresa')
              }}
              className="px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap shrink-0 cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-dashed border-emerald-500/30"
              title="Ativar Modo Empresa"
            >
              + Empresa
            </button>
          )}
        </div>
      </div>
      
      {/* Budget Definition Dialog */}
      <DialogShell
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        type="modal"
        maxWidth="max-w-md"
        header={
          <div className="pt-8 pb-4 text-center">
            <h3 className="text-xl font-black text-silver-polished tracking-tight uppercase tracking-wider mb-2">Definir Gasto Diário</h3>
            <p className="text-[11px] text-silver-brushed/40 font-medium max-w-xs mx-auto leading-relaxed">
              Quanto da sua renda mensal você deseja reservar para seus gastos pessoais neste mês?
            </p>
          </div>
        }
        footer={
          <div className="flex gap-4 w-full pt-4">
            <button
              onClick={() => setIsBudgetModalOpen(false)}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-silver-polished text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                updatePersonalBudget(tempBudget)
                setIsBudgetModalOpen(false)
              }}
              className="flex-1 py-4 bg-silver-brushed hover:scale-[1.02] text-velvet-deep text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all cursor-pointer"
            >
              Salvar Orçamento
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative w-full max-w-xs">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-silver-brushed/20 select-none">R$</span>
            <input
              type="number"
              value={tempBudget || ''}
              onChange={(e) => setTempBudget(Math.max(0, Number(e.target.value)))}
              placeholder="0,00"
              className="w-full pl-16 pr-6 py-6 bg-black/40 border border-white/10 rounded-2xl text-center text-3xl font-black text-silver-polished tracking-tighter outline-none focus:border-silver-brushed/40 focus:ring-1 focus:ring-silver-brushed/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          </div>
          <p className="text-[9px] text-silver-brushed/20 font-semibold uppercase tracking-widest mt-4">
            Será dividido por {new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()} dias neste mês
          </p>
        </div>
      </DialogShell>
    </div>
  )
}
