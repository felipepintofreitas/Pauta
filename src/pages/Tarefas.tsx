import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, ListChecks, Search, GripVertical, AlertTriangle, Timer as TimerIcon, CheckCheck } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import { STATUS_TAREFA, type Prioridade, type StatusTarefa, type Tarefa } from '@/data/tipos'
import { data as fmtData, horas } from '@/lib/formato'
import { dataReferencia } from '@/lib/urgencia'
import { pode, vePropriosPorPadrao } from '@/lib/permissoes'
import { useCarregando } from '@/lib/hooks'
import { normalizar, cn } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Campo, Input, Select, Checkbox } from '@/components/ui/form'
import { Dialog } from '@/components/ui/dialog'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { UrgenciaBadge } from '@/components/Urgencia'
import { Pessoa, Avatar } from '@/components/Avatar'
import { BotaoIniciarCronometro } from '@/components/Cronometro'
import { useConcluirTarefa } from './MeuDia'

type Visao = 'kanban' | 'lista' | 'painel'

const COR_PRIORIDADE: Record<Prioridade, 'perigo' | 'alerta' | 'neutro'> = { Alta: 'perigo', Média: 'alerta', Baixa: 'neutro' }

function useMudarStatus() {
  const { atualizarTarefa } = useApp()
  const concluir = useConcluirTarefa()
  return (t: Tarefa, status: StatusTarefa) => {
    if (status === t.status) return
    if (status === 'Concluída') concluir(t)
    else atualizarTarefa(t.id, { status })
  }
}

