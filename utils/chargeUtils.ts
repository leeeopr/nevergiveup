import { Charge, ChargeOccurrence } from '@/types/cobranca'

/**
 * Calculates the total number of days in a given month and year.
 */
export function getDaysInMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

/**
 * Formats year and 0-based month to YYYY-MM string safely without timezone offsets.
 */
export function formatYearMonth(year: number, monthZeroBased: number): string {
  const m = (monthZeroBased + 1).toString().padStart(2, '0')
  return `${year}-${m}`
}

/**
 * Formats date components to YYYY-MM-DD string safely.
 */
export function formatFullDate(year: number, monthZeroBased: number, day: number): string {
  const m = (monthZeroBased + 1).toString().padStart(2, '0')
  const d = day.toString().padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * Generates all expected monthly occurrence definitions for a charge
 * based on start_date, end_date, and billing_day.
 */
export function generateExpectedOccurrences(
  startDateStr: string,
  endDateStr: string,
  billingDay: number,
  amount: number
): { reference_month: string; due_date: string; amount: number }[] {
  if (!startDateStr || !endDateStr) return []

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number)

  if (isNaN(startYear) || isNaN(endYear)) return []

  const results: { reference_month: string; due_date: string; amount: number }[] = []

  let currentYear = startYear
  let currentMonthZero = startMonth - 1 // 0-based

  const endMonthZero = endMonth - 1

  while (
    currentYear < endYear || 
    (currentYear === endYear && currentMonthZero <= endMonthZero)
  ) {
    const maxDays = getDaysInMonth(currentYear, currentMonthZero)
    const targetDay = Math.min(Math.max(1, billingDay), maxDays)
    const dueDate = formatFullDate(currentYear, currentMonthZero, targetDay)
    const refMonth = formatYearMonth(currentYear, currentMonthZero)

    // Check bounds: due_date must fall within start_date and end_date (or month range)
    if (dueDate >= startDateStr && dueDate <= endDateStr) {
      results.push({
        reference_month: refMonth,
        due_date: dueDate,
        amount
      })
    } else if (
      // If the due_date calculated with billingDay fell before startDateStr in the first month,
      // but the month matches start_date's month, keep it with start_date or clamped date
      refMonth === formatYearMonth(startYear, startMonth - 1) && 
      dueDate < startDateStr
    ) {
      results.push({
        reference_month: refMonth,
        due_date: startDateStr,
        amount
      })
    }

    // Advance to next month
    currentMonthZero++
    if (currentMonthZero > 11) {
      currentMonthZero = 0
      currentYear++
    }
  }

  return results
}

/**
 * Calculates summary numbers for a charge's occurrences.
 */
export function calculateChargeStats(occurrences: ChargeOccurrence[] = []) {
  const total = occurrences.length
  let paidCount = 0
  let pendingCount = 0
  let totalAmount = 0
  let totalReceived = 0
  let totalPending = 0

  occurrences.forEach(occ => {
    const amt = Number(occ.amount) || 0
    totalAmount += amt
    if (occ.status === 'paid') {
      paidCount++
      totalReceived += amt
    } else {
      pendingCount++
      totalPending += amt
    }
  })

  return {
    total,
    paidCount,
    pendingCount,
    totalAmount,
    totalReceived,
    totalPending,
    percentPaid: total > 0 ? Math.round((paidCount / total) * 100) : 0
  }
}
