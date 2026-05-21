'use client'

import { FinancialMovement } from '@/types/financial'
import { DailyProgression } from '@/services/RollingBalanceEngine'
import { ProgressionDayRow } from './ProgressionDayRow'

interface ProgressionTimelineProps {
  dailyData: DailyProgression[]
  onEdit: (movement: FinancialMovement) => void
}

export function ProgressionTimeline({ dailyData, onEdit }: ProgressionTimelineProps) {
  return (
    <div className="silver-border rounded-xl mb-1 overflow-hidden shadow-2xl bg-velvet-deep/40 backdrop-blur-xl">
      {/* Label Header - Brushed Chrome Style */}
      <div className="flex bg-silver-brushed/5 border-b border-silver-brushed/10 text-silver-brushed/30 font-black py-2 px-0">
        <div className="w-10 sm:w-12 shrink-0 text-center text-[7px] uppercase tracking-[0.3em] font-black">Ciclo</div>
        <div className="flex-1 text-left pl-3 sm:pl-4 text-[7px] uppercase tracking-[0.3em] font-black">Operacional</div>
        <div className="w-[100px] sm:w-[120px] shrink-0 text-right pr-3 sm:pr-4 text-[7px] uppercase tracking-[0.3em] font-black">Patrimonial</div>
      </div>

      <div className="flex flex-col">
        {dailyData.length === 0 ? (
          <div className="py-40 text-center">
            <p className="text-silver-brushed/20 font-black uppercase tracking-[0.2em] text-[10px]">Vácuo Operacional Detectado</p>
          </div>
        ) : (
          dailyData.map((day, idx) => (
            <ProgressionDayRow key={day.date} day={day} onEdit={onEdit} index={idx} />
          ))
        )}
      </div>
    </div>
  )
}
