'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGroup } from '@/context/GroupContext'
import { ManagementGroup, PRESET_GROUP_COLORS } from '@/types/group'
import { 
  X, 
  Check, 
  FolderPlus, 
  FolderPen, 
  Trash2, 
  Archive, 
  AlertTriangle, 
  ShieldCheck,
  Palette
} from 'lucide-react'

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  groupToEdit?: ManagementGroup | null
}

export function GroupModal({ isOpen, onClose, groupToEdit }: GroupModalProps) {
  const { createGroup, updateGroup, deleteGroup, archiveGroup, groups } = useGroup()

  const isEditing = Boolean(groupToEdit)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#10b981')
  const [customColor, setCustomColor] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name)
      setDescription(groupToEdit.description || '')
      setColor(groupToEdit.color || '#10b981')
      setCustomColor(groupToEdit.color || '#10b981')
    } else {
      setName('')
      setDescription('')
      // Pick a preset color that isn't already heavily used
      const usedColors = new Set(groups.map(g => g.color))
      const availablePreset = PRESET_GROUP_COLORS.find(p => !usedColors.has(p.hex)) || PRESET_GROUP_COLORS[0]
      setColor(availablePreset.hex)
      setCustomColor(availablePreset.hex)
    }
    setError(null)
    setShowDeleteConfirm(false)
    setShowCustomInput(false)
  }, [groupToEdit, isOpen, groups])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Por favor, informe o nome do grupo.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      if (isEditing && groupToEdit) {
        await updateGroup(groupToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color: color
        })
      } else {
        await createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          color: color
        })
      }

      onClose()
    } catch (err: any) {
      console.error('Error saving group:', err)
      setError(err?.message || 'Falha ao salvar grupo. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (force: boolean = false) => {
    if (!groupToEdit) return
    try {
      setIsSubmitting(true)
      setError(null)
      await deleteGroup(groupToEdit.id, force)
      onClose()
    } catch (err: any) {
      console.error('Error deleting group:', err)
      setError(err?.message || 'Falha ao excluir grupo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!groupToEdit) return
    try {
      setIsSubmitting(true)
      setError(null)
      await archiveGroup(groupToEdit.id)
      onClose()
    } catch (err: any) {
      console.error('Error archiving group:', err)
      setError(err?.message || 'Falha ao arquivar grupo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between"
          style={{ borderTopWidth: '4px', borderTopColor: color }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-inner"
              style={{ backgroundColor: color }}
            >
              {isEditing ? <FolderPen className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {isEditing ? 'Configurações do Ambiente' : 'Novo Ambiente Financeiro'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isEditing ? 'Edite dados de identificação e cor do grupo' : 'Crie um espaço 100% isolado para suas finanças'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do Grupo / Ambiente <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Pessoal, Empresa, Chácara, Família Silva..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              required
              autoFocus
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Descrição ou Finalidade (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Controle de despesas da residência e receitas de consultoria"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Color Palette Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Cor de Identificação Visual e Google Calendar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_GROUP_COLORS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.hex.toLowerCase()
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      setColor(preset.hex)
                      setCustomColor(preset.hex)
                    }}
                    title={preset.name}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'ring-2 ring-white scale-105 shadow-md' 
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                  </button>
                )
              })}
            </div>

            {/* Custom HEX option */}
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowCustomInput(prev => !prev)}
                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 underline decoration-zinc-700 underline-offset-2"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{showCustomInput ? 'Ocultar cor customizada' : 'Informar cor customizada'}</span>
              </button>
              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{color.toUpperCase()}</span>
              </div>
            </div>

            {showCustomInput && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value)
                    setCustomColor(e.target.value)
                  }}
                  className="w-10 h-9 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      setColor(e.target.value)
                    }
                  }}
                  placeholder="#10B981"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-100 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  maxLength={7}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900"
              style={{ backgroundColor: color }}
            >
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Grupo'}
            </button>
          </div>

          {/* Danger Zone for Editing */}
          {isEditing && groupToEdit && (
            <div className="mt-4 pt-4 border-t border-zinc-800/70">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Opções do Ambiente</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Arquivar ambiente e ocultá-lo da listagem"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Arquivar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(prev => !prev)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>

              {showDeleteConfirm && (
                <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <p className="font-semibold text-rose-200">
                    Atenção: A exclusão só é permitida se o grupo não possuir dados financeiros vinculados.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Se este ambiente já possui movimentações ou cobranças, recomendamos utilizar o botão <strong>Arquivar</strong> para manter o histórico seguro.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[11px]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] transition-colors"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </div>
  )
}
