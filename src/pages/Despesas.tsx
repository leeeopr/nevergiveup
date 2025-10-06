import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Transaction, FinancialData } from "@/types/financial";
import { loadFinancialData, addExpense, updateExpense, deleteExpense } from "@/lib/storage";

export default function Despesas() {
  const [data, setData] = useState<FinancialData>(loadFinancialData());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "",
    clientOrSupplier: "",
    amount: 0,
    paymentMethod: "Dinheiro",
    installments: 1,
    status: "Em aberto",
  });

  const expenseCategories = data.categories.filter(c => c.type === "Despesa");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.category || formData.amount === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const expense: Transaction = {
      id: editingExpense?.id || `exp_${Date.now()}`,
      date: formData.date!,
      description: formData.description!,
      category: formData.category!,
      clientOrSupplier: formData.clientOrSupplier!,
      amount: formData.amount!,
      paymentMethod: formData.paymentMethod!,
      installments: formData.installments!,
      status: formData.status!,
    };

    if (editingExpense) {
      updateExpense(expense.id, expense);
      toast.success("Despesa atualizada com sucesso");
    } else {
      addExpense(expense);
      toast.success("Despesa adicionada com sucesso");
    }

    setData(loadFinancialData());
    setIsDialogOpen(false);
    setEditingExpense(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta despesa?")) {
      deleteExpense(id);
      setData(loadFinancialData());
      toast.success("Despesa excluída com sucesso");
    }
  };

  const handleEdit = (expense: Transaction) => {
    setEditingExpense(expense);
    setFormData(expense);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      category: "",
      clientOrSupplier: "",
      amount: 0,
      paymentMethod: "Dinheiro",
      installments: 1,
      status: "Em aberto",
    });
  };

  const totalPaid = data.expenses
    .filter(e => e.status === "Pago")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPending = data.expenses
    .filter(e => e.status === "Em aberto")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Despesas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas despesas e saídas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingExpense(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    value={formData.clientOrSupplier}
                    onChange={(e) => setFormData({ ...formData, clientOrSupplier: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment">Método de Pagamento</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Em aberto">Em aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExpense ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="stat-card bg-destructive/10">
          <p className="text-sm text-destructive-foreground/80">Total Pago</p>
          <p className="text-2xl font-bold text-destructive">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card bg-warning/10">
          <p className="text-sm text-warning-foreground/80">A Pagar</p>
          <p className="text-2xl font-bold text-warning">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Data</th>
                <th className="p-4 text-left text-sm font-medium">Descrição</th>
                <th className="p-4 text-left text-sm font-medium">Categoria</th>
                <th className="p-4 text-left text-sm font-medium">Fornecedor</th>
                <th className="p-4 text-left text-sm font-medium">Valor</th>
                <th className="p-4 text-left text-sm font-medium">Status</th>
                <th className="p-4 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...data.expenses]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((expense) => (

                <tr key={expense.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm">
                    {new Date(expense.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-sm">{expense.description}</td>
                  <td className="p-4 text-sm">{expense.category}</td>
                  <td className="p-4 text-sm">{expense.clientOrSupplier}</td>
                  <td className="p-4 text-sm font-medium">
                    R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      expense.status === "Pago" 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
