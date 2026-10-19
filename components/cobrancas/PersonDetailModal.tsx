'use client'

import React, { useState } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { PersonWithDebts, Debt, DebtDirection } from '@/types/personalDebts'
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  DollarSign, 
  Scale, 
  Phone, 
  X,
  CreditCard,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'

interface PersonDetailModalProps {
  isOpen: boolean
  onClose: () => void
  person: PersonWithDebts | null
  onAddDebt: (person: PersonWithDebts, defaultType?: DebtDirection) => void
  onEditDebt: (debt: Debt) => void
  onDeleteDebt: (debtId: string) => Promise<void>
  onOpenPayment: (debt: Debt) => void
}

export function PersonDetailModal({
  isOpen,
  onClose,
  person,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onOpenPayment
}: PersonDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'to_receive' | 'to_pay'>('to_receive')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!person) return null

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const toReceiveDebts = person.debts.filter(d => d.type === 'to_receive')
  const toPayDebts = person.debts.filter(d => d.type === 'to_pay')

  const currentList = activeTab === 'to_receive' ? toReceiveDebts : toPayDebts
  const filteredList = currentList.filter(d => {
    if (statusFilter === 'open') return d.status !== 'paid'
    if (statusFilter === 'paid') return d.status === 'paid'
    return true
  })

  const handleDelete = async (debt: Debt) => {
    const confirmed = window.confirm(`Deseja realmente excluir a obrigação "${debt.description}"? O histórico de amortizações desta dívida e os registros financeiros vinculados serão removidos.`)
    if (!confirmed) return

    setDeletingId(debt.id)
    try {
      await onDeleteDebt(debt.id)
    } finally {
      setDeletingId(null)
    }
  }

  const isNetPositive = person.netBalance > 0.009
  const isNetNegative = person.netBalance < -0.009

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-4xl"
      header={
        <div className="pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-silver-brushed/10 border border-silver-brushed/20 flex items-center justify-center text-silver-polished font-black text-base shadow-inner">
                {person.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-silver-polished tracking-tight">
                    {person.name}
                  </h2>
                  {person.phone && (
                    <a
                      href={`https://wa.me/${person.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-all"
                    >
                      <Phone size={10} />
                      WhatsApp
                    </a>
                  )}
                </div>
                <p className="text-xs text-silver-brushed/60 font-medium mt-0.5">
                  Painel individual de conciliação financeira
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddDebt(person, activeTab)}
                className="py-2.5 px-4 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>+ Nova Obrigação</span>
              </button>
              <button
                onClick={onClose}
                className="p-2.5 text-silver-brushed/50 hover:text-silver-polished rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Individual Person Summary Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3.5 text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft size={13} />
                  Total a Receber
                </span>
                <span className="opacity-60">{toReceiveDebts.filter(d => d.status !== 'paid').length} em aberto</span>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-400 tracking-tight font-mono">
                {formatMoney(person.totalToReceive)}
              </p>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-3.5 text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={13} />
                  Total a Pagar
                </span>
                <span className="opacity-60">{toPayDebts.filter(d => d.status !== 'paid').length} em aberto</span>
              </div>
              <p className="text-base sm:text-lg font-black text-rose-400 tracking-tight font-mono">
                {formatMoney(person.totalToPay)}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between ${
              isNetPositive
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : isNetNegative
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                : 'bg-zinc-800/20 border-zinc-700/30 text-silver-brushed/80'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Scale size={13} />
                  Saldo Líquido
                </span>
                <span className="text-[9px] opacity-80">
                  {isNetPositive ? 'A Receber' : isNetNegative ? 'A Pagar' : 'Quites'}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black tracking-tight font-mono">
                {isNetPositive ? `+ ${formatMoney(person.netBalance)}` : formatMoney(person.netBalance)}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pt-4">
        {/* Navigation Between the 2 Lists: Tenho a Receber vs Tenho a Pagar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('to_receive')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'to_receive'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 border border-transparent'
              }`}
            >
              <ArrowDownLeft size={15} className="text-emerald-400" />
              <span>Tenho a Receber ({toReceiveDebts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('to_pay')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'to_pay'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 border border-transparent'
              }`}
            >
              <ArrowUpRight size={15} className="text-rose-400" />
              <span>Tenho a Pagar ({toPayDebts.length})</span>
            </button>
          </div>

          {/* Filter pill selector: Todos / Em aberto / Quitados */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-[var(--border)] text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-silver-brushed/20 text-silver-polished font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
              }`}
            >
              Todos ({currentList.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'open' ? 'bg-amber-500/20 text-amber-300 font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
              }`}
            >
              Em Aberto ({currentList.filter(d => d.status !== 'paid').length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
              }`}
            >
              Quitados ({currentList.filter(d => d.status === 'paid').length})
            </button>
          </div>
        </div>

        {/* Debt Cards List */}
        {filteredList.length === 0 ? (
          <div className="py-16 text-center bg-black/10 border border-white/5 rounded-[28px] p-8">
            <PlusCircle size={36} className="text-silver-brushed/20 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-silver-polished tracking-tight">
              Nenhuma obrigação encontrada nesta categoria
            </h4>
            <p className="text-xs text-silver-brushed/50 max-w-sm mx-auto mt-1 mb-6">
              {activeTab === 'to_receive'
                ? 'Registre valores que esta pessoa deve a você para acompanhar pagamentos e amortizações.'
                : 'Registre valores que você deve a esta pessoa para manter as contas em dia.'}
            </p>
            <button
              onClick={() => onAddDebt(person, activeTab)}
              className="px-6 py-2.5 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              + Adicionar Registro
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((debt) => {
              const isPaid = debt.status === 'paid'
              const isPartiallyPaid = debt.status === 'partially_paid'
              const isPending = debt.status === 'pending'
              const isOverdue = debt.is_overdue

              return (
                <div
                  key={debt.id}
                  className={`bg-[var(--surface)] border rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden ${
                    isPaid
                      ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                      : isOverdue
                      ? 'border-rose-500/30 bg-rose-500/[0.03]'
                      : 'border-[var(--border)] hover:border-silver-brushed/30'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-silver-polished tracking-tight">
                          {debt.description}
                        </h4>

                        {/* Status Badges */}
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={11} />
                            Quitado
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                            <Clock size={11} />
                            Parcialmente Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={11} />
                            Pendente
                          </span>
                        )}

                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertCircle size={11} />
                            Vencida
                          </span>
                        )}
                      </div>

                      {/* Dates and notes */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-silver-brushed/60">
                        {debt.due_date && (
                          <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-400 font-bold' : ''}`}>
                            <Calendar size={12} />
                            Vencimento: {format(new Date(debt.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {debt.created_at && (
                          <span className="text-silver-brushed/40 text-[11px]">
                            Criado em {format(new Date(debt.created_at), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {debt.notes && (
                          <span className="italic text-silver-brushed/70 block w-full mt-0.5 text-[11px]">
                            Obs: {debt.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Financial Values (Original, Paid, Remaining) */}
                    <div className="flex items-center gap-4 sm:gap-6 bg-black/20 p-3 rounded-2xl border border-white/5 shrink-0 justify-between sm:justify-start">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-black uppercase text-silver-brushed/40 block">Valor Original</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-silver-brushed/80">{formatMoney(debt.amount)}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-black uppercase text-emerald-400/70 block">Já Amortizado</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">{formatMoney(debt.total_paid || 0)}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-black uppercase text-amber-400/80 block">Saldo Restante</span>
                        <span className="text-sm sm:text-base font-black font-mono text-amber-400">{formatMoney(debt.remaining_amount || 0)}</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenPayment(debt)}
                        className={`py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                          isPaid
                            ? 'bg-silver-brushed/10 hover:bg-silver-brushed/20 text-silver-polished border border-silver-brushed/20'
                            : activeTab === 'to_receive'
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                            : 'bg-rose-500 hover:bg-rose-400 text-white'
                        }`}
                      >
                        <DollarSign size={14} />
                        <span>{isPaid ? 'Histórico' : 'Amortizar'}</span>
                      </button>

                      <button
                        onClick={() => onEditDebt(debt)}
                        className="p-2 text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                        title="Editar Obrigação"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(debt)}
                        disabled={deletingId === debt.id}
                        className="p-2 text-silver-brushed/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Excluir Obrigação"
                      >
                        <Trash2 size={15} className={deletingId === debt.id ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DialogShell>
  )
}
