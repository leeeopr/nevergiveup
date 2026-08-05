import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { Client, Receipt } from '@/types/company'

const LOCAL_CLIENTS_PREFIX = 'financeira_clients'
const LOCAL_RECEIPTS_PREFIX = 'financeira_receipts'

function getLocalClients(userId: string): Client[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(`${LOCAL_CLIENTS_PREFIX}_${userId}`)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalClients(userId: string, clients: Client[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_CLIENTS_PREFIX}_${userId}`, JSON.stringify(clients))
}

function getLocalReceipts(userId: string): Receipt[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(`${LOCAL_RECEIPTS_PREFIX}_${userId}`)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalReceipts(userId: string, receipts: Receipt[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_RECEIPTS_PREFIX}_${userId}`, JSON.stringify(receipts))
}

export const companyService = {
  // CLIENTS CRUD
  async getClients(userId: string): Promise<Client[]> {
    if (!userId) return []
    const local = getLocalClients(userId)

    if (isLocalFallbackActive() || userId === 'local-user-id') {
      return local
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (error) {
        console.error('[CompanyService] Error fetching clients from Supabase:', error.message)
        return local
      }

      const clients = (data || []) as Client[]
      saveLocalClients(userId, clients)
      return clients
    } catch (err) {
      console.error('[CompanyService] Exception fetching clients:', err)
      return local
    }
  },

  async createClient(userId: string, clientData: Partial<Client>): Promise<Client> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    // Only generate UUID if environment supports valid UUID v4
    const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    const clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null

    const newClient: Client = {
      id: clientUuid || `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user_id: userId,
      name: clientData.name?.trim() || 'Cliente sem nome',
      document: clientData.document?.trim() || null,
      email: clientData.email?.trim() || null,
      phone: clientData.phone?.trim() || null,
      address: clientData.address?.trim() || null,
      number: clientData.number?.trim() || null,
      complement: clientData.complement?.trim() || null,
      neighborhood: clientData.neighborhood?.trim() || null,
      city: clientData.city?.trim() || null,
      state: clientData.state?.trim() || null,
      zip_code: clientData.zip_code?.trim() || null,
      notes: clientData.notes?.trim() || null,
      status: clientData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const currentLocal = getLocalClients(userId)
    const updatedLocal = [newClient, ...currentLocal]
    saveLocalClients(userId, updatedLocal)

    if (isLocalUser) {
      return newClient
    }

    try {
      const supabase = getSupabase()
      
      // Get real session user to prevent RLS mismatch
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      const insertPayload: Record<string, any> = {
        user_id: activeUserId,
        name: newClient.name,
        status: newClient.status
      }

      if (newClient.document) insertPayload.document = newClient.document
      if (newClient.email) insertPayload.email = newClient.email
      if (newClient.phone) insertPayload.phone = newClient.phone
      if (newClient.address) insertPayload.address = newClient.address
      if (newClient.number) insertPayload.number = newClient.number
      if (newClient.complement) insertPayload.complement = newClient.complement
      if (newClient.neighborhood) insertPayload.neighborhood = newClient.neighborhood
      if (newClient.city) insertPayload.city = newClient.city
      if (newClient.state) insertPayload.state = newClient.state
      if (newClient.zip_code) insertPayload.zip_code = newClient.zip_code
      if (newClient.notes) insertPayload.notes = newClient.notes

      // Only pass ID if it is a valid Postgres UUID, otherwise let Supabase DEFAULT gen_random_uuid() generate it
      if (clientUuid && isValidUuid(clientUuid)) {
        insertPayload.id = clientUuid
      }

      let { data, error } = await supabase
        .from('clients')
        .insert(insertPayload)
        .select()
        .single()

      // Resilient fallback if table schema in Supabase is missing address/extended columns (PGRST204)
      if (error && (error.code === 'PGRST204' || error.message?.includes('Could not find') || error.message?.includes('schema cache'))) {
        console.warn('[CompanyService] Missing extended column in Supabase schema, retrying with core client fields:', error.message)
        const corePayload: Record<string, any> = {
          user_id: activeUserId,
          name: newClient.name,
          document: newClient.document,
          email: newClient.email,
          phone: newClient.phone,
          status: newClient.status
        }
        if (clientUuid && isValidUuid(clientUuid)) {
          corePayload.id = clientUuid
        }
        const retryRes = await supabase
          .from('clients')
          .insert(corePayload)
          .select()
          .single()

        data = retryRes.data
        error = retryRes.error
      }

      if (error) {
        console.error('[CompanyService] Failed inserting client in Supabase:', error)
        throw new Error(`Erro no Supabase (${error.code || 'RLS/Schema'}): ${error.message}`)
      }

      const savedClient = { ...newClient, ...data } as Client
      // Replace temporary local record with canonical Supabase record
      const current = getLocalClients(userId)
      const replaced = current.map(c => (c.id === newClient.id ? savedClient : c))
      saveLocalClients(userId, replaced)

      return savedClient
    } catch (err: any) {
      console.error('[CompanyService] Exception inserting client:', err)
      throw err
    }
  },

  async updateClient(userId: string, clientId: string, updates: Partial<Client>): Promise<Client> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    const currentLocal = getLocalClients(userId)
    const idx = currentLocal.findIndex(c => c.id === clientId)
    let updatedClient: Client

    if (idx >= 0) {
      updatedClient = {
        ...currentLocal[idx],
        ...updates,
        updated_at: new Date().toISOString()
      }
      currentLocal[idx] = updatedClient
      saveLocalClients(userId, currentLocal)
    } else {
      updatedClient = {
        id: clientId,
        user_id: userId,
        name: updates.name || '',
        ...updates,
        updated_at: new Date().toISOString()
      }
    }

    if (isLocalUser) {
      return updatedClient
    }

    try {
      const supabase = getSupabase()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      const { data, error } = await supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .eq('user_id', activeUserId)
        .select()
        .single()

      if (error) {
        console.error('[CompanyService] Failed updating client in Supabase:', error)
        throw new Error(`Erro ao atualizar cliente no Supabase: ${error.message}`)
      }

      return (data as Client) || updatedClient
    } catch (err: any) {
      console.error('[CompanyService] Exception updating client:', err)
      throw err
    }
  },

  async deleteClient(userId: string, clientId: string): Promise<void> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    const currentLocal = getLocalClients(userId)
    const filtered = currentLocal.filter(c => c.id !== clientId)
    saveLocalClients(userId, filtered)

    if (isLocalUser) return

    try {
      const supabase = getSupabase()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', activeUserId)

      if (error) {
        console.error('[CompanyService] Failed deleting client from Supabase:', error)
        throw new Error(`Erro ao excluir cliente no Supabase: ${error.message}`)
      }
    } catch (err: any) {
      console.error('[CompanyService] Exception deleting client:', err)
      throw err
    }
  },

  // RECEIPTS CRUD
  async getReceipts(userId: string): Promise<Receipt[]> {
    if (!userId) return []
    const local = getLocalReceipts(userId)

    if (isLocalFallbackActive() || userId === 'local-user-id') {
      return local
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false })

      if (error) {
        console.error('[CompanyService] Error fetching receipts from Supabase:', error.message)
        return local
      }

      const receipts = (data || []) as Receipt[]
      saveLocalReceipts(userId, receipts)
      return receipts
    } catch (err) {
      console.error('[CompanyService] Exception fetching receipts:', err)
      return local
    }
  },

  async createReceipt(userId: string, receiptData: Partial<Receipt>): Promise<Receipt> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    const localReceipts = getLocalReceipts(userId)
    const count = localReceipts.length + 1
    const year = new Date().getFullYear()
    const autoCode = `REC-${year}-${String(count).padStart(4, '0')}`

    const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    const receiptUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null

    const newReceipt: Receipt = {
      id: receiptUuid || `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      receipt_code: receiptData.receipt_code || autoCode,
      user_id: userId,
      client_id: (receiptData.client_id && isValidUuid(receiptData.client_id)) ? receiptData.client_id : null,
      client_name: receiptData.client_name?.trim() || 'Cliente sem nome',
      client_document: receiptData.client_document?.trim() || null,
      client_email: receiptData.client_email?.trim() || null,
      client_phone: receiptData.client_phone?.trim() || null,
      description: receiptData.description?.trim() || 'Prestação de Serviços',
      amount: Number(receiptData.amount) || 0,
      issue_date: receiptData.issue_date || new Date().toISOString().split('T')[0],
      service_start_date: receiptData.service_start_date || null,
      service_end_date: receiptData.service_end_date || null,
      payment_method: receiptData.payment_method || 'PIX',
      status: receiptData.status || 'issued',
      notes: receiptData.notes?.trim() || null,
      financial_movement_id: (receiptData.financial_movement_id && isValidUuid(receiptData.financial_movement_id)) ? receiptData.financial_movement_id : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updatedLocal = [newReceipt, ...localReceipts]
    saveLocalReceipts(userId, updatedLocal)

    if (isLocalUser) {
      return newReceipt
    }

    try {
      const supabase = getSupabase()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      // Build base payload with guaranteed core fields
      const insertPayload: Record<string, any> = {
        receipt_code: newReceipt.receipt_code,
        user_id: activeUserId,
        client_name: newReceipt.client_name,
        description: newReceipt.description,
        amount: newReceipt.amount,
        issue_date: newReceipt.issue_date,
        payment_method: newReceipt.payment_method,
        status: newReceipt.status
      }

      // Add optional string fields only if non-null and non-empty
      if (newReceipt.client_document) insertPayload.client_document = newReceipt.client_document
      if (newReceipt.client_email) insertPayload.client_email = newReceipt.client_email
      if (newReceipt.client_phone) insertPayload.client_phone = newReceipt.client_phone
      if (newReceipt.service_start_date) insertPayload.service_start_date = newReceipt.service_start_date
      if (newReceipt.service_end_date) insertPayload.service_end_date = newReceipt.service_end_date
      if (newReceipt.notes) insertPayload.notes = newReceipt.notes
      if (newReceipt.reference_month) insertPayload.reference_month = newReceipt.reference_month
      if (newReceipt.receipt_sent !== undefined) insertPayload.receipt_sent = newReceipt.receipt_sent
      if (newReceipt.receipt_sent_at) insertPayload.receipt_sent_at = newReceipt.receipt_sent_at
      if (newReceipt.receipt_sent_by) insertPayload.receipt_sent_by = newReceipt.receipt_sent_by

      // Add optional UUID relations only if valid UUIDs
      if (newReceipt.client_id && isValidUuid(newReceipt.client_id)) {
        insertPayload.client_id = newReceipt.client_id
      }
      if (newReceipt.financial_movement_id && isValidUuid(newReceipt.financial_movement_id)) {
        insertPayload.financial_movement_id = newReceipt.financial_movement_id
      }
      if (newReceipt.charge_id && isValidUuid(newReceipt.charge_id)) {
        insertPayload.charge_id = newReceipt.charge_id
      }
      if (newReceipt.charge_occurrence_id && isValidUuid(newReceipt.charge_occurrence_id)) {
        insertPayload.charge_occurrence_id = newReceipt.charge_occurrence_id
      }
      if (receiptUuid && isValidUuid(receiptUuid)) {
        insertPayload.id = receiptUuid
      }

      let { data, error } = await supabase
        .from('receipts')
        .insert(insertPayload)
        .select()
        .single()

      // Resilient fallback if table schema in Supabase is missing extended columns (e.g., financial_movement_id, service dates, etc.)
      if (error && (error.code === 'PGRST204' || error.message?.includes('Could not find') || error.message?.includes('schema cache'))) {
        console.warn('[CompanyService] Missing column in Supabase receipts schema, retrying with core fields:', error.message)
        
        // Strip out optional or relation fields that caused schema cache error
        const corePayload: Record<string, any> = {
          receipt_code: newReceipt.receipt_code,
          user_id: activeUserId,
          client_name: newReceipt.client_name,
          description: newReceipt.description,
          amount: newReceipt.amount,
          issue_date: newReceipt.issue_date,
          payment_method: newReceipt.payment_method,
          status: newReceipt.status
        }
        if (receiptUuid && isValidUuid(receiptUuid)) {
          corePayload.id = receiptUuid
        }
        
        const retryRes = await supabase
          .from('receipts')
          .insert(corePayload)
          .select()
          .single()

        data = retryRes.data
        error = retryRes.error
      }

      if (error) {
        console.error('[CompanyService] Failed inserting receipt in Supabase:', error)
        throw new Error(`Erro ao salvar recibo no Supabase (${error.code || 'RLS/Schema'}): ${error.message}`)
      }

      const savedReceipt = { ...newReceipt, ...data } as Receipt
      const current = getLocalReceipts(userId)
      const replaced = current.map(r => (r.id === newReceipt.id ? savedReceipt : r))
      saveLocalReceipts(userId, replaced)

      return savedReceipt
    } catch (err: any) {
      console.error('[CompanyService] Exception inserting receipt:', err)
      throw err
    }
  },

  async updateReceipt(userId: string, receiptId: string, updates: Partial<Receipt>): Promise<Receipt> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    const localReceipts = getLocalReceipts(userId)
    const idx = localReceipts.findIndex(r => r.id === receiptId)
    let updatedReceipt: Receipt

    if (idx >= 0) {
      updatedReceipt = {
        ...localReceipts[idx],
        ...updates,
        updated_at: new Date().toISOString()
      }
      localReceipts[idx] = updatedReceipt
      saveLocalReceipts(userId, localReceipts)
    } else {
      updatedReceipt = {
        id: receiptId,
        user_id: userId,
        client_name: updates.client_name || '',
        description: updates.description || '',
        amount: updates.amount || 0,
        issue_date: updates.issue_date || new Date().toISOString().split('T')[0],
        payment_method: updates.payment_method || 'PIX',
        status: updates.status || 'issued',
        ...updates,
        updated_at: new Date().toISOString()
      }
    }

    if (isLocalUser) {
      return updatedReceipt
    }

    try {
      const supabase = getSupabase()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      let { data, error } = await supabase
        .from('receipts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId)
        .eq('user_id', activeUserId)
        .select()
        .single()

      if (error && (error.code === 'PGRST204' || error.message?.includes('Could not find') || error.message?.includes('schema cache'))) {
        console.warn('[CompanyService] Missing column in Supabase receipts update schema, retrying with core fields:', error.message)
        const coreUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
        if (updates.client_name !== undefined) coreUpdates.client_name = updates.client_name
        if (updates.description !== undefined) coreUpdates.description = updates.description
        if (updates.amount !== undefined) coreUpdates.amount = updates.amount
        if (updates.issue_date !== undefined) coreUpdates.issue_date = updates.issue_date
        if (updates.payment_method !== undefined) coreUpdates.payment_method = updates.payment_method
        if (updates.status !== undefined) coreUpdates.status = updates.status

        const retryRes = await supabase
          .from('receipts')
          .update(coreUpdates)
          .eq('id', receiptId)
          .eq('user_id', activeUserId)
          .select()
          .single()

        data = retryRes.data
        error = retryRes.error
      }

      if (error) {
        console.error('[CompanyService] Failed updating receipt in Supabase:', error)
        throw new Error(`Erro ao atualizar recibo no Supabase: ${error.message}`)
      }

      return (data as Receipt) || updatedReceipt
    } catch (err: any) {
      console.error('[CompanyService] Exception updating receipt:', err)
      throw err
    }
  },

  async deleteReceipt(userId: string, receiptId: string): Promise<void> {
    const isLocalUser = isLocalFallbackActive() || userId === 'local-user-id' || !userId

    const localReceipts = getLocalReceipts(userId)
    const filtered = localReceipts.filter(r => r.id !== receiptId)
    saveLocalReceipts(userId, filtered)

    if (isLocalUser) return

    try {
      const supabase = getSupabase()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const activeUserId = authUser?.id || userId

      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId)
        .eq('user_id', activeUserId)

      if (error) {
        console.error('[CompanyService] Failed deleting receipt from Supabase:', error)
        throw new Error(`Erro ao excluir recibo no Supabase: ${error.message}`)
      }
    } catch (err: any) {
      console.error('[CompanyService] Exception deleting receipt:', err)
      throw err
    }
  }
}
