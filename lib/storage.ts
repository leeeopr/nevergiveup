import { FinancialData, Transaction, Category, Account, Transfer } from "./types";

const STORAGE_KEY = "financial_data";

const defaultAccounts: Account[] = [
  { id: "1", name: "Conta Principal", initialBalance: 0, color: "hsl(217, 91%, 60%)" },
  { id: "2", name: "Poupança", initialBalance: 0, color: "hsl(142, 71%, 45%)" },
  { id: "3", name: "Conta PJ", initialBalance: 0, color: "hsl(38, 92%, 50%)" },
  { id: "4", name: "Reserva", initialBalance: 0, color: "hsl(271, 76%, 53%)" },
];

const defaultCategories: Category[] = [
  { id: "1", type: "Receita", name: "Vendas", description: "Receita de vendas de produtos/serviços" },
  { id: "2", type: "Receita", name: "Serviços", description: "Receita de prestação de serviços" },
  { id: "3", type: "Receita", name: "Investimentos", description: "Retorno de investimentos" },
  { id: "4", type: "Despesa", name: "Aluguel", description: "Aluguel de imóveis" },
  { id: "5", type: "Despesa", name: "Salários", description: "Folha de pagamento" },
  { id: "6", type: "Despesa", name: "Marketing", description: "Despesas com marketing e publicidade" },
  { id: "7", type: "Despesa", name: "Fornecedores", description: "Pagamentos a fornecedores" },
  { id: "8", type: "Despesa", name: "Infraestrutura", description: "Internet, telefone, energia" },
];

const defaultData: FinancialData = {
  accounts: defaultAccounts,
  revenues: [],
  expenses: [],
  transfers: [],
  categories: defaultCategories,
  settings: {
    notificationEmail: "",
    startDate: new Date().toISOString().split('T')[0],
  },
};

export const loadFinancialData = (): FinancialData => {
  if (typeof window === 'undefined') return defaultData;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultData;
    const data = JSON.parse(stored);
    
    if (!data.accounts) data.accounts = defaultAccounts;
    if (!data.transfers) data.transfers = [];
    
    // Migration: ensure transaction consistency
    if (data.revenues?.length > 0 && !data.revenues[0].accountId) {
      data.revenues.forEach((r: Transaction) => r.accountId = data.accounts[0].id);
    }
    if (data.expenses?.length > 0 && !data.expenses[0].accountId) {
      data.expenses.forEach((e: Transaction) => e.accountId = data.accounts[0].id);
    }
    
    return data;
  } catch (error) {
    console.error("Error loading financial data:", error);
    return defaultData;
  }
};

export const saveFinancialData = (data: FinancialData): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving financial data:", error);
  }
};

export const addRevenue = (revenue: Transaction): void => {
  const data = loadFinancialData();
  data.revenues.push(revenue);
  saveFinancialData(data);
};

export const addExpense = (expense: Transaction): void => {
  const data = loadFinancialData();
  data.expenses.push(expense);
  saveFinancialData(data);
};

export const updateRevenue = (id: string, revenue: Transaction): void => {
  const data = loadFinancialData();
  const index = data.revenues.findIndex(r => r.id === id);
  if (index !== -1) {
    data.revenues[index] = revenue;
    saveFinancialData(data);
  }
};

export const updateExpense = (id: string, expense: Transaction): void => {
  const data = loadFinancialData();
  const index = data.expenses.findIndex(e => e.id === id);
  if (index !== -1) {
    data.expenses[index] = expense;
    saveFinancialData(data);
  }
};

export const deleteRevenue = (id: string): void => {
  const data = loadFinancialData();
  data.revenues = data.revenues.filter(r => r.id !== id);
  saveFinancialData(data);
};

export const deleteExpense = (id: string): void => {
  const data = loadFinancialData();
  data.expenses = data.expenses.filter(e => e.id !== id);
  saveFinancialData(data);
};

export const addAccount = (account: Account): void => {
  const data = loadFinancialData();
  data.accounts.push(account);
  saveFinancialData(data);
};

export const updateAccount = (id: string, account: Account): void => {
  const data = loadFinancialData();
  const index = data.accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    data.accounts[index] = account;
    saveFinancialData(data);
  }
};

export const deleteAccount = (id: string): void => {
  const data = loadFinancialData();
  data.accounts = data.accounts.filter(a => a.id !== id);
  saveFinancialData(data);
};

export const addTransfer = (transfer: Transfer): void => {
  const data = loadFinancialData();
  data.transfers.push(transfer);
  saveFinancialData(data);
};

export const updateTransfer = (id: string, transfer: Transfer): void => {
  const data = loadFinancialData();
  const index = data.transfers.findIndex(t => t.id === id);
  if (index !== -1) {
    data.transfers[index] = transfer;
    saveFinancialData(data);
  }
};

export const deleteTransfer = (id: string): void => {
  const data = loadFinancialData();
  data.transfers = data.transfers.filter(t => t.id !== id);
  saveFinancialData(data);
};
