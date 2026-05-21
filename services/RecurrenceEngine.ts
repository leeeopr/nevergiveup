import { FinancialMovement, RecurrenceType } from '@/types/financial'
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  isBefore, 
  isAfter, 
  isSameDay, 
  parseISO, 
  format,
  startOfDay
} from 'date-fns'

export const RecurrenceEngine = {
  /**
   * Virtually expands a list of movements based on their recurrence rules
   * within a specific date range.
   */
  expandMovements(movements: FinancialMovement[], startDate: Date, endDate: Date): FinancialMovement[] {
    const allMovements: FinancialMovement[] = []
    const rangeStart = startOfDay(startDate)
    const rangeEnd = startOfDay(endDate)

    movements.forEach(movement => {
      // 1. Add the original movement if it's within range
      const movementDate = startOfDay(parseISO(movement.date))
      if (!isBefore(movementDate, rangeStart) && !isAfter(movementDate, rangeEnd)) {
        allMovements.push({ ...movement, is_virtual: false })
      }

      // 2. If not recurring, we're done with this movement
      if (!movement.is_recurring || !movement.recurrence_type) return

      // 3. Generate virtual instances
      let currentInstanceDate = movementDate
      const recurrenceEnd = movement.recurrence_end_date 
        ? startOfDay(parseISO(movement.recurrence_end_date)) 
        : rangeEnd

      // Limit expansion to a reasonable future (e.g., 2 years) to prevent infinite loops
      const maxSafetyEnd = addYears(rangeEnd, 2)
      const expansionLimit = isBefore(recurrenceEnd, maxSafetyEnd) ? recurrenceEnd : maxSafetyEnd

      while (true) {
        currentInstanceDate = this.getNextInstanceDate(
          currentInstanceDate, 
          movement.recurrence_type, 
          movement.recurrence_interval || 1
        )

        // Stop if we passed the recurrence end or the requested range end
        if (isAfter(currentInstanceDate, expansionLimit) || isAfter(currentInstanceDate, rangeEnd)) {
          break
        }

        // Add virtual movement if it falls within the requested range
        if (!isBefore(currentInstanceDate, rangeStart)) {
          allMovements.push({
            ...movement,
            id: `${movement.id}-virt-${format(currentInstanceDate, 'yyyy-MM-dd')}`,
            date: format(currentInstanceDate, 'yyyy-MM-dd'),
            is_virtual: true,
            parent_id: movement.id
          })
        }
      }
    })

    return allMovements
  },

  /**
   * Calculates the total balance impact of all movements (real and recurring virtuals)
   * from their creation until a specific date.
   */
  getAccumulatedImpact(movements: FinancialMovement[], untilDate: Date): number {
    let total = 0
    const limit = startOfDay(untilDate)

    movements.forEach(movement => {
      const movementDate = startOfDay(parseISO(movement.date))
      
      // Stop if the first occurrence is after the limit
      if (isAfter(movementDate, limit) && !isSameDay(movementDate, limit)) return

      // Add the first occurrence impact
      const amount = Number(movement.amount)
      if (movement.type === 'entrada') {
        total += amount
      } else if (movement.type === 'cobranca') {
        if (movement.is_paid) total += amount
      } else {
        total -= amount
      }

      if (!movement.is_recurring || !movement.recurrence_type) return

      // Add virtual instances
      let currentInstanceDate = movementDate
      const recurrenceEnd = movement.recurrence_end_date 
        ? startOfDay(parseISO(movement.recurrence_end_date)) 
        : limit

      // Security check: don't calculate for more than 10 years
      const maxSafetyEnd = addYears(movementDate, 10)
      const expansionLimit = isBefore(recurrenceEnd, maxSafetyEnd) ? recurrenceEnd : maxSafetyEnd
      const finalLimit = isBefore(expansionLimit, limit) ? expansionLimit : limit

      while (true) {
        currentInstanceDate = this.getNextInstanceDate(
          currentInstanceDate, 
          movement.recurrence_type, 
          movement.recurrence_interval || 1
        )

        if (isAfter(currentInstanceDate, finalLimit)) break

        // Virtual instances of 'cobranca' are assumed pending/unpaid by default
        if (movement.type === 'entrada') {
          total += amount
        } else if (movement.type === 'cobranca') {
          // Virtual ones are never "pre-paid"
        } else {
          total -= amount
        }
      }
    })

    return total
  },

  getNextInstanceDate(current: Date, type: RecurrenceType, interval: number): Date {
    switch (type) {
      case 'diaria':
        return addDays(current, 1)
      case 'semanal':
        return addWeeks(current, 1)
      case 'quinzenal':
        return addDays(current, 14)
      case 'mensal':
        return addMonths(current, 1)
      case 'bimestral':
        return addMonths(current, 2)
      case 'trimestral':
        return addMonths(current, 3)
      case 'semestral':
        return addMonths(current, 6)
      case 'anual':
        return addYears(current, 1)
      case 'personalizada':
        return addDays(current, interval)
      default:
        return addDays(current, 1)
    }
  }
}
