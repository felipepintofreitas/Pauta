import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck2, ChevronLeft, ChevronRight, Filter, X, AlertTriangle } from 'lucide-react'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import type { Prazo } from '@/data/tipos'
import { TRIBUNAIS } from '@/data/feriados'
import { hojeISO, inicioDaSemana, inicioDoMes, somarDias, somarMeses, diaDaSemana, fimDoMes } from '@/lib/datas'
import { mesAno, diaSemanaCurto, dataCurta } from '@/lib/formato'
import { urgencia, ORDEM_URGENCIA, TITULO_GRUPO, dataReferencia, type NivelUrgencia } from '@/lib/urgencia'
import { vePropriosPorPadrao } from '@/lib/permissoes'
import { useCarregando } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Campo, Checkbox, Select } from '@/components/ui/form'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { PrazoDetalheDialog, PrazoItem } from '@/components/PrazoDetalhe'

type Visao = 'lista' | 'mes' | 'semana'

export function Prazos() {
  const { db, usuario } = useApp()
  const q = useConsultas()
  const [params] = useSearchParams()
  const [visao, setVisao] = useState<Visao>('lista')
  const [responsavel, setResponsavel] = useState(vePropriosPorPadrao(usuario.perfil) ? usuario.id : '')
  const [equipe, setEquipe] = useState('')
  const [cliente, setCliente] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [conferencia, setConferencia] = useState(params.get('conferencia') ?? '')
  const [rapido, setRapido] = useState(params.get('filtro') ?? '')
  const [mostrarCumpridos, setMostrarCumpridos] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(!!(params.get('conferencia') || params.get('filtro')))
  const [aberto, setAberto] = useState<string | null>(null)
  const [mesRef, setMesRef] = useState(inicioDoMes(hojeISO()))
  const [semanaRef, setSemanaRef] = useState(inicioDaSemana(dataReferencia()))
  const carregando = useCarregando(400, visao)

  const filtrados = useMemo(
    () =>
      db.prazos.filter((p) => {
        const proc = q.processo(p.processoId)!
        if (responsavel && p.responsavelId !== responsavel) return false
        if (equipe && proc.equipe !== equipe) return false
        if (cliente && proc.clienteId !== cliente) return false
        if (tribunal && proc.tribunal !== tribunal) return false
        if (conferencia && p.conferencia !== conferencia) return false
        if (rapido) {
          const n = urgencia(p.dataFatal, p.cumprido).nivel
          if (rapido === 'vencidos' && n !== 'vencido') return false
          if (rapido === 'hoje' && n !== 'hoje') return false
        }
        if (!mostrarCumpridos && p.cumprido && visao === 'lista') return false
        return true
      }),
    [db.prazos, responsavel, equipe, cliente, tribunal, conferencia, rapido, mostrarCumpridos, visao, q],
  )

  const filtrosAtivos = [responsavel, equipe, cliente, tribunal, conferencia, rapido].filter(Boolean).length
  const limpar = () => {
    setResponsavel('')
    setEquipe('')
    setCliente('')
    setTribunal('')
    setConferencia('')
    setRapido('')
  }

  const grupos = useMemo(() => {
    const g: Partial<Record<NivelUrgencia, Prazo[]>> = {}
    for (const p of filtrados) (g[urgencia(p.dataFatal, p.cumprido).nivel] ??= []).push(p)
    for (const [n, l] of Object.entries(g)) l!.sort((a, b) => (n === 'cumprido' ? b.dataFatal.localeCompare(a.dataFatal) : a.dataFatal.localeCompare(b.dataFatal)))
    return g
  }, [filtrados])

  const abrir = (p: Prazo) => setAberto(p.id)

  return (
    <div>
      <CabecalhoPagina titulo="Prazos" descricao={responsavel === usuario.id ? 'Mostrando os seus prazos. Use os filtros para ver os da equipe.' : 'Todos os prazos do escritório conforme os filtros.'} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs
          rotulo="Visão"
          valor={visao}
          aoMudar={setVisao}
          abas={[
            { valor: 'lista', rotulo: 'Lista' },
            { valor: 'mes', rotulo: 'Mês' },
            { valor: 'semana', rotulo: 'Semana' },
          ]}
        />
        <Button variant="outline" onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos} aria-controls="filtros-prazos">
          <Filter /> Filtros {filtrosAtivos > 0 && <Badge>{filtrosAtivos}</Badge>}
        </Button>
        {visao === 'lista' && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={mostrarCumpridos} onChange={(e) => setMostrarCumpridos(e.target.checked)} /> Mostrar cumpridos
          </label>
        )}
      </div>

      {filtrosAbertos && (
        <div id="filtros-prazos" className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Campo rotulo="Responsável" id="pz-resp">
            <Select id="pz-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
              <option value="">Todos</option>
              {db.usuarios
                .filter((u) => ['advogado', 'socio'].includes(u.perfil))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </Select>
          </Campo>
          <Campo rotulo="Equipe" id="pz-eq">
            <Select id="pz-eq" value={equipe} onChange={(e) => setEquipe(e.target.value)}>
              <option value="">Todas</option>
              {['Cível', 'Trabalhista', 'Tributário'].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Cliente" id="pz-cli">
            <Select id="pz-cli" value={cliente} onChange={(e) => setCliente(e.target.value)}>
              <option value="">Todos</option>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Tribunal" id="pz-trib">
            <Select id="pz-trib" value={tribunal} onChange={(e) => setTribunal(e.target.value)}>
              <option value="">Todos</option>
              {TRIBUNAIS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Conferência" id="pz-conf">
            <Select id="pz-conf" value={conferencia} onChange={(e) => setConferencia(e.target.value)}>
              <option value="">Todas</option>
              <option value="Pendente">Sem conferência</option>
              <option value="Conferido">Conferido</option>
            </Select>
          </Campo>
          <Campo rotulo="Situação" id="pz-sit">
            <Select id="pz-sit" value={rapido} onChange={(e) => setRapido(e.target.value)}>
              <option value="">Todas</option>
              <option value="vencidos">Vencidos</option>
              <option value="hoje">Vencem hoje</option>
            </Select>
          </Campo>
          {filtrosAtivos > 0 && (
            <Button variant="ghost" className="justify-self-start" onClick={limpar}>
              <X /> Limpar filtros
            </Button>
          )}
        </div>
      )}

      {carregando ? (
        <SkeletonLista />
      ) : visao === 'lista' ? (
        !filtrados.length ? (
          <EstadoVazio
            icone={CalendarCheck2}
            titulo="Nenhum prazo encontrado"
            descricao={filtrosAtivos ? 'Limpe os filtros para ver todos os prazos.' : 'Prazos lançados a partir das intimações aparecem aqui.'}
            acao={filtrosAtivos ? <Button onClick={limpar}>Limpar filtros</Button> : undefined}
          />
        ) : (
          <div className="space-y-5">
            {ORDEM_URGENCIA.filter((n) => grupos[n]).map((n) => (
              <section key={n} aria-label={TITULO_GRUPO[n]}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {TITULO_GRUPO[n]} ({grupos[n]!.length})
                </h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {grupos[n]!.map((p) => (
                    <PrazoItem key={p.id} prazo={p} aoAbrir={abrir} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : visao === 'mes' ? (
        <CalendarioMes prazos={filtrados} mesRef={mesRef} setMesRef={setMesRef} aoAbrir={abrir} />
      ) : (
        <CalendarioSemana prazos={filtrados} semanaRef={semanaRef} setSemanaRef={setSemanaRef} aoAbrir={abrir} />
      )}
      <PrazoDetalheDialog prazoId={aberto} aoFechar={() => setAberto(null)} />
    </div>
  )
}

function ChipPrazo({ prazo, aoAbrir }: { prazo: Prazo; aoAbrir: (p: Prazo) => void }) {
  const q = useConsultas()
  const u = urgencia(prazo.dataFatal, prazo.cumprido)
  const cliente = q.clienteDoProcesso(prazo.processoId)?.nome
  return (
    <button
      type="button"
      onClick={() => aoAbrir(prazo)}
      className={cn('flex w-full items-center gap-1 truncate rounded border px-1.5 py-1 text-left text-xs font-medium', `urg-${u.nivel}`)}
      aria-label={`${prazo.tipo}, ${cliente}, ${u.rotulo}${prazo.conferencia === 'Pendente' ? ', sem conferência' : ''}`}
    >
      {(u.nivel === 'vencido' || u.nivel === 'hoje') && <AlertTriangle className="size-3 shrink-0" aria-hidden />}
      <span className="truncate">
        {prazo.tipo} · {cliente}
      </span>
    </button>
  )
}

function Legenda() {
  const itens: [NivelUrgencia, string][] = [
    ['vencido', 'Vencido ou vence hoje'],
    ['ate3', 'Até 3 dias úteis'],
    ['ate7', 'Até 7 dias úteis'],
    ['normal', 'Demais e cumpridos'],
  ]
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Legenda de urgência">
      {itens.map(([n, t]) => (
        <li key={n} className={cn('rounded border px-2 py-0.5', `urg-${n}`)}>
          {t}
        </li>
      ))}
    </ul>
  )
}

function Navegacao({ titulo, anterior, proximo, hoje }: { titulo: string; anterior: () => void; proximo: () => void; hoje: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={anterior} aria-label="Anterior">
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon" onClick={proximo} aria-label="Próximo">
        <ChevronRight />
      </Button>
      <Button variant="ghost" onClick={hoje}>
        Hoje
      </Button>
      <h2 className="ml-2 text-base font-semibold first-letter:uppercase" aria-live="polite">
        {titulo}
      </h2>
    </div>
  )
}

function CalendarioMes({ prazos, mesRef, setMesRef, aoAbrir }: { prazos: Prazo[]; mesRef: string; setMesRef: (s: string) => void; aoAbrir: (p: Prazo) => void }) {
  const hoje = hojeISO()
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const inicio = inicioDaSemana(mesRef)
  const fim = fimDoMes(mesRef)
  const semanas = Math.ceil((Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) + 1) / 7)
  const dias = Array.from({ length: semanas * 7 }, (_, i) => somarDias(inicio, i))
  const porDia = useMemo(() => {
    const m = new Map<string, Prazo[]>()
    for (const p of prazos) m.set(p.dataFatal, [...(m.get(p.dataFatal) ?? []), p])
    return m
  }, [prazos])
  const selecionados = diaSel ? porDia.get(diaSel) ?? [] : []
  return (
    <div>
      <Navegacao titulo={mesAno(mesRef)} anterior={() => setMesRef(somarMeses(mesRef, -1))} proximo={() => setMesRef(somarMeses(mesRef, 1))} hoje={() => setMesRef(inicioDoMes(hoje))} />
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted text-center text-xs font-semibold" aria-hidden>
          {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const lista = porDia.get(d) ?? []
            const foraDoMes = d.slice(0, 7) !== mesRef.slice(0, 7)
            const fimSemana = diaDaSemana(d) === 0 || diaDaSemana(d) === 6
            const pior = lista.map((p) => urgencia(p.dataFatal, p.cumprido).nivel).sort((a, b) => ORDEM_URGENCIA.indexOf(a) - ORDEM_URGENCIA.indexOf(b))[0]
            return (
              <div key={d} className={cn('min-h-14 border-b border-r p-1 md:min-h-28', foraDoMes && 'bg-muted/40 text-muted-foreground', fimSemana && !foraDoMes && 'bg-muted/20')}>
                <button
                  type="button"
                  onClick={() => setDiaSel(d)}
                  className={cn('flex w-full flex-col items-center rounded md:items-start', diaSel === d && 'ring-2 ring-ring')}
                  aria-label={`${dataCurta(d)}: ${lista.length} ${lista.length === 1 ? 'prazo' : 'prazos'}`}
                >
                  <span className={cn('grid size-7 place-items-center rounded-full text-xs font-medium', d === hoje && 'bg-primary text-primary-foreground')}>{Number(d.slice(8))}</span>
                  {lista.length > 0 && <span className={cn('mt-0.5 rounded px-1.5 text-[11px] font-semibold md:hidden', `urg-${pior}`)}>{lista.length}</span>}
                </button>
                <div className="mt-1 hidden space-y-1 md:block">
                  {lista.slice(0, 3).map((p) => (
                    <ChipPrazo key={p.id} prazo={p} aoAbrir={aoAbrir} />
                  ))}
                  {lista.length > 3 && (
                    <button type="button" className="px-1 text-xs font-medium text-primary hover:underline" onClick={() => setDiaSel(d)}>
                      +{lista.length - 3} mais
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Legenda />
      {diaSel && (
        <section className="mt-4" aria-live="polite">
          <h3 className="mb-2 font-semibold">
            Prazos em {dataCurta(diaSel)} ({selecionados.length})
          </h3>
          {selecionados.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {selecionados.map((p) => (
                <PrazoItem key={p.id} prazo={p} aoAbrir={aoAbrir} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum prazo neste dia.</p>
          )}
        </section>
      )}
    </div>
  )
}

function CalendarioSemana({ prazos, semanaRef, setSemanaRef, aoAbrir }: { prazos: Prazo[]; semanaRef: string; setSemanaRef: (s: string) => void; aoAbrir: (p: Prazo) => void }) {
  const hoje = hojeISO()
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semanaRef, i))
  return (
    <div>
      <Navegacao
        titulo={`Semana de ${dataCurta(dias[0])} a ${dataCurta(dias[6])}`}
        anterior={() => setSemanaRef(somarDias(semanaRef, -7))}
        proximo={() => setSemanaRef(somarDias(semanaRef, 7))}
        hoje={() => setSemanaRef(inicioDaSemana(dataReferencia()))}
      />
      <div className="grid gap-2 md:grid-cols-7">
        {dias.map((d) => {
          const lista = prazos.filter((p) => p.dataFatal === d)
          return (
            <section key={d} className={cn('rounded-lg border bg-card p-2', d === hoje && 'border-primary')} aria-label={`${diaSemanaCurto(d)} ${dataCurta(d)}`}>
              <h3 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                <span className="capitalize">{diaSemanaCurto(d)}</span>
                <span className="text-xs text-muted-foreground">{dataCurta(d)}</span>
              </h3>
              {lista.length ? (
                <div className="space-y-1">
                  {lista.map((p) => (
                    <ChipPrazo key={p.id} prazo={p} aoAbrir={aoAbrir} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sem prazos</p>
              )}
            </section>
          )
        })}
      </div>
      <Legenda />
    </div>
  )
}
