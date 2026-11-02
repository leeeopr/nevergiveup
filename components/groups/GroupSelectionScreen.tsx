'use client'

import React, { useState } from 'react'
import { motion } from 'motion/react'
import { useGroup } from '@/context/GroupContext'
import { ManagementGroup } from '@/types/group'
import { 
  Building2, 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  FolderPlus,
  Compass,
  Briefcase,
  Home,
  Layers
} from 'lucide-react'

interface GroupSelectionScreenProps {
  onOpenCreateGroup: () => void
}

export function GroupSelectionScreen({ onOpenCreateGroup }: GroupSelectionScreenProps) {
  const { groups, currentGroup, switchGroup, setIsEntrySelectionActive } = useGroup()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelectGroup = (groupId: string) => {
    switchGroup(groupId)
    setIsEntrySelectionActive(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl py-12 px-4 flex flex-col items-center">
        {/* Header Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Ambientes Financeiros Isolados</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
            Escolha o ambiente de trabalho
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Cada grupo possui suas próprias movimentações, cobranças, clientes e projeções com isolamento completo de dados.
          </p>
        </motion.div>

        {/* Groups Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {groups.map((group, index) => {
            const isSelected = group.id === currentGroup?.id
            const isHovered = hoveredId === group.id
            const groupColor = group.color || '#3b82f6'

            return (
              <motion.button
                key={group.id}
                type="button"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                onMouseEnter={() => setHoveredId(group.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelectGroup(group.id)}
                className={`relative group flex flex-col justify-between p-5 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'bg-zinc-900 border-zinc-700 shadow-xl ring-2'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 shadow-lg'
                }`}
                style={{
                  ringColor: isSelected ? groupColor : 'transparent'
                }}
              >
                {/* Accent top color bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-200"
                  style={{ backgroundColor: groupColor }}
                />

                <div>
                  <div className="flex items-center justify-between mb-3 pt-1">
                    <span 
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: groupColor }}
                    />
                    {group.role && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-750">
                        {group.role === 'owner' ? 'Proprietário' : group.role}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
                    {group.name}
                  </h3>

                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                    {group.description || 'Ambiente financeiro independente com métricas e conciliação dedicada.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {isSelected ? 'Ambiente Atual' : 'Acessar este grupo'}
                  </span>
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:translate-x-1"
                    style={{ backgroundColor: `${groupColor}20`, color: groupColor }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            )
          })}

          {/* New Group Card button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: groups.length * 0.05 }}
            onClick={onOpenCreateGroup}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 transition-all duration-200 min-h-[170px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">Criar Novo Grupo</span>
            <span className="text-xs text-zinc-500 mt-0.5 text-center">
              Adicione outra empresa, imóvel, projeto ou finança familiar
            </span>
          </motion.button>
        </div>

        {/* Quick action: Stay with current */}
        {currentGroup && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEntrySelectionActive(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 underline-offset-4 transition-colors"
            >
              Continuar trabalhando em &quot;{currentGroup.name}&quot;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
