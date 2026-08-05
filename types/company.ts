export interface Client {
  id: string
  user_id: string
  name: string
  document?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  notes?: string | null
  status?: 'active' | 'archived'
  created_at?: string
  updated_at?: string
}

export type PaymentMethod = 
  | 'PIX'
  | 'Dinheiro'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Transferência'
  | 'Boleto'
  | 'Outro'

export type ReceiptStatus = 'issued' | 'cancelled' | 'draft'

export interface Receipt {
  id: string
  receipt_code?: string | null
  user_id: string
  client_id?: string | null
  client_name: string
  client_document?: string | null
  client_email?: string | null
  client_phone?: string | null
  description: string
  amount: number
  issue_date: string
  service_start_date?: string | null
  service_end_date?: string | null
  payment_method: PaymentMethod | string
  status: ReceiptStatus
  notes?: string | null
  financial_movement_id?: string | null
  charge_id?: string | null
  charge_occurrence_id?: string | null
  reference_month?: string | null
  receipt_sent?: boolean
  receipt_sent_at?: string | null
  receipt_sent_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface CompanySettings {
  empresa_enabled: boolean
  company_name?: string | null
  company_document?: string | null
  company_email?: string | null
  company_phone?: string | null
  company_address?: string | null
  company_city?: string | null
  company_state?: string | null
  company_zip?: string | null
  company_signature_url?: string | null
}
