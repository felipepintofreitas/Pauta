import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Inbox, Plus, CalendarCheck2, ShieldAlert, Timer, Wallet, ListChecks, Info, ArrowRight, Clock3, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import type { Prazo, Tarefa } from '@/data/tipos'
import { NOMES_PERFIL } from '@/data/tipos'
import { hojeISO, inicioDaSemana, inicioDoMes, fimDoMes, somarDias } from '@/lib/datas'
import { dataPorExtenso, horas, reais, data as fmtData } from '@/lib/formato'
import { urgencia, dataReferencia, ORDEM_URGENCIA, TITULO_GRUPO, calendarioNacional, type NivelUrgencia } from '@/lib/urgencia'
import { diasUteisEntre } from '@/lib/prazo'
import { resumoCliente, somaMinutos } from '@/lib/negocio'
import { useCarregando } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, LinkBotao } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/form'
import { EstadoVazio } from '@/components/ui/empty-state'
import { Skeleton, SkeletonLista } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PrazoDetalheDialog, PrazoItem } from '@/components/PrazoDetalhe'
import { UrgenciaBadge } from '@/components/Urgencia'
import { Pessoa } from '@/components/Avatar'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function AvisoFimDeSemana() {
  const hoje = hojeISO()
  const ref = dataReferencia(hoje)
  if (ref === hoje) return null
  return (
    <p className="mb-4 flex items-start gap-2 rounded-md border bg-card p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      Hoje não é dia útil ({calendarioNacional.motivoNaoUtil(hoje)?.toLowerCase()}). Prazos e tarefas mostram a pauta do próximo dia útil, {dataPorExtenso(ref)}.
    </p>
  )
}

export function MeuDia() {
  const { usuario } = useApp()
  const carregando = useCarregando()
  const primeiroNome = usuario.nome.split(' ')[0]
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{dataPorExtenso(hojeISO())}</p>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {usuario.cargo} · {NOMES_PERFIL[usuario.perfil]}
        </p>
      </div>
      <AvisoFimDeSemana />
      {carregando ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-20 lg:col-span-3" />
          <div className="lg:col-span-2">
            <SkeletonLista linhas={4} />
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : usuario.perfil === 'socio' ? (
        <PainelSocio />
      ) : usuario.perfil === 'financeiro' ? (
        <PainelFinanceiro />
      ) : (
        <PainelOperacional />
      )}
    </div>
  )
}

function useMeusPrazos() {
  const { db, usuario } = useApp()
  return useMemo(() => {
    if (usuario.perfil === 'controladoria') return db.prazos
    if (usuario.perfil === 'estagiario') {
      const ids = new Set(db.tarefas.filter((t) => t.responsavelId === usuario.id && t.prazoId).map((t) => t.prazoId))
      return db.prazos.filter((p) => ids.has(p.id))
    }
    return db.prazos.filter((p) => p.responsavelId === usuario.id)
  }, [db, usuario])
}

function FaixaAlertas({ prazos }: { prazos: Prazo[] }) {
  const { db, usuario } = useApp()
  const vencidos = prazos.filter((p) => !p.cumprido && urgencia(p.dataFatal).nivel === 'vencido').length
  const hoje = prazos.filter((p) => !p.cumprido && urgencia(p.dataFatal).nivel === 'hoje').length
  const intimacoes =
    usuario.perfil === 'controladoria'
      ? db.intimacoes.filter((i) => i.status === 'Nova' || i.status === 'Classificada').length
      : db.intimacoes.filter((i) => i.responsavelId === usuario.id && i.status === 'Classificada').length
  const semConferencia = usuario.perfil === 'controladoria' ? db.prazos.filter((p) => !p.cumprido && p.conferencia === 'Pendente').length : 0
  const itens = [
    vencidos && { icone: AlertTriangle, texto: `${vencidos} ${vencidos === 1 ? 'prazo vencido' : 'prazos vencidos'} sem cumprimento`, classe: 'urg-vencido', to: '/prazos?filtro=vencidos' },
    hoje && { icone: Clock3, texto: `${hoje} ${hoje === 1 ? 'prazo vence' : 'prazos vencem'} ${dataReferencia() === hojeISO() ? 'hoje' : 'no próximo dia útil'}`, classe: 'urg-hoje', to: '/prazos?filtro=hoje' },
    intimacoes && { icone: Inbox, texto: `${intimacoes} ${intimacoes === 1 ? 'intimação aguardando' : 'intimações aguardando'} ação`, classe: 'urg-ate3', to: usuario.perfil === 'controladoria' ? '/intimacoes' : undefined },
    semConferencia && { icone: ShieldAlert, texto: `${semConferencia} prazos sem conferência`, classe: 'urg-ate7', to: '/prazos?conferencia=Pendente' },
  ].filter(Boolean) as { icone: typeof AlertTriangle; texto: string; classe: string; to?: string }[]

  if (!itens.length)
    return (
      <p className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden /> Nada vencido nem vencendo hoje. Bom trabalho.
      </p>
    )
  return (
    <section aria-label="Alertas" className="flex flex-wrap gap-2">
      {itens.map((i) => {
        const conteudo = (
          <>
            <i.icone className="size-4 shrink-0" aria-hidden /> {i.texto}
            {i.to && <ArrowRight className="size-4" aria-hidden />}
          </>
        )
        const classe = cn('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold', i.classe)
        return i.to ? (
          <Link key={i.texto} to={i.to} className={cn(classe, 'hover:underline')}>
            {conteudo}
          </Link>
        ) : (
          <p key={i.texto} className={classe}>
            {conteudo}
          </p>
        )
      })}
    </section>
  )
}

