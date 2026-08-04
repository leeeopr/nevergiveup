'use client'

import React, { useState, useMemo } from 'react'
import { FinancialMovement, MovementType } from '@/types/financial'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  PiggyBank, 
  CreditCard, 
  HandCoins, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ArrowUpDown, 
  Tag, 
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { financialService } from '@/services/financialService'
import { useAuth } from '@/context/AuthContext'

interface MovementHistoryTableProps {
  movements: FinancialMovement[]
  onEdit: (movement: FinancialMovement) => void
  onRefresh?: () => void
}

type SortField = 'date' | 'description' | 'amount' | 'type'
type SortOrder = 'asc' | 'desc'

const TYPE_CONFIG: Record<MovementType, { icon: any; colorClass: string; label: string }> = {
  entrada: { icon: ArrowUpRight, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Provimento' },
  saida_fixa: { icon: ArrowDownLeft, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Obrigação' },
  gasto_diario: { icon: ShoppingBag, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Operacional' },
  economia: { icon: PiggyBank, colorClass: 'text-silver-brushed/70 bg-white/5 border-white/10', label: 'Reserva' },
  cartao: { icon: CreditCard, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Passivo' },
  cobranca: { icon: HandCoins, colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Recebível' },
}

export function MovementHistoryTable({ movements, onEdit, onRefresh }: MovementHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { hasPermission } = useAuth()
  const canDelete = hasPermission('movements:delete')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      let comparison = 0
      if (sortField === 'date') {
        comparison = parseISO(a.date).getTime() - parseISO(b.date).getTime()
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description)
      } else if (sortField === 'amount') {
        comparison = Number(a.amount) - Number(b.amount)
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type)
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [movements, sortField, sortOrder])

  const handleDelete = async (id: string) => {
    if (!canDelete) return
    try {
      setDeleting(true)
      await financialService.deleteMovement(id)
      setDeleteConfirmId(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to delete movement:', err)
      alert('Erro ao excluir movimentação.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (move: FinancialMovement) => {
    if (move.type === 'cobranca') {
      try {
        const updatedStatus = !move.is_paid
        await financialService.updateMovement(move.id, {
          ...move,
          is_paid: updatedStatus,
          paid_at: updatedStatus ? new Date().toISOString() : undefined
        })
        if (onRefresh) onRefresh()
      } catch (err) {
        console.error('Failed to toggle status:', err)
      }
    }
  }

  if (movements.length === 0) {
    return (
      <div className="py-20 text-center bg-black/10 rounded-3xl border border-dashed border-silver-brushed/10 p-8">
        <p className="text-silver-brushed/40 text-sm font-bold uppercase tracking-wider">
          Nenhuma movimentação localizada para o período ou filtro selecionado.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-velvet-soft/40 border border-silver-brushed/10 rounded-[28px] overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-silver-brushed/10 bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-silver-brushed/50 select-none">
              <th 
                onClick={() => handleSort('date')}
                className="py-4 px-6 cursor-pointer hover:text-silver-polished transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>Data</span>
                  <ArrowUpDown size={10} className="ml-1 opacity-50" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('description')}
                className="py-4 px-6 cursor-pointer hover:text-silver-polished transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Descrição</span>
                  <ArrowUpDown size={10} className="ml-1 opacity-50" />
                </div>
              </th>

              <th className="py-4 px-6">
                <div className="flex items-center gap-1.5">
                  <Tag size={12} />
                  <span>Categoria / Classificação</span>
                </div>
              </th>

              <th 
                onClick={() => handleSort('type')}
                className="py-4 px-6 cursor-pointer hover:text-silver-polished transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Tipo</span>
                  <ArrowUpDown size={10} className="ml-1 opacity-50" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('amount')}
                className="py-4 px-6 text-right cursor-pointer hover:text-silver-polished transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Valor</span>
                  <ArrowUpDown size={10} className="ml-1 opacity-50" />
                </div>
              </th>

              <th className="py-4 px-6 text-center">Status</th>

              <th className="py-4 px-6 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-silver-brushed/5 text-xs font-semibold text-silver-polished">
            {sortedMovements.map((move) => {
              const config = TYPE_CONFIG[move.type] || TYPE_CONFIG.gasto_diario
              const Icon = config.icon
              const isNegative = move.type !== 'entrada' && move.type !== 'cobranca'
              const isCobranca = move.type === 'cobranca'
              const dateObj = parseISO(move.date)

              return (
                <tr 
                  key={move.id}
                  className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  onClick={() => onEdit(move)}
                >
                  {/* Data */}
                  <td className="py-4 px-6 whitespace-nowrap text-silver-brushed/80 font-mono">
                    {format(dateObj, 'dd/MM/yyyy', { locale: ptBR })}
                  </td>

                  {/* Descrição */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-silver-polished group-hover:text-amber-300 transition-colors">
                        {move.description}
                      </span>
                      {move.is_recurring && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-silver-brushed/60 border border-white/10 shrink-0">
                          {move.recurrence_type || 'Recorrente'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {move.tag ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-silver-brushed/70">
                        {move.tag}
                      </span>
                    ) : (
                      <span className="text-silver-brushed/30 text-[10px] italic">Sem Categoria</span>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.colorClass}`}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                  </td>

                  {/* Valor */}
                  <td className="py-4 px-6 text-right whitespace-nowrap font-black tabular-nums text-sm">
                    <span className={isCobranca && !move.is_paid ? 'text-orange-400' : (isNegative ? 'text-silver-polished' : 'text-emerald-400')}>
                      {isNegative ? '- ' : '+ '}
                      R$ {Number(move.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {isCobranca ? (
                      <button
                        onClick={() => handleToggleStatus(move)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                          move.is_paid
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 animate-pulse'
                        }`}
                        title={move.is_paid ? 'Cobrança quitada' : 'Pendente de recebimento - Clique para marcar como quitado'}
                      >
                        {move.is_paid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {move.is_paid ? 'Recebido' : 'Pendente'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/10">
                        <CheckCircle2 size={11} />
                        Liquidado
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(move)}
                        className="p-2 text-silver-brushed/60 hover:text-silver-polished hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        title="Editar Registro"
                      >
                        <Edit3 size={15} />
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => setDeleteConfirmId(move.id)}
                          className="p-2 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                          title="Excluir Registro"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Inline Delete Confirmation modal */}
                    {deleteConfirmId === move.id && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-velvet-soft border border-silver-brushed/20 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                            <AlertTriangle size={24} />
                          </div>
                          <h4 className="text-sm font-bold text-silver-polished uppercase tracking-wide">
                            Confirmar Exclusão
                          </h4>
                          <p className="text-xs text-silver-brushed/60 font-medium leading-relaxed">
                            Deseja realmente apagar esta movimentação (&quot;{move.description}&quot;)?
                          </p>
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-silver-polished text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDelete(move.id)}
                              disabled={deleting}
                              className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {deleting ? 'Excluindo...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
