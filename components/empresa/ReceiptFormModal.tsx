'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { Client, Receipt, PaymentMethod } from '@/types/company'
import { companyService } from '@/services/companyService'
import { financialService } from '@/services/financialService'
import { useAuth } from '@/context/AuthContext'
import { FileText, User, DollarSign, Calendar, CreditCard, Check, Loader2, ArrowRight } from 'lucide-react'

interface ReceiptFormModalProps {
  isOpen: boolean
  onClose: () => void
  receiptToEdit?: Receipt | null
  clients: Client[]
  preselectedClient?: Client | null
  onSaved: () => void
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'PIX',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
  'Boleto',
  'Outro'
]

function getMonthStartAndEnd(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const year = d.getFullYear()
  const month = d.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  
  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return {
    start: formatDate(start),
    end: formatDate(end)
  }
}

export function ReceiptFormModal({
  isOpen,
  onClose,
  receiptToEdit,
  clients,
  preselectedClient,
  onSaved
}: ReceiptFormModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [createFinancialMovement, setCreateFinancialMovement] = useState<boolean>(true)
  const [saveAsNewClient, setSaveAsNewClient] = useState<boolean>(true)

  const defaultDates = getMonthStartAndEnd()

  const [formData, setFormData] = useState<Partial<Receipt>>({
    client_name: '',
    client_document: '',
    client_email: '',
    client_phone: '',
    description: 'Desenvolvimento de Software para Sistema Interno',
    amount: 0,
    issue_date: new Date().toISOString().split('T')[0],
    service_start_date: defaultDates.start,
    service_end_date: defaultDates.end,
    payment_method: 'PIX',
    status: 'issued',
    notes: ''
  })

  useEffect(() => {
    const dates = getMonthStartAndEnd()
    if (receiptToEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClientId(receiptToEdit.client_id || '')
      setFormData({
        client_name: receiptToEdit.client_name || '',
        client_document: receiptToEdit.client_document || '',
        client_email: receiptToEdit.client_email || '',
        client_phone: receiptToEdit.client_phone || '',
        description: receiptToEdit.description || 'Desenvolvimento de Software para Sistema Interno',
        amount: receiptToEdit.amount || 0,
        issue_date: receiptToEdit.issue_date || new Date().toISOString().split('T')[0],
        service_start_date: receiptToEdit.service_start_date || dates.start,
        service_end_date: receiptToEdit.service_end_date || dates.end,
        payment_method: receiptToEdit.payment_method || 'PIX',
        status: receiptToEdit.status || 'issued',
        notes: receiptToEdit.notes || ''
      })
      setCreateFinancialMovement(false)
    } else if (preselectedClient) {
      setSelectedClientId(preselectedClient.id)
      setFormData({
        client_id: preselectedClient.id,
        client_name: preselectedClient.name,
        client_document: preselectedClient.document || '',
        client_email: preselectedClient.email || '',
        client_phone: preselectedClient.phone || '',
        description: 'Desenvolvimento de Software para Sistema Interno',
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        service_start_date: dates.start,
        service_end_date: dates.end,
        payment_method: 'PIX',
        status: 'issued',
        notes: ''
      })
      setCreateFinancialMovement(true)
    } else {
      setSelectedClientId('')
      setFormData({
        client_name: '',
        client_document: '',
        client_email: '',
        client_phone: '',
        description: 'Desenvolvimento de Software para Sistema Interno',
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        service_start_date: dates.start,
        service_end_date: dates.end,
        payment_method: 'PIX',
        status: 'issued',
        notes: ''
      })
      setCreateFinancialMovement(true)
    }
    setError(null)
  }, [receiptToEdit, preselectedClient, isOpen])

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    if (!clientId) return

    const client = clients.find(c => c.id === clientId)
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: client.id,
        client_name: client.name,
        client_document: client.document || '',
        client_email: client.email || '',
        client_phone: client.phone || ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.client_name?.trim()) {
      setError('Por favor, informe o nome do cliente.')
      return
    }

    if (!formData.description?.trim()) {
      setError('Por favor, informe a descrição do serviço ou produto.')
      return
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Por favor, informe um valor maior que zero.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let finalClientId = selectedClientId || null

      // Auto-register client if manually entered and checkbox checked
      if (!finalClientId && saveAsNewClient && formData.client_name?.trim() && !receiptToEdit) {
        try {
          const newClient = await companyService.createClient(user.id, {
            name: formData.client_name,
            document: formData.client_document || null,
            email: formData.client_email || null,
            phone: formData.client_phone || null
          })
          if (newClient?.id) {
            finalClientId = newClient.id
          }
        } catch (clientErr: any) {
          console.warn('Could not auto-register client from receipt modal:', clientErr)
        }
      }

      let movementId: string | null = null

      // Optional integration with financial movements
      if (createFinancialMovement && !receiptToEdit) {
        try {
          const newMovement = await financialService.insertMovement({
            type: 'entrada',
            amount: formData.amount || 0,
            description: `Recibo: ${formData.description} (${formData.client_name})`,
            date: formData.issue_date || new Date().toISOString().split('T')[0],
            tag: 'Serviços',
            is_recurring: false
          })
          movementId = newMovement.id
        } catch (movErr) {
          console.warn('Could not auto-create financial movement:', movErr)
        }
      }

      const receiptPayload: Partial<Receipt> = {
        ...formData,
        client_id: finalClientId,
        financial_movement_id: movementId || receiptToEdit?.financial_movement_id || null
      }

      if (receiptToEdit) {
        await companyService.updateReceipt(user.id, receiptToEdit.id, receiptPayload)
      } else {
        await companyService.createReceipt(user.id, receiptPayload)
      }

      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar recibo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-2xl"
      header={
        <div className="pt-6 pb-2 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="text-emerald-400" size={22} />
          </div>
          <h3 className="text-xl font-black text-silver-polished tracking-tight uppercase">
            {receiptToEdit ? 'Editar Recibo' : 'Emitir Recibo Digital'}
          </h3>
          <p className="text-xs text-silver-brushed/50 mt-1 font-medium">
            Gere e gerencie comprovantes de pagamentos para seus clientes.
          </p>
        </div>
      }
      footer={
        <div className="flex gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-silver-polished text-xs font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer border border-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{receiptToEdit ? 'Salvar Alterações' : 'Emitir Recibo'}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-xl">
            {error}
          </div>
        )}

        {/* Client Selection */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
            Selecionar Cliente Cadastrado
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => handleClientSelect(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            <option value="" className="bg-zinc-900 text-silver-brushed">-- Digitar Dados do Cliente Manualmente --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-zinc-900 text-silver-polished">
                {c.name} {c.document ? `(${c.document})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Client Name & Document */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Nome do Cliente / Sacado <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nome do cliente"
              value={formData.client_name || ''}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              CPF / CNPJ do Cliente
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={formData.client_document || ''}
              onChange={(e) => setFormData({ ...formData, client_document: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Option to auto-save manually entered client */}
        {!selectedClientId && !receiptToEdit && (
          <div className="p-2.5 bg-black/20 border border-white/5 rounded-xl flex items-center gap-2.5">
            <input
              type="checkbox"
              id="saveClientCheck"
              checked={saveAsNewClient}
              onChange={(e) => setSaveAsNewClient(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <label htmlFor="saveClientCheck" className="text-xs text-silver-polished/80 font-medium cursor-pointer select-none">
              Salvar também na minha <span className="text-emerald-400 font-bold">carteira de clientes</span>
            </label>
          </div>
        )}

        {/* Description & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Descrição dos Serviços / Produtos <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Consultoria financeira mensal, Desenvolvimento de site..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Valor (R$) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400">R$</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Issue Date & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Data de Emissão
            </label>
            <input
              type="date"
              value={formData.issue_date || ''}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Forma de Pagamento
            </label>
            <select
              value={formData.payment_method || 'PIX'}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m} className="bg-zinc-900 text-silver-polished">{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Período de Prestação do Serviço */}
        <div className="p-3.5 bg-black/30 border border-white/10 rounded-xl space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-polished">
            Período de Prestação do Serviço (Exibido no Recibo)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold uppercase text-silver-brushed/60 mb-1">
                Data Inicial do Período
              </label>
              <input
                type="date"
                value={formData.service_start_date || ''}
                onChange={(e) => setFormData({ ...formData, service_start_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase text-silver-brushed/60 mb-1">
                Data Final do Período
              </label>
              <input
                type="date"
                value={formData.service_end_date || ''}
                onChange={(e) => setFormData({ ...formData, service_end_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
            Observações / Termos Adicionais
          </label>
          <textarea
            rows={2}
            placeholder="Observações complementares a serem impressas no recibo..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
        </div>

        {/* Financial Movement Integration Checkbox */}
        {!receiptToEdit && (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <input
              type="checkbox"
              id="createMovementCheck"
              checked={createFinancialMovement}
              onChange={(e) => setCreateFinancialMovement(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <label htmlFor="createMovementCheck" className="text-xs text-silver-polished font-medium cursor-pointer select-none">
              Registrar também como <span className="text-emerald-400 font-bold">Entrada Financeira</span> nas movimentações do sistema
            </label>
          </div>
        )}
      </form>
    </DialogShell>
  )
}
