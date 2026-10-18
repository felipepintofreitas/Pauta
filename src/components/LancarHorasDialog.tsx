import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, History } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import { hojeISO } from '@/lib/datas'
import { horas, interpretarDuracao } from '@/lib/formato'
import { normalizar } from '@/lib/utils'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Checkbox, Input, Label, Textarea } from './ui/form'
import { useToast } from './ui/toast'

const ATALHOS = [15, 30, 60]

/** Lançamento rápido de horas: processo → duração (o toque na duração já lança). */
export function LancarHorasDialog() {
  const { lancamento, fecharLancamento } = useUi()
  const { db, usuario, lancarHoras, excluirLancamento } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const aberto = lancamento !== null

  const [processoId, setProcessoId] = useState<string | undefined>()
  const [tarefaId, setTarefaId] = useState<string | undefined>()
  const [busca, setBusca] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(hojeISO())
  const [faturavel, setFaturavel] = useState(true)
  const [livre, setLivre] = useState('')
  const [erroLivre, setErroLivre] = useState('')

  useEffect(() => {
    if (!lancamento) return
    setProcessoId(lancamento.processoId)
    setTarefaId(lancamento.tarefaId)
    setDescricao(lancamento.descricao ?? '')
    setLivre(lancamento.minutos ? horas(lancamento.minutos) : '')
    setBusca('')
    setData(hojeISO())
    setFaturavel(true)
    setErroLivre('')
  }, [lancamento])

  const recentes = useMemo(() => {
    const ids: string[] = []
    const meus = db.lancamentos.filter((l) => l.usuarioId === usuario.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    for (const l of meus) if (!ids.includes(l.processoId)) ids.push(l.processoId)
    for (const t of db.tarefas) if (t.responsavelId === usuario.id && t.status !== 'Concluída' && !ids.includes(t.processoId)) ids.push(t.processoId)
    return ids.slice(0, 5)
  }, [db, usuario.id])

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return []
    return db.processos
      .filter((p) => normalizar(`${p.numero} ${q.cliente(p.clienteId)?.nome} ${p.parteContraria} ${p.tribunal}`).includes(termo))
      .slice(0, 8)
      .map((p) => p.id)
  }, [busca, db.processos, q])

  const processo = q.processo(processoId)
  const sugestoes = useMemo(() => {
    if (!processoId) return []
    const t = db.tarefas.filter((x) => x.processoId === processoId && x.responsavelId === usuario.id).map((x) => x.titulo)
    return Array.from(new Set([...t, 'Análise dos autos', 'Reunião com o cliente', 'Elaboração de minuta'])).slice(0, 5)
  }, [db.tarefas, processoId, usuario.id])

  function lancar(minutos: number) {
    if (!processoId) return
    const l = lancarHoras({ processoId, minutos, data, tarefaId, descricao, faturavel })
    fecharLancamento()
    toast(`${horas(minutos)} lançados em ${q.cliente(q.processo(processoId)?.clienteId)?.nome ?? 'processo'}.`, {
      acao: { rotulo: 'Desfazer', aoClicar: () => excluirLancamento(l.id) },
    })
  }

  function lancarLivre() {
    const m = interpretarDuracao(livre)
    if (!m || m <= 0 || m > 24 * 60) {
      setErroLivre('Informe uma duração como 45min, 1h30 ou 2h.')
      return
    }
    lancar(m)
  }

  const ItemProcesso = ({ id }: { id: string }) => {
    const p = q.processo(id)!
    return (
      <li>
        <button
          type="button"
          onClick={() => {
            setProcessoId(id)
            setTarefaId(undefined)
          }}
          className="flex min-h-14 w-full flex-col items-start rounded-md border bg-card px-3 py-2 text-left hover:bg-muted"
        >
          <span className="text-sm font-medium">{q.cliente(p.clienteId)?.nome}</span>
          <span className="text-xs text-muted-foreground">
            {p.numero} · {p.tribunal} · x {p.parteContraria}
          </span>
        </button>
      </li>
    )
  }

  return (
    <Dialog aberto={aberto} aoFechar={fecharLancamento} titulo="Lançar horas" descricao={processo ? undefined : 'Escolha o processo. Os recentes aparecem primeiro.'}>
      {!processo ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar processo por número, cliente ou parte" placeholder="Número CNJ, cliente ou parte" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {busca.trim() ? (
            resultados.length ? (
              <ul className="space-y-2">{resultados.map((id) => <ItemProcesso key={id} id={id} />)}</ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum processo encontrado. Tente parte do número ou o nome do cliente.</p>
            )
          ) : (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="size-3.5" aria-hidden /> Recentes
              </p>
              <ul className="space-y-2">{recentes.map((id) => <ItemProcesso key={id} id={id} />)}</ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-muted p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{q.cliente(processo.clienteId)?.nome}</p>
              <p className="break-words text-xs text-muted-foreground">
                {processo.numero} · {processo.tribunal}
                {tarefaId && ` · Tarefa: ${q.tarefa(tarefaId)?.titulo}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setProcessoId(undefined)}>
              <ArrowLeft /> Trocar
            </Button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" id="rotulo-duracao">
              Duração <span className="font-normal text-muted-foreground">(toque para lançar)</span>
            </p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="rotulo-duracao">
              {ATALHOS.map((m) => (
                <Button key={m} variant="secondary" size="lg" onClick={() => lancar(m)} data-autofocus={m === 30 ? '' : undefined}>
                  {horas(m)}
                </Button>
              ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                lancarLivre()
              }}
            >
              <Input
                aria-label="Outra duração"
                aria-invalid={!!erroLivre}
                aria-describedby={erroLivre ? 'erro-duracao' : undefined}
                placeholder="Outra: 1h30, 45min"
                value={livre}
                onChange={(e) => {
                  setLivre(e.target.value)
                  setErroLivre('')
                }}
                inputMode="text"
              />
              <Button type="submit" variant={lancamento?.minutos ? 'default' : 'outline'}>
                Lançar
              </Button>
            </form>
            {erroLivre && (
              <p id="erro-duracao" className="mt-1 text-xs text-red-700 dark:text-red-300">
                {erroLivre}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lanc-desc">Descrição (opcional)</Label>
            <Textarea id="lanc-desc" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que foi feito" />
            <div className="flex flex-wrap gap-1.5">
              {sugestoes.map((s) => (
                <button key={s} type="button" onClick={() => setDescricao(s)} className="min-h-9 rounded-full border px-3 text-xs hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="lanc-data">Data</Label>
              <Input id="lanc-data" type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value || hojeISO())} className="w-auto" />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox checked={faturavel} onChange={(e) => setFaturavel(e.target.checked)} /> Faturável
            </label>
          </div>
        </div>
      )}
    </Dialog>
  )
}
