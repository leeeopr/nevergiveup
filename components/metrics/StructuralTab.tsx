'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Home, Heart, Dumbbell, Wifi, Zap, CreditCard, Shield, Car, Utensils, Pill, Scale, GraduationCap, FileText, HelpCircle,
  Plus, Edit, Trash2, ShieldCheck, Sparkles, AlertCircle, RefreshCw, Eye
} from 'lucide-react'
import { useStructuralExpenses } from '@/hooks/useStructuralExpenses'
import { StructuralExpense, StructuralExpenseCategory, StructuralExpensePriority } from '@/types/structural'
import { StructuralExpenseForm } from './StructuralExpenseForm'
import { DialogShell } from '../ui/DialogShell'

// Helper maps
const CATEGORY_MAP: Record<StructuralExpenseCategory, { label: string; icon: React.ComponentType<any>; color: string }> = {
  aluguel: { label: 'Aluguel & Moradia', icon: Home, color: 'text-indigo-400 bg-indigo-400/5' },
  saude: { label: 'Saúde & Convênio', icon: Heart, color: 'text-rose-400 bg-rose-400/5' },
  academia: { label: 'Academia & Bem-estar', icon: Dumbbell, color: 'text-cyan-400 bg-cyan-400/5' },
  internet: { label: 'Internet & Telefone', icon: Wifi, color: 'text-sky-400 bg-sky-400/5' },
  energia: { label: 'Energia & Água', icon: Zap, color: 'text-amber-400 bg-amber-400/5' },
  assinaturas: { label: 'Streaming & Assis.', icon: CreditCard, color: 'text-purple-400 bg-purple-400/5' },
  seguro: { label: 'Seguros & Proteção', icon: Shield, color: 'text-teal-400 bg-teal-400/5' },
  transporte: { label: 'Transporte & Mob.', icon: Car, color: 'text-emerald-400 bg-emerald-400/5' },
  alimentacao: { label: 'Alimentação & Mercado', icon: Utensils, color: 'text-orange-400 bg-orange-400/5' },
  medicamentos: { label: 'Farmácia & Remédios', icon: Pill, color: 'text-pink-400 bg-pink-400/5' },
  financiamento: { label: 'Financiamentos', icon: Scale, color: 'text-red-400 bg-red-400/5' },
  educacao: { label: 'Educação', icon: GraduationCap, color: 'text-blue-400 bg-blue-400/5' },
  impostos: { label: 'Impostos & Taxas', icon: FileText, color: 'text-yellow-400 bg-yellow-400/5' },
  outros: { label: 'Outros Custos', icon: HelpCircle, color: 'text-silver-brushed/40 bg-white/5' }
}

