'use client'

import { useState, useMemo } from 'react'
import { FinancialMovement, MovementType } from '@/types/financial'
import { RollingBalanceEngine } from '@/services/RollingBalanceEngine'
import { ProgressionTimeline } from './ProgressionTimeline'
import { MonthNavigator } from './MonthNavigator'
import { EditMovementSheet } from './EditMovementSheet'
import { Search, Filter, LayoutGrid, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'

interface ProgressionTabProps {
  movements: FinancialMovement[]
  onRefresh: () => void
  loading: boolean
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function ProgressionTab({ movements, onRefresh, loading, currentDate, onDateChange }: ProgressionTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all')
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null)

  const dailyData = useMemo(() => {
    // We pass ALL movements to the engine to ensure correct global continuity calculation
    const data = RollingBalanceEngine.calculateDailyProgression(movements, currentDate)
    // Reverse chronological order: Last day of the month -> First day
    return [...data].reverse()
  }, [movements, currentDate])

  const handleEdit = (movement: FinancialMovement) => {
    if (movement.is_virtual && movement.parent_id) {
      const realMove = movements.find(m => m.id === movement.parent_id)
      if (realMove) {
        setEditingMovement(realMove)
        return
      }
    }
    setEditingMovement(movement)
  }

  return (
    <div className="space-y-6 pb-40 w-full max-w-none">
      {/* EXECUTIVE LEDGER CONTAINER */}
      <div className="executive-card rounded-2xl sm:rounded-3xl p-1 shadow-2xl border border-silver-brushed/10 overflow-hidden">
        {/* Navigation Header in Wood */}
        <div className="wood-panel rounded-xl sm:rounded-2xl mb-1 p-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            <MonthNavigator currentDate={currentDate} onDateChange={onDateChange} />
        </div>
        
        <div className="px-3 py-2 flex gap-2">
          <div className="relative flex-1 group">
            <div className="w-full bg-velvet-deep border border-silver-brushed/10 rounded-lg py-2 px-3 text-[8px] font-black uppercase tracking-[0.2em] text-silver-polished flex items-center justify-between shadow-inner opacity-60">
               <span className="flex items-center gap-2">
                 <LayoutGrid size={10} className="text-silver-brushed/30" />
                 Sincronização Ativa: Ledger Temporal
               </span>
               <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <ChevronDown size={10} className="text-silver-brushed/20" />
               </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-2 border-silver-brushed/5 border-t-silver-brushed rounded-full animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-silver-brushed/30">Análise de Fluxo...</p>
          </div>
        ) : (
          <div className="p-0.5">
            <ProgressionTimeline dailyData={dailyData} onEdit={handleEdit} />
          </div>
        )}
      </div>

      <EditMovementSheet 
        movement={editingMovement}
        onClose={() => setEditingMovement(null)}
        onSuccess={onRefresh}
      />
    </div>
  )
}
