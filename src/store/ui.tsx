import { createContext, useContext, useState, type ReactNode } from 'react'

export interface PreenchimentoLancamento {
  processoId?: string
  tarefaId?: string
  minutos?: number
  descricao?: string
  origem?: string
}

interface UiCtx {
  lancamento: PreenchimentoLancamento | null
  abrirLancamento(p?: PreenchimentoLancamento): void
  fecharLancamento(): void
  buscaAberta: boolean
  setBuscaAberta(v: boolean): void
}

const Ctx = createContext<UiCtx | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [lancamento, setLancamento] = useState<PreenchimentoLancamento | null>(null)
  const [buscaAberta, setBuscaAberta] = useState(false)
  return (
    <Ctx.Provider value={{ lancamento, abrirLancamento: (p) => setLancamento(p ?? {}), fecharLancamento: () => setLancamento(null), buscaAberta, setBuscaAberta }}>
      {children}
    </Ctx.Provider>
  )
}

export function useUi() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUi fora do UiProvider')
  return c
}
