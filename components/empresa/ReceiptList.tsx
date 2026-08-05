'use client'

import React, { useState } from 'react'
import { Receipt, Client } from '@/types/company'
import { companyService } from '@/services/companyService'
import { useAuth } from '@/context/AuthContext'
import { 
  FileText, 
  Search, 
  Plus, 
  Printer, 
  Edit2, 
  Trash2, 
  XCircle, 
  Calendar, 
  Filter, 
  DollarSign, 
  CheckCircle2,
  SendHorizontal,
  CheckCheck,
  Repeat,
  Loader2
} from 'lucide-react'

interface ReceiptListProps {
  receipts: Receipt[]
  clients: Client[]
  loading: boolean
  onAddReceipt: () => void
  onEditReceipt: (receipt: Receipt) => void
  onDeleteReceipt: (receiptId: string) => void
  onPrintReceipt: (receipt: Receipt) => void
  onToggleStatus: (receipt: Receipt) => void
  onRefresh?: () => void
}

export function ReceiptList({
  receipts,
  clients,
  loading,
  onAddReceipt,
  onEditReceipt,
  onDeleteReceipt,
  onPrintReceipt,
  onToggleStatus,
  onRefresh
}: ReceiptListProps) {
  const { profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sentFilter, setSentFilter] = useState<string>('all')
  const [competenceFilter, setCompetenceFilter] = useState<string>('all')
  const [togglingSentId, setTogglingSentId] = useState<string | null>(null)

  // Extract unique reference months for competence filter dropdown
  const uniqueMonths: string[] = Array.from(
    new Set(receipts.map(r => r.reference_month).filter((m): m is string => Boolean(m)))
  ).sort().reverse()

  const userEmailOrName = profile?.full_name || profile?.email || 'Usuário'

  const filteredReceipts = receipts.filter(r => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      r.client_name.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      (r.receipt_code && r.receipt_code.toLowerCase().includes(term)) ||
      (r.client_document && r.client_document.toLowerCase().includes(term))

    const matchesClient = selectedClientId === 'all' || r.client_id === selectedClientId
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter

    const matchesSent = 
      sentFilter === 'all' || 
      (sentFilter === 'sent' && r.receipt_sent === true) || 
      (sentFilter === 'unsent' && !r.receipt_sent)

    const matchesCompetence = competenceFilter === 'all' || r.reference_month === competenceFilter

    return matchesSearch && matchesClient && matchesStatus && matchesSent && matchesCompetence
  })

  // Calculate totals for issued receipts in current view
  const issuedList = filteredReceipts.filter(r => r.status === 'issued')
  const totalIssued = issuedList.reduce((sum, r) => sum + r.amount, 0)

  const pendingSentList = issuedList.filter(r => !r.receipt_sent)
  const totalPendingSent = pendingSentList.reduce((sum, r) => sum + r.amount, 0)

  const sentList = issuedList.filter(r => r.receipt_sent === true)
  const totalSent = sentList.reduce((sum, r) => sum + r.amount, 0)

  const handleToggleSent = async (receipt: Receipt) => {
    try {
      setTogglingSentId(receipt.id)
      const nextSent = !receipt.receipt_sent
      const now = new Date().toISOString()
      
      await companyService.updateReceipt(receipt.user_id, receipt.id, {
        receipt_sent: nextSent,
        receipt_sent_at: nextSent ? now : null,
        receipt_sent_by: nextSent ? userEmailOrName : null
      })

      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Error toggling receipt sent status:', err)
    } finally {
      setTogglingSentId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col gap-4 bg-velvet-soft/40 border border-silver-brushed/10 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <h3 className="text-sm font-black uppercase tracking-wider text-silver-polished flex items-center gap-2">
            <Filter size={16} className="text-emerald-400" />
            <span>Filtros & Busca de Recibos</span>
          </h3>

          <button
            onClick={onAddReceipt}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Emitir Novo Recibo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
            <input
              type="text"
              placeholder="Buscar recibo, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* Client Filter */}
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-silver-polished">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-silver-polished">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Competence Filter */}
          <div className="relative">
            <select
              value={competenceFilter}
              onChange={(e) => setCompetenceFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-silver-polished">Todas as Competências</option>
              {uniqueMonths.map(m => {
                const [y, mNum] = (m || '').split('-')
                return (
                  <option key={m} value={m} className="bg-zinc-900 text-silver-polished">
                    Competência {mNum}/{y}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Sent Filter */}
          <div className="relative">
            <select
              value={sentFilter}
              onChange={(e) => setSentFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-silver-polished">Envio: Todos</option>
              <option value="unsent" className="bg-zinc-900 text-silver-polished">Pendentes de Envio</option>
              <option value="sent" className="bg-zinc-900 text-silver-polished">Enviados</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-silver-polished">Status: Todos</option>
              <option value="issued" className="bg-zinc-900 text-silver-polished">Emitidos</option>
              <option value="cancelled" className="bg-zinc-900 text-silver-polished">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totalizer Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Emitidos */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="text-emerald-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80 block">
                Total Emitidos
              </span>
              <p className="text-lg font-black text-emerald-400 font-mono tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIssued)}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-silver-brushed/50 font-mono">
            {issuedList.length} recibos
          </span>
        </div>

        {/* Pendentes de Envio */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <SendHorizontal className="text-amber-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/80 block">
                Pendentes de Envio
              </span>
              <p className="text-lg font-black text-amber-400 font-mono tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingSent)}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-silver-brushed/50 font-mono">
            {pendingSentList.length} pendentes
          </span>
        </div>

        {/* Enviados ao Cliente */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
              <CheckCheck className="text-blue-400" size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400/80 block">
                Enviados ao Cliente
              </span>
              <p className="text-lg font-black text-blue-400 font-mono tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSent)}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-silver-brushed/50 font-mono">
            {sentList.length} enviados
          </span>
        </div>
      </div>

      {/* Receipts Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-velvet-soft/20 border border-white/5 rounded-2xl animate-pulse p-4" />
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="py-16 text-center bg-velvet-soft/20 border border-silver-brushed/5 rounded-3xl p-8">
          <FileText size={40} className="text-silver-brushed/20 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-silver-polished uppercase tracking-wide mb-1">
            Nenhum recibo encontrado
          </h4>
          <p className="text-xs text-silver-brushed/40 max-w-xs mx-auto mb-6">
            Não existem recibos para os filtros selecionados.
          </p>
          <button
            onClick={onAddReceipt}
            className="px-6 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Emitir Primeiro Recibo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map(receipt => {
            const isIssued = receipt.status === 'issued'
            const formattedDate = new Date(receipt.issue_date + 'T00:00:00').toLocaleDateString('pt-BR')
            const isToggling = togglingSentId === receipt.id

            let refMonthFormatted = null
            if (receipt.reference_month) {
              const [rY, rM] = receipt.reference_month.split('-')
              refMonthFormatted = `${rM}/${rY}`
            }

            return (
              <div
                key={receipt.id}
                className={`bg-velvet-soft/60 border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-velvet-soft/90 ${
                  isIssued ? 'border-silver-brushed/10' : 'border-rose-500/20 opacity-60'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isIssued 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-black text-silver-brushed/60 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                        {receipt.receipt_code || 'REC'}
                      </span>
                      <h4 className="text-sm font-bold text-silver-polished truncate">
                        {receipt.client_name}
                      </h4>

                      {receipt.charge_id && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <Repeat size={10} />
                          <span>Cobrança Recorrente {refMonthFormatted ? `(Ref: ${refMonthFormatted})` : ''}</span>
                        </span>
                      )}

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isIssued 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {isIssued ? 'Emitido' : 'Cancelado'}
                      </span>
                    </div>

                    <p className="text-xs text-silver-brushed/80 font-medium line-clamp-1">
                      {receipt.description}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-silver-brushed/50 font-medium flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar size={11} className="text-silver-brushed/40" />
                        Emissão / Pagamento: {formattedDate}
                      </span>
                      <span>•</span>
                      <span>Forma: {receipt.payment_method}</span>
                      
                      {receipt.receipt_sent ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCheck size={11} />
                            Enviado ao cliente
                          </span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span className="text-amber-400/80 font-medium flex items-center gap-1">
                            <SendHorizontal size={11} />
                            Pendente de envio
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-silver-brushed/40 block">
                      Valor
                    </span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleToggleSent(receipt)}
                      disabled={isToggling}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1 ${
                        receipt.receipt_sent
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                      }`}
                      title={receipt.receipt_sent ? 'Marcar como não enviado' : 'Marcar como enviado'}
                    >
                      {isToggling ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : receipt.receipt_sent ? (
                        <>
                          <SendHorizontal size={12} />
                          <span className="hidden lg:inline">Não Enviado</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck size={12} />
                          <span className="hidden lg:inline">Marcar Enviado</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onPrintReceipt(receipt)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Visualizar e Imprimir Recibo"
                    >
                      <Printer size={14} />
                      <span className="hidden md:inline">Ver Recibo</span>
                    </button>

                    <button
                      onClick={() => onEditReceipt(receipt)}
                      className="p-2 text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      title="Editar Recibo"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => onToggleStatus(receipt)}
                      className="p-2 text-silver-brushed/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
                      title={isIssued ? 'Cancelar Recibo' : 'Reativar Recibo'}
                    >
                      {isIssued ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                    </button>

                    <button
                      onClick={() => onDeleteReceipt(receipt.id)}
                      className="p-2 text-silver-brushed/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Excluir Recibo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

