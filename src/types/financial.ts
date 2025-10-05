export type TransactionStatus = "Recebido" | "Em aberto" | "Pago";
export type PaymentMethod = "Dinheiro" | "PIX" | "Cartão de Crédito" | "Cartão de Débito" | "Boleto" | "Transferência";
export type CategoryType = "Receita" | "Despesa";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  clientOrSupplier: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments: number;
  status: TransactionStatus;
}

export interface Category {
  id: string;
  type: CategoryType;
  name: string;
  description: string;
}

export interface Settings {
  notificationEmail: string;
  startDate: string;
  initialBalance: number;
}

export interface FinancialData {
  revenues: Transaction[];
  expenses: Transaction[];
  categories: Category[];
  settings: Settings;
}
