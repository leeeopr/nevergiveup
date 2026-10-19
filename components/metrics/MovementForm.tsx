'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { MovementType, FinancialMovement, RecurrenceType } from '@/types/financial'
import { financialService } from '@/services/financialService'
import { personalDebtsService } from '@/services/personalDebtsService'
import { DebtPerson } from '@/types/personalDebts'
import { 
  Calendar, 
  Tag, 
  FileText, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  RefreshCcw,
  User,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  X
} from 'lucide-react'
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
  debt_person_id?: string | null
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
  const [persons, setPersons] = useState<DebtPerson[]>([])
  const [loadingPersons, setLoadingPersons] = useState(false)
  const [searchPerson, setSearchPerson] = useState('')
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonPhone, setNewPersonPhone] = useState('')
  const [savingNewPerson, setSavingNewPerson] = useState(false)
  
  const setInternalLoading = (val: boolean) => {
    setLoading(val)
    onLoadingChange?.(val)
  }

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<MovementFormData>({
    defaultValues: {
      amount: initialData?.amount || 0,
      description: initialData?.description || '',
      date: initialData?.date || new Date().toISOString().split('T')[0],
      tag: initialData?.tag || (type === 'cobranca' ? 'Cobrança' : ''),
      is_recurring: initialData?.is_recurring ?? (type === 'saida_fixa' || type === 'entrada' || type === 'cobranca'),
      recurrence_type: initialData?.recurrence_type || 'mensal',
      recurrence_interval: initialData?.recurrence_interval || 1,
      recurrence_end_date: initialData?.recurrence_end_date || '',
      card_name: initialData?.card_name || '',
      installments: initialData?.installments || 1,
      debtor_name: initialData?.debtor_name || '',
      debt_person_id: initialData?.debt_person_id || null,
      due_date: initialData?.due_date || initialData?.date || new Date().toISOString().split('T')[0],
      is_paid: initialData?.is_paid || false
    }
  })

  // Synchronize form when editing different movements or when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        amount: initialData.amount || 0,
        description: initialData.description || '',
        date: initialData.date || new Date().toISOString().split('T')[0],
        tag: initialData.tag || (type === 'cobranca' ? 'Cobrança' : ''),
        is_recurring: initialData.is_recurring ?? (type === 'saida_fixa' || type === 'entrada' || type === 'cobranca'),
        recurrence_type: initialData.recurrence_type || 'mensal',
        recurrence_interval: initialData.recurrence_interval || 1,
        recurrence_end_date: initialData.recurrence_end_date || '',
        card_name: initialData.card_name || '',
        installments: initialData.installments || 1,
        debtor_name: initialData.debtor_name || '',
        debt_person_id: initialData.debt_person_id || null,
        due_date: initialData.due_date || initialData.date || new Date().toISOString().split('T')[0],
        is_paid: initialData.is_paid || false
      })
    }
  }, [initialData, id, type, reset])

  const isRecurring = watch('is_recurring')
  const recurrenceType = watch('recurrence_type')
  const debtorName = watch('debtor_name')
  const debtPersonId = watch('debt_person_id')

  // Load registered persons from Cobrança tab
  useEffect(() => {
    if (type === 'cobranca') {
      let isMounted = true
      setLoadingPersons(true)
      personalDebtsService.getPersons()
        .then((data) => {
          if (isMounted) {
            setPersons(data)
            // Pre-select if initialData exists
            if (initialData?.debt_person_id) {
              const matched = data.find(p => p.id === initialData.debt_person_id)
              if (matched) {
                setValue('debt_person_id', matched.id, { shouldValidate: true })
                setValue('debtor_name', matched.name, { shouldValidate: true })
              }
            } else if (initialData?.debtor_name) {
              const matchedByName = data.find(p => p.name.toLowerCase() === initialData.debtor_name?.toLowerCase())
              if (matchedByName) {
                setValue('debt_person_id', matchedByName.id, { shouldValidate: true })
              }
            }
          }
        })
        .catch(err => console.warn('Failed to load persons in MovementForm:', err))
        .finally(() => {
          if (isMounted) setLoadingPersons(false)
        })
      return () => { isMounted = false }
    }
  }, [type, initialData, setValue])

  const selectedPerson = useMemo(() => {
    if (!debtPersonId && !debtorName) return null
    return persons.find(p => p.id === debtPersonId) || (debtorName ? persons.find(p => p.name.toLowerCase() === debtorName.toLowerCase()) : null) || null
  }, [persons, debtPersonId, debtorName])

  const filteredPersons = useMemo(() => {
    if (!searchPerson.trim()) return persons
    const q = searchPerson.toLowerCase()
    return persons.filter(p => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)))
  }, [persons, searchPerson])

  const handleCreateNewPerson = async () => {
    if (!newPersonName.trim()) return
    setSavingNewPerson(true)
    try {
      const created = await personalDebtsService.createPerson({
        name: newPersonName.trim(),
        phone: newPersonPhone.trim() || undefined
      })
      setPersons(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setValue('debt_person_id', created.id, { shouldValidate: true })
      setValue('debtor_name', created.name, { shouldValidate: true })
      setIsAddingNewPerson(false)
      setNewPersonName('')
      setNewPersonPhone('')
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar pessoa.')
    } finally {
      setSavingNewPerson(false)
    }
  }

  const onSubmit = async (data: MovementFormData) => {
    try {
      setInternalLoading(true)

      let resolvedPersonId = data.debt_person_id || null
      let resolvedDebtorName = data.debtor_name?.trim() || ''

      if (type === 'cobranca') {
        // Ensure person link exists and resolve by name if needed
        if (!resolvedPersonId && resolvedDebtorName) {
          const matched = persons.find(p => p.name.toLowerCase() === resolvedDebtorName.toLowerCase())
          if (matched) {
            resolvedPersonId = matched.id
            resolvedDebtorName = matched.name
          }
        }

        if (!resolvedPersonId && !resolvedDebtorName) {
          alert('Por favor, selecione ou cadastre uma pessoa na aba Cobrança para vincular a esta cobrança.')
          setInternalLoading(false)
          return
        }
      }

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
        payload.debt_person_id = resolvedPersonId
        payload.debtor_name = resolvedDebtorName
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

        {/* Specialized Fields: Cobrança vinculada às pessoas da aba Cobrança */}
        {type === 'cobranca' && (
          <div className="sm:col-span-2 space-y-6 pt-4 border-t border-[var(--border)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black text-[var(--orange)] uppercase tracking-[0.2em] ml-1">
                  <User size={14} /> Devedor / Pessoa Vinculada *
                </label>
                {!isAddingNewPerson && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPersonName(searchPerson.trim())
                      setIsAddingNewPerson(true)
                    }}
                    className="text-[10px] font-black uppercase text-[var(--orange)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle size={12} />
                    <span>+ Nova Pessoa</span>
                  </button>
                )}
              </div>

              {/* Se estiver adicionando pessoa inline */}
              {isAddingNewPerson ? (
                <div className="p-4 bg-[var(--surface-accent)]/30 border border-[var(--orange)]/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus size={14} className="text-[var(--orange)]" />
                      Cadastrar Pessoa na Aba Cobrança
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewPerson(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome completo..."
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      className="px-3.5 py-2.5 bg-black/20 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--orange)]"
                    />
                    <input
                      type="text"
                      placeholder="Telefone / WhatsApp (opcional)..."
                      value={newPersonPhone}
                      onChange={(e) => setNewPersonPhone(e.target.value)}
                      className="px-3.5 py-2.5 bg-black/20 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 focus:outline-none focus:border-[var(--orange)]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewPerson(false)}
                      className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={savingNewPerson || !newPersonName.trim()}
                      onClick={handleCreateNewPerson}
                      className="px-4 py-1.5 bg-[var(--orange)] text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {savingNewPerson ? 'Salvando...' : 'Salvar e Selecionar'}
                    </button>
                  </div>
                </div>
              ) : selectedPerson ? (
                /* Card da pessoa selecionada */
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0">
                      {selectedPerson.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-[var(--text-main)] block truncate">
                        {selectedPerson.name}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={11} />
                        Vinculado à pessoa da aba Cobrança {selectedPerson.phone ? `• ${selectedPerson.phone}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('debt_person_id', null)
                      setValue('debtor_name', '')
                    }}
                    className="px-3 py-1.5 bg-[var(--surface-accent)]/50 hover:bg-[var(--surface-accent)] text-[var(--text-main)] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0 border border-[var(--border)]"
                  >
                    Trocar
                  </button>
                </div>
              ) : debtorName ? (
                /* Caso tenha nome de devedor anterior não vinculado */
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[var(--text-main)] block truncate">
                      {debtorName}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                      <AlertCircle size={11} />
                      Nome informado, porém não vinculado a uma pessoa da aba Cobrança
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setNewPersonName(debtorName)
                        setIsAddingNewPerson(true)
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-[var(--orange)] text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-center"
                    >
                      Cadastrar Pessoa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('debt_person_id', null)
                        setValue('debtor_name', '')
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-[var(--surface-accent)]/50 hover:bg-[var(--surface-accent)] text-[var(--text-main)] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center border border-[var(--border)]"
                    >
                      Trocar
                    </button>
                  </div>
                </div>
              ) : (
                /* Lista e Busca de Pessoas da Aba Cobrança */
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]/50" />
                    <input
                      type="text"
                      placeholder="Pesquisar pessoa cadastrada por nome..."
                      value={searchPerson}
                      onChange={(e) => setSearchPerson(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--orange)] transition-colors"
                    />
                  </div>

                  {loadingPersons ? (
                    <div className="py-4 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin text-[var(--orange)]" />
                      <span>Carregando pessoas da aba Cobrança...</span>
                    </div>
                  ) : filteredPersons.length === 0 ? (
                    <div className="p-4 bg-black/15 border border-[var(--border)] rounded-2xl text-center space-y-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        {persons.length === 0
                          ? 'Nenhuma pessoa cadastrada na aba Cobrança ainda.'
                          : 'Nenhuma pessoa encontrada com esse termo de busca.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPersonName(searchPerson.trim())
                          setIsAddingNewPerson(true)
                        }}
                        className="px-4 py-2 bg-[var(--orange)]/15 border border-[var(--orange)]/30 text-[var(--orange)] rounded-xl text-xs font-bold hover:bg-[var(--orange)]/25 transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <PlusCircle size={13} />
                        <span>Cadastrar &ldquo;{searchPerson.trim() || 'Nova Pessoa'}&rdquo;</span>
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                      {filteredPersons.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setValue('debt_person_id', p.id, { shouldValidate: true })
                            setValue('debtor_name', p.name, { shouldValidate: true })
                            setSearchPerson('')
                          }}
                          className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-accent)]/20 hover:bg-[var(--orange)]/10 border border-[var(--border)] hover:border-[var(--orange)]/30 rounded-xl transition-all cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] group-hover:bg-[var(--orange)]/20 text-[var(--text-main)] group-hover:text-[var(--orange)] border border-[var(--border)] flex items-center justify-center font-black text-[11px] shrink-0">
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[var(--text-main)] block truncate group-hover:text-[var(--orange)]">
                                {p.name}
                              </span>
                              {p.phone && (
                                <span className="text-[10px] text-[var(--text-muted)] block truncate">
                                  {p.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)] group-hover:text-[var(--orange)] shrink-0 ml-2">
                            Selecionar →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hidden inputs to preserve react-hook-form bindings */}
                  <input type="hidden" {...register('debt_person_id')} />
                  <input type="hidden" {...register('debtor_name', { required: type === 'cobranca' })} />
                  {errors.debtor_name && (
                    <p className="text-[var(--danger)] text-[10px] uppercase font-black tracking-widest mt-1 ml-1">
                      Por favor, selecione ou cadastre uma pessoa para esta cobrança.
                    </p>
                  )}
                </div>
              )}
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
                <label className="text-[10px] sm:text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1 text-center block">Situação</label>
                <label className="flex items-center justify-center gap-3 cursor-pointer p-4 bg-[var(--surface-accent)]/35 border border-[var(--border)] rounded-xl group h-[54px] relative">
                  <input type="checkbox" className="sr-only peer" {...register('is_paid')} />
                  <div className="w-10 h-6 bg-[var(--surface-accent)]/45 border border-[var(--border)] rounded-full peer peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500/40 transition-all relative shrink-0">
                    <div className="w-4 h-4 bg-[var(--text-muted)] rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-emerald-400 absolute left-1 top-1" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] transition-colors peer-checked:text-emerald-400 text-amber-400">
                    {watch('is_paid') ? 'Recebido' : 'Pendente'}
                  </span>
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
