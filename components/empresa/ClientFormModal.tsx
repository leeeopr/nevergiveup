'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { Client } from '@/types/company'
import { companyService } from '@/services/companyService'
import { useAuth } from '@/context/AuthContext'
import { User, Building, Mail, Phone, MapPin, FileText, Check, X, Loader2 } from 'lucide-react'

interface ClientFormModalProps {
  isOpen: boolean
  onClose: () => void
  clientToEdit?: Client | null
  onSaved: () => void
}

export function ClientFormModal({ isOpen, onClose, clientToEdit, onSaved }: ClientFormModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    status: 'active'
  })

  useEffect(() => {
    if (clientToEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: clientToEdit.name || '',
        document: clientToEdit.document || '',
        email: clientToEdit.email || '',
        phone: clientToEdit.phone || '',
        address: clientToEdit.address || '',
        number: clientToEdit.number || '',
        complement: clientToEdit.complement || '',
        neighborhood: clientToEdit.neighborhood || '',
        city: clientToEdit.city || '',
        state: clientToEdit.state || '',
        zip_code: clientToEdit.zip_code || '',
        notes: clientToEdit.notes || '',
        status: clientToEdit.status || 'active'
      })
    } else {
      setFormData({
        name: '',
        document: '',
        email: '',
        phone: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        notes: '',
        status: 'active'
      })
    }
    setError(null)
  }, [clientToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.name?.trim()) {
      setError('Por favor, informe o nome ou razão social do cliente.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (clientToEdit) {
        await companyService.updateClient(user.id, clientToEdit.id, formData)
      } else {
        await companyService.createClient(user.id, formData)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar cliente. Tente novamente.')
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
            <User className="text-emerald-400" size={22} />
          </div>
          <h3 className="text-xl font-black text-silver-polished tracking-tight uppercase">
            {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <p className="text-xs text-silver-brushed/50 mt-1 font-medium">
            Preencha os dados do cliente para cadastro e emissão de recibos.
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
            <span>{clientToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
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

        {/* Nome / Razão Social */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
            Nome / Razão Social <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
            <input
              type="text"
              required
              placeholder="Ex: Maria Silva ou Empresa XYZ Ltda"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* CPF / CNPJ e Telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              CPF ou CNPJ
            </label>
            <div className="relative">
              <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formData.document || ''}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
            E-mail
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
            <input
              type="email"
              placeholder="cliente@email.com"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Endereço & Número */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Endereço / Logradouro
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
              <input
                type="text"
                placeholder="Rua / Avenida"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Número
            </label>
            <input
              type="text"
              placeholder="123"
              value={formData.number || ''}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Bairro, Cidade & Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Bairro
            </label>
            <input
              type="text"
              placeholder="Centro"
              value={formData.neighborhood || ''}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Cidade
            </label>
            <input
              type="text"
              placeholder="São Paulo"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              UF
            </label>
            <input
              type="text"
              maxLength={2}
              placeholder="SP"
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished uppercase placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* CEP & Observações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              CEP
            </label>
            <input
              type="text"
              placeholder="00000-000"
              value={formData.zip_code || ''}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
              Observações Internas
            </label>
            <input
              type="text"
              placeholder="Notas adicionais sobre o cliente..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>
      </form>
    </DialogShell>
  )
}
