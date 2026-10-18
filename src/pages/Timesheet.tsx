import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Bell, Send, Trash2, Pencil, Check, Undo2, Clock, MessageSquareWarning } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import type { Lancamento, StatusLancamento } from '@/data/tipos'
import { hojeISO, inicioDaSemana, somarDias } from '@/lib/datas'
import { data as fmtData, dataCurta, diaSemanaCurto, horas, interpretarDuracao, reais } from '@/lib/formato'
import { calendarioNacional } from '@/lib/urgencia'
import { pode } from '@/lib/permissoes'
import { somaMinutos, valorLancamento } from '@/lib/negocio'
import { useCarregando } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Campo, Checkbox, Input, Textarea } from '@/components/ui/form'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Pessoa } from '@/components/Avatar'

type Visao = 'semana' | 'lancamentos' | 'aprovacao'

const COR_STATUS: Record<StatusLancamento, 'neutro' | 'info' | 'sucesso' | 'default'> = { Rascunho: 'neutro', Enviado: 'info', Aprovado: 'sucesso', Faturado: 'default' }

export function Timesheet() {
  const { usuario } = useApp()
  const { abrirLancamento } = useUi()
  const [params, setParams] = useSearchParams()
  const lanca = pode(usuario.perfil, 'lancarHoras')
  const aprova = pode(usuario.perfil, 'aprovarHoras')
  const visao = ((params.get('visao') as Visao) || (lanca ? 'semana' : 'aprovacao')) as Visao
  const setVisao = (v: Visao) => setParams({ visao: v }, { replace: true })
  const [semana, setSemana] = useState(inicioDaSemana(hojeISO()))
  const [lembrete, setLembrete] = useState(false)
  const carregando = useCarregando(400, visao)

  const abas: { valor: Visao; rotulo: string }[] = []
  if (lanca) abas.push({ valor: 'semana', rotulo: 'Minha semana' }, { valor: 'lancamentos', rotulo: 'Meus lançamentos' })
  if (aprova) abas.push({ valor: 'aprovacao', rotulo: 'Aprovação' })

  return (
    <div>
      <CabecalhoPagina
        titulo="Timesheet"
        descricao={lanca ? 'Lance horas em segundos e envie para aprovação do Financeiro.' : 'Aprove ou devolva as horas enviadas pela equipe.'}
        acoes={
          lanca && (
            <>
              <Button variant="outline" onClick={() => setLembrete(true)}>
                <Bell /> Simular lembrete de fim de dia
              </Button>
              <Button onClick={() => abrirLancamento()}>
                <Plus /> Lançar horas
              </Button>
            </>
          )
        }
      />
      {abas.length > 1 && <Tabs rotulo="Visão" valor={visao} aoMudar={setVisao} abas={abas} className="mb-4 max-w-full" />}
      {carregando ? (
        <SkeletonLista />
      ) : visao === 'semana' && lanca ? (
        <GradeSemanal semana={semana} setSemana={setSemana} />
      ) : visao === 'lancamentos' && lanca ? (
        <MeusLancamentos />
      ) : aprova ? (
        <Aprovacao />
      ) : null}
      <LembreteFimDoDia aberto={lembrete} aoFechar={() => setLembrete(false)} />
    </div>
  )
}

