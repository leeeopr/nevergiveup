'use client'

import React, { useState } from 'react'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine,
  Dot
} from 'recharts'
import { useFinancialProjection } from '@/hooks/useFinancialProjection'
import { cobrancasService } from '@/services/cobrancasService'
import { DailyProjectionPoint, ProjectionEvent } from '@/services/projectionService'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Wallet, 
  AlertTriangle, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Info,
  Clock,
  Filter,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Counter } from './Counter'

// Custom Dot to highlight days with events on the continuous curve with expanded touch area
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  if (!payload || !payload.hasEvents) {
    return null
  }

  const isIncome = payload.primaryEventType === 'entrada'
  const fill = isIncome ? '#10b981' : '#f43f5e'
  const stroke = isIncome ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'

  return (
    <g className="cursor-pointer">
      {/* Invisible expanded touch hit target (min 28px diameter for touch) */}
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={7} fill={stroke} />
      <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#09090b" strokeWidth={1.5} className="transition-all duration-200 hover:r-6" />
    </g>
  )
}

// Custom Tooltip according to exact specification
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  const point: DailyProjectionPoint = payload[0].payload
  if (!point) return null

  return (
    <div className="bg-zinc-950/95 border border-silver-brushed/20 rounded-2xl p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-w-[280px] sm:max-w-sm backdrop-blur-md text-silver-polished z-50 pointer-events-auto">
      {/* Date Header & Current Balance */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5 gap-2 sm:gap-4">
        <div>
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Data</span>
          <p className="text-xs font-black text-silver-polished flex items-center gap-1 mt-0.5">
            <Calendar size={12} className="text-silver-brushed/50 shrink-0" />
            {point.formattedDate}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Saldo na Data</span>
          <p className={`text-xs sm:text-sm font-black tracking-tight ${point.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            R$ {point.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Events List */}
      {point.events && point.events.length > 0 ? (
        <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-silver-brushed/40 mb-1">
            {point.events.length} Movimentação{point.events.length > 1 ? 'ões' : ''} no dia:
          </p>
          {point.events.map((evt: ProjectionEvent, idx: number) => (
            <div 
              key={`${evt.id}-${idx}`}
              className="bg-black/60 border border-white/10 rounded-xl p-2 sm:p-2.5 flex flex-col gap-1 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-silver-polished truncate max-w-[140px] sm:max-w-[170px]" title={evt.description}>
                  {evt.description}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                  evt.isIncoming 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}>
                  {evt.isIncoming ? '+ Entrada' : '- Saída'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/5 mt-0.5">
                <span className="text-silver-brushed/40 font-medium">Valor:</span>
                <span className={`font-black ${evt.isIncoming ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {evt.isIncoming ? '+' : '-'} R$ {evt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <span className="text-silver-brushed/40 font-medium">Saldo após:</span>
                <span className="font-black text-silver-polished">
                  R$ {evt.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-1.5 text-center text-[10px] text-silver-brushed/40 font-medium italic">
          Sem movimentações agendadas neste dia.
        </div>
      )}
    </div>
  )
}

export function FinancialProjectionTab() {
  const {
    loading,
    error,
    startDateStr,
    endDateStr,
    setStartDateStr,
    setEndDateStr,
    setPresetRange,
    projection,
    refreshData
  } = useFinancialProjection()

  const [activePreset, setActivePreset] = useState<'3m' | '6m' | '1y' | '2y' | 'end_of_year' | 'custom'>('1y')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [confirmingOccId, setConfirmingOccId] = useState<string | null>(null)

  const handleConfirmOccurrence = async (occId: string) => {
    try {
      setConfirmingOccId(occId)
      await cobrancasService.updateOccurrenceStatus(occId, 'paid')
      await refreshData()
    } catch (err) {
      console.error('Failed to confirm occurrence payment from projection:', err)
    } finally {
      setConfirmingOccId(null)
    }
  }

  const handlePreset = (preset: '3m' | '6m' | '1y' | '2y' | 'end_of_year') => {
    setActivePreset(preset)
    setPresetRange(preset)
  }

  // Filtered event points for the detail table below chart
  const allEventsList = React.useMemo(() => {
    const list: ProjectionEvent[] = []
    projection.points.forEach(pt => {
      pt.events.forEach(e => {
        if (filterType === 'income' && !e.isIncoming) return
        if (filterType === 'expense' && e.isIncoming) return
        list.push(e)
      })
    })
    return list
  }, [projection.points, filterType])

  // Calculate chart minimum width for smooth touch scrolling on long ranges
  const minChartWidth = React.useMemo(() => {
    if (!projection.points || projection.points.length === 0) return '100%'
    // If more than 30 points, allow 12px per point so ticks aren't squished
    const calculated = projection.points.length * 12
    return calculated > 600 ? `${calculated}px` : '100%'
  }, [projection.points])

  return (
    <div className="space-y-6 sm:space-y-8 pb-36 sm:pb-40 w-full max-w-none px-1 sm:px-0">
      {/* HEADER HERO BANNER */}
      <div className="wood-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-silver-brushed/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-500/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-silver-brushed/10 border border-silver-brushed/20 text-silver-polished text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 sm:mb-3">
              <Sparkles size={11} className="text-amber-400 shrink-0" />
              Motor de Projeção Inteligente
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-silver-polished tracking-tight uppercase leading-snug">
              Projeção Financeira
            </h1>
            <p className="text-xs sm:text-sm text-silver-brushed/50 font-medium mt-1 max-w-2xl leading-relaxed">
              &quot;Se eu continuar assim, como estará meu dinheiro nos próximos meses?&quot;
            </p>
          </div>

          <button
            onClick={refreshData}
            disabled={loading}
            aria-label="Recalcular Projeção Financeira"
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-silver-brushed/10 hover:bg-silver-brushed/20 active:scale-95 text-silver-polished border border-silver-brushed/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber-400' : 'text-silver-brushed'} />
            Recalcular Projeção
          </button>
        </div>
      </div>

      {/* DATE RANGE SELECTORS & PRESETS BAR */}
      <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-silver-brushed/60 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-silver-polished">Período de Simulação</span>
          </div>

          {/* Quick Preset Buttons (Scrollable or wrap on small screens, touch target min 40px) */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1.5 sm:pb-0 -mx-1 px-1 max-w-full">
            {[
              { id: '3m', label: '3 Meses' },
              { id: '6m', label: '6 Meses' },
              { id: '1y', label: '1 Ano' },
              { id: '2y', label: '2 Anos' },
              { id: 'end_of_year', label: 'Até Fim do Ano' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.id as any)}
                aria-label={`Projetar para ${preset.label}`}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePreset === preset.id
                    ? 'bg-silver-brushed text-velvet-deep shadow-md font-bold'
                    : 'bg-black/40 text-silver-brushed/60 hover:text-silver-polished border border-white/5 hover:bg-white/5'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs for Manual Custom Dates - Stacks on Mobile, side by side on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <label htmlFor="proj-start-date" className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">
              Data Inicial (Hoje)
            </label>
            <input
              id="proj-start-date"
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setActivePreset('custom')
                setStartDateStr(e.target.value)
              }}
              className="bg-transparent text-silver-polished text-sm font-bold outline-none cursor-pointer [color-scheme:dark] min-h-[40px] w-full"
            />
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
            <label htmlFor="proj-end-date" className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">
              Data Final (Futura)
            </label>
            <input
              id="proj-end-date"
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setActivePreset('custom')
                setEndDateStr(e.target.value)
              }}
              className="bg-transparent text-silver-polished text-sm font-bold outline-none cursor-pointer [color-scheme:dark] min-h-[40px] w-full"
            />
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS: 1 col on mobile, 2 col on tablet, 4 col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Final Balance */}
        <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Saldo Previsto Final</span>
            <Wallet size={14} className="text-silver-brushed/40 shrink-0" />
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tighter break-words ${projection.finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className="text-xs opacity-40 mr-1">R$</span>
            <Counter value={projection.finalBalance} prefix="" />
          </div>
          <p className="text-[9px] text-silver-brushed/40 font-semibold mt-2 flex items-center gap-1 flex-wrap">
            {projection.netChange >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5"><ArrowUpRight size={10} /> +R$ {projection.netChange.toFixed(2)}</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5"><ArrowDownRight size={10} /> -R$ {Math.abs(projection.netChange).toFixed(2)}</span>
            )}
            no período
          </p>
        </div>

        {/* Min Projected Balance */}
        <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Menor Saldo Previsto</span>
            <AlertTriangle size={14} className={projection.minBalance < 0 ? 'text-rose-500 shrink-0' : 'text-amber-400/60 shrink-0'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tighter break-words ${projection.minBalance < 0 ? 'text-rose-400' : 'text-silver-polished'}`}>
            <span className="text-xs opacity-40 mr-1">R$</span>
            <Counter value={projection.minBalance} prefix="" />
          </div>
          <p className="text-[9px] text-silver-brushed/40 font-semibold mt-2">Ponto mais baixo da curva</p>
        </div>

        {/* Total Incomes */}
        <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Entradas Previstas</span>
            <TrendingUp size={14} className="text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tighter text-emerald-400 break-words">
            <span className="text-xs opacity-40 mr-1">R$</span>
            <Counter value={projection.totalIncomes} prefix="" />
          </div>
          <p className="text-[9px] text-silver-brushed/40 font-semibold mt-2">Salários + Receitas</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40">Saídas Previstas</span>
            <TrendingDown size={14} className="text-rose-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-tighter text-rose-400 break-words">
            <span className="text-xs opacity-40 mr-1">R$</span>
            <Counter value={projection.totalExpenses} prefix="" />
          </div>
          <p className="text-[9px] text-silver-brushed/40 font-semibold mt-2">Fixas + Estruturais + Agendadas</p>
        </div>
      </div>

      {/* LINE CHART CONTAINER */}
      <div className="wood-panel border border-silver-brushed/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-silver-polished tracking-tight uppercase flex items-center gap-2">
              Evolução da Curva de Saldo
            </h3>
            <p className="text-[10px] text-silver-brushed/50 font-medium mt-0.5 leading-relaxed">
              Toque ou passe o mouse nos pontos destacados para detalhar movimentações.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[9px] sm:text-[10px] font-bold text-silver-brushed/60 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0" />
              Entrada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
              Saída
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-silver-polished inline-block shrink-0" />
              Saldo Previsto
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] sm:h-[380px] w-full flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-silver-brushed/10 border-t-silver-brushed rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-silver-brushed/40">Calculando trajetória financeira...</p>
          </div>
        ) : projection.points.length === 0 ? (
          <div className="h-[300px] sm:h-[380px] w-full flex flex-col items-center justify-center text-center p-6">
            <Info size={32} className="text-silver-brushed/20 mb-3" />
            <p className="text-xs font-bold text-silver-polished uppercase tracking-wider">Nenhum dado para o período selecionado</p>
            <p className="text-[10px] text-silver-brushed/40 mt-1 max-w-sm">Ajuste os seletores de data inicial e final para visualizar a curva de saldo.</p>
          </div>
        ) : (
          /* Smooth horizontal scroll container for mobile touch when chart has many points */
          <div className="w-full overflow-x-auto custom-scrollbar pb-2 touch-pan-x">
            <div className="h-[320px] sm:h-[400px] lg:h-[440px] relative" style={{ minWidth: minChartWidth }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projection.points}
                  margin={{ top: 15, right: 15, left: -10, bottom: 15 }}
                >
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f8fafc" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f8fafc" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <XAxis 
                    dataKey="monthYear" 
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    minTickGap={25}
                  />

                  <YAxis 
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={(val) => {
                      if (Math.abs(val) >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`
                      return `R$ ${val}`
                    }}
                    width={50}
                  />

                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    trigger="click"
                  />

                  <ReferenceLine y={0} stroke="rgba(244,63,94,0.4)" strokeDasharray="3 3" />

                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#e2e8f0"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#balanceGradient)"
                    dot={<CustomDot />}
                    activeDot={{ r: 8, fill: '#ffffff', stroke: '#09090b', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* EVENT CHRONOLOGY TABLE / LIST */}
      <div className="bg-velvet-deep border border-silver-brushed/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-silver-polished tracking-tight uppercase flex items-center gap-2">
              Cronograma de Eventos ({allEventsList.length})
            </h3>
            <p className="text-[10px] text-silver-brushed/50 font-medium mt-0.5">
              Lista detalhada das movimentações futuras que compõem a curva.
            </p>
          </div>

          {/* Filter Buttons with Touch min size */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              aria-label="Filtrar todas as movimentações"
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-silver-brushed text-velvet-deep font-bold shadow-md'
                  : 'bg-black/40 text-silver-brushed/50 hover:text-silver-polished border border-white/5'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('income')}
              aria-label="Filtrar entradas"
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'income'
                  ? 'bg-emerald-500 text-black font-bold shadow-md'
                  : 'bg-black/40 text-silver-brushed/50 hover:text-silver-polished border border-white/5'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              aria-label="Filtrar saídas"
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'expense'
                  ? 'bg-rose-500 text-white font-bold shadow-md'
                  : 'bg-black/40 text-silver-brushed/50 hover:text-silver-polished border border-white/5'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        {allEventsList.length === 0 ? (
          <div className="text-center py-10 text-[11px] text-silver-brushed/40 font-medium">
            Nenhuma movimentação encontrada para o filtro selecionado no período.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            {allEventsList.map((evt, index) => (
              <div 
                key={`${evt.id}-${index}`}
                className="py-3 px-1.5 sm:px-2 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/[0.02] rounded-xl transition-colors gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                    evt.isIncoming 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {evt.isIncoming ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-silver-polished break-words line-clamp-2">
                      {evt.description}
                    </p>
                    <span className="text-[9px] text-silver-brushed/50 font-semibold uppercase tracking-wider block mt-0.5">
                      {evt.typeLabel} • {evt.formattedDate}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-white/5 pl-11 sm:pl-0 gap-1.5">
                  <p className={`text-xs sm:text-sm font-black tracking-tight ${evt.isIncoming ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {evt.isIncoming ? '+' : '-'} R$ {evt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  
                  {evt.occurrenceId && evt.status === 'pending' && (
                    <button
                      onClick={() => handleConfirmOccurrence(evt.occurrenceId!)}
                      disabled={confirmingOccId === evt.occurrenceId}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                      title="Confirmar pagamento desta cobrança"
                    >
                      {confirmingOccId === evt.occurrenceId ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={10} />
                      )}
                      <span>Confirmar Pago</span>
                    </button>
                  )}

                  <p className="text-[9px] text-silver-brushed/40 font-medium">
                    Saldo: R$ {evt.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

