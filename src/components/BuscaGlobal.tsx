import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderOpen, Building2, ListChecks, Inbox } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import { normalizar } from '@/lib/utils'
import { podeAcessar } from '@/lib/permissoes'
import { Dialog } from './ui/dialog'
import { Input } from './ui/form'

interface Resultado {
  grupo: string
  titulo: string
  detalhe: string
  rota: string
  icone: typeof Search
}

export function BuscaGlobal() {
  const { buscaAberta, setBuscaAberta } = useUi()
  const { db, usuario } = useApp()
  const q = useConsultas()
  const navegar = useNavigate()
  const [termo, setTermo] = useState('')
  const lista = useRef<HTMLUListElement>(null)
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscaAberta(true)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [setBuscaAberta])

  useEffect(() => {
    if (buscaAberta) setTermo('')
  }, [buscaAberta])

  const resultados = useMemo<Resultado[]>(() => {
    const t = normalizar(termo.trim())
    if (t.length < 2) return []
    const r: Resultado[] = []
    for (const p of db.processos) {
      const c = q.cliente(p.clienteId)
      if (normalizar(`${p.numero} ${p.numero.replace(/\D/g, '')} ${c?.nome} ${p.parteContraria}`).includes(t))
        r.push({ grupo: 'Processos', titulo: p.numero, detalhe: `${c?.nome} x ${p.parteContraria}`, rota: `/processos/${p.id}`, icone: FolderOpen })
    }
    for (const c of db.clientes) {
      if (normalizar(`${c.nome} ${c.documento}`).includes(t)) {
        const p = db.processos.find((x) => x.clienteId === c.id)
        r.push({ grupo: 'Clientes', titulo: c.nome, detalhe: `${c.tipo} · ${c.documento}`, rota: p ? `/processos?cliente=${c.id}` : '/processos', icone: Building2 })
      }
    }
    for (const tf of db.tarefas) {
      if (normalizar(tf.titulo).includes(t) || normalizar(q.cliente(q.processo(tf.processoId)?.clienteId)?.nome ?? '').includes(t))
        r.push({ grupo: 'Tarefas', titulo: tf.titulo, detalhe: `${q.cliente(q.processo(tf.processoId)?.clienteId)?.nome} · ${tf.status}`, rota: `/tarefas?tarefa=${tf.id}`, icone: ListChecks })
    }
    if (podeAcessar(usuario.perfil, 'intimacoes')) {
      for (const i of db.intimacoes) {
        const p = q.processo(i.processoId)
        if (normalizar(`${i.teor} ${p?.numero}`).includes(t))
          r.push({ grupo: 'Intimações', titulo: `${i.tipoAto ?? 'Intimação'} · ${p?.numero}`, detalhe: `${i.fonte} · ${i.status}`, rota: `/intimacoes/${i.id}`, icone: Inbox })
      }
    }
    const porGrupo: Record<string, number> = {}
    return r.filter((x) => (porGrupo[x.grupo] = (porGrupo[x.grupo] ?? 0) + 1) <= 5)
  }, [termo, db, q, usuario.perfil])

  const ir = (rota: string) => {
    setBuscaAberta(false)
    navegar(rota)
  }

  const mover = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const itens = Array.from(lista.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    if (!itens.length) return
    e.preventDefault()
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement)
    if (atual === -1) itens[e.key === 'ArrowDown' ? 0 : itens.length - 1].focus()
    else if (e.key === 'ArrowDown') itens[Math.min(atual + 1, itens.length - 1)].focus()
    else if (atual === 0) entrada.current?.focus()
    else itens[atual - 1].focus()
  }

  let grupoAnterior = ''
  return (
    <Dialog aberto={buscaAberta} aoFechar={() => setBuscaAberta(false)} titulo="Buscar" descricao="Processo, cliente, tarefa ou intimação" focoInicial={entrada}>
      <div onKeyDown={mover}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={entrada}
            className="pl-9"
            aria-label="Termo de busca"
            placeholder="Ex.: 0001234, Boa Praça, contestação"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && resultados[0]) ir(resultados[0].rota)
            }}
          />
        </div>
        <ul ref={lista} className="mt-3 space-y-1" aria-label="Resultados">
          {resultados.map((r, i) => {
            const cabecalho = r.grupo !== grupoAnterior
            grupoAnterior = r.grupo
            const Icone = r.icone
            return (
              <li key={i}>
                {cabecalho && <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.grupo}</p>}
                <button type="button" onClick={() => ir(r.rota)} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted focus:bg-muted">
                  <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.detalhe}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {termo.trim().length >= 2 && !resultados.length && <p className="mt-4 text-sm text-muted-foreground">Nada encontrado para “{termo}”. Tente o número do processo ou o nome do cliente.</p>}
        {termo.trim().length < 2 && <p className="mt-4 text-sm text-muted-foreground">Digite ao menos 2 caracteres. Use as setas para navegar e Enter para abrir.</p>}
      </div>
    </Dialog>
  )
}
