import { FinancialMovement, MovementType } from '@/types/financial'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RecurrenceEngine } from './RecurrenceEngine'

const TYPE_PRIORITY: Record<string, number> = {
  'entrada': 1,
  'saida_fixa': 2,
  'gasto_diario': 3,
  'economia': 4,
  'cartao': 5,
  'cobranca': 6
}

export interface DailyProgression {
  date: string;
  dayNumber: string;
  weekDay: string;
  monthLabel: string;
  movements: FinancialMovement[];
  categoryTotals: {
    entrada: number;
    saida_fixa: number;
    gasto_diario: number;
    economia: number;
    cartao: number;
    cobranca: number;
  };
  dailyBalance: number;
  rollingBalance: number;
}

export const RollingBalanceEngine = {
  calculateDailyProgression(movements: FinancialMovement[], targetMonth: Date): DailyProgression[] {
    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)
    
    // 1. Expand all recurring movements for the target month
    const expandedMovements = RecurrenceEngine.expandMovements(movements, start, end)
    
    // 2. Generate all days for the target month
    const allDays = eachDayOfInterval({ start, end })
    
    // 3. Group expanded movements by date for efficient lookup
    const grouped: Record<string, FinancialMovement[]> = {}
    expandedMovements.forEach(m => {
      const dateKey = m.date
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(m)
    })

    // 4. Calculate Opening Balance
    // We need the accumulated impact of ALL movements (real and virtual) 
    // that happened BEFORE the first day of this month.
    const dayBeforeStart = subDays(start, 1)
    let cumulativeBalance = RecurrenceEngine.getAccumulatedImpact(movements, dayBeforeStart)

    const progression: DailyProgression[] = allDays.map(dayDate => {
      const dateKey = format(dayDate, 'yyyy-MM-dd')
      const dayMovements = (grouped[dateKey] || []).sort((a, b) => 
        (TYPE_PRIORITY[a.type] || 99) - (TYPE_PRIORITY[b.type] || 99)
      )

      const categoryTotals = {
        entrada: 0,
        saida_fixa: 0,
        gasto_diario: 0,
        economia: 0,
        cartao: 0,
        cobranca: 0
      }

      let financialImpact = 0

      dayMovements.forEach(m => {
        const amount = Number(m.amount)
        if (m.type === 'entrada') {
          categoryTotals.entrada += amount
          financialImpact += amount
        } else if (m.type === 'saida_fixa') {
          categoryTotals.saida_fixa += amount
          financialImpact -= amount
        } else if (m.type === 'gasto_diario') {
          categoryTotals.gasto_diario += amount
          financialImpact -= amount
        } else if (m.type === 'economia') {
          categoryTotals.economia += amount
          financialImpact -= amount
        } else if (m.type === 'cartao') {
          categoryTotals.cartao += amount
          financialImpact -= amount
        } else if (m.type === 'cobranca') {
          categoryTotals.cobranca += amount
          if (m.is_paid) {
            financialImpact += amount
          }
        }
      })

      cumulativeBalance += financialImpact

      return {
        date: dateKey,
        dayNumber: format(dayDate, 'dd'),
        weekDay: format(dayDate, 'EEE', { locale: ptBR }).toUpperCase(),
        monthLabel: format(dayDate, 'MMM', { locale: ptBR }).toUpperCase(),
        movements: dayMovements,
        categoryTotals,
        dailyBalance: financialImpact,
        rollingBalance: cumulativeBalance
      }
    })

    return progression
  }
}
