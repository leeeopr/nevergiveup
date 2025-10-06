import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadFinancialData } from "@/lib/storage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

interface DailyTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  clientOrSupplier: string;
  accountId: string;
}

interface DailyBalance {
  date: string;
  balances: { [accountId: string]: number };
  transactions: DailyTransaction[];
}

export default function ProjecaoCaixa() {
  const data = loadFinancialData();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");

  // Expand transactions with installments into individual daily transactions
  const expandedTransactions = useMemo(() => {
    const expanded: DailyTransaction[] = [];

    // Process revenues
    data.revenues.forEach(rev => {
      if (rev.installments <= 1) {
        expanded.push({
          date: rev.date,
          description: rev.description,
          amount: rev.amount,
          type: "income",
          category: rev.category,
          clientOrSupplier: rev.clientOrSupplier,
          accountId: rev.accountId,
        });
      } else {
        const installmentAmount = rev.amount / rev.installments;
        const baseDate = new Date(rev.date);
        for (let i = 0; i < rev.installments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          expanded.push({
            date: installmentDate.toISOString().split('T')[0],
            description: `${rev.description} (${i + 1}/${rev.installments})`,
            amount: installmentAmount,
            type: "income",
            category: rev.category,
            clientOrSupplier: rev.clientOrSupplier,
            accountId: rev.accountId,
          });
        }
      }
    });

    // Process expenses
    data.expenses.forEach(exp => {
      if (exp.installments <= 1) {
        expanded.push({
          date: exp.date,
          description: exp.description,
          amount: exp.amount,
          type: "expense",
          category: exp.category,
          clientOrSupplier: exp.clientOrSupplier,
          accountId: exp.accountId,
        });
      } else {
        const installmentAmount = exp.amount / exp.installments;
        const baseDate = new Date(exp.date);
        for (let i = 0; i < exp.installments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          expanded.push({
            date: installmentDate.toISOString().split('T')[0],
            description: `${exp.description} (${i + 1}/${exp.installments})`,
            amount: installmentAmount,
            type: "expense",
            category: exp.category,
            clientOrSupplier: exp.clientOrSupplier,
            accountId: exp.accountId,
          });
        }
      }
    });

    // Process transfers
    data.transfers.forEach(transfer => {
      expanded.push({
        date: transfer.date,
        description: `Transferência: ${transfer.description}`,
        amount: transfer.amount,
        type: "transfer",
        category: "Transferência",
        clientOrSupplier: "",
        accountId: transfer.fromAccountId,
      });
    });

    return expanded.sort((a, b) => a.date.localeCompare(b.date));
  }, [data.revenues, data.expenses, data.transfers]);

  // Calculate daily balances for all accounts
  const dailyBalances = useMemo(() => {
    const balances: DailyBalance[] = [];
    const runningBalances: { [accountId: string]: number } = {};
    
    // Initialize with initial balances
    data.accounts.forEach(acc => {
      runningBalances[acc.id] = acc.initialBalance;
    });

    const filteredTransactions = expandedTransactions.filter(t => {
      const matchesDate = t.date >= startDate && t.date <= endDate;
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;
      const matchesAccount = filterAccount === "all" || t.accountId === filterAccount;
      return matchesDate && matchesCategory && matchesAccount;
    });

    // Group transactions by date
    const transactionsByDate = new Map<string, DailyTransaction[]>();
    filteredTransactions.forEach(t => {
      if (!transactionsByDate.has(t.date)) {
        transactionsByDate.set(t.date, []);
      }
      transactionsByDate.get(t.date)!.push(t);
    });

    // Sort dates
    const sortedDates = Array.from(transactionsByDate.keys()).sort();

    sortedDates.forEach(date => {
      const dayTransactions = transactionsByDate.get(date)!;
      
      dayTransactions.forEach(t => {
        if (t.type === "income") {
          runningBalances[t.accountId] = (runningBalances[t.accountId] || 0) + t.amount;
        } else if (t.type === "expense") {
          runningBalances[t.accountId] = (runningBalances[t.accountId] || 0) - t.amount;
        } else if (t.type === "transfer") {
          const transfer = data.transfers.find(tr => 
            tr.date === t.date && tr.description === t.description.replace("Transferência: ", "")
          );
          if (transfer) {
            runningBalances[transfer.fromAccountId] = (runningBalances[transfer.fromAccountId] || 0) - transfer.amount;
            runningBalances[transfer.toAccountId] = (runningBalances[transfer.toAccountId] || 0) + transfer.amount;
          }
        }
      });

      balances.push({
        date,
        balances: { ...runningBalances },
        transactions: dayTransactions,
      });
    });

    return balances;
  }, [expandedTransactions, startDate, endDate, filterCategory, filterAccount, data.accounts, data.transfers]);

  // Analyze expense coverage per account
  const expenseCoverage = useMemo(() => {
    const runningBalances: { [accountId: string]: number } = {};
    
    // Initialize with initial balances
    data.accounts.forEach(acc => {
      runningBalances[acc.id] = acc.initialBalance;
    });
    const analysis: Array<{
      date: string;
      expense: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      status: "safe" | "warning" | "risk";
      category: string;
      supplier: string;
      accountId: string;
    }> = [];

    const allTransactions = expandedTransactions.filter(t => {
      const matchesDate = t.date >= startDate && t.date <= endDate;
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;
      const matchesAccount = filterAccount === "all" || t.accountId === filterAccount;
      return matchesDate && matchesCategory && matchesAccount;
    });

    allTransactions.forEach(t => {
      if (t.type === "expense") {
        const balanceBefore = runningBalances[t.accountId] || 0;
        const balanceAfter = balanceBefore - t.amount;
        
        let status: "safe" | "warning" | "risk";
        if (balanceAfter < 0) {
          status = "risk";
        } else if (balanceAfter < balanceBefore * 0.47) {
          status = "warning";
        } else {
          status = "safe";
        }

        analysis.push({
          date: t.date,
          expense: t.description,
          amount: t.amount,
          balanceBefore,
          balanceAfter,
          status,
          category: t.category,
          supplier: t.clientOrSupplier,
          accountId: t.accountId,
        });
      }

      // Update running balance
      if (t.type === "income") {
        runningBalances[t.accountId] = (runningBalances[t.accountId] || 0) + t.amount;
      } else if (t.type === "expense") {
        runningBalances[t.accountId] = (runningBalances[t.accountId] || 0) - t.amount;
      } else if (t.type === "transfer") {
        const transfer = data.transfers.find(tr => 
          tr.date === t.date && tr.description === t.description.replace("Transferência: ", "")
        );
        if (transfer) {
          runningBalances[transfer.fromAccountId] = (runningBalances[transfer.fromAccountId] || 0) - transfer.amount;
          runningBalances[transfer.toAccountId] = (runningBalances[transfer.toAccountId] || 0) + transfer.amount;
        }
      }
    });

    return analysis;
  }, [expandedTransactions, startDate, endDate, filterCategory, filterAccount, data.accounts, data.transfers]);

  // Chart data
  const chartData = dailyBalances.map(db => {
    const dataPoint: any = {
      date: new Date(db.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    };
    
    // Add balance for each account or total
    if (filterAccount === "all") {
      let total = 0;
      data.accounts.forEach(acc => {
        total += db.balances[acc.id] || 0;
      });
      dataPoint.total = total;
    } else {
      data.accounts.forEach(acc => {
        if (filterAccount === "all" || filterAccount === acc.id) {
          dataPoint[acc.name] = db.balances[acc.id] || 0;
        }
      });
    }
    
    return dataPoint;
  });

  const allCategories = Array.from(new Set([
    ...data.categories.map(c => c.name)
  ]));

  const riskyExpenses = expenseCoverage.filter(e => e.status === "risk").length;
  const warningExpenses = expenseCoverage.filter(e => e.status === "warning").length;
  const safeExpenses = expenseCoverage.filter(e => e.status === "safe").length;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Projeção de Caixa</h1>
        <p className="text-muted-foreground mt-1">Análise de cobertura de despesas e projeção de saldo</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 bg-success/10 border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-success">Despesas Cobertas</p>
          </div>
          <p className="text-2xl font-bold text-success">{safeExpenses}</p>
        </Card>
        <Card className="p-4 bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm font-medium text-warning">Saldo Apertado</p>
          </div>
          <p className="text-2xl font-bold text-warning">{warningExpenses}</p>
        </Card>
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Saldo Insuficiente</p>
          </div>
          <p className="text-2xl font-bold text-destructive">{riskyExpenses}</p>
        </Card>
      </div>

      {/* Balance Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Projeção de Saldo</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis 
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Expense Coverage Table */}
      <Card>
        <div className="p-4 border-b bg-muted/50">
          <h2 className="text-xl font-semibold">Análise de Cobertura de Despesas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Data</th>
                <th className="p-4 text-left text-sm font-medium">Despesa</th>
                <th className="p-4 text-left text-sm font-medium">Categoria</th>
                <th className="p-4 text-left text-sm font-medium">Fornecedor</th>
                <th className="p-4 text-right text-sm font-medium">Valor</th>
                <th className="p-4 text-right text-sm font-medium">Saldo Anterior</th>
                <th className="p-4 text-right text-sm font-medium">Saldo Após</th>
                <th className="p-4 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenseCoverage.map((exp, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b transition-colors ${
                    exp.status === "risk" ? "bg-destructive/5 hover:bg-destructive/10" :
                    exp.status === "warning" ? "bg-warning/5 hover:bg-warning/10" :
                    "hover:bg-muted/30"
                  }`}
                >
                  <td className="p-4 text-sm">
                    {new Date(exp.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-sm">{exp.expense}</td>
                  <td className="p-4 text-sm">{exp.category}</td>
                  <td className="p-4 text-sm">{exp.supplier}</td>
                  <td className="p-4 text-right text-sm font-medium">
                    R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-sm">
                    R$ {exp.balanceBefore.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`p-4 text-right text-sm font-medium ${
                    exp.balanceAfter < 0 ? "text-destructive" : ""
                  }`}>
                    R$ {exp.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      exp.status === "safe" ? "bg-success/10 text-success" :
                      exp.status === "warning" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {exp.status === "safe" ? "✓ OK" : 
                       exp.status === "warning" ? "⚠ Apertado" : 
                       "✗ Risco"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
