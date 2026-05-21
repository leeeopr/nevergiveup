'use client'

import { useMemo } from 'react'
import { FinancialMovement } from '@/types/financial'
import { RollingBalanceEngine } from '@/services/RollingBalanceEngine'
import { DailyBalanceCard } from './DailyBalanceCard'
import { motion } from 'motion/react'
import { Sparkles, TrendingUp, Shield, Activity } from 'lucide-react'

interface DailyProgressDashboardProps {
  movements: FinancialMovement[]
  onEdit: (movement: FinancialMovement) => void
}

export function DailyProgressDashboard({ movements, onEdit }: DailyProgressDashboardProps) {
  const dailyData = useMemo(() => {
    return RollingBalanceEngine.calculateDailyProgression(movements, new Date())
  }, [movements])

  const totalBalance = dailyData.length > 0 ? dailyData[0].rollingBalance : 0
  const todayData = dailyData.find(d => d.date === new Date().toISOString().split('T')[0])
  const todayBalance = todayData ? todayData.dailyBalance : 0

  return (
    <div className="space-y-8 pb-32">
      {/* Top Professional Summary */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden group hover:border-zinc-700 transition-all"
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center gap-2 mb-3">
             <Activity className="text-zinc-600" size={14} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Métrica Global</span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${totalBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-zinc-500 mt-1">Saldo acumulado total</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[32px] relative overflow-hidden group hover:border-zinc-700 transition-all"
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center gap-2 mb-3">
             <TrendingUp className="text-zinc-600" size={14} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Fluxo Hoje</span>
          </div>
          <div className={`text-2xl font-black tracking-tight ${todayBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {todayBalance >= 0 ? '+' : '-'} R$ {Math.abs(todayBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] font-medium text-zinc-500 mt-1">Impacto financeiro hoje</p>
        </motion.div>
      </div>

      {/* Stability Indicator */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Estabilidade Financeira: Forte</span>
        </div>
        <div className="flex items-center gap-1.5">
           <Shield className="text-zinc-700" size={14} />
           <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Encrypted Data</span>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 mb-8">
           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-zinc-800" />
           <h2 className="text-zinc-500 font-black text-[13px] uppercase tracking-[0.3em] flex items-center gap-2">
             <Sparkles size={14} />
             Timeline de Evolução
           </h2>
           <div className="h-px flex-1 bg-gradient-to-l from-transparent via-zinc-800 to-zinc-800" />
        </div>

        {dailyData.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-zinc-600 font-medium">Nenhuma movimentação para exibir este mês.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyData.map((day, idx) => (
              <DailyBalanceCard 
                key={day.date} 
                data={day} 
                onEdit={onEdit} 
                isLast={idx === dailyData.length - 1} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
