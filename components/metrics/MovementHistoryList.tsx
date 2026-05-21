'use client'

import React from 'react'
import { FinancialMovement, MovementType } from '@/types/financial'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUpRight, ArrowDownLeft, ShoppingBag, PiggyBank, CreditCard, Calendar, Tag, RefreshCcw, Search, Clock, Shield, HandCoins } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MovementHistoryItemProps {
  movement: FinancialMovement
  onEdit: (movement: FinancialMovement) => void
}

const TYPE_CONFIG: Record<MovementType, { icon: any; colorClass: string; label: string }> = {
  entrada: { icon: ArrowUpRight, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Provimento' },
  saida_fixa: { icon: ArrowDownLeft, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Obrigação' },
  gasto_diario: { icon: ShoppingBag, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Operacional' },
  economia: { icon: PiggyBank, colorClass: 'text-silver-brushed/60 bg-white/5 border-white/10', label: 'Reserva' },
  cartao: { icon: CreditCard, colorClass: 'text-silver-brushed/60 bg-white/5 border-white/10', label: 'Passivo' },
  cobranca: { icon: HandCoins, colorClass: 'text-orange-400/80 bg-orange-500/10 border-orange-500/20', label: 'Recebível' },
}

function MovementHistoryItem({ movement, onEdit }: MovementHistoryItemProps) {
  const config = TYPE_CONFIG[movement.type]
  const Icon = config.icon
  const date = parseISO(movement.date)
  const isNegative = movement.type !== 'entrada' && movement.type !== 'cobranca'
  const isCobranca = movement.type === 'cobranca'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onEdit(movement)}
      className="group relative bg-black/20 executive-card rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-silver-brushed/30 transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Type Icon */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shadow-lg shrink-0 transition-transform group-hover:scale-105 ${config.colorClass}`}>
          <Icon size={16} className="sm:size-[18px]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h4 className="text-[13px] sm:text-[14px] font-black tracking-tight text-silver-polished truncate">
              {movement.description}
            </h4>
            <span className={`text-[14px] sm:text-[15px] font-black tabular-nums tracking-tighter ${(isCobranca && !movement.is_paid) ? 'text-orange-400' : (isNegative ? 'text-silver-polished' : 'text-emerald-400')}`}>
               <span className="text-[9px] sm:text-[10px] opacity-20 mr-1">R$</span>
              {isNegative ? '-' : '+'} {Number(movement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2">
            {/* Metadata Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar size={9} className="text-silver-brushed/20" />
              <span className="text-[7px] sm:text-[8px] font-black text-silver-brushed/40 uppercase tracking-widest">
                {format(date, 'dd MMM yyyy', { locale: ptBR })}
              </span>
            </div>

            {movement.tag && (
              <div className="flex items-center gap-2">
                <Tag size={10} className="text-silver-brushed/20" />
                <span className="text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.2em] italic">
                  Registry: {movement.tag}
                </span>
              </div>
            )}

            {movement.is_recurring && (
              <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                <RefreshCcw size={10} className="text-silver-brushed/30" />
                <span className="text-[8px] font-black text-silver-brushed/40 uppercase tracking-widest">
                  {movement.recurrence_type || 'Recurring'}
                </span>
              </div>
            )}
            
            {/* Created At / Realism indicator */}
            <div className="flex items-center gap-2 ml-auto">
              <Shield size={10} className="text-silver-brushed/10" />
               <span className="text-[7px] font-black text-silver-brushed/10 uppercase tracking-[0.3em]">
                Verified Node
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface MovementHistoryListProps {
  movements: FinancialMovement[]
  onEdit: (movement: FinancialMovement) => void
}

export function MovementHistoryList({ movements, onEdit }: MovementHistoryListProps) {
  // Group movements by Month for better visual hierarchy if list is long
  const groupedMovements = movements.reduce((acc, move) => {
    const monthYear = format(parseISO(move.date), 'MMMM yyyy', { locale: ptBR })
    if (!acc[monthYear]) acc[monthYear] = []
    acc[monthYear].push(move)
    return acc
  }, {} as Record<string, FinancialMovement[]>)

  const sortedMonthKeys = Object.keys(groupedMovements).sort((a, b) => {
    return parseISO(groupedMovements[b][0].date).getTime() - parseISO(groupedMovements[a][0].date).getTime()
  })

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-10 text-center bg-black/10 rounded-[40px] border border-dashed border-silver-brushed/10 shadow-inner">
        <div className="w-16 h-16 bg-silver-brushed/5 rounded-full flex items-center justify-center mb-6 border border-silver-brushed/5">
          <Search size={24} className="text-silver-brushed/10" />
        </div>
        <h3 className="text-silver-brushed/40 font-black text-lg tracking-tight">Vácuo de Auditoria</h3>
        <p className="text-silver-brushed/20 text-[10px] font-black uppercase tracking-widest mt-3 max-w-[240px] leading-relaxed">Auditoria completa. Nenhuma operação de alocação detectada no ledger local.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {sortedMonthKeys.map(month => (
        <div key={month} className="space-y-6">
          <div className="flex items-center gap-4">
             <div className="h-px flex-1 bg-silver-brushed/5" />
             <h3 className="text-[9px] font-black text-silver-brushed/20 uppercase tracking-[0.5em]">{month}</h3>
             <div className="h-px flex-1 bg-silver-brushed/5" />
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {groupedMovements[month].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(move => (
                <MovementHistoryItem key={move.id} movement={move} onEdit={onEdit} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}
