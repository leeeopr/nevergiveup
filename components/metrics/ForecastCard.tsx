import { MetricCard } from './MetricCard'
import { Counter } from './Counter'
import { Wallet } from 'lucide-react'

interface ForecastCardProps {
  projection: number
  onOpenProjection?: () => void
}

export function ForecastCard({ projection, onOpenProjection }: ForecastCardProps) {
  const isPositive = projection >= 0

  return (
    <MetricCard 
      delay={0.5} 
      className="bg-wood-teak/10 border-silver-brushed/10 group cursor-pointer hover:border-silver-brushed/30 transition-all"
    >
      <div onClick={onOpenProjection}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em]">Capital Disponível (Projetado)</p>
          <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 group-hover:bg-amber-400/20 transition-all">Ver Curva Complete &rarr;</span>
        </div>
        <div className={`text-4xl font-black tracking-tighter mb-6 flex items-baseline gap-2 ${isPositive ? 'text-silver-polished' : 'text-rose-400'}`}>
          <span className="text-xl text-silver-brushed/20 select-none">R$</span>
          <Counter value={projection} prefix="" />
        </div>
        <p className="text-[11px] text-silver-brushed/40 leading-relaxed font-medium">
          Benchmark de liquidez ao encerramento do ciclo, considerando obrigações recorrentes e passivos flutuantes.
        </p>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ boxShadow: `0 0 12px ${isPositive ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'}` }} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-silver-brushed/60">
          {isPositive ? 'Fluxo Estável' : 'Risco de Débito'}
        </span>
      </div>
    </MetricCard>
  )
}
