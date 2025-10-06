import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { loadFinancialData } from "@/lib/storage";
import { FinancialData } from "@/types/financial";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Dashboard() {
  const [data, setData] = useState<FinancialData | null>(null);

  useEffect(() => {
    setData(loadFinancialData());
  }, []);

  if (!data) return null;

  const calculateTotalBalance = () => {
    let total = 0;
    
    data.accounts.forEach(account => {
      let accountBalance = account.initialBalance;
      
      // Add received revenues
      data.revenues
        .filter(r => r.accountId === account.id && r.status === "Recebido")
        .forEach(r => accountBalance += r.amount);
      
      // Subtract paid expenses
      data.expenses
        .filter(e => e.accountId === account.id && e.status === "Pago")
        .forEach(e => accountBalance -= e.amount);
      
      // Subtract outgoing transfers
      data.transfers
        .filter(t => t.fromAccountId === account.id)
        .forEach(t => accountBalance -= t.amount);
      
      // Add incoming transfers
      data.transfers
        .filter(t => t.toAccountId === account.id)
        .forEach(t => accountBalance += t.amount);
      
      total += accountBalance;
    });
    
    return total;
  };

  const totalRevenue = data.revenues
    .filter(r => r.status === "Recebido")
    .reduce((sum, r) => sum + r.amount, 0);
  
  const totalExpense = data.expenses
    .filter(e => e.status === "Pago")
    .reduce((sum, e) => sum + e.amount, 0);
  
  const balance = calculateTotalBalance();

  const pendingRevenue = data.revenues
    .filter(r => r.status === "Em aberto")
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingExpense = data.expenses
    .filter(e => e.status === "Em aberto")
    .reduce((sum, e) => sum + e.amount, 0);

  // Dados para o gráfico de fluxo de caixa (últimos 6 meses)
  const cashFlowData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    const monthRevenue = data.revenues
      .filter(r => {
        const rDate = new Date(r.date);
        return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, r) => sum + r.amount, 0);

    const monthExpense = data.expenses
      .filter(e => {
        const eDate = new Date(e.date);
        return eDate.getMonth() === date.getMonth() && eDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      month: monthYear,
      receitas: monthRevenue,
      despesas: monthExpense,
    };
  });

  // Dados para gráfico de despesas por categoria
  const expensesByCategory = data.categories
    .filter(c => c.type === "Despesa")
    .map(category => ({
      name: category.name,
      value: data.expenses
        .filter(e => e.category === category.name && e.status === "Pago")
        .reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter(item => item.value > 0);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu planejamento financeiro</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={{ value: "12.5%", positive: balance > 0 }}
        />
        <StatCard
          title="Receitas (Recebidas)"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Despesas (Pagas)"
          value={`R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
        />
        <StatCard
          title="Contas Pendentes"
          value={`R$ ${(pendingRevenue + pendingExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa (6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="receitas" 
                name="Receitas"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                name="Despesas"
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--destructive))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas (Mensal)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