function CartaoTarefa({ t, aoAbrir, arrastavel = true }: { t: Tarefa; aoAbrir: (t: Tarefa) => void; arrastavel?: boolean }) {
  const q = useConsultas()
  const mudarStatus = useMudarStatus()
  const prazo = q.prazo(t.prazoId)
  const p = q.processo(t.processoId)
  const atrasada = t.status !== 'Concluída' && t.dataLimite < dataReferencia()
  return (
    <li
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/tarefa', t.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="rounded-md border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-1">
        {arrastavel && <GripVertical className="mt-0.5 hidden size-4 shrink-0 cursor-grab text-muted-foreground md:block" aria-hidden />}
        <button type="button" onClick={() => aoAbrir(t)} className="min-w-0 flex-1 text-left text-sm font-medium hover:underline">
          {t.titulo}
        </button>
        <Badge variant={COR_PRIORIDADE[t.prioridade]}>{t.prioridade}</Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{q.cliente(p?.clienteId)?.nome}</p>
      <p className="truncate text-xs text-muted-foreground">{p?.numero}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {prazo && <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />}
        <span className={cn('text-xs', atrasada ? 'font-semibold text-red-700 dark:text-red-300' : 'text-muted-foreground')}>
          {atrasada ? 'Atrasada · ' : 'Até '}
          {fmtData(t.dataLimite)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Pessoa nome={q.nomeUsuario(t.responsavelId)} id={t.responsavelId} className="text-xs" />
        <Select aria-label={`Mover “${t.titulo}” para`} value={t.status} onChange={(e) => mudarStatus(t, e.target.value as StatusTarefa)} className="w-auto max-w-[9.5rem] text-xs">
          {STATUS_TAREFA.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
    </li>
  )
}

export function Tarefas() {
  const { db, usuario } = useApp()
  const q = useConsultas()
  const [params, setParams] = useSearchParams()
  const podePainel = pode(usuario.perfil, 'verEquipe')
  const pedida = (params.get('visao') as Visao) || 'kanban'
  const visao: Visao = pedida === 'painel' && !podePainel ? 'kanban' : pedida
  const setVisao = (v: Visao) => setParams(v === 'kanban' ? {} : { visao: v }, { replace: true })
  const [minhas, setMinhas] = useState(vePropriosPorPadrao(usuario.perfil))
  const [responsavel, setResponsavel] = useState('')
  const [busca, setBusca] = useState('')
  const [colunaMobile, setColunaMobile] = useState<StatusTarefa>('A fazer')
  const [abertaId, setAbertaId] = useState<string | null>(params.get('tarefa'))
  const [novaAberta, setNovaAberta] = useState(false)
  const [sobre, setSobre] = useState<StatusTarefa | null>(null)
  const mudarStatus = useMudarStatus()
  const carregando = useCarregando(400, visao)

  useEffect(() => {
    const t = params.get('tarefa')
    if (t) setAbertaId(t)
  }, [params])

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim())
    return db.tarefas
      .filter((t) => {
        if (minhas && t.responsavelId !== usuario.id) return false
        if (!minhas && responsavel && t.responsavelId !== responsavel) return false
        if (termo && !normalizar(`${t.titulo} ${q.clienteDoProcesso(t.processoId)?.nome} ${q.processo(t.processoId)?.numero}`).includes(termo)) return false
        return true
      })
      .sort((a, b) => a.dataLimite.localeCompare(b.dataLimite))
  }, [db.tarefas, minhas, responsavel, busca, usuario.id, q])

  const porStatus = (s: StatusTarefa) => filtradas.filter((t) => t.status === s).slice(0, s === 'Concluída' ? 15 : undefined)
  const abrir = (t: Tarefa) => setAbertaId(t.id)

  const abas: { valor: Visao; rotulo: string }[] = [
    { valor: 'kanban', rotulo: 'Quadro' },
    { valor: 'lista', rotulo: 'Lista' },
  ]
  if (podePainel) abas.push({ valor: 'painel', rotulo: 'Painel da controladoria' })

  return (
    <div>
      <CabecalhoPagina
        titulo="Tarefas"
        descricao="Tarefas ligadas aos prazos processuais. Arraste entre colunas ou use o seletor de status."
        acoes={
          <Button onClick={() => setNovaAberta(true)}>
            <Plus /> Nova tarefa
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs rotulo="Visão" valor={visao} aoMudar={setVisao} abas={abas} className="max-w-full" />
      </div>

      {visao !== 'painel' && (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar tarefas" placeholder="Buscar por título, cliente ou processo" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={minhas} onChange={(e) => setMinhas(e.target.checked)} /> Só as minhas
          </label>
          {!minhas && (
            <Select aria-label="Filtrar por responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="sm:w-52">
              <option value="">Todos os responsáveis</option>
              {db.usuarios
                .filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </Select>
          )}
        </div>
      )}

      {carregando ? (
        <SkeletonLista />
      ) : visao === 'painel' ? (
        <PainelControladoria aoAbrir={abrir} />
      ) : !filtradas.length ? (
        <EstadoVazio icone={ListChecks} titulo="Nenhuma tarefa encontrada" descricao={minhas ? 'Você não tem tarefas com esses critérios. Desmarque “Só as minhas” para ver as da equipe.' : 'Crie uma tarefa ou ajuste a busca.'} acao={<Button onClick={() => setNovaAberta(true)}>Nova tarefa</Button>} />
      ) : visao === 'kanban' ? (
        <>
          <div className="mb-3 lg:hidden">
            <Tabs rotulo="Coluna do quadro" valor={colunaMobile} aoMudar={setColunaMobile} abas={STATUS_TAREFA.map((s) => ({ valor: s, rotulo: `${s} (${filtradas.filter((t) => t.status === s).length})` }))} />
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {STATUS_TAREFA.map((s) => (
              <section
                key={s}
                aria-label={s}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSobre(s)
                }}
                onDragLeave={() => setSobre(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  setSobre(null)
                  const t = db.tarefas.find((x) => x.id === e.dataTransfer.getData('text/tarefa'))
                  if (t) mudarStatus(t, s)
                }}
                className={cn('rounded-lg bg-muted/60 p-2', s !== colunaMobile && 'hidden lg:block', sobre === s && 'ring-2 ring-ring')}
              >
                <h2 className="mb-2 hidden items-center justify-between px-1 text-sm font-semibold lg:flex">
                  {s} <span className="text-xs text-muted-foreground">{filtradas.filter((t) => t.status === s).length}</span>
                </h2>
                <ul className="space-y-2">
                  {porStatus(s).map((t) => (
                    <CartaoTarefa key={t.id} t={t} aoAbrir={abrir} />
                  ))}
                </ul>
                {!porStatus(s).length && <p className="p-3 text-center text-xs text-muted-foreground">Nenhuma tarefa. Arraste uma para cá.</p>}
                {s === 'Concluída' && filtradas.filter((t) => t.status === s).length > 15 && <p className="p-2 text-center text-xs text-muted-foreground">Mostrando as 15 mais recentes</p>}
              </section>
            ))}
          </div>
        </>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {filtradas.map((t) => {
            const prazo = q.prazo(t.prazoId)
            const atrasada = t.status !== 'Concluída' && t.dataLimite < dataReferencia()
            return (
              <li key={t.id} className="grid gap-2 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_9rem_10rem] md:items-center">
                <div className="min-w-0">
                  <button type="button" onClick={() => abrir(t)} className="text-left text-sm font-medium hover:underline">
                    {t.titulo}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    {q.clienteDoProcesso(t.processoId)?.nome} · {q.processo(t.processoId)?.numero}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {prazo && <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />}
                  <Pessoa nome={q.nomeUsuario(t.responsavelId)} id={t.responsavelId} className="text-xs" />
                </div>
                <span className={cn('text-xs', atrasada && 'font-semibold text-red-700 dark:text-red-300')}>
                  {atrasada ? 'Atrasada · ' : 'Até '}
                  {fmtData(t.dataLimite)}
                </span>
                <Select aria-label={`Status de “${t.titulo}”`} value={t.status} onChange={(e) => mudarStatus(t, e.target.value as StatusTarefa)} className="text-xs">
                  {STATUS_TAREFA.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </li>
            )
          })}
        </ul>
      )}

      <TarefaDialog
        tarefaId={abertaId}
        aoFechar={() => {
          setAbertaId(null)
          if (params.get('tarefa')) {
            params.delete('tarefa')
            setParams(params, { replace: true })
          }
        }}
      />
      <NovaTarefaDialog aberta={novaAberta} aoFechar={() => setNovaAberta(false)} />
    </div>
  )
}

