import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Receipt, Wallet, Timer, CalendarClock, FileCheck2, BadgeDollarSign } from 'lucide-react'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import { NOMES_MODALIDADE, type BancoDados, type Cliente, type Lancamento, type PreFatura, type StatusPreFatura } from '@/data/tipos'
import { diferencaDias, fimDoMes, hojeISO, inicioDoMes, somarMeses } from '@/lib/datas'
import { data as fmtData, horas, mesAno, percentual, reais } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import { resumoCliente, somaMinutos, valorLancamento } from '@/lib/negocio'
import { useCarregando } from '@/lib/hooks'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/form'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm'
import { EstadoVazio } from '@/components/ui/empty-state'
import { SkeletonLista } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

const COR_PF: Record<StatusPreFatura, 'alerta' | 'info' | 'sucesso'> = { 'A faturar': 'alerta', Faturada: 'info', Recebida: 'sucesso' }

function Indicador({ titulo, valor, detalhe, icone: Icone }: { titulo: string; valor: string; detalhe?: string; icone: typeof Wallet }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          <p className="text-xl font-semibold tabular-nums">{valor}</p>
          {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/** Agrupa lançamentos por uma chave e soma minutos e valor. */
function agrupar(db: BancoDados, lancs: Lancamento[], chave: (l: Lancamento) => string) {
  const m = new Map<string, { min: number; valor: number }>()
  for (const l of lancs) {
    const k = chave(l)
    const atual = m.get(k) ?? { min: 0, valor: 0 }
    m.set(k, { min: atual.min + l.minutos, valor: atual.valor + valorLancamento(db, l) })
  }
  return Array.from(m.entries()).sort((a, b) => b[1].min - a[1].min)
}

function Detalhamento({ lancs, valorFixo }: { lancs: Lancamento[]; valorFixo: number }) {
  const { db } = useApp()
  const q = useConsultas()
  const porProcesso = agrupar(db, lancs, (l) => l.processoId)
  const porPessoa = agrupar(db, lancs, (l) => l.usuarioId)
  return (
    <div className="space-y-4 text-sm">
      {valorFixo > 0 && (
        <p className="rounded-md bg-muted p-2">
          Mensalidade fixa do contrato: <strong>{reais(valorFixo)}</strong>. As horas abaixo entram como relatório de atividades.
        </p>
      )}
      <section>
        <h3 className="mb-1 font-semibold">Por processo</h3>
        <table className="w-full text-left">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Processo</th>
              <th className="py-1 text-right font-medium">Horas</th>
              <th className="py-1 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {porProcesso.map(([id, v]) => (
              <tr key={id}>
                <td className="break-all py-1.5 pr-2">{q.processo(id)?.numero}</td>
                <td className="py-1.5 text-right tabular-nums">{horas(v.min)}</td>
                <td className="py-1.5 text-right tabular-nums">{reais(v.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-1 font-semibold">Por profissional</h3>
        <table className="w-full text-left">
          <tbody className="divide-y">
            {porPessoa.map(([id, v]) => (
              <tr key={id}>
                <td className="py-1.5 pr-2">
                  {q.nomeUsuario(id)} <span className="text-xs text-muted-foreground">({q.usuario(id)?.cargo})</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{horas(v.min)}</td>
                <td className="py-1.5 text-right tabular-nums">{reais(v.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export function Honorarios() {
  const { db, usuario, gerarPreFatura, alterarStatusPreFatura } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as 'clientes' | 'prefaturas') || 'clientes'
  const hoje = hojeISO()
  const meses = [0, -1, -2].map((n) => somarMeses(hoje, n))
  const [mes, setMes] = useState(inicioDoMes(hoje))
  const inicio = mes
  const fim = fimDoMes(mes)
  const [gerando, setGerando] = useState<Cliente | null>(null)
  const [vendo, setVendo] = useState<PreFatura | null>(null)
  const [mudando, setMudando] = useState<{ pf: PreFatura; status: StatusPreFatura } | null>(null)
  const carregando = useCarregando(400, aba)
  const podeGerar = pode(usuario.perfil, 'gerarPreFatura')

  const resumos = useMemo(() => db.clientes.map((c) => ({ c, r: resumoCliente(db, c, inicio, fim) })), [db, inicio, fim])
  const doPeriodo = db.lancamentos.filter((l) => l.data >= inicio && l.data <= fim)
  const fat = somaMinutos(doPeriodo.filter((l) => l.faturavel))
  const naoFat = somaMinutos(doPeriodo.filter((l) => !l.faturavel))
  const faturados = db.lancamentos.filter((l) => l.status === 'Faturado' && l.preFaturaId)
  const prazoMedio = faturados.length
    ? Math.round(faturados.reduce((s, l) => s + diferencaDias(l.data, db.preFaturas.find((p) => p.id === l.preFaturaId)?.faturadaEm ?? l.data), 0) / faturados.length)
    : 0

  const elegiveis = gerando ? db.lancamentos.filter((l) => l.clienteId === gerando.id && l.data >= inicio && l.data <= fim && l.status === 'Aprovado' && l.faturavel && !l.preFaturaId) : []
  const resumoGerando = gerando ? resumoCliente(db, gerando, inicio, fim) : null

  return (
    <div>
      <CabecalhoPagina
        titulo="Honorários"
        descricao="Do lançamento aprovado à pré-fatura e ao recebimento."
        acoes={
          <Select aria-label="Período" value={mes} onChange={(e) => setMes(e.target.value)} className="w-auto capitalize">
            {meses.map((m) => (
              <option key={m} value={m}>
                {mesAno(m)}
              </option>
            ))}
          </Select>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Valor a faturar no período" valor={reais(resumos.reduce((s, x) => s + x.r.total, 0))} detalhe="horas aprovadas + mensalidades" icone={Wallet} />
        <Indicador titulo="Horas faturáveis x não faturáveis" valor={`${horas(fat)} / ${horas(naoFat)}`} detalhe={fat + naoFat ? `${percentual(fat / (fat + naoFat))} faturável` : undefined} icone={Timer} />
        <Indicador titulo="Prazo médio lançamento → faturamento" valor={`${prazoMedio} dias`} detalhe={`${faturados.length} lançamentos faturados`} icone={CalendarClock} />
        <Indicador titulo="A receber" valor={reais(db.preFaturas.filter((p) => p.status === 'Faturada').reduce((s, p) => s + p.total, 0))} detalhe="faturas emitidas" icone={BadgeDollarSign} />
      </div>

      <Tabs
        rotulo="Seção"
        valor={aba}
        aoMudar={(v) => setParams(v === 'clientes' ? {} : { aba: v }, { replace: true })}
        abas={[
          { valor: 'clientes', rotulo: 'Clientes' },
          { valor: 'prefaturas', rotulo: `Pré-faturas (${db.preFaturas.length})` },
        ]}
        className="mb-4"
      />

      {carregando ? (
        <SkeletonLista />
      ) : aba === 'clientes' ? (
        <ul className="divide-y rounded-lg border bg-card">
          {resumos.map(({ c, r }) => (
            <li key={c.id} className="grid gap-2 p-3 md:grid-cols-[minmax(0,2fr)_8rem_8rem_9rem_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="mr-1">
                    {NOMES_MODALIDADE[c.contrato.modalidade]}
                  </Badge>
                  {c.contrato.modalidade === 'mensal' && reais(c.contrato.valorMensal ?? 0)}
                  {c.contrato.modalidade === 'exito' && percentual(c.contrato.percentualExito ?? 0)}
                  {c.contrato.modalidade === 'hora' && (c.contrato.descontoHora ? `${percentual(c.contrato.descontoHora)} de desconto` : 'tabela cheia')}
                </p>
              </div>
              <p className="text-sm">
                <span className="text-xs text-muted-foreground md:hidden">Horas: </span>
                <span className="tabular-nums">{horas(r.minutos)}</span>
                <span className="block text-xs text-muted-foreground">{horas(r.minutosPendentes)} sem aprovação</span>
              </p>
              <p className="text-sm">
                <span className="text-xs text-muted-foreground md:hidden">Aprovadas a faturar: </span>
                <span className="tabular-nums">{horas(r.minutosAprovadosAFaturar)}</span>
              </p>
              <p className="font-semibold tabular-nums">
                <span className="text-xs font-normal text-muted-foreground md:hidden">A faturar: </span>
                {reais(r.total)}
              </p>
              {podeGerar ? (
                <Button variant="outline" size="sm" disabled={!r.total || c.contrato.modalidade === 'exito'} onClick={() => setGerando(c)} title={c.contrato.modalidade === 'exito' ? 'Contrato de êxito: faturado no resultado' : undefined}>
                  <Receipt /> Gerar pré-fatura
                </Button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      ) : !db.preFaturas.length ? (
        <EstadoVazio icone={Receipt} titulo="Nenhuma pré-fatura ainda" descricao="Gere a primeira na aba Clientes, a partir das horas aprovadas do período." />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {[...db.preFaturas].reverse().map((pf) => (
            <li key={pf.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{pf.numero}</span>
                <Badge variant={COR_PF[pf.status]}>{pf.status}</Badge>
                <span className="ml-auto font-semibold tabular-nums">{reais(pf.total)}</span>
              </div>
              <p className="text-sm">{q.cliente(pf.clienteId)?.nome}</p>
              <p className="text-xs text-muted-foreground">
                {fmtData(pf.inicio)} a {fmtData(pf.fim)} · {pf.lancamentoIds.length} lançamentos
                {pf.faturadaEm && ` · faturada em ${fmtData(pf.faturadaEm)}`}
                {pf.recebidaEm && ` · recebida em ${fmtData(pf.recebidaEm)}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setVendo(pf)}>
                  Ver detalhes
                </Button>
                {podeGerar && pf.status === 'A faturar' && (
                  <Button size="sm" onClick={() => setMudando({ pf, status: 'Faturada' })}>
                    <FileCheck2 /> Marcar como faturada
                  </Button>
                )}
                {podeGerar && pf.status === 'Faturada' && (
                  <Button size="sm" variant="outline" onClick={() => setMudando({ pf, status: 'Recebida' })}>
                    <BadgeDollarSign /> Registrar recebimento
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        aberto={!!gerando}
        aoFechar={() => setGerando(null)}
        titulo={`Pré-fatura · ${gerando?.nome ?? ''}`}
        descricao={`${fmtData(inicio)} a ${fmtData(fim)} · ${elegiveis.length} lançamentos aprovados e faturáveis`}
        tamanho="lg"
        rodape={
          <>
            <p className="mr-auto self-center text-lg font-semibold tabular-nums">Total {reais(resumoGerando?.total ?? 0)}</p>
            <Button variant="outline" onClick={() => setGerando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const r = gerarPreFatura(gerando!.id, inicio, fim)
                if (!r.ok) return toast(r.erro, { tipo: 'erro' })
                setGerando(null)
                toast(`Pré-fatura ${r.valor.numero} gerada: ${reais(r.valor.total)}.`)
                setParams({ aba: 'prefaturas' }, { replace: true })
              }}
            >
              Gerar pré-fatura
            </Button>
          </>
        }
      >
        {gerando && <Detalhamento lancs={elegiveis} valorFixo={resumoGerando?.valorFixo ?? 0} />}
      </Dialog>

      <Dialog aberto={!!vendo} aoFechar={() => setVendo(null)} titulo={`${vendo?.numero} · ${q.cliente(vendo?.clienteId)?.nome ?? ''}`} descricao={vendo ? `${fmtData(vendo.inicio)} a ${fmtData(vendo.fim)} · total ${reais(vendo.total)}` : undefined} tamanho="lg">
        {vendo && <Detalhamento lancs={db.lancamentos.filter((l) => vendo.lancamentoIds.includes(l.id))} valorFixo={vendo.valorFixo} />}
      </Dialog>

      <ConfirmDialog
        aberto={!!mudando}
        titulo={mudando?.status === 'Faturada' ? 'Marcar pré-fatura como faturada?' : 'Registrar recebimento?'}
        descricao={mudando ? `${mudando.pf.numero} · ${reais(mudando.pf.total)}. ${mudando.status === 'Faturada' ? 'Os lançamentos passam para o status Faturado.' : ''}` : undefined}
        confirmar="Confirmar"
        aoCancelar={() => setMudando(null)}
        aoConfirmar={() => {
          alterarStatusPreFatura(mudando!.pf.id, mudando!.status)
          toast(mudando!.status === 'Faturada' ? 'Pré-fatura marcada como faturada.' : 'Recebimento registrado.')
          setMudando(null)
        }}
      />
    </div>
  )
}
