'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { Debt, DebtPayment } from '@/types/personalDebts'
import { 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  History, 
  X,
  CreditCard,
  AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  debt: Debt | null
  personName: string
  onRegisterPayment: (payload: {
    debt_id: string
    person_name: string
    debt_description: string
    debt_type: 'to_receive' | 'to_pay'
    amount: number
    payment_date: string
    notes?: string
    syncFinancialMovement: boolean
  }) => Promise<void>
  onDeletePayment: (paymentId: string, debtId: string) => Promise<void>
}

export function PaymentModal({
  isOpen,
  onClose,
  debt,
  personName,
  onRegisterPayment,
  onDeletePayment
}: PaymentModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [syncMovement, setSyncMovement] = useState(true)
  const [loading, setLoading] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'pay' | 'history'>('pay')

  const remaining = debt?.remaining_amount || 0
  const isToReceive = debt?.type === 'to_receive'

  useEffect(() => {
    if (debt) {
      setAmountStr(debt.remaining_amount ? debt.remaining_amount.toFixed(2) : '')
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      setNotes('')
      setSyncMovement(true)
      setActiveSubTab(debt.status === 'paid' ? 'history' : 'pay')
    }
    setError(null)
  }, [debt, isOpen])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handlePayFullRemaining = () => {
    if (debt && debt.remaining_amount) {
      setAmountStr(debt.remaining_amount.toFixed(2))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debt) return

    const parsedAmount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, informe um valor de pagamento válido maior que zero.')
      return
    }

    if (parsedAmount > remaining + 0.01) {
      setError(`O valor informado (${formatMoney(parsedAmount)}) ultrapassa o saldo restante pendente (${formatMoney(remaining)}).`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onRegisterPayment({
        debt_id: debt.id,
        person_name: personName,
        debt_description: debt.description,
        debt_type: debt.type,
        amount: parsedAmount,
        payment_date: paymentDate,
        notes: notes.trim() || undefined,
        syncFinancialMovement: syncMovement
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (paymentId: string) => {
    if (!debt) return
    const confirmed = window.confirm('Deseja realmente excluir este lançamento de pagamento? O saldo restante da obrigação será recalculado e a movimentação associada será removida.')
    if (!confirmed) return

    setDeletingPaymentId(paymentId)
    setError(null)
    try {
      await onDeletePayment(paymentId, debt.id)
    } catch (err: any) {
      setError(err.message || 'Erro ao remover pagamento.')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  if (!debt) return null

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-lg"
      header={
        <div className="flex items-center justify-between pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
              isToReceive
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}>
              {isToReceive ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-silver-polished tracking-tight">
                {isToReceive ? 'Registrar Recebimento' : 'Registrar Pagamento'}
              </h2>
              <p className="text-xs text-silver-brushed/60 font-medium">
                {debt.description} • <span className="text-silver-polished font-bold">{personName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-silver-brushed/50 hover:text-silver-polished rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-4">
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Debt Financial Summary Card */}
        <div className="bg-black/25 border border-[var(--border)] rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] font-black uppercase text-silver-brushed/50 block mb-0.5">Original</span>
            <span className="text-xs sm:text-sm font-black font-mono text-silver-polished">{formatMoney(debt.amount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-400/80 block mb-0.5">Amortizado</span>
            <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">{formatMoney(debt.total_paid || 0)}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400/80 block mb-0.5">Saldo Restante</span>
            <span className="text-xs sm:text-sm font-black font-mono text-amber-400">{formatMoney(remaining)}</span>
          </div>
        </div>

        {/* Sub tabs: Novo Pagamento / Histórico */}
        <div className="flex border-b border-[var(--border)] gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('pay')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeSubTab === 'pay'
                ? 'border-silver-brushed text-silver-polished'
                : 'border-transparent text-silver-brushed/40 hover:text-silver-polished'
            }`}
          >
            {debt.status === 'paid' ? 'Nova Amortização' : 'Efetuar Pagamento'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'border-silver-brushed text-silver-polished'
                : 'border-transparent text-silver-brushed/40 hover:text-silver-polished'
            }`}
          >
            <History size={14} />
            <span>Histórico ({debt.payments?.length || 0})</span>
          </button>
        </div>

        {activeSubTab === 'pay' ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {debt.status === 'paid' ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-1">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Esta obrigação já está 100% quitada!
                </p>
                <p className="text-[11px] text-silver-brushed/60">
                  Você ainda pode consultar o histórico de amortizações ou desfazer lançamentos na aba Histórico acima.
                </p>
              </div>
            ) : (
              <>
                {/* Fast Quick Pay remaining button */}
                <div className="flex items-center justify-between bg-silver-brushed/5 border border-silver-brushed/10 rounded-2xl p-3">
                  <div>
                    <span className="text-xs font-bold text-silver-polished block">Quitar Saldo Restante</span>
                    <span className="text-[10px] text-silver-brushed/50">Liquidar o valor de {formatMoney(remaining)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePayFullRemaining}
                    className="px-3.5 py-1.5 bg-silver-brushed text-velvet-deep font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Usar Saldo Total
                  </button>
                </div>

                {/* Amount input & Payment date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
                      Valor do Pagamento *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-silver-brushed/40">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={remaining}
                        required
                        placeholder="0,00"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-black text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
                      Data Efetiva *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
                    Observações / Comprovante (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Transferência via PIX, pago em espécie..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-medium text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
                  />
                </div>

                {/* Financial Movement Integration Checkbox */}
                <label className="flex items-start gap-3 p-3.5 bg-black/20 border border-[var(--border)] rounded-2xl cursor-pointer hover:border-silver-brushed/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={syncMovement}
                    onChange={(e) => setSyncMovement(e.target.checked)}
                    className="mt-0.5 rounded border-silver-brushed/30 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <div className="text-left text-xs">
                    <span className="font-bold text-silver-polished block">
                      Lançar no Fluxo Financeiro do Financeira Pro
                    </span>
                    <span className="text-[11px] text-silver-brushed/60 leading-relaxed block mt-0.5">
                      {isToReceive
                        ? 'Cria automaticamente uma "Entrada" (Receita) no extrato da data informada.'
                        : 'Cria automaticamente uma "Saída" (Despesa) no extrato da data informada.'}
                    </span>
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 bg-silver-brushed/10 hover:bg-silver-brushed/15 text-silver-polished rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Processando...' : 'Confirmar Pagamento'}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          /* Histórico de Pagamentos */
          <div className="space-y-3 pt-2">
            {(!debt.payments || debt.payments.length === 0) ? (
              <div className="py-10 text-center bg-black/10 border border-white/5 rounded-2xl p-6">
                <History size={28} className="text-silver-brushed/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-silver-brushed/60">
                  Nenhum pagamento registrado até o momento.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {debt.payments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 bg-black/20 border border-[var(--border)] rounded-2xl hover:border-silver-brushed/20 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-silver-polished text-sm">
                            {formatMoney(p.amount)}
                          </span>
                          <span className="text-[10px] text-silver-brushed/50 font-medium">
                            • {format(new Date(p.payment_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-silver-brushed/60 truncate mt-0.5">
                            {p.notes}
                          </p>
                        )}
                        {p.financial_movement_id && (
                          <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider block mt-0.5">
                            ✓ Lançado no Extrato
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingPaymentId === p.id}
                      className="p-2 text-silver-brushed/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
                      title="Excluir Pagamento"
                    >
                      <Trash2 size={15} className={deletingPaymentId === p.id ? 'animate-spin' : ''} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DialogShell>
  )
}
