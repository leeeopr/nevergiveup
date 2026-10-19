import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { DebtPerson, Debt, DebtPayment, PersonWithDebts, GlobalDebtsMetrics, DebtDirection } from '@/types/personalDebts'
import { financialService } from '@/services/financialService'
import { format } from 'date-fns'

const LOCAL_PERSONS_KEY = 'financeira_debt_persons'
const LOCAL_DEBTS_KEY = 'financeira_debts'
const LOCAL_PAYMENTS_KEY = 'financeira_debt_payments'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
}

async function getUserId(): Promise<string> {
  if (isLocalFallbackActive()) {
    return 'local-user-id'
  }
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return 'local-user-id'
  }
  return session.user.id
}

// Local Storage Helpers
function getStoredPersons(): DebtPerson[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_PERSONS_KEY)
  if (!data) return []
  try { return JSON.parse(data) } catch { return [] }
}

function saveStoredPersons(persons: DebtPerson[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PERSONS_KEY, JSON.stringify(persons))
}

function getStoredDebts(): Debt[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_DEBTS_KEY)
  if (!data) return []
  try { return JSON.parse(data) } catch { return [] }
}

function saveStoredDebts(debts: Debt[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_DEBTS_KEY, JSON.stringify(debts))
}

function getStoredPayments(): DebtPayment[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_PAYMENTS_KEY)
  if (!data) return []
  try { return JSON.parse(data) } catch { return [] }
}

function saveStoredPayments(payments: DebtPayment[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(payments))
}

// Seed initial realistic data for offline/local experience if empty
function ensureLocalSeed() {
  if (typeof window === 'undefined') return
  const persons = getStoredPersons()
  if (persons.length === 0) {
    const p1Id = 'seed-person-joao'
    const p2Id = 'seed-person-mariana'
    const today = new Date()
    const currentMonth = format(today, 'yyyy-MM')
    
    const seedPersons: DebtPerson[] = [
      {
        id: p1Id,
        user_id: 'local-user-id',
        name: 'João da Silva',
        phone: '(11) 98765-4321',
        notes: 'Colega de trabalho e parceiro de projetos',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: p2Id,
        user_id: 'local-user-id',
        name: 'Mariana Costa',
        phone: '(21) 99876-1234',
        notes: 'Designer freelancer - compras compartilhadas',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      }
    ]

    const seedDebts: Debt[] = [
      {
        id: 'seed-debt-1',
        user_id: 'local-user-id',
        person_id: p1Id,
        type: 'to_receive',
        description: 'Empréstimo compra de notebook',
        amount: 500.00,
        due_date: `${currentMonth}-25`,
        notes: 'Acordado em 2 parcelas',
        status: 'partially_paid',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'seed-debt-2',
        user_id: 'local-user-id',
        person_id: p1Id,
        type: 'to_pay',
        description: 'Jantar compartilhado de comemoração',
        amount: 150.00,
        due_date: `${currentMonth}-28`,
        notes: 'Ele pagou a conta inteira',
        status: 'pending',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: 'seed-debt-3',
        user_id: 'local-user-id',
        person_id: p2Id,
        type: 'to_receive',
        description: 'Assinatura software anual dividida',
        amount: 320.00,
        due_date: `${currentMonth}-15`, // Vencida
        notes: 'Adobe Creative Cloud',
        status: 'pending',
        created_at: new Date(Date.now() - 25 * 86400000).toISOString()
      }
    ]

    const seedPayments: DebtPayment[] = [
      {
        id: 'seed-payment-1',
        user_id: 'local-user-id',
        debt_id: 'seed-debt-1',
        amount: 200.00,
        payment_date: format(new Date(Date.now() - 3 * 86400000), 'yyyy-MM-dd'),
        notes: 'Primeira parcela via PIX',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      }
    ]

    saveStoredPersons(seedPersons)
    saveStoredDebts(seedDebts)
    saveStoredPayments(seedPayments)
  }
}

