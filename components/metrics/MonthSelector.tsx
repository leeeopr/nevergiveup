'use client'

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthSelectorProps {
  currentDate: Date
  onChange: (date: Date) => void
}

export function MonthSelector({ currentDate, onChange }: MonthSelectorProps) {
  const nextMonth = () => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + 1)
    onChange(next)
  }

  const prevMonth = () => {
    const prev = new Date(currentDate)
    prev.setMonth(prev.getMonth() - 1)
    onChange(prev)
  }

  return (
    <div className="flex items-center justify-between bg-wood-teak border-t border-white/10 rounded-[28px] sm:rounded-[32px] p-1 sm:p-1.5 mb-8 sm:mb-12 shadow-[0_15px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden group">
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <button 
        onClick={prevMonth}
        className="p-3 sm:p-4 hover:bg-white/5 rounded-2xl transition-all text-silver-brushed/40 hover:text-white active:scale-95 z-10"
      >
        <ChevronLeft size={18} />
      </button>
      
      <div className="flex items-center gap-2 sm:gap-3 z-10">
        <div className="w-1 h-1 rounded-full bg-silver-brushed/20" />
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-silver-polished opacity-80 decoration-silver-brushed/20 underline-offset-4">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="w-1 h-1 rounded-full bg-silver-brushed/20" />
      </div>

      <button 
        onClick={nextMonth}
        className="p-3 sm:p-4 hover:bg-white/5 rounded-2xl transition-all text-silver-brushed/40 hover:text-white active:scale-95 z-10"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
