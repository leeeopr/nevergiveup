"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, Search, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadFinancialData, updateRevenue, updateExpense, deleteRevenue, deleteExpense, deleteTransfer, saveFinancialData } from '@/lib/storage';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type LogType = 'revenue' | 'expense' | 'transfer';
type LogStatus = 'pending' | 'completed' | 'scheduled';

interface LogEntry {
  id: string;
  originalId: string;
  date: string;
  type: LogType;
  accountId: string;
  accountName: string;
  description: string;
  amount: number;
  category?: string;
  status: LogStatus;
  clientOrSupplier?: string;
  balanceBefore: number;
  balanceAfter: number;
  coverageStatus: 'safe' | 'warning' | 'risk' | 'income';
  observation?: string;
  fromAccount?: string;
  toAccount?: string;
  fromAccountId?: string;
  toAccountId?: string;
}

export default function DiarioCronologico() {
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(() => {
    if (typeof window !== "undefined") return loadFinancialData();
    return { revenues: [], expenses: [], transfers: [], accounts: [], categories: [], settings: { notificationEmail: "", startDate: new Date().toISOString().split('T')[0] } };
  });
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => {
        setData(loadFinancialData());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const refreshData = () => {
    setData(loadFinancialData());
  };

  const logs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries: LogEntry[] = [];
    const runningBalances: { [accountId: string]: number } = {};
    
    data.accounts.forEach(acc => {
      if (acc && acc.id) {
        runningBalances[acc.id] = acc.initialBalance || 0;
      }
    });

    const expandedTransactions: any[] = [];

    data.revenues.forEach(rev => {
      if (!rev || !rev.date) return;
      const installments = Math.max(1, rev.installments || 1);
      const amount = rev.amount || 0;
      if (installments <= 1) {
        expandedTransactions.push({ ...rev, originalId: rev.id, type: 'revenue' });
      } else {
        const installmentAmount = amount / installments;
        const baseDate = new Date(rev.date);
        if (isNaN(baseDate.getTime())) return;
        for (let i = 0; i < installments; i++) {
          const instDate = new Date(baseDate);
          instDate.setMonth(instDate.getMonth() + i);
          if (!isNaN(instDate.getTime())) {
            expandedTransactions.push({
              ...rev,
              originalId: rev.id,
              id: `${rev.id}-${i}`,
              date: instDate.toISOString().split('T')[0],
              description: `${rev.description} (${i + 1}/${installments})`,
              amount: installmentAmount,
              type: 'revenue',
            });
          }
        }
      }
    });

    data.expenses.forEach(exp => {
      if (!exp || !exp.date) return;
      const installments = Math.max(1, exp.installments || 1);
      const amount = exp.amount || 0;
      if (installments <= 1) {
        expandedTransactions.push({ ...exp, originalId: exp.id, type: 'expense' });
      } else {
        const installmentAmount = amount / installments;
        const baseDate = new Date(exp.date);
        if (isNaN(baseDate.getTime())) return;
        for (let i = 0; i < installments; i++) {
          const instDate = new Date(baseDate);
          instDate.setMonth(instDate.getMonth() + i);
          if (!isNaN(instDate.getTime())) {
            expandedTransactions.push({
              ...exp,
              originalId: exp.id,
              id: `${exp.id}-${i}`,
              date: instDate.toISOString().split('T')[0],
              description: `${exp.description} (${i + 1}/${installments})`,
              amount: installmentAmount,
              type: 'expense',
            });
          }
        }
      }
    });

    data.transfers.forEach(trans => {
      if (!trans) return;
      expandedTransactions.push({ ...trans, originalId: trans.id, type: 'transfer' });
    });

    expandedTransactions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    expandedTransactions.forEach(t => {
      const account = data.accounts.find(a => a.id === t.accountId);
      const tDate = parseISO(t.date);
      
      let status: LogStatus = 'pending';
      let balanceBefore = runningBalances[t.accountId] || 0;
      let balanceAfter = balanceBefore;
      let coverageStatus: 'safe' | 'warning' | 'risk' | 'income' = 'safe';

      if (t.type === 'revenue') {
        if (t.status === 'Recebido') status = 'completed';
        else if (tDate > today) status = 'scheduled';
        balanceAfter = balanceBefore + t.amount;
        coverageStatus = 'income';
        runningBalances[t.accountId] = balanceAfter;
        entries.push({
          id: `rev-${t.id}`,
          originalId: t.originalId,
          date: t.date,
          type: 'revenue',
          accountId: t.accountId,
          accountName: account?.name || 'Conta desconhecida',
          description: t.description,
          amount: t.amount,
          category: t.category,
          status,
          clientOrSupplier: t.clientOrSupplier,
          balanceBefore,
          balanceAfter,
          coverageStatus,
          observation: t.clientOrSupplier ? `Cliente: ${t.clientOrSupplier}` : undefined,
        });
      } else if (t.type === 'expense') {
        if (t.status === 'Pago') status = 'completed';
        else if (tDate > today) status = 'scheduled';
        balanceAfter = balanceBefore - t.amount;
        if (balanceAfter < 0) coverageStatus = 'risk';
        else if (balanceAfter < balanceBefore * 0.47) coverageStatus = 'warning';
        runningBalances[t.accountId] = balanceAfter;
        entries.push({
          id: `exp-${t.id}`,
          originalId: t.originalId,
          date: t.date,
          type: 'expense',
          accountId: t.accountId,
          accountName: account?.name || 'Conta desconhecida',
          description: t.description,
          amount: t.amount,
          category: t.category,
          status,
          clientOrSupplier: t.clientOrSupplier,
          balanceBefore,
          balanceAfter,
          coverageStatus,
          observation: t.clientOrSupplier ? `Fornecedor: ${t.clientOrSupplier}` : undefined,
        });
      } else if (t.type === 'transfer') {
        const fromAccount = data.accounts.find(a => a.id === t.fromAccountId);
        const toAccount = data.accounts.find(a => a.id === t.toAccountId);
        status = tDate > today ? 'scheduled' : 'completed';
        balanceBefore = runningBalances[t.fromAccountId] || 0;
        balanceAfter = balanceBefore - t.amount;
        runningBalances[t.fromAccountId] = balanceAfter;
        runningBalances[t.toAccountId] = (runningBalances[t.toAccountId] || 0) + t.amount;
        entries.push({
          id: `trans-${t.id}`,
          originalId: t.originalId,
          date: t.date,
          type: 'transfer',
          accountId: t.fromAccountId,
          accountName: fromAccount?.name || 'Conta desconhecida',
          description: t.description,
          amount: t.amount,
          status,
          balanceBefore,
          balanceAfter,
          coverageStatus: 'safe',
          fromAccount: fromAccount?.name,
          toAccount: toAccount?.name,
          fromAccountId: t.fromAccountId,
          toAccountId: t.toAccountId,
          observation: `De ${fromAccount?.name} para ${toAccount?.name}`,
        });
      }
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.type === filter);
    }
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
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case 'revenue': return <ArrowDownCircle className="h-5 w-5 text-success" />;
      case 'expense': return <ArrowUpCircle className="h-5 w-5 text-destructive" />;
      case 'transfer': return <ArrowLeftRight className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case 'completed': return <Badge variant="outline" className="border-success text-success">Concluído</Badge>;
      case 'pending': return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Pendente</Badge>;
      case 'scheduled': return <Badge variant="outline" className="border-warning text-warning">Agendado</Badge>;
    }
  };

  const getCoverageBadge = (coverageStatus: LogEntry['coverageStatus']) => {
    switch (coverageStatus) {
      case 'safe': return <Badge className="bg-success/10 text-success hover:bg-success/20">✓ OK</Badge>;
      case 'warning': return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">⚠ Apertado</Badge>;
      case 'risk': return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">✗ Risco</Badge>;
      case 'income': return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">💰 Receita</Badge>;
    }
  };

  const handleEdit = (entry: LogEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (entry: LogEntry) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;
    try {
      if (entry.type === 'revenue') deleteRevenue(entry.originalId);
      else if (entry.type === 'expense') deleteExpense(entry.originalId);
      else if (entry.type === 'transfer') deleteTransfer(entry.originalId);
      refreshData();
      toast.success('Entrada excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir entrada');
    }
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    try {
      if (editingEntry.type === 'revenue') {
        const rev = data.revenues.find(r => r.id === editingEntry.originalId);
        if (rev) updateRevenue(editingEntry.originalId, {
          ...rev,
          description: editingEntry.description,
          amount: editingEntry.amount,
          category: editingEntry.category || '',
          clientOrSupplier: editingEntry.clientOrSupplier || '',
          date: editingEntry.date,
          accountId: editingEntry.accountId,
        });
      } else if (editingEntry.type === 'expense') {
        const exp = data.expenses.find(e => e.id === editingEntry.originalId);
        if (exp) updateExpense(editingEntry.originalId, {
          ...exp,
          description: editingEntry.description,
          amount: editingEntry.amount,
          category: editingEntry.category || '',
          clientOrSupplier: editingEntry.clientOrSupplier || '',
          date: editingEntry.date,
          accountId: editingEntry.accountId,
        });
      } else if (editingEntry.type === 'transfer') {
        const tr = data.transfers.find(t => t.id === editingEntry.originalId);
        if (tr) {
          const updated = data.transfers.map(t => t.id === editingEntry.originalId ? {
            ...t,
            description: editingEntry.description,
            amount: editingEntry.amount,
            date: editingEntry.date,
            fromAccountId: editingEntry.fromAccountId!,
            toAccountId: editingEntry.toAccountId!,
          } : t);
          saveFinancialData({ ...data, transfers: updated });
        }
      }
      refreshData();
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      toast.success('Entrada atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar entrada');
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diário Cronológico</h1>
          <p className="text-muted-foreground">Todas as movimentações financeiras em ordem cronológica</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Entrada
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} size="sm">Todas</Button>
              <Button variant={filter === 'revenue' ? 'default' : 'outline'} onClick={() => setFilter('revenue')} size="sm" className="gap-2"><ArrowDownCircle className="h-4 w-4" /> Receitas</Button>
              <Button variant={filter === 'expense' ? 'default' : 'outline'} onClick={() => setFilter('expense')} size="sm" className="gap-2"><ArrowUpCircle className="h-4 w-4" /> Despesas</Button>
              <Button variant={filter === 'transfer' ? 'default' : 'outline'} onClick={() => setFilter('transfer')} size="sm" className="gap-2"><ArrowLeftRight className="h-4 w-4" /> Transferências</Button>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por conta, descrição ou categoria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {Object.entries(groupedByDate).length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma movimentação encontrada</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            Object.entries(groupedByDate).map(([date, entries]) => (
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
                    <h2 className="text-lg font-semibold capitalize">{format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
                    <p className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}</p>
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
                              <div className="mt-1">{getTypeIcon(entry.type)}</div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <p className="font-semibold uppercase text-sm">{entry.accountName}</p>
                                    <p className="mt-1">{entry.description}</p>
                                    {entry.observation && <p className="text-xs text-muted-foreground mt-1">{entry.observation}</p>}
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div className={`text-xl font-bold ${entry.type === 'revenue' ? 'text-success' : entry.type === 'expense' ? 'text-destructive' : 'text-blue-500'}`}>
                                      {entry.type === 'expense' ? '-' : entry.type === 'revenue' ? '+' : ''} R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Antes: R$ {entry.balanceBefore.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    <div className={`text-xs font-medium ${entry.balanceAfter < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Após: R$ {entry.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getCoverageBadge(entry.coverageStatus)}
                                    {getStatusBadge(entry.status)}
                                    {entry.category && <Badge variant="secondary" className="text-xs">{entry.category}</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)} className="h-8 w-8 p-0"><Pencil className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(entry)} className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
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
            ))
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={editingEntry.date} onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={editingEntry.description} onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={editingEntry.amount} onChange={(e) => setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              {editingEntry.type !== 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={editingEntry.category} onValueChange={(val) => setEditingEntry({ ...editingEntry, category: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {data.categories.filter(c => c.type === (editingEntry.type === 'revenue' ? 'Receita' : 'Despesa')).map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{editingEntry.type === 'revenue' ? 'Cliente' : 'Fornecedor'}</Label>
                    <Input value={editingEntry.clientOrSupplier || ''} onChange={(e) => setEditingEntry({ ...editingEntry, clientOrSupplier: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select value={editingEntry.accountId} onValueChange={(val) => setEditingEntry({ ...editingEntry, accountId: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {data.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {editingEntry.type === 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label>De (Conta Origem)</Label>
                    <Select value={editingEntry.fromAccountId} onValueChange={(val) => setEditingEntry({ ...editingEntry, fromAccountId: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {data.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Para (Conta Destino)</Label>
                    <Select value={editingEntry.toAccountId} onValueChange={(val) => setEditingEntry({ ...editingEntry, toAccountId: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {data.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
