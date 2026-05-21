'use client'

import { DailyProgression } from '@/services/RollingBalanceEngine'
import { FinancialMovement } from '@/types/financial'
import { MovementSlot } from './MovementSlot'
import { RollingBalanceColumn } from './RollingBalanceColumn'

interface ProgressionDayRowProps {
  day: DailyProgression
  onEdit: (movement: FinancialMovement) => void
  index: number
}

export function ProgressionDayRow({ day, onEdit, index }: ProgressionDayRowProps) {
  const isAlternate = index % 2 === 1
  // Ordered slots as per screenshot
  const slots: (keyof typeof day.categoryTotals)[] = [
    'entrada',
    'saida_fixa',
    'gasto_diario',
    'economia',
    'cartao',
    'cobranca'
  ]

  return (
    <div className={`flex border-b border-silver-brushed/5 group transition-colors ${isAlternate ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
      {/* COLUMN 1: Day indicator - Precise Ruler Style */}
      <div className={`w-10 sm:w-12 shrink-0 flex flex-col items-center justify-center py-2 border-r border-silver-brushed/10 relative ${isAlternate ? 'bg-silver-brushed/[0.07]' : 'bg-silver-brushed/5'}`}>
        <div className="absolute top-0 right-0 bottom-0 w-px bg-white/5" />
        <span className="text-[11px] sm:text-xs font-black text-silver-brushed/60 tabular-nums tracking-tighter">
          {day.dayNumber}
        </span>
      </div>

      {/* COLUMN 2: Operational Flow */}
      <div className="flex-1 min-w-0 flex flex-col divide-y divide-silver-brushed/5">
        {slots.map(type => {
          const movementsOfType = day.movements.filter(m => m.type === type)
          const isVirtual = movementsOfType.length > 0 && movementsOfType.every(m => m.is_virtual)
          const isRecurring = movementsOfType.some(m => m.is_recurring)

          return (
            <div 
              key={type} 
              className={`cursor-pointer hover:bg-white/[0.02] transition-colors ${isVirtual ? 'bg-white/[0.01]' : ''}`}
              onClick={() => {
                if (movementsOfType.length > 0) {
                  onEdit(movementsOfType[0])
                }
              }}
            >
              <MovementSlot 
                type={type} 
                amount={day.categoryTotals[type]} 
                isVirtual={isVirtual}
                isRecurring={isRecurring}
              />
            </div>
          )
        })}
      </div>

      {/* COLUMN 3: Rolling Balance Area */}
      <RollingBalanceColumn balance={day.rollingBalance} />
    </div>
  )
}