export const personalDebtsService = {
  async getPersonsWithDebts(): Promise<PersonWithDebts[]> {
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    if (isLocalFallbackActive()) {
      ensureLocalSeed()
      const persons = getStoredPersons()
      const debts = getStoredDebts()
      const payments = getStoredPayments()

      return persons.map(person => {
        const personDebts = debts
          .filter(d => d.person_id === person.id)
          .map(debt => {
            const debtPayments = payments.filter(p => p.debt_id === debt.id)
            const total_paid = debtPayments.reduce((acc, p) => acc + Number(p.amount), 0)
            const remaining_amount = Math.max(0, Number(debt.amount) - total_paid)
            
            let status = debt.status
            if (remaining_amount <= 0.009) {
              status = 'paid'
            } else if (total_paid > 0) {
              status = 'partially_paid'
            } else {
              status = 'pending'
            }

            const is_overdue = status !== 'paid' && Boolean(debt.due_date && debt.due_date < todayStr)

            return {
              ...debt,
              payments: debtPayments,
              total_paid,
              remaining_amount,
              status,
              is_overdue
            }
          })
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

        const totalToReceive = personDebts
          .filter(d => d.type === 'to_receive' && d.status !== 'paid')
          .reduce((acc, d) => acc + (d.remaining_amount || 0), 0)

        const totalToPay = personDebts
          .filter(d => d.type === 'to_pay' && d.status !== 'paid')
          .reduce((acc, d) => acc + (d.remaining_amount || 0), 0)

        const netBalance = totalToReceive - totalToPay
        const pendingCount = personDebts.filter(d => d.status !== 'paid').length
        const hasOverdue = personDebts.some(d => d.is_overdue)
        const isSettled = personDebts.length > 0 && personDebts.every(d => d.status === 'paid')

        return {
          ...person,
          debts: personDebts,
          totalToReceive,
          totalToPay,
          netBalance,
          pendingCount,
          hasOverdue,
          isSettled
        }
      }).sort((a, b) => {
        // Persons with open pending balances first, then alphabetically
        if (a.pendingCount > 0 && b.pendingCount === 0) return -1
        if (a.pendingCount === 0 && b.pendingCount > 0) return 1
        return a.name.localeCompare(b.name)
      })
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    try {
      const [personsRes, debtsRes, paymentsRes] = await Promise.all([
        supabase.from('debt_persons').select('*').eq('user_id', userId).order('name', { ascending: true }),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('debt_payments').select('*').eq('user_id', userId)
      ])

      if (personsRes.error) throw personsRes.error
      if (debtsRes.error) throw debtsRes.error
      if (paymentsRes.error) throw paymentsRes.error

      const persons: DebtPerson[] = personsRes.data || []
      const debts: Debt[] = debtsRes.data || []
      const payments: DebtPayment[] = paymentsRes.data || []

      return persons.map(person => {
        const personDebts = debts
          .filter(d => d.person_id === person.id)
          .map(debt => {
            const debtPayments = payments.filter(p => p.debt_id === debt.id)
            const total_paid = debtPayments.reduce((acc, p) => acc + Number(p.amount), 0)
            const remaining_amount = Math.max(0, Number(debt.amount) - total_paid)
            
            let status = debt.status
            if (remaining_amount <= 0.009) {
              status = 'paid'
            } else if (total_paid > 0) {
              status = 'partially_paid'
            } else {
              status = 'pending'
            }

            const is_overdue = status !== 'paid' && Boolean(debt.due_date && debt.due_date < todayStr)

            return {
              ...debt,
              amount: Number(debt.amount),
              payments: debtPayments,
              total_paid,
              remaining_amount,
              status,
              is_overdue
            }
          })
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

        const totalToReceive = personDebts
          .filter(d => d.type === 'to_receive' && d.status !== 'paid')
          .reduce((acc, d) => acc + (d.remaining_amount || 0), 0)

        const totalToPay = personDebts
          .filter(d => d.type === 'to_pay' && d.status !== 'paid')
          .reduce((acc, d) => acc + (d.remaining_amount || 0), 0)

        const netBalance = totalToReceive - totalToPay
        const pendingCount = personDebts.filter(d => d.status !== 'paid').length
        const hasOverdue = personDebts.some(d => d.is_overdue)
        const isSettled = personDebts.length > 0 && personDebts.every(d => d.status === 'paid')

        return {
          ...person,
          debts: personDebts,
          totalToReceive,
          totalToPay,
          netBalance,
          pendingCount,
          hasOverdue,
          isSettled
        }
      }).sort((a, b) => {
        if (a.pendingCount > 0 && b.pendingCount === 0) return -1
        if (a.pendingCount === 0 && b.pendingCount > 0) return 1
        return a.name.localeCompare(b.name)
      })
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase para Cobranças, recorrendo ao cache local:', err)
      ensureLocalSeed()
      return this.getPersonsWithDebts()
    }
  },

  async createPerson(payload: { name: string; phone?: string; notes?: string }): Promise<DebtPerson> {
    const trimmedName = payload.name.trim()
    if (!trimmedName) throw new Error('O nome completo da pessoa é obrigatório.')

    if (isLocalFallbackActive()) {
      const persons = getStoredPersons()
      const newPerson: DebtPerson = {
        id: generateId(),
        user_id: 'local-user-id',
        name: trimmedName,
        phone: payload.phone?.trim() || null,
        notes: payload.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      persons.push(newPerson)
      saveStoredPersons(persons)
      return newPerson
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('debt_persons')
      .insert({
        user_id: userId,
        name: trimmedName,
        phone: payload.phone?.trim() || null,
        notes: payload.notes?.trim() || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Falha ao cadastrar pessoa no banco: ${error.message}`)
    }
    return data
  },

  async updatePerson(id: string, payload: { name: string; phone?: string; notes?: string }): Promise<DebtPerson> {
    const trimmedName = payload.name.trim()
    if (!trimmedName) throw new Error('O nome não pode ficar vazio.')

    if (isLocalFallbackActive()) {
      const persons = getStoredPersons()
      const idx = persons.findIndex(p => p.id === id)
      if (idx === -1) throw new Error('Pessoa não encontrada.')
      
      const updated: DebtPerson = {
        ...persons[idx],
        name: trimmedName,
        phone: payload.phone?.trim() || null,
        notes: payload.notes?.trim() || null,
        updated_at: new Date().toISOString()
      }
      persons[idx] = updated
      saveStoredPersons(persons)
      return updated
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('debt_persons')
      .update({
        name: trimmedName,
        phone: payload.phone?.trim() || null,
        notes: payload.notes?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Falha ao atualizar dados da pessoa: ${error.message}`)
    }
    return data
  },

  async deletePerson(id: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const persons = getStoredPersons().filter(p => p.id !== id)
      const debtsToDelete = getStoredDebts().filter(d => d.person_id === id)
      const debtIds = new Set(debtsToDelete.map(d => d.id))
      
      // Clean up linked financial movements if any payments had them
      const payments = getStoredPayments()
      for (const p of payments) {
        if (debtIds.has(p.debt_id) && p.financial_movement_id) {
          financialService.deleteMovement(p.financial_movement_id).catch(() => {})
        }
      }

      const remainingDebts = getStoredDebts().filter(d => d.person_id !== id)
      const remainingPayments = payments.filter(p => !debtIds.has(p.debt_id))

      saveStoredPersons(persons)
      saveStoredDebts(remainingDebts)
      saveStoredPayments(remainingPayments)
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Find debts and payments to clean linked movements
    const { data: debts } = await supabase.from('debts').select('id').eq('person_id', id).eq('user_id', userId)
    if (debts && debts.length > 0) {
      const dIds = debts.map(d => d.id)
      const { data: payments } = await supabase.from('debt_payments').select('financial_movement_id').in('debt_id', dIds)
      if (payments) {
        for (const p of payments) {
          if (p.financial_movement_id) {
            financialService.deleteMovement(p.financial_movement_id).catch(() => {})
          }
        }
      }
    }

    const { error } = await supabase
      .from('debt_persons')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Erro ao excluir pessoa: ${error.message}`)
    }
  },

  async createDebt(payload: {
    person_id: string
    type: DebtDirection
    description: string
    amount: number
    due_date?: string | null
    notes?: string | null
  }): Promise<Debt> {
    const trimmedDesc = payload.description.trim()
    if (!trimmedDesc) throw new Error('A descrição da dívida é obrigatória.')
    if (payload.amount <= 0) throw new Error('O valor da obrigação deve ser maior que zero.')

    if (isLocalFallbackActive()) {
      const debts = getStoredDebts()
      const newDebt: Debt = {
        id: generateId(),
        user_id: 'local-user-id',
        person_id: payload.person_id,
        type: payload.type,
        description: trimmedDesc,
        amount: Number(payload.amount),
        due_date: payload.due_date || null,
        notes: payload.notes?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payments: [],
        total_paid: 0,
        remaining_amount: Number(payload.amount)
      }
      debts.push(newDebt)
      saveStoredDebts(debts)
      return newDebt
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('debts')
      .insert({
        user_id: userId,
        person_id: payload.person_id,
        type: payload.type,
        description: trimmedDesc,
        amount: Number(payload.amount),
        due_date: payload.due_date || null,
        notes: payload.notes?.trim() || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Falha ao registrar dívida: ${error.message}`)
    }
    return {
      ...data,
      amount: Number(data.amount),
      payments: [],
      total_paid: 0,
      remaining_amount: Number(data.amount)
    }
  },

  async updateDebt(id: string, payload: {
    description?: string
    amount?: number
    due_date?: string | null
    notes?: string | null
    type?: DebtDirection
  }): Promise<Debt> {
    if (isLocalFallbackActive()) {
      const debts = getStoredDebts()
      const idx = debts.findIndex(d => d.id === id)
      if (idx === -1) throw new Error('Dívida não encontrada.')

      const payments = getStoredPayments().filter(p => p.debt_id === id)
      const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0)

      if (payload.amount !== undefined && payload.amount < totalPaid - 0.001) {
        throw new Error(`O novo valor (R$ ${payload.amount.toFixed(2)}) não pode ser inferior ao valor já amortizado (R$ ${totalPaid.toFixed(2)}).`)
      }

      const newAmount = payload.amount !== undefined ? Number(payload.amount) : debts[idx].amount
      const remaining = Math.max(0, newAmount - totalPaid)
      const newStatus = remaining <= 0.009 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending')

      const updated: Debt = {
        ...debts[idx],
        description: payload.description ? payload.description.trim() : debts[idx].description,
        amount: newAmount,
        type: payload.type || debts[idx].type,
        due_date: payload.due_date !== undefined ? payload.due_date : debts[idx].due_date,
        notes: payload.notes !== undefined ? payload.notes : debts[idx].notes,
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      debts[idx] = updated
      saveStoredDebts(debts)
      return updated
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Validate against current payments
    const { data: payments } = await supabase.from('debt_payments').select('amount').eq('debt_id', id)
    const totalPaid = (payments || []).reduce((acc, p) => acc + Number(p.amount), 0)

    if (payload.amount !== undefined && payload.amount < totalPaid - 0.001) {
      throw new Error(`O novo valor (R$ ${payload.amount.toFixed(2)}) não pode ser inferior ao valor já pago (R$ ${totalPaid.toFixed(2)}).`)
    }

    const updateFields: any = { updated_at: new Date().toISOString() }
    if (payload.description) updateFields.description = payload.description.trim()
    if (payload.amount !== undefined) {
      updateFields.amount = Number(payload.amount)
      const remaining = Math.max(0, Number(payload.amount) - totalPaid)
      updateFields.status = remaining <= 0.009 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending')
    }
    if (payload.type) updateFields.type = payload.type
    if (payload.due_date !== undefined) updateFields.due_date = payload.due_date
    if (payload.notes !== undefined) updateFields.notes = payload.notes

    const { data, error } = await supabase
      .from('debts')
      .update(updateFields)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Falha ao atualizar dívida: ${error.message}`)
    }
    return {
      ...data,
      amount: Number(data.amount)
    }
  },

  async deleteDebt(id: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const debts = getStoredDebts().filter(d => d.id !== id)
      const payments = getStoredPayments()
      
      // Remove any financial movements created by payments of this debt
      for (const p of payments) {
        if (p.debt_id === id && p.financial_movement_id) {
          financialService.deleteMovement(p.financial_movement_id).catch(() => {})
        }
      }

      const remainingPayments = payments.filter(p => p.debt_id !== id)
      saveStoredDebts(debts)
      saveStoredPayments(remainingPayments)
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data: payments } = await supabase.from('debt_payments').select('financial_movement_id').eq('debt_id', id)
    if (payments) {
      for (const p of payments) {
        if (p.financial_movement_id) {
          financialService.deleteMovement(p.financial_movement_id).catch(() => {})
        }
      }
    }

    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Falha ao excluir dívida: ${error.message}`)
    }
  },

  async registerPayment(payload: {
    debt_id: string
    person_name: string
    debt_description: string
    debt_type: DebtDirection
    amount: number
    payment_date: string
    notes?: string
    syncFinancialMovement: boolean
  }): Promise<DebtPayment> {
    if (payload.amount <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero.')
    }

    let linkedMovementId: string | null = null

    // If requested, synchronize with the main financial movements
    if (payload.syncFinancialMovement) {
      try {
        const isReceiving = payload.debt_type === 'to_receive'
        const newMovement = await financialService.insertMovement({
          date: payload.payment_date,
          type: isReceiving ? 'entrada' : 'gasto_diario',
          amount: Number(payload.amount),
          description: isReceiving 
            ? `Cobrança Recebida: ${payload.person_name} (${payload.debt_description})`
            : `Dívida Paga: ${payload.person_name} (${payload.debt_description})`,
          tag: isReceiving ? 'Cobrança' : 'Dívida',
          is_recurring: false
        })
        linkedMovementId = newMovement.id
      } catch (err: any) {
        console.warn('Não foi possível gerar movimentação financeira automática:', err)
      }
    }

    if (isLocalFallbackActive()) {
      const debts = getStoredDebts()
      const payments = getStoredPayments()
      const debtIdx = debts.findIndex(d => d.id === payload.debt_id)
      if (debtIdx === -1) throw new Error('Dívida não encontrada.')

      const currentDebt = debts[debtIdx]
      const debtPayments = payments.filter(p => p.debt_id === payload.debt_id)
      const currentPaid = debtPayments.reduce((acc, p) => acc + Number(p.amount), 0)
      const remainingBefore = Math.max(0, currentDebt.amount - currentPaid)

      if (payload.amount > remainingBefore + 0.01) {
        throw new Error(`O valor informado (R$ ${payload.amount.toFixed(2)}) ultrapassa o saldo restante (R$ ${remainingBefore.toFixed(2)}).`)
      }

      const newPayment: DebtPayment = {
        id: generateId(),
        user_id: 'local-user-id',
        debt_id: payload.debt_id,
        amount: Number(payload.amount),
        payment_date: payload.payment_date,
        notes: payload.notes?.trim() || null,
        financial_movement_id: linkedMovementId,
        created_at: new Date().toISOString()
      }

      payments.push(newPayment)
      saveStoredPayments(payments)

      // Recalculate debt status
      const totalPaidAfter = currentPaid + Number(payload.amount)
      const remainingAfter = Math.max(0, currentDebt.amount - totalPaidAfter)
      debts[debtIdx].status = remainingAfter <= 0.009 ? 'paid' : 'partially_paid'
      debts[debtIdx].updated_at = new Date().toISOString()
      saveStoredDebts(debts)

      return newPayment
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    // Check debt remaining amount in Supabase
    const { data: debt, error: debtErr } = await supabase.from('debts').select('amount').eq('id', payload.debt_id).single()
    if (debtErr || !debt) throw new Error('Dívida não encontrada no banco.')

    const { data: existingPayments } = await supabase.from('debt_payments').select('amount').eq('debt_id', payload.debt_id)
    const currentPaid = (existingPayments || []).reduce((acc, p) => acc + Number(p.amount), 0)
    const remainingBefore = Math.max(0, Number(debt.amount) - currentPaid)

    if (payload.amount > remainingBefore + 0.01) {
      throw new Error(`O valor informado (R$ ${payload.amount.toFixed(2)}) ultrapassa o saldo pendente (R$ ${remainingBefore.toFixed(2)}).`)
    }

    const { data: paymentData, error: payErr } = await supabase
      .from('debt_payments')
      .insert({
        user_id: userId,
        debt_id: payload.debt_id,
        amount: Number(payload.amount),
        payment_date: payload.payment_date,
        notes: payload.notes?.trim() || null,
        financial_movement_id: linkedMovementId
      })
      .select()
      .single()

    if (payErr) {
      throw new Error(`Erro ao registrar pagamento: ${payErr.message}`)
    }

    // Update status in debt
    const totalPaidAfter = currentPaid + Number(payload.amount)
    const remainingAfter = Math.max(0, Number(debt.amount) - totalPaidAfter)
    const newStatus = remainingAfter <= 0.009 ? 'paid' : 'partially_paid'

    await supabase
      .from('debts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', payload.debt_id)

    return {
      ...paymentData,
      amount: Number(paymentData.amount)
    }
  },

  async deletePayment(paymentId: string, debtId: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const payments = getStoredPayments()
      const payment = payments.find(p => p.id === paymentId)
      if (payment?.financial_movement_id) {
        financialService.deleteMovement(payment.financial_movement_id).catch(() => {})
      }

      const filtered = payments.filter(p => p.id !== paymentId)
      saveStoredPayments(filtered)

      // Recalculate debt status
      const debts = getStoredDebts()
      const idx = debts.findIndex(d => d.id === debtId)
      if (idx !== -1) {
        const remainingPayments = filtered.filter(p => p.debt_id === debtId)
        const totalPaid = remainingPayments.reduce((acc, p) => acc + Number(p.amount), 0)
        const remaining = Math.max(0, debts[idx].amount - totalPaid)
        debts[idx].status = remaining <= 0.009 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending')
        debts[idx].updated_at = new Date().toISOString()
        saveStoredDebts(debts)
      }
      return
    }

    const supabase = getSupabase()
    const userId = await getUserId()

    const { data: payment } = await supabase
      .from('debt_payments')
      .select('financial_movement_id')
      .eq('id', paymentId)
      .eq('user_id', userId)
      .single()

    if (payment?.financial_movement_id) {
      financialService.deleteMovement(payment.financial_movement_id).catch(() => {})
    }

    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Erro ao excluir pagamento: ${error.message}`)
    }

    // Recalculate debt status
    const { data: remainingPayments } = await supabase.from('debt_payments').select('amount').eq('debt_id', debtId)
    const { data: debt } = await supabase.from('debts').select('amount').eq('id', debtId).single()
    
    if (debt) {
      const totalPaid = (remainingPayments || []).reduce((acc, p) => acc + Number(p.amount), 0)
      const remaining = Math.max(0, Number(debt.amount) - totalPaid)
      const newStatus = remaining <= 0.009 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'pending')
      await supabase.from('debts').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', debtId)
    }
  },

  calculateGlobalMetrics(persons: PersonWithDebts[]): GlobalDebtsMetrics {
    let totalToReceive = 0
    let totalToPay = 0
    let overdueAmount = 0
    let overdueCount = 0
    let pendingCount = 0

    const todayStr = format(new Date(), 'yyyy-MM-dd')

    for (const person of persons) {
      totalToReceive += person.totalToReceive
      totalToPay += person.totalToPay

      for (const debt of person.debts) {
        if (debt.status !== 'paid') {
          pendingCount += 1
          if (debt.due_date && debt.due_date < todayStr) {
            overdueCount += 1
            overdueAmount += (debt.remaining_amount || 0)
          }
        }
      }
    }

    return {
      totalToReceive,
      totalToPay,
      netBalance: totalToReceive - totalToPay,
      overdueAmount,
      overdueCount,
      pendingCount,
      totalPersons: persons.length
    }
  }
}
