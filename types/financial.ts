export type MovementType = 'entrada' | 'saida_fixa' | 'gasto_diario' | 'economia' | 'cartao' | 'cobranca';

export type RecurrenceType = 
  | 'diaria' 
  | 'semanal' 
  | 'quinzenal' 
  | 'mensal' 
  | 'bimestral' 
  | 'trimestral' 
  | 'semestral' 
  | 'anual' 
  | 'personalizada';

export interface FinancialMovement {
  id: string;
  created_at: string;
  date: string;
  type: MovementType;
  amount: number;
  description: string;
  tag?: string;
  is_recurring: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number; // For 'personalizada', e.g., every 3 days
  recurrence_end_date?: string;
  parent_id?: string; // Links virtual instances to the source record
  is_virtual?: boolean; // Flag for UI to differentiate real vs projected
  card_name?: string;
  installments?: number;
  debtor_name?: string;
  due_date?: string;
  is_paid?: boolean;
  paid_at?: string;
  user_id: string;
}

export interface MetricSummary {
  performance: number;
  performanceChange: number;
  savingsRate: number;
  savingsAmount: number;
  realCostOfLiving: number;
  weeklyCost: number;
  dailyCost: number;
  dailyAverageReal: number;
  dailyAverageChange: number;
  balanceProjection: number;
  pendingReceivables: number;
  receivedAmount: number;
  distribution: { name: string; value: number; color: string }[];
  estimativaMensal: number;
  orcamentoDiario: number;
  personalBudget: number;
  personalBudgetUsed: number;
  personalBudgetRemaining: number;
  personalBudgetDailyRemaining: number;
  personalBudgetPercentUsed: number;
  personalBudgetProjected: number;
}