const PRIORITY_MAP: Record<StructuralExpensePriority, { label: string; color: string; bg: string }> = {
  baixa: { label: 'Contornável', color: 'text-amber-400/80', bg: 'bg-amber-400/10' },
  media: { label: 'Importante', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  alta: { label: 'Essencial / Vital', color: 'text-rose-400 font-extrabold', bg: 'bg-rose-500/15' }
}

export function StructuralTab({ addTrigger = 0 }: { addTrigger?: number }) {
  const {
    expenses,
    stats,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refresh
  } = useStructuralExpenses()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<StructuralExpense | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (addTrigger > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddOpen(true)
    }
  }, [addTrigger])

  const handleCreateSuccess = () => {
    setIsAddOpen(false)
  }

  const handleEditSuccess = () => {
    setEditingExpense(null)
  }

  // Header of modals/sheets
  const addHeader = (
    <div className="flex justify-between items-center mb-6">
      <div className="space-y-0.5">
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-silver-brushed/20 mb-0.5">Infraestrutura Financeira</p>
        <h3 className="text-xl sm:text-2xl font-black text-silver-polished tracking-tighter">
          Novo Custo Fixo
        </h3>
      </div>
      <button 
        onClick={() => setIsAddOpen(false)}
        className="p-3 bg-silver-brushed/5 rounded-xl text-silver-brushed/30 hover:text-white transition-all silver-border"
      >
        ✕
      </button>
    </div>
  )

  const editHeader = (
    <div className="flex justify-between items-center mb-6">
      <div className="space-y-0.5">
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-silver-brushed/20 mb-0.5">Sustentação de Estrutura</p>
        <h3 className="text-xl sm:text-2xl font-black text-silver-polished tracking-tighter">
          Atualizar Custo Fixo
        </h3>
      </div>
      <button 
        onClick={() => setEditingExpense(null)}
        className="p-3 bg-silver-brushed/5 rounded-xl text-silver-brushed/30 hover:text-white transition-all silver-border"
      >
        ✕
      </button>
    </div>
  )

  const addFooter = (
    <div className="flex gap-4 pt-6 border-t border-silver-brushed/5 bg-velvet-deep">
      <button 
        type="button"
        onClick={() => setIsAddOpen(false)}
        className="flex-1 py-4 px-6 rounded-xl border border-silver-brushed/10 text-silver-brushed/30 font-black uppercase tracking-[0.3em] text-[9px] hover:bg-white/5 transition-all active:scale-95 silver-border"
      >
        Retornar
      </button>
      <button 
        form="create-structural-form"
        type="submit"
        disabled={saving}
        className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-silver-polished font-black uppercase tracking-[0.4em] text-[9px] hover:scale-[1.02] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
      >
        {saving ? <RefreshCw className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-40" /> Registrar Custo Vital</>}
      </button>
    </div>
  )

  const editFooter = (
    <div className="flex gap-4 pt-6 border-t border-silver-brushed/5 bg-velvet-deep">
      <button 
        type="button"
        onClick={() => setEditingExpense(null)}
        className="flex-1 py-4 px-6 rounded-xl border border-silver-brushed/10 text-silver-brushed/30 font-black uppercase tracking-[0.3em] text-[9px] hover:bg-white/5 transition-all active:scale-95 silver-border"
      >
        Retornar
      </button>
      <button 
        form="edit-structural-form"
        type="submit"
        disabled={saving}
        className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-silver-polished font-black uppercase tracking-[0.4em] text-[9px] hover:scale-[1.02] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
      >
        {saving ? <RefreshCw className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-40" /> Salvar Mudança</>}
      </button>
    </div>
  )

  return (
    <div className="space-y-8 w-full max-w-none">
      
      {error && (
        <div className="p-4 sm:p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-4">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-400">Falha na Sincronização do Banco de Dados</h4>
            <p className="text-xs text-silver-brushed/40 leading-relaxed font-semibold">
              {error.message || 'Despesas estruturais não puderam ser sincronizadas com o Supabase. Por favor, verifique suas credenciais nos Secrets do projeto.'}
            </p>
          </div>
        </div>
      )}
      
      {/* SECTION 1 - COMPONENT TITLE & SUBTITLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black text-silver-brushed/40 uppercase tracking-[0.3em]">
            <ShieldCheck size={12} className="text-emerald-400" /> Infraestrutura e Sustentação de Vida
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-silver-polished tracking-tighter">
            Custo Fixo Mensal
          </h2>
          <p className="text-xs text-silver-brushed/30 font-medium max-w-xl">
            Valores vitais e obrigações mensais recorrentes para manter seu estilo de vida atual. Este simulador calcula seu patamar mínimo de rentabilidade recomendada.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-velvet-soft border border-silver-brushed/10 hover:border-silver-brushed/30 text-silver-polished hover:scale-102 transition-all active:scale-98 text-[9px] font-black uppercase tracking-[0.2em] shadow-xl"
        >
          <Plus size={14} /> Adicionar Custo
        </button>
      </div>

      {/* SECTION 2 - CORE ARCHITECTURAL NUMBERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Custo Fixo Estrutural */}
        <div className="bg-velvet-soft border-2 border-silver-brushed/5 rounded-[32px] p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-silver-brushed/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Home size={32} className="text-silver-brushed" />
          </div>
          <div>
            <span className="text-[9px] font-black text-silver-brushed/30 uppercase tracking-[0.3em]">
              Custo Fixo de Vida
            </span>
            <div className="text-3xl sm:text-4xl font-black text-silver-polished mt-3 tracking-tighter tabular-nums flex items-baseline gap-1.5 leading-none">
              <span className="text-base font-bold text-silver-brushed/20">R$</span>
              {stats.structuralCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[10px] text-silver-brushed/30 mt-6 leading-relaxed font-semibold">
            Investimento compulsório mensal bruto para manter suas obrigações ativas.
          </p>
        </div>

        {/* Card 2: Margem de Segurança */}
        <div className="bg-velvet-soft border-2 border-silver-brushed/5 rounded-[32px] p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-silver-brushed/10 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield size={32} className="text-silver-brushed" />
          </div>
          <div>
            <span className="text-[9px] font-black text-silver-brushed/30 uppercase tracking-[0.3em]">
              Reserva de Contingência (30%)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 mt-3 tracking-tighter tabular-nums flex items-baseline gap-1.5 leading-none">
              <span className="text-base font-bold text-amber-500/30">R$</span>
              {stats.emergencyReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[10px] text-silver-brushed/30 mt-6 leading-relaxed font-semibold">
            Proteção recomendada para cobrir sinistros, oscilações rápidas ou imprevistos contrutuais.
          </p>
        </div>

        {/* Card 3: Geração Mensal Recomendada */}
        <div className="bg-wood-teak border-2 border-white/5 rounded-[32px] p-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_20px_40px_rgba(0,0,0,0.4)] flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={32} className="text-silver-polished" />
          </div>
          <div className="relative z-10">
            <span className="text-[9px] font-black text-silver-polished/40 uppercase tracking-[0.3em]">
              Geração Mínima Sugerida
            </span>
            <div className="text-3xl sm:text-4xl font-black text-silver-polished mt-3 tracking-tighter tabular-nums flex items-baseline gap-1.5 leading-none">
              <span className="text-base font-bold text-silver-polished/20">R$</span>
              {stats.recommendedGeneration.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <p className="text-[10px] text-silver-brushed/50 mt-6 leading-relaxed font-semibold relative z-10">
            Metodologia Estrutural: Faturamento mínimo ideal para mitigar pressão psicológica operacional.
          </p>
        </div>
      </div>

      {/* SECTION 3 - DETAILED EXPENDITURES LIST */}
      <div className="executive-card rounded-2xl p-1 shadow-2xl border border-silver-brushed/10 overflow-hidden bg-velvet-soft/30">
        <div className="flex bg-silver-brushed/5 border-b border-silver-brushed/10 text-silver-brushed/30 font-black py-3 px-4">
          <div className="text-[8px] uppercase tracking-[0.3em] font-black">Lista de Sustentação de Vida</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-silver-brushed/40 uppercase font-black tracking-widest text-xs flex items-center justify-center gap-3">
            <RefreshCw className="animate-spin" size={16} /> Consolidador processando...
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle size={36} className="text-silver-brushed/20 mx-auto mb-4" />
            <h4 className="text-base font-black text-silver-polished tracking-tight mb-1">Sem Custos Registrados</h4>
            <p className="text-[11px] text-silver-brushed/30 max-w-xs mx-auto mb-6">
              Nenhuma obrigação recorrente cadastrada. Comece a construir seu patamar de vida agora.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-6 py-2.5 bg-silver-brushed text-velvet-deep font-black uppercase tracking-[0.15em] text-[9px] rounded-lg shadow hover:bg-white transition-all"
            >
              Inserir Primeiro Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-silver-brushed/5">
            {expenses.map((expense) => {
              const categoryConfig = CATEGORY_MAP[expense.category] || CATEGORY_MAP.outros
              const IconComponent = categoryConfig.icon
              const priorityConfig = PRIORITY_MAP[expense.priority] || PRIORITY_MAP.media

              return (
                <div 
                  key={expense.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-white/[0.01] transition-colors group"
                >
                  {/* Left Column: Category and Text */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl silver-border flex items-center justify-center shrink-0 ${categoryConfig.color}`}>
                      <IconComponent size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-silver-polished leading-tight">{expense.title}</span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${priorityConfig.bg} ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-silver-brushed/20">
                          ({expense.recurrence})
                        </span>
                      </div>
                      
                      {expense.description ? (
                        <p className="text-[11px] text-silver-brushed/30 font-medium leading-relaxed max-w-lg">
                          {expense.description}
                        </p>
                      ) : (
                        <span className="text-[9px] italic text-silver-brushed/10">Sem notas adicionais</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-0 border-silver-brushed/5 pt-3 sm:pt-0 shrink-0">
                    <div className="text-right">
                      <span className="text-[9px] text-silver-brushed/20 uppercase tracking-[0.2em] block leading-none mb-1">Custo Mensal</span>
                      <div className="text-lg font-black text-silver-polished tabular-nums tracking-tight">
                        <span className="text-[10px] opacity-20 mr-1 font-bold">R$</span>
                        {Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-2 sm:p-2.5 rounded-lg border border-silver-brushed/5 bg-white/[0.02] hover:bg-white/5 text-silver-brushed/30 hover:text-white transition-all silver-border"
                        title="Editar"
                      >
                        <Edit size={12} />
                      </button>
                      
                      {deleteConfirmId === expense.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-950/20 rounded-lg p-1 border border-rose-500/10 transition-all">
                          <button
                            onClick={() => {
                              deleteExpense(expense.id)
                              setDeleteConfirmId(null)
                            }}
                            className="px-2 py-1 text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 rounded"
                          >
                            Deletar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-[8px] font-black uppercase text-silver-brushed/30 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(expense.id)}
                          className="p-2 sm:p-2.5 rounded-lg border border-silver-brushed/5 bg-white/[0.02] hover:bg-rose-950/10 text-silver-brushed/20 hover:text-rose-400 hover:border-rose-500/20 transition-all silver-border"
                          title="Remover"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL/SHEET FOR ADD EXPENSE */}
      <DialogShell
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        header={addHeader}
        footer={addFooter}
      >
        <StructuralExpenseForm 
          formId="create-structural-form"
          hideFooter={true}
          onLoadingChange={setSaving}
          onSuccess={handleCreateSuccess}
          addExpense={addExpense}
          updateExpense={updateExpense}
        />
      </DialogShell>

      {/* MODAL/SHEET FOR EDIT EXPENSE */}
      <DialogShell
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        header={editHeader}
        footer={editFooter}
      >
        <StructuralExpenseForm 
          formId="edit-structural-form"
          hideFooter={true}
          onLoadingChange={setSaving}
          id={editingExpense?.id}
          initialData={editingExpense || {}}
          onSuccess={handleEditSuccess}
          addExpense={addExpense}
          updateExpense={updateExpense}
        />
      </DialogShell>
    </div>
  )
}
export default StructuralTab;
