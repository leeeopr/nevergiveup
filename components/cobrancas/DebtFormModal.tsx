'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { Debt, DebtDirection, PersonWithDebts } from '@/types/personalDebts'
import { ArrowDownLeft, ArrowUpRight, PlusCircle, Calendar, FileText, DollarSign, X } from 'lucide-react'
import { format } from 'date-fns'

interface DebtFormModalProps {
  isOpen: boolean
  onClose: () => void
  person: PersonWithDebts | null
  initialDebt?: Debt | null
  onSave: (payload: {
    person_id: string
    type: DebtDirection
    description: string
    amount: number
    due_date?: string | null
    notes?: string | null
  }) => Promise<void>
}

const COMMON_SUGGESTIONS = [
  'Empréstimo',
  'Compra compartilhada',
  'Conta dividida',
  'Dinheiro emprestado',
  'Serviço prestado',
  'Aluguel / Despesa comum',
  'Parcela'
]

export function DebtFormModal({ isOpen, onClose, person, initialDebt, onSave }: DebtFormModalProps) {
  const [direction, setDirection] = useState<DebtDirection>('to_receive')
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialDebt) {
      setDirection(initialDebt.type)
      setDescription(initialDebt.description)
      setAmountStr(initialDebt.amount.toString())
      setDueDate(initialDebt.due_date || '')
      setNotes(initialDebt.notes || '')
    } else {
      setDirection('to_receive')
      setDescription('')
      setAmountStr('')
      setDueDate('')
      setNotes('')
    }
    setError(null)
  }, [initialDebt, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return

    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      setError('Por favor, informe a descrição da obrigação/dívida.')
      return
    }

    const parsedAmount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor monetário válido maior que zero.')
      return
    }

    if (initialDebt && initialDebt.total_paid && parsedAmount < initialDebt.total_paid) {
      setError(`O novo valor (R$ ${parsedAmount.toFixed(2)}) não pode ser inferior ao valor já amortizado (R$ ${initialDebt.total_paid.toFixed(2)}).`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onSave({
        person_id: person.id,
        type: direction,
        description: trimmedDesc,
        amount: parsedAmount,
        due_date: dueDate || null,
        notes: notes.trim() || null
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar a obrigação.')
    } finally {
      setLoading(false)
    }
  }

  const isEditing = Boolean(initialDebt)

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
              direction === 'to_receive'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}>
              {direction === 'to_receive' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-silver-polished tracking-tight">
                {isEditing ? 'Editar Obrigação' : 'Nova Obrigação'}
              </h2>
              <p className="text-xs text-silver-brushed/60 font-medium">
                Vínculo com <span className="font-bold text-silver-polished">{person?.name}</span>
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
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Direction Selector: Tenho a Receber vs Tenho a Pagar */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-2">
            Direção da Obrigação *
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDirection('to_receive')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                direction === 'to_receive'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-sm'
                  : 'bg-black/20 border-white/5 text-silver-brushed/60 hover:text-silver-polished'
              }`}
            >
              <div className={`p-2 rounded-xl ${direction === 'to_receive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5'}`}>
                <ArrowDownLeft size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-xs block font-black leading-tight">Tenho a Receber</span>
                <span className="text-[10px] opacity-70 block truncate">A pessoa me deve</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDirection('to_pay')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                direction === 'to_pay'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold shadow-sm'
                  : 'bg-black/20 border-white/5 text-silver-brushed/60 hover:text-silver-polished'
              }`}
            >
              <div className={`p-2 rounded-xl ${direction === 'to_pay' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5'}`}>
                <ArrowUpRight size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-xs block font-black leading-tight">Tenho a Pagar</span>
                <span className="text-[10px] opacity-70 block truncate">Eu devo à pessoa</span>
              </div>
            </button>
          </div>
        </div>

        {/* Descrição & Quick Suggestion Chips */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
            Descrição da Obrigação *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Empréstimo, Almoço compartilhado, Parcela de compras..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
          />

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMMON_SUGGESTIONS.map(sug => (
              <button
                key={sug}
                type="button"
                onClick={() => setDescription(sug)}
                className="text-[10px] px-2.5 py-1 bg-white/5 hover:bg-white/10 text-silver-brushed/80 hover:text-silver-polished rounded-lg border border-white/5 transition-all cursor-pointer"
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Due Date in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Valor */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
              Valor Original (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-silver-brushed/40">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-black text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors font-mono"
              />
            </div>
            {initialDebt && initialDebt.total_paid ? (
              <p className="text-[10px] text-amber-400 mt-1">
                Já pago: R$ {initialDebt.total_paid.toFixed(2)} (Mínimo permitido)
              </p>
            ) : null}
          </div>

          {/* Data de Vencimento */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
              Data de Vencimento (Opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
            Observações / Detalhes (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ex: Combinado para pagar até o final do mês, pix agendado..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-medium text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors resize-none"
          />
        </div>

        {/* Note on money flow */}
        <p className="text-[10px] text-silver-brushed/50 italic bg-black/10 p-2.5 rounded-xl border border-white/5">
          ℹ️ O registro desta obrigação não gera movimentação de caixa imediata. O fluxo financeiro só é impactado quando um pagamento for efetivado.
        </p>

        {/* Submit Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-silver-brushed/10 hover:bg-silver-brushed/15 text-silver-polished rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${
              direction === 'to_receive'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-rose-500 hover:bg-rose-400 text-white'
            }`}
          >
            {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Obrigação'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
