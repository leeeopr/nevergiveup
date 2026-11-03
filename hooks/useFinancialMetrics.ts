import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { financialService } from '@/services/financialService'
import { metricsService } from '@/services/metricsService'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { FinancialMovement } from '@/types/financial'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

export function useFinancialMetrics(year: number, month: number) {
  const { user, loading: authLoading } = useAuth()
  const { currentGroup, loading: groupLoading } = useGroup()
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [structuralCost, setStructuralCost] = useState<number>(0)
  const [personalBudget, setPersonalStateBudget] = useState<number>(1200)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Track last loaded group to detect switches synchronously
  const lastGroupIdRef = useRef<string | null>(null)

  const activeGroupId = currentGroup?.id

  // Synchronously wipe movements when activeGroupId changes to prevent cross-group flashing
  if (lastGroupIdRef.current !== activeGroupId) {
    lastGroupIdRef.current = activeGroupId || null
    if (movements.length > 0) {
      setMovements([])
    }
  }

  // Load group-specific budget
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id && activeGroupId) {
      const key = `personal_budget_${user.id}_${activeGroupId}_${year}_${month}`
      const saved = localStorage.getItem(key)
      setPersonalStateBudget(saved !== null ? Number(saved) : (currentGroup?.settings?.defaultMonthlyBudget || 1200))
    }
  }, [user?.id, activeGroupId, year, month, currentGroup?.settings?.defaultMonthlyBudget])

  const updatePersonalBudget = useCallback((amount: number) => {
    if (!user?.id || !activeGroupId) return
    if (typeof window !== 'undefined') {
      const key = `personal_budget_${user.id}_${activeGroupId}_${year}_${month}`
      localStorage.setItem(key, String(amount))
      setPersonalStateBudget(amount)
    }
  }, [user?.id, activeGroupId, year, month])

  const refresh = useCallback(async () => {
    if (!user) {
      setMovements([])
      setLoading(false)
      return
    }

    if (!activeGroupId) {
      setMovements([])
      setStructuralCost(0)
      setLoading(groupLoading)
      return
    }

    try {
      setLoading(true)
      const data = await financialService.getAllMovements(activeGroupId)
      
      // Guard against race conditions if group changed while fetching
      if (lastGroupIdRef.current === activeGroupId) {
        setMovements(data)

        try {
          const structuralData = await structuralExpensesService.getExpenses(activeGroupId)
          const cost = structuralData.reduce((sum, e) => sum + Number(e.amount), 0)
          setStructuralCost(cost)
        } catch (structErr) {
          console.error('Failed to load structural expenses in metrics hook:', structErr)
        }

        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Refresh failed'))
    } finally {
      setLoading(false)
    }
  }, [user, activeGroupId, groupLoading])

  useEffect(() => {
    if (!authLoading && !groupLoading) {
      refresh()
    }
  }, [refresh, authLoading, groupLoading])

  const metrics = useMemo(() => {
    const targetMovements = movements.length === 0 && !loading ? [] : movements
    return metricsService.calculateMonthlyMetrics(targetMovements, year, month, structuralCost, personalBudget)
  }, [movements, year, month, loading, structuralCost, personalBudget])

  return { movements, metrics, loading, error, refresh, updatePersonalBudget }
}
