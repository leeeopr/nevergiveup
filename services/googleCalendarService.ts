import { getSupabase, isLocalFallbackActive } from '@/lib/supabase'
import { FinancialMovement } from '@/types/financial'
import { RecurrenceEngine } from '@/services/RecurrenceEngine'
import { startOfMonth, endOfMonth, addMonths } from 'date-fns'

export type GoogleCalendarConnectionStatus = 
  | 'CONNECTED'
  | 'TOKEN_REFRESHING'
  | 'RECONNECT_REQUIRED'
  | 'ERROR'
  | 'DISCONNECTED'

export interface GoogleCalendarConnection {
  id?: string
  user_id: string
  google_email: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  connection_status?: GoogleCalendarConnectionStatus
  selected_calendar_id: string
  auto_sync: boolean
  default_reminder_minutes: number
  created_at?: string
  updated_at?: string
}

export interface GoogleCalendarEventMap {
  id?: string
  user_id: string
  financial_movement_id: string
  google_calendar_event_id: string
  google_calendar_id: string
  sync_status: 'synced' | 'error' | 'pending'
  last_synced_at?: string
}

export interface CalendarListItem {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export interface GoogleCalendarSyncResult {
  syncedCount: number
  createdCount: number
  updatedCount: number
  deletedCount: number
  skippedCount: number
  errorCount: number
}

const LOCAL_CALENDAR_CONN_KEY = 'financeira_google_calendar_connection'
const LOCAL_CALENDAR_EVENTS_KEY = 'financeira_google_calendar_events'

function getLocalConnection(userId: string): GoogleCalendarConnection | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(`${LOCAL_CALENDAR_CONN_KEY}_${userId}`)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function saveLocalConnection(conn: GoogleCalendarConnection): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_CALENDAR_CONN_KEY}_${conn.user_id}`, JSON.stringify(conn))
}

function removeLocalConnection(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${LOCAL_CALENDAR_CONN_KEY}_${userId}`)
  localStorage.removeItem(`${LOCAL_CALENDAR_EVENTS_KEY}_${userId}`)
}

