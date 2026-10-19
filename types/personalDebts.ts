import { FinancialMovement } from '@/types/financial'

export type DebtDirection = 'to_receive' | 'to_pay'

export type DebtStatus = 'pending' | 'partially_paid' | 'paid'

export interface DebtPerson {
  id: string
  user_id: string
  name: string
  phone?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface DebtPayment {
  id: string
  user_id: string
  debt_id: string
  amount: number
  payment_date: string // YYYY-MM-DD
  notes?: string | null
  financial_movement_id?: string | null
  created_at?: string
}

export interface Debt {
  id: string
  user_id: string
  person_id: string
  type: DebtDirection
  description: string
  amount: number
  due_date?: string | null // YYYY-MM-DD
  notes?: string | null
  status: DebtStatus
  created_at?: string
  updated_at?: string
  
  // Computed client-side / enriched fields
  payments?: DebtPayment[]
  total_paid?: number
  remaining_amount?: number
  is_overdue?: boolean
}

export interface PersonWithDebts extends DebtPerson {
  debts: Debt[]
  linkedMovements?: FinancialMovement[]
  totalToReceive: number // Sum of remaining balance to receive
  totalToPay: number // Sum of remaining balance to pay
  netBalance: number // totalToReceive - totalToPay
  pendingCount: number
  hasOverdue: boolean
  isSettled: boolean
}

export interface GlobalDebtsMetrics {
  totalToReceive: number
  totalToPay: number
  netBalance: number
  overdueAmount: number
  overdueCount: number
  pendingCount: number
  totalPersons: number
}
