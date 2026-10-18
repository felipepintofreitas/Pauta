import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EstadoVazio({ icone: Icone, titulo, descricao, acao }: { icone: LucideIcon; titulo: string; descricao: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <Icone className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{titulo}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
