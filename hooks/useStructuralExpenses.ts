import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { StructuralExpense } from '@/types/structural'
import { useAuth } from '@/context/AuthContext'
import { useGroup } from '@/context/GroupContext'

export function useStructuralExpenses() {
  const [expenses, setExpenses] = useState<StructuralExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, loading: authLoading } = useAuth()
  const { currentGroup, loading: groupLoading } = useGroup()
  const activeGroupId = currentGroup?.id

  // Track group change synchronously to prevent cross-group flashing
  const lastGroupIdRef = useRef<string | null>(null)
  if (lastGroupIdRef.current !== activeGroupId) {
    lastGroupIdRef.current = activeGroupId || null
    if (expenses.length > 0) {
      setExpenses([])
    }
  }

  const refresh = useCallback(async () => {
    if (!user || !activeGroupId) {
      setExpenses([])
      setLoading(groupLoading)
      return
    }

    try {
      setLoading(true)
      const data = await structuralExpensesService.getExpenses(activeGroupId)
      if (lastGroupIdRef.current === activeGroupId) {
        setExpenses(data)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Falha ao carregar despesas estruturais'))
    } finally {
      setLoading(false)
    }
  }, [user, activeGroupId, groupLoading])

  useEffect(() => {
    if (!authLoading && !groupLoading) {
      refresh()
    }
  }, [refresh, authLoading, groupLoading])

  const stats = useMemo(() => {
    // Sum all structural costs
    const structuralCost = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    // 30% emergency reserve recommended allocation
    const emergencyReserve = structuralCost * 0.30
    // Recommended Monthly Generation
    const recommendedGeneration = structuralCost + emergencyReserve

    return {
      structuralCost,
      emergencyReserve,
      recommendedGeneration
    }
  }, [expenses])

  const addExpense = async (expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!activeGroupId) {
      throw new Error('Nenhum grupo ativo selecionado.')
    }
    const newItem = await structuralExpensesService.createExpense({
      ...expense,
      group_id: activeGroupId
    }, activeGroupId)
    setExpenses(prev => [newItem, ...prev])
    return newItem
  }

  const updateExpense = async (id: string, updates: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => {
    const updatedItem = await structuralExpensesService.updateExpense(id, updates, activeGroupId)
    setExpenses(prev => prev.map(item => item.id === id ? updatedItem : item))
    return updatedItem
  }

  const deleteExpense = async (id: string) => {
    await structuralExpensesService.deleteExpense(id, activeGroupId)
    setExpenses(prev => prev.filter(item => item.id !== id))
  }

  return {
    expenses,
    stats,
    loading,
    error,
    refresh,
    addExpense,
    updateExpense,
    deleteExpense
  }
}
