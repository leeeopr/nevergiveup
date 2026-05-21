'use client'

import { FinancialMovement, MovementType } from '@/types/financial'
import { TrendingUp, TrendingDown, Wallet, ShoppingBag, CreditCard, PiggyBank, Receipt, ChevronRight, HandCoins } from 'lucide-react'
import { motion } from 'motion/react'

const ICON_MAP: Record<MovementType, any> = {
  entrada: TrendingUp,
  saida_fixa: Receipt,
  gasto_diario: ShoppingBag,
  economia: PiggyBank,
  cartao: CreditCard,
  cobranca: HandCoins
}

const COLOR_MAP: Record<MovementType, string> = {
  entrada: 'text-emerald-400',
  saida_fixa: 'text-rose-400',
  gasto_diario: 'text-amber-400',
  economia: 'text-cyan-400',
  cartao: 'text-purple-400',
  cobranca: 'text-orange-400'
}

const LABEL_MAP: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida_fixa: 'Saída Fixa',
  gasto_diario: 'Custo Diário',
  economia: 'Economia',
  cartao: 'Cartão',
  cobranca: 'Cobrança'
}

interface DailyMovementGroupProps {
  movements: FinancialMovement[]
  onEdit: (movement: FinancialMovement) => void
}

export function DailyMovementGroup({ movements, onEdit }: DailyMovementGroupProps) {
  return (
    <div className="space-y-3">
      {movements.map((movement, idx) => {
        const Icon = ICON_MAP[movement.type] || Wallet
        const isPositive = movement.type === 'entrada' || movement.type === 'cobranca'
        
        return (
          <motion.div 
            key={movement.id}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onEdit(movement)}
            className="group flex items-center gap-4 bg-zinc-900/40 hover:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-800/50 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className={`w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 ${COLOR_MAP[movement.type]}`}>
              <Icon size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {LABEL_MAP[movement.type]}
                </span>
                {movement.tag && (
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[9px] font-medium text-zinc-400 border border-zinc-700/50">
                    {movement.tag}
                  </span>
                )}
              </div>
              <h4 className="text-zinc-200 text-sm font-medium truncate leading-tight">
                {movement.description}
              </h4>
            </div>

            <div className="text-right">
              <span className={`text-sm font-bold block ${isPositive ? 'text-emerald-400' : 'text-zinc-200'}`}>
                {isPositive ? '+' : '-'} R$ {Number(movement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="flex items-center justify-end gap-1 text-zinc-600 mt-1">
                 <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
