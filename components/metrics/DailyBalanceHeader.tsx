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
    <div className="executive-card rounded-[24px] sm:rounded-3xl overflow-hidden shadow-2xl border border-silver-brushed/5">
      <div className="flex divide-x divide-silver-brushed/5">
        {/* Global Balance Section */}
        <div className="flex-1 p-5 sm:p-6 relative group bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <Activity className="text-silver-brushed/20" size={10} />
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-silver-brushed/30">Capital Estrutural</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] list-none ${totalBalance >= 0 ? 'text-silver-polished' : 'text-rose-400'}`}>
            <span className="text-xs mr-0.5 opacity-20 font-black">R$</span>
            {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {/* Subtle Stability Dot */}
          <div className={`absolute top-6 right-6 w-1 h-1 rounded-full ${isStable ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'}`} />
        </div>

        {/* Today Flux Section */}
        <div className="flex-1 p-5 sm:p-6 bg-white/[0.03]">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
             <TrendingUp className="text-silver-brushed/20" size={10} />
             <span className="text-[8px] font-black uppercase tracking-[0.3em] text-silver-brushed/30">Variação</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-[-0.05em] ${todayBalance >= 0 ? 'text-silver-brushed/80' : 'text-rose-400'}`}>
            <span className="text-xs mr-0.5 opacity-20 font-black">R$</span>
            {Math.abs(todayBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Stability Stripe */}
      <div className="px-6 py-3 bg-velvet-deep border-t border-silver-brushed/5 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-opacity-5">
        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-silver-brushed/20 italic">
          Security Integrity Level: <span className="text-silver-brushed/60">{isStable ? 'Nominal' : 'Critical'}</span>
        </span>
        <div className="flex items-center gap-2">
           <Shield className="text-silver-brushed/10" size={10} />
           <span className="text-[7px] font-black text-silver-brushed/20 uppercase tracking-[0.3em]">Vault Architecture v4.0</span>
        </div>
      </div>
    </div>
  )
}
