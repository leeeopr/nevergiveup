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
  { type: 'entrada', label: 'Entrada', icon: <ArrowDownLeft size={24} />, color: 'text-emerald-400 bg-emerald-400/10' },
  { type: 'saida_fixa', label: 'Saída Fixa', icon: <Wallet size={24} />, color: 'text-rose-400 bg-rose-400/10' },
  { type: 'gasto_diario', label: 'Gasto Diário', icon: <Coffee size={24} />, color: 'text-amber-400 bg-amber-400/10' },
  { type: 'economia', label: 'Economia', icon: <Shield size={24} />, color: 'text-cyan-400 bg-cyan-400/10' },
  { type: 'cartao', label: 'Cartão', icon: <CreditCard size={24} />, color: 'text-purple-400 bg-purple-400/10' },
  { type: 'cobranca', label: 'Cobrança', icon: <HandCoins size={24} />, color: 'text-orange-400 bg-orange-400/10' },
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
      <div className="space-y-0.5">
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-silver-brushed/20 mb-0.5">Registro Patrimonial</p>
        <h3 className="text-xl sm:text-2xl font-black text-silver-polished tracking-tighter">
          {selectedType ? `Protocolo: ${selectedType.replace('_', ' ')}` : 'Operações'}
        </h3>
      </div>
      <button 
        onClick={handleClose}
        className="p-3 bg-silver-brushed/5 rounded-xl text-silver-brushed/30 hover:text-white transition-all silver-border"
      >
        <X size={18} />
      </button>
    </div>
  )

  const footer = selectedType ? (
    <div className="flex gap-4 pt-6 border-t border-silver-brushed/5 bg-velvet-deep">
      <button 
        type="button"
        onClick={() => setSelectedType(null)}
        className="flex-1 py-4 px-6 rounded-xl border border-silver-brushed/10 text-silver-brushed/30 font-black uppercase tracking-[0.3em] text-[9px] hover:bg-white/5 transition-all active:scale-95 silver-border"
      >
        Retornar
      </button>
      <button 
        form="create-movement-form"
        type="submit"
        disabled={saving}
        className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-silver-polished font-black uppercase tracking-[0.4em] text-[9px] hover:scale-[1.02] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-40" /> Validar Registro</>}
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
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-[16px] bg-wood-teak border border-white/20 shadow-lg flex items-center justify-center text-silver-polished relative overflow-hidden group shrink-0 mx-1.5 self-center cursor-pointer"
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
                  className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] bg-white/[0.02] border border-silver-brushed/5 transition-all hover:bg-white/5 hover:border-silver-brushed/20 aspect-square text-center gap-4 sm:gap-6 shadow-xl group"
                >
                  <div className={`p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] silver-border bg-velvet-deep/50 transform group-hover:rotate-6 transition-transform ${opt.color}`}>
                    {opt.icon}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-silver-brushed/40 group-hover:text-silver-polished transition-colors text-center w-full">
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
          className="w-16 h-16 rounded-2xl bg-wood-teak border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-center text-silver-polished relative overflow-hidden group"
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
                className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] bg-white/[0.02] border border-silver-brushed/5 transition-all hover:bg-white/5 hover:border-silver-brushed/20 aspect-square text-center gap-4 sm:gap-6 shadow-xl group"
              >
                <div className={`p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] silver-border bg-velvet-deep/50 transform group-hover:rotate-6 transition-transform ${opt.color}`}>
                  {opt.icon}
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-silver-brushed/40 group-hover:text-silver-polished transition-colors text-center w-full">
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


