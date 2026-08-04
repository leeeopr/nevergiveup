'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, CheckCircle2, RefreshCw, LogOut, Bell, Shield, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react'
import { connectGoogleAccount, disconnectGoogleAccount } from '@/lib/firebase'
import { googleCalendarService, GoogleCalendarConnection, CalendarListItem } from '@/services/googleCalendarService'
import { useAuth } from '@/context/AuthContext'
import { FinancialMovement } from '@/types/financial'

interface GoogleCalendarSettingsCardProps {
  movements: FinancialMovement[]
  onRefreshMovements?: () => void
}

export function GoogleCalendarSettingsCard({ movements, onRefreshMovements }: GoogleCalendarSettingsCardProps) {
  const { user } = useAuth()
  const userId = user?.id || 'local-user-id'

  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null)
  const [calendars, setCalendars] = useState<CalendarListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null)

  const reloadConnection = useCallback(async () => {
    try {
      const conn = await googleCalendarService.getConnection(userId)
      setConnection(conn)

      if (conn?.user_id) {
        const calList = await googleCalendarService.fetchUserCalendars(userId)
        setCalendars(calList)
      }
    } catch (err) {
      console.error('Failed to load calendar connection:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      if (isMounted) await reloadConnection()
    }
    run()
    return () => { isMounted = false }
  }, [reloadConnection])

  const handleConnect = async () => {
    setConnecting(true)
    setStatusMessage(null)
    try {
      const result = await connectGoogleAccount()
      if (!result) {
        setStatusMessage({
          type: 'info',
          text: 'Conexão cancelada. Clique em "Conectar Google Calendar" novamente quando desejar autorizar a integração.'
        })
        return
      }

      const newConn: GoogleCalendarConnection = {
        user_id: userId,
        google_email: result.email,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        expires_at: result.expiresAt,
        connection_status: 'CONNECTED',
        selected_calendar_id: 'primary',
        auto_sync: true,
        default_reminder_minutes: 1440
      }

      await googleCalendarService.saveConnection(newConn)
      setConnection(newConn)

      const calList = await googleCalendarService.fetchUserCalendars(userId)
      setCalendars(calList)

      // Auto-sync current movements on connection
      setSyncing(true)
      let syncResultText = ''
      try {
        const syncRes = await googleCalendarService.syncAllMovements(userId, movements)
        syncResultText = ` (${syncRes.syncedCount} ocorrências projetadas para os próximos 12 meses)`
        if (onRefreshMovements) onRefreshMovements()
      } catch (syncErr: any) {
        console.warn('Post-connection auto sync warning:', syncErr)
      } finally {
        setSyncing(false)
      }

      setStatusMessage({
        type: 'success',
        text: `Conta Google (${result.email}) conectada com sucesso!${syncResultText}`
      })
    } catch (err: any) {
      console.error('Failed to connect Google:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao conectar conta Google. Verifique os pop-ups do seu navegador.'
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o Google Calendar? As atualizações futuras não serão mais sincronizadas.')) {
      return
    }

    try {
      await disconnectGoogleAccount()
      await googleCalendarService.deleteConnection(userId)
      setConnection(null)
      setCalendars([])
      setStatusMessage({
        type: 'info',
        text: 'Integração com Google Calendar desconectada.'
      })
    } catch (err: any) {
      console.error('Error disconnecting Google account:', err)
    }
  }

  const handleCalendarChange = async (calendarId: string) => {
    if (!connection) return
    const updated = { ...connection, selected_calendar_id: calendarId }
    setConnection(updated)
    await googleCalendarService.saveConnection(updated)
    setStatusMessage({
      type: 'success',
      text: 'Calendário de destino atualizado.'
    })
  }

  const handleAutoSyncToggle = async () => {
    if (!connection) return
    const updated = { ...connection, auto_sync: !connection.auto_sync }
    setConnection(updated)
    await googleCalendarService.saveConnection(updated)
    setStatusMessage({
      type: 'info',
      text: updated.auto_sync ? 'Sincronização automática ativada.' : 'Sincronização automática desativada.'
    })
  }

  const handleReminderChange = async (minutes: number) => {
    if (!connection) return
    const updated = { ...connection, default_reminder_minutes: minutes }
    setConnection(updated)
    await googleCalendarService.saveConnection(updated)
    setStatusMessage({
      type: 'success',
      text: 'Lembrete padrão atualizado.'
    })
  }

  const handleManualSync = async () => {
    if (!connection) return
    setSyncing(true)
    setStatusMessage(null)

    try {
      const result = await googleCalendarService.syncAllMovements(userId, movements)
      if (onRefreshMovements) onRefreshMovements()

      const parts = []
      if (result.createdCount > 0) parts.push(`${result.createdCount} criados`)
      if (result.updatedCount > 0) parts.push(`${result.updatedCount} atualizados`)
      if (result.deletedCount > 0) parts.push(`${result.deletedCount} removidos`)
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} sem alterações`)

      const detailsStr = parts.length > 0 ? ` (${parts.join(', ')})` : ''

      setStatusMessage({
        type: result.errorCount === 0 ? 'success' : 'info',
        text: `Sincronização idempotente concluída: ${result.syncedCount} ocorrências verificadas/sincronizadas nos próximos 12 meses${detailsStr}.`
      })
    } catch (err: any) {
      console.error('Manual sync error:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Falha durante a sincronização manual.'
      })
      await reloadConnection()
    } finally {
      setSyncing(false)
    }
  }

  const isReconnectRequired = connection?.connection_status === 'RECONNECT_REQUIRED'

  return (
    <div className="bg-velvet-soft/40 border border-silver-brushed/10 rounded-[32px] p-4 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-silver-brushed/10 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-silver-brushed/20 flex items-center justify-center shrink-0">
            <Calendar size={22} className="text-silver-polished" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-silver-polished flex items-center gap-2">
              Google Calendar
              {connection && !isReconnectRequired ? (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado e Ativo
                </span>
              ) : isReconnectRequired ? (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Reautorização Necessária
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-silver-brushed/50 border border-zinc-700/50">
                  Desconectado
                </span>
              )}
            </h2>
            <p className="text-xs text-silver-brushed/60 font-medium mt-0.5">
              Transforme vencimentos e cobranças em compromissos no seu calendário
            </p>
          </div>
        </div>

        {!connection ? (
          <button
            onClick={handleConnect}
            disabled={connecting || loading}
            className="w-full md:w-auto px-6 py-3.5 bg-silver-brushed hover:bg-white text-velvet-deep font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-velvet-deep/30 border-t-velvet-deep animate-spin" />
                <span>Conectando...</span>
              </>
            ) : (
              <>
                <Calendar size={16} />
                <span>Conectar Google Calendar</span>
              </>
            )}
          </button>
        ) : isReconnectRequired ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full md:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-velvet-deep font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-velvet-deep/30 border-t-velvet-deep animate-spin" />
                <span>Reautorizando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Reautorizar Conexão Google</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="w-full md:w-auto px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <LogOut size={14} />
            <span>Desconectar</span>
          </button>
        )}
      </div>

      {/* Reconnect Required Alert Banner */}
      {isReconnectRequired && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">A permissão do Google expirou ou precisa ser reautorizada</p>
              <p className="text-[11px] text-amber-200/70 font-normal mt-0.5">
                Sua integração continua salva no banco de dados, mas o Google exige uma rápida confirmação de segurança.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-4 py-2 bg-amber-500 text-black font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-all shrink-0 cursor-pointer min-h-[36px]"
          >
            Reautorizar
          </button>
        </div>
      )}

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 relative z-10 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle size={18} className="shrink-0" />
          ) : statusMessage.type === 'warning' ? (
            <AlertTriangle size={18} className="shrink-0" />
          ) : (
            <Sparkles size={18} className="shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Settings Body */}
      {loading ? (
        <div className="py-12 text-center text-silver-brushed/40 animate-pulse text-xs font-semibold uppercase tracking-widest">
          Carregando configurações de integração...
        </div>
      ) : connection ? (
        <div className="space-y-6 relative z-10">
          {/* User & Calendar Selection Bento Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connected Account Box */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-silver-brushed/40 block mb-1">
                  Conta Google Conectada
                </span>
                <p className="text-sm font-bold text-silver-polished truncate">
                  {connection.google_email}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400 font-semibold">
                <Shield size={12} />
                <span>Conexão persistente vinculada ao ID do usuário</span>
              </div>
            </div>

            {/* Target Calendar Selector */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-silver-brushed/40 block mb-1">
                  Calendário de Destino
                </label>
                <select
                  value={connection.selected_calendar_id || 'primary'}
                  onChange={(e) => handleCalendarChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-silver-polished focus:outline-none focus:border-silver-brushed/40 transition-colors cursor-pointer min-h-[44px]"
                >
                  {calendars.length === 0 ? (
                    <option value="primary">Calendário Principal</option>
                  ) : (
                    calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary ? '(Principal)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <span className="text-[10px] text-silver-brushed/40 mt-2 block">
                Seus compromissos serão salvos neste calendário
              </span>
            </div>
          </div>

          {/* Sync Rules & Reminder Configuration */}
          <div className="bg-black/20 border border-white/5 rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Auto-Sync Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-silver-polished">Sincronização Automática</h4>
                <p className="text-[11px] text-silver-brushed/50 font-medium">
                  Criar e atualizar eventos no Google Calendar automaticamente ao registrar movimentações
                </p>
              </div>
              <button
                onClick={handleAutoSyncToggle}
                className={`w-12 h-7 rounded-full transition-colors relative p-1 shrink-0 cursor-pointer min-h-[28px] ${
                  connection.auto_sync ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    connection.auto_sync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder Timing Selector */}
            <div>
              <label className="text-xs font-bold text-silver-polished flex items-center gap-1.5 mb-1">
                <Bell size={13} className="text-amber-400" />
                Lembrete Padrão no Calendário
              </label>
              <select
                value={connection.default_reminder_minutes ?? 1440}
                onChange={(e) => handleReminderChange(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-silver-polished focus:outline-none focus:border-silver-brushed/40 transition-colors cursor-pointer min-h-[44px]"
              >
                <option value={60}>1 hora antes</option>
                <option value={180}>3 horas antes</option>
                <option value={1440}>1 dia antes (24h - Recomendado)</option>
                <option value={2880}>2 dias antes</option>
                <option value={0}>No exato dia do vencimento</option>
              </select>
            </div>
          </div>

          {/* Manual Sync Trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 sm:p-5">
            <div>
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <RefreshCw size={14} className={syncing ? 'animate-spin text-emerald-400' : ''} />
                Sincronizar Histórico Completo
              </h4>
              <p className="text-[11px] text-silver-brushed/50 mt-0.5">
                Força a sincronização de todas as {movements.length} movimentações atuais para o Google Calendar
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={syncing || isReconnectRequired}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 min-h-[44px]"
            >
              {syncing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Sincronizar Agora</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Unconnected State Onboarding Info */
        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-left">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                💸
              </div>
              <h4 className="text-xs font-bold text-silver-polished">Lembretes de Contas</h4>
              <p className="text-[11px] text-silver-brushed/50 mt-1">
                Acompanhe despesas e custos fixos pendentes diretamente na sua agenda.
              </p>
            </div>

            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                💰
              </div>
              <h4 className="text-xs font-bold text-silver-polished">Previsão de Recebimentos</h4>
              <p className="text-[11px] text-silver-brushed/50 mt-1">
                Visualização clara de salários, faturamentos e cobranças a receber.
              </p>
            </div>

            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-left">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                💳
              </div>
              <h4 className="text-xs font-bold text-silver-polished">Parcelamentos e Faturas</h4>
              <p className="text-[11px] text-silver-brushed/50 mt-1">
                Veja o vencimento exato de parcelas de cartão de crédito no calendário.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Format Rule Cheat Sheet Footer */}
      <div className="mt-8 pt-6 border-t border-silver-brushed/10 relative z-10 text-left">
        <span className="text-[10px] font-black uppercase tracking-widest text-silver-brushed/40 block mb-3">
          Regras de Formatação de Títulos no Calendar
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
            <span className="text-rose-400 font-bold block">Pagar Despesa</span>
            <span className="text-silver-brushed/60 text-[10px]">💸 Pagar: [Descrição]</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
            <span className="text-emerald-400 font-bold block">Receita Futura</span>
            <span className="text-silver-brushed/60 text-[10px]">💰 Receber: [Descrição]</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
            <span className="text-amber-400 font-bold block">Cobrança Ativa</span>
            <span className="text-silver-brushed/60 text-[10px]">🔔 Cobrar: [Devedor]</span>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
            <span className="text-blue-400 font-bold block">Concluído / Pago</span>
            <span className="text-silver-brushed/60 text-[10px]">✅ Pago / Recebido</span>
          </div>
        </div>
      </div>
    </div>
  )
}
