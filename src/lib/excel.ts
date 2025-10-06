import * as XLSX from 'xlsx';
import { FinancialData, Transaction, Category } from '@/types/financial';

export const exportToExcel = (data: FinancialData): void => {
  const workbook = XLSX.utils.book_new();

  // Aba 1 - Contas
  const accountsData = data.accounts.map(a => ({
    Nome: a.name,
    'Saldo Inicial': a.initialBalance,
    Cor: a.color,
  }));
  const accountsSheet = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Contas');

  // Aba 2 - Receitas
  const revenuesData = data.revenues.map(r => {
    const account = data.accounts.find(a => a.id === r.accountId);
    return {
      Data: r.date,
      Descrição: r.description,
      Categoria: r.category,
      Cliente: r.clientOrSupplier,
      Conta: account?.name || '',
      Valor: r.amount,
      'Método de Pagamento': r.paymentMethod,
      Parcelas: r.installments,
      Status: r.status,
    };
  });
  const revenuesSheet = XLSX.utils.json_to_sheet(revenuesData);
  XLSX.utils.book_append_sheet(workbook, revenuesSheet, 'Receitas');

  // Aba 3 - Despesas
  const expensesData = data.expenses.map(e => {
    const account = data.accounts.find(a => a.id === e.accountId);
    return {
      Data: e.date,
      Descrição: e.description,
      Categoria: e.category,
      Fornecedor: e.clientOrSupplier,
      Conta: account?.name || '',
      Valor: e.amount,
      'Método de Pagamento': e.paymentMethod,
      Parcelas: e.installments,
      Status: e.status,
    };
  });
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Despesas');

  // Aba 4 - Transferências
  const transfersData = data.transfers.map(t => {
    const fromAccount = data.accounts.find(a => a.id === t.fromAccountId);
    const toAccount = data.accounts.find(a => a.id === t.toAccountId);
    return {
      Data: t.date,
      Descrição: t.description,
      'Conta Origem': fromAccount?.name || '',
      'Conta Destino': toAccount?.name || '',
      Valor: t.amount,
    };
  });
  const transfersSheet = XLSX.utils.json_to_sheet(transfersData);
  XLSX.utils.book_append_sheet(workbook, transfersSheet, 'Transferências');

  // Aba 5 - Categorias
  const categoriesData = data.categories.map(c => ({
    Tipo: c.type,
    'Nome da Categoria': c.name,
    Descrição: c.description,
  }));
  const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categorias');

  // Aba 6 - Configurações
  const settingsData = [
    { Campo: 'Email para notificações', Valor: data.settings.notificationEmail },
    { Campo: 'Data de início', Valor: data.settings.startDate },
  ];
  const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
  XLSX.utils.book_append_sheet(workbook, settingsSheet, 'Configurações');

  // Exportar arquivo
  const fileName = `planejamento_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const importFromExcel = (file: File): Promise<FinancialData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: FinancialData = {
          accounts: [],
          revenues: [],
          expenses: [],
          transfers: [],
          categories: [],
          settings: {
            notificationEmail: '',
            startDate: new Date().toISOString().split('T')[0],
          },
        };

        // Ler Contas
        if (workbook.SheetNames.includes('Contas')) {
          const accountsSheet = workbook.Sheets['Contas'];
          const accountsData = XLSX.utils.sheet_to_json(accountsSheet);
          result.accounts = accountsData.map((row: any, index) => ({
            id: `acc_${Date.now()}_${index}`,
            name: row.Nome || '',
            initialBalance: Number(row['Saldo Inicial']) || 0,
            color: row.Cor || 'hsl(217, 91%, 60%)',
          }));
        }

        // Ler Receitas
        if (workbook.SheetNames.includes('Receitas')) {
          const revenuesSheet = workbook.Sheets['Receitas'];
          const revenuesData = XLSX.utils.sheet_to_json(revenuesSheet);
          result.revenues = revenuesData.map((row: any, index) => {
            const accountName = row.Conta || '';
            const account = result.accounts.find(a => a.name === accountName);
            return {
              id: `rev_${Date.now()}_${index}`,
              accountId: account?.id || result.accounts[0]?.id || '',
              date: row.Data || '',
              description: row.Descrição || '',
              category: row.Categoria || '',
              clientOrSupplier: row.Cliente || '',
              amount: Number(row.Valor) || 0,
              paymentMethod: row['Método de Pagamento'] || 'Dinheiro',
              installments: Number(row.Parcelas) || 1,
              status: row.Status || 'Em aberto',
            };
          });
        }

        // Ler Despesas
        if (workbook.SheetNames.includes('Despesas')) {
          const expensesSheet = workbook.Sheets['Despesas'];
          const expensesData = XLSX.utils.sheet_to_json(expensesSheet);
          result.expenses = expensesData.map((row: any, index) => {
            const accountName = row.Conta || '';
            const account = result.accounts.find(a => a.name === accountName);
            return {
              id: `exp_${Date.now()}_${index}`,
              accountId: account?.id || result.accounts[0]?.id || '',
              date: row.Data || '',
              description: row.Descrição || '',
              category: row.Categoria || '',
              clientOrSupplier: row.Fornecedor || '',
              amount: Number(row.Valor) || 0,
              paymentMethod: row['Método de Pagamento'] || 'Dinheiro',
              installments: Number(row.Parcelas) || 1,
              status: row.Status || 'Em aberto',
            };
          });
        }

        // Ler Transferências
        if (workbook.SheetNames.includes('Transferências')) {
          const transfersSheet = workbook.Sheets['Transferências'];
          const transfersData = XLSX.utils.sheet_to_json(transfersSheet);
          result.transfers = transfersData.map((row: any, index) => {
            const fromAccountName = row['Conta Origem'] || '';
            const toAccountName = row['Conta Destino'] || '';
            const fromAccount = result.accounts.find(a => a.name === fromAccountName);
            const toAccount = result.accounts.find(a => a.name === toAccountName);
            return {
              id: `trans_${Date.now()}_${index}`,
              date: row.Data || '',
              description: row.Descrição || '',
              amount: Number(row.Valor) || 0,
              fromAccountId: fromAccount?.id || '',
              toAccountId: toAccount?.id || '',
            };
          });
        }

        // Ler Categorias
        if (workbook.SheetNames.includes('Categorias')) {
          const categoriesSheet = workbook.Sheets['Categorias'];
          const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet);
          result.categories = categoriesData.map((row: any, index) => ({
            id: `cat_${Date.now()}_${index}`,
            type: row.Tipo || 'Despesa',
            name: row['Nome da Categoria'] || '',
            description: row.Descrição || '',
          }));
        }

        // Ler Configurações
        if (workbook.SheetNames.includes('Configurações')) {
          const settingsSheet = workbook.Sheets['Configurações'];
          const settingsData = XLSX.utils.sheet_to_json(settingsSheet);
          settingsData.forEach((row: any) => {
            if (row.Campo === 'Email para notificações') {
              result.settings.notificationEmail = row.Valor || '';
            } else if (row.Campo === 'Data de início') {
              result.settings.startDate = row.Valor || '';
            }
          });
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};
