'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Building, Check, Loader2, ShieldCheck, Mail, Phone, MapPin, ToggleLeft, ToggleRight, Sparkles, Upload, Image as ImageIcon, Trash2, FileCheck } from 'lucide-react'

export function CompanySettingsCard() {
  const { profile, updateProfile, toggleEmpresaMode } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [empresaEnabled, setEmpresaEnabled] = useState<boolean>(profile?.empresa_enabled || false)
  const [companyName, setCompanyName] = useState<string>(profile?.company_name || '')
  const [companyDocument, setCompanyDocument] = useState<string>(profile?.company_document || '')
  const [companyEmail, setCompanyEmail] = useState<string>(profile?.company_email || '')
  const [companyPhone, setCompanyPhone] = useState<string>(profile?.company_phone || '')
  const [companyAddress, setCompanyAddress] = useState<string>(profile?.company_address || '')
  const [companyCity, setCompanyCity] = useState<string>(profile?.company_city || '')
  const [companyState, setCompanyState] = useState<string>(profile?.company_state || '')
  const [companyZip, setCompanyZip] = useState<string>(profile?.company_zip || '')
  const [signatureUrl, setSignatureUrl] = useState<string | null>(profile?.company_signature_url || null)

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmpresaEnabled(profile.empresa_enabled || false)
      setCompanyName(profile.company_name || '')
      setCompanyDocument(profile.company_document || '')
      setCompanyEmail(profile.company_email || profile.email || '')
      setCompanyPhone(profile.company_phone || '')
      setCompanyAddress(profile.company_address || '')
      setCompanyCity(profile.company_city || '')
      setCompanyState(profile.company_state || '')
      setCompanyZip(profile.company_zip || '')
      setSignatureUrl(profile.company_signature_url || null)
    }
  }, [profile])

  const handleToggleMode = async (enabled: boolean) => {
    setEmpresaEnabled(enabled)
    setLoading(true)
    try {
      await toggleEmpresaMode(enabled)
    } catch (err: any) {
      setError('Erro ao alterar status do Modo Empresa.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setSignatureUrl(result)
        setError(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveSignature = () => {
    setSignatureUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await updateProfile({
        empresa_enabled: empresaEnabled,
        company_name: companyName,
        company_document: companyDocument,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_address: companyAddress,
        company_city: companyCity,
        company_state: companyState,
        company_zip: companyZip,
        company_signature_url: signatureUrl
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError('Erro ao salvar dados da empresa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Status Banner */}
      <div className="bg-velvet-soft border border-silver-brushed/15 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${
              empresaEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
            }`}>
              <Building size={28} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-silver-polished uppercase tracking-tight">
                  Modo Empresa & Gestão de Recibos
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  empresaEnabled 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {empresaEnabled ? 'Ativado' : 'Desativado'}
                </span>
              </div>
              <p className="text-xs text-silver-brushed/60 font-medium mt-1 max-w-xl leading-relaxed">
                Ative para gerenciar clientes, emitir recibos digitais oficiais com o cabeçalho da sua empresa e controlar recebimentos de prestação de serviços.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => handleToggleMode(!empresaEnabled)}
            disabled={loading}
            className={`px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shrink-0 ${
              empresaEnabled
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 hover:bg-emerald-400'
                : 'bg-white/5 hover:bg-white/10 text-silver-polished border-white/10'
            }`}
          >
            {empresaEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            <span>{empresaEnabled ? 'Modo Empresa Ativo' : 'Ativar Modo Empresa'}</span>
          </button>
        </div>

        {/* Company Details Form */}
        <form onSubmit={handleSaveCompanyDetails} className="pt-6 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-[0.15em] text-silver-polished flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400" />
            Dados da Sua Empresa (Impressos nos Recibos)
          </h4>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-2">
              <Check size={16} />
              <span>Dados da empresa atualizados com sucesso!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                Nome da Empresa / Razão Social
              </label>
              <input
                type="text"
                placeholder="Ex: Minha Empresa Ltda ou Nome do Profissional"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                CNPJ ou CPF do Emissor
              </label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={companyDocument}
                onChange={(e) => setCompanyDocument(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                E-mail Comercial
              </label>
              <input
                type="email"
                placeholder="contato@empresa.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                Endereço Comercial
              </label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000 - Conjunto 50"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-silver-brushed/70 mb-1">
                Cidade / UF
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cidade"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
                />
                <input
                  type="text"
                  maxLength={2}
                  placeholder="UF"
                  value={companyState}
                  onChange={(e) => setCompanyState(e.target.value.toUpperCase())}
                  className="w-16 px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-silver-polished uppercase placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Assinatura Digital do Prestador */}
          <div className="p-5 bg-black/30 border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-silver-polished">
                  Assinatura Digital do Prestador
                </label>
                <p className="text-[11px] text-silver-brushed/60 font-medium mt-0.5">
                  Envie uma imagem da sua assinatura (PNG com fundo transparente preferencialmente, JPG ou WEBP). Ela será inserida automaticamente em todos os seus recibos.
                </p>
              </div>

              {signatureUrl && (
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Trash2 size={12} />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleSignatureUpload}
              className="hidden"
            />

            {signatureUrl ? (
              <div className="p-4 bg-white rounded-xl border border-white/20 flex flex-col items-center justify-center relative group shadow-md">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 select-none">
                  Pré-visualização da Assinatura
                </p>
                <img
                  src={signatureUrl}
                  alt="Assinatura da Empresa/Prestador"
                  className="h-20 max-w-[280px] object-contain"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1 bg-zinc-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Upload size={12} />
                  <span>Alterar Assinatura</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-white/15 hover:border-emerald-500/50 hover:bg-white/5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Upload size={18} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-silver-polished block">
                    Enviar Assinatura
                  </span>
                  <span className="text-[10px] text-silver-brushed/40 font-medium">
                    PNG (com fundo transparente), JPG ou WEBP
                  </span>
                </div>
              </button>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Salvar Dados da Empresa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