function TarefaDialog({ tarefaId, aoFechar }: { tarefaId: string | null; aoFechar: () => void }) {
  const { db, usuario, atualizarTarefa } = useApp()
  const { abrirLancamento } = useUi()
  const q = useConsultas()
  const mudarStatus = useMudarStatus()
  const t = db.tarefas.find((x) => x.id === tarefaId)
  if (!t) return null
  const prazo = q.prazo(t.prazoId)
  const p = q.processo(t.processoId)!
  const lancado = db.lancamentos.filter((l) => l.tarefaId === t.id).reduce((s, l) => s + l.minutos, 0)
  const podeDistribuir = pode(usuario.perfil, 'distribuirTarefas')
  return (
    <Dialog
      aberto={!!t}
      aoFechar={aoFechar}
      titulo={t.titulo}
      tamanho="md"
      rodape={
        <>
          {pode(usuario.perfil, 'lancarHoras') && (
            <>
              <BotaoIniciarCronometro processoId={t.processoId} tarefaId={t.id} />
              <Button
                variant="outline"
                onClick={() => {
                  aoFechar()
                  abrirLancamento({ processoId: t.processoId, tarefaId: t.id, descricao: t.titulo })
                }}
              >
                <TimerIcon /> Lançar horas
              </Button>
            </>
          )}
          {t.status !== 'Concluída' && (
            <Button
              onClick={() => {
                aoFechar()
                mudarStatus(t, 'Concluída')
              }}
            >
              <CheckCheck /> Concluir
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p>
          <Link to={`/processos/${p.id}`} className="font-medium text-primary hover:underline" onClick={aoFechar}>
            {p.numero}
          </Link>
          <br />
          <span className="text-muted-foreground">
            {q.cliente(p.clienteId)?.nome} x {p.parteContraria}
          </span>
        </p>
        {prazo && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <span>
              Prazo vinculado: {prazo.tipo}, fatal {fmtData(prazo.dataFatal)}
            </span>
            <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Status" id="td-status">
            <Select id="td-status" value={t.status} onChange={(e) => mudarStatus(t, e.target.value as StatusTarefa)}>
              {STATUS_TAREFA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Responsável" id="td-resp">
            <Select id="td-resp" value={t.responsavelId} disabled={!podeDistribuir} onChange={(e) => atualizarTarefa(t.id, { responsavelId: e.target.value })}>
              {db.usuarios
                .filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </Select>
          </Campo>
          <Campo rotulo="Data limite" id="td-lim">
            <Input id="td-lim" type="date" value={t.dataLimite} onChange={(e) => e.target.value && atualizarTarefa(t.id, { dataLimite: e.target.value })} />
          </Campo>
          <Campo rotulo="Prioridade" id="td-pri">
            <Select id="td-pri" value={t.prioridade} onChange={(e) => atualizarTarefa(t.id, { prioridade: e.target.value as Prioridade })}>
              {['Alta', 'Média', 'Baixa'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Campo>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimativa {horas(t.estimativaMin)} · lançado {horas(lancado)} · criada por {q.nomeUsuario(t.criadoPorId)}
          {!podeDistribuir && ' · Somente a controladoria e sócios reatribuem tarefas.'}
        </p>
      </div>
    </Dialog>
  )
}

function NovaTarefaDialog({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { db, usuario, criarTarefa } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [processoId, setProcessoId] = useState('')
  const [resp, setResp] = useState(usuario.id)
  const [limite, setLimite] = useState(dataReferencia())
  const [prioridade, setPrioridade] = useState<Prioridade>('Média')
  const [estimativa, setEstimativa] = useState(60)
  const podeDistribuir = pode(usuario.perfil, 'distribuirTarefas')
  useEffect(() => {
    if (aberta) {
      setTitulo('')
      setProcessoId(db.processos.find((p) => p.responsavelId === usuario.id)?.id ?? db.processos[0].id)
      setResp(['advogado', 'socio', 'estagiario'].includes(usuario.perfil) ? usuario.id : 'u1')
      setLimite(dataReferencia())
    }
  }, [aberta, db.processos, usuario])
  return (
    <Dialog
      aberto={aberta}
      aoFechar={aoFechar}
      titulo="Nova tarefa"
      rodape={
        <>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nova-tarefa">
            Criar tarefa
          </Button>
        </>
      }
    >
      <form
        id="form-nova-tarefa"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!titulo.trim()) return toast('Informe o título da tarefa.', { tipo: 'erro' })
          criarTarefa({ titulo: titulo.trim(), processoId, responsavelId: resp, dataLimite: limite, prioridade, status: 'A fazer', estimativaMin: estimativa })
          toast('Tarefa criada.')
          aoFechar()
        }}
      >
        <Campo rotulo="Título" id="nt-titulo" className="sm:col-span-2">
          <Input id="nt-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Ex.: Elaborar memoriais" />
        </Campo>
        <Campo rotulo="Processo" id="nt-proc" className="sm:col-span-2">
          <Select id="nt-proc" value={processoId} onChange={(e) => setProcessoId(e.target.value)}>
            {db.processos.map((p) => (
              <option key={p.id} value={p.id}>
                {q.cliente(p.clienteId)?.nome} · {p.numero}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Responsável" id="nt-resp">
          <Select id="nt-resp" value={resp} onChange={(e) => setResp(e.target.value)} disabled={!podeDistribuir}>
            {db.usuarios
              .filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </Select>
        </Campo>
        <Campo rotulo="Data limite" id="nt-lim">
          <Input id="nt-lim" type="date" value={limite} onChange={(e) => setLimite(e.target.value)} required />
        </Campo>
        <Campo rotulo="Prioridade" id="nt-pri">
          <Select id="nt-pri" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
            {['Alta', 'Média', 'Baixa'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Estimativa" id="nt-est">
          <Select id="nt-est" value={estimativa} onChange={(e) => setEstimativa(Number(e.target.value))}>
            {[30, 60, 120, 180, 240, 480].map((m) => (
              <option key={m} value={m}>
                {horas(m)}
              </option>
            ))}
          </Select>
        </Campo>
      </form>
    </Dialog>
  )
}

function PainelControladoria({ aoAbrir }: { aoAbrir: (t: Tarefa) => void }) {
  const { db, usuario, atualizarTarefa } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [sobre, setSobre] = useState<string | null>(null)
  const ref = dataReferencia()
  const podeDistribuir = pode(usuario.perfil, 'distribuirTarefas')
  const pessoas = db.usuarios.filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
  const abertas = db.tarefas.filter((t) => t.status !== 'Concluída')
  const atrasadas = abertas.filter((t) => t.dataLimite < ref).sort((a, b) => a.dataLimite.localeCompare(b.dataLimite))
  const carga = pessoas.map((u) => {
    const minhas = abertas.filter((t) => t.responsavelId === u.id)
    return { u, tarefas: minhas, horas: minhas.reduce((s, t) => s + t.estimativaMin, 0), atrasadas: minhas.filter((t) => t.dataLimite < ref).length }
  })
  const maxHoras = Math.max(...carga.map((c) => c.horas), 1)
  const etapas = (['A fazer', 'Em andamento', 'Em revisão'] as StatusTarefa[]).map((s) => ({ s, total: abertas.filter((t) => t.status === s).length, atrasadas: abertas.filter((t) => t.status === s && t.dataLimite < ref).length }))
  const maxEtapa = Math.max(...etapas.map((e) => e.total), 1)

  const reatribuir = (tarefaId: string, pessoaId: string) => {
    const t = db.tarefas.find((x) => x.id === tarefaId)
    if (!t || t.responsavelId === pessoaId) return
    atualizarTarefa(tarefaId, { responsavelId: pessoaId })
    toast(`“${t.titulo}” reatribuída a ${q.nomeUsuario(pessoaId)}.`, { acao: { rotulo: 'Desfazer', aoClicar: () => atualizarTarefa(tarefaId, { responsavelId: t.responsavelId }) } })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gargalos por etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {etapas.map((e) => (
                <li key={e.s} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{e.s}</span>
                    <span className="tabular-nums">
                      {e.total} abertas{e.atrasadas > 0 && <strong className="text-red-700 dark:text-red-300"> · {e.atrasadas} atrasadas</strong>}
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="bg-red-600" style={{ width: `${(e.atrasadas / maxEtapa) * 100}%` }} />
                    <div className="bg-primary" style={{ width: `${((e.total - e.atrasadas) / maxEtapa) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tarefas atrasadas ({atrasadas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {atrasadas.length ? (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {atrasadas.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
                    <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => aoAbrir(t)}>
                      {t.titulo} · {q.clienteDoProcesso(t.processoId)?.nome}
                    </button>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {q.nomeUsuario(t.responsavelId).split(' ')[0]} · {fmtData(t.dataLimite)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="carga">
        <h2 id="carga" className="mb-1 text-base font-semibold">
          Carga por pessoa
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{podeDistribuir ? 'Arraste uma tarefa para outra pessoa ou use o seletor “Reatribuir”.' : 'Somente a controladoria e sócios reatribuem tarefas.'}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {carga.map(({ u, tarefas, horas: h, atrasadas: at }) => (
            <Card
              key={u.id}
              onDragOver={(e) => {
                if (!podeDistribuir) return
                e.preventDefault()
                setSobre(u.id)
              }}
              onDragLeave={() => setSobre(null)}
              onDrop={(e) => {
                e.preventDefault()
                setSobre(null)
                reatribuir(e.dataTransfer.getData('text/tarefa'), u.id)
              }}
              className={cn(sobre === u.id && 'ring-2 ring-ring')}
            >
              <CardHeader>
                <span className="flex items-center gap-2">
                  <Avatar nome={u.nome} id={u.id} />
                  <span>
                    <span className="block text-sm font-semibold">{u.nome}</span>
                    <span className="block text-xs text-muted-foreground">{u.cargo}</span>
                  </span>
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <strong>{tarefas.length}</strong> abertas · <strong>{horas(h)}</strong> estimadas
                  {at > 0 && <span className="font-semibold text-red-700 dark:text-red-300"> · {at} atrasadas</span>}
                </p>
                <div className="mb-3 mt-1 h-2 rounded-full bg-muted" aria-hidden>
                  <div className={cn('h-full rounded-full', h > 2400 ? 'bg-red-600' : 'bg-primary')} style={{ width: `${(h / maxHoras) * 100}%` }} />
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {tarefas.slice(0, 12).map((t) => (
                    <li
                      key={t.id}
                      draggable={podeDistribuir}
                      onDragStart={(e) => e.dataTransfer.setData('text/tarefa', t.id)}
                      className={cn('flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs', podeDistribuir && 'cursor-grab')}
                    >
                      <button type="button" onClick={() => aoAbrir(t)} className="min-w-0 flex-1 truncate text-left hover:underline">
                        {t.titulo}
                      </button>
                      {podeDistribuir && (
                        <Select aria-label={`Reatribuir “${t.titulo}”`} value={u.id} onChange={(e) => reatribuir(t.id, e.target.value)} className="min-h-9 w-24 px-1 text-xs md:min-h-8">
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome.split(' ')[0]}
                            </option>
                          ))}
                        </Select>
                      )}
                    </li>
                  ))}
                </ul>
                {tarefas.length > 12 && <p className="mt-1 text-xs text-muted-foreground">+{tarefas.length - 12} tarefas</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
