'use client'

import React from 'react'
import { PersonWithDebts } from '@/types/personalDebts'
import { 
  User, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Scale
} from 'lucide-react'

interface PersonCardProps {
  person: PersonWithDebts
  onSelect: (person: PersonWithDebts) => void
  onAddDebt: (person: PersonWithDebts) => void
  onEdit: (person: PersonWithDebts) => void
  onDelete: (person: PersonWithDebts) => void
}

export function PersonCard({ person, onSelect, onAddDebt, onEdit, onDelete }: PersonCardProps) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Get initials for avatar
  const initials = person.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')

  const isNetPositive = person.netBalance > 0.009
  const isNetNegative = person.netBalance < -0.009
  const isNetZero = !isNetPositive && !isNetNegative

  return (
    <div 
      className="group bg-[var(--surface)] border border-[var(--border)] rounded-[28px] p-5 sm:p-6 shadow-lg hover:shadow-2xl hover:border-silver-brushed/40 transition-all flex flex-col justify-between relative overflow-hidden backdrop-blur-xl"
    >
      {/* Subtle background glow depending on status */}
      {person.hasOverdue && (
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-silver-brushed/10 border border-silver-brushed/20 flex items-center justify-center text-sm font-black text-silver-polished tracking-wider shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {initials || <User size={20} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-silver-polished tracking-tight truncate" title={person.name}>
                {person.name}
              </h3>
              {person.phone ? (
                <a 
                  href={`https://wa.me/${person.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs text-silver-brushed/60 hover:text-emerald-400 transition-colors mt-0.5 truncate font-medium"
                >
                  <Phone size={11} className="shrink-0" />
                  <span>{person.phone}</span>
                </a>
              ) : (
                <span className="text-[11px] text-silver-brushed/40 italic">Sem contato registrado</span>
              )}
            </div>
          </div>

          {/* Quick Edit/Delete tools */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(person)
              }}
              className="p-2 text-silver-brushed/50 hover:text-silver-polished hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Editar Pessoa"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(person)
              }}
              className="p-2 text-silver-brushed/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              title="Excluir Pessoa"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {person.notes && (
          <p className="text-xs text-silver-brushed/60 mb-4 line-clamp-1 italic bg-black/10 px-3 py-1.5 rounded-xl border border-white/5">
            &ldquo;{person.notes}&rdquo;
          </p>
        )}

        {/* Financial Bento Matrix */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          {/* Ele me deve */}
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ArrowDownLeft size={13} />
              <span>Ela/Ele me deve</span>
            </div>
            <p className="text-sm sm:text-base font-black text-emerald-400 tracking-tight font-mono">
              {formatMoney(person.totalToReceive)}
            </p>
          </div>

          {/* Eu devo a ele */}
          <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-3 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
              <ArrowUpRight size={13} />
              <span>Eu devo a ela/ele</span>
            </div>
            <p className="text-sm sm:text-base font-black text-rose-400 tracking-tight font-mono">
              {formatMoney(person.totalToPay)}
            </p>
          </div>
        </div>

        {/* Saldo Líquido Card Banner */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between mb-3.5 ${
          isNetPositive
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : isNetNegative
            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            : 'bg-zinc-800/20 border-zinc-700/30 text-silver-brushed/80'
        }`}>
          <div className="flex items-center gap-2">
            <Scale size={16} />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Saldo Líquido</span>
              <span className="text-[9px] opacity-75 font-medium">
                {isNetPositive ? 'Você tem a receber' : isNetNegative ? 'Você tem a pagar' : 'Equilibrado / Quites'}
              </span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-base font-black">
              {isNetPositive ? `+ ${formatMoney(person.netBalance)}` : formatMoney(person.netBalance)}
            </span>
          </div>
        </div>

        {/* Linked Cobranças do Painel indicator */}
        {person.linkedMovements && person.linkedMovements.length > 0 && (() => {
          const totalVal = person.linkedMovements.reduce((acc, m) => acc + Number(m.amount), 0)
          const pendingCount = person.linkedMovements.filter(m => !m.is_paid).length
          const isPending = pendingCount > 0
          return (
            <div 
              onClick={() => onSelect(person)}
              className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-[10px] text-orange-300 mb-3.5 transition-colors cursor-pointer group/cob"
              title="Clique para ver os detalhes das cobranças vinculadas no painel"
            >
              <span className="font-bold flex items-center gap-1.5">
                <span className="text-sm">🏷️</span>
                <span>
                  {person.linkedMovements.length} cobrança{person.linkedMovements.length !== 1 ? 's' : ''} no fluxo geral
                  {isPending && (
                    <span className="text-amber-400 font-extrabold ml-1">({pendingCount} pendente{pendingCount !== 1 ? 's' : ''})</span>
                  )}
                </span>
              </span>
              <span className="font-mono font-black text-orange-400 group-hover/cob:translate-x-0.5 transition-transform">
                {formatMoney(totalVal)} →
              </span>
            </div>
          )
        })()}
      </div>

      {/* Footer Info & Action */}
      <div className="space-y-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Status Badge */}
          {person.hasOverdue ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <AlertCircle size={12} />
              Vencimento Atrasado
            </span>
          ) : person.pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {person.pendingCount} pendência{person.pendingCount > 1 ? 's' : ''} em aberto
            </span>
          ) : person.isSettled ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={12} />
              Totalmente Quitado
            </span>
          ) : (
            <span className="text-[10px] text-silver-brushed/50 font-medium">
              Nenhuma dívida cadastrada
            </span>
          )}

          <span className="text-[11px] text-silver-brushed/50 font-mono">
            {person.debts.length} registro{person.debts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Action Button Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onAddDebt(person)}
            className="py-2.5 px-3 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <PlusCircle size={14} className="text-silver-brushed" />
            <span>+ Obrigação</span>
          </button>

          <button
            onClick={() => onSelect(person)}
            className="py-2.5 px-3 bg-silver-brushed hover:bg-white text-velvet-deep rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer"
          >
            <span>Detalhes</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
