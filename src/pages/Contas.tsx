import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ArrowRight, Building2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Account, Transfer, FinancialData } from "@/types/financial";
import { loadFinancialData, addAccount, updateAccount, deleteAccount, addTransfer, deleteTransfer, saveFinancialData } from "@/lib/googleSheets";

export default function Contas() {
const [data, setData] = useState<FinancialData>({ 
  accounts: [], revenues: [], expenses: [], transfers: [], categories: [], settings: { notificationEmail: '', startDate: '' } 
});

useEffect(() => {
  const fetchData = async () => {
    const financialData = await loadFinancialData();
    setData(financialData);
  };
  fetchData();
}, []);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [accountFormData, setAccountFormData] = useState<Partial<Account>>({
    name: "",
    initialBalance: 0,
    color: "hsl(217, 91%, 60%)",
  });

  const [transferFormData, setTransferFormData] = useState<Partial<Transfer>>({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: 0,
    fromAccountId: "",
    toAccountId: "",
  });

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountFormData.name || accountFormData.initialBalance === undefined) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const account: Account = {
      id: editingAccount?.id || `acc_${Date.now()}`,
      name: accountFormData.name!,
      initialBalance: accountFormData.initialBalance!,
      color: accountFormData.color!,
    };

    if (editingAccount) {
      updateAccount(account.id, account);
      toast.success("Conta atualizada com sucesso");
    } else {
      addAccount(account);
      toast.success("Conta adicionada com sucesso");
    }

    const newData = await loadFinancialData();
    setData(newData);
    setIsAccountDialogOpen(false);
    setEditingAccount(null);
    resetAccountForm();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferFormData.fromAccountId || !transferFormData.toAccountId || transferFormData.amount === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      toast.error("As contas de origem e destino devem ser diferentes");
      return;
    }

    const transfer: Transfer = {
      id: `trans_${Date.now()}`,
      date: transferFormData.date!,
      description: transferFormData.description!,
      amount: transferFormData.amount!,
      fromAccountId: transferFormData.fromAccountId!,
      toAccountId: transferFormData.toAccountId!,
    };

    addTransfer(transfer);
    toast.success("Transferência registrada com sucesso");

    const newData = await loadFinancialData();
    setData(newData);
    setIsTransferDialogOpen(false);
    resetTransferForm();
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm("Deseja realmente excluir esta conta?")) {
      deleteAccount(id);
      const newData = await loadFinancialData();
      setData(newData);
      toast.success("Conta excluída com sucesso");
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (confirm("Deseja realmente excluir esta transferência?")) {
      deleteTransfer(id);
      const newData = await loadFinancialData();
      setData(newData);
      toast.success("Transferência excluída com sucesso");
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData(account);
    setIsAccountDialogOpen(true);
  };

  const resetAccountForm = () => {
    setAccountFormData({
      name: "",
      initialBalance: 0,
      color: "hsl(217, 91%, 60%)",
    });
  };

  const resetTransferForm = () => {
    setTransferFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      amount: 0,
      fromAccountId: "",
      toAccountId: "",
    });
  };

  const calculateAccountBalance = (accountId: string) => {
    const account = data.accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;

    // Adicionar receitas recebidas
    data.revenues
      .filter(r => r.accountId === accountId && r.status === "Recebido")
      .forEach(r => balance += r.amount);

    // Subtrair despesas pagas
    data.expenses
      .filter(e => e.accountId === accountId && e.status === "Pago")
      .forEach(e => balance -= e.amount);

    // Subtrair transferências de saída
    data.transfers
      .filter(t => t.fromAccountId === accountId)
      .forEach(t => balance -= t.amount);

    // Adicionar transferências de entrada
    data.transfers
      .filter(t => t.toAccountId === accountId)
      .forEach(t => balance += t.amount);

    return balance;
  };

  const colorPresets = [
    { name: "Azul", value: "hsl(217, 91%, 60%)" },
    { name: "Verde", value: "hsl(142, 71%, 45%)" },
    { name: "Amarelo", value: "hsl(38, 92%, 50%)" },
    { name: "Roxo", value: "hsl(271, 76%, 53%)" },
    { name: "Vermelho", value: "hsl(0, 84%, 60%)" },
    { name: "Rosa", value: "hsl(330, 81%, 60%)" },
  ];

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas contas e transferências</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTransferDialogOpen} onOpenChange={(open) => {
            setIsTransferDialogOpen(open);
            if (!open) resetTransferForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Nova Transferência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transferência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transferFormData.date}
                      onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={transferFormData.amount}
                      onChange={(e) => setTransferFormData({ ...transferFormData, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={transferFormData.description}
                    onChange={(e) => setTransferFormData({ ...transferFormData, description: e.target.value })}
                    placeholder="Ex: Transferência para poupança"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from">Conta Origem</Label>
                    <Select
                      value={transferFormData.fromAccountId}
                      onValueChange={(value) => setTransferFormData({ ...transferFormData, fromAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">Conta Destino</Label>
                    <Select
                      value={transferFormData.toAccountId}
                      onValueChange={(value) => setTransferFormData({ ...transferFormData, toAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Registrar Transferência
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAccountDialogOpen} onOpenChange={(open) => {
            setIsAccountDialogOpen(open);
            if (!open) {
              setEditingAccount(null);
              resetAccountForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                    placeholder="Ex: Conta Principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Saldo Inicial (R$)</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    value={accountFormData.initialBalance}
                    onChange={(e) => setAccountFormData({ ...accountFormData, initialBalance: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Select
                    value={accountFormData.color}
                    onValueChange={(value) => setAccountFormData({ ...accountFormData, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorPresets.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }}></div>
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAccount ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.accounts.map((account) => {
          const balance = calculateAccountBalance(account.id);
          return (
            <Card key={account.id} className="p-4" style={{ borderLeft: `4px solid ${account.color}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{account.name}</p>
                  <p className="text-2xl font-bold mt-1">
                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditAccount(account)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo inicial: R$ {account.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="text-xl font-semibold">Transferências</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Data</th>
                <th className="p-4 text-left text-sm font-medium">Descrição</th>
                <th className="p-4 text-left text-sm font-medium">Conta Origem</th>
                <th className="p-4 text-left text-sm font-medium">Conta Destino</th>
                <th className="p-4 text-right text-sm font-medium">Valor</th>
                <th className="p-4 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhuma transferência registrada
                  </td>
                </tr>
              ) : (
                data.transfers.map((transfer) => {
                  const fromAccount = data.accounts.find(a => a.id === transfer.fromAccountId);
                  const toAccount = data.accounts.find(a => a.id === transfer.toAccountId);
                  return (
                    <tr key={transfer.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm">
                        {new Date(transfer.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm">{transfer.description || "-"}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: fromAccount?.color }}></div>
                          {fromAccount?.name}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: toAccount?.color }}></div>
                          {toAccount?.name}
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm font-medium">
                        R$ {transfer.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTransfer(transfer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
