import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Search, ExternalLink, Plus, X } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import { TRIBUNAIS } from '@/data/feriados'
import type { Prazo } from '@/data/tipos'
import { data as fmtData, horas, reais } from '@/lib/formato'
import { pode, vePropriosPorPadrao } from '@/lib/permissoes'
import { somaMinutos } from '@/lib/negocio'
import { useCarregando } from '@/lib/hooks'
import { normalizar } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button, LinkBotao } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox, Input, Select } from '@/components/ui/form'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { PrazoDetalheDialog, PrazoItem } from '@/components/PrazoDetalhe'
import { UrgenciaBadge } from '@/components/Urgencia'
import { Pessoa } from '@/components/Avatar'
import { BotaoIniciarCronometro } from '@/components/Cronometro'

export function Processos() {
  const { db, usuario } = useApp()
  const q = useConsultas()
  const [params] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [cliente, setCliente] = useState(params.get('cliente') ?? '')
  const [meus, setMeus] = useState(vePropriosPorPadrao(usuario.perfil) && usuario.perfil === 'advogado')
  const carregando = useCarregando()

  const lista = useMemo(() => {
    const t = normalizar(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    return db.processos.filter((p) => {
      if (meus && p.responsavelId !== usuario.id) return false
      if (area && p.area !== area) return false
      if (tribunal && p.tribunal !== tribunal) return false
      if (cliente && p.clienteId !== cliente) return false
      if (t) {
        const alvo = normalizar(`${p.numero} ${q.cliente(p.clienteId)?.nome} ${p.parteContraria}`)
        if (!alvo.includes(t) && !(digitos.length >= 4 && p.numero.replace(/\D/g, '').includes(digitos))) return false
      }
      return true
    })
  }, [db.processos, busca, area, tribunal, cliente, meus, usuario.id, q])

  const areas = Array.from(new Set(db.processos.map((p) => p.area))).sort()
  const filtros = [area, tribunal, cliente].filter(Boolean).length + (meus ? 1 : 0)

  return (
    <div>
      <CabecalhoPagina titulo="Processos" descricao={`${lista.length} de ${db.processos.length} processos`} />
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Buscar por número CNJ, cliente ou parte" placeholder="Número CNJ, cliente ou parte" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        <Select aria-label="Tribunal" value={tribunal} onChange={(e) => setTribunal(e.target.value)}>
          <option value="">Todos os tribunais</option>
          {TRIBUNAIS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select aria-label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Todos os clientes</option>
          {db.clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox checked={meus} onChange={(e) => setMeus(e.target.checked)} /> Só os meus
        </label>
      </div>
      {carregando ? (
        <SkeletonLista />
      ) : !lista.length ? (
        <EstadoVazio
          icone={FolderOpen}
          titulo="Nenhum processo encontrado"
          descricao="Confira o número (pode digitar só os 7 primeiros dígitos) ou limpe os filtros."
          acao={
            (filtros > 0 || busca) && (
              <Button
                onClick={() => {
                  setBusca('')
                  setArea('')
                  setTribunal('')
                  setCliente('')
                  setMeus(false)
                }}
              >
                <X /> Limpar busca e filtros
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {lista.map((p) => {
            const proximo = db.prazos.filter((z) => z.processoId === p.id && !z.cumprido).sort((a, b) => a.dataFatal.localeCompare(b.dataFatal))[0]
            return (
              <li key={p.id}>
                <Link to={`/processos/${p.id}`} className="block h-full rounded-lg border bg-card p-3 hover:bg-muted/50">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="break-all font-medium">{p.numero}</span>
                    {p.status !== 'Ativo' && <Badge variant="outline">{p.status}</Badge>}
                  </div>
                  <p className="text-sm">
                    {q.cliente(p.clienteId)?.nome} <span className="text-muted-foreground">x {p.parteContraria}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.tribunal} · {p.sistema} · {p.area} · {q.nomeUsuario(p.responsavelId)}
                  </p>
                  {proximo && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      Próximo prazo: {proximo.tipo} <UrgenciaBadge dataFatal={proximo.dataFatal} />
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type AbaFicha = 'resumo' | 'andamentos' | 'prazos' | 'tarefas' | 'horas' | 'documentos'

export function ProcessoDetalhe() {
  const { id } = useParams()
  const { db, usuario } = useApp()
  const { abrirLancamento } = useUi()
  const q = useConsultas()
  const [aba, setAba] = useState<AbaFicha>('resumo')
  const [prazoAberto, setPrazoAberto] = useState<string | null>(null)
  const p = db.processos.find((x) => x.id === id)
  if (!p) return <EstadoVazio icone={FolderOpen} titulo="Processo não encontrado" descricao="Volte à lista e busque pelo número CNJ." acao={<LinkBotao to="/processos">Ver processos</LinkBotao>} />
  const cliente = q.cliente(p.clienteId)!
  const prazos = db.prazos.filter((z) => z.processoId === p.id).sort((a, b) => b.dataFatal.localeCompare(a.dataFatal))
  const tarefas = db.tarefas.filter((t) => t.processoId === p.id).sort((a, b) => a.dataLimite.localeCompare(b.dataLimite))
  const lancs = db.lancamentos.filter((l) => l.processoId === p.id)
  const porPessoa = Array.from(new Set(lancs.map((l) => l.usuarioId))).map((u) => ({ u, min: somaMinutos(lancs.filter((l) => l.usuarioId === u)) }))
  const lanca = pode(usuario.perfil, 'lancarHoras')

  const Linha = ({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) => (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  )

  return (
    <div>
      <Link to="/processos" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Processos
      </Link>
      <CabecalhoPagina
        titulo={p.numero}
        descricao={
          <>
            {cliente.nome} x {p.parteContraria} · {p.tribunal} · {p.status}
          </>
        }
        acoes={
          lanca && (
            <>
              <BotaoIniciarCronometro processoId={p.id} />
              <Button onClick={() => abrirLancamento({ processoId: p.id })}>
                <Plus /> Lançar horas
              </Button>
            </>
          )
        }
      />
      <Tabs
        rotulo="Seções do processo"
        valor={aba}
        aoMudar={setAba}
        className="mb-4 max-w-full"
        abas={[
          { valor: 'resumo', rotulo: 'Resumo' },
          { valor: 'andamentos', rotulo: `Andamentos (${p.andamentos.length})` },
          { valor: 'prazos', rotulo: `Prazos (${prazos.length})` },
          { valor: 'tarefas', rotulo: `Tarefas (${tarefas.length})` },
          { valor: 'horas', rotulo: 'Horas' },
          { valor: 'documentos', rotulo: 'Documentos' },
        ]}
      />
      <Card>
        <CardContent className="p-4">
          {aba === 'resumo' && (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Linha rotulo="Cliente" valor={`${cliente.nome} (${cliente.tipo} · ${cliente.documento})`} />
              <Linha rotulo="Polo do cliente" valor={p.polo === 'ativo' ? 'Ativo (autor)' : 'Passivo (réu)'} />
              <Linha rotulo="Parte contrária" valor={p.parteContraria} />
              <Linha rotulo="Tribunal" valor={p.tribunal} />
              <Linha rotulo="Sistema" valor={p.sistema} />
              <Linha rotulo="Vara/órgão" valor={p.orgao} />
              <Linha rotulo="Área" valor={p.area} />
              <Linha rotulo="Equipe" valor={p.equipe} />
              <Linha rotulo="Responsável" valor={<Pessoa nome={q.nomeUsuario(p.responsavelId)} id={p.responsavelId} />} />
              <Linha rotulo="Valor da causa" valor={reais(p.valorCausa)} />
              <Linha rotulo="Status" valor={p.status} />
              <Linha rotulo="Contato do cliente" valor={`${cliente.contato.nome} · ${cliente.contato.telefone}`} />
            </dl>
          )}
          {aba === 'andamentos' && (
            <ol className="relative space-y-4 border-l pl-4">
              {p.andamentos.map((a) => (
                <li key={a.id}>
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                  <p className="text-xs text-muted-foreground">
                    {fmtData(a.data)} · {a.origem}
                  </p>
                  <p className="text-sm">{a.descricao}</p>
                </li>
              ))}
            </ol>
          )}
          {aba === 'prazos' &&
            (prazos.length ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {prazos.map((z: Prazo) => (
                  <PrazoItem key={z.id} prazo={z} aoAbrir={(x) => setPrazoAberto(x.id)} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum prazo lançado neste processo.</p>
            ))}
          {aba === 'tarefas' &&
            (tarefas.length ? (
              <ul className="divide-y">
                {tarefas.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link to={`/tarefas?tarefa=${t.id}`} className="font-medium hover:underline">
                      {t.titulo}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {t.status} · {q.nomeUsuario(t.responsavelId)} · até {fmtData(t.dataLimite)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa neste processo.</p>
            ))}
          {aba === 'horas' && (
            <div>
              <p className="mb-3 text-2xl font-semibold">
                {horas(somaMinutos(lancs))} <span className="text-sm font-normal text-muted-foreground">lançadas nos últimos 30 dias · {horas(somaMinutos(lancs.filter((l) => l.faturavel)))} faturáveis</span>
              </p>
              {porPessoa.length ? (
                <ul className="divide-y">
                  {porPessoa.map(({ u, min }) => (
                    <li key={u} className="flex justify-between py-2 text-sm">
                      <Pessoa nome={q.nomeUsuario(u)} id={u} />
                      <span className="tabular-nums">{horas(min)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma hora lançada neste processo.</p>
              )}
            </div>
          )}
          {aba === 'documentos' && (
            <ul className="space-y-2">
              {p.documentos.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ExternalLink className="size-4" aria-hidden /> {d.titulo}
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                </li>
              ))}
              <li className="text-xs text-muted-foreground">Os documentos ficam no GED do escritório; aqui só guardamos os links.</li>
            </ul>
          )}
        </CardContent>
      </Card>
      <PrazoDetalheDialog prazoId={prazoAberto} aoFechar={() => setPrazoAberto(null)} />
    </div>
  )
}
