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
    color: 'text-[var(--success)] bg-[var(--success)]/10', 
    label: 'Entrada' 
  },
  saida_fixa: { 
    icon: <Wallet size={16} />, 
    color: 'text-[var(--danger)] bg-[var(--danger)]/10', 
    label: 'Saída Fixa' 
  },
  gasto_diario: { 
    icon: <Coffee size={16} />, 
    color: 'text-[var(--warning)] bg-[var(--warning)]/10', 
    label: 'Gasto Diário' 
  },
  economia: { 
    icon: <Shield size={16} />, 
    color: 'text-[var(--cyan)] bg-[var(--cyan)]/10', 
    label: 'Economia' 
  },
  cartao: { 
    icon: <CreditCard size={16} />, 
    color: 'text-[var(--purple)] bg-[var(--purple)]/10', 
    label: 'Cartão' 
  },
  cobranca: { 
    icon: <HandCoins size={16} />, 
    color: 'text-[var(--orange)] bg-[var(--orange)]/10', 
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
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--glass)] border border-[var(--border)] hover:bg-[var(--surface-accent)]/40 hover:border-[var(--silver-brushed)]/20 transition-all group active:scale-[0.98] ${isCobranca && !movement.is_paid ? 'border-orange-500/30' : ''}`}
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
          <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-1 flex items-center gap-1.5">
            <span>{movement.description}</span>
            {movement.debtor_name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full shrink-0 font-sans">
                👤 {movement.debtor_name}
              </span>
            )}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isCobranca && !movement.is_paid ? 'text-[var(--orange)]' : 'text-[var(--text-muted)]'}`}>
              {isCobranca ? (movement.is_paid ? 'Cobrança Recebida' : 'Cobrança Pendente') : config.label}
            </span>
            {movement.tag && (
              <>
                <span className="text-[var(--text-muted)]/50">•</span>
                <span className="text-[10px] font-bold text-[var(--primary)] lowercase">
                  #{movement.tag}
                </span>
              </>
            )}
            {movement.is_recurring && (
              <Repeat size={10} className="text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className={`text-sm font-black ${isNegative ? 'text-[var(--text-main)]' : (isCobranca && !movement.is_paid ? 'text-[var(--orange)]' : 'text-[var(--success)]')}`}>
          {isNegative ? '-' : '+'} R$ {Number(movement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        {isCobranca && movement.due_date && !movement.is_paid && (
          <p className="text-[9px] text-[var(--orange)] font-black uppercase mt-0.5 tracking-wider">
            Vence {format(parseISO(movement.due_date), "dd/MM", { locale: ptBR })}
          </p>
        )}
      </div>
    </button>
  )
}
