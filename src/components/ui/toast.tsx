import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tipo = 'sucesso' | 'erro' | 'info'
interface Toast {
  id: number
  tipo: Tipo
  mensagem: string
  acao?: { rotulo: string; aoClicar: () => void }
}

interface Ctx {
  toast(mensagem: string, opcoes?: { tipo?: Tipo; acao?: Toast['acao'] }): void
}

const ToastCtx = createContext<Ctx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Toast[]>([])
  const seq = useRef(0)
  const fechar = useCallback((id: number) => setItens((l) => l.filter((t) => t.id !== id)), [])
  const toast = useCallback<Ctx['toast']>(
    (mensagem, opcoes) => {
      seq.current += 1
      const id = seq.current
      setItens((l) => [...l.slice(-2), { id, mensagem, tipo: opcoes?.tipo ?? 'sucesso', acao: opcoes?.acao }])
      window.setTimeout(() => fechar(id), opcoes?.acao ? 7000 : 4500)
    },
    [fechar],
  )
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end">
        {itens.map((t) => {
          const Icone = t.tipo === 'sucesso' ? CheckCircle2 : t.tipo === 'erro' ? AlertTriangle : Info
          return (
            <div
              key={t.id}
              role={t.tipo === 'erro' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-lg',
                t.tipo === 'erro' && 'border-red-400 dark:border-red-700',
              )}
            >
              <Icone className={cn('size-5 shrink-0', t.tipo === 'sucesso' ? 'text-emerald-600 dark:text-emerald-400' : t.tipo === 'erro' ? 'text-red-600 dark:text-red-400' : 'text-primary')} aria-hidden />
              <p className="min-w-0 flex-1">{t.mensagem}</p>
              {t.acao && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-md px-2 font-semibold text-primary hover:bg-muted md:min-h-9"
                  onClick={() => {
                    t.acao!.aoClicar()
                    fechar(t.id)
                  }}
                >
                  {t.acao.rotulo}
                </button>
              )}
              <button type="button" aria-label="Fechar aviso" className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-muted md:size-8" onClick={() => fechar(t.id)}>
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
