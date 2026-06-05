import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { StructuralExpense } from '@/types/structural'

const LOCAL_STE_KEY = 'financeira_structural_expenses'

function getLocalExpenses(): StructuralExpense[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_STE_KEY)
  if (!data) {
    // Seed standard fixed cost items so the dashboard displays correctly in offline/local fallback
    const initialSeed: StructuralExpense[] = [
      {
        id: 'seed-ste-rent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: 'Aluguel Comercial',
        amount: 2200.00,
        category: 'aluguel',
        recurrence: 'mensal',
        priority: 'alta',
        description: 'Locação do escritório central',
        user_id: 'local-user-id'
      },
      {
        id: 'seed-ste-energy',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: 'Energia Elétrica',
        amount: 450.00,
        category: 'energia',
        recurrence: 'mensal',
        priority: 'alta',
        description: 'Fornecimento de energia - CPFL',
        user_id: 'local-user-id'
      },
      {
        id: 'seed-ste-software',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: 'Assinaturas de Software',
        amount: 350.00,
        category: 'assinaturas',
        recurrence: 'mensal',
        priority: 'baixa',
        description: 'Licenças Figma and GitHub Team',
        user_id: 'local-user-id'
      }
    ]
    localStorage.setItem(LOCAL_STE_KEY, JSON.stringify(initialSeed))
    return initialSeed
  }
  try {
    return JSON.parse(data)
  } catch (err) {
    console.error('Failed to parse local expenses:', err)
    return []
  }
}

function saveLocalExpenses(expenses: StructuralExpense[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_STE_KEY, JSON.stringify(expenses))
}

async function getUserId(): Promise<string> {
  if (isLocalFallbackActive()) {
    return 'local-user-id'
  }
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    throw new Error('Acesso não autorizado. Sua sessão de login pode ter expirado. Por favor, saia e faça login novamente para reestabelecer as credenciais.')
  }
  return session.user.id
}

export const structuralExpensesService = {
  async getExpenses(): Promise<StructuralExpense[]> {
    if (isLocalFallbackActive()) {
      return getLocalExpenses().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    }

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
    if (isLocalFallbackActive()) {
      const all = getLocalExpenses()
      const mockId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36)

      const newExpense: StructuralExpense = {
        ...expense,
        id: mockId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'local-user-id',
        amount: Number(expense.amount)
      }
      all.unshift(newExpense)
      saveLocalExpenses(all)
      return newExpense
    }

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
    if (isLocalFallbackActive()) {
      const all = getLocalExpenses()
      const idx = all.findIndex(e => e.id === id)
      if (idx === -1) {
        throw new Error('Despesa estrutural local não encontrada.')
      }
      const updated: StructuralExpense = {
        ...all[idx],
        ...expense,
        amount: expense.amount !== undefined ? Number(expense.amount) : all[idx].amount,
        updated_at: new Date().toISOString()
      }
      all[idx] = updated
      saveLocalExpenses(all)
      return updated
    }

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
    if (isLocalFallbackActive()) {
      const all = getLocalExpenses()
      const filtered = all.filter(e => e.id !== id)
      saveLocalExpenses(filtered)
      return
    }

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
