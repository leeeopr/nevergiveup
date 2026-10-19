'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { personalDebtsService } from '@/services/personalDebtsService'
import { PersonWithDebts, Debt, DebtDirection, GlobalDebtsMetrics } from '@/types/personalDebts'
import { FinancialMovement } from '@/types/financial'
import { financialService } from '@/services/financialService'
import { PersonCard } from './PersonCard'
import { PersonFormModal } from './PersonFormModal'
import { DebtFormModal } from './DebtFormModal'
import { PaymentModal } from './PaymentModal'
import { PersonDetailModal } from './PersonDetailModal'
import { MovementForm } from '@/components/metrics/MovementForm'
import { EditMovementSheet } from '@/components/metrics/EditMovementSheet'
import { DialogShell } from '@/components/ui/DialogShell'
import { 
  Users, 
  PlusCircle, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  RefreshCw,
  Clock,
  HandCoins,
  X,
  Sparkles,
  Loader2
} from 'lucide-react'

interface CobrancasTabProps {
  onMovementCreated?: () => void
}

export function CobrancasTab({ onMovementCreated }: CobrancasTabProps) {
  const [persons, setPersons] = useState<PersonWithDebts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'all' | 'to_receive' | 'to_pay' | 'settled'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'overdue' | 'settled'>('all')

  // Modals state
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonWithDebts | null>(null)

  const [selectedPerson, setSelectedPerson] = useState<PersonWithDebts | null>(null)

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false)
  const [debtModalPerson, setDebtModalPerson] = useState<PersonWithDebts | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentModalDebt, setPaymentModalDebt] = useState<Debt | null>(null)
  const [paymentModalPersonName, setPaymentModalPersonName] = useState('')

  // Linked Cobranças State
  const [isCreateCobrancaOpen, setIsCreateCobrancaOpen] = useState(false)
  const [createCobrancaPerson, setCreateCobrancaPerson] = useState<PersonWithDebts | null>(null)
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null)
  const [savingCobranca, setSavingCobranca] = useState(false)

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await personalDebtsService.getPersonsWithDebts()
      setPersons(data)

      // Refresh currently selected person if open in details
      if (selectedPerson) {
        const found = data.find(p => p.id === selectedPerson.id)
        if (found) {
          setSelectedPerson(found)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar registros de cobranças.')
    } finally {
      setLoading(false)
    }
  }, [selectedPerson])

  useEffect(() => {
    loadData()
  }, [])

  // Calculate Global Metrics
  const metrics: GlobalDebtsMetrics = useMemo(() => {
    return personalDebtsService.calculateGlobalMetrics(persons)
  }, [persons])

  // Filter persons list
  const filteredPersons = useMemo(() => {
    return persons.filter(person => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = person.name.toLowerCase().includes(q)
        const matchesPhone = person.phone?.toLowerCase().includes(q)
        const matchesDebts = person.debts.some(d => d.description.toLowerCase().includes(q))
        if (!matchesName && !matchesPhone && !matchesDebts) return false
      }

      // Direction Filter
      if (directionFilter === 'to_receive' && person.totalToReceive <= 0.009) return false
      if (directionFilter === 'to_pay' && person.totalToPay <= 0.009) return false
      if (directionFilter === 'settled' && !person.isSettled) return false

      // Status Filter
      if (statusFilter === 'open' && person.pendingCount === 0) return false
      if (statusFilter === 'overdue' && !person.hasOverdue) return false
      if (statusFilter === 'settled' && !person.isSettled) return false

      return true
    })
  }, [persons, searchQuery, directionFilter, statusFilter])

  // Person Handlers
  const handleSavePerson = async (payload: { name: string; phone?: string; notes?: string }) => {
    if (editingPerson) {
      await personalDebtsService.updatePerson(editingPerson.id, payload)
    } else {
      await personalDebtsService.createPerson(payload)
    }
    await loadData()
  }

  const handleDeletePerson = async (person: PersonWithDebts) => {
    const hasPending = person.pendingCount > 0
    const msg = hasPending
      ? `Atenção: "${person.name}" possui ${person.pendingCount} pendência(s) financeira(s) em aberto. Deseja realmente excluir esta pessoa e todo seu histórico de cobranças?`
      : `Deseja realmente excluir "${person.name}" do sistema de cobranças?`

    if (!window.confirm(msg)) return

    try {
      await personalDebtsService.deletePerson(person.id)
      if (selectedPerson?.id === person.id) {
        setSelectedPerson(null)
      }
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir pessoa.')
    }
  }

  // Debt Handlers
  const handleOpenAddDebt = (person: PersonWithDebts, defaultType?: DebtDirection) => {
    setDebtModalPerson(person)
    setEditingDebt(null)
    setIsDebtModalOpen(true)
  }

  const handleOpenEditDebt = (debt: Debt) => {
    const parentPerson = persons.find(p => p.id === debt.person_id)
    setDebtModalPerson(parentPerson || null)
    setEditingDebt(debt)
    setIsDebtModalOpen(true)
  }

  const handleSaveDebt = async (payload: {
    person_id: string
    type: DebtDirection
    description: string
    amount: number
    due_date?: string | null
    notes?: string | null
  }) => {
    if (editingDebt) {
      await personalDebtsService.updateDebt(editingDebt.id, payload)
    } else {
      await personalDebtsService.createDebt(payload)
    }
    await loadData()
  }

  const handleDeleteDebt = async (debtId: string) => {
    await personalDebtsService.deleteDebt(debtId)
    await loadData()
    if (onMovementCreated) onMovementCreated()
  }

  // Payment Handlers
  const handleOpenPayment = (debt: Debt) => {
    const parentPerson = persons.find(p => p.id === debt.person_id)
    setPaymentModalDebt(debt)
    setPaymentModalPersonName(parentPerson?.name || 'Pessoa')
    setIsPaymentModalOpen(true)
  }

  const handleRegisterPayment = async (payload: {
    debt_id: string
    person_name: string
    debt_description: string
    debt_type: 'to_receive' | 'to_pay'
    amount: number
    payment_date: string
    notes?: string
    syncFinancialMovement: boolean
  }) => {
    await personalDebtsService.registerPayment(payload)
    await loadData()
    if (payload.syncFinancialMovement && onMovementCreated) {
      onMovementCreated()
    }
  }

  const handleDeletePayment = async (paymentId: string, debtId: string) => {
    await personalDebtsService.deletePayment(paymentId, debtId)
    await loadData()
    if (onMovementCreated) onMovementCreated()
  }

  // Linked Cobranças (Fluxo Geral) Handlers
  const handleOpenCreateCobranca = (person: PersonWithDebts) => {
    setCreateCobrancaPerson(person)
    setIsCreateCobrancaOpen(true)
  }

  const handleToggleMovementStatus = async (mov: FinancialMovement) => {
    const nextPaid = !mov.is_paid
    await financialService.updateMovement(mov.id, {
      ...mov,
      is_paid: nextPaid,
      paid_at: nextPaid ? new Date().toISOString() : undefined
    })
    await loadData()
    if (onMovementCreated) onMovementCreated()
  }

  const handleDeleteMovement = async (movementId: string) => {
    await financialService.deleteMovement(movementId)
    await loadData()
    if (onMovementCreated) onMovementCreated()
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const isNetPositive = metrics.netBalance > 0.009
  const isNetNegative = metrics.netBalance < -0.009

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Top Executive Summary Bento Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber */}
        <div className="bg-[var(--surface)] border border-emerald-500/20 rounded-[24px] p-5 shadow-lg backdrop-blur-xl relative overflow-hidden text-left group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ArrowDownLeft size={14} />
              Total a Receber
            </span>
            <span className="text-[10px] font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Ativo
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight font-mono">
            {formatMoney(metrics.totalToReceive)}
          </p>
          <p className="text-[11px] text-silver-brushed/50 mt-1 font-medium">
            Saldo devedor de terceiros a você
          </p>
        </div>

        {/* Total a Pagar */}
        <div className="bg-[var(--surface)] border border-rose-500/20 rounded-[24px] p-5 shadow-lg backdrop-blur-xl relative overflow-hidden text-left group hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ArrowUpRight size={14} />
              Total a Pagar
            </span>
            <span className="text-[10px] font-bold text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Passivo
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight font-mono">
            {formatMoney(metrics.totalToPay)}
          </p>
          <p className="text-[11px] text-silver-brushed/50 mt-1 font-medium">
            Suas obrigações pendentes com terceiros
          </p>
        </div>

        {/* Saldo Líquido Geral */}
        <div className={`border rounded-[24px] p-5 shadow-lg backdrop-blur-xl relative overflow-hidden text-left group transition-colors ${
          isNetPositive 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : isNetNegative 
            ? 'bg-rose-500/10 border-rose-500/30' 
            : 'bg-[var(--surface)] border-[var(--border)]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={14} />
              Saldo Líquido Geral
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
              isNetPositive 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : isNetNegative 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                : 'bg-white/10 text-silver-brushed border-white/10'
            }`}>
              {isNetPositive ? 'Favorável' : isNetNegative ? 'Desfavorável' : 'Quites'}
            </span>
          </div>
          <p className={`text-xl sm:text-2xl font-black tracking-tight font-mono ${
            isNetPositive ? 'text-emerald-300' : isNetNegative ? 'text-rose-300' : 'text-silver-polished'
          }`}>
            {isNetPositive ? `+ ${formatMoney(metrics.netBalance)}` : formatMoney(metrics.netBalance)}
          </p>
          <p className="text-[11px] text-silver-brushed/60 mt-1 font-medium">
            Diferença líquida de todas as pessoas
          </p>
        </div>

        {/* Valores Vencidos & Pendências */}
        <div className={`bg-[var(--surface)] border rounded-[24px] p-5 shadow-lg backdrop-blur-xl relative overflow-hidden text-left group transition-colors ${
          metrics.overdueCount > 0 ? 'border-amber-500/30' : 'border-[var(--border)]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={14} />
              Vencidos & Atrasos
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              metrics.overdueCount > 0 
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-black' 
                : 'bg-white/5 text-silver-brushed/60 border-white/5'
            }`}>
              {metrics.overdueCount} atrasada{metrics.overdueCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight font-mono">
            {formatMoney(metrics.overdueAmount)}
          </p>
          <p className="text-[11px] text-silver-brushed/50 mt-1 font-medium">
            {metrics.pendingCount} obrigação(ões) em aberto no total
          </p>
        </div>
      </div>

      {/* 2. Control Toolbar: Search, Filters, and New Person Action */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] p-4 sm:p-6 shadow-xl backdrop-blur-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou descrição da dívida..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-xs sm:text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="px-3.5 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-xs font-bold text-silver-polished focus:outline-none focus:border-silver-brushed cursor-pointer"
          >
            <option value="all" className="bg-zinc-900">Todas as Pessoas</option>
            <option value="to_receive" className="bg-zinc-900">Tem a Receber (+)</option>
            <option value="to_pay" className="bg-zinc-900">Tem a Pagar (-)</option>
            <option value="settled" className="bg-zinc-900">Totalmente Quites</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-xs font-bold text-silver-polished focus:outline-none focus:border-silver-brushed cursor-pointer"
          >
            <option value="all" className="bg-zinc-900">Todos os Status</option>
            <option value="open" className="bg-zinc-900">Com Pendências</option>
            <option value="overdue" className="bg-zinc-900">Com Vencidos</option>
            <option value="settled" className="bg-zinc-900">Quitados</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-2xl transition-all cursor-pointer active:scale-95 shrink-0"
            title="Recarregar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : ''} />
          </button>

          {/* New Person Primary Button */}
          <button
            onClick={() => {
              setEditingPerson(null)
              setIsPersonModalOpen(true)
            }}
            className="py-3 px-5 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 cursor-pointer shrink-0"
          >
            <PlusCircle size={16} />
            <span>Adicionar Pessoa</span>
          </button>
        </div>
      </div>

      {/* 3. Persons Grid View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-white/5 rounded" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 h-16 bg-white/5 rounded-2xl" />
              <div className="h-10 bg-white/5 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filteredPersons.length === 0 ? (
        <div className="py-20 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[36px] p-8 shadow-xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-3xl bg-silver-brushed/10 border border-silver-brushed/20 flex items-center justify-center mx-auto mb-4 text-silver-brushed/60">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-black text-silver-polished tracking-tight">
            Nenhuma pessoa encontrada
          </h3>
          <p className="text-xs text-silver-brushed/50 max-w-sm mx-auto mt-1.5 mb-6 leading-relaxed font-medium">
            {searchQuery.trim() || directionFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca para visualizar os registros.'
              : 'Cadastre amigos, familiares ou parceiros para registrar obrigações a receber e a pagar individualmente.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setDirectionFilter('all')
              setStatusFilter('all')
              setEditingPerson(null)
              setIsPersonModalOpen(true)
            }}
            className="px-6 py-3 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>Cadastrar Primeira Pessoa</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPersons.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onSelect={(p) => setSelectedPerson(p)}
              onAddDebt={(p) => handleOpenAddDebt(p)}
              onEdit={(p) => {
                setEditingPerson(p)
                setIsPersonModalOpen(true)
              }}
              onDelete={handleDeletePerson}
            />
          ))}
        </div>
      )}

      {/* 4. Modals */}
      {/* Create / Edit Person */}
      <PersonFormModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        initialData={editingPerson}
        onSave={handleSavePerson}
      />

      {/* Person Detail View Modal */}
      <PersonDetailModal
        isOpen={Boolean(selectedPerson)}
        onClose={() => setSelectedPerson(null)}
        person={selectedPerson}
        onAddDebt={(p, defType) => handleOpenAddDebt(p, defType)}
        onEditDebt={handleOpenEditDebt}
        onDeleteDebt={handleDeleteDebt}
        onOpenPayment={handleOpenPayment}
        onOpenCreateCobranca={handleOpenCreateCobranca}
        onEditMovement={(mov) => setEditingMovement(mov)}
        onToggleMovementStatus={handleToggleMovementStatus}
        onDeleteMovement={handleDeleteMovement}
      />

      {/* Create / Edit Debt Modal */}
      <DebtFormModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        person={debtModalPerson}
        initialDebt={editingDebt}
        onSave={handleSaveDebt}
      />

      {/* Payment / Amortization Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        debt={paymentModalDebt}
        personName={paymentModalPersonName}
        onRegisterPayment={handleRegisterPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* Edit Movement Sheet for Linked Cobranças */}
      <EditMovementSheet
        movement={editingMovement}
        onClose={() => setEditingMovement(null)}
        onSuccess={async () => {
          setEditingMovement(null)
          await loadData()
          if (onMovementCreated) onMovementCreated()
        }}
      />

      {/* Direct Create Cobrança for Specific Person Modal */}
      <DialogShell
        isOpen={isCreateCobrancaOpen}
        onClose={() => setIsCreateCobrancaOpen(false)}
        header={
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-0.5 mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--orange)] mb-1">Fluxo Geral de Cobrança</p>
              <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tighter">
                Emitir Cobrança para {createCobrancaPerson?.name}
              </h3>
            </div>
            <button
              onClick={() => setIsCreateCobrancaOpen(false)}
              className="p-3 bg-[var(--surface-accent)]/45 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all border border-[var(--border)] mt-2 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        }
        footer={
          <div className="flex gap-4 pt-6 border-t border-[var(--border)] bg-[var(--surface)]">
            <button
              type="button"
              onClick={() => setIsCreateCobrancaOpen(false)}
              className="flex-1 py-4 px-6 rounded-xl border border-[var(--border)] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--surface-accent)]/40 transition-all active:scale-95 bg-[var(--surface)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              form="person-create-cobranca-form"
              type="submit"
              disabled={savingCobranca}
              className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-white font-black uppercase tracking-[0.22em] text-[10px] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
            >
              {savingCobranca ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-60" /> Registrar Cobrança</>}
            </button>
          </div>
        }
      >
        <div className="px-0 sm:px-2">
          <MovementForm
            formId="person-create-cobranca-form"
            hideFooter={true}
            onLoadingChange={setSavingCobranca}
            type="cobranca"
            initialData={{
              debt_person_id: createCobrancaPerson?.id,
              debtor_name: createCobrancaPerson?.name,
              tag: 'Cobrança'
            }}
            onCancel={() => setIsCreateCobrancaOpen(false)}
            onSuccess={async () => {
              setIsCreateCobrancaOpen(false)
              await loadData()
              if (onMovementCreated) onMovementCreated()
            }}
          />
        </div>
      </DialogShell>
    </div>
  )
}
