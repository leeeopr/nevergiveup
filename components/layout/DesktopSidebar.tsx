'use client'

import React from 'react'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Layers, 
  History, 
  Calendar, 
  PlusCircle, 
  LogOut, 
  Database, 
  Wifi, 
  WifiOff, 
  Lock, 
  Sun, 
  Moon,
  Activity,
  Building2,
  Settings
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

export type NavigationTab = 'metrics' | 'projection' | 'structural' | 'progression' | 'movements' | 'calendar' | 'empresa'

interface DesktopSidebarProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
  onNewMovementClick: () => void
}

export function DesktopSidebar({ activeTab, onTabChange, onNewMovementClick }: DesktopSidebarProps) {
  const { user, profile, signOut, isDbConnected, isOffline, toggleEmpresaMode } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<any>; badge?: string }[] = [
    { id: 'metrics', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'projection', label: 'Projeção Financeira', icon: TrendingUp },
    { id: 'structural', label: 'Custos Fixos', icon: Layers },
    { id: 'progression', label: 'Extrato Diário', icon: Activity },
    { id: 'movements', label: 'Histórico & Auditoria', icon: History },
    { id: 'calendar', label: 'Google Calendar', icon: Calendar, badge: 'Sync' },
  ]

  // Add Empresa tab ONLY if empresa_enabled is true
  if (profile?.empresa_enabled) {
    navItems.push({ id: 'empresa', label: 'Empresa & Recibos', icon: Building2, badge: 'B2B' })
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-silver-brushed/10 bg-velvet-soft/80 backdrop-blur-2xl h-screen sticky top-0 p-6 z-40 justify-between selection:bg-silver-brushed selection:text-velvet-deep">
      {/* Top Branding Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3.5 pb-5 border-b border-silver-brushed/10">
          <div className="w-11 h-11 bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-emerald-500/20 border border-silver-brushed/20 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Lock className="text-silver-polished" size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-silver-polished uppercase truncate">
                FINANCEIRO
              </h1>
              <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-silver-brushed/50 font-bold tracking-wider uppercase mt-0.5">
              Desktop Executivo
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onNewMovementClick}
          className="w-full py-3.5 px-4 bg-silver-brushed hover:bg-white text-velvet-deep font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer min-h-[44px]"
        >
          <PlusCircle size={18} />
          <span>Nova Movimentação</span>
        </button>

        {/* Navigation Menu Links */}
        <nav className="space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-silver-brushed/40 px-3 block mb-2">
            Módulos Principais
          </span>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-silver-brushed text-velvet-deep shadow-md font-black translate-x-1'
                    : 'text-silver-brushed/70 hover:text-silver-polished hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-velvet-deep' : 'text-silver-brushed/50'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isActive 
                      ? 'bg-velvet-deep/10 text-velvet-deep border-velvet-deep/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          {!profile?.empresa_enabled && (
            <button
              onClick={() => {
                toggleEmpresaMode(true)
                onTabChange('empresa')
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[11px] font-bold text-silver-brushed/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer border border-dashed border-silver-brushed/20 hover:border-emerald-500/30 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-emerald-400/70" />
                <span>+ Ativar Modo Empresa</span>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="space-y-4 pt-5 border-t border-silver-brushed/10">
        {/* Connection Health Pills */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded-xl border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
            isDbConnected 
              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' 
              : 'bg-rose-500/5 text-rose-400 border-rose-500/10'
          }`}>
            <Database size={11} className="shrink-0" />
            <span className="truncate">{isDbConnected ? 'DB On' : 'DB Off'}</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${
            !isOffline 
              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' 
              : 'bg-amber-500/5 text-amber-400 border-amber-500/10'
          }`}>
            {!isOffline ? <Wifi size={11} className="shrink-0" /> : <WifiOff size={11} className="shrink-0" />}
            <span className="truncate">{!isOffline ? 'Rede On' : 'Offline'}</span>
          </div>
        </div>

        {/* User Profile Info Card */}
        {user && (
          <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase tracking-widest text-silver-brushed/40 block">
                Usuário Conectado
              </span>
              <p className="text-xs font-bold text-silver-polished truncate mt-0.5" title={user.email}>
                {user.email}
              </p>
            </div>
            
            <button
              onClick={signOut}
              className="p-2 text-silver-brushed/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Sair da Conta"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full py-2.5 px-3 bg-silver-brushed/10 hover:bg-silver-brushed/20 border border-silver-brushed/20 text-silver-polished rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[38px]"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={14} className="text-amber-400" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-indigo-400" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
