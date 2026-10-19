'use client'

import React, { useState, useEffect } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { DebtPerson } from '@/types/personalDebts'
import { UserPlus, UserCheck, X } from 'lucide-react'

interface PersonFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: { name: string; phone?: string; notes?: string }) => Promise<void>
  initialData?: DebtPerson | null
}

export function PersonFormModal({ isOpen, onClose, onSave, initialData }: PersonFormModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setPhone(initialData.phone || '')
      setNotes(initialData.notes || '')
    } else {
      setName('')
      setPhone('')
      setNotes('')
    }
    setError(null)
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Por favor, informe o nome completo da pessoa.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar os dados da pessoa.')
    } finally {
      setLoading(false)
    }
  }

  const isEditing = Boolean(initialData)

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-md"
      header={
        <div className="flex items-center justify-between pt-6 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-silver-brushed/10 border border-silver-brushed/20 flex items-center justify-center text-silver-polished">
              {isEditing ? <UserCheck size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-silver-polished tracking-tight">
                {isEditing ? 'Editar Pessoa' : 'Nova Pessoa'}
              </h2>
              <p className="text-xs text-silver-brushed/60 font-medium">
                {isEditing ? 'Atualize as informações de contato' : 'Cadastre alguém para gerenciar cobranças e dívidas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-silver-brushed/50 hover:text-silver-polished rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Nome */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
            Nome Completo *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: João da Silva, Mariana Costa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
          />
        </div>

        {/* Telefone / WhatsApp */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
            Telefone / WhatsApp (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: (11) 98765-4321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-semibold text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1.5">
            Observações (Opcional)
          </label>
          <textarea
            rows={3}
            placeholder="Ex: Amigo da faculdade, colega de trabalho, projetos conjuntos..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-[var(--border)] rounded-2xl text-sm font-medium text-silver-polished placeholder:text-silver-brushed/30 focus:outline-none focus:border-silver-brushed transition-colors resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-silver-brushed/10 hover:bg-silver-brushed/15 text-silver-polished rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3.5 bg-silver-brushed hover:bg-white text-velvet-deep font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Salvando...' : isEditing ? 'Atualizar Dados' : 'Cadastrar Pessoa'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
