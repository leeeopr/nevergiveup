'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, ArrowDownLeft, Wallet, Coffee, Shield, CreditCard, HandCoins, Sparkles, Loader2 } from 'lucide-react'
import { MovementType } from '@/types/financial'
import { MovementForm } from './MovementForm'
import { useAuth } from '@/context/AuthContext'
import { DialogShell } from '../ui/DialogShell'

interface ActionOption {
  type: MovementType
  label: string
  icon: React.ReactNode
  color: string
}

const ACTION_OPTIONS: ActionOption[] = [
  { type: 'entrada', label: 'Entrada', icon: <ArrowDownLeft size={24} />, color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10' },
  { type: 'saida_fixa', label: 'Saída Fixa', icon: <Wallet size={24} />, color: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-400/10' },
  { type: 'gasto_diario', label: 'Gasto Diário', icon: <Coffee size={24} />, color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-400/10' },
  { type: 'economia', label: 'Economia', icon: <Shield size={24} />, color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-400/10' },
  { type: 'cartao', label: 'Cartão', icon: <CreditCard size={24} />, color: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-400/10' },
  { type: 'cobranca', label: 'Cobrança', icon: <HandCoins size={24} />, color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-400/10' },
]

export interface FloatingActionButtonProps {
  onRefresh: () => void
  activeTab: 'metrics' | 'movements' | 'progression' | 'structural'
  onAddStructuralExpense?: () => void
  isInline?: boolean
}

export function FloatingActionButton({ onRefresh, activeTab, onAddStructuralExpense, isInline = false }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MovementType | null>(null)
  const [saving, setSaving] = useState(false)
  const { hasPermission, loading, isIdentityResolved, user } = useAuth()

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => setSelectedType(null), 300)
  }

  const handleSuccess = () => {
    onRefresh()
    handleClose()
  }

  // Hydration Safety:
  // 1. If still performing initial auth check, don't render.
  if (loading && !isIdentityResolved) return null
  
  // Explicit Permissions Check (hasPermission handles fallback if isIdentityResolved is false but user is present)
  if (isIdentityResolved && !user) return null

  // Ensure absolute multi-user separation & read-only enforcement:
  // If the active user has a viewer-only role and doesn't possess movements:create,
  // we do not render any creation FAB on any tab.
  if (!hasPermission('movements:create')) return null

  const handleFabClick = () => {
    if (activeTab === 'structural') {
      if (onAddStructuralExpense) {
        onAddStructuralExpense()
      }
    } else {
      setIsOpen(true)
    }
  }

  const getTooltipText = () => {
    if (activeTab === 'structural') {
      return 'Registrar Novo Custo Fixo'
    }
    return 'Registrar Nova Movimentação'
  }

  const header = (
    <div className="flex justify-between items-center mb-6 sm:mb-8">
      <div className="space-y-0.5 mt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-silver-brushed/40 mb-1">Registro Patrimonial</p>
        <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tighter capitalize">
          {selectedType ? `Protocolo: ${selectedType.replace('_', ' ')}` : 'Operações'}
        </h3>
      </div>
      <button 
        onClick={handleClose}
        className="p-3 bg-[var(--surface-accent)]/80 dark:bg-silver-brushed/5 rounded-xl text-zinc-600 dark:text-silver-brushed/40 hover:text-[var(--text-main)] dark:hover:text-white transition-all border border-[var(--border)] mt-2"
      >
        <X size={18} />
      </button>
    </div>
  )

  const footer = selectedType ? (
    <div className="flex gap-4 pt-6 border-t border-[var(--border)] bg-[var(--surface)]">
      <button 
        type="button"
        onClick={() => setSelectedType(null)}
        className="flex-1 py-4 px-6 rounded-xl border border-[var(--border)] text-zinc-650 dark:text-silver-brushed/50 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--surface-accent)]/40 transition-all active:scale-95 bg-[var(--surface)]"
      >
        Retornar
      </button>
      <button 
        form="create-movement-form"
        type="submit"
        disabled={saving}
        className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-white dark:text-silver-polished font-black uppercase tracking-[0.22em] text-[10px] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-60" /> Validar Registro</>}
      </button>
    </div>
  ) : null

  if (isInline) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFabClick}
          title={getTooltipText()}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-[16px] bg-[#111827] dark:bg-wood-teak border border-zinc-800 dark:border-white/20 shadow-lg flex items-center justify-center text-white dark:text-silver-polished relative overflow-hidden group shrink-0 mx-1.5 self-center cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-black/30 pointer-events-none" />
          <Plus size={20} className="group-hover:text-white transition-colors" strokeWidth={2.5} />
        </motion.button>

        <DialogShell 
          isOpen={isOpen} 
          onClose={handleClose}
          header={header}
          footer={footer}
        >
          {!selectedType ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {ACTION_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedType(opt.type)}
                  className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] bg-slate-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-silver-brushed/5 transition-all hover:bg-slate-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-silver-brushed/20 aspect-square text-center gap-4 sm:gap-6 shadow-xl group cursor-pointer"
                >
                  <div className={`p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-[var(--border)] bg-[var(--surface-accent)]/20 dark:bg-velvet-deep/50 transform group-hover:rotate-6 transition-transform ${opt.color}`}>
                    {opt.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-650 dark:text-silver-brushed/50 group-hover:text-[var(--text-main)] transition-colors text-center w-full">
                    {opt.label}
                  </span>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="px-0 sm:px-2">
              <MovementForm 
                formId="create-movement-form"
                hideFooter={true}
                onLoadingChange={setSaving}
                type={selectedType} 
                onCancel={() => setSelectedType(null)} 
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </DialogShell>
      </>
    )
  }

  return (
    <>
      {/* FAB Button - Wood and Silver Instrument */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFabClick}
          title={getTooltipText()}
          className="w-16 h-16 rounded-2xl bg-[#111827] dark:bg-wood-teak border border-zinc-800 dark:border-white/20 shadow-2xl flex items-center justify-center text-white dark:text-silver-polished relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/20 pointer-events-none" />
          <Plus size={28} strokeWidth={2.5} className="group-hover:text-white transition-colors" />
        </motion.button>
      </div>

      <DialogShell 
        isOpen={isOpen} 
        onClose={handleClose}
        header={header}
        footer={footer}
      >
        {!selectedType ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {ACTION_OPTIONS.map((opt) => (
              <motion.button
                key={opt.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedType(opt.type)}
                className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] bg-slate-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-silver-brushed/5 transition-all hover:bg-slate-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-silver-brushed/20 aspect-square text-center gap-4 sm:gap-6 shadow-xl group cursor-pointer"
              >
                <div className={`p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-[var(--border)] bg-[var(--surface-accent)]/20 dark:bg-velvet-deep/50 transform group-hover:rotate-6 transition-transform ${opt.color}`}>
                  {opt.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-650 dark:text-silver-brushed/50 group-hover:text-[var(--text-main)] transition-colors text-center w-full">
                  {opt.label}
                </span>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="px-0 sm:px-2">
            <MovementForm 
              formId="create-movement-form"
              hideFooter={true}
              onLoadingChange={setSaving}
              type={selectedType} 
              onCancel={() => setSelectedType(null)} 
              onSuccess={handleSuccess}
            />
          </div>
        )}
      </DialogShell>
    </>
  )
}


