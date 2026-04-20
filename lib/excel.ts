import * as XLSX from 'xlsx';
import { FinancialData } from './types';

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

export const importFromExcel = async (file: File): Promise<FinancialData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const importedData: FinancialData = {
          accounts: [],
          revenues: [],
          expenses: [],
          transfers: [],
          categories: [],
          settings: { notificationEmail: '', startDate: '' },
        };

        const sheetToJson = (name: string) => {
          const sheet = workbook.Sheets[name];
          return sheet ? XLSX.utils.sheet_to_json(sheet) : [];
        };

        const rawAccounts: any[] = sheetToJson('Contas');
        importedData.accounts = rawAccounts.map((a, index) => ({
          id: `acc_${Date.now()}_${index}`,
          name: a.Nome,
          initialBalance: Number(a['Saldo Inicial']),
          color: a.Cor,
        }));

        const rawCategories: any[] = sheetToJson('Categorias');
        importedData.categories = rawCategories.map((c, index) => ({
          id: `cat_${Date.now()}_${index}`,
          type: c.Tipo as 'Receita' | 'Despesa',
          name: c['Nome da Categoria'],
          description: c.Descrição || '',
        }));

        const rawRevenues: any[] = sheetToJson('Receitas');
        importedData.revenues = rawRevenues.map((r, index) => {
          const account = importedData.accounts.find(a => a.name === r.Conta);
          return {
            id: `rev_${Date.now()}_${index}`,
            accountId: account?.id || '',
            date: r.Data,
            description: r.Descrição,
            category: r.Categoria,
            clientOrSupplier: r.Cliente || '',
            amount: Number(r.Valor),
            paymentMethod: r['Método de Pagamento'],
            installments: Number(r.Parcelas),
            status: r.Status as 'Em aberto' | 'Pago',
          };
        });

        const rawExpenses: any[] = sheetToJson('Despesas');
        importedData.expenses = rawExpenses.map((e, index) => {
          const account = importedData.accounts.find(a => a.name === e.Conta);
          return {
            id: `exp_${Date.now()}_${index}`,
            accountId: account?.id || '',
            date: e.Data,
            description: e.Descrição,
            category: e.Categoria,
            clientOrSupplier: e.Fornecedor || '',
            amount: Number(e.Valor),
            paymentMethod: e['Método de Pagamento'],
            installments: Number(e.Parcelas),
            status: e.Status as 'Em aberto' | 'Pago',
          };
        });

        const rawTransfers: any[] = sheetToJson('Transferências');
        importedData.transfers = rawTransfers.map((t, index) => {
          const fromAcc = importedData.accounts.find(a => a.name === t['Conta Origem']);
          const toAcc = importedData.accounts.find(a => a.name === t['Conta Destino']);
          return {
            id: `trans_${Date.now()}_${index}`,
            date: t.Data,
            description: t.Descrição,
            amount: Number(t.Valor),
            fromAccountId: fromAcc?.id || '',
            toAccountId: toAcc?.id || '',
          };
        });

        const rawSettings: any[] = sheetToJson('Configurações');
        const emailRow = rawSettings.find(s => s.Campo === 'Email para notificações');
        const dateRow = rawSettings.find(s => s.Campo === 'Data de início');
        importedData.settings = {
          notificationEmail: emailRow?.Valor || '',
          startDate: dateRow?.Valor || '',
        };

        resolve(importedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
