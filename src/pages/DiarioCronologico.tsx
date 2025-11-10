import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, Search, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { loadFinancialData } from '@/lib/storage';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LogType = 'revenue' | 'expense' | 'transfer';
type LogStatus = 'pending' | 'completed' | 'scheduled';

interface LogEntry {
  id: string;
  date: string;
  type: LogType;
  accountName: string;
  description: string;
  amount: number;
  category?: string;
  status: LogStatus;
  observation?: string;
  fromAccount?: string;
  toAccount?: string;
}

export default function DiarioCronologico() {
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const logs = useMemo(() => {
    const data = loadFinancialData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries: LogEntry[] = [];

    // Add revenues
    data.revenues.forEach(rev => {
      const account = data.accounts.find(a => a.id === rev.accountId);
      const revDate = parseISO(rev.date);
      
      let status: LogStatus = 'pending';
      if (rev.status === 'Recebido') status = 'completed';
      else if (revDate > today) status = 'scheduled';

      entries.push({
        id: `rev-${rev.id}`,
        date: rev.date,
        type: 'revenue',
        accountName: account?.name || 'Conta desconhecida',
        description: rev.description,
        amount: rev.amount,
        category: rev.category,
        status,
        observation: rev.clientOrSupplier ? `Cliente: ${rev.clientOrSupplier}` : undefined,
      });
    });

    // Add expenses
    data.expenses.forEach(exp => {
      const account = data.accounts.find(a => a.id === exp.accountId);
      const expDate = parseISO(exp.date);
      
      let status: LogStatus = 'pending';
      if (exp.status === 'Pago') status = 'completed';
      else if (expDate > today) status = 'scheduled';

      entries.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        type: 'expense',
        accountName: account?.name || 'Conta desconhecida',
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        status,
        observation: exp.clientOrSupplier ? `Fornecedor: ${exp.clientOrSupplier}` : undefined,
      });
    });

    // Add transfers
    data.transfers.forEach(trans => {
      const fromAccount = data.accounts.find(a => a.id === trans.fromAccountId);
      const toAccount = data.accounts.find(a => a.id === trans.toAccountId);
      const transDate = parseISO(trans.date);

      entries.push({
        id: `trans-${trans.id}`,
        date: trans.date,
        type: 'transfer',
        accountName: fromAccount?.name || 'Conta desconhecida',
        description: trans.description,
        amount: trans.amount,
        status: transDate > today ? 'scheduled' : 'completed',
        fromAccount: fromAccount?.name,
        toAccount: toAccount?.name,
        observation: `De ${fromAccount?.name} para ${toAccount?.name}`,
      });
    });

    // Sort by date (descending - most recent first)
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.type === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.accountName.toLowerCase().includes(term) ||
        log.description.toLowerCase().includes(term) ||
        log.category?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [logs, filter, searchTerm]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    
    filteredLogs.forEach(log => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }
      groups[log.date].push(log);
    });

    return groups;
  }, [filteredLogs]);

  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case 'revenue':
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'expense':
        return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: LogType) => {
    switch (type) {
      case 'revenue':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">#RECEITA</Badge>;
      case 'expense':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">#DESPESA</Badge>;
      case 'transfer':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">#TRANSFERÊNCIA</Badge>;
    }
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500">Concluído</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Pendente</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Agendado</Badge>;
    }
  };

  const formatAmount = (amount: number, type: LogType) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    if (type === 'revenue') {
      return <span className="text-green-500 font-semibold">+ {formatted}</span>;
    } else if (type === 'expense') {
      return <span className="text-red-500 font-semibold">- {formatted}</span>;
    } else {
      return <span className="text-blue-500 font-semibold">{formatted}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Diário Cronológico</h1>
          <p className="text-muted-foreground">Todas as movimentações financeiras em ordem cronológica</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Entrada
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filter === 'revenue' ? 'default' : 'outline'}
                onClick={() => setFilter('revenue')}
                size="sm"
                className="gap-2"
              >
                <ArrowDownCircle className="h-4 w-4" />
                Receitas
              </Button>
              <Button
                variant={filter === 'expense' ? 'default' : 'outline'}
                onClick={() => setFilter('expense')}
                size="sm"
                className="gap-2"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Despesas
              </Button>
              <Button
                variant={filter === 'transfer' ? 'default' : 'outline'}
                onClick={() => setFilter('transfer')}
                size="sm"
                className="gap-2"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Transferências
              </Button>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por conta, descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {Object.entries(groupedByDate).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma movimentação encontrada</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => {
              const parsedDate = parseISO(date);
              const dateFormatted = format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-foreground capitalize">
                        {dateFormatted}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
                      </p>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="grid gap-3">
                    <AnimatePresence>
                      {entries.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <Card className="hover:shadow-lg transition-shadow duration-200">
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-4">
                                <div className="mt-1">
                                  {getTypeIcon(entry.type)}
                                </div>

                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-semibold text-foreground uppercase text-sm">
                                        {entry.accountName}
                                      </p>
                                      <p className="text-foreground mt-1">
                                        {entry.description}
                                      </p>
                                      {entry.observation && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {entry.observation}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl">
                                        {formatAmount(entry.amount, entry.type)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getTypeBadge(entry.type)}
                                    {getStatusBadge(entry.status)}
                                    {entry.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {entry.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
