'use client'

import React, { useState } from 'react'
import { Charge, ChargeOccurrence, OccurrenceStatus } from '@/types/cobranca'
import { calculateChargeStats } from '@/utils/chargeUtils'
import { cobrancasService } from '@/services/cobrancasService'
import { 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  Loader2, 
  AlertCircle,
  MoreVertical,
  Layers,
  Sparkles
} from 'lucide-react'

interface ChargeCardProps {
  charge: Charge
  onEdit: (charge: Charge) => void
  onDelete: (chargeId: string) => void
  onRefresh: () => void
}

export function ChargeCard({ charge, onEdit, onDelete, onRefresh }: ChargeCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [updatingOccId, setUpdatingOccId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const occurrences = charge.occurrences || []
  const stats = calculateChargeStats(occurrences)

  const handleToggleOccurrence = async (occ: ChargeOccurrence) => {
    try {
      setUpdatingOccId(occ.id)
      const nextStatus: OccurrenceStatus = occ.status === 'paid' ? 'pending' : 'paid'
      await cobrancasService.updateOccurrenceStatus(occ.id, nextStatus)
      onRefresh()
    } catch (err) {
      console.error('Failed to toggle occurrence status:', err)
    } finally {
      setUpdatingOccId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir a cobrança "${charge.description}" de ${charge.client_name}?`)) {
      return
    }
    try {
      setDeleting(true)
      await cobrancasService.deleteCharge(charge.id)
      onDelete(charge.id)
    } catch (err) {
      console.error('Failed to delete charge:', err)
      setDeleting(false)
    }
  }

  const [startY, startM, startD] = charge.start_date.split('-')
  const [endY, endM, endD] = charge.end_date.split('-')

  return (
    <div className="bg-velvet-deep border border-silver-brushed/10 hover:border-silver-brushed/25 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl transition-all space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Dia {charge.billing_day} do mês
            </span>
            <span className="text-[10px] font-black uppercase text-silver-brushed/50 tracking-wider">
              {startD}/{startM}/{startY} a {endD}/{endM}/{endY}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-silver-polished tracking-tight flex items-center gap-2">
            <User size={16} className="text-silver-brushed/60 shrink-0" />
            <span className="text-white">{charge.client_name}</span>
            <span className="text-silver-brushed/40 text-sm font-normal">•</span>
            <span className="text-silver-brushed/80 text-sm font-semibold">{charge.description}</span>
          </h3>
        </div>

        {/* Card Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onEdit(charge)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-silver-brushed hover:text-white transition-colors cursor-pointer"
            title="Editar cobrança"
          >
            <Edit3 size={15} />
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400 transition-colors cursor-pointer"
            title="Excluir cobrança"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-silver-brushed hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? "Ocultar parcelas" : "Exibir parcelas"}
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Financial Overview Stats Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Total Parcelas */}
        <div className="bg-black/30 border border-white/5 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-silver-brushed/40 uppercase tracking-wider block">Parcelas</span>
          <p className="text-sm font-black text-silver-polished mt-0.5">
            {stats.total} <span className="text-[10px] text-silver-brushed/50 font-normal">mês(es)</span>
          </p>
        </div>

        {/* Pagas */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider block">Pagas</span>
          <p className="text-sm font-black text-emerald-400 mt-0.5">
            {stats.paidCount} <span className="text-[10px] font-normal">ok</span>
          </p>
        </div>

        {/* Pendentes */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider block">Pendentes</span>
          <p className="text-sm font-black text-amber-400 mt-0.5">
            {stats.pendingCount} <span className="text-[10px] font-normal">aguardando</span>
          </p>
        </div>

        {/* Valor Total */}
        <div className="bg-black/30 border border-white/5 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-silver-brushed/40 uppercase tracking-wider block">Valor Total</span>
          <p className="text-xs sm:text-sm font-black text-silver-polished mt-0.5">
            R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Já Recebido */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider block">Já Recebido</span>
          <p className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">
            R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* A Receber / Pendente */}
        <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-2xl">
          <span className="text-[9px] font-bold text-rose-400/80 uppercase tracking-wider block">A Receber</span>
          <p className="text-xs sm:text-sm font-black text-rose-400 mt-0.5">
            R$ {stats.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-black uppercase text-silver-brushed/60">
          <span>Progresso de Liquidação ({stats.percentPaid}%)</span>
          <span>R$ {stats.totalReceived.toLocaleString('pt-BR')} / R$ {stats.totalAmount.toLocaleString('pt-BR')}</span>
        </div>
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${stats.percentPaid}%` }}
          />
        </div>
      </div>

      {/* Occurrences List Breakdown */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/50 block">
            Detalhamento de Parcela Mensal ({occurrences.length})
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {occurrences.map((occ) => {
              const isPaid = occ.status === 'paid'
              const [y, m, d] = occ.due_date.split('-')
              const isUpdating = updatingOccId === occ.id

              return (
                <div
                  key={occ.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    isPaid
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-black/30 border-white/5 text-silver-polished hover:border-white/10'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">
                        {d}/{m}/{y}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isPaid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {isPaid ? 'Pago' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-silver-brushed/80">
                      R$ {Number(occ.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Toggle Status Action Button */}
                  <button
                    onClick={() => handleToggleOccurrence(occ)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isPaid
                        ? 'bg-white/10 hover:bg-rose-500/20 text-silver-polished hover:text-rose-400 border border-white/10'
                        : 'bg-emerald-500 text-black hover:bg-emerald-400 font-bold shadow-md'
                    }`}
                  >
                    {isUpdating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPaid ? (
                      <>
                        <Clock size={11} />
                        <span>Reverter</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={11} />
                        <span>Marcar Pago</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {charge.notes && (
        <div className="text-[10px] text-silver-brushed/50 font-medium bg-black/20 p-2.5 rounded-xl border border-white/5">
          <span className="font-bold text-silver-brushed/70">Obs: </span>{charge.notes}
        </div>
      )}
    </div>
  )
}
