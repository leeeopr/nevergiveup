import { getSupabase } from '@/lib/supabase'
import { FinancialMovement } from '@/types/financial'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const financialService = {
  async getMovementsByMonth(year: number, month: number): Promise<FinancialMovement[]> {
    const starStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .gte('date', starStr)
      .lte('date', endStr)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar movimentações financeiras para ${month + 1}/${year}: ${error.message}`)
    }
    
    return data || []
  },

  async getAllMovements(): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      throw new Error(`Erro ao carregar o histórico de movimentações do banco de dados: ${error.message}`)
    }

    return data || []
  },

  async getOpeningBalance(beforeDate: string): Promise<number> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('amount, type, is_paid')
      .lt('date', beforeDate)

    if (error) {
      throw new Error(`Erro de cálculo do saldo de transições: ${error.message}`)
    }
    
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
  },

  async insertMovement(movement: Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>): Promise<FinancialMovement> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Falha de identificação: Acesse sua conta novamente para salvar este movimento.')
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
      throw new Error(`Erro de persistência na nuvem (Supabase): Não foi possível incluir a movimentação. Detalhes: ${error.message}`)
    }
    
    return data
  },

  async updateMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): Promise<FinancialMovement> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Falha de identificação: Acesse sua conta novamente para atualizar este movimento.')
    }

    const { data, error } = await supabase
      .from('financial_movements')
      .update(movement)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro de persistência na nuvem ao tentar salvar alterações: ${error.message}`)
    }

    return data
  },

  async deleteMovement(id: string): Promise<void> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Falha de identificação: Acesse sua conta novamente para salvar esta exclusão.')
    }

    const { error } = await supabase
      .from('financial_movements')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao sincronizar exclusão física com o Supabase: ${error.message}`)
    }
  },

  async getMovementsByRange(startDate: string, endDate: string): Promise<FinancialMovement[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      throw new Error(`Erro ao buscar intervalo de fluxo: ${error.message}`)
    }
    
    return data || []
  }
}
