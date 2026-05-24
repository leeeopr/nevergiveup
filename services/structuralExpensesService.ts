import { getSupabase } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('structural_expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro de sincronização: Não foi possível carregar as despesas estruturais: ${error.message}`)
    }

    return data || []
  },

  async createExpense(expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<StructuralExpense> {
    const supabase = getSupabase()
    let userId = '00000000-0000-0000-0000-000000000000'
    try {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        userId = data.user.id
      }
    } catch {
      // safe offline/anonymous fallback
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
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Falha ao registrar despesa estrutural no banco de dados: ${error.message}`)
    }

    return data
  },

  async updateExpense(id: string, expense: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<StructuralExpense> {
    const supabase = getSupabase()
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
      throw new Error(`Erro ao atualizar despesa estrutural no Supabase: ${error.message}`)
    }

    return data
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('structural_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao excluir despesa estrutural no Supabase: ${error.message}`)
    }
  }
}
