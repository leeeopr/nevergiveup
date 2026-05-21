'use client'

import React from 'react'
import { FinancialMovement, MovementType } from '@/types/financial'
import { 
  ArrowDownLeft, 
  Wallet, 
  Coffee, 
  Shield, 
  CreditCard,
  Repeat,
  HandCoins,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MovementCardProps {
  movement: FinancialMovement
  onClick: (movement: FinancialMovement) => void
}

const TYPE_CONFIG: Record<MovementType, { icon: React.ReactNode, color: string, label: string }> = {
  entrada: { 
    icon: <ArrowDownLeft size={16} />, 
    color: 'text-emerald-400 bg-emerald-400/10', 
    label: 'Entrada' 
  },
  saida_fixa: { 
    icon: <Wallet size={16} />, 
    color: 'text-rose-400 bg-rose-400/10', 
    label: 'Saída Fixa' 
  },
  gasto_diario: { 
    icon: <Coffee size={16} />, 
    color: 'text-amber-400 bg-amber-400/10', 
    label: 'Gasto Diário' 
  },
  economia: { 
    icon: <Shield size={16} />, 
    color: 'text-cyan-400 bg-cyan-400/10', 
    label: 'Economia' 
  },
  cartao: { 
    icon: <CreditCard size={16} />, 
    color: 'text-purple-400 bg-purple-400/10', 
    label: 'Cartão' 
  },
  cobranca: { 
    icon: <HandCoins size={16} />, 
    color: 'text-orange-400 bg-orange-400/10', 
    label: 'Cobrança' 
  },
}

export function MovementCard({ movement, onClick }: MovementCardProps) {
  const config = TYPE_CONFIG[movement.type]
  const isNegative = movement.type !== 'entrada' && movement.type !== 'cobranca'
  const isCobranca = movement.type === 'cobranca'

  return (
    <button
      onClick={() => onClick(movement)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--glass)] border border-[var(--border)] hover:bg-zinc-900/40 transition-all group active:scale-[0.98] ${isCobranca && !movement.is_paid ? 'border-orange-500/20' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${config.color} group-hover:scale-110 transition-transform relative`}>
          {config.icon}
          {isCobranca && (
            <div className={`absolute -top-1 -right-1 p-0.5 rounded-full ${movement.is_paid ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
              {movement.is_paid ? <CheckCircle2 size={8} /> : <Clock size={8} />}
            </div>
          )}
        </div>
        <div className="text-left">
          <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-1">
            {movement.description}
            {movement.debtor_name && <span className="text-[var(--text-muted)] font-normal text-xs ml-2">({movement.debtor_name})</span>}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isCobranca && !movement.is_paid ? 'text-orange-400' : 'text-[var(--text-muted)]'}`}>
              {isCobranca ? (movement.is_paid ? 'Cobrança Recebida' : 'Cobrança Pendente') : config.label}
            </span>
            {movement.tag && (
              <>
                <span className="text-zinc-800">•</span>
                <span className="text-[10px] font-bold text-[var(--primary)] lowercase">
                  #{movement.tag}
                </span>
              </>
            )}
            {movement.is_recurring && (
              <Repeat size={10} className="text-zinc-600" />
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className={`text-sm font-black ${isNegative ? 'text-[var(--text-main)]' : (isCobranca && !movement.is_paid ? 'text-orange-400' : 'text-[var(--success)]')}`}>
          {isNegative ? '-' : '+'} R$ {Number(movement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        {isCobranca && movement.due_date && !movement.is_paid && (
          <p className="text-[8px] text-orange-400/50 font-bold uppercase mt-0.5">
            Vence {format(parseISO(movement.due_date), "dd/MM", { locale: ptBR })}
          </p>
        )}
      </div>
    </button>
  )
}
