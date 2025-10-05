import { useState } from "react";
import { Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loadFinancialData, saveFinancialData } from "@/lib/storage";
import { importFromExcel } from "@/lib/excel";

export default function Configuracoes() {
  const [settings, setSettings] = useState(loadFinancialData().settings);

  const handleSave = () => {
    const data = loadFinancialData();
    data.settings = settings;
    saveFinancialData(data);
    toast.success("Configurações salvas com sucesso");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importFromExcel(file);
      saveFinancialData(importedData);
      setSettings(importedData.settings);
      toast.success("Dados importados com sucesso!");
      window.location.reload();
    } catch (error) {
      toast.error("Erro ao importar arquivo");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 p-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Configure as preferências do sistema</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail para Notificações</Label>
          <Input
            id="email"
            type="email"
            value={settings.notificationEmail}
            onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
            placeholder="seu@email.com"
          />
          <p className="text-xs text-muted-foreground">
            Receba alertas sobre contas a vencer e atualizações importantes
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Data de Início</Label>
          <Input
            id="startDate"
            type="date"
            value={settings.startDate}
            onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Data inicial para cálculos e relatórios
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initialBalance">Saldo Inicial (R$)</Label>
          <Input
            id="initialBalance"
            type="number"
            step="0.01"
            value={settings.initialBalance}
            onChange={(e) => setSettings({ ...settings, initialBalance: parseFloat(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Saldo em caixa no início das operações
          </p>
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Importar Dados</h3>
        <p className="text-sm text-muted-foreground">
          Importe uma planilha Excel com dados financeiros. O arquivo deve seguir o formato padrão com as abas: Receitas, Despesas, Categorias e Configurações.
        </p>
        <div className="flex items-center gap-4">
          <Input
            id="import-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button asChild variant="outline" className="gap-2">
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="h-4 w-4" />
              Selecionar Arquivo Excel
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}
