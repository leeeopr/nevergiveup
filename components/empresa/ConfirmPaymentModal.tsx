'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { ChargeOccurrence } from '@/types/cobranca'
import { cobrancasService } from '@/services/cobrancasService'
import { CheckCircle2, Calendar, CreditCard, DollarSign, Loader2, FileText } from 'lucide-react'

interface ConfirmPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  occurrence: ChargeOccurrence | null
  clientName?: string
  chargeDescription?: string
  onSuccess: (receipt: any) => void
}

const PAYMENT_METHODS = [
  'PIX',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
  'Boleto',
  'Outro'
]

export function ConfirmPaymentModal({
  isOpen,
  onClose,
  occurrence,
  clientName,
  chargeDescription,
  onSuccess
}: ConfirmPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const [paymentDate, setPaymentDate] = useState(() => occurrence?.due_date || todayStr)
  const [paymentMethod, setPaymentMethod] = useState('PIX')

  useEffect(() => {
    if (occurrence) {
      const targetDate = occurrence.due_date || new Date().toISOString().split('T')[0]
      Promise.resolve().then(() => {
        setPaymentDate(targetDate)
        setPaymentMethod('PIX')
        setError(null)
      })
    }
  }, [occurrence, isOpen])

  if (!occurrence) return null

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentDate) {
      setError('Por favor, selecione a data do pagamento.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await cobrancasService.confirmPaymentWithDetails(
        occurrence.id,
        paymentDate,
        paymentMethod
      )

      onSuccess(result.receipt)
      onClose()
    } catch (err: any) {
      console.error('Error confirming payment:', err)
      setError(err?.message || 'Falha ao confirmar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  const [refY, refM] = (occurrence.reference_month || '').split('-')
  const refFormatted = refM && refY ? `${refM}/${refY}` : occurrence.reference_month

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-md"
      header={
        <div className="pt-4 pb-2 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-black text-silver-polished tracking-tight uppercase">
            Confirmar Pagamento
          </h3>
          <p className="text-xs text-silver-brushed/60 mt-1 font-medium">
            Registre a data de pagamento para gerar o recibo correspondente.
          </p>
        </div>
      }
      footer={
        <div className="flex gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-silver-polished text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            <span>Confirmar e Gerar Recibo</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleConfirm} className="space-y-4 py-2">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-xl">
            {error}
          </div>
        )}

        {/* Occurrence Summary Box */}
        <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-silver-polished">
            <span className="text-silver-brushed/60">Cliente:</span>
            <span className="truncate max-w-[200px]">{clientName || occurrence.client_name || 'Cliente'}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-silver-polished">
            <span className="text-silver-brushed/60">Competência:</span>
            <span>{refFormatted}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-silver-polished">
            <span className="text-silver-brushed/60">Valor Mensal:</span>
            <span className="text-emerald-400 font-mono font-black">
              R$ {Number(occurrence.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Payment Date Input */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1 flex items-center gap-1.5">
            <Calendar size={12} className="text-emerald-400" />
            <span>Data Efetiva do Pagamento</span>
          </label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all"
          />
          <p className="text-[10px] text-silver-brushed/50 mt-1 font-medium">
            * O recibo será emitido com a data de pagamento selecionada acima.
          </p>
        </div>

        {/* Payment Method Input */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1 flex items-center gap-1.5">
            <CreditCard size={12} className="text-emerald-400" />
            <span>Forma de Pagamento</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method} className="bg-zinc-900 text-silver-polished">
                {method}
              </option>
            ))}
          </select>
        </div>
      </form>
    </DialogShell>
  )
}
