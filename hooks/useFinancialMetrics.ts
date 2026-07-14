import { useState, useEffect, useMemo, useCallback } from 'react'
import { financialService } from '@/services/financialService'
import { metricsService } from '@/services/metricsService'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { FinancialMovement, MetricSummary } from '@/types/financial'
import { useAuth } from '@/context/AuthContext'

export function useFinancialMetrics(year: number, month: number) {
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [structuralCost, setStructuralCost] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, loading: authLoading } = useAuth()

  const refresh = useCallback(async () => {
    if (!user) {
      setMovements([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await financialService.getAllMovements()
      setMovements(data)

      try {
        const structuralData = await structuralExpensesService.getExpenses()
        const cost = structuralData.reduce((sum, e) => sum + Number(e.amount), 0)
        setStructuralCost(cost)
      } catch (structErr) {
        console.error('Failed to load structural expenses in metrics hook:', structErr)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Refresh failed'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh()
    }
  }, [refresh, authLoading])

  const metrics = useMemo(() => {
    if (movements.length === 0 && !loading) {
      return metricsService.calculateMonthlyMetrics([], year, month, structuralCost)
    }
    return metricsService.calculateMonthlyMetrics(movements, year, month, structuralCost)
  }, [movements, year, month, loading, structuralCost])

  return { movements, metrics, loading, error, refresh }
}
