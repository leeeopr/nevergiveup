'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Charge } from '@/types/cobranca'
import { Client } from '@/types/company'
import { cobrancasService } from '@/services/cobrancasService'
import { companyService } from '@/services/companyService'
import { generateExpectedOccurrences } from '@/utils/chargeUtils'
import { DialogShell } from '@/components/ui/DialogShell'
import { Calendar, User, FileText, DollarSign, CalendarDays, AlertCircle, CheckCircle2, Loader2, Sparkles, HandCoins, X } from 'lucide-react'

interface ChargeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  chargeToEdit?: Charge | null
  preselectedClient?: Client | null
  userId: string
}

export function ChargeFormModal({
  isOpen,
  onClose,
  onSuccess,
  chargeToEdit,
  preselectedClient,
  userId
}: ChargeFormModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [billingDay, setBillingDay] = useState<number>(10)
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load clients list for dropdown selection
  useEffect(() => {
    if (isOpen && userId) {
      companyService.getClients(userId)
        .then(setClients)
        .catch(err => console.warn('Error loading clients:', err))
    }
  }, [isOpen, userId])

  // Populate form defaults
  useEffect(() => {
    if (!isOpen) return

    if (chargeToEdit) {
      setSelectedClientId(chargeToEdit.client_id || '')
      setClientName(chargeToEdit.client_name || '')
      setDescription(chargeToEdit.description || '')
      setAmount(chargeToEdit.amount || '')
      setStartDate(chargeToEdit.start_date || '')
      setEndDate(chargeToEdit.end_date || '')
      setBillingDay(chargeToEdit.billing_day || 10)
      setNotes(chargeToEdit.notes || '')
    } else if (preselectedClient) {
      setSelectedClientId(preselectedClient.id)
      setClientName(preselectedClient.name)
      setDescription('Mensalidade / Servico')
      setAmount('')
      
      const now = new Date()
      const startStr = now.toISOString().split('T')[0]
      // Default end date 6 months from now
      const future = new Date(now)
      future.setMonth(future.getMonth() + 5)
      const endStr = future.toISOString().split('T')[0]

      setStartDate(startStr)
      setEndDate(endStr)
      setBillingDay(now.getDate())
      setNotes('')
    } else {
      setSelectedClientId('')
      setClientName('')
      setDescription('')
      setAmount('')

      const now = new Date()
      const startStr = now.toISOString().split('T')[0]
      const future = new Date(now)
      future.setMonth(future.getMonth() + 5)
      const endStr = future.toISOString().split('T')[0]

      setStartDate(startStr)
      setEndDate(endStr)
      setBillingDay(10)
      setNotes('')
    }

    setErrorMsg('')
  }, [isOpen, chargeToEdit, preselectedClient])

  // Handle client select change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    if (clientId) {
      const found = clients.find(c => c.id === clientId)
      if (found) setClientName(found.name)
    }
  }

  // Calculate preview occurrences in real-time
  const previewOccurrences = useMemo(() => {
    if (!startDate || !endDate || !billingDay || !amount || Number(amount) <= 0) return []
    return generateExpectedOccurrences(startDate, endDate, billingDay, Number(amount))
  }, [startDate, endDate, billingDay, amount])

  const totalValue = previewOccurrences.length * (Number(amount) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) {
      setErrorMsg('Por favor, informe o nome do cliente.')
      return
    }
    if (!description.trim()) {
      setErrorMsg('Por favor, informe a descrição da cobrança.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('O valor da cobrança deve ser maior que zero.')
      return
    }
    if (!startDate) {
      setErrorMsg('Informe a data inicial.')
      return
    }
    if (!endDate) {
      setErrorMsg('Informe a data final.')
      return
    }
    if (endDate < startDate) {
      setErrorMsg('A data final não pode ser anterior à data inicial.')
      return
    }
    if (!billingDay || billingDay < 1 || billingDay > 31) {
      setErrorMsg('O dia de cobrança deve estar entre 1 e 31.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')

      const payload = {
        client_id: selectedClientId || null,
        client_name: clientName.trim(),
        description: description.trim(),
        amount: Number(amount),
        start_date: startDate,
        end_date: endDate,
        billing_day: Number(billingDay),
        notes: notes.trim() || null
      }

      if (chargeToEdit) {
        await cobrancasService.updateCharge(chargeToEdit.id, payload)
      } else {
        await cobrancasService.createCharge(payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar cobrança.')
    } finally {
      setLoading(false)
    }
  }

  const header = (
    <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-2">
        <HandCoins className="text-emerald-400" size={20} />
        <h3 className="text-base font-black uppercase tracking-wide text-silver-polished">
          {chargeToEdit ? "Editar Configuração de Cobrança" : "Nova Cobrança Recorrente"}
        </h3>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-2 text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5 rounded-xl transition-all cursor-pointer"
      >
        <X size={18} />
      </button>
    </div>
  )

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      header={header}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Client Picker or Text Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
            <User size={12} className="text-silver-brushed" />
            Cliente *
          </label>

          {clients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3.5 py-2.5 text-xs text-silver-polished font-bold focus:border-silver-polished focus:outline-none"
              >
                <option value="">-- Selecionar da Lista --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Ou digite o nome do cliente..."
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value)
                  if (selectedClientId) setSelectedClientId('')
                }}
                className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3.5 py-2.5 text-xs text-silver-polished font-bold placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none"
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder="Nome do cliente (ex: João Silva)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3.5 py-2.5 text-xs text-silver-polished font-bold placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none"
            />
          )}
        </div>

        {/* Description & Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
              <FileText size={12} className="text-silver-brushed" />
              Descrição *
            </label>
            <input
              type="text"
              placeholder="Ex: Mensalidade, Horas de Consultoria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3.5 py-2.5 text-xs text-silver-polished font-bold placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
              <DollarSign size={12} className="text-emerald-400" />
              Valor por Ocorrência (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3.5 py-2.5 text-xs text-silver-polished font-black placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none"
            />
          </div>
        </div>

        {/* Period & Billing Day Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
              <Calendar size={12} className="text-silver-brushed" />
              Data Inicial *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3 py-2 text-xs text-silver-polished font-bold focus:border-silver-polished focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
              <Calendar size={12} className="text-silver-brushed" />
              Data Final *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3 py-2 text-xs text-silver-polished font-bold focus:border-silver-polished focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-amber-400" />
              Dia do Mês (1-31) *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="10"
              value={billingDay}
              onChange={(e) => setBillingDay(Number(e.target.value))}
              className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl px-3 py-2 text-xs text-silver-polished font-bold focus:border-silver-polished focus:outline-none text-center"
            />
          </div>
        </div>

        {/* Real-time Generated Occurrences Preview Box */}
        {previewOccurrences.length > 0 && (
          <div className="bg-velvet-deep/90 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={12} />
                Cronograma de Ocorrências Calculado
              </span>
              <span className="text-xs font-black text-silver-polished">
                {previewOccurrences.length} parcelas = R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
              {previewOccurrences.map((occ, idx) => {
                const [y, m, d] = occ.due_date.split('-')
                return (
                  <span 
                    key={idx}
                    className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  >
                    {d}/{m}/{y} • R$ {occ.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-silver-brushed/70">
            Observações Gerais
          </label>
          <textarea
            rows={2}
            placeholder="Informações adicionais, termos de contrato, chave PIX..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-velvet-deep/80 border border-silver-brushed/20 rounded-xl p-3 text-xs text-silver-polished font-medium placeholder:text-silver-brushed/40 focus:border-silver-polished focus:outline-none resize-none"
          />
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-silver-brushed hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-silver-brushed hover:bg-white text-velvet-deep rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>{chargeToEdit ? "Salvar Alterações" : "Criar Cobrança"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
