'use client'

import React from 'react'
import { NavigationTab } from './DesktopSidebar'
import { MonthSelector } from '@/components/metrics/MonthSelector'
import { Calendar, Sparkles, RefreshCw } from 'lucide-react'

interface DesktopHeaderProps {
  activeTab: NavigationTab
  currentDate: Date
  onDateChange: (date: Date) => void
  onRefresh?: () => void
  loading?: boolean
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  metrics: {
    title: 'Painel Corporativo',
    subtitle: 'Consolidação de saldo, metas, custo de vida e métricas em tempo real.'
  },
  cobrancas: {
    title: 'Cobranças & Dívidas Pessoais',
    subtitle: 'Controle individual de valores a receber e a pagar por pessoa com conciliação e histórico.'
  },
  projection: {
    title: 'Projeção Financeira',
    subtitle: 'Simulação preditiva de saldos e compromissos futuros no tempo.'
  },
  structural: {
    title: 'Custos Fixos & Estrutura',
    subtitle: 'Gestão de despesas recorrentes, serviços essenciais e prioridades.'
  },
  progression: {
    title: 'Extrato Diário Temporal',
    subtitle: 'Evolução diária de saldos operacionais e fluxo de caixa.'
  },
  movements: {
    title: 'Histórico de Movimentações',
    subtitle: 'Auditoria completa de entradas, saídas, reservas e cobranças.'
  },
  calendar: {
    title: 'Google Calendar Sync',
    subtitle: 'Integração de datas de vencimento com sua agenda pessoal.'
  },
  empresa: {
    title: 'Gestão de Recibos & Clientes',
    subtitle: 'Cadastre clientes, emita recibos digitais e gerencie cobranças empresariais.'
  }
}

export function DesktopHeader({ activeTab, currentDate, onDateChange, onRefresh, loading }: DesktopHeaderProps) {
  const current = TAB_TITLES[activeTab] || TAB_TITLES.metrics
  const showMonthSelector = activeTab === 'metrics' || activeTab === 'progression' || activeTab === 'movements'

  return (
    <header className="hidden lg:flex items-center justify-between mb-8 pb-6 border-b border-silver-brushed/10 relative z-10 gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-silver-polished uppercase tracking-tight">
            {current.title}
          </h1>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin shrink-0" />
          )}
        </div>
        <p className="text-xs text-silver-brushed/60 font-medium mt-1">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {showMonthSelector && (
          <div className="scale-95 origin-right">
            <MonthSelector currentDate={currentDate} onChange={onDateChange} />
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-3 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-sm"
            title="Recarregar Dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : 'text-silver-brushed'} />
          </button>
        )}
      </div>
    </header>
  )
}
