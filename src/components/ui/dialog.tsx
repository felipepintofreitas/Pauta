import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  children: ReactNode
  rodape?: ReactNode
  tamanho?: 'sm' | 'md' | 'lg' | 'xl'
  /** Elemento que recebe o foco ao abrir. */
  focoInicial?: React.RefObject<HTMLElement | null>
}

const larguras = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-4xl' }

/** Modal acessível: no celular abre como folha inferior; no desktop, centralizado. */
export function Dialog({ aberto, aoFechar, titulo, descricao, children, rodape, tamanho = 'md', focoInicial }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const idDesc = useId()
  const aoFecharRef = useRef(aoFechar)
  aoFecharRef.current = aoFechar

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      const alvo = focoInicial?.current ?? ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>(FOCAVEIS)
      alvo?.focus()
    }, 10)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        aoFecharRef.current()
      }
      if (e.key === 'Tab' && ref.current) {
        const itens = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.offsetParent !== null)
        if (!itens.length) return
        const primeiro = itens[0]
        const ultimo = itens[itens.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primeiro.focus()
        }
      }
    }
    document.addEventListener('keydown', tecla)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflow
      anterior?.focus?.()
    }
  }, [aberto, focoInicial])

  if (!aberto) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={aoFechar} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDesc : undefined}
        className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border bg-card text-card-foreground shadow-xl md:rounded-xl', larguras[tamanho])}
      >
        <div className="flex items-start justify-between gap-2 border-b p-4">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg font-semibold leading-tight">
              {titulo}
            </h2>
            {descricao && (
              <p id={idDesc} className="mt-1 text-sm text-muted-foreground">
                {descricao}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={aoFechar} aria-label="Fechar" className="-m-2">
            <X />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {rodape && <div className="flex flex-wrap justify-end gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
