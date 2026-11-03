import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-100">
      <h2 className="text-3xl font-black mb-2">404 - Página Não Encontrada</h2>
      <p className="text-zinc-400 text-sm mb-6">A página requisitada não pôde ser localizada.</p>
      <Link 
        href="/"
        className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-colors"
      >
        Voltar ao Painel
      </Link>
    </div>
  )
}
