import { getSupabase } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    throw new Error('Acesso não autorizado. Sua sessão de login pode ter expirado. Por favor, saia e faça login novamente para reestabelecer as credenciais.')
  }
  return session.user.id
}

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('structural_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro de sincronização: Não foi possível carregar as despesas estruturais: ${error.message}`)
    }

    return data || []
  },

  async createExpense(expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<StructuralExpense> {
    const supabase = getSupabase()
    const userId = await getUserId()

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
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('structural_expenses')
      .update({
        ...expense,
        amount: expense.amount !== undefined ? Number(expense.amount) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar despesa estrutural no Supabase: ${error.message}`)
    }

    return data
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const { error } = await supabase
      .from('structural_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Erro ao excluir despesa estrutural no Supabase: ${error.message}`)
    }
  }
}
