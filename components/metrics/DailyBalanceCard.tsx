'use client'

import { DailyProgression } from '@/services/RollingBalanceEngine'
import { FinancialMovement } from '@/types/financial'
import { DailyMovementGroup } from './DailyMovementGroup'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface DailyBalanceCardProps {
  data: DailyProgression
  onEdit: (movement: FinancialMovement) => void
  isLast?: boolean
}

export function DailyBalanceCard({ data, onEdit, isLast }: DailyBalanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isPositiveBalance = data.rollingBalance >= 0

  return (
    <div className={`relative flex gap-4 ${!isLast ? 'pb-8' : ''}`}>
      {/* Visual Timeline Line */}
      {!isLast && (
        <div className="absolute left-[34px] top-16 bottom-0 w-[2px] bg-gradient-to-b from-zinc-800 to-transparent z-0" />
      )}

      {/* Column 1: Date Block */}
      <div className="flex flex-col items-center shrink-0 z-10">
        <div className="w-[68px] h-[78px] bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-black/20">
          <span className="text-[10px] font-black text-zinc-500 tracking-tighter uppercase leading-none mb-1">
            {data.weekDay}
          </span>
          <span className="text-2xl font-black text-zinc-100 leading-none mb-1">
            {data.dayNumber}
          </span>
          <span className="text-[9px] font-bold text-rose-500/80 tracking-widest uppercase leading-none">
            {data.monthLabel}
          </span>
        </div>
      </div>

      {/* Column 2 & 3: Content and Balance */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className="flex items-center gap-2 group text-left"
             >
               <h3 className="text-zinc-100 font-black text-lg tracking-tight">
                 Fluxo do Dia
               </h3>
               {isExpanded ? (
                 <ChevronUp size={16} className="text-zinc-600 group-hover:text-zinc-400" />
               ) : (
                 <ChevronDown size={16} className="text-zinc-600 group-hover:text-zinc-400" />
               )}
             </button>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Saldo Acumulado</p>
            <div className={`text-lg font-black tracking-tight ${isPositiveBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
               R$ {data.rollingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <DailyMovementGroup movements={data.movements} onEdit={onEdit} />
              
              {/* Daily Summary subtle line */}
              <div className="mt-4 pt-4 border-t border-zinc-800/40 flex justify-end gap-6 text-[10px] items-center">
                 <div className="flex items-center gap-2">
                   <span className="text-zinc-600 font-bold uppercase tracking-widest">Entradas</span>
                   <span className="text-emerald-500/80 font-black">R${data.categoryTotals.entrada.toLocaleString('pt-BR')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-zinc-600 font-bold uppercase tracking-widest">Saídas</span>
                   <span className="text-rose-500/80 font-black">R${(data.categoryTotals.saida_fixa + data.categoryTotals.gasto_diario + data.categoryTotals.economia + data.categoryTotals.cartao).toLocaleString('pt-BR')}</span>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
