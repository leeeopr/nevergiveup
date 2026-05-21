import { useState, useEffect, useMemo, useCallback } from 'react'
import { structuralExpensesService } from '@/services/structuralExpensesService'
import { StructuralExpense } from '@/types/structural'
import { useAuth } from '@/context/AuthContext'

export function useStructuralExpenses() {
  const [expenses, setExpenses] = useState<StructuralExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, loading: authLoading } = useAuth()

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await structuralExpensesService.getExpenses()
      setExpenses(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Falha ao carregar despesas estruturais'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh()
    }
  }, [refresh, authLoading])

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
    const newItem = await structuralExpensesService.createExpense(expense)
    setExpenses(prev => [newItem, ...prev])
    return newItem
  }

  const updateExpense = async (id: string, updates: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => {
    const updatedItem = await structuralExpensesService.updateExpense(id, updates)
    setExpenses(prev => prev.map(item => item.id === id ? updatedItem : item))
    return updatedItem
  }

  const deleteExpense = async (id: string) => {
    await structuralExpensesService.deleteExpense(id)
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
