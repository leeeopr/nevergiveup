'use client'

import { MetricCard } from './MetricCard'
import { Counter } from './Counter'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'

interface DailyAverageCardProps {
  current: number
  change: number
}

export function DailyAverageCard({ current, change }: DailyAverageCardProps) {
  const isUp = change > 0

  return (
    <MetricCard delay={0.3}>
      <div className="w-12 h-12 rounded-2xl bg-wood-teak border border-white/5 flex items-center justify-center mb-6 shadow-lg shadow-black/40">
        <Clock size={18} className="text-silver-brushed/40" />
      </div>
      <div>
        <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em] mb-3">Consumo Diário (Média)</p>
        <div className="text-4xl font-black tracking-tighter mb-4 text-silver-polished flex items-baseline gap-2">
           <span className="text-xl text-silver-brushed/20 whitespace-nowrap">R$</span>
          <Counter value={current} prefix="" />
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
          !isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {isUp ? <TrendingUp size={12} className="opacity-50" /> : <TrendingDown size={12} className="opacity-60" />}
          <span>{Math.abs(change)}% <span className="opacity-40">Benchmark</span></span>
        </div>
      </div>
    </MetricCard>
  )
}