function GradeSemanal({ semana, setSemana }: { semana: string; setSemana: (s: string) => void }) {
  const { db, usuario } = useApp()
  const q = useConsultas()
  const { abrirLancamento } = useUi()
  const hoje = hojeISO()
  const meta = db.config.metaDiariaMin
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i))
  const doUsuario = db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data >= dias[0] && l.data <= dias[6])
  const processos = Array.from(new Set(doUsuario.map((l) => l.processoId)))
  const totalDia = (d: string) => somaMinutos(doUsuario.filter((l) => l.data === d))
  const abaixo = (d: string) => calendarioNacional.ehDiaUtil(d) && d <= hoje && totalDia(d) < meta
  const totalSemana = somaMinutos(doUsuario)
  const faturavel = somaMinutos(doUsuario.filter((l) => l.faturavel))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => setSemana(somarDias(semana, -7))} aria-label="Semana anterior">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setSemana(somarDias(semana, 7))} aria-label="Próxima semana" disabled={somarDias(semana, 7) > hoje}>
          <ChevronRight />
        </Button>
        <h2 className="ml-2 font-semibold" aria-live="polite">
          {dataCurta(dias[0])} a {dataCurta(dias[6])}
        </h2>
        <p className="ml-auto text-sm text-muted-foreground">
          Total <strong className="text-foreground">{horas(totalSemana)}</strong> · faturável {horas(faturavel)}
        </p>
      </div>

      {!doUsuario.length ? (
        <EstadoVazio icone={Clock} titulo="Nenhuma hora nesta semana" descricao="Use “Lançar horas” ou o cronômetro para registrar o tempo dedicado a cada processo." acao={<Button onClick={() => abrirLancamento()}>Lançar horas</Button>} />
      ) : (
        <>
          {/* Desktop: grade dias x processos */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Horas da semana por processo e dia</caption>
              <thead className="bg-muted text-xs">
                <tr>
                  <th scope="col" className="w-[30%] p-2 text-left font-semibold">
                    Processo
                  </th>
                  {dias.map((d) => (
                    <th key={d} scope="col" className={cn('p-2 text-center font-semibold', d === hoje && 'text-primary')}>
                      <span className="capitalize">{diaSemanaCurto(d)}</span> {dataCurta(d)}
                    </th>
                  ))}
                  <th scope="col" className="p-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {processos.map((pid) => {
                  const p = q.processo(pid)!
                  const linha = doUsuario.filter((l) => l.processoId === pid)
                  return (
                    <tr key={pid}>
                      <th scope="row" className="p-2 text-left font-normal">
                        <span className="block truncate font-medium">{q.cliente(p.clienteId)?.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.numero}</span>
                      </th>
                      {dias.map((d) => {
                        const m = somaMinutos(linha.filter((l) => l.data === d))
                        return (
                          <td key={d} className="p-1 text-center tabular-nums">
                            <button
                              type="button"
                              className="min-h-9 w-full rounded hover:bg-muted"
                              onClick={() => abrirLancamento({ processoId: pid })}
                              aria-label={`${q.cliente(p.clienteId)?.nome}, ${dataCurta(d)}: ${m ? horas(m) : 'sem horas'}. Lançar mais horas`}
                            >
                              {m ? horas(m) : <span className="text-muted-foreground">·</span>}
                            </button>
                          </td>
                        )
                      })}
                      <td className="p-2 text-right font-medium tabular-nums">{horas(somaMinutos(linha))}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-muted/50 text-xs">
                <tr>
                  <th scope="row" className="p-2 text-left">
                    Total do dia (meta {horas(meta)})
                  </th>
                  {dias.map((d) => (
                    <td key={d} className={cn('p-2 text-center font-semibold tabular-nums', abaixo(d) && 'urg-ate7')}>
                      {horas(totalDia(d))}
                      {abaixo(d) && <span className="block text-[10px] font-medium">abaixo da meta</span>}
                    </td>
                  ))}
                  <td className="p-2 text-right font-semibold tabular-nums">{horas(totalSemana)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Celular: um cartão por dia */}
          <ul className="space-y-2 md:hidden">
            {dias.map((d) => {
              const doDia = doUsuario.filter((l) => l.data === d)
              const util = calendarioNacional.ehDiaUtil(d)
              if (!doDia.length && !util) return null
              return (
                <li key={d} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">
                      {diaSemanaCurto(d)} {dataCurta(d)}
                    </span>
                    <span className={cn('rounded px-2 py-0.5 text-sm font-semibold tabular-nums', abaixo(d) && 'urg-ate7')}>
                      {horas(totalDia(d))}
                      {abaixo(d) && ' · abaixo da meta'}
                    </span>
                  </div>
                  {doDia.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {doDia.map((l) => (
                        <li key={l.id} className="flex justify-between gap-2">
                          <span className="min-w-0 truncate">{q.clienteDoProcesso(l.processoId)?.nome}</span>
                          <span className="shrink-0 tabular-nums">{horas(l.minutos)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

function EditarLancamentoDialog({ l, aoFechar }: { l: Lancamento | null; aoFechar: () => void }) {
  const { atualizarLancamento } = useApp()
  const { toast } = useToast()
  const [duracao, setDuracao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [faturavel, setFaturavel] = useState(true)
  const [chave, setChave] = useState<string | null>(null)
  if (l && chave !== l.id) {
    setChave(l.id)
    setDuracao(horas(l.minutos))
    setDescricao(l.descricao)
    setFaturavel(l.faturavel)
  }
  if (!l) return null
  return (
    <Dialog
      aberto
      aoFechar={() => {
        setChave(null)
        aoFechar()
      }}
      titulo="Editar lançamento"
      tamanho="sm"
      rodape={
        <Button type="submit" form="form-editar-lanc">
          Salvar
        </Button>
      }
    >
      <form
        id="form-editar-lanc"
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const m = interpretarDuracao(duracao)
          if (!m) return toast('Duração inválida. Use 45min, 1h30 ou 2h.', { tipo: 'erro' })
          atualizarLancamento(l.id, { minutos: m, descricao, faturavel })
          toast('Lançamento atualizado.')
          setChave(null)
          aoFechar()
        }}
      >
        <Campo rotulo="Duração" id="ed-dur">
          <Input id="ed-dur" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </Campo>
        <Campo rotulo="Descrição" id="ed-desc">
          <Textarea id="ed-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </Campo>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox checked={faturavel} onChange={(e) => setFaturavel(e.target.checked)} /> Faturável
        </label>
      </form>
    </Dialog>
  )
}

function MeusLancamentos() {
  const { db, usuario, enviarParaAprovacao, excluirLancamento, restaurarLancamento } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [sel, setSel] = useState<string[]>([])
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [excluindo, setExcluindo] = useState<Lancamento | null>(null)
  const [status, setStatus] = useState<StatusLancamento | ''>('')
  const meus = useMemo(
    () => db.lancamentos.filter((l) => l.usuarioId === usuario.id && (!status || l.status === status)).sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)),
    [db.lancamentos, usuario.id, status],
  )
  const rascunhos = meus.filter((l) => l.status === 'Rascunho')
  const devolvidos = meus.filter((l) => l.status === 'Rascunho' && l.comentario)

  return (
    <div className="space-y-3">
      {devolvidos.length > 0 && (
        <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
          {devolvidos.length === 1 ? 'Um lançamento foi devolvido' : `${devolvidos.length} lançamentos foram devolvidos`} pelo Financeiro. Ajuste e envie novamente.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <Tabs
          rotulo="Filtrar por status"
          valor={status || 'todos'}
          aoMudar={(v) => setStatus(v === 'todos' ? '' : (v as StatusLancamento))}
          abas={[{ valor: 'todos', rotulo: 'Todos' }, ...(['Rascunho', 'Enviado', 'Aprovado', 'Faturado'] as const).map((s) => ({ valor: s, rotulo: s }))]}
          className="max-w-full"
        />
        <Button
          className="ml-auto"
          disabled={!sel.length}
          onClick={() => {
            const n = enviarParaAprovacao(sel)
            setSel([])
            toast(`${n} ${n === 1 ? 'lançamento enviado' : 'lançamentos enviados'} para aprovação.`)
          }}
        >
          <Send /> Enviar {sel.length > 0 && `(${sel.length})`}
        </Button>
        {rascunhos.length > 0 && (
          <Button variant="ghost" onClick={() => setSel(rascunhos.map((l) => l.id))}>
            Selecionar rascunhos
          </Button>
        )}
      </div>
      {!meus.length ? (
        <EstadoVazio icone={Clock} titulo="Nenhum lançamento" descricao="Ajuste o filtro ou lance horas pelo botão no topo." />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {meus.slice(0, 60).map((l) => (
            <li key={l.id} className="flex items-start gap-2 p-3">
              <label className="grid size-11 shrink-0 place-items-center">
                <Checkbox
                  disabled={l.status !== 'Rascunho'}
                  checked={sel.includes(l.id)}
                  onChange={(e) => setSel((s) => (e.target.checked ? [...s, l.id] : s.filter((x) => x !== l.id)))}
                  aria-label={`Selecionar lançamento de ${fmtData(l.data)}`}
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold tabular-nums">{horas(l.minutos)}</span>
                  <span className="text-xs text-muted-foreground">{fmtData(l.data)}</span>
                  <Badge variant={COR_STATUS[l.status]}>{l.status}</Badge>
                  {!l.faturavel && <Badge variant="outline">Não faturável</Badge>}
                </div>
                <p className="mt-0.5 text-sm">{l.descricao}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {q.cliente(l.clienteId)?.nome} · {q.processo(l.processoId)?.numero}
                </p>
                {l.comentario && l.status === 'Rascunho' && <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">Devolvido: “{l.comentario}”</p>}
              </div>
              {l.status === 'Rascunho' && (
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label="Editar lançamento" onClick={() => setEditando(l)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir lançamento" onClick={() => setExcluindo(l)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <EditarLancamentoDialog l={editando} aoFechar={() => setEditando(null)} />
      <ConfirmDialog
        aberto={!!excluindo}
        perigo
        titulo="Excluir lançamento?"
        descricao={excluindo ? `${horas(excluindo.minutos)} em ${fmtData(excluindo.data)}: “${excluindo.descricao}”.` : undefined}
        confirmar="Excluir"
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={() => {
          const l = excluindo!
          excluirLancamento(l.id)
          setExcluindo(null)
          toast('Lançamento excluído.', { acao: { rotulo: 'Desfazer', aoClicar: () => restaurarLancamento(l) } })
        }}
      />
    </div>
  )
}

function Aprovacao() {
  const { db, aprovarLancamentos, devolverLancamentos } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [sel, setSel] = useState<string[]>([])
  const [devolvendo, setDevolvendo] = useState(false)
  const [comentario, setComentario] = useState('')
  const enviados = db.lancamentos.filter((l) => l.status === 'Enviado').sort((a, b) => a.usuarioId.localeCompare(b.usuarioId) || a.data.localeCompare(b.data))
  const porPessoa = Array.from(new Set(enviados.map((l) => l.usuarioId)))

  if (!enviados.length) return <EstadoVazio icone={Check} titulo="Nenhuma hora aguardando aprovação" descricao="Quando a equipe enviar lançamentos, eles aparecem aqui agrupados por pessoa." />

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 md:top-16">
        <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
          <Checkbox checked={sel.length === enviados.length} onChange={(e) => setSel(e.target.checked ? enviados.map((l) => l.id) : [])} aria-label="Selecionar todos" />
          {sel.length ? `${sel.length} selecionados · ${horas(somaMinutos(enviados.filter((l) => sel.includes(l.id))))}` : 'Selecionar todos'}
        </label>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={!sel.length}
            onClick={() => {
              setComentario('')
              setDevolvendo(true)
            }}
          >
            <Undo2 /> Devolver
          </Button>
          <Button
            disabled={!sel.length}
            onClick={() => {
              const n = aprovarLancamentos(sel)
              setSel([])
              toast(`${n} lançamentos aprovados.`)
            }}
          >
            <Check /> Aprovar
          </Button>
        </div>
      </div>
      {porPessoa.map((uid) => {
        const lista = enviados.filter((l) => l.usuarioId === uid)
        return (
          <Card key={uid}>
            <CardHeader>
              <CardTitle>
                <Pessoa nome={q.nomeUsuario(uid)} id={uid} />
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {horas(somaMinutos(lista))} · {reais(lista.reduce((s, l) => s + valorLancamento(db, l), 0))}
              </span>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {lista.map((l) => (
                  <li key={l.id} className="flex items-start gap-2 py-2">
                    <label className="grid size-11 shrink-0 place-items-center">
                      <Checkbox checked={sel.includes(l.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, l.id] : s.filter((x) => x !== l.id)))} aria-label={`Selecionar ${horas(l.minutos)} de ${fmtData(l.data)}`} />
                    </label>
                    <div className="min-w-0 flex-1 text-sm">
                      <p>
                        <strong className="tabular-nums">{horas(l.minutos)}</strong> · {fmtData(l.data)} {!l.faturavel && <Badge variant="outline">Não faturável</Badge>}
                      </p>
                      <p>{l.descricao}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {q.cliente(l.clienteId)?.nome} · {q.processo(l.processoId)?.numero}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
      <ConfirmDialog
        aberto={devolvendo}
        titulo={`Devolver ${sel.length} lançamentos`}
        descricao="Explique o que precisa ser ajustado. A pessoa verá o comentário no lançamento."
        confirmar="Devolver"
        desabilitado={!comentario.trim()}
        aoCancelar={() => setDevolvendo(false)}
        aoConfirmar={() => {
          const n = devolverLancamentos(sel, comentario.trim())
          setSel([])
          setDevolvendo(false)
          toast(`${n} lançamentos devolvidos com comentário.`)
        }}
      >
        <Campo rotulo="Comentário (obrigatório)" id="dev-com">
          <Textarea id="dev-com" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ex.: descrever a atividade com mais detalhe" />
        </Campo>
      </ConfirmDialog>
    </div>
  )
}

function LembreteFimDoDia({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { db, usuario } = useApp()
  const { abrirLancamento } = useUi()
  const q = useConsultas()
  const hoje = hojeISO()
  const lancado = somaMinutos(db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data === hoje))
  const comHorasHoje = new Set(db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data === hoje && l.tarefaId).map((l) => l.tarefaId))
  const semHoras = db.tarefas.filter((t) => t.responsavelId === usuario.id && (t.concluidaEm === hoje || t.status === 'Em andamento' || t.status === 'Em revisão') && !comHorasHoje.has(t.id)).slice(0, 6)
  return (
    <Dialog aberto={aberto} aoFechar={aoFechar} titulo={`Você lançou ${horas(lancado)} hoje. Quer completar?`} descricao={`Meta diária: ${horas(db.config.metaDiariaMin)}. Lembrete simulado, enviado às 18h.`}>
      {semHoras.length ? (
        <>
          <p className="mb-2 text-sm font-medium">Tarefas em que você trabalhou hoje sem horas registradas:</p>
          <ul className="space-y-2">
            {semHoras.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {q.clienteDoProcesso(t.processoId)?.nome} · {t.status === 'Concluída' ? 'concluída hoje' : t.status.toLowerCase()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    aoFechar()
                    abrirLancamento({ processoId: t.processoId, tarefaId: t.id, descricao: t.titulo })
                  }}
                >
                  Lançar
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm">Nenhuma tarefa pendente de horas. Se trabalhou em algo fora das tarefas, lance pelo botão abaixo.</p>
      )}
      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={() => {
          aoFechar()
          abrirLancamento()
        }}
      >
        <Plus /> Lançar outra atividade
      </Button>
    </Dialog>
  )
}
