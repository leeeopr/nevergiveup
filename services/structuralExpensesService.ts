import { getSupabase } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

const LOCAL_EXPENSES_KEY = 'structural_expenses_offline'

const isNetworkError = (error: any): boolean => {
  if (!error) return false
  const errorStr = String(error.message || error.description || error || '').toLowerCase()
  return (
    errorStr.includes('failed to fetch') ||
    errorStr.includes('networkerror') ||
    errorStr.includes('network error') ||
    errorStr.includes('attempting to fetch resource') ||
    errorStr.includes('fetch') ||
    errorStr.includes('load') ||
    errorStr.includes('dns') ||
    errorStr.includes('cors') ||
    errorStr.includes('origin') ||
    errorStr.includes('connection failed') ||
    errorStr.includes('offline') ||
    error.name === 'TypeError' ||
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.crossorigin === 'anonymous'
  )
}

// Broadcast system for offline fallback status
const notifyOfflineFallback = (active: boolean) => {
  if (typeof window !== 'undefined') {
    (window as any).__isOfflineFallbackActive = active
    window.dispatchEvent(new CustomEvent('offline-fallback-changed', { detail: { active } }))
  }
}

export const getLocalExpenses = (): StructuralExpense[] => {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(LOCAL_EXPENSES_KEY)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.warn('Failed to parse local structural expenses:', err)
    return []
  }
}

export const saveLocalExpenses = (expenses: StructuralExpense[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(expenses))
  } catch (err) {
    console.error('Failed to save local structural expenses:', err)
  }
}

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase client unconfigured')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Você precisa estar logado para carregar as despesas estruturais.')
      }

      const { data, error } = await supabase
        .from('structural_expenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        saveLocalExpenses(data)
      }
      notifyOfflineFallback(false)
      return data || []
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        console.warn('structuralExpensesService: network unavailable, parsing from backup cache.')
        notifyOfflineFallback(true)
        return getLocalExpenses()
      }
      throw err
    }
  },

  async createExpense(expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<StructuralExpense> {
    const localId = 'local_exp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    const tempExpense: StructuralExpense = {
      ...expense,
      id: localId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'local_user'
    }

    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase client unconfigured')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Você precisa estar logado para criar uma despesa estrutural.')
      }

      const { data, error } = await supabase
        .from('structural_expenses')
        .insert({
          title: expense.title,
          amount: Number(expense.amount),
          category: expense.category,
          recurrence: expense.recurrence,
          priority: expense.priority,
          description: expense.description,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      const local = getLocalExpenses()
      local.unshift(data)
      saveLocalExpenses(local)
      notifyOfflineFallback(false)

      return data
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        console.warn('structuralExpensesService: saved expense locally.')
        notifyOfflineFallback(true)
        const local = getLocalExpenses()
        local.unshift(tempExpense)
        saveLocalExpenses(local)
        return tempExpense
      }
      throw err
    }
  },

  async updateExpense(id: string, expense: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<StructuralExpense> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase client unconfigured')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Você precisa estar logado para editar uma despesa estrutural.')
      }

      const { data, error } = await supabase
        .from('structural_expenses')
        .update({
          ...expense,
          amount: expense.amount !== undefined ? Number(expense.amount) : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const local = getLocalExpenses()
      const index = local.findIndex(x => x.id === id)
      if (index !== -1) {
        local[index] = { ...local[index], ...data }
        saveLocalExpenses(local)
      }
      notifyOfflineFallback(false)

      return data
    } catch (err) {
      if (isNetworkError(err) || !getSupabase() || id.startsWith('local_')) {
        console.warn('structuralExpensesService: updated expense locally.')
        notifyOfflineFallback(true)
        const local = getLocalExpenses()
        const index = local.findIndex(x => x.id === id)
        if (index !== -1) {
          const updated = {
            ...local[index],
            ...expense,
            amount: expense.amount !== undefined ? Number(expense.amount) : local[index].amount,
            updated_at: new Date().toISOString()
          } as StructuralExpense
          local[index] = updated
          saveLocalExpenses(local)
          return updated
        }
        throw new Error('Despesa estrutural local não localizada no backup.')
      }
      throw err
    }
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase client unconfigured')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Você precisa estar logado para excluir uma despesa estrutural.')
      }

      const { error } = await supabase
        .from('structural_expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      const local = getLocalExpenses()
      const filtered = local.filter(x => x.id !== id)
      saveLocalExpenses(filtered)
      notifyOfflineFallback(false)
    } catch (err) {
      if (isNetworkError(err) || !getSupabase() || id.startsWith('local_')) {
        console.warn('structuralExpensesService: deleted expense locally.')
        notifyOfflineFallback(true)
        const local = getLocalExpenses()
        const filtered = local.filter(x => x.id !== id)
        saveLocalExpenses(filtered)
        return
      }
      throw err
    }
  }
}
