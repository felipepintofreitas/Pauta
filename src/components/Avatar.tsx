import { iniciais, cn } from '@/lib/utils'

const CORES = ['bg-teal-700', 'bg-sky-700', 'bg-indigo-700', 'bg-emerald-700', 'bg-rose-700', 'bg-amber-700', 'bg-cyan-800', 'bg-slate-700']

export function Avatar({ nome, id, tamanho = 'md', className }: { nome: string; id: string; tamanho?: 'sm' | 'md'; className?: string }) {
  const cor = CORES[Number(id.replace(/\D/g, '') || 0) % CORES.length]
  return (
    <span aria-hidden className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white', cor, tamanho === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs', className)}>
      {iniciais(nome)}
    </span>
  )
}

export function Pessoa({ nome, id, className }: { nome: string; id: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <Avatar nome={nome} id={id} tamanho="sm" />
      <span className="truncate">{nome}</span>
    </span>
  )
}
