export type TransactionStatus = "Recebido" | "Em aberto" | "Pago";
export type PaymentMethod = "Dinheiro" | "PIX" | "Cartão de Crédito" | "Cartão de Débito" | "Boleto" | "Transferência";
export type CategoryType = "Receita" | "Despesa";

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  category: string;
  clientOrSupplier: string;
  amount: number;
  paymentMethod: PaymentMethod;
  installments: number;
  status: TransactionStatus;
}

export interface Transfer {
  id: string;
  date: string;
  description: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
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
}

export interface FinancialData {
  accounts: Account[];
  revenues: Transaction[];
  expenses: Transaction[];
  transfers: Transfer[];
  categories: Category[];
  settings: Settings;
}
