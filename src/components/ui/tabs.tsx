import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Aba<T extends string> {
  valor: T
  rotulo: ReactNode
}

/** Abas acessíveis (setas esquerda/direita, Home, End). */
export function Tabs<T extends string>({ abas, valor, aoMudar, rotulo, className }: { abas: Aba<T>[]; valor: T; aoMudar: (v: T) => void; rotulo: string; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()
  const tecla = (e: React.KeyboardEvent, i: number) => {
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % abas.length
    if (e.key === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length
    if (e.key === 'Home') n = 0
    if (e.key === 'End') n = abas.length - 1
    if (n >= 0) {
      e.preventDefault()
      aoMudar(abas[n].valor)
      refs.current[n]?.focus()
    }
  }
  return (
    <div role="tablist" aria-label={rotulo} className={cn('flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none]', className)}>
      {abas.map((a, i) => {
        const ativo = a.valor === valor
        return (
          <button
            key={a.valor}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${id}-${a.valor}`}
            role="tab"
            type="button"
            aria-selected={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => aoMudar(a.valor)}
            onKeyDown={(e) => tecla(e, i)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors md:min-h-9',
              ativo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {a.rotulo}
          </button>
        )
      })}
    </div>
  )
}