function BlocoPrazos({ prazos }: { prazos: Prazo[] }) {
  const [aberto, setAberto] = useState<string | null>(null)
  const ref = dataReferencia()
  const grupos = useMemo(() => {
    const g: Partial<Record<NivelUrgencia, Prazo[]>> = {}
    for (const p of prazos) {
      if (p.cumprido) continue
      const u = urgencia(p.dataFatal)
      if (u.nivel === 'normal') continue
      ;(g[u.nivel] ??= []).push(p)
    }
    for (const l of Object.values(g)) l!.sort((a, b) => a.dataFatal.localeCompare(b.dataFatal))
    return g
  }, [prazos])
  const vazio = !Object.keys(grupos).length
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prazos dos próximos 7 dias úteis</CardTitle>
        <Link to="/prazos" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {vazio ? (
          <EstadoVazio icone={CalendarCheck2} titulo="Nenhum prazo nos próximos 7 dias úteis" descricao="Quando um prazo for lançado para você, ele aparece aqui agrupado por urgência." />
        ) : (
          ORDEM_URGENCIA.filter((n) => grupos[n]).map((n) => (
            <section key={n} aria-label={TITULO_GRUPO[n]}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {n === 'hoje' && ref !== hojeISO() ? 'Vencem no próximo dia útil' : TITULO_GRUPO[n]} ({grupos[n]!.length})
              </h3>
              <ul className="space-y-2">
                {grupos[n]!.map((p) => (
                  <PrazoItem key={p.id} prazo={p} aoAbrir={(x) => setAberto(x.id)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
      <PrazoDetalheDialog prazoId={aberto} aoFechar={() => setAberto(null)} />
    </Card>
  )
}

export function useConcluirTarefa() {
  const { atualizarTarefa, cronometro, pararCronometro } = useApp()
  const { abrirLancamento } = useUi()
  const { toast } = useToast()
  return (t: Tarefa) => {
    atualizarTarefa(t.id, { status: 'Concluída' })
    let minutos: number | undefined
    if (cronometro.tarefaId === t.id && (cronometro.iniciadoEm || cronometro.acumuladoMs)) minutos = pararCronometro().minutos
    toast(`Tarefa “${t.titulo}” concluída.`, { acao: { rotulo: 'Desfazer', aoClicar: () => atualizarTarefa(t.id, { status: t.status }) } })
    abrirLancamento({ processoId: t.processoId, tarefaId: t.id, descricao: t.titulo, minutos, origem: 'tarefa' })
  }
}

function BlocoTarefas() {
  const { db, usuario } = useApp()
  const q = useConsultas()
  const concluir = useConcluirTarefa()
  const ref = dataReferencia()
  const tarefas = db.tarefas
    .filter((t) => t.responsavelId === usuario.id && t.status !== 'Concluída' && t.dataLimite <= ref)
    .sort((a, b) => a.dataLimite.localeCompare(b.dataLimite))
  const concluidasHoje = db.tarefas.filter((t) => t.responsavelId === usuario.id && t.concluidaEm === hojeISO()).length
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas tarefas de hoje</CardTitle>
        <span className="text-xs text-muted-foreground">{concluidasHoje} concluídas hoje</span>
      </CardHeader>
      <CardContent>
        {!tarefas.length ? (
          <EstadoVazio icone={ListChecks} titulo="Nenhuma tarefa para hoje" descricao="Veja as próximas tarefas no quadro ou peça uma nova distribuição à controladoria." acao={<Link className="text-sm font-medium text-primary underline" to="/tarefas">Abrir tarefas</Link>} />
        ) : (
          <ul className="divide-y">
            {tarefas.map((t) => {
              const prazo = q.prazo(t.prazoId)
              const p = q.processo(t.processoId)
              return (
                <li key={t.id} className="flex items-start gap-3 py-2">
                  <label className="grid size-11 shrink-0 cursor-pointer place-items-center" title="Concluir tarefa">
                    <Checkbox checked={false} onChange={() => concluir(t)} aria-label={`Concluir “${t.titulo}”`} />
                  </label>
                  <div className="min-w-0 flex-1 py-1">
                    <p className="text-sm font-medium">{t.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.cliente(p?.clienteId)?.nome} · {p?.numero}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {prazo && <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />}
                      {t.dataLimite < ref && <span className="text-xs font-medium text-red-700 dark:text-red-300">Atrasada desde {fmtData(t.dataLimite)}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function BlocoHoras() {
  const { db, usuario } = useApp()
  const { abrirLancamento } = useUi()
  const hoje = hojeISO()
  const lancado = somaMinutos(db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data === hoje))
  const meta = db.config.metaDiariaMin
  const pct = Math.min(100, Math.round((lancado / meta) * 100))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas horas hoje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tabular-nums">
          {horas(lancado)} <span className="text-base font-normal text-muted-foreground">de {horas(meta)}</span>
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Horas lançadas em relação à meta diária">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{lancado >= meta ? 'Meta diária atingida.' : `Faltam ${horas(meta - lancado)} para a meta diária.`}</p>
        <Button className="w-full" size="lg" onClick={() => abrirLancamento()}>
          <Plus /> Lançar horas
        </Button>
        <Link to="/timesheet" className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ver minha semana
        </Link>
      </CardContent>
    </Card>
  )
}

function PainelOperacional() {
  const { usuario } = useApp()
  const prazos = useMeusPrazos()
  return (
    <div className="space-y-4">
      <FaixaAlertas prazos={prazos} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="lg:hidden">
            <BlocoHoras />
          </div>
          {usuario.perfil !== 'estagiario' || prazos.length ? <BlocoPrazos prazos={prazos} /> : null}
          <BlocoTarefas />
        </div>
        <div className="hidden space-y-4 lg:block">
          <BlocoHoras />
          {usuario.perfil === 'controladoria' && <AtalhosControladoria />}
        </div>
      </div>
    </div>
  )
}

function AtalhosControladoria() {
  const { db } = useApp()
  const novas = db.intimacoes.filter((i) => i.status === 'Nova').length
  const conferir = db.intimacoes.filter((i) => i.status === 'Prazo lançado').length
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fila da controladoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Link to="/intimacoes" className="flex min-h-11 items-center justify-between rounded-md border px-3 hover:bg-muted">
          Intimações novas <strong>{novas}</strong>
        </Link>
        <Link to="/intimacoes?aba=Prazo%20lan%C3%A7ado" className="flex min-h-11 items-center justify-between rounded-md border px-3 hover:bg-muted">
          Aguardando conferência <strong>{conferir}</strong>
        </Link>
        <Link to="/tarefas?visao=painel" className="flex min-h-11 items-center justify-between rounded-md border px-3 hover:bg-muted">
          Carga da equipe <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}

function Indicador({ titulo, valor, detalhe, icone: Icone, classe, to }: { titulo: string; valor: string; detalhe?: string; icone: typeof Timer; classe?: string; to?: string }) {
  const conteudo = (
    <Card className={cn('h-full', to && 'transition-colors hover:bg-muted/50')}>
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-md border', classe ?? 'bg-secondary text-secondary-foreground border-transparent')}>
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-semibold tabular-nums">{valor}</p>
          {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        </div>
      </CardContent>
    </Card>
  )
  return to ? (
    <Link to={to} className="block rounded-lg">
      {conteudo}
    </Link>
  ) : (
    conteudo
  )
}

function PainelSocio() {
  const { db } = useApp()
  const q = useConsultas()
  const [aberto, setAberto] = useState<string | null>(null)
  const hoje = hojeISO()
  const ativos = db.prazos.filter((p) => !p.cumprido)
  const vencidos = ativos.filter((p) => urgencia(p.dataFatal).nivel === 'vencido')
  const vencemHoje = ativos.filter((p) => urgencia(p.dataFatal).nivel === 'hoje')
  const semConferencia = ativos.filter((p) => p.conferencia === 'Pendente')
  const semConferenciaProximos = semConferencia.filter((p) => diasUteisEntre(dataReferencia(), p.dataFatal, calendarioNacional) <= 7)
  const semana = inicioDaSemana(hoje)
  const lancSemana = db.lancamentos.filter((l) => l.data >= semana && l.data <= hoje)
  const faturaveisSemana = somaMinutos(lancSemana.filter((l) => l.faturavel))
  const totalSemana = somaMinutos(lancSemana)
  const inicioMes = inicioDoMes(hoje)
  const aFaturar = db.clientes.reduce((s, c) => s + resumoCliente(db, c, inicioMes, fimDoMes(hoje)).total, 0)
  const porPessoa = db.usuarios
    .filter((u) => u.perfil !== 'financeiro' && u.perfil !== 'controladoria')
    .map((u) => ({ u, min: somaMinutos(lancSemana.filter((l) => l.usuarioId === u.id && l.faturavel)) }))
    .sort((a, b) => b.min - a.min)
  const max = Math.max(...porPessoa.map((p) => p.min), 1)
  const risco = [...vencidos, ...vencemHoje, ...semConferenciaProximos.filter((p) => !vencidos.includes(p) && !vencemHoje.includes(p))]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Prazos vencidos" valor={String(vencidos.length)} detalhe="sem cumprimento registrado" icone={AlertTriangle} classe="urg-vencido" to="/prazos?filtro=vencidos" />
        <Indicador titulo="Prazos sem conferência" valor={String(semConferencia.length)} detalhe={`${semConferenciaProximos.length} vencem em até 7 dias úteis`} icone={ShieldAlert} classe="urg-ate7" to="/prazos?conferencia=Pendente" />
        <Indicador titulo="Horas faturáveis da equipe (semana)" valor={horas(faturaveisSemana)} detalhe={`de ${horas(totalSemana)} lançadas`} icone={Timer} />
        <Indicador titulo="Valor a faturar no mês" valor={reais(aFaturar)} detalhe="horas aprovadas + mensalidades" icone={Wallet} to="/honorarios" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Prazos em risco</CardTitle>
            <span className="text-xs text-muted-foreground">vencidos, vencendo e sem conferência</span>
          </CardHeader>
          <CardContent>
            {risco.length ? (
              <ul className="space-y-2">
                {risco.slice(0, 8).map((p) => (
                  <PrazoItem key={p.id} prazo={p} aoAbrir={(x) => setAberto(x.id)} />
                ))}
              </ul>
            ) : (
              <EstadoVazio icone={CalendarCheck2} titulo="Nenhum prazo em risco" descricao="Todos os prazos próximos estão conferidos." />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Horas faturáveis por pessoa (semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {porPessoa.map(({ u, min }) => (
                <li key={u.id} className="text-sm">
                  <div className="mb-1 flex justify-between gap-2">
                    <Pessoa nome={u.nome} id={u.id} />
                    <span className="tabular-nums">{horas(min)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(min / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Semana de {fmtData(semana)} a {fmtData(somarDias(semana, 6))}. Inclui {q.nomeUsuario('u4')} (estagiário).</p>
          </CardContent>
        </Card>
      </div>
      <PrazoDetalheDialog prazoId={aberto} aoFechar={() => setAberto(null)} />
    </div>
  )
}

function PainelFinanceiro() {
  const { db } = useApp()
  const hoje = hojeISO()
  const enviados = db.lancamentos.filter((l) => l.status === 'Enviado')
  const inicioMes = inicioDoMes(hoje)
  const aFaturar = db.clientes.reduce((s, c) => s + resumoCliente(db, c, inicioMes, fimDoMes(hoje)).total, 0)
  const aReceber = db.preFaturas.filter((p) => p.status === 'Faturada')
  const preFaturasAbertas = db.preFaturas.filter((p) => p.status === 'A faturar')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Horas aguardando aprovação" valor={horas(somaMinutos(enviados))} detalhe={`${enviados.length} lançamentos`} icone={Timer} classe="urg-ate7" to="/timesheet?visao=aprovacao" />
        <Indicador titulo="Valor a faturar no mês" valor={reais(aFaturar)} detalhe="horas aprovadas + mensalidades" icone={Wallet} to="/honorarios" />
        <Indicador titulo="Pré-faturas a emitir" valor={String(preFaturasAbertas.length)} detalhe={reais(preFaturasAbertas.reduce((s, p) => s + p.total, 0))} icone={ListChecks} to="/honorarios?aba=prefaturas" />
        <Indicador titulo="A receber" valor={reais(aReceber.reduce((s, p) => s + p.total, 0))} detalhe={`${aReceber.length} faturas emitidas`} icone={Clock3} to="/honorarios?aba=prefaturas" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <LinkBotao to="/timesheet?visao=aprovacao" variant="outline" className="justify-between">
            Aprovar horas enviadas <ArrowRight />
          </LinkBotao>
          <LinkBotao to="/honorarios" variant="outline" className="justify-between">
            Gerar pré-faturas do período <ArrowRight />
          </LinkBotao>
        </CardContent>
      </Card>
    </div>
  )
}
