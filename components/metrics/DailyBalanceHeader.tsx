'use client'

import { motion } from 'motion/react'
import { Activity, TrendingUp, Shield } from 'lucide-react'

interface DailyBalanceHeaderProps {
  totalBalance: number
  todayBalance: number
  isStable?: boolean
}

export function DailyBalanceHeader({ totalBalance, todayBalance, isStable = true }: DailyBalanceHeaderProps) {
  return (
    <div className="executive-card rounded-[24px] sm:rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]">
      <div className="flex divide-x divide-[var(--border)]">
        {/* Global Balance Section */}
        <div className="flex-1 p-5 sm:p-6 relative group bg-[var(--surface-accent)]/5 dark:bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <Activity className="text-zinc-500 dark:text-silver-brushed/40" size={12} />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-600 dark:text-silver-brushed/60">Capital Estrutural</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] list-none ${totalBalance >= 0 ? 'text-[var(--text-main)]' : 'text-rose-600 dark:text-rose-400'}`}>
            <span className="text-xs mr-0.5 text-zinc-500 dark:text-silver-brushed/40 font-bold">R$</span>
            {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {/* Subtle Stability Dot */}
          <div className={`absolute top-6 right-6 w-1.5 h-1.5 rounded-full ${isStable ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`} />
        </div>

        {/* Today Flux Section */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--surface-accent)]/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <TrendingUp className="text-zinc-500 dark:text-silver-brushed/40" size={12} />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-600 dark:text-silver-brushed/60">Variação</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] ${todayBalance >= 0 ? 'text-[var(--text-main)]' : 'text-rose-600 dark:text-rose-400'}`}>
            <span className="text-xs mr-0.5 text-zinc-500 dark:text-silver-brushed/40 font-bold">R$</span>
            {Math.abs(todayBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Stability Stripe */}
      <div className="px-6 py-3.5 bg-[var(--surface-accent)]/20 dark:bg-velvet-deep border-t border-[var(--border)] flex justify-between items-center">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-600 dark:text-silver-brushed/60">
          Status de Integridade: <span className={isStable ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400 font-black'}>{isStable ? 'Consolidado' : 'Abaixo da Margem'}</span>
        </span>
        <div className="flex items-center gap-2">
           <Shield className="text-zinc-500 dark:text-silver-brushed/40" size={12} />
           <span className="text-[9px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em]">Criptografia Local Segura</span>
        </div>
      </div>
    </div>
  )
}
