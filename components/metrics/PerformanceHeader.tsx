'use client'

import { Counter } from './Counter'
import { TrendingUp, TrendingDown, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface PerformanceHeaderProps {
  performance: number
  change: number
}

export function PerformanceHeader({ performance, change }: PerformanceHeaderProps) {
  const isPositive = change >= 0
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="mb-8 pt-4 relative border-b border-silver-brushed/5 pb-6">
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-0 p-2.5 text-silver-brushed/40 hover:text-white transition-all hover:scale-105 active:scale-95"
        title="Encerrar Sessão"
      >
        <LogOut size={18} />
      </button>
      
      <p className="text-[8px] sm:text-[9px] text-silver-brushed/30 font-black uppercase tracking-[0.3em] mb-3">
        Estrutura Patrimonial
      </p>
      <h2 className="text-2xl sm:text-3xl font-black text-silver-polished mb-6 tracking-tighter">Consolidação</h2>
      
      <div className="relative">
        <p className="text-[8px] text-silver-brushed/40 font-black uppercase tracking-[0.2em] mb-2">
          Saldo Operacional (Consolidado)
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl sm:text-6xl font-black tracking-[-0.05em] text-silver-polished flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl text-silver-brushed/20 select-none">R$</span>
            <Counter value={performance} prefix="" decimals={0} />
          </h1>
          <div className="flex">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
              isPositive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {isPositive ? <TrendingUp size={10} className="opacity-60" /> : <TrendingDown size={10} className="opacity-60" />}
              <span>{isPositive ? '+' : ''}{change}% <span className="opacity-40">Benchmark</span></span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
