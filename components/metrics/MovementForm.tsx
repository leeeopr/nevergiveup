'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MovementType, FinancialMovement, RecurrenceType } from '@/types/financial'
import { financialService } from '@/services/financialService'
import { Calendar, Tag, FileText, ChevronRight, Loader2, Sparkles, RefreshCcw } from 'lucide-react'
import { motion } from 'motion/react'

interface MovementFormData {
  amount: number
  description: string
  date: string
  tag: string
  is_recurring: boolean
  recurrence_type?: RecurrenceType
  recurrence_interval?: number
  recurrence_end_date?: string
  card_name?: string
  installments?: number
  savings_type?: string
  debtor_name?: string
  due_date?: string
  is_paid?: boolean
}

interface MovementFormProps {
  type: MovementType
  onCancel: () => void
  onSuccess: () => void
  initialData?: Partial<FinancialMovement>
  id?: string
  formId?: string
  hideFooter?: boolean
  onLoadingChange?: (loading: boolean) => void
}

const QUICK_PEOPLE = ['Pai', 'Mãe', 'Laura', 'Lucas', 'Thiago']

export function MovementForm({ 
  type, 
  onCancel, 
  onSuccess, 
  initialData, 
  id, 
  formId = 'movement-form',
  hideFooter = false,
  onLoadingChange
}: MovementFormProps) {
  const [loading, setLoading] = useState(false)
  
  const setInternalLoading = (val: boolean) => {
    setLoading(val)
    onLoadingChange?.(val)
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<MovementFormData>({
    defaultValues: {
      amount: initialData?.amount || 0,
      description: initialData?.description || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      tag: initialData?.tag || '',
      is_recurring: initialData?.is_recurring ?? (type === 'saida_fixa' || type === 'entrada' || type === 'cobranca'),
      recurrence_type: initialData?.recurrence_type || 'mensal',
      recurrence_interval: initialData?.recurrence_interval || 1,
      recurrence_end_date: initialData?.recurrence_end_date || '',
      card_name: initialData?.card_name || '',
      installments: initialData?.installments || 1,
      debtor_name: initialData?.debtor_name || '',
      due_date: initialData?.due_date || initialData?.date || new Date().toISOString().split('T')[0],
      is_paid: initialData?.is_paid || false
    }
  })

  const isRecurring = watch('is_recurring')
  const recurrenceType = watch('recurrence_type')
  const debtorName = watch('debtor_name')

  const onSubmit = async (data: MovementFormData) => {
    try {
      setInternalLoading(true)
      const payload: any = {
        type,
        amount: Number(data.amount),
        description: data.description,
        date: data.date,
        tag: data.tag,
        is_recurring: data.is_recurring,
        recurrence_type: data.is_recurring ? data.recurrence_type : undefined,
        recurrence_interval: data.is_recurring ? Number(data.recurrence_interval) : undefined,
        recurrence_end_date: data.is_recurring && data.recurrence_end_date ? data.recurrence_end_date : undefined,
        card_name: data.card_name,
        installments: data.installments,
      }

      if (type === 'cobranca') {
        payload.debtor_name = data.debtor_name
        payload.due_date = data.due_date
        payload.is_paid = data.is_paid
        if (data.is_paid && !initialData?.is_paid) {
          payload.paid_at = new Date().toISOString()
        }
      }

      if (id) {
        await financialService.updateMovement(id, payload)
      } else {
        await financialService.insertMovement(payload)
      }
      onSuccess()
    } catch (error: any) {
      let displayMessage = error.message
      try {
        const parsed = JSON.parse(error.message)
        displayMessage = parsed.message || error.message
      } catch (e) {
        // Not a JSON error, keep original message
      }

      console.error('Save failed details:', error)
      alert(`Erro ao salvar: ${displayMessage || 'Verifique sua conexão ou se você está logado.'}`)
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Amount Input - Main Focus */}
      <div className="relative group">
        <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-3 block ml-1">
          Montante Nominal
        </label>
        <div className="flex items-center gap-3 text-4xl sm:text-6xl font-black text-[var(--text-main)] tracking-tighter">
          <span className="text-[var(--text-muted)]/60 text-2xl select-none font-bold">R$</span>
          <input 
            type="number" 
            step="0.01"
            placeholder="0,00"
            autoFocus
            className="w-full bg-transparent border-none focus:ring-0 p-0 placeholder:text-[var(--text-muted)]/40 font-black text-[var(--text-main)]"
            {...register('amount', { required: true, min: 0.01 })}
          />
        </div>
        {errors.amount && <p className="text-[var(--danger)] text-[10px] sm:text-[11px] uppercase font-black tracking-widest mt-2 ml-1">Valor Mandatório</p>}
        <div className="h-px w-full bg-[var(--border)] mt-4 group-focus-within:bg-[var(--text-muted)] transition-colors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
            <FileText size={12} className="opacity-60 text-[var(--text-muted)]" /> Descritivo
          </label>
          <input 
            type="text"
            placeholder="Ex: Alocação de Ativos..."
            className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner"
            {...register('description', { required: true })}
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
            <Calendar size={12} className="opacity-60 text-[var(--text-muted)]" /> Data
          </label>
          <input 
            type="date"
            className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner"
            {...register('date', { required: true })}
          />
        </div>

        {/* Tag */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
            <Tag size={12} className="opacity-60 text-[var(--text-muted)]" /> Classificação
          </label>
          <input 
            type="text"
            placeholder="Ex: Patrimonial..."
            className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--text-muted)] focus:ring-0 transition-all text-sm font-semibold shadow-inner"
            {...register('tag')}
          />
        </div>

        {/* Specialized Fields: Cobrança */}
        {type === 'cobranca' && (
          <div className="sm:col-span-2 space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--orange)] uppercase tracking-[0.2em] ml-1">
                Devedor Principal
              </label>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_PEOPLE.map(person => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => setValue('debtor_name', person)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                      debtorName === person 
                        ? 'bg-[var(--orange)]/15 text-[var(--orange)] border-[var(--orange)]/40' 
                        : 'bg-[var(--surface-accent)]/20 text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-accent)]/45'
                    }`}
                  >
                    {person}
                  </button>
                ))}
              </div>

              <input 
                type="text"
                placeholder="Nome do Devedor..."
                className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 text-sm font-semibold"
                {...register('debtor_name', { required: type === 'cobranca' })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Vencimento</label>
                <input 
                  type="date"
                  className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] text-sm font-semibold"
                  {...register('due_date')}
                />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1 text-center block">Status</label>
                <label className="flex items-center justify-center gap-3 cursor-pointer p-4 bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl border-dashed border-[var(--border)] group h-[54px] relative">
                  <input type="checkbox" className="sr-only peer" {...register('is_paid')} />
                  <div className="w-10 h-6 bg-[var(--surface-accent)]/45 border border-[var(--border)] rounded-full peer peer-checked:bg-[var(--orange)]/15 peer-checked:border-[var(--orange)]/40 transition-all relative" />
                  <div className="absolute left-[20px] top-[19px] w-4 h-4 bg-[var(--text-muted)] rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-[var(--orange)] pointer-events-none" />
                  <span className="text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors uppercase tracking-[0.2em]">PAGO?</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Fields: Credit Card */}
        {type === 'cartao' && (
          <div className="flex gap-4 sm:col-span-1">
            <div className="space-y-2 flex-[2]">
              <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Emissor</label>
              <input 
                type="text"
                placeholder="Ex: Platinum X..."
                className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 text-sm font-semibold"
                {...register('card_name')}
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Ciclo</label>
              <input 
                type="number"
                min="1"
                className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] text-sm font-semibold"
                {...register('installments')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recurrence System */}
      <div className="space-y-4 pt-3 border-t border-[var(--border)] relative">
        <label className="flex items-center gap-3 cursor-pointer group w-fit relative">
          <div className="relative w-10 h-6">
            <input type="checkbox" className="sr-only peer" {...register('is_recurring')} />
            <div className="w-10 h-6 bg-[var(--surface-accent)]/45 border border-[var(--border)] rounded-full peer peer-checked:bg-[var(--success)]/15 peer-checked:border-[var(--success)]/40 transition-all" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-[var(--text-muted)] rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-[var(--success)] pointer-events-none" />
          </div>
          <span className="text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors uppercase tracking-[0.2em]">
            Habilitar Recorrência?
          </span>
        </label>

        {isRecurring && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-l-2 border-[var(--border)] pl-5 py-1"
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">
                <RefreshCcw size={12} className="opacity-60 text-[var(--text-muted)]" /> Período
              </label>
              <select 
                className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest focus:border-[var(--text-muted)] focus:ring-0 transition-all appearance-none cursor-pointer"
                {...register('recurrence_type')}
              >
                <option value="diaria" className="bg-[var(--surface)] text-[var(--text-main)]">DIÁRIA</option>
                <option value="semanal" className="bg-[var(--surface)] text-[var(--text-main)]">SEMANAL</option>
                <option value="quinzenal" className="bg-[var(--surface)] text-[var(--text-main)]">QUINZENAL</option>
                <option value="mensal" className="bg-[var(--surface)] text-[var(--text-main)]">MENSAL</option>
                <option value="bimestral" className="bg-[var(--surface)] text-[var(--text-main)]">BIMESTRAL</option>
                <option value="trimestral" className="bg-[var(--surface)] text-[var(--text-main)]">TRIMESTRAL</option>
                <option value="semestral" className="bg-[var(--surface)] text-[var(--text-main)]">SEMESTRAL</option>
                <option value="anual" className="bg-[var(--surface)] text-[var(--text-main)]">ANUAL</option>
                <option value="personalizada" className="bg-[var(--surface)] text-[var(--text-main)]">PERSONALIZADA</option>
              </select>
                   {recurrenceType === 'personalizada' && (
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Dias</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] text-sm font-semibold"
                  {...register('recurrence_interval')}
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Expiração</label>
              <input 
                type="date"
                className="w-full bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl p-4 text-[var(--text-main)] text-sm font-semibold focus:border-[var(--text-muted)] focus:ring-0 transition-all shadow-inner"
                {...register('recurrence_end_date')}
              />
            </div>         </div>
          </motion.div>
        )}
      </div>

      {/* Footer Actions */}
      {!hideFooter && (
        <div className="flex gap-4 pt-6 border-t border-[var(--border)]">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-xl border border-[var(--border)] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--surface-accent)]/30 transition-all active:scale-95 cursor-pointer"
          >
            Retornar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-white font-black uppercase tracking-[0.22em] text-[10px] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-60" /> Validar Registro</>}
          </button>
        </div>
      )}
    </form>
  )
}
