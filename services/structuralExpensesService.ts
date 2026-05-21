import { getSupabase } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

const LOCAL_STORAGE_KEY = 'structural_expenses_cache'

// Helper for local storage parsing
function getLocalExpenses(userId: string): StructuralExpense[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Local Storage read error:', e)
    return []
  }
}

function saveLocalExpenses(userId: string, expenses: StructuralExpense[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${userId}`, JSON.stringify(expenses))
  } catch (e) {
    console.error('Local Storage write error:', e)
  }
}

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    const supabase = getSupabase()
    if (!supabase) return getLocalExpenses('anon')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anon'

      const { data, error } = await supabase
        .from('structural_expenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Code 42P01 means Postgres "relation does not exist" - i.e. table not migrated yet
        if (error.code === '42P01') {
          console.warn('Supabase table "structural_expenses" does not exist. Using localStorage fallback.')
          return getLocalExpenses(userId)
        }
        throw error
      }
      return data || []
    } catch (err) {
      console.warn('Using fallback localStorage due to database fetch error:', err)
      return getLocalExpenses('anon')
    }
  },

  async createExpense(expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<StructuralExpense> {
    const supabase = getSupabase()
    
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const newExpense: StructuralExpense = {
      ...expense,
      id: tempId,
      user_id: 'anon',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!supabase) {
      const local = getLocalExpenses('anon')
      local.unshift(newExpense)
      saveLocalExpenses('anon', local)
      return newExpense
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anon'
      newExpense.user_id = userId

      const { data, error } = await supabase
        .from('structural_expenses')
        .insert({
          id: newExpense.id,
          title: newExpense.title,
          amount: Number(newExpense.amount),
          category: newExpense.category,
          recurrence: newExpense.recurrence,
          priority: newExpense.priority,
          description: newExpense.description,
          user_id: userId
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42P01') {
          const local = getLocalExpenses(userId)
          local.unshift(newExpense)
          saveLocalExpenses(userId, local)
          return newExpense
        }
        throw error
      }
      return data
    } catch (err) {
      console.warn('Database insert failed, using fallback localStorage:', err)
      const userId = newExpense.user_id
      const local = getLocalExpenses(userId)
      local.unshift(newExpense)
      saveLocalExpenses(userId, local)
      return newExpense
    }
  },

  async updateExpense(id: string, expense: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<StructuralExpense> {
    const supabase = getSupabase()

    if (!supabase) {
      const local = getLocalExpenses('anon')
      const index = local.findIndex(e => e.id === id)
      if (index === -1) throw new Error('Despesa estrutural não encontrada')
      
      const updated = {
        ...local[index],
        ...expense,
        updated_at: new Date().toISOString()
      }
      local[index] = updated
      saveLocalExpenses('anon', local)
      return updated
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anon'

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

      if (error) {
        if (error.code === '42P01') {
          const local = getLocalExpenses(userId)
          const index = local.findIndex(e => e.id === id)
          if (index === -1) throw new Error('Despesa estrutural não encontrada')
          const updated = {
            ...local[index],
            ...expense,
            updated_at: new Date().toISOString()
          }
          local[index] = updated
          saveLocalExpenses(userId, local)
          return updated
        }
        throw error
      }
      return data
    } catch (err) {
      console.warn('Database update failed, using fallback localStorage:', err)
      const local = getLocalExpenses('anon')
      const index = local.findIndex(e => e.id === id)
      if (index === -1) throw new Error('Despesa estrutural não encontrada')
      const updated = {
        ...local[index],
        ...expense,
        updated_at: new Date().toISOString()
      }
      local[index] = updated
      saveLocalExpenses('anon', local)
      return updated
    }
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = getSupabase()

    if (!supabase) {
      const local = getLocalExpenses('anon')
      const filtered = local.filter(e => e.id !== id)
      saveLocalExpenses('anon', filtered)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anon'

      const { error } = await supabase
        .from('structural_expenses')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '42P01') {
          const local = getLocalExpenses(userId)
          const filtered = local.filter(e => e.id !== id)
          saveLocalExpenses(userId, filtered)
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('Database delete failed, using fallback localStorage:', err)
      const local = getLocalExpenses('anon')
      const filtered = local.filter(e => e.id !== id)
      saveLocalExpenses('anon', filtered)
    }
  }
}
