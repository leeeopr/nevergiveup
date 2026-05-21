'use client'

import { DailyProgression } from '@/services/RollingBalanceEngine'
import { FinancialMovement } from '@/types/financial'
import { DailyMovementList } from './DailyMovementList'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface DailyProgressCardProps {
  data: DailyProgression
  onEdit: (movement: FinancialMovement) => void
  isLast?: boolean
}

export function DailyProgressCard({ data, onEdit, isLast }: DailyProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isPositiveBalance = data.rollingBalance >= 0

  return (
    <div className={`relative flex gap-4 ${!isLast ? 'pb-10' : ''}`}>
      {/* Visual Timeline Line - Thin and Elegant */}
      {!isLast && (
        <div className="absolute left-[34px] top-20 bottom-0 w-px bg-gradient-to-b from-zinc-800 via-zinc-800/30 to-transparent z-0" />
      )}

      {/* COLUMN 1 — DATE BLOCK */}
      <div className="flex flex-col items-center shrink-0 z-10">
        <div className="w-[68px] h-[82px] bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center shadow-2xl shadow-black/40 group-hover:border-zinc-700 transition-colors">
          <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase leading-none mb-1.5">
            {data.weekDay}
          </span>
          <span className="text-2xl font-black text-zinc-100 leading-none mb-1.5 tabular-nums">
            {data.dayNumber}
          </span>
          <span className="text-[10px] font-bold text-rose-500/90 tracking-[0.2em] uppercase leading-none">
            {data.monthLabel}
          </span>
        </div>
      </div>

      {/* COLUMN 2 & 3 — OPERATIONS & BALANCE */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between mb-5 gap-4">
          <div className="flex-1 min-w-0">
             <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className="flex items-center gap-2 group text-left w-full"
             >
               <h3 className="text-zinc-100 font-black text-lg tracking-tight uppercase text-[13px] tracking-[0.1em]">
                 Operações do Dia
               </h3>
               <div className="flex-1 h-px bg-zinc-800/40 group-hover:bg-zinc-700/60 transition-colors" />
               {isExpanded ? (
                 <ChevronUp size={14} className="text-zinc-600 group-hover:text-zinc-400" />
               ) : (
                 <ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400" />
               )}
             </button>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Saldo do Dia</p>
            <div className={`text-lg font-black tracking-tighter tabular-nums ${isPositiveBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
               <span className="text-xs uppercase mr-0.5 opacity-60">R$</span>
               {Math.abs(data.rollingBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              <DailyMovementList movements={data.movements} onEdit={onEdit} />
              
              {/* Daily Cumulative Balance Label */}
              <div className="mt-4 pt-3 flex justify-end gap-4 text-[10px] items-center border-t border-zinc-800/20">
                 <div className="flex items-center gap-2">
                   <span className="text-zinc-600 font-bold uppercase tracking-widest">Resultado do Dia</span>
                   <span className={`font-black ${data.dailyBalance >= 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                     {data.dailyBalance >= 0 ? '+' : ''} R$ {data.dailyBalance.toLocaleString('pt-BR')}
                   </span>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
