'use client'

import React, { useState } from 'react'
import { Charge, ChargeOccurrence, OccurrenceStatus } from '@/types/cobranca'
import { Receipt } from '@/types/company'
import { calculateChargeStats } from '@/utils/chargeUtils'
import { cobrancasService } from '@/services/cobrancasService'
import { ConfirmPaymentModal } from './ConfirmPaymentModal'
import { ReceiptPrintModal } from './ReceiptPrintModal'
import { useAuth } from '@/context/AuthContext'
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
  Sparkles,
  FileText,
  Send,
  CheckCheck,
  SendHorizontal
} from 'lucide-react'

interface ChargeCardProps {
  charge: Charge
  onEdit: (charge: Charge) => void
  onDelete: (chargeId: string) => void
  onRefresh: () => void
}

export function ChargeCard({ charge, onEdit, onDelete, onRefresh }: ChargeCardProps) {
  const { profile } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true)
  const [updatingOccId, setUpdatingOccId] = useState<string | null>(null)
  const [togglingSentOccId, setTogglingSentOccId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modals state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedOccForConfirm, setSelectedOccForConfirm] = useState<ChargeOccurrence | null>(null)

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [receiptForPrint, setReceiptForPrint] = useState<Receipt | null>(null)
  const [loadingReceiptOccId, setLoadingReceiptOccId] = useState<string | null>(null)

  const occurrences = charge.occurrences || []
  const stats = calculateChargeStats(occurrences)

  const userEmailOrName = profile?.full_name || profile?.email || 'Usuário'

  const handleOpenConfirmModal = (occ: ChargeOccurrence) => {
    setSelectedOccForConfirm(occ)
    setConfirmModalOpen(true)
  }

  const handlePaymentConfirmed = (receipt: Receipt) => {
    onRefresh()
    if (receipt) {
      setReceiptForPrint(receipt)
      setPrintModalOpen(true)
    }
  }

  const handleDownloadReceipt = async (occ: ChargeOccurrence) => {
    try {
      setLoadingReceiptOccId(occ.id)
      const receipt = await cobrancasService.getOrCreateReceiptForOccurrence(
        occ.id, 
        occ.payment_date || (occ.paid_at ? occ.paid_at.split('T')[0] : undefined),
        occ.payment_method || 'PIX'
      )
      setReceiptForPrint(receipt)
      setPrintModalOpen(true)
    } catch (err) {
      console.error('Error fetching/creating receipt for occurrence:', err)
      alert('Não foi possível gerar o recibo para esta ocorrência.')
    } finally {
      setLoadingReceiptOccId(null)
    }
  }

  const handleToggleSentStatus = async (occ: ChargeOccurrence) => {
    try {
      setTogglingSentOccId(occ.id)
      const nextSent = !occ.receipt_sent
      await cobrancasService.toggleOccurrenceReceiptSent(occ.id, nextSent, userEmailOrName)
      onRefresh()
    } catch (err) {
      console.error('Error toggling receipt sent status:', err)
    } finally {
      setTogglingSentOccId(null)
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

      {/* Occurrences / Monthly Recibos Breakdown */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/60 block">
              Mensalidades & Recibos ({occurrences.length})
            </span>
            <span className="text-[9px] text-silver-brushed/40 font-medium">
              * Recibos gerados automaticamente com a data de pagamento
            </span>
          </div>

          <div className="space-y-2">
            {occurrences.map((occ) => {
              const isPaid = occ.status === 'paid'
              const [dueY, dueM, dueD] = occ.due_date.split('-')

              const [refY, refM] = occ.reference_month.split('-')
              const monthLabel = refM && refY ? `${refM}/${refY}` : occ.reference_month

              const isDownloadingReceipt = loadingReceiptOccId === occ.id
              const isTogglingSent = togglingSentOccId === occ.id

              // Format payment date if available
              let paymentDateFormatted = null
              if (occ.payment_date) {
                const [pY, pM, pD] = occ.payment_date.split('-')
                paymentDateFormatted = `${pD}/${pM}/${pY}`
              } else if (occ.paid_at) {
                paymentDateFormatted = new Date(occ.paid_at).toLocaleDateString('pt-BR')
              }

              // Format sent date if available
              let sentDateFormatted = null
              if (occ.receipt_sent_at) {
                sentDateFormatted = new Date(occ.receipt_sent_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }

              return (
                <div
                  key={occ.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isPaid
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-black/30 border-white/5 text-silver-polished hover:border-white/10'
                  }`}
                >
                  {/* Left Column: Reference Month, Due Date, Status */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-white font-mono">
                        Ref: {monthLabel}
                      </span>
                      <span className="text-[10px] font-bold text-silver-brushed/50">
                        (Venc: {dueD}/{dueM}/{dueY})
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isPaid ? 'Pago' : 'Pendente'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="font-mono font-black text-emerald-400">
                        R$ {Number(occ.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>

                      {isPaid && paymentDateFormatted && (
                        <span className="text-[10px] text-silver-brushed/70 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                          <span>Pago em {paymentDateFormatted}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Sent Status Controls */}
                  {isPaid && (
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-2 rounded-xl shrink-0">
                      <div className="text-[10px] space-y-0.5">
                        {occ.receipt_sent ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCheck size={13} className="shrink-0" />
                            <span>Enviado {sentDateFormatted ? `em ${sentDateFormatted}` : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-silver-brushed/50 font-medium">
                            <SendHorizontal size={13} className="shrink-0" />
                            <span>Não enviado ao cliente</span>
                          </div>
                        )}
                        {occ.receipt_sent_by && (
                          <div className="text-[8px] text-silver-brushed/40 truncate max-w-[140px]">
                            Por: {occ.receipt_sent_by}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSentStatus(occ)}
                        disabled={isTogglingSent}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                          occ.receipt_sent
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {isTogglingSent ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : occ.receipt_sent ? (
                          'Marcar Não Enviado'
                        ) : (
                          'Marcar Enviado'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Right Column: Main Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(occ)}
                        disabled={isDownloadingReceipt}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isDownloadingReceipt ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <FileText size={13} />
                        )}
                        <span>Baixar Recibo</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenConfirmModal(occ)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirmar Pagamento</span>
                      </button>
                    )}
                  </div>
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

      {/* Confirm Payment Modal */}
      <ConfirmPaymentModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        occurrence={selectedOccForConfirm}
        clientName={charge.client_name}
        chargeDescription={charge.description}
        onSuccess={handlePaymentConfirmed}
      />

      {/* Receipt Print / Preview Modal */}
      <ReceiptPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        receipt={receiptForPrint}
      />
    </div>
  )
}

