'use client'

import React, { useState } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { PersonWithDebts, Debt, DebtDirection } from '@/types/personalDebts'
import { FinancialMovement } from '@/types/financial'
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
  Filter,
  HandCoins,
  Repeat,
  Tag,
  Loader2
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
  onOpenCreateCobranca?: (person: PersonWithDebts) => void
  onEditMovement?: (movement: FinancialMovement) => void
  onToggleMovementStatus?: (movement: FinancialMovement) => Promise<void>
  onDeleteMovement?: (movementId: string) => Promise<void>
}

export function PersonDetailModal({
  isOpen,
  onClose,
  person,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onOpenPayment,
  onOpenCreateCobranca,
  onEditMovement,
  onToggleMovementStatus,
  onDeleteMovement
}: PersonDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'to_receive' | 'to_pay' | 'cobrancas'>('to_receive')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [cobrancaFilter, setCobrancaFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingMovementId, setTogglingMovementId] = useState<string | null>(null)
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null)

  if (!person) return null

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const toReceiveDebts = person.debts.filter(d => d.type === 'to_receive')
  const toPayDebts = person.debts.filter(d => d.type === 'to_pay')
  const linkedMovements = person.linkedMovements || []

  const currentList = activeTab === 'to_receive' ? toReceiveDebts : toPayDebts
  const filteredList = currentList.filter(d => {
    if (statusFilter === 'open') return d.status !== 'paid'
    if (statusFilter === 'paid') return d.status === 'paid'
    return true
  })

  const filteredCobrancas = linkedMovements.filter(m => {
    if (cobrancaFilter === 'open') return !m.is_paid
    if (cobrancaFilter === 'paid') return Boolean(m.is_paid)
    return true
  })

  const totalCobrancas = linkedMovements.reduce((acc, m) => acc + Number(m.amount), 0)
  const paidCobrancas = linkedMovements.filter(m => m.is_paid).reduce((acc, m) => acc + Number(m.amount), 0)
  const pendingCobrancas = linkedMovements.filter(m => !m.is_paid).reduce((acc, m) => acc + Number(m.amount), 0)

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

  const handleToggleMovement = async (movement: FinancialMovement) => {
    if (!onToggleMovementStatus) return
    setTogglingMovementId(movement.id)
    try {
      await onToggleMovementStatus(movement)
    } finally {
      setTogglingMovementId(null)
    }
  }

  const handleDeleteMov = async (movement: FinancialMovement) => {
    if (!onDeleteMovement) return
    const confirmed = window.confirm(`Deseja excluir a cobrança "${movement.description}" (R$ ${Number(movement.amount).toFixed(2)}) do histórico financeiro?`)
    if (!confirmed) return

    setDeletingMovementId(movement.id)
    try {
      await onDeleteMovement(movement.id)
    } finally {
      setDeletingMovementId(null)
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
                  Painel individual de conciliação financeira & cobranças vinculadas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'cobrancas' ? (
                <button
                  onClick={() => onOpenCreateCobranca?.(person)}
                  className="py-2.5 px-4 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>+ Nova Cobrança</span>
                </button>
              ) : (
                <button
                  onClick={() => onAddDebt(person, activeTab)}
                  className="py-2.5 px-4 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>+ Nova Obrigação</span>
                </button>
              )}
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
        {/* Navigation Between the 3 Tabs: Tenho a Receber vs Tenho a Pagar vs Cobranças Vinculadas */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('to_receive')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'to_receive'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 border border-transparent'
              }`}
            >
              <ArrowDownLeft size={14} className="text-emerald-400" />
              <span>Tenho a Receber ({toReceiveDebts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('to_pay')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'to_pay'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 border border-transparent'
              }`}
            >
              <ArrowUpRight size={14} className="text-rose-400" />
              <span>Tenho a Pagar ({toPayDebts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cobrancas')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'cobrancas'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 shadow-sm'
                  : 'text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 border border-transparent'
              }`}
            >
              <HandCoins size={14} className="text-orange-400" />
              <span>Cobranças Vinculadas ({linkedMovements.length})</span>
            </button>
          </div>

          {/* Filter pill selector */}
          {activeTab === 'cobrancas' ? (
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-[var(--border)] text-[10px] font-bold uppercase tracking-wider">
              <button
                onClick={() => setCobrancaFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  cobrancaFilter === 'all' ? 'bg-orange-500/20 text-orange-300 font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
                }`}
              >
                Todas ({linkedMovements.length})
              </button>
              <button
                onClick={() => setCobrancaFilter('open')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  cobrancaFilter === 'open' ? 'bg-amber-500/20 text-amber-300 font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
                }`}
              >
                Pendentes ({linkedMovements.filter(m => !m.is_paid).length})
              </button>
              <button
                onClick={() => setCobrancaFilter('paid')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  cobrancaFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'text-silver-brushed/50 hover:text-silver-polished'
                }`}
              >
                Recebidas ({linkedMovements.filter(m => m.is_paid).length})
              </button>
            </div>
          ) : (
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
          )}
        </div>

        {/* Tab Content: Cobranças Vinculadas */}
        {activeTab === 'cobrancas' ? (
          <div className="space-y-4">
            {/* Context Notice - Explaining separation and avoiding double count */}
            <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-orange-200">
              <div className="flex items-center gap-2.5">
                <HandCoins size={18} className="text-orange-400 shrink-0" />
                <span>
                  Estas são as cobranças emitidas através do fluxo geral do Financeira Pro (botão central de ação) vinculadas a <strong>{person.name}</strong>. Elas impactam o fluxo de caixa geral e são mantidas separadas das dívidas manuais.
                </span>
              </div>
              {onOpenCreateCobranca && (
                <button
                  onClick={() => onOpenCreateCobranca(person)}
                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-black uppercase text-[10px] rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  + Emitir Cobrança
                </button>
              )}
            </div>

            {filteredCobrancas.length === 0 ? (
              <div className="py-16 text-center bg-black/10 border border-white/5 rounded-[28px] p-8">
                <HandCoins size={36} className="text-orange-400/40 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-silver-polished tracking-tight">
                  Nenhuma cobrança do fluxo geral vinculada
                </h4>
                <p className="text-xs text-silver-brushed/50 max-w-sm mx-auto mt-1 mb-6">
                  Você pode emitir cobranças vinculadas a {person.name} usando o botão de ação principal central ou o botão abaixo.
                </p>
                {onOpenCreateCobranca && (
                  <button
                    onClick={() => onOpenCreateCobranca(person)}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    + Emitir Nova Cobrança
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCobrancas.map((mov) => {
                  const isPaid = Boolean(mov.is_paid)
                  const isToggling = togglingMovementId === mov.id
                  const isDeleting = deletingMovementId === mov.id

                  return (
                    <div
                      key={mov.id}
                      className={`bg-[var(--surface)] border rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden ${
                        isPaid
                          ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                          : 'border-orange-500/30 bg-orange-500/[0.03]'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Info */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm sm:text-base font-black text-silver-polished tracking-tight">
                              {mov.description}
                            </h4>

                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 size={11} />
                                Recebido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-pulse">
                                <Clock size={11} />
                                Pendente
                              </span>
                            )}

                            {mov.tag && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-silver-brushed/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                #{mov.tag}
                              </span>
                            )}

                            {mov.is_recurring && (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-silver-brushed/60 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <Repeat size={9} />
                                {mov.recurrence_type || 'Recorrente'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-silver-brushed/60">
                            {mov.due_date && (
                              <span className="flex items-center gap-1 font-medium">
                                <Calendar size={12} />
                                Vencimento: {format(new Date(mov.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                              </span>
                            )}
                            {mov.date && (
                              <span className="text-silver-brushed/40 text-[11px]">
                                Data da Operação: {format(new Date(mov.date + 'T12:00:00'), 'dd/MM/yyyy')}
                              </span>
                            )}
                            {mov.paid_at && (
                              <span className="text-emerald-400/80 text-[11px] font-semibold">
                                Liquidado em {format(new Date(mov.paid_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5 shrink-0 justify-between sm:justify-start">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] font-black uppercase text-silver-brushed/40 block">Valor Nominal</span>
                            <span className={`text-base sm:text-lg font-black font-mono ${isPaid ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {formatMoney(Number(mov.amount))}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {onToggleMovementStatus && (
                            <button
                              onClick={() => handleToggleMovement(mov)}
                              disabled={isToggling}
                              className={`py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                                isPaid
                                  ? 'bg-silver-brushed/10 hover:bg-silver-brushed/20 text-silver-polished border border-silver-brushed/20'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                              }`}
                              title={isPaid ? 'Marcar como não recebido' : 'Marcar como recebido'}
                            >
                              {isToggling ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : isPaid ? (
                                <>
                                  <Clock size={13} />
                                  <span>Reabrir</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Receber</span>
                                </>
                              )}
                            </button>
                          )}

                          {onEditMovement && (
                            <button
                              onClick={() => onEditMovement(mov)}
                              className="p-2 text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                              title="Editar Cobrança no Fluxo Geral"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {onDeleteMovement && (
                            <button
                              onClick={() => handleDeleteMov(mov)}
                              disabled={isDeleting}
                              className="p-2 text-silver-brushed/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                              title="Excluir Cobrança"
                            >
                              <Trash2 size={15} className={isDeleting ? 'animate-spin' : ''} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Tab Content: Tenho a Receber / Tenho a Pagar */
          filteredList.length === 0 ? (
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
          )
        )}
      </div>
    </DialogShell>
  )
}
