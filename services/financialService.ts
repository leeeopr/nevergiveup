import { getSupabase } from '@/lib/supabase'
import { FinancialMovement, MovementType } from '@/types/financial'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const financialService = {
  async getMovementsByMonth(year: number, month: number): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    if (!supabase) return []

    const startDate = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getAllMovements(): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getOpeningBalance(beforeDate: string): Promise<number> {
    const supabase = getSupabase()
    if (!supabase) return 0

    const { data, error } = await supabase
      .from('financial_movements')
      .select('amount, type')
      .lt('date', beforeDate)

    if (error) throw error
    
    return (data || []).reduce((acc, m) => {
      const amount = Number(m.amount)
      return m.type === 'entrada' ? acc + amount : acc - amount
    }, 0)
  },

  async insertMovement(movement: Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>): Promise<FinancialMovement> {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
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

    if (error) {
      const errorDetail = {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }
      console.error('Supabase Insert Error:', errorDetail)
      throw new Error(JSON.stringify(errorDetail))
    }
    return data
  },

  async updateMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): Promise<FinancialMovement> {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')

    const { data, error } = await supabase
      .from('financial_movements')
      .update(movement)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const errorDetail = {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }
      console.error('Supabase Update Error:', errorDetail)
      throw new Error(JSON.stringify(errorDetail))
    }
    return data
  },

  async deleteMovement(id: string): Promise<void> {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not initialized')

    const { error } = await supabase
      .from('financial_movements')
      .delete()
      .eq('id', id)

    if (error) {
      const errorDetail = {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }
      console.error('Supabase Delete Error:', errorDetail)
      throw new Error(JSON.stringify(errorDetail))
    }
  },

  async getMovementsByRange(startDate: string, endDate: string): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error
    return data || []
  }
}
