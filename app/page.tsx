'use client'

import { useState, useMemo } from 'react'
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
import { AlertCircle, PlusCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export default function MetricsPage() {
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

  if (error) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center bg-velvet-deep">
        <div className="bg-velvet-soft border border-silver-brushed/10 p-12 rounded-[40px] text-center max-w-sm shadow-2xl">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Interrupção de Sistema</h2>
          <p className="text-sm text-silver-brushed/60 mb-8 leading-relaxed font-medium">
            Falha na sincronização dos dados executivos. Restabeleça a conexão para prosseguir.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-silver-brushed text-velvet-deep font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl transition-all active:scale-95 hover:bg-white"
          >
            Reiniciar Interface
          </button>
        </div>
      </main>
    )
  }

  const hasData = movements.length > 0

  return (
    <main className={`min-h-screen p-3 sm:p-6 pb-40 mx-auto lg:py-16 selection:bg-silver-brushed selection:text-velvet-deep ${activeTab === 'progression' ? 'max-w-none px-2 sm:px-4 lg:px-8' : 'max-w-5xl'}`}>
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
