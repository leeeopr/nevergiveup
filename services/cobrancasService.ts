import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { Charge, ChargeOccurrence, OccurrenceStatus, ChargeSummaryMetrics } from '@/types/cobranca'
import { generateExpectedOccurrences, calculateChargeStats } from '@/utils/chargeUtils'
import { companyService } from '@/services/companyService'

const LOCAL_CHARGES_KEY = 'financeira_charges'
const LOCAL_OCCURRENCES_KEY = 'financeira_charge_occurrences'

function getLocalCharges(): Charge[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_CHARGES_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalCharges(charges: Charge[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_CHARGES_KEY, JSON.stringify(charges))
}

function getLocalOccurrences(): ChargeOccurrence[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(LOCAL_OCCURRENCES_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalOccurrences(occurrences: ChargeOccurrence[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_OCCURRENCES_KEY, JSON.stringify(occurrences))
}

function generateMockId(): string {
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
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return session.user.id
}

function getLocalChargesWithOccurrences(): Charge[] {
  const charges = getLocalCharges()
  const occurrences = getLocalOccurrences()

  return charges.map(c => {
    const occs = occurrences
      .filter(o => o.charge_id === c.id)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map(o => ({
        ...o,
        client_name: c.client_name,
        charge_description: c.description,
        billing_day: c.billing_day
      }))
    return { ...c, occurrences: occs }
  })
}

function getLocalOccurrencesByRange(startDate: string, endDate: string): ChargeOccurrence[] {
  const charges = getLocalCharges()
  const occurrences = getLocalOccurrences()
  const chargeMap = new Map<string, Charge>()
  charges.forEach(c => chargeMap.set(c.id, c))

  return occurrences
    .filter(o => o.due_date >= startDate && o.due_date <= endDate)
    .map(o => {
      const c = chargeMap.get(o.charge_id)
      return {
        ...o,
        client_name: c?.client_name || 'Cliente',
        charge_description: c?.description || 'Cobrança',
        billing_day: c?.billing_day
      }
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
}

function createLocalCharge(payload: {
  client_id?: string | null
  client_name: string
  description: string
  amount: number
  start_date: string
  end_date: string
  billing_day: number
  notes?: string | null
}): Charge {
  const expectedOccs = generateExpectedOccurrences(
    payload.start_date,
    payload.end_date,
    payload.billing_day,
    payload.amount
  )
  const userId = 'local-user-id'
  const chargeId = generateMockId()
  const now = new Date().toISOString()

  const newCharge: Charge = {
    id: chargeId,
    user_id: userId,
    client_id: payload.client_id || null,
    client_name: payload.client_name,
    description: payload.description,
    amount: Number(payload.amount),
    start_date: payload.start_date,
    end_date: payload.end_date,
    billing_day: payload.billing_day,
    notes: payload.notes || null,
    created_at: now,
    updated_at: now
  }

  const newOccs: ChargeOccurrence[] = expectedOccs.map(exp => ({
    id: generateMockId(),
    charge_id: chargeId,
    user_id: userId,
    reference_month: exp.reference_month,
    due_date: exp.due_date,
    amount: exp.amount,
    status: 'pending',
    paid_at: null,
    financial_movement_id: null,
    created_at: now,
    updated_at: now,
    client_name: payload.client_name,
    charge_description: payload.description,
    billing_day: payload.billing_day
  }))

  const currentCharges = getLocalCharges()
  const currentOccs = getLocalOccurrences()

  saveLocalCharges([newCharge, ...currentCharges])
  saveLocalOccurrences([...currentOccs, ...newOccs])

  return { ...newCharge, occurrences: newOccs }
}

function updateLocalCharge(
  chargeId: string,
  payload: {
    client_id?: string | null
    client_name?: string
    description?: string
    amount?: number
    start_date?: string
    end_date?: string
    billing_day?: number
    notes?: string | null
  }
): Charge {
  const charges = getLocalCharges()
  const idx = charges.findIndex(c => c.id === chargeId)
  if (idx === -1) throw new Error('Cobrança não encontrada.')

  const oldCharge = charges[idx]
  const updatedCharge: Charge = {
    ...oldCharge,
    ...payload,
    amount: payload.amount !== undefined ? Number(payload.amount) : oldCharge.amount,
    updated_at: new Date().toISOString()
  }
  charges[idx] = updatedCharge
  saveLocalCharges(charges)

  const occurrences = getLocalOccurrences()
  const existingForCharge = occurrences.filter(o => o.charge_id === chargeId)

  const expected = generateExpectedOccurrences(
    updatedCharge.start_date,
    updatedCharge.end_date,
    updatedCharge.billing_day,
    updatedCharge.amount
  )

  const existingMap = new Map<string, ChargeOccurrence>()
  existingForCharge.forEach(o => existingMap.set(o.reference_month, o))

  const updatedOccsList: ChargeOccurrence[] = []
  const remainingGlobalOccs = occurrences.filter(o => o.charge_id !== chargeId)

  expected.forEach(exp => {
    const existing = existingMap.get(exp.reference_month)
    if (existing) {
      updatedOccsList.push({
        ...existing,
        due_date: exp.due_date,
        amount: existing.status === 'paid' ? existing.amount : exp.amount,
        client_name: updatedCharge.client_name,
        charge_description: updatedCharge.description,
        billing_day: updatedCharge.billing_day,
        updated_at: new Date().toISOString()
      })
    } else {
      updatedOccsList.push({
        id: generateMockId(),
        charge_id: chargeId,
        user_id: 'local-user-id',
        reference_month: exp.reference_month,
        due_date: exp.due_date,
        amount: exp.amount,
        status: 'pending',
        paid_at: null,
        financial_movement_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_name: updatedCharge.client_name,
        charge_description: updatedCharge.description,
        billing_day: updatedCharge.billing_day
      })
    }
  })

  existingForCharge.forEach(o => {
    if (o.status === 'paid' && !expected.some(exp => exp.reference_month === o.reference_month)) {
      updatedOccsList.push(o)
    }
  })

  saveLocalOccurrences([...remainingGlobalOccs, ...updatedOccsList])
  return { ...updatedCharge, occurrences: updatedOccsList }
}

function updateLocalOccurrenceStatus(occurrenceId: string, newStatus: OccurrenceStatus): ChargeOccurrence {
  const occurrences = getLocalOccurrences()
  const idx = occurrences.findIndex(o => o.id === occurrenceId)
  if (idx === -1) throw new Error('Parcela não encontrada.')

  const occ = occurrences[idx]
  const now = new Date().toISOString()
  const paidAt = newStatus === 'paid' ? now : null

  let movementId = occ.financial_movement_id || null

  const localMovsKey = 'financeira_movements'
  const movsData = localStorage.getItem(localMovsKey)
  let movs: any[] = movsData ? JSON.parse(movsData) : []

  if (newStatus === 'paid') {
    if (movementId) {
      movs = movs.map(m => m.id === movementId ? { ...m, is_paid: true, paid_at: now } : m)
    } else {
      movementId = generateMockId()
      const newMov = {
        id: movementId,
        user_id: 'local-user-id',
        type: 'entrada',
        amount: Number(occ.amount),
        description: `[Cobrança] ${occ.charge_description || 'Mensalidade'} - ${occ.client_name || 'Cliente'} (${occ.reference_month})`,
        date: occ.due_date,
        tag: 'Cobrança',
        is_recurring: false,
        debtor_name: occ.client_name || '',
        is_paid: true,
        paid_at: now,
        created_at: now
      }
      movs.push(newMov)
    }
  } else {
    if (movementId) {
      movs = movs.map(m => m.id === movementId ? { ...m, is_paid: false, paid_at: null } : m)
    }
  }

  localStorage.setItem(localMovsKey, JSON.stringify(movs))

  const updatedOcc: ChargeOccurrence = {
    ...occ,
    status: newStatus,
    paid_at: paidAt,
    financial_movement_id: movementId,
    updated_at: now
  }

  occurrences[idx] = updatedOcc
  saveLocalOccurrences(occurrences)

  return updatedOcc
}

export const cobrancasService = {
  /**
   * Fetches all charges for the user along with their occurrences.
   */
  async getCharges(): Promise<Charge[]> {
    if (isLocalFallbackActive()) {
      return getLocalChargesWithOccurrences()
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: charges, error: chargesErr } = await supabase
        .from('charges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (chargesErr) {
        console.warn('Error fetching charges from Supabase, using local fallback:', chargesErr.message)
        return getLocalChargesWithOccurrences()
      }

      if (!charges || charges.length === 0) return []

      const chargeIds = charges.map(c => c.id)

      const { data: occurrences, error: occErr } = await supabase
        .from('charge_occurrences')
        .select('*')
        .eq('user_id', userId)
        .in('charge_id', chargeIds)
        .order('due_date', { ascending: true })

      if (occErr) {
        console.warn('Error fetching charge occurrences from Supabase, using local fallback:', occErr.message)
        return getLocalChargesWithOccurrences()
      }

      const occMap = new Map<string, ChargeOccurrence[]>()
      occurrences?.forEach(occ => {
        if (!occMap.has(occ.charge_id)) {
          occMap.set(occ.charge_id, [])
        }
        occMap.get(occ.charge_id)!.push(occ)
      })

      return charges.map(c => {
        const chargeOccs = (occMap.get(c.id) || []).map(o => ({
          ...o,
          client_name: c.client_name,
          charge_description: c.description,
          billing_day: c.billing_day
        }))
        return { ...c, occurrences: chargeOccs }
      })
    } catch (err) {
      console.warn('Supabase getCharges failed, falling back to local storage:', err)
      return getLocalChargesWithOccurrences()
    }
  },

  /**
   * Creates a new charge and automatically generates its monthly occurrences.
   */
  async createCharge(payload: {
    client_id?: string | null
    client_name: string
    description: string
    amount: number
    start_date: string
    end_date: string
    billing_day: number
    notes?: string | null
  }): Promise<Charge> {
    if (isLocalFallbackActive()) {
      return createLocalCharge(payload)
    }

    try {
      const expectedOccs = generateExpectedOccurrences(
        payload.start_date,
        payload.end_date,
        payload.billing_day,
        payload.amount
      )

      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: charge, error: chargeErr } = await supabase
        .from('charges')
        .insert({
          user_id: userId,
          client_id: payload.client_id || null,
          client_name: payload.client_name,
          description: payload.description,
          amount: Number(payload.amount),
          start_date: payload.start_date,
          end_date: payload.end_date,
          billing_day: payload.billing_day,
          notes: payload.notes || null
        })
        .select()
        .single()

      if (chargeErr || !charge) {
        console.warn('Supabase createCharge failed, using local fallback:', chargeErr?.message)
        return createLocalCharge(payload)
      }

      const occsToInsert = expectedOccs.map(exp => ({
        charge_id: charge.id,
        user_id: userId,
        reference_month: exp.reference_month,
        due_date: exp.due_date,
        amount: exp.amount,
        status: 'pending'
      }))

      if (occsToInsert.length > 0) {
        const { data: createdOccs, error: occsErr } = await supabase
          .from('charge_occurrences')
          .insert(occsToInsert)
          .select()

        if (occsErr) {
          console.error('Error creating charge occurrences:', occsErr)
        }

        return {
          ...charge,
          occurrences: (createdOccs || []).map(o => ({
            ...o,
            client_name: charge.client_name,
            charge_description: charge.description,
            billing_day: charge.billing_day
          }))
        }
      }

      return { ...charge, occurrences: [] }
    } catch (err) {
      console.warn('Supabase createCharge failed, falling back to local storage:', err)
      return createLocalCharge(payload)
    }
  },

  /**
   * Updates charge fields and adjusts missing occurrences while PRESERVING past paid records!
   */
  async updateCharge(
    chargeId: string,
    payload: {
      client_id?: string | null
      client_name?: string
      description?: string
      amount?: number
      start_date?: string
      end_date?: string
      billing_day?: number
      notes?: string | null
    }
  ): Promise<Charge> {
    if (isLocalFallbackActive()) {
      return updateLocalCharge(chargeId, payload)
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: updatedCharge, error: updateErr } = await supabase
        .from('charges')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', chargeId)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateErr || !updatedCharge) {
        console.warn('Supabase updateCharge failed, using local fallback:', updateErr?.message)
        return updateLocalCharge(chargeId, payload)
      }

      // Fetch existing occurrences
      const { data: existingOccs } = await supabase
        .from('charge_occurrences')
        .select('*')
        .eq('charge_id', chargeId)

      const expected = generateExpectedOccurrences(
        updatedCharge.start_date,
        updatedCharge.end_date,
        updatedCharge.billing_day,
        updatedCharge.amount
      )

      const existingMap = new Map<string, ChargeOccurrence>()
      existingOccs?.forEach(o => existingMap.set(o.reference_month, o))

      const newOccsToInsert: any[] = []

      for (const exp of expected) {
        const existing = existingMap.get(exp.reference_month)
        if (existing) {
          if (existing.status === 'pending') {
            await supabase
              .from('charge_occurrences')
              .update({
                due_date: exp.due_date,
                amount: exp.amount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
          }
        } else {
          newOccsToInsert.push({
            charge_id: chargeId,
            user_id: userId,
            reference_month: exp.reference_month,
            due_date: exp.due_date,
            amount: exp.amount,
            status: 'pending'
          })
        }
      }

      if (newOccsToInsert.length > 0) {
        await supabase.from('charge_occurrences').insert(newOccsToInsert)
      }

      const { data: finalOccs } = await supabase
        .from('charge_occurrences')
        .select('*')
        .eq('charge_id', chargeId)
        .order('due_date', { ascending: true })

      return {
        ...updatedCharge,
        occurrences: (finalOccs || []).map(o => ({
          ...o,
          client_name: updatedCharge.client_name,
          charge_description: updatedCharge.description,
          billing_day: updatedCharge.billing_day
        }))
      }
    } catch (err) {
      console.warn('Supabase updateCharge failed, falling back to local storage:', err)
      return updateLocalCharge(chargeId, payload)
    }
  },

  /**
   * Deletes a charge and all associated occurrences.
   */
  async deleteCharge(chargeId: string): Promise<void> {
    if (isLocalFallbackActive()) {
      const charges = getLocalCharges().filter(c => c.id !== chargeId)
      const occurrences = getLocalOccurrences().filter(o => o.charge_id !== chargeId)
      saveLocalCharges(charges)
      saveLocalOccurrences(occurrences)
      return
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { error } = await supabase
        .from('charges')
        .delete()
        .eq('id', chargeId)
        .eq('user_id', userId)

      if (error) {
        console.warn('Supabase deleteCharge error, performing local delete:', error.message)
        const charges = getLocalCharges().filter(c => c.id !== chargeId)
        const occurrences = getLocalOccurrences().filter(o => o.charge_id !== chargeId)
        saveLocalCharges(charges)
        saveLocalOccurrences(occurrences)
      }
    } catch (err) {
      console.warn('Supabase deleteCharge failed, performing local delete:', err)
      const charges = getLocalCharges().filter(c => c.id !== chargeId)
      const occurrences = getLocalOccurrences().filter(o => o.charge_id !== chargeId)
      saveLocalCharges(charges)
      saveLocalOccurrences(occurrences)
    }
  },

  /**
   * Toggles an occurrence status between 'pending' and 'paid'.
   */
  async updateOccurrenceStatus(occurrenceId: string, newStatus: OccurrenceStatus): Promise<ChargeOccurrence> {
    if (isLocalFallbackActive()) {
      const updated = updateLocalOccurrenceStatus(occurrenceId, newStatus)
      if (newStatus === 'paid') {
        try {
          const today = new Date().toISOString().split('T')[0]
          await this.getOrCreateReceiptForOccurrence(occurrenceId, today, 'PIX')
        } catch (rErr) {
          console.warn('Auto receipt creation in local mode failed:', rErr)
        }
      }
      return updated
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: occ, error: fetchErr } = await supabase
        .from('charge_occurrences')
        .select('*, charges(description, client_name, client_id, notes)')
        .eq('id', occurrenceId)
        .eq('user_id', userId)
        .single()

      if (fetchErr || !occ) {
        console.warn('Supabase occurrence fetch failed, using local update:', fetchErr?.message)
        const updated = updateLocalOccurrenceStatus(occurrenceId, newStatus)
        if (newStatus === 'paid') {
          try {
            const today = new Date().toISOString().split('T')[0]
            await this.getOrCreateReceiptForOccurrence(occurrenceId, today, 'PIX')
          } catch (rErr) {
            console.warn('Auto receipt creation in local fallback failed:', rErr)
          }
        }
        return updated
      }

      const now = new Date().toISOString()
      const todayDate = now.split('T')[0]
      const clientName = occ.charges?.client_name || 'Cliente'
      const chargeDesc = occ.charges?.description || 'Cobrança'

      let movementId = occ.financial_movement_id

      if (newStatus === 'paid') {
        if (movementId) {
          await supabase
            .from('financial_movements')
            .update({ is_paid: true, paid_at: now })
            .eq('id', movementId)
        } else {
          const expectedDesc = `[Cobrança] ${chargeDesc} - ${clientName} (${occ.reference_month})`
          const { data: existingMov } = await supabase
            .from('financial_movements')
            .select('id')
            .eq('user_id', userId)
            .eq('description', expectedDesc)
            .eq('date', occ.due_date)
            .maybeSingle()

          if (existingMov) {
            movementId = existingMov.id
            await supabase
              .from('financial_movements')
              .update({ is_paid: true, paid_at: now })
              .eq('id', movementId)
          } else {
            const { data: newMov, error: movErr } = await supabase
              .from('financial_movements')
              .insert({
                user_id: userId,
                type: 'entrada',
                amount: Number(occ.amount),
                description: expectedDesc,
                date: occ.due_date,
                tag: 'Cobrança',
                is_recurring: false,
                debtor_name: clientName,
                is_paid: true,
                paid_at: now
              })
              .select()
              .single()

            if (!movErr && newMov) {
              movementId = newMov.id
            }
          }
        }
      } else {
        if (movementId) {
          await supabase
            .from('financial_movements')
            .update({ is_paid: false, paid_at: null })
            .eq('id', movementId)
        }
      }

      const paymentDateToSave = newStatus === 'paid' ? (occ.payment_date || todayDate) : null

      const { data: updated, error: updateErr } = await supabase
        .from('charge_occurrences')
        .update({
          status: newStatus,
          paid_at: newStatus === 'paid' ? now : null,
          payment_date: paymentDateToSave,
          financial_movement_id: movementId,
          updated_at: now
        })
        .eq('id', occurrenceId)
        .select()
        .single()

      if (updateErr || !updated) {
        console.warn('Supabase update occurrence status failed, using local update:', updateErr?.message)
        const updatedLocal = updateLocalOccurrenceStatus(occurrenceId, newStatus)
        if (newStatus === 'paid') {
          try {
            await this.getOrCreateReceiptForOccurrence(occurrenceId, todayDate, 'PIX')
          } catch (rErr) {
            console.warn('Auto receipt creation in local fallback failed:', rErr)
          }
        }
        return updatedLocal
      }

      if (newStatus === 'paid') {
        try {
          await this.getOrCreateReceiptForOccurrence(occurrenceId, paymentDateToSave || todayDate, occ.payment_method || 'PIX')
        } catch (rErr) {
          console.warn('Auto receipt creation failed during status toggle:', rErr)
        }
      }

      return {
        ...updated,
        client_name: clientName,
        charge_description: chargeDesc
      }
    } catch (err) {
      console.warn('Supabase updateOccurrenceStatus failed, using local fallback:', err)
      const updatedLocal = updateLocalOccurrenceStatus(occurrenceId, newStatus)
      if (newStatus === 'paid') {
        try {
          const today = new Date().toISOString().split('T')[0]
          await this.getOrCreateReceiptForOccurrence(occurrenceId, today, 'PIX')
        } catch (rErr) {
          console.warn('Auto receipt creation in local fallback failed:', rErr)
        }
      }
      return updatedLocal
    }
  },

  /**
   * Confirms payment of an occurrence specifying payment date and payment method.
   * Automatically creates or links the receipt with issue_date = paymentDate.
   */
  async confirmPaymentWithDetails(
    occurrenceId: string, 
    paymentDate: string, 
    paymentMethod: string = 'PIX'
  ): Promise<{ occurrence: ChargeOccurrence; receipt: any }> {
    const now = new Date().toISOString()

    if (isLocalFallbackActive()) {
      const occurrences = getLocalOccurrences()
      const idx = occurrences.findIndex(o => o.id === occurrenceId)
      if (idx === -1) throw new Error('Parcela não encontrada.')

      const occ = occurrences[idx]
      occ.status = 'paid'
      occ.paid_at = now
      occ.payment_date = paymentDate
      occ.payment_method = paymentMethod
      occ.updated_at = now
      occurrences[idx] = occ
      saveLocalOccurrences(occurrences)

      const receipt = await this.getOrCreateReceiptForOccurrence(occurrenceId, paymentDate, paymentMethod)
      occ.receipt_id = receipt.id
      occurrences[idx] = occ
      saveLocalOccurrences(occurrences)

      return { occurrence: occ, receipt }
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      // 1. Update occurrence status and payment_date
      const { data: updatedOcc, error: updateErr } = await supabase
        .from('charge_occurrences')
        .update({
          status: 'paid',
          paid_at: now,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          updated_at: now
        })
        .eq('id', occurrenceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateErr || !updatedOcc) {
        console.warn('Failed to update occurrence in Supabase, using local fallback:', updateErr?.message)
        const occurrences = getLocalOccurrences()
        const idx = occurrences.findIndex(o => o.id === occurrenceId)
        if (idx !== -1) {
          const occ = occurrences[idx]
          occ.status = 'paid'
          occ.paid_at = now
          occ.payment_date = paymentDate
          occ.payment_method = paymentMethod
          occ.updated_at = now
          saveLocalOccurrences(occurrences)
          const receipt = await this.getOrCreateReceiptForOccurrence(occurrenceId, paymentDate, paymentMethod)
          occ.receipt_id = receipt.id
          saveLocalOccurrences(occurrences)
          return { occurrence: occ, receipt }
        }
        throw new Error('Erro ao confirmar pagamento.')
      }

      // 2. Automatically generate or retrieve receipt with issue_date = paymentDate
      const receipt = await this.getOrCreateReceiptForOccurrence(occurrenceId, paymentDate, paymentMethod)

      // 3. Link receipt_id back to occurrence if not set
      if (receipt?.id && updatedOcc.receipt_id !== receipt.id) {
        await supabase
          .from('charge_occurrences')
          .update({ receipt_id: receipt.id })
          .eq('id', occurrenceId)
        updatedOcc.receipt_id = receipt.id
      }

      return { occurrence: updatedOcc, receipt }
    } catch (err) {
      console.error('Exception confirming payment with details:', err)
      throw err
    }
  },

  /**
   * Generates or retrieves an existing receipt for a recurring charge occurrence.
   * Guarantees IDEMPOTENCY: Does NOT duplicate receipts for the same occurrence.
   * Issue date of the receipt = Payment date of the occurrence!
   */
  async getOrCreateReceiptForOccurrence(
    occurrenceId: string, 
    paymentDate?: string, 
    paymentMethod: string = 'PIX'
  ): Promise<any> {
    const isLocal = isLocalFallbackActive()

    // Retrieve occurrence and charge
    let occ: ChargeOccurrence | null = null
    let charge: Charge | null = null
    let clientObj: any = null
    let activeUserId = 'local-user-id'

    if (!isLocal) {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) activeUserId = session.user.id

        const { data: dbOcc } = await supabase
          .from('charge_occurrences')
          .select('*')
          .eq('id', occurrenceId)
          .maybeSingle()

        if (dbOcc) {
          occ = dbOcc as ChargeOccurrence
          const { data: dbCharge } = await supabase
            .from('charges')
            .select('*')
            .eq('id', dbOcc.charge_id)
            .maybeSingle()
          if (dbCharge) charge = dbCharge as Charge

          if (charge?.client_id) {
            const { data: dbClient } = await supabase
              .from('clients')
              .select('*')
              .eq('id', charge.client_id)
              .maybeSingle()
            if (dbClient) clientObj = dbClient
          }
        }
      } catch (err) {
        console.warn('Could not fetch occurrence from Supabase:', err)
      }
    }

    if (!occ) {
      const localOccs = getLocalOccurrences()
      occ = localOccs.find(o => o.id === occurrenceId) || null
    }

    if (!charge && occ) {
      const localCharges = getLocalCharges()
      charge = localCharges.find(c => c.id === occ!.charge_id) || null
    }

    if (!occ || !charge) {
      throw new Error('Cobrança ou parcela não encontrada para emitir recibo.')
    }

    const effectivePaymentDate = paymentDate || occ.payment_date || (occ.paid_at ? occ.paid_at.split('T')[0] : new Date().toISOString().split('T')[0])

    // Check if receipt ALREADY exists for this occurrence (Idempotency)
    const existingReceipts = await companyService.getReceipts(activeUserId)
    const existingReceipt = existingReceipts.find(
      r => r.charge_occurrence_id === occurrenceId || (r.charge_id === charge!.id && r.reference_month === occ!.reference_month)
    )

    if (existingReceipt) {
      // If issue_date or payment_method changed, update it
      let needsUpdate = false
      const updates: any = {}
      if (existingReceipt.issue_date !== effectivePaymentDate) {
        updates.issue_date = effectivePaymentDate
        needsUpdate = true
      }
      if (paymentMethod && existingReceipt.payment_method !== paymentMethod) {
        updates.payment_method = paymentMethod
        needsUpdate = true
      }
      if (needsUpdate) {
        const updatedR = await companyService.updateReceipt(activeUserId, existingReceipt.id, updates)
        return updatedR
      }
      return existingReceipt
    }

    // Calculate service period from reference_month (e.g. 2026-08 => 2026-08-01 to 2026-08-31)
    const [yearNum, monthNum] = occ.reference_month.split('-').map(Number)
    const startDayStr = `${occ.reference_month}-01`
    const lastDayNum = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate()
    const lastDayStr = (lastDayNum < 10 ? '0' : '') + lastDayNum
    const endDayStr = `${occ.reference_month}-${lastDayStr}`

    // Create new automatic receipt
    const receiptPayload = {
      client_id: charge.client_id || null,
      client_name: charge.client_name,
      client_document: clientObj?.document || null,
      client_email: clientObj?.email || null,
      client_phone: clientObj?.phone || null,
      description: charge.description,
      amount: Number(occ.amount),
      issue_date: effectivePaymentDate, // ISSUE DATE = PAYMENT DATE
      service_start_date: startDayStr,
      service_end_date: endDayStr,
      payment_method: paymentMethod || occ.payment_method || 'PIX',
      status: 'issued' as const,
      notes: charge.notes ? `Mensalidade ref. ${occ.reference_month}. ${charge.notes}` : `Mensalidade ref. ${occ.reference_month}.`,
      charge_id: charge.id,
      charge_occurrence_id: occ.id,
      reference_month: occ.reference_month,
      receipt_sent: occ.receipt_sent || false,
      receipt_sent_at: occ.receipt_sent_at || null,
      receipt_sent_by: occ.receipt_sent_by || null
    }

    const createdReceipt = await companyService.createReceipt(activeUserId, receiptPayload)

    // Link receipt_id back to occurrence
    if (createdReceipt?.id) {
      if (isLocal) {
        const localOccs = getLocalOccurrences()
        const oIdx = localOccs.findIndex(o => o.id === occurrenceId)
        if (oIdx !== -1) {
          localOccs[oIdx].receipt_id = createdReceipt.id
          localOccs[oIdx].payment_date = effectivePaymentDate
          saveLocalOccurrences(localOccs)
        }
      } else {
        try {
          const supabase = getSupabase()
          await supabase
            .from('charge_occurrences')
            .update({ receipt_id: createdReceipt.id, payment_date: effectivePaymentDate })
            .eq('id', occurrenceId)
        } catch (linkErr) {
          console.warn('Failed linking receipt_id in Supabase:', linkErr)
        }
      }
    }

    return createdReceipt
  },

  /**
   * Toggles the sent status (receipt_sent) of an occurrence and updates its linked receipt.
   * Tracks receipt_sent, receipt_sent_at, and receipt_sent_by.
   */
  async toggleOccurrenceReceiptSent(
    occurrenceId: string, 
    sentStatus: boolean, 
    userIdentifier: string = 'Usuário'
  ): Promise<ChargeOccurrence> {
    const now = new Date().toISOString()
    const sentAt = sentStatus ? now : null
    const sentBy = sentStatus ? userIdentifier : null

    if (isLocalFallbackActive()) {
      const occurrences = getLocalOccurrences()
      const idx = occurrences.findIndex(o => o.id === occurrenceId)
      if (idx === -1) throw new Error('Parcela não encontrada.')

      const occ = occurrences[idx]
      occ.receipt_sent = sentStatus
      occ.receipt_sent_at = sentAt
      occ.receipt_sent_by = sentBy
      occ.updated_at = now
      occurrences[idx] = occ
      saveLocalOccurrences(occurrences)

      // Also update linked receipt in local storage
      if (occ.receipt_id) {
        companyService.updateReceipt('local-user-id', occ.receipt_id, {
          receipt_sent: sentStatus,
          receipt_sent_at: sentAt,
          receipt_sent_by: sentBy
        }).catch(() => {})
      }

      return occ
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: updatedOcc, error } = await supabase
        .from('charge_occurrences')
        .update({
          receipt_sent: sentStatus,
          receipt_sent_at: sentAt,
          receipt_sent_by: sentBy,
          updated_at: now
        })
        .eq('id', occurrenceId)
        .eq('user_id', userId)
        .select('*, charges(description, client_name)')
        .single()

      if (error || !updatedOcc) {
        console.warn('Failed updating sent status in Supabase, using local fallback:', error?.message)
        const occurrences = getLocalOccurrences()
        const idx = occurrences.findIndex(o => o.id === occurrenceId)
        if (idx !== -1) {
          const occ = occurrences[idx]
          occ.receipt_sent = sentStatus
          occ.receipt_sent_at = sentAt
          occ.receipt_sent_by = sentBy
          saveLocalOccurrences(occurrences)
          return occ
        }
        throw new Error('Erro ao atualizar status de envio.')
      }

      // Also update linked receipt if present
      if (updatedOcc.receipt_id) {
        companyService.updateReceipt(userId, updatedOcc.receipt_id, {
          receipt_sent: sentStatus,
          receipt_sent_at: sentAt,
          receipt_sent_by: sentBy
        }).catch(err => console.warn('Could not sync receipt sent status:', err))
      }

      return {
        ...updatedOcc,
        client_name: updatedOcc.charges?.client_name || 'Cliente',
        charge_description: updatedOcc.charges?.description || 'Cobrança'
      }
    } catch (err) {
      console.error('Exception toggling receipt sent status:', err)
      throw err
    }
  },

  /**
   * Idempotent payment confirmation method for Projection tab or card shortcuts.
   */
  async confirmPaymentByOccurrence(chargeId: string, referenceMonth: string): Promise<ChargeOccurrence> {
    if (isLocalFallbackActive()) {
      const occurrences = getLocalOccurrences()
      const occ = occurrences.find(o => o.charge_id === chargeId && o.reference_month === referenceMonth)
      if (occ) {
        return this.updateOccurrenceStatus(occ.id, 'paid')
      }
      throw new Error(`Parcela para a referência ${referenceMonth} não foi encontrada.`)
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: occ, error } = await supabase
        .from('charge_occurrences')
        .select('id, status')
        .eq('charge_id', chargeId)
        .eq('reference_month', referenceMonth)
        .eq('user_id', userId)
        .maybeSingle()

      if (error || !occ) {
        console.warn('Supabase confirmPaymentByOccurrence failed, using local fallback:', error?.message)
        const occurrences = getLocalOccurrences()
        const localOcc = occurrences.find(o => o.charge_id === chargeId && o.reference_month === referenceMonth)
        if (localOcc) {
          return this.updateOccurrenceStatus(localOcc.id, 'paid')
        }
        throw new Error(`Parcela de cobrança não encontrada para o mês ${referenceMonth}.`)
      }

      return this.updateOccurrenceStatus(occ.id, 'paid')
    } catch (err) {
      console.warn('Supabase confirmPaymentByOccurrence exception, using local fallback:', err)
      const occurrences = getLocalOccurrences()
      const localOcc = occurrences.find(o => o.charge_id === chargeId && o.reference_month === referenceMonth)
      if (localOcc) {
        return this.updateOccurrenceStatus(localOcc.id, 'paid')
      }
      throw new Error(`Parcela para a referência ${referenceMonth} não foi encontrada.`)
    }
  },

  /**
   * Gets occurrences within a specific date range (for projections and calendar).
   */
  async getOccurrencesByRange(startDate: string, endDate: string): Promise<ChargeOccurrence[]> {
    if (isLocalFallbackActive()) {
      return getLocalOccurrencesByRange(startDate, endDate)
    }

    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data, error } = await supabase
        .from('charge_occurrences')
        .select('*, charges(description, client_name, billing_day)')
        .eq('user_id', userId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true })

      if (error) {
        console.warn('Error fetching occurrences by range from Supabase, using local fallback:', error.message)
        return getLocalOccurrencesByRange(startDate, endDate)
      }

      return (data || []).map(o => ({
        ...o,
        client_name: o.charges?.client_name || 'Cliente',
        charge_description: o.charges?.description || 'Cobrança',
        billing_day: o.charges?.billing_day
      }))
    } catch (err) {
      console.warn('Supabase getOccurrencesByRange failed, using local fallback:', err)
      return getLocalOccurrencesByRange(startDate, endDate)
    }
  },

  /**
   * Gets overall summary metrics for all charges and occurrences.
   */
  async getSummaryMetrics(): Promise<ChargeSummaryMetrics> {
    const charges = await this.getCharges()
    let totalOccurrences = 0
    let paidOccurrencesCount = 0
    let pendingOccurrencesCount = 0
    let totalAmount = 0
    let totalReceived = 0
    let totalPending = 0
    let overdueCount = 0
    let totalOverdueAmount = 0

    const todayStr = new Date().toISOString().split('T')[0]

    charges.forEach(c => {
      (c.occurrences || []).forEach(occ => {
        const amt = Number(occ.amount) || 0
        totalOccurrences++
        totalAmount += amt

        if (occ.status === 'paid') {
          paidOccurrencesCount++
          totalReceived += amt
        } else {
          pendingOccurrencesCount++
          totalPending += amt

          if (occ.due_date < todayStr) {
            overdueCount++
            totalOverdueAmount += amt
          }
        }
      })
    })

    return {
      totalCharges: charges.length,
      totalOccurrences,
      paidOccurrencesCount,
      pendingOccurrencesCount,
      totalAmount,
      totalReceived,
      totalPending,
      overdueCount,
      totalOverdueAmount
    }
  }
}
