import { useState, useEffect, useMemo, useCallback } from 'react'
import { financialService } from '@/services/financialService'
import { metricsService } from '@/services/metricsService'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { FinancialMovement } from '@/types/financial'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

export function useFinancialMetrics(year: number, month: number) {
  const { user, loading: authLoading } = useAuth()
  const { currentGroup } = useGroup()
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [structuralCost, setStructuralCost] = useState<number>(0)
  const [personalBudget, setPersonalStateBudget] = useState<number>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const gId = currentGroup?.id || 'default'
      const key = `personal_budget_${user.id}_${gId}_${year}_${month}`
      const saved = localStorage.getItem(key)
      return saved !== null ? Number(saved) : 1200
    }
    return 1200
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const updatePersonalBudget = useCallback((amount: number) => {
    if (!user?.id) return
    if (typeof window !== 'undefined') {
      const gId = currentGroup?.id || 'default'
      const key = `personal_budget_${user.id}_${gId}_${year}_${month}`
      localStorage.setItem(key, String(amount))
      setPersonalStateBudget(amount)
    }
  }, [user, currentGroup?.id, year, month, setPersonalStateBudget])

  const refresh = useCallback(async () => {
    if (!user) {
      setMovements([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await financialService.getAllMovements(currentGroup?.id)
      setMovements(data)

      try {
        const structuralData = await structuralExpensesService.getExpenses(currentGroup?.id)
        const cost = structuralData.reduce((sum, e) => sum + Number(e.amount), 0)
        setStructuralCost(cost)
      } catch (structErr) {
        console.error('Failed to load structural expenses in metrics hook:', structErr)
      }

      // Load budget inside the async refresh flow
      if (typeof window !== 'undefined') {
        const gId = currentGroup?.id || 'default'
        const key = `personal_budget_${user.id}_${gId}_${year}_${month}`
        const saved = localStorage.getItem(key)
        setPersonalStateBudget(saved !== null ? Number(saved) : 1200)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Refresh failed'))
    } finally {
      setLoading(false)
    }
  }, [user, currentGroup?.id, year, month, setMovements, setLoading, setStructuralCost, setPersonalStateBudget, setError])

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh()
    }
  }, [refresh, authLoading])

  const metrics = useMemo(() => {
    const targetMovements = movements.length === 0 && !loading ? [] : movements
    return metricsService.calculateMonthlyMetrics(targetMovements, year, month, structuralCost, personalBudget)
  }, [movements, year, month, loading, structuralCost, personalBudget])

  return { movements, metrics, loading, error, refresh, updatePersonalBudget }
}
