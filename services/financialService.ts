import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { FinancialMovement } from '@/types/financial'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { googleCalendarService } from '@/services/googleCalendarService'

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

      // Sync with Google Calendar asynchronously without blocking financial ops
      this.getAllMovements().then(all => {
        googleCalendarService.syncAllMovements('local-user-id', all, 12).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })

      return newMovement
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Validate that debt_person_id belongs to the authenticated user scope
    if (movement.debt_person_id) {
      const { data: personCheck, error: checkErr } = await supabase
        .from('debt_persons')
        .select('id, name')
        .eq('id', movement.debt_person_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (checkErr || !personCheck) {
        throw new Error('A pessoa vinculada à cobrança não foi encontrada ou não pertence a esta conta.')
      }
    }

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

    // Sync with Google Calendar asynchronously without blocking financial ops
    if (data) {
      this.getAllMovements().then(all => {
        googleCalendarService.syncAllMovements(userId, all, 12).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })
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

      this.getAllMovements().then(all => {
        googleCalendarService.syncAllMovements('local-user-id', all, 12).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })

      return updated
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Validate that debt_person_id belongs to the authenticated user scope if being modified
    if (movement.debt_person_id) {
      const { data: personCheck, error: checkErr } = await supabase
        .from('debt_persons')
        .select('id, name')
        .eq('id', movement.debt_person_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (checkErr || !personCheck) {
        throw new Error('A pessoa selecionada não foi encontrada ou não pertence a esta conta.')
      }
    }

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

    if (data) {
      this.getAllMovements().then(all => {
        googleCalendarService.syncAllMovements(userId, all, 12).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })
    }

    return data
  },

  async deleteMovement(id: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const filtered = all.filter(m => m.id !== id)
      saveLocalMovements(filtered)

      googleCalendarService.deleteMovementFromCalendar('local-user-id', id).catch(err => {
        console.warn('Google Calendar delete background error:', err)
      })

      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Delete Google Calendar event mapping before/alongside DB deletion
    googleCalendarService.deleteMovementFromCalendar(userId, id).catch(err => {
      console.warn('Google Calendar delete background error:', err)
    })

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
  },

  async decouplePersonFromMovements(personId: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const updated = all.map(m => m.debt_person_id === personId ? { ...m, debt_person_id: null } : m)
      saveLocalMovements(updated)
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    await supabase
      .from('financial_movements')
      .update({ debt_person_id: null })
      .eq('debt_person_id', personId)
      .eq('user_id', userId)
  },

  async syncPersonNameInMovements(personId: string, newName: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const updated = all.map(m => m.debt_person_id === personId ? { ...m, debtor_name: newName } : m)
      saveLocalMovements(updated)
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    await supabase
      .from('financial_movements')
      .update({ debtor_name: newName })
      .eq('debt_person_id', personId)
      .eq('user_id', userId)
  }
}
