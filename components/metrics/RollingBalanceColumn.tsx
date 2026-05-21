'use client'

interface RollingBalanceColumnProps {
  balance: number
}

export function RollingBalanceColumn({ balance }: RollingBalanceColumnProps) {
  const isPositive = balance >= 0
  
  return (
    <div className={`w-[100px] sm:w-[120px] shrink-0 flex flex-col items-end justify-center py-2 px-3 sm:px-4 transition-all relative ${
      isPositive 
      ? 'bg-silver-brushed/[0.03]' 
      : 'bg-rose-950/20'
    }`}>
      <div className="absolute top-0 left-0 bottom-0 w-px bg-silver-brushed/10" />
      <span className={`text-[10px] sm:text-xs font-black tabular-nums tracking-tighter ${isPositive ? 'text-silver-polished' : 'text-rose-400'}`}>
        <span className="text-[8px] sm:text-[9px] opacity-20 mr-0.5">R$</span>
        {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </span>
      <div className={`w-full h-px mt-1 ${isPositive ? 'bg-silver-brushed/5' : 'bg-rose-500/10'}`} />
    </div>
  )
}
