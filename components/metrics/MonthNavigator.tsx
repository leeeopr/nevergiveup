'use client'

import { ChevronLeft, ChevronRight, Calendar, LayoutGrid } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthNavigatorProps {
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function MonthNavigator({ currentDate, onDateChange }: MonthNavigatorProps) {
  const nextMonth = () => {
    const next = new Date(currentDate)
    next.setMonth(next.getMonth() + 1)
    onDateChange(next)
  }

  const prevMonth = () => {
    const prev = new Date(currentDate)
    prev.setMonth(prev.getMonth() - 1)
    onDateChange(prev)
  }

  return (
    <div className="flex items-center justify-between w-full pb-4">
      <button className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-sm">
        <Calendar size={20} className="text-zinc-900" />
      </button>

      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="p-1 text-zinc-400 hover:text-zinc-900">
          <ChevronLeft size={24} />
        </button>
        <h3 className="text-zinc-900 font-black text-lg capitalize">
          {format(currentDate, 'MMM/yy', { locale: ptBR })}
        </h3>
        <button onClick={nextMonth} className="p-1 text-zinc-400 hover:text-zinc-900">
          <ChevronRight size={24} />
        </button>
      </div>

      <button className="w-10 h-10 rounded-xl bg-[#FFF8E1] border border-[#FFECB3] flex items-center justify-center shadow-sm">
        <LayoutGrid size={20} className="text-[#FFC107]" />
      </button>
    </div>
  )
}
