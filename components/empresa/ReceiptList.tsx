'use client'

import React, { useState } from 'react'
import { Receipt, Client } from '@/types/company'
import { FileText, Search, Plus, Printer, Edit2, Trash2, XCircle, Calendar, Filter, DollarSign, CheckCircle2 } from 'lucide-react'

interface ReceiptListProps {
  receipts: Receipt[]
  clients: Client[]
  loading: boolean
  onAddReceipt: () => void
  onEditReceipt: (receipt: Receipt) => void
  onDeleteReceipt: (receiptId: string) => void
  onPrintReceipt: (receipt: Receipt) => void
  onToggleStatus: (receipt: Receipt) => void
}

export function ReceiptList({
  receipts,
  clients,
  loading,
  onAddReceipt,
  onEditReceipt,
  onDeleteReceipt,
  onPrintReceipt,
  onToggleStatus
}: ReceiptListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredReceipts = receipts.filter(r => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      r.client_name.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      (r.receipt_code && r.receipt_code.toLowerCase().includes(term)) ||
      (r.client_document && r.client_document.toLowerCase().includes(term))

    const matchesClient = selectedClientId === 'all' || r.client_id === selectedClientId
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter

    return matchesSearch && matchesClient && matchesStatus
  })

  // Calculate totals
  const totalIssued = filteredReceipts
    .filter(r => r.status === 'issued')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-velvet-soft/40 border border-silver-brushed/10 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
            <input
              type="text"
              placeholder="Buscar por cliente, recibo ou descrição..."
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

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-silver-polished">Todos os Status</option>
              <option value="issued" className="bg-zinc-900 text-silver-polished">Emitidos</option>
              <option value="cancelled" className="bg-zinc-900 text-silver-polished">Cancelados</option>
            </select>
          </div>
        </div>

        <button
          onClick={onAddReceipt}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Emitir Novo Recibo</span>
        </button>
      </div>

      {/* Totalizer Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <DollarSign className="text-emerald-400" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">
              Total em Recibos Emitidos (Filtro Atual)
            </span>
            <p className="text-xl font-black text-emerald-400 font-mono tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIssued)}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-silver-brushed/50 font-mono">
          {filteredReceipts.length} recibos
        </span>
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
            Não existem recibos emitidos para os filtros selecionados.
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-black text-silver-brushed/60 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                        {receipt.receipt_code || 'REC'}
                      </span>
                      <h4 className="text-sm font-bold text-silver-polished truncate">
                        {receipt.client_name}
                      </h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isIssued 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {isIssued ? 'Emitido' : 'Cancelado'}
                      </span>
                    </div>

                    <p className="text-xs text-silver-brushed/80 font-medium mt-1 line-clamp-1">
                      {receipt.description}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-silver-brushed/50 font-medium mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar size={11} className="text-silver-brushed/40" />
                        {formattedDate}
                      </span>
                      <span>•</span>
                      <span>Forma: {receipt.payment_method}</span>
                    </div>
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-silver-brushed/40 block">
                      Valor
                    </span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receipt.amount)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPrintReceipt(receipt)}
                      className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
