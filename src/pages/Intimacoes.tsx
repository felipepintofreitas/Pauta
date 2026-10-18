import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Inbox, Filter, Tags, X } from 'lucide-react'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import { STATUS_INTIMACAO, type StatusIntimacao } from '@/data/tipos'
import { TRIBUNAIS } from '@/data/feriados'
import { TIPOS_ATO } from '@/lib/prazo'
import { data as fmtData } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import { useCarregando } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Campo, Checkbox, Input, Select } from '@/components/ui/form'
import { Dialog } from '@/components/ui/dialog'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

const VAZIOS: Record<StatusIntimacao, string> = {
  Nova: 'Nenhuma intimação nova. As capturas do DJEN e do Domicílio Judicial Eletrônico aparecem aqui assim que chegam.',
  Classificada: 'Nada aguardando lançamento de prazo. Classifique as novas para que apareçam aqui.',
  'Prazo lançado': 'Nenhum prazo aguardando conferência. Os prazos lançados esperam aqui a revisão de outra pessoa da controladoria.',
  Conferida: 'Nenhuma intimação conferida ainda.',
}

export function Intimacoes() {
  const { db, usuario, classificarIntimacoes } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as StatusIntimacao) || 'Nova'
  const [fonte, setFonte] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [loteAberto, setLoteAberto] = useState(false)
  const [loteAto, setLoteAto] = useState(TIPOS_ATO[0])
  const [loteResp, setLoteResp] = useState('')
  const carregando = useCarregando(400, aba)
  const podeClassificar = pode(usuario.perfil, 'classificarIntimacao')

  const filtradas = useMemo(
    () =>
      db.intimacoes
        .filter((i) => {
          const p = q.processo(i.processoId)!
          if (fonte && i.fonte !== fonte) return false
          if (tribunal && p.tribunal !== tribunal) return false
          if (responsavel && (i.responsavelId ?? p.responsavelId) !== responsavel) return false
          if (de && i.disponibilizacao < de) return false
          if (ate && i.disponibilizacao > ate) return false
          return true
        })
        .sort((a, b) => b.disponibilizacao.localeCompare(a.disponibilizacao)),
    [db.intimacoes, fonte, tribunal, responsavel, de, ate, q],
  )
  const daAba = filtradas.filter((i) => i.status === aba)
  const contagem = (s: StatusIntimacao) => filtradas.filter((i) => i.status === s).length
  const filtrosAtivos = [fonte, tribunal, responsavel, de, ate].filter(Boolean).length
  const responsaveis = db.usuarios.filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
  const loteDisponivel = podeClassificar && (aba === 'Nova' || aba === 'Classificada')

  const mudarAba = (v: StatusIntimacao) => {
    setSelecionadas([])
    setParams(v === 'Nova' ? {} : { aba: v }, { replace: true })
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Intimações"
        descricao="Caixa de entrada do DJEN e do Domicílio Judicial Eletrônico. Cada intimação passa por classificação, prazo, tarefa e conferência."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs
          rotulo="Status das intimações"
          valor={aba}
          aoMudar={mudarAba}
          abas={STATUS_INTIMACAO.map((s) => ({
            valor: s,
            rotulo: (
              <>
                {s}
                <span className="rounded-full bg-muted px-1.5 text-xs">{contagem(s)}</span>
              </>
            ),
          }))}
          className="max-w-full"
        />
        <Button variant="outline" onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos} aria-controls="filtros-intimacoes">
          <Filter /> Filtros {filtrosAtivos > 0 && <Badge>{filtrosAtivos}</Badge>}
        </Button>
      </div>

      {filtrosAbertos && (
        <div id="filtros-intimacoes" className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo rotulo="Fonte" id="f-fonte">
            <Select id="f-fonte" value={fonte} onChange={(e) => setFonte(e.target.value)}>
              <option value="">Todas</option>
              <option>DJEN</option>
              <option>Domicílio Judicial Eletrônico</option>
            </Select>
          </Campo>
          <Campo rotulo="Tribunal" id="f-trib">
            <Select id="f-trib" value={tribunal} onChange={(e) => setTribunal(e.target.value)}>
              <option value="">Todos</option>
              {TRIBUNAIS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Responsável" id="f-resp">
            <Select id="f-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
              <option value="">Todos</option>
              {responsaveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Disponibilizada de" id="f-de">
            <Input id="f-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </Campo>
          <Campo rotulo="até" id="f-ate">
            <Input id="f-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </Campo>
          {filtrosAtivos > 0 && (
            <Button
              variant="ghost"
              className="justify-self-start sm:col-span-2 lg:col-span-5"
              onClick={() => {
                setFonte('')
                setTribunal('')
                setResponsavel('')
                setDe('')
                setAte('')
              }}
            >
              <X /> Limpar filtros
            </Button>
          )}
        </div>
      )}

      {loteDisponivel && daAba.length > 0 && (
        <div className="sticky top-14 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 md:top-16">
          <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
            <Checkbox
              checked={selecionadas.length === daAba.length}
              onChange={(e) => setSelecionadas(e.target.checked ? daAba.map((i) => i.id) : [])}
              aria-label="Selecionar todas desta aba"
            />
            {selecionadas.length ? `${selecionadas.length} selecionadas` : 'Selecionar todas'}
          </label>
          <Button
            className="ml-auto"
            disabled={!selecionadas.length}
            onClick={() => {
              setLoteResp(responsaveis[0].id)
              setLoteAberto(true)
            }}
          >
            <Tags /> Classificar e distribuir
          </Button>
        </div>
      )}

      {carregando ? (
        <SkeletonLista />
      ) : !daAba.length ? (
        <EstadoVazio icone={Inbox} titulo={filtrosAtivos ? 'Nenhuma intimação com esses filtros' : `Nenhuma intimação em “${aba}”`} descricao={filtrosAtivos ? 'Ajuste ou limpe os filtros para ver mais resultados.' : VAZIOS[aba]} />
      ) : (
        <ul className="space-y-2">
          {daAba.map((i) => {
            const p = q.processo(i.processoId)!
            const marcado = selecionadas.includes(i.id)
            return (
              <li key={i.id} className={cn('flex gap-1 rounded-lg border bg-card', marcado && 'ring-2 ring-ring')}>
                {loteDisponivel && (
                  <label className="grid w-11 shrink-0 cursor-pointer place-items-center self-stretch">
                    <Checkbox checked={marcado} onChange={(e) => setSelecionadas((l) => (e.target.checked ? [...l, i.id] : l.filter((x) => x !== i.id)))} aria-label={`Selecionar intimação do processo ${p.numero}`} />
                  </label>
                )}
                <Link to={`/intimacoes/${i.id}`} className={cn('min-w-0 flex-1 rounded-lg p-3 hover:bg-muted/50', loteDisponivel && 'pl-0')}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{i.tipoAto ?? 'Não classificada'}</span>
                    <Badge variant={i.fonte === 'DJEN' ? 'info' : 'neutro'}>{i.fonte === 'DJEN' ? 'DJEN' : 'Domicílio Eletrônico'}</Badge>
                    <span className="text-xs text-muted-foreground">Disponibilizada em {fmtData(i.disponibilizacao)}</span>
                  </div>
                  <p className="mt-1 text-sm">{q.cliente(p.clienteId)?.nome}</p>
                  <p className="break-all text-xs text-muted-foreground">
                    {p.numero} · {p.tribunal} · {p.sistema}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{i.teor}</p>
                  {i.responsavelId && <p className="mt-1 text-xs">Responsável: {q.nomeUsuario(i.responsavelId)}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        aberto={loteAberto}
        aoFechar={() => setLoteAberto(false)}
        titulo={`Classificar e distribuir ${selecionadas.length} ${selecionadas.length === 1 ? 'intimação' : 'intimações'}`}
        descricao="O tipo de ato e o responsável serão aplicados a todas as selecionadas. Cada intimação registra a ação no histórico."
        tamanho="sm"
        rodape={
          <>
            <Button variant="outline" onClick={() => setLoteAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const r = classificarIntimacoes(selecionadas, loteAto, loteResp)
                if (!r.ok) return toast(r.erro, { tipo: 'erro' })
                toast(`${selecionadas.length} intimações classificadas e distribuídas para ${q.nomeUsuario(loteResp)}.`)
                setSelecionadas([])
                setLoteAberto(false)
              }}
            >
              Aplicar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Tipo de ato" id="lote-ato">
            <Select id="lote-ato" value={loteAto} onChange={(e) => setLoteAto(e.target.value)}>
              {TIPOS_ATO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Responsável" id="lote-resp">
            <Select id="lote-resp" value={loteResp} onChange={(e) => setLoteResp(e.target.value)}>
              {responsaveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} · {u.equipe}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </Dialog>
    </div>
  )
}
