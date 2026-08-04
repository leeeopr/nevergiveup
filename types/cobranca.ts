export type OccurrenceStatus = 'pending' | 'paid'

export interface ChargeOccurrence {
  id: string
  charge_id: string
  user_id: string
  reference_month: string // YYYY-MM
  due_date: string // YYYY-MM-DD
  amount: number
  status: OccurrenceStatus
  paid_at?: string | null
  financial_movement_id?: string | null
  created_at?: string
  updated_at?: string
  
  // Extra fields populated for UI convenience
  client_name?: string
  charge_description?: string
  billing_day?: number
}

export interface Charge {
  id: string
  user_id: string
  client_id?: string | null
  client_name: string
  description: string
  amount: number
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  billing_day: number
  notes?: string | null
  created_at?: string
  updated_at?: string
  
  occurrences?: ChargeOccurrence[]
}

export interface ChargeSummaryMetrics {
  totalCharges: number
  totalOccurrences: number
  paidOccurrencesCount: number
  pendingOccurrencesCount: number
  totalAmount: number
  totalReceived: number
  totalPending: number
  overdueCount: number
  totalOverdueAmount: number
}
