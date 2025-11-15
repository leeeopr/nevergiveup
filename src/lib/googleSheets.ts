// @/lib/googleSheets.ts

// Interface para os dados financeiros (mantendo compatibilidade com o sistema atual)
export interface FinancialData {
  accounts: Account[];
  revenues: Transaction[];
  expenses: Transaction[];
  transfers: Transfer[];
  categories: Category[];
  settings: Settings;
}

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
  paymentMethod: string;
  installments: number;
  status: "Recebido" | "Em aberto" | "Pago";
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
  type: "Receita" | "Despesa";
  name: string;
  description: string;
}

export interface Settings {
  notificationEmail: string;
  startDate: string;
}

// URL do Google Sheets (pública)
const GOOGLE_SHEETS_URL = 'https://spreadsheets.google.com/feeds/list/1yhFjYNEBZM8Ne30ih8rcBCj-edmJC5T7zgnKaptrSOs/od6/public/values?alt=json';

/**
 * Carrega os dados financeiros do Google Sheets
 */
export const loadFinancialData = async (): Promise<FinancialData> => {
  try {
    console.log('Carregando dados do Google Sheets...');
    
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao carregar dados: ${response.status} ${response.statusText}`);
    }
    
    const sheetsData = await response.json();
    console.log('Dados brutos do Google Sheets:', sheetsData);
    
    // Transformar os dados do Google Sheets para o formato do sistema
    const transformedData = transformGoogleSheetsData(sheetsData);
    console.log('Dados transformados:', transformedData);
    
    return transformedData;
  } catch (error) {
    console.error('Erro ao carregar dados do Google Sheets:', error);
    
    // Retornar dados padrão em caso de erro
    return getDefaultData();
  }
};

/**
 * Transforma os dados do formato Google Sheets para o formato do sistema
 */
const transformGoogleSheetsData = (sheetsData: any): FinancialData => {
  const entries = sheetsData.feed?.entry || [];
  
  console.log(`Processando ${entries.length} entradas do Google Sheets`);

  const transformedData: FinancialData = {
    accounts: [],
    revenues: [],
    expenses: [],
    transfers: [],
    categories: [],
    settings: {
      notificationEmail: '',
      startDate: new Date().toISOString().split('T')[0]
    }
  };

  // Mapeamento das colunas do Google Sheets
  entries.forEach((entry: any, index: number) => {
    try {
      // Extrair valores das colunas (gsx$NOMEDACOLUNA)
      const rowData: any = {};
      
      // Mapear todas as propriedades que começam com 'gsx$'
      Object.keys(entry).forEach(key => {
        if (key.startsWith('gsx$') && entry[key]?.$t !== undefined) {
          const columnName = key.replace('gsx$', '');
          rowData[columnName] = entry[key].$t;
        }
      });

      // Classificar por tipo de dado
      const dataType = rowData.type?.toLowerCase() || rowData.tipo?.toLowerCase() || 'unknown';
      
      switch (dataType) {
        case 'account':
        case 'conta':
          transformedData.accounts.push(createAccount(rowData, index));
          break;
          
        case 'revenue':
        case 'receita':
          transformedData.revenues.push(createTransaction(rowData, index, 'revenue'));
          break;
          
        case 'expense':
        case 'despesa':
          transformedData.expenses.push(createTransaction(rowData, index, 'expense'));
          break;
          
        case 'transfer':
        case 'transferencia':
          transformedData.transfers.push(createTransfer(rowData, index));
          break;
          
        case 'category':
        case 'categoria':
          transformedData.categories.push(createCategory(rowData, index));
          break;
          
        case 'setting':
        case 'configuracao':
          if (rowData.key && rowData.value) {
            transformedData.settings[rowData.key] = rowData.value;
          }
          break;
          
        default:
          console.warn('Tipo de dado desconhecido:', dataType, rowData);
          break;
      }
    } catch (error) {
      console.error('Erro ao processar linha', index, ':', error);
    }
  });

  return transformedData;
};

/**
 * Cria um objeto Account a partir dos dados da linha
 */
const createAccount = (rowData: any, index: number): Account => {
  return {
    id: rowData.id || `acc_${Date.now()}_${index}`,
    name: rowData.name || rowData.nome || 'Conta Sem Nome',
    initialBalance: parseFloat(rowData.initialbalance || rowData.saldinicial || rowData.balance || '0'),
    color: rowData.color || rowData.cor || `hsl(${index * 60}, 91%, 60%)`
  };
};

/**
 * Cria um objeto Transaction (Revenue ou Expense)
 */
const createTransaction = (rowData: any, index: number, type: 'revenue' | 'expense'): Transaction => {
  const statusMap: any = {
    'recebido': 'Recebido',
    'pago': 'Pago',
    'em aberto': 'Em aberto',
    'paid': 'Pago',
    'received': 'Recebido',
    'pending': 'Em aberto'
  };

  return {
    id: rowData.id || `${type === 'revenue' ? 'rev' : 'exp'}_${Date.now()}_${index}`,
    accountId: rowData.accountid || rowData.contaid || '',
    date: rowData.date || rowData.data || new Date().toISOString().split('T')[0],
    description: rowData.description || rowData.descricao || 'Sem descrição',
    category: rowData.category || rowData.categoria || '',
    clientOrSupplier: rowData.clientorsupplier || rowData.clientefornecedor || rowData.cliente || rowData.fornecedor || '',
    amount: parseFloat(rowData.amount || rowData.valor || '0'),
    paymentMethod: rowData.paymentmethod || rowData.metodopagamento || 'Dinheiro',
    installments: parseInt(rowData.installments || rowData.parcelas || '1'),
    status: statusMap[(rowData.status || '').toLowerCase()] || (type === 'revenue' ? 'Em aberto' : 'Em aberto')
  };
};

/**
 * Cria um objeto Transfer
 */
const createTransfer = (rowData: any, index: number): Transfer => {
  return {
    id: rowData.id || `trans_${Date.now()}_${index}`,
    date: rowData.date || rowData.data || new Date().toISOString().split('T')[0],
    description: rowData.description || rowData.descricao || 'Transferência',
    amount: parseFloat(rowData.amount || rowData.valor || '0'),
    fromAccountId: rowData.fromaccountid || rowData.contade || '',
    toAccountId: rowData.toaccountid || rowData.contapara || ''
  };
};

/**
 * Cria um objeto Category
 */
const createCategory = (rowData: any, index: number): Category => {
  const typeMap: any = {
    'revenue': 'Receita',
    'receita': 'Receita',
    'expense': 'Despesa',
    'despesa': 'Despesa'
  };

  return {
    id: rowData.id || `cat_${Date.now()}_${index}`,
    type: typeMap[(rowData.type || rowData.tipo || 'despesa').toLowerCase()] || 'Despesa',
    name: rowData.name || rowData.nome || 'Categoria Sem Nome',
    description: rowData.description || rowData.descricao || ''
  };
};

/**
 * Retorna dados padrão em caso de erro
 */
const getDefaultData = (): FinancialData => {
  return {
    accounts: [
      {
        id: 'acc_default_1',
        name: 'Conta Principal',
        initialBalance: 0,
        color: 'hsl(217, 91%, 60%)'
      }
    ],
    revenues: [],
    expenses: [],
    transfers: [],
    categories: [
      {
        id: 'cat_rev_1',
        type: 'Receita',
        name: 'Vendas',
        description: 'Receitas de vendas'
      },
      {
        id: 'cat_exp_1',
        type: 'Despesa',
        name: 'Material',
        description: 'Despesas com material'
      }
    ],
    settings: {
      notificationEmail: '',
      startDate: new Date().toISOString().split('T')[0]
    }
  };
};

// Funções de escrita (para compatibilidade - avisam que não estão disponíveis)
export const saveFinancialData = async (data: FinancialData): Promise<void> => {
  console.warn('Aviso: saveFinancialData não está disponível para Google Sheets público. Use uma API personalizada para escrita.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const addExpense = async (expense: any): Promise<void> => {
  console.warn('Aviso: addExpense não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const updateExpense = async (id: string, expense: any): Promise<void> => {
  console.warn('Aviso: updateExpense não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const deleteExpense = async (id: string): Promise<void> => {
  console.warn('Aviso: deleteExpense não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const addRevenue = async (revenue: any): Promise<void> => {
  console.warn('Aviso: addRevenue não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const updateRevenue = async (id: string, revenue: any): Promise<void> => {
  console.warn('Aviso: updateRevenue não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const deleteRevenue = async (id: string): Promise<void> => {
  console.warn('Aviso: deleteRevenue não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const addAccount = async (account: any): Promise<void> => {
  console.warn('Aviso: addAccount não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const updateAccount = async (id: string, account: any): Promise<void> => {
  console.warn('Aviso: updateAccount não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const deleteAccount = async (id: string): Promise<void> => {
  console.warn('Aviso: deleteAccount não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const addTransfer = async (transfer: any): Promise<void> => {
  console.warn('Aviso: addTransfer não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};

export const deleteTransfer = async (id: string): Promise<void> => {
  console.warn('Aviso: deleteTransfer não está disponível para Google Sheets público.');
  throw new Error('Escrita não suportada para Google Sheets público');
};