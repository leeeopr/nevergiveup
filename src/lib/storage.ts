import { FinancialData, Transaction, Category } from "@/types/financial";

const STORAGE_KEY = "financial_data";

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
  revenues: [],
  expenses: [],
  categories: defaultCategories,
  settings: {
    notificationEmail: "",
    startDate: new Date().toISOString().split('T')[0],
    initialBalance: 0,
  },
};

export const loadFinancialData = (): FinancialData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultData;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading financial data:", error);
    return defaultData;
  }
};

export const saveFinancialData = (data: FinancialData): void => {
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