function getLocalEventMaps(userId: string): GoogleCalendarEventMap[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(`${LOCAL_CALENDAR_EVENTS_KEY}_${userId}`)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalEventMaps(userId: string, maps: GoogleCalendarEventMap[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_CALENDAR_EVENTS_KEY}_${userId}`, JSON.stringify(maps))
}

export function getOccurrenceKey(movement: FinancialMovement): string {
  if (movement.is_virtual && movement.parent_id) {
    return `${movement.parent_id}_${movement.date}`
  }
  return `${movement.id}_${movement.date}`
}

export function getBaseMovementId(movement: FinancialMovement): string {
  return movement.parent_id || movement.id
}

export function formatMovementToCalendarEvent(
  movement: FinancialMovement,
  reminderMinutes: number = 1440,
  userId: string = 'local-user-id'
) {
  const isPaid = !!movement.is_paid
  let title = ''
  let typeLabel = ''

  switch (movement.type) {
    case 'entrada':
      typeLabel = 'Receita'
      title = isPaid ? `✅ Recebido: ${movement.description}` : `💰 Receber: ${movement.description}`
      break
    case 'cobranca':
      typeLabel = 'Cobrança'
      const name = movement.debtor_name || movement.description
      title = isPaid ? `✅ Cobrado: ${name}` : `🔔 Cobrar: ${name}`
      break
    case 'cartao':
      typeLabel = 'Fatura / Cartão'
      title = isPaid ? `✅ Pago parcela: ${movement.description}` : `💳 Pagar parcela: ${movement.description}`
      break
    case 'saida_fixa':
      typeLabel = 'Custo Fixo'
      title = isPaid ? `✅ Pago: ${movement.description}` : `💸 Pagar: ${movement.description}`
      break
    case 'gasto_diario':
      typeLabel = 'Gasto Diário'
      title = isPaid ? `✅ Pago: ${movement.description}` : `💸 Pagar: ${movement.description}`
      break
    case 'economia':
      typeLabel = 'Reserva / Investimento'
      title = isPaid ? `✅ Realizado: ${movement.description}` : `🎯 Reserva: ${movement.description}`
      break
    default:
      typeLabel = 'Movimentação'
      title = isPaid ? `✅ ${movement.description}` : `📌 ${movement.description}`
      break
  }

  const dateStr = movement.due_date || movement.date
  const formattedAmount = Number(movement.amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

  const occurrenceKey = getOccurrenceKey(movement)
  const baseId = getBaseMovementId(movement)

  const descriptionLines = [
    `📊 COMPROMISSO FINANCEIRO`,
    `----------------------------------------`,
    `• Valor: ${formattedAmount}`,
    `• Categoria: ${movement.tag || 'Geral'}`,
    `• Tipo: ${typeLabel}`,
    `• Status: ${isPaid ? 'Concluído / Pago' : 'Pendente'}`,
    movement.debtor_name ? `• Devedor: ${movement.debtor_name}` : null,
    movement.card_name ? `• Cartão: ${movement.card_name}` : null,
    movement.installments ? `• Parcelas: ${movement.installments}` : null,
    `----------------------------------------`,
    `ID no Sistema: ${baseId}`,
    `Chave de Ocorrência: ${occurrenceKey}`,
    `Sincronizado automaticamente via Sistema Financeiro.`
  ].filter(Boolean).join('\n')

  return {
    summary: title,
    description: descriptionLines,
    start: {
      date: dateStr
    },
    end: {
      date: dateStr
    },
    extendedProperties: {
      private: {
        financeira_app: 'true',
        user_id: userId,
        occurrence_key: occurrenceKey,
        base_movement_id: baseId,
        occurrence_date: dateStr
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        {
          method: 'popup',
          minutes: reminderMinutes
        }
      ]
    }
  }
}

export const googleCalendarService = {
  async getConnection(userId: string): Promise<GoogleCalendarConnection | null> {
    let conn: GoogleCalendarConnection | null = null

    if (isLocalFallbackActive()) {
      conn = getLocalConnection(userId)
    } else {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('google_calendar_connections')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.warn('[GoogleCalendar] Supabase read warn:', error.message)
          conn = getLocalConnection(userId)
        } else if (data) {
          conn = data as GoogleCalendarConnection
        } else {
          conn = getLocalConnection(userId)
        }
      } catch {
        conn = getLocalConnection(userId)
      }
    }

    if (!conn) return null

    // Compute active status
    const expiresMs = conn.expires_at ? new Date(conn.expires_at).getTime() : 0
    const now = Date.now()
    const isExpired = !conn.expires_at || (expiresMs - now < 3 * 60 * 1000)

    if (isExpired) {
      if (conn.refresh_token) {
        conn.connection_status = 'TOKEN_REFRESHING'
      } else {
        conn.connection_status = 'RECONNECT_REQUIRED'
      }
    } else {
      conn.connection_status = conn.connection_status || 'CONNECTED'
    }

    return conn
  },

  async saveConnection(conn: GoogleCalendarConnection): Promise<void> {
    // CRITICAL: Preserve existing refresh_token if new one is not provided!
    const existing = await this.getConnection(conn.user_id)
    const finalRefreshToken = conn.refresh_token || existing?.refresh_token || undefined

    const fullConn: GoogleCalendarConnection = {
      ...conn,
      refresh_token: finalRefreshToken,
      connection_status: conn.connection_status || 'CONNECTED',
      updated_at: new Date().toISOString()
    }

    saveLocalConnection(fullConn)

    if (isLocalFallbackActive()) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('google_calendar_connections')
        .upsert(
          {
            user_id: fullConn.user_id,
            google_email: fullConn.google_email,
            access_token: fullConn.access_token,
            refresh_token: fullConn.refresh_token || null,
            expires_at: fullConn.expires_at || null,
            selected_calendar_id: fullConn.selected_calendar_id || 'primary',
            auto_sync: fullConn.auto_sync,
            default_reminder_minutes: fullConn.default_reminder_minutes,
            updated_at: fullConn.updated_at
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.warn('[GoogleCalendar] Failed upsert to Supabase:', error.message)
      } else {
        const anonUserId = conn.user_id.length > 8 ? `${conn.user_id.substring(0, 8)}...` : conn.user_id
        console.info(`[GoogleCalendar] Saved connection for user: ${anonUserId}`)
      }
    } catch (err) {
      console.warn('[GoogleCalendar] Exception upserting connection:', err)
    }
  },

  async refreshAccessToken(conn: GoogleCalendarConnection): Promise<string | null> {
    if (!conn.refresh_token) {
      console.warn('[GoogleCalendar] No refresh token available to refresh access token.')
      conn.connection_status = 'RECONNECT_REQUIRED'
      await this.saveConnection(conn)
      return null
    }

    try {
      console.info(`[GoogleCalendar] Attempting token refresh for user ${conn.user_id.substring(0, 8)}...`)
      const res = await fetch('/api/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: conn.refresh_token })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.warn('[GoogleCalendar] Token refresh failed:', errorData)
        conn.connection_status = 'RECONNECT_REQUIRED'
        await this.saveConnection(conn)
        return null
      }

      const data = await res.json()
      if (data?.access_token) {
        conn.access_token = data.access_token
        conn.expires_at = data.expires_at
        conn.connection_status = 'CONNECTED'
        await this.saveConnection(conn)
        console.info('[GoogleCalendar] Token refresh succeeded!')
        return data.access_token
      }

      conn.connection_status = 'RECONNECT_REQUIRED'
      await this.saveConnection(conn)
      return null
    } catch (err) {
      console.error('[GoogleCalendar] Exception during token refresh:', err)
      conn.connection_status = 'RECONNECT_REQUIRED'
      await this.saveConnection(conn)
      return null
    }
  },

  async ensureValidAccessToken(userId: string): Promise<{ accessToken: string | null; conn: GoogleCalendarConnection | null }> {
    const conn = await this.getConnection(userId)
    if (!conn || !conn.access_token) {
      return { accessToken: null, conn: null }
    }

    const expiresMs = conn.expires_at ? new Date(conn.expires_at).getTime() : 0
    const now = Date.now()
    const isExpired = !conn.expires_at || (expiresMs - now < 3 * 60 * 1000)

    if (!isExpired) {
      return { accessToken: conn.access_token, conn }
    }

    // Token is expired, try to refresh
    const refreshedToken = await this.refreshAccessToken(conn)
    if (refreshedToken) {
      return { accessToken: refreshedToken, conn }
    }

    return { accessToken: null, conn }
  },

  async deleteConnection(userId: string): Promise<void> {
    removeLocalConnection(userId)

    if (isLocalFallbackActive()) return

    try {
      const supabase = getSupabase()
      await supabase.from('google_calendar_connections').delete().eq('user_id', userId)
      await supabase.from('google_calendar_events').delete().eq('user_id', userId)
    } catch (err) {
      console.warn('[GoogleCalendar] Failed to delete connection from Supabase:', err)
    }
  },

  async fetchUserCalendars(userId: string): Promise<CalendarListItem[]> {
    try {
      const { accessToken, conn } = await this.ensureValidAccessToken(userId)
      if (!accessToken) {
        return [{ id: 'primary', summary: 'Calendário Principal', primary: true }]
      }

      let response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (response.status === 401 && conn) {
        console.info('[GoogleCalendar] 401 on fetchUserCalendars, retrying token refresh...')
        const newToken = await this.refreshAccessToken(conn)
        if (newToken) {
          response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { Authorization: `Bearer ${newToken}` }
          })
        }
      }

      if (!response.ok) {
        throw new Error(`Falha ao buscar calendários (${response.status})`)
      }

      const data = await response.json()
      return (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary,
        primary: !!item.primary,
        backgroundColor: item.backgroundColor
      }))
    } catch (err: any) {
      console.error('[GoogleCalendar] Error fetching Google Calendars:', err)
      return [{ id: 'primary', summary: 'Calendário Principal', primary: true }]
    }
  },

  /**
   * Fetch all remote events in the selected Google Calendar created by Financeira Pro.
   */
  async fetchRemoteCalendarEvents(
    userId: string,
    calendarId: string,
    accessToken: string
  ): Promise<Array<{ id: string; occurrenceKey?: string; summary?: string; description?: string; startDate?: string; baseId?: string }>> {
    try {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      url.searchParams.set('privateExtendedProperty', 'financeira_app=true')
      url.searchParams.set('maxResults', '2500')
      url.searchParams.set('singleEvents', 'true')

      let res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (res.status === 401) {
        const conn = await this.getConnection(userId)
        if (conn) {
          const newToken = await this.refreshAccessToken(conn)
          if (newToken) {
            res = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${newToken}` }
            })
          }
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] fetchRemoteCalendarEvents status ${res.status}`)
        return []
      }

      const data = await res.json()
      const items = data.items || []

      return items.map((item: any) => {
        const occurrenceKey = item.extendedProperties?.private?.occurrence_key
        const baseId = item.extendedProperties?.private?.base_movement_id
        return {
          id: item.id,
          occurrenceKey,
          baseId,
          summary: item.summary,
          description: item.description,
          startDate: item.start?.date || item.start?.dateTime?.substring(0, 10)
        }
      })
    } catch (err) {
      console.error('[GoogleCalendar] Error fetching remote events:', err)
      return []
    }
  },

  async getAllEventMaps(userId: string): Promise<GoogleCalendarEventMap[]> {
    const localMaps = getLocalEventMaps(userId)
    if (isLocalFallbackActive()) return localMaps

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('google_calendar_events')
        .select('*')
        .eq('user_id', userId)

      if (error || !data) return localMaps
      return data as GoogleCalendarEventMap[]
    } catch {
      return localMaps
    }
  },

  async getEventMap(userId: string, movementIdOrKey: string): Promise<GoogleCalendarEventMap | null> {
    const localMaps = getLocalEventMaps(userId)
    const localMatch = localMaps.find(m => m.financial_movement_id === movementIdOrKey)
    if (localMatch) return localMatch

    if (isLocalFallbackActive()) return null

    try {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('google_calendar_events')
        .select('*')
        .eq('user_id', userId)
        .eq('financial_movement_id', movementIdOrKey)
        .maybeSingle()

      return data || null
    } catch {
      return null
    }
  },

  async saveEventMap(map: GoogleCalendarEventMap): Promise<void> {
    const localMaps = getLocalEventMaps(map.user_id)
    const idx = localMaps.findIndex(m => m.financial_movement_id === map.financial_movement_id)
    if (idx >= 0) {
      localMaps[idx] = map
    } else {
      localMaps.push(map)
    }
    saveLocalEventMaps(map.user_id, localMaps)

    if (isLocalFallbackActive()) return

    try {
      const supabase = getSupabase()
      await supabase.from('google_calendar_events').upsert(
        {
          user_id: map.user_id,
          financial_movement_id: map.financial_movement_id,
          google_calendar_event_id: map.google_calendar_event_id,
          google_calendar_id: map.google_calendar_id,
          sync_status: map.sync_status,
          last_synced_at: map.last_synced_at || new Date().toISOString()
        },
        { onConflict: 'user_id,financial_movement_id' }
      )
    } catch (err) {
      console.warn('[GoogleCalendar] Failed to save event map in Supabase:', err)
    }
  },

  async removeEventMap(userId: string, movementIdOrKey: string): Promise<void> {
    const localMaps = getLocalEventMaps(userId)
    const filtered = localMaps.filter(m => m.financial_movement_id !== movementIdOrKey)
    saveLocalEventMaps(userId, filtered)

    if (isLocalFallbackActive()) return

    try {
      const supabase = getSupabase()
      await supabase
        .from('google_calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('financial_movement_id', movementIdOrKey)
    } catch (err) {
      console.warn('[GoogleCalendar] Failed to delete event map in Supabase:', err)
    }
  },

  async syncMovementToCalendar(
    userId: string,
    movement: FinancialMovement,
    providedConn?: GoogleCalendarConnection | null
  ): Promise<boolean> {
    try {
      const { accessToken, conn } = await this.ensureValidAccessToken(userId)
      const activeConn = providedConn || conn

      if (!activeConn || !activeConn.auto_sync || !accessToken) {
        return false
      }

      // Re-trigger idempotent full projection sync so recurring instances are all projected
      const result = await this.syncAllMovements(userId, [movement], 12)
      return result.syncedCount > 0
    } catch (err) {
      console.error('[GoogleCalendar] Failed to sync movement to Google Calendar:', err)
      return false
    }
  },

  async createEventForOccurrence(
    userId: string,
    calendarId: string,
    accessToken: string,
    movement: FinancialMovement,
    payload: any,
    occurrenceKey: string,
    conn: GoogleCalendarConnection
  ): Promise<boolean> {
    try {
      const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`

      let res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.status === 401) {
        const newToken = await this.refreshAccessToken(conn)
        if (newToken) {
          res = await fetch(createUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
        }
      }

      if (!res.ok) {
        console.error(`[GoogleCalendar] Create error (${res.status}):`, await res.text())
        return false
      }

      const createdEvent = await res.json()
      if (createdEvent?.id) {
        await this.saveEventMap({
          user_id: userId,
          financial_movement_id: occurrenceKey,
          google_calendar_event_id: createdEvent.id,
          google_calendar_id: calendarId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        })
        return true
      }
      return false
    } catch (err) {
      console.error('[GoogleCalendar] Error creating event:', err)
      return false
    }
  },

  async deleteMovementFromCalendar(userId: string, movementId: string): Promise<boolean> {
    try {
      const { accessToken, conn } = await this.ensureValidAccessToken(userId)
      if (!conn || !accessToken) return false

      const calendarId = conn.selected_calendar_id || 'primary'

      // Fetch remote events tagged with this base_movement_id
      const remoteEvents = await this.fetchRemoteCalendarEvents(userId, calendarId, accessToken)
      const matchingRemote = remoteEvents.filter(
        item => item.baseId === movementId ||
                item.occurrenceKey?.startsWith(`${movementId}_`) ||
                item.occurrenceKey === movementId
      )

      let deletedAny = false
      for (const item of matchingRemote) {
        const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(item.id)}`
        let res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (res.status === 401) {
          const newToken = await this.refreshAccessToken(conn)
          if (newToken) {
            res = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${newToken}` }
            })
          }
        }

        if (item.occurrenceKey) {
          await this.removeEventMap(userId, item.occurrenceKey)
        }
        deletedAny = true
      }

      // Also clean up any local maps that start with movementId
      const allMaps = await this.getAllEventMaps(userId)
      for (const m of allMaps) {
        if (m.financial_movement_id === movementId || m.financial_movement_id.startsWith(`${movementId}_`)) {
          await this.removeEventMap(userId, m.financial_movement_id)
        }
      }

      return deletedAny
    } catch (err) {
      console.error('[GoogleCalendar] Failed to delete movement events:', err)
      return false
    }
  },

  /**
   * Idempotent full synchronization of all movements and projected recurrences across horizon.
   */
  async syncAllMovements(
    userId: string,
    baseMovements: FinancialMovement[],
    horizonMonths: number = 12
  ): Promise<GoogleCalendarSyncResult> {
    const { accessToken, conn } = await this.ensureValidAccessToken(userId)
    if (!conn || !accessToken) {
      throw new Error('Sua conta do Google Calendar não está conectada ou precisa de reautorização.')
    }

    const calendarId = conn.selected_calendar_id || 'primary'
    const reminderMinutes = conn.default_reminder_minutes ?? 1440

    // 1. Fetch remote events in Google Calendar tagged with privada: financeira_app=true
    const remoteEvents = await this.fetchRemoteCalendarEvents(userId, calendarId, accessToken)
    const remoteEventMap = new Map<string, any>()
    for (const item of remoteEvents) {
      if (item.occurrenceKey) {
        remoteEventMap.set(item.occurrenceKey, item)
      }
    }

    // Index stored DB / local event maps
    const storedMaps = await this.getAllEventMaps(userId)
    const mapByOccurrenceKey = new Map<string, GoogleCalendarEventMap>()
    for (const m of storedMaps) {
      mapByOccurrenceKey.set(m.financial_movement_id, m)
    }

    // 2. Virtually expand baseMovements into projected occurrences across 12-month horizon
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(addMonths(now, horizonMonths))
    const projectedOccurrences = RecurrenceEngine.expandMovements(baseMovements, startDate, endDate)

    let createdCount = 0
    let updatedCount = 0
    let deletedCount = 0
    let skippedCount = 0
    let errorCount = 0

    const activeOccurrenceKeys = new Set<string>()

    // 3. Process each projected occurrence
    for (const occ of projectedOccurrences) {
      const occurrenceKey = getOccurrenceKey(occ)
      activeOccurrenceKeys.add(occurrenceKey)

      const payload = formatMovementToCalendarEvent(occ, reminderMinutes, userId)
      const remoteEvent = remoteEventMap.get(occurrenceKey)
      const storedMap = mapByOccurrenceKey.get(occurrenceKey)
      const googleEventId = remoteEvent?.id || storedMap?.google_calendar_event_id

      if (googleEventId) {
        // Event exists. Check if payload matches remote event
        const isUnchanged = remoteEvent && 
          remoteEvent.summary === payload.summary &&
          remoteEvent.startDate === payload.start.date &&
          remoteEvent.description === payload.description

        if (isUnchanged) {
          skippedCount++
          if (!storedMap) {
            await this.saveEventMap({
              user_id: userId,
              financial_movement_id: occurrenceKey,
              google_calendar_event_id: googleEventId,
              google_calendar_id: calendarId,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
          }
          continue
        }

        // UPDATE event
        try {
          const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`
          let res = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (res.status === 401) {
            const newToken = await this.refreshAccessToken(conn)
            if (newToken) {
              res = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              })
            }
          }

          if (res.ok) {
            updatedCount++
            await this.saveEventMap({
              user_id: userId,
              financial_movement_id: occurrenceKey,
              google_calendar_event_id: googleEventId,
              google_calendar_id: calendarId,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
          } else if (res.status === 404) {
            // Deleted in calendar, recreate
            const ok = await this.createEventForOccurrence(userId, calendarId, accessToken, occ, payload, occurrenceKey, conn)
            if (ok) createdCount++
            else errorCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.error(`[GoogleCalendar] Update exception for ${occurrenceKey}:`, err)
          errorCount++
        }
      } else {
        // CREATE event
        try {
          const ok = await this.createEventForOccurrence(userId, calendarId, accessToken, occ, payload, occurrenceKey, conn)
          if (ok) createdCount++
          else errorCount++
        } catch (err) {
          console.error(`[GoogleCalendar] Create exception for ${occurrenceKey}:`, err)
          errorCount++
        }
      }
    }

    // 4. Remove obsolete remote events created by Financeira Pro that are no longer projected
    for (const remoteItem of remoteEvents) {
      if (remoteItem.occurrenceKey && !activeOccurrenceKeys.has(remoteItem.occurrenceKey)) {
        try {
          const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(remoteItem.id)}`
          let res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          })

          if (res.status === 401) {
            const newToken = await this.refreshAccessToken(conn)
            if (newToken) {
              res = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${newToken}` }
              })
            }
          }

          if (res.ok || res.status === 404) {
            deletedCount++
            await this.removeEventMap(userId, remoteItem.occurrenceKey)
          }
        } catch (err) {
          console.warn(`[GoogleCalendar] Cleanup delete failed for ${remoteItem.occurrenceKey}:`, err)
        }
      }
    }

    const syncedCount = createdCount + updatedCount + skippedCount

    return {
      syncedCount,
      createdCount,
      updatedCount,
      deletedCount,
      skippedCount,
      errorCount
    }
  }
}
