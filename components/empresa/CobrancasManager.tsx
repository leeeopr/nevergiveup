'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Charge } from '@/types/cobranca'
import { cobrancasService } from '@/services/cobrancasService'
import { ChargeCard } from './ChargeCard'
import { ChargeFormModal } from './ChargeFormModal'
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Loader2,
  Users
} from 'lucide-react'

interface CobrancasManagerProps {
  userId: string
}

export function CobrancasManager({ userId }: CobrancasManagerProps) {
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [chargeToEdit, setChargeToEdit] = useState<Charge | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await cobrancasService.getCharges()
      setCharges(data)
    } catch (err) {
      console.error('Error loading charges:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      loadData()
    })
  }, [loadData])

  const handleAddCharge = () => {
    setChargeToEdit(null)
    setIsModalOpen(true)
  }

  const handleEditCharge = (charge: Charge) => {
    setChargeToEdit(charge)
    setIsModalOpen(true)
  }

  const handleDeleteCharge = (chargeId: string) => {
    setCharges(prev => prev.filter(c => c.id !== chargeId))
  }

  // Calculate overall metrics
  const overallMetrics = useMemo(() => {
    let totalOccs = 0
    let paidOccs = 0
    let pendingOccs = 0
    let totalAmount = 0
    let totalReceived = 0
    let totalPending = 0

    charges.forEach(c => {
      (c.occurrences || []).forEach(o => {
        const amt = Number(o.amount) || 0
        totalOccs++
        totalAmount += amt
        if (o.status === 'paid') {
          paidOccs++
          totalReceived += amt
        } else {
          pendingOccs++
          totalPending += amt
        }
      })
    })

    return {
      totalCharges: charges.length,
      totalOccs,
      paidOccs,
      pendingOccs,
      totalAmount,
      totalReceived,
      totalPending,
      liquidationRate: totalAmount > 0 ? Math.round((totalReceived / totalAmount) * 100) : 0
    }
  }, [charges])

  // Filter charges by search term and status
  const filteredCharges = useMemo(() => {
    return charges.filter(c => {
      const matchesSearch = c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const occs = c.occurrences || []
      const hasPending = occs.some(o => o.status === 'pending')
      const isCompleted = occs.length > 0 && occs.every(o => o.status === 'paid')

      if (filterStatus === 'pending') return matchesSearch && hasPending
      if (filterStatus === 'completed') return matchesSearch && isCompleted
      return matchesSearch
    })
  }, [charges, searchTerm, filterStatus])

  return (
    <div className="space-y-6">
      {/* Executive Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-velvet-soft/40 border border-silver-brushed/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Controle por Usuário
            </span>
            <span className="text-[10px] font-black text-silver-brushed/50 uppercase tracking-wider">
              {overallMetrics.totalCharges} Contratos Ativos
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-silver-polished tracking-tight">
            Gestão de Cobranças Recorrentes
          </h2>
          <p className="text-xs text-silver-brushed/60 font-medium">
            Acompanhe ocorrências mensais, confirme recebimentos e consulte projeções financeiras.
          </p>
        </div>

        <button
          onClick={handleAddCharge}
          className="px-5 py-3 bg-silver-brushed hover:bg-white text-velvet-deep rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0"
        >
          <Plus size={16} />
          <span>Nova Cobrança</span>
        </button>
      </div>

      {/* Global Metrics Bento Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Valor Contratado */}
        <div className="bg-velvet-deep border border-silver-brushed/10 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-silver-brushed/40 uppercase tracking-wider block">
            Montante Total
          </span>
          <p className="text-base sm:text-lg font-black text-silver-polished tracking-tight">
            R$ {overallMetrics.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-silver-brushed/50 font-medium block">
            {overallMetrics.totalOccs} ocorrências geradas
          </span>
        </div>

        {/* Total Já Recebido */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-wider block">
            Total Recebido
          </span>
          <p className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
            R$ {overallMetrics.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-emerald-300/60 font-semibold block">
            {overallMetrics.paidOccs} parcelas pagas ({overallMetrics.liquidationRate}%)
          </span>
        </div>

        {/* Total Pendente */}
        <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-2xl space-y-1">
          <span className="text-[9px] font-black text-rose-400/80 uppercase tracking-wider block">
            Total Pendente
          </span>
          <p className="text-base sm:text-lg font-black text-rose-400 tracking-tight">
            R$ {overallMetrics.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-rose-300/60 font-semibold block">
            {overallMetrics.pendingOccs} parcelas a receber
          </span>
        </div>

        {/* Taxa de Liquidação */}
        <div className="bg-velvet-deep border border-silver-brushed/10 p-4 rounded-2xl space-y-1 flex flex-col justify-center">
          <span className="text-[9px] font-black text-silver-brushed/40 uppercase tracking-wider block">
            Taxa de Liquidação
          </span>
          <p className="text-base sm:text-lg font-black text-silver-polished tracking-tight">
            {overallMetrics.liquidationRate}%
          </p>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mt-1 border border-white/5">
            <div 
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${overallMetrics.liquidationRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-velvet-deep border border-silver-brushed/10 p-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" size={15} />
          <input
            type="text"
            placeholder="Buscar cobrança por cliente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-silver-polished font-bold placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-silver-brushed text-velvet-deep font-bold shadow-md'
                : 'bg-black/30 text-silver-brushed/60 hover:text-white border border-white/5'
            }`}
          >
            Todas ({charges.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'bg-black/30 text-silver-brushed/60 hover:text-white border border-white/5'
            }`}
          >
            Com Pendências
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'completed'
                ? 'bg-emerald-500 text-black font-bold shadow-md'
                : 'bg-black/30 text-silver-brushed/60 hover:text-white border border-white/5'
            }`}
          >
            Finalizadas
          </button>
        </div>
      </div>

      {/* Charges Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-silver-brushed/50">
          <Loader2 size={24} className="animate-spin text-silver-polished" />
          <span className="text-xs font-black uppercase tracking-wider">Carregando Cobranças...</span>
        </div>
      ) : filteredCharges.length === 0 ? (
        <div className="text-center py-16 bg-velvet-soft/20 border border-silver-brushed/10 rounded-3xl p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-silver-brushed/40">
            <DollarSign size={24} />
          </div>
          <h3 className="text-base font-black text-silver-polished">Nenhuma cobrança encontrada</h3>
          <p className="text-xs text-silver-brushed/50 max-w-sm mx-auto font-medium">
            {searchTerm 
              ? "Nenhum contrato corresponde aos termos da busca."
              : "Cadastre sua primeira cobrança recorrente para acompanhar ocorrências e recebimentos."}
          </p>
          {!searchTerm && (
            <button
              onClick={handleAddCharge}
              className="px-5 py-2.5 bg-silver-brushed text-velvet-deep font-black rounded-xl text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Cadastrar Cobrança</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCharges.map(charge => (
            <ChargeCard
              key={charge.id}
              charge={charge}
              onEdit={handleEditCharge}
              onDelete={handleDeleteCharge}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* Charge Form Modal */}
      <ChargeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        chargeToEdit={chargeToEdit}
        userId={userId}
      />
    </div>
  )
}
