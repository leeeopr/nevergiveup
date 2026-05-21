import { getSupabase } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Falha de identificação: Conecte-se para carregar suas despesas estruturais.')
    }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Autenticação expirada: Reconecte-se para cadastrar este registro estrutural.')
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

    if (error) {
      throw new Error(`Falha ao registrar despesa estrutural no banco de dados: ${error.message}`)
    }

    return data
  },

  async updateExpense(id: string, expense: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>): Promise<StructuralExpense> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Autenticação expirada: Reconecte-se para editar este registro estrutural.')
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

    if (error) {
      throw new Error(`Erro ao atualizar despesa estrutural no Supabase: ${error.message}`)
    }

    return data
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Autenticação expirada: Reconecte-se para excluir este registro estrutural.')
    }

    const { error } = await supabase
      .from('structural_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao excluir despesa estrutural no Supabase: ${error.message}`)
    }
  }
}
