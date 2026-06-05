import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { FinancialMovement } from '@/types/financial'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const LOCAL_MOVEMENTS_KEY = 'financeira_movements'

function getLocalMovements(): FinancialMovement[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_MOVEMENTS_KEY)
  if (!data) {
    // Seed sample movements to ensure a great initial experience in offline/local fallback
    const initialSeed: FinancialMovement[] = [
      {
        id: 'seed-salary',
        created_at: new Date().toISOString(),
        date: format(new Date(), 'yyyy-MM-05'),
        type: 'entrada',
        amount: 8500.00,
        description: 'Salário Base Corp',
        tag: 'Salário',
        is_recurring: true,
        recurrence_type: 'mensal',
        user_id: 'local-user-id'
      },
      {
        id: 'seed-rent',
        created_at: new Date().toISOString(),
        date: format(new Date(), 'yyyy-MM-10'),
        type: 'saida_fixa',
        amount: 2200.00,
        description: 'Aluguel Comercial',
        tag: 'Infraestrutura',
        is_recurring: true,
        recurrence_type: 'mensal',
        user_id: 'local-user-id'
      },
      {
        id: 'seed-lunch',
        created_at: new Date().toISOString(),
        date: format(new Date(), 'yyyy-MM-d'),
        type: 'gasto_diario',
        amount: 45.90,
        description: 'Almoço de Negócios',
        tag: 'Alimentação',
        is_recurring: false,
        user_id: 'local-user-id'
      },
      {
        id: 'seed-savings',
        created_at: new Date().toISOString(),
        date: format(new Date(), 'yyyy-MM-01'),
        type: 'economia',
        amount: 1000.00,
        description: 'Aporte de Reserva',
        tag: 'Investimentos',
        is_recurring: true,
        recurrence_type: 'mensal',
        user_id: 'local-user-id'
      }
    ]
    localStorage.setItem(LOCAL_MOVEMENTS_KEY, JSON.stringify(initialSeed))
    return initialSeed
  }
  try {
    return JSON.parse(data)
  } catch (err) {
    console.error('Failed to parse local movements:', err)
    return []
  }
}

function saveLocalMovements(movements: FinancialMovement[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_MOVEMENTS_KEY, JSON.stringify(movements))
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

export const financialService = {
  async getMovementsByMonth(year: number, month: number): Promise<FinancialMovement[]> {
    if (isLocalFallbackActive()) {
      const starStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
      const endStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')
      const all = getLocalMovements()
      return all
        .filter(m => m.date >= starStr && m.date <= endStr)
        .sort((a, b) => b.date.localeCompare(a.date))
    }

    const starStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    
    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', starStr)
      .lte('date', endStr)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar movimentações financeiras para ${month + 1}/${year}: ${error.message}`)
    }
    
    return data || []
  },

  async getAllMovements(): Promise<FinancialMovement[]> {
    if (isLocalFallbackActive()) {
      return getLocalMovements().sort((a, b) => a.date.localeCompare(b.date))
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (error) {
      throw new Error(`Erro ao carregar o histórico de movimentações do banco de dados: ${error.message}`)
    }

    return data || []
  },

  async getOpeningBalance(beforeDate: string): Promise<number> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all
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

    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('amount, type, is_paid')
      .eq('user_id', userId)
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
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      // Generate standard v4 UUID fallback
      const mockId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      
      const newMovement: FinancialMovement = {
        ...movement,
        id: mockId,
        created_at: new Date().toISOString(),
        user_id: 'local-user-id'
      }
      all.push(newMovement)
      saveLocalMovements(all)
      return newMovement
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('financial_movements')
      .insert({
        ...movement,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro de persistência na nuvem (Supabase): Não foi possível incluir a movimentação. Detalhes: ${error.message}`)
    }
    
    return data
  },

  async updateMovement(id: string, movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>): Promise<FinancialMovement> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const idx = all.findIndex(m => m.id === id)
      if (idx === -1) {
        throw new Error('Movimentação local não encontrada.')
      }
      const updated: FinancialMovement = {
        ...all[idx],
        ...movement,
        amount: movement.amount !== undefined ? Number(movement.amount) : all[idx].amount
      }
      all[idx] = updated
      saveLocalMovements(all)
      return updated
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_movements')
      .update(movement)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro de persistência na nuvem ao tentar salvar alterações: ${error.message}`)
    }

    return data
  },

  async deleteMovement(id: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const filtered = all.filter(m => m.id !== id)
      saveLocalMovements(filtered)
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const { error } = await supabase
      .from('financial_movements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Erro ao sincronizar exclusão física com o Supabase: ${error.message}`)
    }
  },

  async getMovementsByRange(startDate: string, endDate: string): Promise<FinancialMovement[]> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all.filter(m => m.date >= startDate && m.date <= endDate)
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      throw new Error(`Erro ao buscar intervalo de fluxo: ${error.message}`)
    }
    
    return data || []
  }
}
