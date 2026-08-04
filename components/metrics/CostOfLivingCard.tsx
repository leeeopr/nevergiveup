'use client'

import { MetricCard } from './MetricCard'
import { Counter } from './Counter'
import { Calendar, Clock, Sun, Wallet, AlertTriangle, ArrowRight } from 'lucide-react'

interface CostOfLivingCardProps {
  personalBudget: number
  personalBudgetUsed: number
  personalBudgetRemaining: number
  personalBudgetDailyRemaining: number
  personalBudgetPercentUsed: number
  personalBudgetProjected: number
  orcamentoDiario: number
  onDefineBudget: () => void
}

export function CostOfLivingCard({
  personalBudget,
  personalBudgetUsed,
  personalBudgetRemaining,
  personalBudgetDailyRemaining,
  personalBudgetPercentUsed,
  personalBudgetProjected,
  orcamentoDiario,
  onDefineBudget
}: CostOfLivingCardProps) {
  return (
    <MetricCard delay={0.2}>
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-wood-teak border border-white/5 flex items-center justify-center shadow-lg shadow-black/40">
          <Wallet size={18} className="text-silver-brushed/40" />
        </div>
        <button
          onClick={onDefineBudget}
          className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl transition-all text-silver-polished cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          Definir Gasto Diário
        </button>
      </div>
      <div>
        <p className="text-[10px] text-silver-brushed/30 font-black uppercase tracking-[0.2em] mb-2">Orçamento de Gastos Pessoais</p>
        <div className="text-4xl font-black tracking-tighter mb-4 text-silver-polished flex items-baseline gap-2">
          <span className="text-xl text-silver-brushed/20 whitespace-nowrap">R$</span>
          <Counter value={personalBudget} prefix="" />
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden silver-border p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                personalBudgetPercentUsed > 100
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                  : personalBudgetPercentUsed > 85
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              }`}
              style={{ width: `${Math.min(100, personalBudgetPercentUsed)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-silver-brushed/40 font-semibold">
            <span>Utilizado: {personalBudgetPercentUsed.toFixed(1)}%</span>
            <span>R$ {personalBudgetUsed.toFixed(2)} de R$ {personalBudget.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Sun size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Limite Diário</p>
            </div>
            <p className="text-base font-black text-silver-polished tracking-tighter">
              <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={orcamentoDiario} prefix="" />
            </p>
            <p className="text-[8px] text-silver-brushed/20 font-medium mt-1">Sugerido para o mês</p>
          </div>

          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Diário Restante</p>
            </div>
            <p className={`text-base font-black tracking-tighter ${personalBudgetDailyRemaining <= 0 ? 'text-rose-400' : 'text-silver-polished'}`}>
              <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={personalBudgetDailyRemaining} prefix="" />
            </p>
            <p className="text-[8px] text-silver-brushed/20 font-medium mt-1">Disponível até o fim do mês</p>
          </div>

          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Saldo Restante</p>
            </div>
            <p className={`text-base font-black tracking-tighter ${personalBudgetRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={personalBudgetRemaining} prefix="" />
            </p>
            <p className="text-[8px] text-silver-brushed/20 font-medium mt-1">Livre para gastar</p>
          </div>

          <div className="bg-velvet-deep/50 p-4 rounded-2xl silver-border group hover:bg-velvet-deep transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={10} className="text-silver-brushed/20" />
              <p className="text-[9px] text-silver-brushed/30 font-black uppercase tracking-widest">Projeção de Gasto</p>
            </div>
            <p className="text-base font-black text-silver-polished tracking-tighter">
              <span className="text-[10px] opacity-20 mr-1">R$</span>
              <Counter value={personalBudgetProjected} prefix="" />
            </p>
            <p className="text-[8px] text-silver-brushed/20 font-medium mt-1">Baseado no ritmo atual</p>
          </div>
        </div>
      </div>
    </MetricCard>
  )
}
