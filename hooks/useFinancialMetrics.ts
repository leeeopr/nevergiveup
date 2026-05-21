import { useState, useEffect, useMemo, useCallback } from 'react'
import { financialService } from '@/services/financialService'
import { metricsService } from '@/services/metricsService'
import { FinancialMovement, MetricSummary } from '@/types/financial'
import { useAuth } from '@/context/AuthContext'

export function useFinancialMetrics(year: number, month: number) {
  const [movements, setMovements] = useState<FinancialMovement[]>([])
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
      return metricsService.calculateMonthlyMetrics([], year, month)
    }
    return metricsService.calculateMonthlyMetrics(movements, year, month)
  }, [movements, year, month, loading])

  return { movements, metrics, loading, error, refresh }
}
