export type StructuralExpenseCategory =
  | 'aluguel'
  | 'saude'
  | 'academia'
  | 'internet'
  | 'energia'
  | 'assinaturas'
  | 'seguro'
  | 'transporte'
  | 'alimentacao'
  | 'medicamentos'
  | 'financiamento'
  | 'educacao'
  | 'impostos'
  | 'outros';

export type StructuralExpensePriority = 'baixa' | 'media' | 'alta';

export interface StructuralExpense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: StructuralExpenseCategory;
  recurrence: string; // e.g. 'mensal', 'anual'
  priority: StructuralExpensePriority;
  description: string;
  created_at?: string;
  updated_at?: string;
}
