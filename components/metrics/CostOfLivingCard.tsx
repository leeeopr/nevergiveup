import { MetricCard } from './MetricCard'
import { Counter } from './Counter'
import { Calendar, Clock, Sun } from 'lucide-react'

interface CostOfLivingCardProps {
  monthly: number
  weekly: number
  daily: number
}

export function CostOfLivingCard({ monthly, weekly, daily }: CostOfLivingCardProps) {
  return (
    <MetricCard delay={0.2}>
      <div className="w-12 h-12 rounded-2xl bg-wood-teak border border-white/5 flex items-center justify-center mb-6 shadow-lg shadow-black/40">
        <Sun size={18} className="text-silver-brushed/40" />
      </div>
      <div>
        <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em] mb-3">Fluxo de Consumo Real</p>
        <div className="text-4xl font-black tracking-tighter mb-8 text-silver-polished flex items-baseline gap-2">
          <span className="text-xl text-silver-brushed/20 whitespace-nowrap">R$</span>
          <Counter value={monthly} prefix="" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Semanal</p>
            </div>
            <p className="text-base font-black text-silver-polished tracking-tighter">
              <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={weekly} prefix="" />
            </p>
          </div>
          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Sun size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Diário</p>
            </div>
            <p className="text-base font-black text-silver-polished tracking-tighter">
               <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={daily} prefix="" />
            </p>
          </div>
        </div>
      </div>
    </MetricCard>
  )
}
