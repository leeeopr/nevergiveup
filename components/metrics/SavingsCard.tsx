'use client'

import { MetricCard } from './MetricCard'
import { Counter } from './Counter'
import { motion } from 'motion/react'

interface SavingsCardProps {
  rate: number
  amount: number
}

export function SavingsCard({ rate, amount }: SavingsCardProps) {
  const getColor = (r: number) => {
    if (r < 10) return 'text-[var(--danger)]'
    if (r < 20) return 'text-[var(--warning)]'
    if (r < 30) return 'text-[var(--success)]'
    return 'text-[var(--primary)]'
  }

  const getShadowColor = (r: number) => {
    if (r < 10) return 'shadow-[0_0_15px_var(--danger)]'
    if (r < 20) return 'shadow-[0_0_15px_var(--warning)]'
    if (r < 30) return 'shadow-[0_0_15px_var(--success)]'
    return 'shadow-[0_0_15px_var(--primary)]'
  }

  const getBgColor = (r: number) => {
    if (r < 10) return 'bg-[var(--danger)]'
    if (r < 20) return 'bg-[var(--warning)]'
    if (r < 30) return 'bg-[var(--success)]'
    return 'bg-[var(--primary)]'
  }

  return (
    <MetricCard delay={0.1}>
      <div className="w-12 h-12 rounded-2xl bg-wood-teak border border-white/5 flex items-center justify-center mb-6 shadow-lg shadow-black/40">
        <div className="w-1.5 h-1.5 rounded-full bg-silver-brushed/40 animate-pulse" />
      </div>
      <div>
        <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em] mb-3">Ratio de Retenção (%)</p>
        <div className="text-4xl font-black tracking-tighter mb-4 text-silver-polished flex items-baseline gap-1">
          <Counter value={rate} suffix="%" />
          <span className="text-xs text-silver-brushed/20 uppercase font-black ml-1 select-none">Efficiency</span>
        </div>
        
        <div className="h-1.5 w-full bg-velvet-deep border border-silver-brushed/5 rounded-full overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(rate, 100)}%` }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="h-full bg-silver-brushed opacity-60 shadow-[0_0_15px_rgba(194,197,204,0.3)]"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest bg-white/5 p-3 rounded-xl silver-border">
          <span className="text-silver-brushed/40">
            <Counter value={amount} prefix="R$ " /> <span className="opacity-60">Liquid</span>
          </span>
          <span className="text-silver-brushed">NAV Target: 25%</span>
        </div>
      </div>
    </MetricCard>
  )
}
