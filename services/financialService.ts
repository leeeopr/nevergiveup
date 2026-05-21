import { getSupabase } from '@/lib/supabase'
import { FinancialMovement } from '@/types/financial'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const LOCAL_MOVEMENTS_KEY = 'financial_movements_offline'

// Broadcast system for offline fallback status
const notifyOfflineFallback = (active: boolean) => {
  if (typeof window !== 'undefined') {
    (window as any).__isOfflineFallbackActive = active
    window.dispatchEvent(new CustomEvent('offline-fallback-changed', { detail: { active } }))
  }
}

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

// Local Storage Repository
export const getLocalMovements = (): FinancialMovement[] => {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(LOCAL_MOVEMENTS_KEY)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.warn('Failed to parse local movements:', err)
    return []
  }
}

export const saveLocalMovements = (movements: FinancialMovement[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_MOVEMENTS_KEY, JSON.stringify(movements))
  } catch (err) {
    console.error('Failed to save local movements:', err)
  }
}

export const financialService = {
  async getMovementsByMonth(year: number, month: number): Promise<FinancialMovement[]> {
    const starStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', starStr)
        .lte('date', endStr)
        .order('date', { ascending: false })

      if (error) throw error
      
      // Update local storage backup with retrieved data for resilience
      const local = getLocalMovements()
      const filteredLocal = local.filter(x => x.date < starStr || x.date > endStr)
      const merged = [...filteredLocal, ...(data || [])]
      saveLocalMovements(merged)
      notifyOfflineFallback(false)

      return data || []
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        console.warn('financialService: network connection unavailable, falling back to local storage mirror.')
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        return local
          .filter(x => x.date >= starStr && x.date <= endStr)
          .sort((a, b) => b.date.localeCompare(a.date))
      }
      throw err
    }
  },

  async getAllMovements(): Promise<FinancialMovement[]> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error

      if (data) {
        saveLocalMovements(data)
      }
      notifyOfflineFallback(false)
      return data || []
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        console.warn('financialService: network connection unavailable, operating on local assets.')
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        return local.sort((a, b) => a.date.localeCompare(b.date))
      }
      throw err
    }
  },

  async getOpeningBalance(beforeDate: string): Promise<number> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .select('amount, type, is_paid')
        .lt('date', beforeDate)

      if (error) throw error
      notifyOfflineFallback(false)
      
      return (data || []).reduce((acc, m) => {
        const amount = Number(m.amount)
        if (m.type === 'entrada') {
          return acc + amount
        } else if (m.type === 'cobranca') {
          return m.is_paid ? acc + amount : acc
        } else {
          return acc - amount
        }
      }, 0)
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        return local
          .filter(m => m.date < beforeDate)
          .reduce((acc, m) => {
            const amount = Number(m.amount)
            if (m.type === 'entrada') {
              return acc + amount
            } else if (m.type === 'cobranca') {
              return m.is_paid ? acc + amount : acc
            } else {
              return acc - amount
            }
          }, 0)
      }
      throw err
    }
  },

  async insertMovement(movement: Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>): Promise<FinancialMovement> {
    const localId = 'local_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    const tempMovement: FinancialMovement = {
      ...movement,
      id: localId,
      created_at: new Date().toISOString(),
      user_id: 'local_user'
    }

    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Você precisa estar logado para realizar esta operação.')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .insert({
          ...movement,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      
      // Keep local store mirrored
      const local = getLocalMovements()
      local.push(data)
      saveLocalMovements(local)
      notifyOfflineFallback(false)

      return data
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        console.warn('financialService: offline insert performed locally.')
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        local.push(tempMovement)
        saveLocalMovements(local)
        return tempMovement
      }
      throw err
    }
  },

  async updateMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): Promise<FinancialMovement> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .update(movement)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const local = getLocalMovements()
      const index = local.findIndex(x => x.id === id)
      if (index !== -1) {
        local[index] = { ...local[index], ...data }
        saveLocalMovements(local)
      }
      notifyOfflineFallback(false)

      return data
    } catch (err) {
      if (isNetworkError(err) || !getSupabase() || id.startsWith('local_')) {
        console.warn('financialService: offline update performed locally.')
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        const index = local.findIndex(x => x.id === id)
        if (index !== -1) {
          const updated = { ...local[index], ...movement } as FinancialMovement
          local[index] = updated
          saveLocalMovements(local)
          return updated
        }
        throw new Error('Movimento não encontrado no armazenamento backup local.')
      }
      throw err
    }
  },

  async deleteMovement(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { error } = await supabase
        .from('financial_movements')
        .delete()
        .eq('id', id)

      if (error) throw error

      const local = getLocalMovements()
      const filtered = local.filter(x => x.id !== id)
      saveLocalMovements(filtered)
      notifyOfflineFallback(false)
    } catch (err) {
      if (isNetworkError(err) || !getSupabase() || id.startsWith('local_')) {
        console.warn('financialService: offline deletion performed locally.')
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        const filtered = local.filter(x => x.id !== id)
        saveLocalMovements(filtered)
        return
      }
      throw err
    }
  },

  async getMovementsByRange(startDate: string, endDate: string): Promise<FinancialMovement[]> {
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error('Supabase unconfigured')
      }

      const { data, error } = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      notifyOfflineFallback(false)
      return data || []
    } catch (err) {
      if (isNetworkError(err) || !getSupabase()) {
        notifyOfflineFallback(true)
        const local = getLocalMovements()
        return local.filter(x => x.date >= startDate && x.date <= endDate)
      }
      throw err
    }
  }
}
