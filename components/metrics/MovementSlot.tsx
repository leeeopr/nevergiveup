'use client'

import { MovementType } from '@/types/financial'
import { ArrowUpRight, ArrowDownLeft, ShoppingBag, PiggyBank, CreditCard, RefreshCcw, Sparkles, HandCoins } from 'lucide-react'

const SLOT_CONFIG: Record<MovementType, { icon: any; colorClass: string; label: string }> = {
  entrada: { icon: ArrowUpRight, colorClass: 'text-emerald-400', label: 'Inflow' },
  saida_fixa: { icon: ArrowDownLeft, colorClass: 'text-rose-400', label: 'Fixed Cost' },
  gasto_diario: { icon: ShoppingBag, colorClass: 'text-rose-400/60', label: 'Operational' },
  economia: { icon: PiggyBank, colorClass: 'text-silver-brushed/40', label: 'Vault' },
  cartao: { icon: CreditCard, colorClass: 'text-silver-brushed/40', label: 'Liability' },
  cobranca: { icon: HandCoins, colorClass: 'text-orange-400/40', label: 'Receivable' }
}

interface MovementSlotProps {
  type: MovementType
  amount: number
  isVirtual?: boolean
  isRecurring?: boolean
}

export function MovementSlot({ type, amount, isVirtual, isRecurring }: MovementSlotProps) {
  const config = SLOT_CONFIG[type]
  const Icon = config.icon
  const hasValue = amount !== 0

  return (
      <div className={`flex items-center gap-3 py-1.5 px-4 h-8 transition-opacity ${isVirtual ? 'opacity-40' : 'opacity-100'}`}>
      <div className={`shrink-0 flex items-center justify-center ${hasValue ? config.colorClass : 'text-silver-brushed/10'} transition-all`}>
        <Icon size={12} className={hasValue ? '' : 'opacity-20'} />
      </div>
      
      <div className="flex-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${hasValue ? 'text-silver-brushed/40' : 'text-silver-brushed/10'}`}>
            {config.label}
          </span>
          {isRecurring && (
            <RefreshCcw size={8} className="text-silver-brushed/20 animate-spin-slow" />
          )}
          {isVirtual && (
            <div className="w-1 h-1 rounded-full bg-silver-brushed/10" />
          )}
        </div>
        <span className={`text-[11px] font-black tabular-nums tracking-tight ${hasValue ? 'text-silver-polished' : 'text-silver-brushed/10'}`}>
           {hasValue && <span className="text-[9px] opacity-20 mr-1">R$</span>}
           {hasValue ? amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
        </span>
      </div>
    </div>
  )
}
