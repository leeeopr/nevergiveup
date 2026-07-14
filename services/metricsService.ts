import { FinancialMovement, MetricSummary } from '@/types/financial'
import { differenceInDays, startOfMonth } from 'date-fns'

const TYPE_COLORS: Record<string, string> = {
  'entrada': '#4ade80',
  'saida_fixa': '#f43f5e', // Rose/Red for fixed outgoing
  'gasto_diario': '#fbbf24', // Amber
  'economia': '#38bdf8', // Cyan
  'cartao': '#a855f7', // Purple
  'cobranca': '#f97316' // Orange
}

export const metricsService = {
  calculateMonthlyMetrics(movements: FinancialMovement[], year: number, month: number, structuralCost?: number): MetricSummary {
    const totals = {
      entrada: 0,
      saida_fixa: 0,
      gasto_diario: 0,
      economia: 0,
      cartao: 0,
      cobranca_paga: 0,
      cobranca_pendente: 0
    }

    movements.forEach(m => {
      const amount = Number(m.amount)
      if (m.type === 'cobranca') {
        if (m.is_paid) {
          totals.cobranca_paga += amount
        } else {
          totals.cobranca_pendente += amount
        }
      } else if (totals.hasOwnProperty(m.type)) {
        totals[m.type as keyof typeof totals] += amount
      }
    })

    // Performance definition: (Real Income + Paid Debts) - (Expenses + Savings)
    const realIncome = totals.entrada + totals.cobranca_paga
    const performance = realIncome - (totals.saida_fixa + totals.gasto_diario + totals.cartao + totals.economia)
    const savingsRate = realIncome > 0 ? (totals.economia / realIncome) * 100 : 0
    const realCostOfLiving = totals.saida_fixa + totals.gasto_diario + totals.cartao
    
    // Projection includes pending cobranças
    const balanceProjection = performance + totals.cobranca_pendente

    const today = new Date()
    const monthStart = startOfMonth(new Date(year, month))
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year
    const daysElapsed = isCurrentMonth 
      ? Math.max(differenceInDays(today, monthStart) + 1, 1)
      : 30

    const dailyAverageReal = totals.gasto_diario / daysElapsed

    // New rules for Estimativa de Gasto Mensal & Orçamento Diário
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const estimativaMensal = structuralCost !== undefined && structuralCost > 0 ? structuralCost : 3000
    const orcamentoDiario = estimativaMensal / daysInMonth

    return {
      performance,
      performanceChange: 0,
      savingsRate,
      savingsAmount: totals.economia,
      realCostOfLiving,
      weeklyCost: orcamentoDiario * 7,
      dailyCost: orcamentoDiario,
      dailyAverageReal,
      dailyAverageChange: 0,
      balanceProjection,
      pendingReceivables: totals.cobranca_pendente,
      receivedAmount: totals.cobranca_paga,
      distribution: [
        { name: 'Fixas', value: totals.saida_fixa, color: TYPE_COLORS.saida_fixa },
        { name: 'Diário', value: totals.gasto_diario, color: TYPE_COLORS.gasto_diario },
        { name: 'Cartão', value: totals.cartao, color: TYPE_COLORS.cartao },
        { name: 'Economia', value: totals.economia, color: TYPE_COLORS.economia },
        { name: 'Cobranças', value: totals.cobranca_pendente, color: TYPE_COLORS.cobranca }
      ].filter(d => d.value > 0),
      estimativaMensal,
      orcamentoDiario
    }
  }
}
