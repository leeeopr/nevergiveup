'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Trash2, Loader2, ShieldAlert, Sparkles } from 'lucide-react'
import { FinancialMovement } from '@/types/financial'
import { MovementForm } from './MovementForm'
import { financialService } from '@/services/financialService'
import { useAuth } from '@/context/AuthContext'
import { DialogShell } from '../ui/DialogShell'

interface EditMovementSheetProps {
  movement: FinancialMovement | null
  onClose: () => void
  onSuccess: () => void
}

export function EditMovementSheet({ movement, onClose, onSuccess }: EditMovementSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const { hasPermission } = useAuth()

  const canUpdate = hasPermission('movements:update')
  const canDelete = hasPermission('movements:delete')

  const handleDelete = async () => {
    if (!movement || !canDelete) return
    try {
      setDeleting(true)
      await financialService.deleteMovement(movement.id)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  const header = (
    <div className="flex justify-between items-center mb-6 sm:mb-8">
      <div className="space-y-0.5 mt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-silver-brushed/40 mb-1">Modificação de Registro</p>
        <div className="flex items-center gap-2">
          <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tighter">Gestão de Auditoria</h3>
          {!canUpdate && <ShieldAlert size={16} className="text-amber-600 dark:text-amber-500/50" />}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 mt-2">
        {canDelete && (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 bg-rose-500/5 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-all border border-rose-500/20 group"
          >
            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        )}
        <button 
          onClick={onClose}
          className="p-3 bg-[var(--surface-accent)]/80 dark:bg-silver-brushed/5 rounded-xl text-zinc-600 dark:text-silver-brushed/40 hover:text-[var(--text-main)] dark:hover:text-white transition-all border border-[var(--border)]"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )

  const footer = canUpdate ? (
    <div className="flex gap-4 pt-6 border-t border-[var(--border)] bg-[var(--surface)]">
      <button 
        type="button"
        onClick={onClose}
        className="flex-1 py-4 px-6 rounded-xl border border-[var(--border)] text-zinc-650 dark:text-silver-brushed/50 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--surface-accent)]/40 transition-all active:scale-95 bg-[var(--surface)]"
      >
        Retornar
      </button>
      <button 
        form="edit-movement-form"
        type="submit"
        disabled={saving}
        className="flex-[2] py-4 px-6 rounded-xl bg-wood-teak text-white dark:text-silver-polished font-black uppercase tracking-[0.22em] text-[10px] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-2 border border-white/10"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} className="opacity-60" /> Validar Alteração</>}
      </button>
    </div>
  ) : null

  return (
    <DialogShell 
      isOpen={!!movement} 
      onClose={onClose}
      header={header}
      footer={footer}
    >
      <div className={!canUpdate ? 'opacity-60 pointer-events-none' : ''}>
        <MovementForm 
          formId="edit-movement-form"
          hideFooter={true}
          onLoadingChange={setSaving}
          id={movement?.id}
          type={movement?.type || 'gasto_diario'} 
          initialData={movement || {}}
          onCancel={onClose} 
          onSuccess={() => {
            onSuccess()
            onClose()
          }}
        />
      </div>
      
      {!canUpdate && (
        <p className="text-[10px] text-zinc-500 dark:text-silver-brushed/40 font-black uppercase tracking-widest text-center mt-6">
          Modo de Visualização Apenas
        </p>
      )}

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-0 bottom-0 top-0 bg-[var(--surface)] z-[100] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] border border-[var(--border)] shadow-[0_45px_110px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-y-auto"
          >
            <div className="p-6 sm:p-8 bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-full mb-6 sm:mb-8 border border-rose-500/20 shadow-lg">
              <Trash2 size={40} strokeWidth={1} className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <h4 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tighter mb-2 sm:mb-3">Expurgo de Dados</h4>
            <p className="text-zinc-655 dark:text-silver-brushed/40 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-10 sm:mb-16 leading-relaxed max-w-[240px] sm:max-w-[280px]">
              Esta remoção é definitiva no ledger local e impactará o patrimônio patrimonial projetado.
            </p>
            
            <div className="flex flex-col w-full gap-3 sm:gap-4 max-w-sm mx-auto">
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-4 sm:py-6 bg-rose-500 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl sm:rounded-3xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-rose-500/20 cursor-pointer"
              >
                {deleting ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Expurgo'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-4 sm:py-6 bg-slate-100/50 dark:bg-white/5 text-zinc-655 dark:text-silver-brushed/40 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl sm:rounded-3xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-[var(--border)] cursor-pointer"
              >
                Retornar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogShell>
  )
}

