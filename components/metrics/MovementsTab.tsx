'use client'

import { useState, useMemo } from 'react'
import { FinancialMovement, MovementType } from '@/types/financial'
import { MovementHistoryList } from './MovementHistoryList'
import { EditMovementSheet } from './EditMovementSheet'
import { Search, SlidersHorizontal, History, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface MovementsTabProps {
  movements: FinancialMovement[]
  onRefresh: () => void
  loading: boolean
}

export function MovementsTab({ movements, onRefresh, loading }: MovementsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all')
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null)

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesSearch = m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (m.tag && m.tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesType = selectedType === 'all' || m.type === selectedType
      return matchesSearch && matchesType
    })
  }, [movements, searchTerm, selectedType])

  return (
    <div className="space-y-6 pb-40">
      {/* Header Info - Executive Registry Style */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-wood-teak flex items-center justify-center border border-white/10 shadow-lg">
            <History size={20} className="text-white opacity-80" />
          </div>
          <div>
            <h2 className="text-[var(--text-main)] font-black text-2xl leading-tight tracking-tighter">Auditoria</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Registro de Ativos Físicos</p>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-black text-[var(--text-main)] tabular-nums">
            {filteredMovements.length}
          </span>
          <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider mt-1">Nós de Dados</p>
        </div>
      </div>

      {/* Control Layer - Premium Console Style */}
      <div className="sticky top-0 z-50 bg-[var(--bg)]/90 backdrop-blur-2xl -mx-4 px-4 py-4 mb-6 border-b border-[var(--border)]">
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" size={15} />
            <input 
              type="text"
              placeholder="Localizar registro em banco local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--surface-accent)]/30 border border-[var(--border)] rounded-xl py-3.5 pl-12 pr-5 text-[11px] sm:text-xs text-[var(--text-main)] font-semibold focus:border-[var(--text-muted)] focus:ring-4 focus:ring-[var(--text-muted)]/10 transition-all placeholder:text-[var(--text-muted)]/55 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            <div className="w-10 h-10 flex items-center justify-center bg-[var(--surface-accent)]/30 rounded-xl border border-[var(--border)] shrink-0">
               <SlidersHorizontal size={13} className="text-[var(--text-muted)]" />
            </div>
            {(['all', 'entrada', 'saida_fixa', 'gasto_diario', 'cartao', 'economia', 'cobranca'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`h-10 px-5 rounded-xl text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.15em] whitespace-nowrap border transition-all cursor-pointer ${
                  selectedType === type 
                  ? 'bg-[var(--text-main)] text-[var(--surface)] border-[var(--text-main)] shadow-md scale-[1.01]' 
                  : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {type === 'all' ? 'Consolidado' : type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-8">
           <div className="relative">
              <div className="w-20 h-20 border-2 border-[var(--border)] rounded-full" />
              <div className="w-20 h-20 border-t-2 border-[var(--text-main)] rounded-full absolute top-0 left-0 animate-spin" />
           </div>
           <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Protocolo de Segurança</p>
              <h3 className="text-[var(--text-main)] font-black text-sm tracking-widest">Sincronizando Ledger...</h3>
           </div>
        </div>
      ) : (
        <div className="px-1">
          <MovementHistoryList 
            movements={filteredMovements} 
            onEdit={setEditingMovement} 
          />
        </div>
      )}

      <EditMovementSheet 
        movement={editingMovement}
        onClose={() => setEditingMovement(null)}
        onSuccess={onRefresh}
      />
    </div>
  )
}
