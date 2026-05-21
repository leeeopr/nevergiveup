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
        <label className="text-[8px] font-black text-silver-brushed/20 uppercase tracking-[0.4em] mb-3 block ml-1">
          Custo Mensal Estimado
        </label>
        <div className="flex items-center gap-3 text-4xl sm:text-6xl font-black text-silver-polished tracking-tighter">
          <span className="text-silver-brushed/10 text-2xl select-none">R$</span>
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            autoFocus
            className="w-full bg-transparent border-none focus:ring-0 p-0 placeholder:text-silver-brushed/5 text-silver-polished"
            {...register('amount', { required: true, min: 0.01 })}
          />
        </div>
        {errors.amount && (
          <p className="text-rose-400 text-[9px] uppercase font-black tracking-widest mt-2 ml-1">
            Valor Mandatório
          </p>
        )}
        <div className="h-px w-full bg-silver-brushed/10 mt-4 group-focus-within:bg-silver-brushed/30 transition-colors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.3em] ml-1">
            <FileText size={10} className="opacity-40" /> Identificador / Título
          </label>
          <input
            type="text"
            placeholder="Ex: Aluguel do Apartamento..."
            className="w-full bg-black/20 silver-border rounded-xl p-4 text-silver-polished placeholder:text-silver-brushed/10 focus:border-silver-brushed/30 focus:ring-0 transition-all text-sm font-medium shadow-inner"
            {...register('title', { required: true })}
          />
          {errors.title && (
            <p className="text-rose-400 text-[9px] uppercase font-black tracking-widest mt-1 ml-1">
              Campo Obrigatório
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.3em] ml-1">
            <Tag size={10} className="opacity-40" /> Categoria Estrutural
          </label>
          <select
            className="w-full bg-black/20 silver-border rounded-xl p-4 text-silver-polished focus:border-silver-brushed/30 focus:ring-0 transition-all text-sm font-medium shadow-inner appearance-none"
            {...register('category', { required: true })}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-velvet-deep text-silver-polished">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.3em] ml-1">
            <Award size={10} className="opacity-40" /> Nível de Sobrevivência (Prioridade)
          </label>
          <select
            className="w-full bg-black/20 silver-border rounded-xl p-4 text-silver-polished focus:border-silver-brushed/30 focus:ring-0 transition-all text-sm font-medium shadow-inner appearance-none"
            {...register('priority', { required: true })}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-velvet-deep text-silver-polished">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence (fixed periodic value) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.3em] ml-1">
            <HelpCircle size={10} className="opacity-40" /> Periodicidade
          </label>
          <select
            className="w-full bg-black/20 silver-border rounded-xl p-4 text-silver-polished focus:border-silver-brushed/30 focus:ring-0 transition-all text-sm font-medium shadow-inner appearance-none"
            {...register('recurrence', { required: true })}
          >
            <option value="mensal" className="bg-velvet-deep text-silver-polished">Mensal (Sustentação Direta)</option>
            <option value="anual" className="bg-velvet-deep text-silver-polished">Anual (Fracionado)</option>
          </select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-2">
          <label className="flex items-center gap-2 text-[8px] font-black text-silver-brushed/30 uppercase tracking-[0.3em] ml-1">
            <FileText size={10} className="opacity-40" /> Notas de Configuração / Detalhes
          </label>
          <textarea
            placeholder="Detalhes opcionais sobre o vencimento, reajuste ou especificidades do contrato..."
            rows={2}
            className="w-full bg-black/20 silver-border rounded-xl p-4 text-silver-polished placeholder:text-silver-brushed/10 focus:border-silver-brushed/30 focus:ring-0 transition-all text-sm font-medium shadow-inner"
            {...register('description')}
          />
        </div>
      </div>

      {/* Footer Actions */}
      {!hideFooter && (
        <div className="flex gap-4 pt-6 border-t border-silver-brushed/5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-xl border border-silver-brushed/10 text-silver-brushed/30 font-black uppercase tracking-[0.3em] text-[9px] hover:bg-white/5 transition-all active:scale-95 silver-border"
          >
            Retornar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-silver-polished font-black uppercase tracking-[0.4em] text-[9px] hover:scale-[1.02] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-40" /> Registrar Custo Vital</>}
          </button>
        </div>
      )}
    </form>
  )
}
