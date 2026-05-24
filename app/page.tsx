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
import { DailyBalanceHeader } from '@/components/metrics/DailyBalanceHeader'
import { CobrancasSummary } from '@/components/metrics/CobrancasSummary'
import { RollingBalanceEngine } from '@/services/RollingBalanceEngine'
import { AlertCircle, PlusCircle, Database, LogOut, Wifi, WifiOff, Lock, Activity, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/context/AuthContext'
import { LoginPage } from '@/components/auth/LoginPage'

export default function MetricsPage() {
  const { user, loading: authLoading, signOut, isDbConnected, isOffline } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'metrics' | 'movements' | 'progression' | 'structural'>('metrics')
  const [addStructuralTrigger, setAddStructuralTrigger] = useState(0)

  const { metrics, loading, error, movements, refresh } = useFinancialMetrics(
    currentDate.getFullYear(),
    currentDate.getMonth()
  )

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
              className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <RotateCcw size={16} />
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold py-4 rounded-2xl transition-all active:scale-[0.98] text-sm border border-zinc-800/80 cursor-pointer"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </main>
    )
  }

  const hasData = movements.length > 0

  return (
    <main className={`min-h-screen p-3 sm:p-6 pb-40 mx-auto lg:py-16 selection:bg-silver-brushed selection:text-velvet-deep ${activeTab === 'progression' ? 'max-w-none px-2 sm:px-4 lg:px-8' : 'max-w-5xl'}`}>
      {/* Top Premium Status & Profile Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-velvet-soft/30 border border-silver-brushed/5 rounded-[28px] p-4 sm:px-6">
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



      {/* Immersive Month Selector */}
      <MonthSelector currentDate={currentDate} onChange={setCurrentDate} />

      <AnimatePresence mode="wait">
        {activeTab === 'metrics' ? (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Executive Summary Layer */}
            <div className="flex flex-col gap-6">
              <DailyBalanceHeader 
                totalBalance={totalBalance} 
                todayBalance={todayBalance} 
                isStable={totalBalance >= 0}
              />
              <CobrancasSummary movements={movements} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8">
            {/* Left Column: Header & Status */}
            <div className="space-y-6 flex flex-col">
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
                  />
                </>
              )}

              <div className="bg-wood-teak border border-white/5 rounded-[32px] p-8 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_20px_40px_rgba(0,0,0,0.4)] mt-auto hidden lg:block overflow-hidden relative">
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-[10px] text-silver-brushed/40 font-black uppercase tracking-[0.2em] mb-4">Integridade de Dados</div>
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${hasData ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-zinc-700'}`} />
                    <span className="font-bold text-xs uppercase tracking-wider text-silver-polished">{hasData ? 'Operação Segura' : 'Modo Latente'}</span>
                  </div>
                  <p className="text-[11px] text-silver-brushed/40 mt-4 leading-relaxed font-medium">
                    {hasData 
                      ? 'O núcleo de processamento está consolidando sua performance patrimonial em tempo real.' 
                      : 'Sincronize movimentações para habilitar o motor de inteligência financeira.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : !hasData ? (
                <div className="col-span-full py-28 text-center bg-velvet-soft/40 border border-silver-brushed/5 rounded-[40px] backdrop-blur-md">
                  <PlusCircle size={40} className="text-silver-brushed/20 mx-auto mb-6" />
                  <h3 className="text-xl font-bold mb-2 tracking-tight">Silêncio Operacional</h3>
                  <p className="text-sm text-silver-brushed/40 max-w-xs mx-auto mb-10 font-medium">
                    Nenhuma atividade física ou virtual registrada para este ciclo temporal.
                  </p>
                  <button 
                    onClick={() => {}} // Could trigger FAB
                    className="px-8 py-3 bg-silver-brushed text-velvet-deep rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform"
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
                    monthly={metrics.realCostOfLiving}
                    weekly={metrics.weeklyCost}
                    daily={metrics.dailyCost}
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

                  <div className="md:col-span-2">
                    <DistributionCard 
                      data={metrics.distribution}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
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

      {/* Floating Action Button */}
      <FloatingActionButton 
        onRefresh={refresh} 
        onClickOverride={activeTab === 'structural' ? () => setAddStructuralTrigger(prev => prev + 1) : undefined}
      />
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-8 flex justify-center z-40">
        <div className="bg-wood-teak border-t border-white/5 rounded-[40px] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] flex gap-1 sm:gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 sm:px-6 py-3 sm:py-4 rounded-[32px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all relative z-10 ${
              activeTab === 'metrics' ? 'bg-silver-brushed text-velvet-deep shadow-xl scale-[1.02]' : 'text-silver-brushed/40 hover:text-silver-brushed'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActiveTab('structural')}
            className={`px-3 sm:px-6 py-3 sm:py-4 rounded-[32px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all relative z-10 ${
              activeTab === 'structural' ? 'bg-silver-brushed text-velvet-deep shadow-xl scale-[1.02]' : 'text-silver-brushed/40 hover:text-silver-brushed'
            }`}
          >
            Custo Fixo
          </button>
          <button
            onClick={() => setActiveTab('progression')}
            className={`px-3 sm:px-6 py-3 sm:py-4 rounded-[32px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all relative z-10 ${
              activeTab === 'progression' ? 'bg-silver-brushed text-velvet-deep shadow-xl scale-[1.02]' : 'text-silver-brushed/40 hover:text-silver-brushed'
            }`}
          >
            Progressão
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 sm:px-6 py-3 sm:py-4 rounded-[32px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all relative z-10 ${
              activeTab === 'movements' ? 'bg-silver-brushed text-velvet-deep shadow-xl scale-[1.02]' : 'text-silver-brushed/40 hover:text-silver-brushed'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-velvet-deep via-velvet-deep/80 to-transparent pointer-events-none z-30" />
    </main>
  )
}
