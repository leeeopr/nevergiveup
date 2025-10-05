import * as XLSX from 'xlsx';
import { FinancialData, Transaction, Category } from '@/types/financial';

export const exportToExcel = (data: FinancialData): void => {
  const workbook = XLSX.utils.book_new();

  // Aba 1 - Receitas
  const revenuesData = data.revenues.map(r => ({
    Data: r.date,
    Descrição: r.description,
    Categoria: r.category,
    Cliente: r.clientOrSupplier,
    Valor: r.amount,
    'Método de Pagamento': r.paymentMethod,
    Parcelas: r.installments,
    Status: r.status,
  }));
  const revenuesSheet = XLSX.utils.json_to_sheet(revenuesData);
  XLSX.utils.book_append_sheet(workbook, revenuesSheet, 'Receitas');

  // Aba 2 - Despesas
  const expensesData = data.expenses.map(e => ({
    Data: e.date,
    Descrição: e.description,
    Categoria: e.category,
    Fornecedor: e.clientOrSupplier,
    Valor: e.amount,
    'Método de Pagamento': e.paymentMethod,
    Parcelas: e.installments,
    Status: e.status,
  }));
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Despesas');

  // Aba 3 - Categorias
  const categoriesData = data.categories.map(c => ({
    Tipo: c.type,
    'Nome da Categoria': c.name,
    Descrição: c.description,
  }));
  const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categorias');

  // Aba 4 - Configurações
  const settingsData = [
    { Campo: 'Email para notificações', Valor: data.settings.notificationEmail },
    { Campo: 'Data de início', Valor: data.settings.startDate },
    { Campo: 'Saldo inicial', Valor: data.settings.initialBalance },
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
          revenues: [],
          expenses: [],
          categories: [],
          settings: {
            notificationEmail: '',
            startDate: new Date().toISOString().split('T')[0],
            initialBalance: 0,
          },
        };

        // Ler Receitas
        if (workbook.SheetNames.includes('Receitas')) {
          const revenuesSheet = workbook.Sheets['Receitas'];
          const revenuesData = XLSX.utils.sheet_to_json(revenuesSheet);
          result.revenues = revenuesData.map((row: any, index) => ({
            id: `rev_${Date.now()}_${index}`,
            date: row.Data || '',
            description: row.Descrição || '',
            category: row.Categoria || '',
            clientOrSupplier: row.Cliente || '',
            amount: Number(row.Valor) || 0,
            paymentMethod: row['Método de Pagamento'] || 'Dinheiro',
            installments: Number(row.Parcelas) || 1,
            status: row.Status || 'Em aberto',
          }));
        }

        // Ler Despesas
        if (workbook.SheetNames.includes('Despesas')) {
          const expensesSheet = workbook.Sheets['Despesas'];
          const expensesData = XLSX.utils.sheet_to_json(expensesSheet);
          result.expenses = expensesData.map((row: any, index) => ({
            id: `exp_${Date.now()}_${index}`,
            date: row.Data || '',
            description: row.Descrição || '',
            category: row.Categoria || '',
            clientOrSupplier: row.Fornecedor || '',
            amount: Number(row.Valor) || 0,
            paymentMethod: row['Método de Pagamento'] || 'Dinheiro',
            installments: Number(row.Parcelas) || 1,
            status: row.Status || 'Em aberto',
          }));
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
            } else if (row.Campo === 'Saldo inicial') {
              result.settings.initialBalance = Number(row.Valor) || 0;
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
