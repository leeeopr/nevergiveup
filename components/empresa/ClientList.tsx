'use client'

import React, { useState } from 'react'
import { Client } from '@/types/company'
import { User, Search, Plus, Edit2, Trash2, FileText, Phone, Mail, MapPin, Building, AlertTriangle } from 'lucide-react'
import { DialogShell } from '@/components/ui/DialogShell'

interface ClientListProps {
  clients: Client[]
  loading: boolean
  onAddClient: () => void
  onEditClient: (client: Client) => void
  onDeleteClient: (clientId: string) => void
  onCreateReceiptForClient: (client: Client) => void
}

export function ClientList({
  clients,
  loading,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onCreateReceiptForClient
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModalClient, setDeleteModalClient] = useState<Client | null>(null)

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      (c.document && c.document.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.city && c.city.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-velvet-soft/40 border border-silver-brushed/10 rounded-2xl p-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-brushed/40" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/5 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>

        <button
          onClick={onAddClient}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Client Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-velvet-soft/20 border border-white/5 rounded-2xl animate-pulse p-5" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center bg-velvet-soft/20 border border-silver-brushed/5 rounded-3xl p-8">
          <User size={40} className="text-silver-brushed/20 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-silver-polished uppercase tracking-wide mb-1">
            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h4>
          <p className="text-xs text-silver-brushed/40 max-w-xs mx-auto mb-6">
            {searchTerm
              ? 'Tente buscar por outro termo ou limpe o filtro.'
              : 'Cadastre seus clientes para organizar recibos e dados empresariais.'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAddClient}
              className="px-6 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cadastrar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <div
              key={client.id}
              className="bg-velvet-soft/60 border border-silver-brushed/10 hover:border-silver-brushed/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group hover:bg-velvet-soft/80"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <User className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-silver-polished tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {client.name}
                      </h4>
                      {client.document && (
                        <p className="text-[10px] text-silver-brushed/50 font-mono tracking-wider mt-0.5">
                          {client.document}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditClient(client)}
                      className="p-2 text-silver-brushed/60 hover:text-silver-polished hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteModalClient(client)}
                      className="p-2 text-silver-brushed/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Cliente"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs text-silver-brushed/70 font-medium">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-emerald-400/70 shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                  )}

                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-emerald-400/70 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}

                  {(client.address || client.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-emerald-400/70 shrink-0" />
                      <span className="truncate">
                        {[client.address, client.number, client.city, client.state]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-[10px] text-silver-brushed/40 italic pt-1 line-clamp-2">
                      &quot;{client.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Quick Receipt Button */}
              <div className="pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={() => onCreateReceiptForClient(client)}
                  className="w-full py-2 px-3 bg-silver-brushed/10 hover:bg-emerald-500/20 text-silver-polished hover:text-emerald-300 border border-silver-brushed/20 hover:border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText size={13} className="text-emerald-400" />
                  <span>Emitir Recibo para Este Cliente</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalClient && (
        <DialogShell
          isOpen={!!deleteModalClient}
          onClose={() => setDeleteModalClient(null)}
          type="modal"
          maxWidth="max-w-md"
          header={
            <div className="pt-6 pb-2 text-center">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="text-rose-400" size={24} />
              </div>
              <h3 className="text-lg font-black text-silver-polished tracking-tight uppercase">
                Excluir Cliente?
              </h3>
            </div>
          }
          footer={
            <div className="flex gap-3 w-full pt-4">
              <button
                onClick={() => setDeleteModalClient(null)}
                className="flex-1 py-3 bg-white/5 text-silver-polished text-xs font-bold uppercase rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteModalClient) {
                    onDeleteClient(deleteModalClient.id)
                    setDeleteModalClient(null)
                  }
                }}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-zinc-950 font-black text-xs uppercase rounded-xl shadow-lg"
              >
                Confirmar Exclusão
              </button>
            </div>
          }
        >
          <div className="text-center space-y-3 py-2">
            <p className="text-xs text-silver-polished font-bold">
              Tem certeza que deseja excluir o cliente <span className="text-rose-400 font-extrabold">{deleteModalClient.name}</span>?
            </p>
            <p className="text-[11px] text-silver-brushed/50 leading-relaxed">
              O histórico dos recibos já emitidos para este cliente será totalmente preservado no sistema para integridade documental.
            </p>
          </div>
        </DialogShell>
      )}
    </div>
  )
}
