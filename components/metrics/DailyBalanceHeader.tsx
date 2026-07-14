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
        <div className="flex-1 p-5 sm:p-6 relative group bg-[var(--surface-accent)]/5">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <Activity className="text-[var(--text-muted)]" size={12} />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">Capital Estrutural</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] list-none ${totalBalance >= 0 ? 'text-[var(--text-main)]' : 'text-[var(--danger)]'}`}>
            <span className="text-xs mr-0.5 text-[var(--text-muted)] font-bold">R$</span>
            {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {/* Subtle Stability Dot */}
          <div className={`absolute top-6 right-6 w-1.5 h-1.5 rounded-full ${isStable ? 'bg-[var(--success)] shadow-[0_0_10px_rgba(22,163,74,0.4)]' : 'bg-[var(--danger)] shadow-[0_0_10px_rgba(220,38,38,0.4)]'}`} />
        </div>
 
        {/* Today Flux Section */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--surface-accent)]/10">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <TrendingUp className="text-[var(--text-muted)]" size={12} />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">Variação</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] ${todayBalance >= 0 ? 'text-[var(--text-main)]' : 'text-[var(--danger)]'}`}>
            <span className="text-xs mr-0.5 text-[var(--text-muted)] font-bold">R$</span>
            {Math.abs(todayBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
 
      {/* Stability Stripe */}
      <div className="px-6 py-3.5 bg-[var(--surface-accent)]/20 border-t border-[var(--border)] flex justify-between items-center">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Status de Integridade: <span className={isStable ? 'text-[var(--success)] font-black' : 'text-[var(--danger)] font-black'}>{isStable ? 'Consolidado' : 'Abaixo da Margem'}</span>
        </span>
        <div className="flex items-center gap-2">
           <Shield className="text-[var(--text-muted)]" size={12} />
           <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Criptografia Local Segura</span>
        </div>
      </div>
    </div>
  )
}
