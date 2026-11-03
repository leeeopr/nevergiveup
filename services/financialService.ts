import { getSupabase, isLocalFallbackActive, getHasGroupIdColumn, setHasGroupIdColumn, isMissingColumnError } from '@/lib/supabase'
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
  async getMovementsByMonth(year: number, month: number, groupId?: string): Promise<FinancialMovement[]> {
    const starStr = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
    const endStr = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd')

    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all
        .filter(m => {
          const matchDate = m.date >= starStr && m.date <= endStr
          if (!matchDate) return false
          if (!groupId) return true
          return m.group_id === groupId || (!m.group_id && groupId === 'group-pessoal-default')
        })
        .sort((a, b) => b.date.localeCompare(a.date))
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const canUseGroupId = Boolean(groupId && getHasGroupIdColumn() !== false)

    let query = supabase
      .from('financial_movements')
      .select('*')
      .gte('date', starStr)
      .lte('date', endStr)
      .order('date', { ascending: false })

    if (canUseGroupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', userId)
    }

    let { data, error } = await query

    if (error && isMissingColumnError(error, 'group_id') && canUseGroupId) {
      console.warn('[financialService] Supabase schema does not have group_id column yet. Falling back to user_id filter.')
      setHasGroupIdColumn(false)
      const retry = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', starStr)
        .lte('date', endStr)
        .eq('user_id', userId)
        .order('date', { ascending: false })
      data = retry.data
      error = retry.error
    }

    if (error) {
      throw new Error(`Erro ao buscar movimentações financeiras para ${month + 1}/${year}: ${error.message}`)
    }
    
    return data || []
  },

  async getAllMovements(groupId?: string): Promise<FinancialMovement[]> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all
        .filter(m => {
          if (!groupId) return true
          return m.group_id === groupId || (!m.group_id && groupId === 'group-pessoal-default')
        })
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const canUseGroupId = Boolean(groupId && getHasGroupIdColumn() !== false)

    let query = supabase
      .from('financial_movements')
      .select('*')
      .order('date', { ascending: true })

    if (canUseGroupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', userId)
    }

    let { data, error } = await query

    if (error && isMissingColumnError(error, 'group_id') && canUseGroupId) {
      console.warn('[financialService] Supabase schema does not have group_id column yet. Falling back to user_id filter.')
      setHasGroupIdColumn(false)
      const retry = await supabase
        .from('financial_movements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
      data = retry.data
      error = retry.error
    }

    if (error) {
      throw new Error(`Erro ao carregar o histórico de movimentações do banco de dados: ${error.message}`)
    }

    return data || []
  },

  async getOpeningBalance(beforeDate: string, groupId?: string): Promise<number> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all
        .filter(m => {
          const matchDate = m.date < beforeDate
          if (!matchDate) return false
          if (!groupId) return true
          return m.group_id === groupId || (!m.group_id && groupId === 'group-pessoal-default')
        })
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
    const canUseGroupId = Boolean(groupId && getHasGroupIdColumn() !== false)

    let query = supabase
      .from('financial_movements')
      .select('amount, type, is_paid')
      .lt('date', beforeDate)

    if (canUseGroupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', userId)
    }

    let { data, error } = await query

    if (error && isMissingColumnError(error, 'group_id') && canUseGroupId) {
      console.warn('[financialService] Supabase schema does not have group_id column yet. Falling back to user_id filter.')
      setHasGroupIdColumn(false)
      const retry = await supabase
        .from('financial_movements')
        .select('amount, type, is_paid')
        .lt('date', beforeDate)
        .eq('user_id', userId)
      data = retry.data
      error = retry.error
    }

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

  async insertMovement(
    movement: Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>,
    groupId?: string
  ): Promise<FinancialMovement> {
    const finalGroupId = movement.group_id || groupId || null

    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const mockId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      
      const newMovement: FinancialMovement = {
        ...movement,
        id: mockId,
        group_id: finalGroupId,
        created_at: new Date().toISOString(),
        user_id: 'local-user-id'
      }
      all.push(newMovement)
      saveLocalMovements(all)

      // Sync with Google Calendar asynchronously without blocking financial ops
      this.getAllMovements(finalGroupId || undefined).then(allMoves => {
        googleCalendarService.syncAllMovements('local-user-id', allMoves, 12, finalGroupId || undefined).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })

      return newMovement
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Validate that debt_person_id belongs to the authenticated user scope
    if (movement.debt_person_id) {
      const { data: personCheck } = await supabase
        .from('debt_persons')
        .select('id, name')
        .eq('id', movement.debt_person_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (!personCheck) {
        throw new Error('A pessoa vinculada à cobrança não foi encontrada.')
      }
    }

    const insertPayload: any = {
      ...movement,
      user_id: userId
    }
    if (finalGroupId && getHasGroupIdColumn() !== false) {
      insertPayload.group_id = finalGroupId
    }

    let { data, error } = await supabase
      .from('financial_movements')
      .insert(insertPayload)
      .select()
      .single()

    if (error && isMissingColumnError(error, 'group_id') && insertPayload.group_id) {
      console.warn('[financialService] Supabase schema does not have group_id column. Saving movement without group_id.')
      setHasGroupIdColumn(false)
      delete insertPayload.group_id
      const retry = await supabase
        .from('financial_movements')
        .insert(insertPayload)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      throw new Error(`Erro de persistência na nuvem (Supabase): Não foi possível incluir a movimentação. Detalhes: ${error.message}`)
    }

    if (data) {
      this.getAllMovements(finalGroupId || undefined).then(allMoves => {
        googleCalendarService.syncAllMovements(userId, allMoves, 12, finalGroupId || undefined).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })
    }
    
    return data
  },

  async updateMovement(
    id: string,
    movement: Partial<Omit<FinancialMovement, 'id' | 'created_at' | 'user_id'>>,
    groupId?: string
  ): Promise<FinancialMovement> {
    const finalGroupId = movement.group_id || groupId

    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      const idx = all.findIndex(m => m.id === id)
      if (idx === -1) {
        throw new Error('Movimentação local não encontrada.')
      }
      const updated: FinancialMovement = {
        ...all[idx],
        ...movement,
        group_id: finalGroupId !== undefined ? finalGroupId : all[idx].group_id,
        amount: movement.amount !== undefined ? Number(movement.amount) : all[idx].amount
      }
      all[idx] = updated
      saveLocalMovements(all)

      this.getAllMovements(finalGroupId || undefined).then(allMoves => {
        googleCalendarService.syncAllMovements('local-user-id', allMoves, 12, finalGroupId || undefined).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })

      return updated
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    if (movement.debt_person_id) {
      const { data: personCheck } = await supabase
        .from('debt_persons')
        .select('id, name')
        .eq('id', movement.debt_person_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (!personCheck) {
        throw new Error('A pessoa selecionada não foi encontrada.')
      }
    }

    const updatePayload: any = { ...movement }
    const canUseGroupId = Boolean(finalGroupId && getHasGroupIdColumn() !== false)
    if (canUseGroupId) {
      updatePayload.group_id = finalGroupId
    }

    let updateQuery = supabase
      .from('financial_movements')
      .update(updatePayload)
      .eq('id', id)

    if (canUseGroupId) {
      updateQuery = updateQuery.eq('group_id', finalGroupId)
    } else {
      updateQuery = updateQuery.eq('user_id', userId)
    }

    let { data, error } = await updateQuery
      .select()
      .single()

    if (error && isMissingColumnError(error, 'group_id')) {
      console.warn('[financialService] Supabase schema does not have group_id column. Updating without group_id.')
      setHasGroupIdColumn(false)
      delete updatePayload.group_id
      const retry = await supabase
        .from('financial_movements')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      throw new Error(`Erro de persistência na nuvem ao tentar salvar alterações: ${error.message}`)
    }

    if (data) {
      this.getAllMovements(finalGroupId || undefined).then(allMoves => {
        googleCalendarService.syncAllMovements(userId, allMoves, 12, finalGroupId || undefined).catch(err => {
          console.warn('Google Calendar sync background error:', err)
        })
      })
    }

    return data
  },

  async deleteMovement(id: string, groupId?: string): Promise<void> {
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

    const canUseGroupId = Boolean(groupId && getHasGroupIdColumn() !== false)
    let deleteQuery = supabase
      .from('financial_movements')
      .delete()
      .eq('id', id)

    if (canUseGroupId) {
      deleteQuery = deleteQuery.eq('group_id', groupId)
    } else {
      deleteQuery = deleteQuery.eq('user_id', userId)
    }

    let { error } = await deleteQuery

    if (error && isMissingColumnError(error, 'group_id') && canUseGroupId) {
      console.warn('[financialService] Supabase schema does not have group_id column. Deleting by id and user_id.')
      setHasGroupIdColumn(false)
      const retry = await supabase
        .from('financial_movements')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      error = retry.error
    }

    if (error) {
      throw new Error(`Erro ao sincronizar exclusão física com o Supabase: ${error.message}`)
    }
  },

  async getMovementsByRange(startDate: string, endDate: string, groupId?: string): Promise<FinancialMovement[]> {
    if (isLocalFallbackActive()) {
      const all = getLocalMovements()
      return all.filter(m => {
        const dateMatch = m.date >= startDate && m.date <= endDate
        if (!dateMatch) return false
        if (!groupId) return true
        return m.group_id === groupId || (!m.group_id && groupId === 'group-pessoal-default')
      })
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const canUseGroupId = Boolean(groupId && getHasGroupIdColumn() !== false)

    let query = supabase
      .from('financial_movements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (canUseGroupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', userId)
    }

    let { data, error } = await query

    if (error && isMissingColumnError(error, 'group_id') && canUseGroupId) {
      console.warn('[financialService] Supabase schema does not have group_id column. Falling back to user_id.')
      setHasGroupIdColumn(false)
      const retry = await supabase
        .from('financial_movements')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('user_id', userId)
      data = retry.data
      error = retry.error
    }

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
