'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FileText, DollarSign, Tag, Award, HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { StructuralExpense, StructuralExpenseCategory, StructuralExpensePriority } from '@/types/structural'

interface StructuralExpenseFormData {
  title: string
  amount: number
  category: StructuralExpenseCategory
  recurrence: string
  priority: StructuralExpensePriority
  description: string
}

interface StructuralExpenseFormProps {
  onCancel?: () => void
  onSuccess: () => void
  initialData?: Partial<StructuralExpense>
  id?: string
  addExpense: (expense: Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<any>
  updateExpense: (id: string, updates: Partial<Omit<StructuralExpense, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => Promise<any>
  formId?: string
  hideFooter?: boolean
  onLoadingChange?: (loading: boolean) => void
}

const CATEGORY_OPTIONS: { value: StructuralExpenseCategory; label: string }[] = [
  { value: 'aluguel', label: 'Aluguel & Moradia' },
  { value: 'saude', label: 'Saúde & Convênio' },
  { value: 'academia', label: 'Academia & Bem-estar' },
  { value: 'internet', label: 'Internet & Telefone' },
  { value: 'energia', label: 'Energia, Água & Gás' },
  { value: 'assinaturas', label: 'Streaming & Assinaturas' },
  { value: 'seguro', label: 'Seguros & Proteção' },
  { value: 'transporte', label: 'Transporte & Mobilidade' },
  { value: 'alimentacao', label: 'Alimentação & Mercado' },
  { value: 'medicamentos', label: 'Farmácia & Remédios' },
  { value: 'financiamento', label: 'Financiamentos & Parcelas' },
  { value: 'educacao', label: 'Educação, Faculdade & Cursos' },
  { value: 'impostos', label: 'Impostos, IPTU & IPVA' },
  { value: 'outros', label: 'Outros Custos Estruturais' }
]

const PRIORITY_OPTIONS: { value: StructuralExpensePriority; label: string; color: string }[] = [
  { value: 'baixa', label: 'Contornável (Baixa Preservação)', color: 'text-amber-400 border-amber-400/20' },
  { value: 'media', label: 'Importante / Médio Prazo', color: 'text-orange-400 border-orange-400/20' },
  { value: 'alta', label: 'Sobrevivência / Vital / Alta', color: 'text-rose-400 border-rose-400/20' }
]

export function StructuralExpenseForm({
  onCancel,
  onSuccess,
  initialData,
  id,
  addExpense,
  updateExpense,
  formId = 'structural-expense-form',
  hideFooter = false,
  onLoadingChange
}: StructuralExpenseFormProps) {
  const [loading, setLoading] = useState(false)

  const setInternalLoading = (val: boolean) => {
    setLoading(val)
    onLoadingChange?.(val)
  }

  const { register, handleSubmit, formState: { errors } } = useForm<StructuralExpenseFormData>({
    defaultValues: {
      title: initialData?.title || '',
      amount: initialData?.amount || undefined,
      category: initialData?.category || 'outros',
      recurrence: initialData?.recurrence || 'mensal',
      priority: initialData?.priority || 'media',
      description: initialData?.description || ''
    }
  })

  const onSubmit = async (data: StructuralExpenseFormData) => {
    try {
      setInternalLoading(true)
      const payload = {
        title: data.title,
        amount: Number(data.amount),
        category: data.category,
        recurrence: data.recurrence,
        priority: data.priority,
        description: data.description || ''
      }

      if (id) {
        await updateExpense(id, payload)
      } else {
        await addExpense(payload)
      }
      onSuccess()
    } catch (error: any) {
      console.error('Save failed details:', error)
      alert(`Erro ao salvar: ${error.message || 'Verifique sua conexão.'}`)
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Amount Input - Main Focus */}
      <div className="relative group">
        <label className="text-[10px] sm:text-[11px] font-black text-zinc-650 dark:text-silver-brushed/60 uppercase tracking-[0.3em] mb-3 block ml-1">
          Custo Mensal Estimado
        </label>
        <div className="flex items-center gap-3 text-4xl sm:text-6xl font-black text-[var(--text-main)] tracking-tighter">
          <span className="text-zinc-500 dark:text-silver-brushed/30 text-2xl select-none font-bold">R$</span>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            autoFocus
            className="w-full bg-transparent border-none focus:ring-0 p-0 placeholder:text-zinc-400 dark:placeholder:text-silver-brushed/20 font-black text-[var(--text-main)]"
            {...register('amount', { required: true, min: 0.01 })}
          />
        </div>
        {errors.amount && (
          <p className="text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px] uppercase font-black tracking-widest mt-2 ml-1">
            Valor Mandatório
          </p>
        )}
        <div className="h-px w-full bg-[var(--border)] mt-4 group-focus-within:bg-[var(--text-muted)] transition-colors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em] ml-1">
            <FileText size={12} className="opacity-60 text-[var(--text-muted)]" /> Identificador / Título
          </label>
          <input
            type="text"
            placeholder="Ex: Aluguel do Apartamento..."
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-zinc-500 dark:placeholder:text-silver-brushed/30 focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner"
            {...register('title', { required: true })}
          />
          {errors.title && (
            <p className="text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px] uppercase font-black tracking-widest mt-1 ml-1">
              Campo Obrigatório
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em] ml-1">
            <Tag size={12} className="opacity-60 text-[var(--text-muted)]" /> Categoria Estrutural
          </label>
          <select
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner appearance-none cursor-pointer"
            {...register('category', { required: true })}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em] ml-1">
            <Award size={12} className="opacity-60 text-[var(--text-muted)]" /> Nível de Sobrevivência (Prioridade)
          </label>
          <select
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner appearance-none cursor-pointer"
            {...register('priority', { required: true })}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence (fixed periodic value) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em] ml-1">
            <HelpCircle size={12} className="opacity-60 text-[var(--text-muted)]" /> Periodicidade
          </label>
          <select
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner appearance-none cursor-pointer"
            {...register('recurrence', { required: true })}
          >
            <option value="mensal" className="bg-[var(--surface)] text-[var(--text-main)]">Mensal (Sustentação Direta)</option>
            <option value="anual" className="bg-[var(--surface)] text-[var(--text-main)]">Anual (Fracionado)</option>
          </select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-zinc-600 dark:text-silver-brushed/60 uppercase tracking-[0.2em] ml-1">
            <FileText size={12} className="opacity-60 text-[var(--text-muted)]" /> Notas de Configuração / Detalhes
          </label>
          <textarea
            placeholder="Detalhes opcionais sobre o vencimento, reajuste ou especificidades do contrato..."
            rows={2}
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-zinc-500 dark:placeholder:text-silver-brushed/30 focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner"
            {...register('description')}
          />
        </div>
      </div>

      {/* Footer Actions */}
      {!hideFooter && (
        <div className="flex gap-4 pt-6 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-xl border border-[var(--border)] text-zinc-600 dark:text-silver-brushed/60 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--surface-accent)]/30 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            Retornar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-white dark:text-silver-polished font-black uppercase tracking-[0.22em] text-[10px] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-60" /> Registrar Custo Vital</>}
          </button>
        </div>
      )}
    </form>
  )
}
