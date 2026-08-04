'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FinancialMovement } from '@/types/financial'
import { StructuralExpense } from '@/types/structural'
import { ChargeOccurrence } from '@/types/cobranca'
import { financialService } from '@/services/financialService'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { cobrancasService } from '@/services/cobrancasService'
import { projectionService, ProjectionSummary } from '@/services/projectionService'
import { useAuth } from '@/context/AuthContext'
import { format, addMonths, addYears, endOfYear, startOfDay, parseISO } from 'date-fns'

export function useFinancialProjection() {
  const { user, loading: authLoading } = useAuth()
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [structuralExpenses, setStructuralExpenses] = useState<StructuralExpense[]>([])
  const [chargeOccurrences, setChargeOccurrences] = useState<ChargeOccurrence[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Default start date = Today
  const [startDateStr, setStartDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  // Default end date = 1 Year from today or End of current year
  const [endDateStr, setEndDateStr] = useState<string>(() => format(addMonths(new Date(), 12), 'yyyy-MM-dd'))

  const refreshData = useCallback(async () => {
    if (!user) {
      setMovements([])
      setStructuralExpenses([])
      setChargeOccurrences([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [moves, structs, occurrences] = await Promise.all([
        financialService.getAllMovements(),
        structuralExpensesService.getExpenses(),
        cobrancasService.getOccurrencesByRange(startDateStr, endDateStr)
      ])
      setMovements(moves)
      setStructuralExpenses(structs)
      setChargeOccurrences(occurrences)
      setError(null)
    } catch (err) {
      console.error('Failed to load projection data:', err)
      setError(err instanceof Error ? err : new Error('Falha ao carregar projeção'))
    } finally {
      setLoading(false)
    }
  }, [user, startDateStr, endDateStr])

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      if (authLoading) return
      if (!user) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      try {
        const [moves, structs, occurrences] = await Promise.all([
          financialService.getAllMovements(),
          structuralExpensesService.getExpenses(),
          cobrancasService.getOccurrencesByRange(startDateStr, endDateStr)
        ])
        if (!isMounted) return
        setMovements(moves)
        setStructuralExpenses(structs)
        setChargeOccurrences(occurrences)
        setError(null)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load projection data:', err)
        setError(err instanceof Error ? err : new Error('Falha ao carregar projeção'))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [authLoading, user, startDateStr, endDateStr])

  // Presets handlers
  const setPresetRange = useCallback((preset: '3m' | '6m' | '1y' | '2y' | 'end_of_year') => {
    const today = startOfDay(new Date())
    setStartDateStr(format(today, 'yyyy-MM-dd'))

    switch (preset) {
      case '3m':
        setEndDateStr(format(addMonths(today, 3), 'yyyy-MM-dd'))
        break
      case '6m':
        setEndDateStr(format(addMonths(today, 6), 'yyyy-MM-dd'))
        break
      case '1y':
        setEndDateStr(format(addYears(today, 1), 'yyyy-MM-dd'))
        break
      case '2y':
        setEndDateStr(format(addYears(today, 2), 'yyyy-MM-dd'))
        break
      case 'end_of_year':
        setEndDateStr(format(endOfYear(today), 'yyyy-MM-dd'))
        break
    }
  }, [])

  const projection = useMemo<ProjectionSummary>(() => {
    const startObj = startDateStr ? parseISO(startDateStr) : new Date()
    const endObj = endDateStr ? parseISO(endDateStr) : addMonths(startObj, 6)
    
    return projectionService.calculateProjection(movements, structuralExpenses, startObj, endObj, chargeOccurrences)
  }, [movements, structuralExpenses, chargeOccurrences, startDateStr, endDateStr])

  return {
    loading,
    error,
    movements,
    structuralExpenses,
    startDateStr,
    endDateStr,
    setStartDateStr,
    setEndDateStr,
    setPresetRange,
    projection,
    refreshData
  }
}
