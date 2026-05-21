import { getSupabase } from '@/lib/supabase'
import { FinancialMovement, MovementType } from '@/types/financial'
import { startOfMonth, endOfMonth, format, parseISO, isAfter, isBefore } from 'date-fns'

const LOCAL_STORAGE_KEY = 'financial_movements_cache'

function getLocalMovements(): FinancialMovement[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Local Storage read error:', e)
    return []
  }
}

function saveLocalMovements(movements: FinancialMovement[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(movements))
  } catch (e) {
    console.error('Local Storage write error:', e)
  }
}

export const financialService = {
  async getMovementsByMonth(year: number, month: number): Promise<FinancialMovement[]> {
    const startDateStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endDateStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')

    const supabase = getSupabase()
    if (!supabase) {
      return this.getLocalMovementsByRange(startDateStr, endDateStr)
    }

    try {
      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Failed to retrieve movements by month from Supabase. Falling back to local storage.', err)
      return this.getLocalMovementsByRange(startDateStr, endDateStr)
    }
  },

  getLocalMovementsByRange(startDateStr: string, endDateStr: string): FinancialMovement[] {
    const all = getLocalMovements()
    return all.filter(m => m.date >= startDateStr && m.date <= endDateStr)
      .sort((a, b) => b.date.localeCompare(a.date))
  },

  async getAllMovements(): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    if (!supabase) {
      return getLocalMovements().sort((a, b) => a.date.localeCompare(b.date))
    }

    try {
      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Failed to retrieve all movements from Supabase. Falling back to local storage.', err)
      return getLocalMovements().sort((a, b) => a.date.localeCompare(b.date))
    }
  },

  async getOpeningBalance(beforeDate: string): Promise<number> {
    const supabase = getSupabase()
    if (!supabase) {
      return this.getLocalOpeningBalance(beforeDate)
    }

    try {
      const { data, error } = await supabase
        .from('financial_movements')
        .select('amount, type')
        .lt('date', beforeDate)

      if (error) throw error
      
      return (data || []).reduce((acc, m) => {
        const amount = Number(m.amount)
        return m.type === 'entrada' ? acc + amount : acc - amount
      }, 0)
    } catch (err) {
      console.warn('Failed to retrieve opening balance from Supabase. Falling back to local storage.', err)
      return this.getLocalOpeningBalance(beforeDate)
    }
  },

  getLocalOpeningBalance(beforeDate: string): number {
    const all = getLocalMovements()
    return all.filter(m => m.date < beforeDate).reduce((acc, m) => {
      const amount = Number(m.amount)
      return m.type === 'entrada' ? acc + amount : acc - amount
    }, 0)
  },

  async insertMovement(movement: Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>): Promise<FinancialMovement> {
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)
    const newMovement: FinancialMovement = {
      ...movement,
      id: tempId,
      user_id: 'anon',
      created_at: new Date().toISOString()
    }

    const supabase = getSupabase()
    if (!supabase) {
      const local = getLocalMovements()
      local.push(newMovement)
      saveLocalMovements(local)
      return newMovement
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Unauthenticated mode: save to local storage
        const local = getLocalMovements()
        local.push(newMovement)
        saveLocalMovements(local)
         return newMovement
      }

      newMovement.user_id = user.id
      const { data, error } = await supabase
        .from('financial_movements')
        .insert({
          ...movement,
          id: newMovement.id,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Database insert failed, fell back to local storage storage:', err)
      const local = getLocalMovements()
      local.push(newMovement)
      saveLocalMovements(local)
      return newMovement
    }
  },

  async updateMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): Promise<FinancialMovement> {
    const supabase = getSupabase()
    if (!supabase) {
      return this.updateLocalMovement(id, movement)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return this.updateLocalMovement(id, movement)
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .update(movement)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Database update failed, fell back to local storage update:', err)
      return this.updateLocalMovement(id, movement)
    }
  },

  updateLocalMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): FinancialMovement {
    const local = getLocalMovements()
    const idx = local.findIndex(m => m.id === id)
    if (idx === -1) {
      throw new Error('Movimento não encontrado no armazenamento local.')
    }
    const updated = {
      ...local[idx],
      ...movement
    }
    local[idx] = updated
    saveLocalMovements(local)
    return updated
  },

  async deleteMovement(id: string): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) {
      return this.deleteLocalMovement(id)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return this.deleteLocalMovement(id)
      }

      const { error } = await supabase
        .from('financial_movements')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.warn('Database delete failed, fell back to local storage deletion:', err)
      return this.deleteLocalMovement(id)
    }
  },

  deleteLocalMovement(id: string): void {
    const local = getLocalMovements()
    const filtered = local.filter(m => m.id !== id)
    saveLocalMovements(filtered)
  },

  async getMovementsByRange(startDate: string, endDate: string): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    if (!supabase) {
      return this.getLocalMovementsByRange(startDate, endDate)
    }

    try {
      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Failed to retrieve movements by range from Supabase. Falling back to local storage.', err)
      return this.getLocalMovementsByRange(startDate, endDate)
    }
  }
}
