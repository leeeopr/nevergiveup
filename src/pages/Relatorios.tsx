import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadFinancialData } from "@/lib/googleSheets";
import { exportToExcel } from "@/lib/excel";
import { toast } from "sonner";

export default function Relatorios() {
  const handleExportExcel = async () => {
    try {
      const data = await loadFinancialData();
      exportToExcel(data);
      toast.success("Planilha exportada com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar planilha");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Relatórios e Exportação</h1>
        <p className="text-muted-foreground mt-1">Exporte seus dados financeiros</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="stat-card hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportExcel}>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h3 className="font-semibold">Exportar para Excel</h3>
              <p className="text-sm text-muted-foreground">
                Gere uma planilha completa com todas as receitas, despesas e categorias
              </p>
              <Button className="gap-2" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <FileSpreadsheet className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sobre o arquivo Excel</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>O arquivo Excel exportado contém as seguintes abas:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Receitas:</strong> todas as receitas cadastradas com detalhes completos</li>
            <li><strong>Despesas:</strong> todas as despesas cadastradas com detalhes completos</li>
            <li><strong>Categorias:</strong> lista de todas as categorias criadas</li>
            <li><strong>Configurações:</strong> informações gerais do sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
