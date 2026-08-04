'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { companyService } from '@/services/companyService'
import { Client, Receipt } from '@/types/company'
import { ClientList } from './ClientList'
import { ReceiptList } from './ReceiptList'
import { ClientFormModal } from './ClientFormModal'
import { ReceiptFormModal } from './ReceiptFormModal'
import { ReceiptPrintModal } from './ReceiptPrintModal'
import { CompanySettingsCard } from './CompanySettingsCard'
import { CobrancasManager } from './CobrancasManager'
import { Building, Users, FileText, Settings, Plus, Sparkles, ShieldCheck, ToggleRight, DollarSign } from 'lucide-react'

export function EmpresaTab() {
  const { user, profile, toggleEmpresaMode } = useAuth()
  const [subTab, setSubTab] = useState<'clients' | 'cobrancas' | 'receipts' | 'settings'>('clients')


  const [clients, setClients] = useState<Client[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptToEdit, setReceiptToEdit] = useState<Receipt | null>(null)
  const [preselectedClient, setPreselectedClient] = useState<Client | null>(null)

  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!user || !profile?.empresa_enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [fetchedClients, fetchedReceipts] = await Promise.all([
        companyService.getClients(user.id),
        companyService.getReceipts(user.id)
      ])
      setClients(fetchedClients)
      setReceipts(fetchedReceipts)
    } catch (err) {
      console.warn('Error loading company data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.empresa_enabled])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  // Client actions
  const handleAddClient = () => {
    setClientToEdit(null)
    setIsClientModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setClientToEdit(client)
    setIsClientModalOpen(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!user) return
    await companyService.deleteClient(user.id, clientId)
    loadData()
  }

  const handleCreateReceiptForClient = (client: Client) => {
    setReceiptToEdit(null)
    setPreselectedClient(client)
    setIsReceiptModalOpen(true)
  }

  // Receipt actions
  const handleAddReceipt = () => {
    setReceiptToEdit(null)
    setPreselectedClient(null)
    setIsReceiptModalOpen(true)
  }

  const handleEditReceipt = (receipt: Receipt) => {
    setReceiptToEdit(receipt)
    setPreselectedClient(null)
    setIsReceiptModalOpen(true)
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user) return
    await companyService.deleteReceipt(user.id, receiptId)
    loadData()
  }

  const handlePrintReceipt = (receipt: Receipt) => {
    setPrintReceipt(receipt)
    setIsPrintModalOpen(true)
  }

  const handleToggleReceiptStatus = async (receipt: Receipt) => {
    if (!user) return
    const newStatus = receipt.status === 'issued' ? 'cancelled' : 'issued'
    await companyService.updateReceipt(user.id, receipt.id, { status: newStatus })
    loadData()
  }

  // If Empresa mode is NOT enabled for this user
  if (!profile?.empresa_enabled) {
    return (
      <div className="bg-velvet-soft/80 border border-silver-brushed/15 rounded-[32px] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6 my-8 backdrop-blur-xl">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-400">
          <Building size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-silver-polished tracking-tight uppercase">
            Gestão de Recibos & Clientes
          </h2>
          <p className="text-xs text-silver-brushed/60 font-medium leading-relaxed max-w-md mx-auto">
            O <strong className="text-silver-polished">Modo Empresa</strong> permite cadastrar sua cartela de clientes, emitir recibos digitais padronizados para prestação de serviços e consultar histórico financeiro empresarial.
          </p>
        </div>

        <div className="p-4 bg-black/30 border border-white/5 rounded-2xl text-left space-y-2.5 text-xs text-silver-brushed/80 font-medium">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <span>Cadastro ilimitado de clientes com contatos e endereços.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <span>Emissão de recibos digitais com valor por extenso automático.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400 shrink-0" />
            <span>Isolamento total e seguro de dados por usuário.</span>
          </div>
        </div>

        <button
          onClick={() => toggleEmpresaMode(true)}
          className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mx-auto"
        >
          <ToggleRight size={18} />
          <span>Ativar Modo Empresa Agora</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-velvet-soft/80 border border-silver-brushed/10 rounded-2xl p-2 sm:p-3 shadow-lg">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setSubTab('clients')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'clients'
                ? 'bg-silver-brushed text-velvet-deep shadow-md'
                : 'text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            <span>Clientes</span>
            {clients.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-velvet-deep">
                {clients.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('cobrancas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'cobrancas'
                ? 'bg-silver-brushed text-velvet-deep shadow-md'
                : 'text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            <DollarSign size={16} />
            <span>Cobranças Recorrentes</span>
          </button>

          <button
            onClick={() => setSubTab('receipts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'receipts'
                ? 'bg-silver-brushed text-velvet-deep shadow-md'
                : 'text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            <FileText size={16} />
            <span>Recibos Emitidos</span>
            {receipts.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-velvet-deep">
                {receipts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'settings'
                ? 'bg-silver-brushed text-velvet-deep shadow-md'
                : 'text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5'
            }`}
          >
            <Settings size={16} />
            <span>Dados da Empresa</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {subTab === 'clients' && (
            <button
              onClick={handleAddClient}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Cliente</span>
            </button>
          )}

          {subTab === 'receipts' && (
            <button
              onClick={handleAddReceipt}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Emitir Recibo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main SubTab Content */}
      {subTab === 'clients' ? (
        <ClientList
          clients={clients}
          loading={loading}
          onAddClient={handleAddClient}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
          onCreateReceiptForClient={handleCreateReceiptForClient}
        />
      ) : subTab === 'cobrancas' ? (
        <CobrancasManager userId={user?.id || 'local-user-id'} />
      ) : subTab === 'receipts' ? (
        <ReceiptList
          receipts={receipts}
          clients={clients}
          loading={loading}
          onAddReceipt={handleAddReceipt}
          onEditReceipt={handleEditReceipt}
          onDeleteReceipt={handleDeleteReceipt}
          onPrintReceipt={handlePrintReceipt}
          onToggleStatus={handleToggleReceiptStatus}
        />
      ) : (
        <CompanySettingsCard />
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clientToEdit={clientToEdit}
        onSaved={loadData}
      />

      <ReceiptFormModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptToEdit={receiptToEdit}
        clients={clients}
        preselectedClient={preselectedClient}
        onSaved={loadData}
      />

      <ReceiptPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        receipt={printReceipt}
      />
    </div>
  )
}
