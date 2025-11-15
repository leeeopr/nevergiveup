import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Category, FinancialData, CategoryType } from "@/types/financial";
import { loadFinancialData, saveFinancialData } from "@/lib/googleSheets";

export default function Categorias() {
const [data, setData] = useState<FinancialData>({ 
  accounts: [], revenues: [], expenses: [], transfers: [], categories: [], settings: {} 
});

useEffect(() => {
  const fetchData = async () => {
    const financialData = await loadFinancialData();
    setData(financialData);
  };
  fetchData();
}, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    type: "Despesa",
    name: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const category: Category = {
      id: editingCategory?.id || `cat_${Date.now()}`,
      type: formData.type!,
      name: formData.name!,
      description: formData.description!,
    };

    const newData = { ...data };
    if (editingCategory) {
      const index = newData.categories.findIndex(c => c.id === category.id);
      if (index !== -1) {
        newData.categories[index] = category;
      }
      toast.success("Categoria atualizada com sucesso");
    } else {
      newData.categories.push(category);
      toast.success("Categoria adicionada com sucesso");
    }

    saveFinancialData(newData);
    setData(newData);
    setIsDialogOpen(false);
    setEditingCategory(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta categoria?")) {
      const newData = { ...data };
      newData.categories = newData.categories.filter(c => c.id !== id);
      saveFinancialData(newData);
      setData(newData);
      toast.success("Categoria excluída com sucesso");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData(category);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: "Despesa",
      name: "",
      description: "",
    });
  };

  const revenueCategories = data.categories.filter(c => c.type === "Receita");
  const expenseCategories = data.categories.filter(c => c.type === "Despesa");

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground mt-1">Organize suas receitas e despesas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: CategoryType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Marketing, Vendas, Aluguel..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição da categoria"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategory ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-success">Categorias de Receita</h3>
          <div className="space-y-2">
            {revenueCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20 hover:bg-success/10 transition-colors">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-destructive">Categorias de Despesa</h3>
          <div className="space-y-2">
            {expenseCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(category)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
