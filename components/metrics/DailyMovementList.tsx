'use client'

import { FinancialMovement, MovementType } from '@/types/financial'
import { TrendingUp, ShoppingBag, CreditCard, PiggyBank, Receipt, ChevronRight, HandCoins } from 'lucide-react'
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
  entrada: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  saida_fixa: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  gasto_diario: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  economia: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
  cartao: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  cobranca: 'text-orange-400 border-orange-500/20 bg-orange-500/5'
}

const ICON_COLOR_MAP: Record<MovementType, string> = {
  entrada: 'text-emerald-400',
  saida_fixa: 'text-rose-400',
  gasto_diario: 'text-amber-400',
  economia: 'text-cyan-400',
  cartao: 'text-purple-400',
  cobranca: 'text-orange-400'
}

const LABEL_MAP: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida_fixa: 'Saída',
  gasto_diario: 'Diário',
  economia: 'Economia',
  cartao: 'Cartão',
  cobranca: 'Cobrança'
}

interface DailyMovementListProps {
  movements: FinancialMovement[]
  onEdit: (movement: FinancialMovement) => void
}

export function DailyMovementList({ movements, onEdit }: DailyMovementListProps) {
  return (
    <div className="space-y-2">
      {movements.map((movement, idx) => {
        const Icon = ICON_MAP[movement.type] || TrendingUp
        const isPositive = movement.type === 'entrada' || movement.type === 'cobranca'
        
        return (
          <motion.div 
            key={movement.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onEdit(movement)}
            className={`group flex items-center gap-3 p-3 rounded-2xl border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 transition-all cursor-pointer active:scale-[0.99]`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${COLOR_MAP[movement.type]}`}>
              <Icon size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] font-black uppercase tracking-widest ${ICON_COLOR_MAP[movement.type]}`}>
                  {LABEL_MAP[movement.type]}
                </span>
                {movement.tag && (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[8px] font-bold text-zinc-500 uppercase tracking-tighter border border-zinc-700/30">
                    {movement.tag}
                  </span>
                )}
              </div>
              <h4 className="text-zinc-200 text-sm font-medium truncate tracking-tight">
                {movement.description}
              </h4>
            </div>

            <div className="text-right">
              <span className={`text-sm font-black block tracking-tighter ${isPositive ? 'text-emerald-400' : 'text-zinc-100'}`}>
                {isPositive ? '+' : '-'} R$ {Number(movement.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <ChevronRight size={10} className="inline text-zinc-700 group-hover:text-zinc-500 mt-1 transition-colors" />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
