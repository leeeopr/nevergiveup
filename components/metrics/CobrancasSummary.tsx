'use client'

import React from 'react'
import { motion } from 'motion/react'
import { HandCoins, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { FinancialMovement } from '@/types/financial'
import { format, parseISO, isAfter, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CobrancasSummaryProps {
  movements: FinancialMovement[]
}

export function CobrancasSummary({ movements }: CobrancasSummaryProps) {
  const cobrancas = movements.filter(m => m.type === 'cobranca')
  
  const metrics = cobrancas.reduce((acc, curr) => {
    const amount = Number(curr.amount)
    if (curr.is_paid) {
      acc.totalReceived += amount
    } else {
      acc.totalPending += amount
      const dueDate = curr.due_date ? startOfDay(parseISO(curr.due_date)) : null
      const today = startOfDay(new Date())
      
      if (dueDate && isAfter(today, dueDate)) {
        acc.totalOverdue += amount
        acc.overdueCount++
      } else {
        acc.upcomingCount++
      }
    }
    return acc
  }, {
    totalPending: 0,
    totalReceived: 0,
    totalOverdue: 0,
    overdueCount: 0,
    upcomingCount: 0
  })

  if (cobrancas.length === 0) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {/* Pending Card */}
      <div className="executive-card rounded-3xl p-6 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
            <HandCoins size={14} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-silver-brushed/40">Recebíveis Pendentes</span>
        </div>
        <div className="text-2xl font-black text-silver-polished tracking-tighter">
          <span className="text-xs mr-1 opacity-20">R$</span>
          {metrics.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Clock size={10} className="text-silver-brushed/20" />
          <span className="text-[8px] font-black text-silver-brushed/30 uppercase tracking-widest">
            {metrics.upcomingCount} cobranças em aberto
          </span>
        </div>
      </div>

      {/* Overdue Card */}
      <div className={`executive-card rounded-3xl p-6 border ${metrics.totalOverdue > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-silver-brushed/5'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${metrics.totalOverdue > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-silver-brushed/10 text-silver-brushed/40'}`}>
            <AlertCircle size={14} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-silver-brushed/40">Total em Atraso</span>
        </div>
        <div className={`text-2xl font-black tracking-tighter ${metrics.totalOverdue > 0 ? 'text-rose-400' : 'text-silver-brushed/20'}`}>
          <span className="text-xs mr-1 opacity-20">R$</span>
          {metrics.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-[8px] font-black uppercase tracking-widest ${metrics.totalOverdue > 0 ? 'text-rose-400/60' : 'text-silver-brushed/20'}`}>
            {metrics.overdueCount} títulos vencidos
          </span>
        </div>
      </div>

      {/* Received Card */}
      <div className="executive-card rounded-3xl p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle2 size={14} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-silver-brushed/40">Total Liquidado</span>
        </div>
        <div className="text-2xl font-black text-silver-polished tracking-tighter">
          <span className="text-xs mr-1 opacity-20">R$</span>
          {metrics.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[8px] font-black text-emerald-400/40 uppercase tracking-widest">Saldo convertido em caixa</span>
        </div>
      </div>
    </motion.div>
  )
}
