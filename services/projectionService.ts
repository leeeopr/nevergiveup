import { FinancialMovement } from '@/types/financial'
import { StructuralExpense } from '@/types/structural'
import { ChargeOccurrence } from '@/types/cobranca'
import { RecurrenceEngine } from './RecurrenceEngine'
import { 
  format, 
  parseISO, 
  startOfDay, 
  subDays, 
  eachDayOfInterval, 
  addMonths, 
  isSameDay, 
  isAfter, 
  isBefore,
  eachMonthOfInterval
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface ProjectionEvent {
  id: string
  description: string
  type: string
  typeLabel: string
  amount: number
  isIncoming: boolean
  date: string // YYYY-MM-DD
  formattedDate: string // DD/MM/YYYY
  balanceAfter: number
  // Charge Occurrence metadata
  chargeId?: string
  referenceMonth?: string
  status?: 'pending' | 'paid'
  occurrenceId?: string
}

export interface DailyProjectionPoint {
  date: string // YYYY-MM-DD
  formattedDate: string // DD/MM/YYYY
  shortDate: string // DD/MM
  monthYear: string // MMM/YY
  balance: number
  dailyImpact: number
  hasEvents: boolean
  events: ProjectionEvent[]
  // Recharts custom dot rendering helpers
  primaryEventType?: 'entrada' | 'saida' | 'neutral'
}

export interface ProjectionSummary {
  startDate: string
  endDate: string
  initialBalance: number
  finalBalance: number
  minBalance: number
  maxBalance: number
  netChange: number
  totalIncomes: number
  totalExpenses: number
  points: DailyProjectionPoint[]
  eventPoints: DailyProjectionPoint[]
}

const TYPE_LABELS: Record<string, { label: string; isIncoming: boolean }> = {
  'entrada': { label: 'Entrada / Receita', isIncoming: true },
  'saida_fixa': { label: 'Despesa / Custo Fixo', isIncoming: false },
  'gasto_diario': { label: 'Gasto Diário', isIncoming: false },
  'economia': { label: 'Reserva / Economia', isIncoming: false },
  'cartao': { label: 'Cartão de Crédito', isIncoming: false },
  'cobranca': { label: 'Cobrança Recorrente', isIncoming: true },
  'custo_estrutural': { label: 'Custo Estrutural', isIncoming: false }
}

export const projectionService = {
  calculateProjection(
    allMovements: FinancialMovement[],
    structuralExpenses: StructuralExpense[],
    startDate: Date,
    endDate: Date,
    chargeOccurrences: ChargeOccurrence[] = []
  ): ProjectionSummary {
    const rangeStart = startOfDay(startDate)
    const rangeEnd = startOfDay(endDate)

    // Ensure valid interval
    const actualEnd = isBefore(rangeEnd, rangeStart) ? addMonths(rangeStart, 6) : rangeEnd

    // 1. Calculate opening balance as of the day before startDate
    const dayBeforeStart = subDays(rangeStart, 1)
    const initialBalance = RecurrenceEngine.getAccumulatedImpact(allMovements, dayBeforeStart)

    // 2. Virtually expand all recurring financial movements over the date range (excluding old generic cobranca virtuals)
    const filteredMovements = allMovements.filter(m => m.type !== 'cobranca')
    const expandedMovements = RecurrenceEngine.expandMovements(filteredMovements, rangeStart, actualEnd)

    // 3. Create virtual movements for structural expenses across the projection range
    const structuralVirtualMovements: FinancialMovement[] = []
    if (structuralExpenses.length > 0) {
      const monthsInRange = eachMonthOfInterval({ start: rangeStart, end: actualEnd })
      
      monthsInRange.forEach(monthDate => {
        structuralExpenses.forEach(exp => {
          const expDateStr = format(monthDate, 'yyyy-MM-05')
          const expDateObj = parseISO(expDateStr)

          if (!isBefore(expDateObj, rangeStart) && !isAfter(expDateObj, actualEnd)) {
            const existsInMovements = expandedMovements.some(
              m => m.date === expDateStr && m.description.toLowerCase().includes(exp.title.toLowerCase())
            )

            if (!existsInMovements) {
              structuralVirtualMovements.push({
                id: `struct-virt-${exp.id}-${format(monthDate, 'yyyy-MM')}`,
                created_at: new Date().toISOString(),
                date: expDateStr,
                type: 'saida_fixa',
                amount: Number(exp.amount),
                description: `[Custo Estrutural] ${exp.title}`,
                tag: exp.category,
                is_recurring: true,
                is_virtual: true,
                user_id: exp.user_id || 'local-user-id'
              })
            }
          }
        })
      })
    }

    // 4. Incorporate real charge occurrences into projection
    const chargeOccurrenceVirtualMovements: (FinancialMovement & { chargeId?: string; referenceMonth?: string; status?: 'pending' | 'paid'; occurrenceId?: string })[] = []
    
    chargeOccurrences.forEach(occ => {
      const occDateObj = parseISO(occ.due_date)
      if (!isBefore(occDateObj, rangeStart) && !isAfter(occDateObj, actualEnd)) {
        // If occurrence is already paid and has a financial_movement_id in allMovements, don't duplicate
        const isAlreadyInMovements = occ.status === 'paid' && allMovements.some(m => m.id === occ.financial_movement_id)

        if (!isAlreadyInMovements) {
          chargeOccurrenceVirtualMovements.push({
            id: occ.id,
            created_at: occ.created_at || new Date().toISOString(),
            date: occ.due_date,
            type: 'cobranca',
            amount: Number(occ.amount),
            description: `[Cobrança] ${occ.charge_description || 'Mensalidade'} - ${occ.client_name || 'Cliente'} (${occ.reference_month})`,
            tag: 'Cobrança',
            is_recurring: false,
            is_virtual: true,
            is_paid: occ.status === 'paid',
            user_id: occ.user_id || 'local-user-id',
            chargeId: occ.charge_id,
            referenceMonth: occ.reference_month,
            status: occ.status,
            occurrenceId: occ.id
          })
        }
      }
    })

    // Combine all movements
    const combinedMovements = [...expandedMovements, ...structuralVirtualMovements, ...chargeOccurrenceVirtualMovements]

    // Group movements by YYYY-MM-DD
    const groupedByDate: Record<string, typeof combinedMovements> = {}
    combinedMovements.forEach(m => {
      const dateKey = m.date
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = []
      groupedByDate[dateKey].push(m)
    })

    // 5. Generate day-by-day points
    const days = eachDayOfInterval({ start: rangeStart, end: actualEnd })
    let currentBalance = initialBalance
    let minBalance = initialBalance
    let maxBalance = initialBalance
    let totalIncomes = 0
    let totalExpenses = 0

    const points: DailyProjectionPoint[] = days.map(dayObj => {
      const dateKey = format(dayObj, 'yyyy-MM-dd')
      const formattedDate = format(dayObj, 'dd/MM/yyyy')
      const shortDate = format(dayObj, 'dd/MM')
      const monthYear = format(dayObj, 'MMM/yy', { locale: ptBR }).toUpperCase()

      const dayMovements = groupedByDate[dateKey] || []
      let dailyImpact = 0
      const events: ProjectionEvent[] = []
      let hasIncoming = false
      let hasOutgoing = false

      dayMovements.forEach(m => {
        const amount = Number(m.amount) || 0
        const isIncoming = Boolean(m.type === 'entrada' || m.type === 'cobranca')
        
        if (isIncoming) {
          dailyImpact += amount
          totalIncomes += amount
          hasIncoming = true
        } else {
          dailyImpact -= amount
          totalExpenses += amount
          hasOutgoing = true
        }

        const typeInfo = TYPE_LABELS[m.type] || { label: m.type, isIncoming }

        events.push({
          id: m.id,
          description: m.description || m.tag || 'Movimentação',
          type: m.type,
          typeLabel: typeInfo.label,
          amount,
          isIncoming,
          date: dateKey,
          formattedDate,
          balanceAfter: 0,
          chargeId: (m as any).chargeId,
          referenceMonth: (m as any).referenceMonth,
          status: (m as any).status,
          occurrenceId: (m as any).occurrenceId
        })
      })

      currentBalance += dailyImpact
      
      events.forEach(e => {
        e.balanceAfter = currentBalance
      })

      if (currentBalance < minBalance) minBalance = currentBalance
      if (currentBalance > maxBalance) maxBalance = currentBalance

      let primaryEventType: 'entrada' | 'saida' | 'neutral' = 'neutral'
      if (hasIncoming && !hasOutgoing) primaryEventType = 'entrada'
      else if (hasOutgoing && !hasIncoming) primaryEventType = 'saida'
      else if (hasIncoming && hasOutgoing) primaryEventType = 'entrada'

      return {
        date: dateKey,
        formattedDate,
        shortDate,
        monthYear,
        balance: currentBalance,
        dailyImpact,
        hasEvents: events.length > 0,
        events,
        primaryEventType
      }
    })

    const eventPoints = points.filter(p => p.hasEvents)

    return {
      startDate: format(rangeStart, 'yyyy-MM-dd'),
      endDate: format(actualEnd, 'yyyy-MM-dd'),
      initialBalance,
      finalBalance: currentBalance,
      minBalance,
      maxBalance,
      netChange: currentBalance - initialBalance,
      totalIncomes,
      totalExpenses,
      points,
      eventPoints
    }
  }
}

