'use client'

import React, { useRef } from 'react'
import { DialogShell } from '@/components/ui/DialogShell'
import { Receipt } from '@/types/company'
import { useAuth } from '@/context/AuthContext'
import { numberToWordsBRL, formatDateInWords, formatDateNumeric } from '@/utils/numberToWords'
import { Printer, Copy, Check, ShieldCheck, Building } from 'lucide-react'

interface ReceiptPrintModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: Receipt | null
}

export function ReceiptPrintModal({ isOpen, onClose, receipt }: ReceiptPrintModalProps) {
  const { profile } = useAuth()
  const [copied, setCopied] = React.useState(false)

  if (!receipt) return null

  // Provider Data
  const providerName = profile?.company_name || profile?.full_name || 'Nome do Prestador'
  const providerDoc = profile?.company_document || 'CPF/CNPJ do Prestador'
  const providerCity = profile?.company_city || 'Cidade'
  
  const providerAddress = profile?.company_address 
    ? `${profile.company_address}${profile.company_city ? `, ${profile.company_city} - ${profile.company_state || ''}` : ''}`
    : 'Endereço do Prestador'

  const signatureUrl = profile?.company_signature_url || null

  // Client Data
  const clientName = receipt.client_name || '[NOME/RAZÃO SOCIAL DO CLIENTE]'
  const clientDoc = receipt.client_document || '[CNPJ]'

  // Values & Dates
  const amountNumericStr = receipt.amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const amountInWords = numberToWordsBRL(receipt.amount)
  
  const description = receipt.description || 'Desenvolvimento de Software para Sistema Interno'

  // Service dates
  const startDateStr = receipt.service_start_date 
    ? formatDateNumeric(receipt.service_start_date)
    : formatDateNumeric(receipt.issue_date)

  const endDateStr = receipt.service_end_date 
    ? formatDateNumeric(receipt.service_end_date)
    : formatDateNumeric(receipt.issue_date)

  const dateInWords = formatDateInWords(receipt.issue_date)

  const handlePrint = () => {
    window.print()
  }

  const handleCopyText = () => {
    const text = `
RECIBO DE PRESTAÇÃO DE SERVIÇOS

VALOR: ${amountInWords}, R$${amountNumericStr}

Recebi de ${clientName}, inscrito no CNPJ sob o nº ${clientDoc}, a importância de R$${amountNumericStr}, referente à prestação de serviços de ${description}, realizados no período de ${startDateStr} a ${endDateStr}, conforme contrato de prestação de serviços vigente.

Dados do Prestador:

● Nome: ${providerName}
● CPF/CNPJ: ${providerDoc}
● Endereço: ${providerAddress}

Por ser a expressão da verdade, firmo o presente recibo para que surta seus efeitos legais.

${providerCity}, ${dateInWords}.


__________________________________________
${providerName}
`.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      type="modal"
      maxWidth="max-w-3xl"
      header={
        <div className="pt-4 pb-2 flex items-center justify-between border-b border-white/5 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-silver-polished uppercase tracking-wide">
                Recibo de Prestação de Serviços
              </h3>
              <p className="text-[10px] text-silver-brushed/40 font-mono">
                Código: {receipt.receipt_code || receipt.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-silver-polished rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              title="Copiar texto formatado"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <Printer size={12} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Printable Document Sheet Container */}
      <div className="py-4">
        {/* Print Styles for clean physical printing */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible !important;
            }
            #printable-receipt {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              color: #000 !important;
              background: #fff !important;
              padding: 40px !important;
              font-family: serif, sans-serif !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />

        <div
          id="printable-receipt"
          className="bg-white text-zinc-900 border border-zinc-200 rounded-2xl p-8 sm:p-12 space-y-8 shadow-2xl relative font-sans"
        >
          {/* Header Title */}
          <div className="text-center border-b-2 border-zinc-900 pb-4">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-zinc-900">
              RECIBO DE PRESTAÇÃO DE SERVIÇOS
            </h1>
          </div>

          {/* Valor Line */}
          <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-xl font-bold text-sm text-zinc-900">
            <span className="uppercase tracking-wider">VALOR:</span>{' '}
            <span className="font-semibold">{amountInWords}, R${amountNumericStr}</span>
          </div>

          {/* Main Statement */}
          <div className="text-sm leading-relaxed text-zinc-800 space-y-4">
            <p className="text-justify leading-loose">
              Recebi de <strong className="text-zinc-950 uppercase">{clientName}</strong>, inscrito no CNPJ sob o nº <strong className="text-zinc-950 font-mono">{clientDoc}</strong>, a importância de <strong>R${amountNumericStr}</strong>, referente à prestação de serviços de <strong className="text-zinc-950">{description}</strong>, realizados no período de <strong>{startDateStr}</strong> a <strong>{endDateStr}</strong>, conforme contrato de prestação de serviços vigente.
            </p>
          </div>

          {/* Dados do Prestador */}
          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-sm text-zinc-800">
            <h4 className="font-black uppercase tracking-wider text-zinc-900 text-xs border-b border-zinc-200 pb-1.5 mb-2">
              Dados do Prestador:
            </h4>
            <p className="flex items-start gap-2">
              <span className="text-zinc-900 font-bold">● Nome:</span>
              <span>{providerName}</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-zinc-900 font-bold">● CPF/CNPJ:</span>
              <span className="font-mono">{providerDoc}</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-zinc-900 font-bold">● Endereço:</span>
              <span>{providerAddress}</span>
            </p>
          </div>

          {/* Formal Closing Clause */}
          <div className="text-sm text-zinc-800 italic">
            Por ser a expressão da verdade, firmo o presente recibo para que surta seus efeitos legais.
          </div>

          {/* Date and Location */}
          <div className="text-right text-sm font-semibold text-zinc-900 pt-2">
            {providerCity}, {dateInWords}.
          </div>

          {/* Signature Block */}
          <div className="pt-10 flex flex-col items-center justify-center text-center space-y-1">
            {signatureUrl ? (
              <div className="mb-[-12px] z-10">
                <img
                  src={signatureUrl}
                  alt={`Assinatura de ${providerName}`}
                  className="h-24 max-w-[280px] object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="h-12" />
            )}

            <div className="w-80 border-b border-zinc-800 mx-auto pt-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-900 pt-1">
              {providerName}
            </p>
          </div>
        </div>
      </div>
    </DialogShell>
  )
}
