'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGroup } from '@/context/GroupContext'
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Settings, 
  Check, 
  Layers, 
  Sparkles,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react'

interface GroupSwitcherProps {
  onOpenCreateGroup?: () => void
  onOpenEditGroup?: () => void
  className?: string
  compact?: boolean
}

export function GroupSwitcher({
  onOpenCreateGroup,
  onOpenEditGroup,
  className = '',
  compact = false
}: GroupSwitcherProps) {
  const { 
    groups, 
    currentGroup, 
    switchGroup, 
    loading, 
    setIsEntrySelectionActive 
  } = useGroup()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading && !currentGroup) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 animate-pulse text-xs text-zinc-400 ${className}`}>
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
        <span>Carregando ambientes...</span>
      </div>
    )
  }

  const activeColor = currentGroup?.color || '#3b82f6'

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          isOpen 
            ? 'bg-zinc-800 border-zinc-600 shadow-md' 
            : 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 hover:border-zinc-700'
        }`}
        style={{
          borderLeftWidth: '3.5px',
          borderLeftColor: activeColor
        }}
        title={`Ambiente atual: ${currentGroup?.name || 'Pessoal'}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: activeColor }}
          />
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 leading-none">
              Ambiente
            </span>
            <span className="text-xs font-medium text-zinc-100 truncate max-w-[130px] sm:max-w-[160px] leading-tight">
              {currentGroup?.name || 'Grupo Pessoal'}
            </span>
          </div>
        </div>

        <ChevronDown 
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-zinc-200' : 'group-hover:text-zinc-300'
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-2 z-50 overflow-hidden backdrop-blur-xl"
          >
            {/* Header info */}
            <div className="px-3.5 py-2 border-b border-zinc-800/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Grupos de Gerenciamento
                </p>
                <p className="text-[10px] text-zinc-500">
                  {groups.length} {groups.length === 1 ? 'ambiente isolado' : 'ambientes isolados'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setIsEntrySelectionActive(true)
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-[11px] flex items-center gap-1 transition-colors"
                title="Abrir tela de seleção de grupos"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Alternar</span>
              </button>
            </div>

            {/* List of groups */}
            <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {groups.map((group) => {
                const isSelected = group.id === currentGroup?.id
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      switchGroup(group.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-zinc-800/70 text-zinc-100 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/40 hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: group.color || '#3b82f6' }}
                      />
                      <div className="min-w-0 flex flex-col">
                        <span className="truncate text-zinc-100 font-medium">
                          {group.name}
                        </span>
                        {group.description && (
                          <span className="truncate text-[10px] text-zinc-400">
                            {group.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {group.role && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider font-medium">
                          {group.role === 'owner' ? 'Dono' : group.role}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer Actions */}
            <div className="pt-1.5 mt-1 border-t border-zinc-800/80 px-2 flex flex-col gap-0.5">
              {onOpenEditGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onOpenEditGroup()
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Configurar este ambiente</span>
                </button>
              )}

              {onOpenCreateGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onOpenCreateGroup()
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criar novo ambiente financeiro</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
