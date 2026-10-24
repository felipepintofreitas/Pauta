import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Lock, History, Calculator, UserCheck } from 'lucide-react'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import { NOMES_PERFIL } from '@/data/tipos'
import { calcularPrazo, SUGESTOES_POR_ATO, TIPOS_ATO, type Contagem } from '@/lib/prazo'
import { calendarioDoTribunal } from '@/lib/negocio'
import { data as fmtData, dataHora, horas, reais } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, LinkBotao } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Campo, Checkbox, Input, Select, Textarea } from '@/components/ui/form'
import { EstadoVazio } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { BlocoIntegracoes } from '@/components/Integracao'
import { Gavel, KeyRound, Newspaper, Sparkles } from 'lucide-react'
import { AvisoCalculo, ConferenciaBadge, UrgenciaBadge } from '@/components/Urgencia'

type EstadoEtapa = 'feita' | 'atual' | 'bloqueada'

function Etapa({ n, titulo, estado, resumo, children }: { n: number; titulo: string; estado: EstadoEtapa; resumo?: ReactNode; children?: ReactNode }) {
  return (
    <li className={cn('rounded-lg border bg-card', estado === 'atual' && 'border-primary ring-1 ring-primary')}>
      <div className="flex items-center gap-3 p-3">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
            estado === 'feita' ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950' : estado === 'atual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {estado === 'feita' ? <Check className="size-4" /> : estado === 'bloqueada' ? <Lock className="size-3.5" /> : n}
        </span>
        <h3 className="font-semibold">
          <span className="sr-only">Etapa {n}: </span>
          {titulo}
          <span className="sr-only"> ({estado === 'feita' ? 'concluída' : estado === 'atual' ? 'etapa atual' : 'aguardando etapa anterior'})</span>
        </h3>
      </div>
      {(resumo || children) && (
        <div className="space-y-3 px-3 pb-3 text-sm">
          {resumo}
          {children}
        </div>
      )}
    </li>
  )
}

export function IntimacaoDetalhe() {
  const { id } = useParams()
  const { db, usuario, classificarIntimacoes, lancarPrazo, gerarTarefaDaIntimacao, conferirPrazo } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const intim = db.intimacoes.find((i) => i.id === id)

  const [ato, setAto] = useState('')
  const [resp, setResp] = useState('')
  const [editandoClass, setEditandoClass] = useState(false)
  const [tipoPrazo, setTipoPrazo] = useState('')
  const [dias, setDias] = useState(15)
  const [contagem, setContagem] = useState<Contagem>('uteis')
  const [ajustar, setAjustar] = useState(false)
  const [dataAjustada, setDataAjustada] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erroPrazo, setErroPrazo] = useState('')
  const [tituloTarefa, setTituloTarefa] = useState('')
  const [respTarefa, setRespTarefa] = useState('')
  const [limiteTarefa, setLimiteTarefa] = useState('')
  const [estimativa, setEstimativa] = useState(180)

  const processo = intim ? q.processo(intim.processoId) : undefined
  const prazo = q.prazo(intim?.prazoId)
  const tarefa = q.tarefa(intim?.tarefaId)

  useEffect(() => {
    if (!intim || !processo) return
    setAto(intim.tipoAto ?? '')
    setResp(intim.responsavelId ?? processo.responsavelId)
    const sug = intim.tipoAto ? SUGESTOES_POR_ATO[intim.tipoAto] : undefined
    if (sug) {
      setTipoPrazo(sug.tipoPrazo)
      setDias(sug.dias)
      setContagem(sug.contagem)
      setTituloTarefa(sug.tarefa)
    }
    setRespTarefa(intim.responsavelId ?? processo.responsavelId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intim?.id, intim?.tipoAto, intim?.responsavelId])

  useEffect(() => {
    if (prazo) setLimiteTarefa(prazo.dataSeguranca)
  }, [prazo])

  const calc = useMemo(() => {
    if (!intim || !processo || !dias || dias < 1) return null
    try {
      return calcularPrazo({ disponibilizacao: intim.disponibilizacao, dias: Math.floor(dias), contagem, calendario: calendarioDoTribunal(db, processo.tribunal) })
    } catch {
      return null
    }
  }, [intim, processo, dias, contagem, db])

  if (!intim || !processo)
    return <EstadoVazio icone={History} titulo="Intimação não encontrada" descricao="Ela pode ter sido removida ao restaurar os dados de demonstração." acao={<LinkBotao to="/intimacoes">Voltar para intimações</LinkBotao>} />

  const cliente = q.cliente(processo.clienteId)!
  const podeOperar = pode(usuario.perfil, 'classificarIntimacao')
  const responsaveis = db.usuarios.filter((u) => ['advogado', 'socio', 'estagiario'].includes(u.perfil))
  const outrosControladores = db.usuarios.filter((u) => u.perfil === 'controladoria' && u.id !== prazo?.lancadoPorId)

  const e1: EstadoEtapa = intim.status === 'Nova' ? 'atual' : 'feita'
  const e2: EstadoEtapa = intim.status === 'Nova' ? 'bloqueada' : prazo ? 'feita' : 'atual'
  const e3: EstadoEtapa = !prazo ? 'bloqueada' : tarefa ? 'feita' : 'atual'
  const e4: EstadoEtapa = !tarefa ? 'bloqueada' : intim.status === 'Conferida' ? 'feita' : 'atual'

  const somenteLeitura = !podeOperar && (
    <p className="text-xs text-muted-foreground">Somente a controladoria executa esta etapa. Seu perfil ({NOMES_PERFIL[usuario.perfil]}) tem acesso de leitura.</p>
  )

  return (
    <div>
      <Link to="/intimacoes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Intimações
      </Link>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{intim.tipoAto ?? 'Intimação não classificada'}</h1>
          <Badge variant={intim.status === 'Conferida' ? 'sucesso' : intim.status === 'Nova' ? 'info' : 'alerta'}>{intim.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {cliente.nome} · {intim.fonte} · disponibilizada em {fmtData(intim.disponibilizacao)}, publicada em {fmtData(intim.publicacao)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Teor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed">{intim.teor}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Processo vinculado</CardTitle>
              <Link to={`/processos/${processo.id}`} className="text-sm font-medium text-primary hover:underline">
                Abrir ficha
              </Link>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Número</dt>
                  <dd className="break-all font-medium">{processo.numero}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Tribunal e sistema</dt>
                  <dd>
                    {processo.tribunal} · {processo.sistema} · {processo.orgao}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Partes</dt>
                  <dd>
                    {cliente.nome} ({processo.polo === 'ativo' ? 'polo ativo' : 'polo passivo'}) x {processo.parteContraria}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Responsável e valor da causa</dt>
                  <dd>
                    {q.nomeUsuario(processo.responsavelId)} · {reais(processo.valorCausa)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <BlocoIntegracoes
            grupo="intimacoes-oficiais"
            acoes={[
              { sistema: intim.fonte, rotulo: `Ver no ${intim.fonte === 'DJEN' ? 'DJEN' : 'Domicílio Eletrônico'}`, icone: Newspaper },
              { sistema: processo.sistema, rotulo: `Abrir autos no ${processo.sistema}`, icone: Gavel },
              { sistema: 'SAGA', rotulo: 'Minutar resposta com SAGA', icone: Sparkles },
              { sistema: 'Whom', rotulo: 'Protocolar com certificado', icone: KeyRound },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Histórico de auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l pl-4">
                {[...intim.historico].reverse().map((h, k) => (
                  <li key={k} className="text-sm">
                    <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                    <p>
                      <strong>{q.nomeUsuario(h.usuarioId)}</strong> {h.acao.charAt(0).toLowerCase() + h.acao.slice(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">{dataHora(h.em)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <ol className="space-y-3 lg:col-span-2" aria-label="Etapas de tratamento da intimação">
          <Etapa
            n={1}
            titulo="Classificar e definir responsável"
            estado={e1}
            resumo={
              e1 === 'feita' &&
              !editandoClass && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    {intim.tipoAto} · responsável <strong>{q.nomeUsuario(intim.responsavelId)}</strong>
                    <br />
                    <span className="text-xs text-muted-foreground">por {q.nomeUsuario(intim.classificadoPorId)}</span>
                  </p>
                  {podeOperar && !prazo && (
                    <Button variant="ghost" size="sm" onClick={() => setEditandoClass(true)}>
                      Editar
                    </Button>
                  )}
                </div>
              )
            }
          >
            {(e1 === 'atual' || editandoClass) &&
              (podeOperar ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!ato) return toast('Escolha o tipo de ato.', { tipo: 'erro' })
                    const r = classificarIntimacoes([intim.id], ato, resp)
                    if (!r.ok) return toast(r.erro, { tipo: 'erro' })
                    setEditandoClass(false)
                    toast('Intimação classificada. Agora lance o prazo.')
                  }}
                >
                  <Campo rotulo="Tipo de ato" id="ato">
                    <Select id="ato" value={ato} onChange={(e) => setAto(e.target.value)} required>
                      <option value="">Selecione…</option>
                      {TIPOS_ATO.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo rotulo="Responsável pelo cumprimento" id="resp">
                    <Select id="resp" value={resp} onChange={(e) => setResp(e.target.value)}>
                      {responsaveis.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} · {u.equipe}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                  <div className="flex gap-2">
                    <Button type="submit">Classificar</Button>
                    {editandoClass && (
                      <Button variant="ghost" onClick={() => setEditandoClass(false)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                somenteLeitura
              ))}
          </Etapa>

          <Etapa
            n={2}
            titulo="Lançar prazo"
            estado={e2}
            resumo={
              prazo && (
                <div className="space-y-1">
                  <p>
                    {prazo.tipo} · fatal <strong>{fmtData(prazo.dataFatal)}</strong> · segurança {fmtData(prazo.dataSeguranca)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />
                    <ConferenciaBadge prazo={prazo} />
                  </div>
                  <p className="text-xs text-muted-foreground">{prazo.memoria}</p>
                  {prazo.ajusteManual && <p className="text-xs">Ajuste manual: “{prazo.ajusteManual.justificativa}”</p>}
                  <p className="text-xs text-muted-foreground">por {q.nomeUsuario(prazo.lancadoPorId)}</p>
                </div>
              )
            }
          >
            {e2 === 'atual' &&
              (podeOperar ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setErroPrazo('')
                    if (ajustar && (!dataAjustada || !justificativa.trim())) return setErroPrazo('Para ajustar a data, informe a nova data fatal e a justificativa.')
                    const r = lancarPrazo(intim.id, { tipo: tipoPrazo || 'Manifestação', dias: Math.floor(dias), contagem, dataFatalAjustada: ajustar ? dataAjustada : undefined, justificativa })
                    if (!r.ok) return setErroPrazo(r.erro)
                    toast('Prazo lançado. Gere a tarefa vinculada.')
                  }}
                >
                  <p className="text-xs text-muted-foreground">
                    Sugestão para “{intim.tipoAto}”: {SUGESTOES_POR_ATO[intim.tipoAto!]?.tipoPrazo}, {SUGESTOES_POR_ATO[intim.tipoAto!]?.dias} dias úteis.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo rotulo="Tipo de prazo" id="tp" className="col-span-2">
                      <Input id="tp" list="tipos-prazo" value={tipoPrazo} onChange={(e) => setTipoPrazo(e.target.value)} required />
                      <datalist id="tipos-prazo">
                        {['Contestação', 'Recurso', 'Manifestação', 'Réplica', 'Audiência', 'Contrarrazões', 'Pagamento/Impugnação'].map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </Campo>
                    <Campo rotulo="Quantidade de dias" id="dias">
                      <Input id="dias" type="number" min={1} max={365} inputMode="numeric" value={dias} onChange={(e) => setDias(Number(e.target.value))} required />
                    </Campo>
                    <Campo rotulo="Contagem" id="contagem">
                      <Select id="contagem" value={contagem} onChange={(e) => setContagem(e.target.value as Contagem)}>
                        <option value="uteis">Dias úteis</option>
                        <option value="corridos">Dias corridos</option>
                      </Select>
                    </Campo>
                  </div>
                  {calc && (
                    <div className="rounded-md border bg-muted/50 p-3" aria-live="polite">
                      <p className="mb-1 flex items-center gap-1.5 font-semibold">
                        <Calculator className="size-4" aria-hidden /> Data fatal calculada: {fmtData(calc.dataFatal)}
                      </p>
                      <p className="text-xs">{calc.memoria}</p>
                    </div>
                  )}
                  <label className="flex min-h-11 items-center gap-2">
                    <Checkbox checked={ajustar} onChange={(e) => setAjustar(e.target.checked)} /> Ajustar data fatal manualmente
                  </label>
                  {ajustar && (
                    <div className="space-y-2">
                      <Campo rotulo="Nova data fatal" id="dt-aj">
                        <Input id="dt-aj" type="date" value={dataAjustada} onChange={(e) => setDataAjustada(e.target.value)} required />
                      </Campo>
                      <Campo rotulo="Justificativa (obrigatória)" id="just">
                        <Textarea id="just" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex.: suspensão de expediente pela Portaria nº 12/2026 do tribunal" required />
                      </Campo>
                    </div>
                  )}
                  {erroPrazo && (
                    <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
                      {erroPrazo}
                    </p>
                  )}
                  <AvisoCalculo />
                  <Button type="submit">Lançar prazo</Button>
                </form>
              ) : (
                somenteLeitura
              ))}
          </Etapa>

          <Etapa
            n={3}
            titulo="Gerar tarefa vinculada"
            estado={e3}
            resumo={
              tarefa && (
                <p>
                  “{tarefa.titulo}” para <strong>{q.nomeUsuario(tarefa.responsavelId)}</strong>, até {fmtData(tarefa.dataLimite)} · {tarefa.status}
                </p>
              )
            }
          >
            {e3 === 'atual' &&
              (podeOperar ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const r = gerarTarefaDaIntimacao(intim.id, { titulo: tituloTarefa, responsavelId: respTarefa, dataLimite: limiteTarefa, estimativaMin: estimativa })
                    if (!r.ok) return toast(r.erro, { tipo: 'erro' })
                    toast(`Tarefa atribuída a ${q.nomeUsuario(respTarefa)}. Falta a conferência.`)
                  }}
                >
                  <Campo rotulo="Título" id="tt">
                    <Input id="tt" value={tituloTarefa} onChange={(e) => setTituloTarefa(e.target.value)} required />
                  </Campo>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Campo rotulo="Responsável" id="rt">
                      <Select id="rt" value={respTarefa} onChange={(e) => setRespTarefa(e.target.value)}>
                        {responsaveis.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                    <Campo rotulo="Data limite" id="lt" ajuda="Sugerida: data de segurança">
                      <Input id="lt" type="date" value={limiteTarefa} onChange={(e) => setLimiteTarefa(e.target.value)} required />
                    </Campo>
                    <Campo rotulo="Estimativa" id="est">
                      <Select id="est" value={estimativa} onChange={(e) => setEstimativa(Number(e.target.value))}>
                        {[60, 120, 180, 240, 360, 480].map((m) => (
                          <option key={m} value={m}>
                            {horas(m)}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                  </div>
                  <Button type="submit">Gerar tarefa</Button>
                </form>
              ) : (
                somenteLeitura
              ))}
          </Etapa>

          <Etapa
            n={4}
            titulo="Conferência"
            estado={e4}
            resumo={
              intim.status === 'Conferida' && prazo && (
                <p className="flex items-center gap-1.5">
                  <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Conferido por <strong>{q.nomeUsuario(prazo.conferidoPorId)}</strong> em {dataHora(prazo.conferidoEm!)}
                </p>
              )
            }
          >
            {e4 === 'atual' &&
              prazo &&
              (pode(usuario.perfil, 'conferirPrazo') ? (
                prazo.lancadoPorId === usuario.id ? (
                  <div className="space-y-2 rounded-md bg-muted p-3">
                    <p className="font-medium">Você lançou este prazo e não pode conferi-lo.</p>
                    <p className="text-xs text-muted-foreground">
                      A conferência precisa ser feita por outra pessoa da controladoria
                      {outrosControladores.length ? ` (por exemplo, ${outrosControladores.map((u) => u.nome).join(', ')}). No protótipo, troque o perfil no topo da tela.` : '.'}
                    </p>
                    <Button disabled>Marcar como conferido</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Revise a memória de cálculo do prazo lançado por {q.nomeUsuario(prazo.lancadoPorId)} antes de confirmar.</p>
                    <Button
                      onClick={() => {
                        const r = conferirPrazo(prazo.id)
                        toast(r.ok ? 'Prazo conferido. A intimação foi concluída.' : r.erro, { tipo: r.ok ? 'sucesso' : 'erro' })
                      }}
                    >
                      <UserCheck /> Marcar como conferido
                    </Button>
                  </div>
                )
              ) : (
                somenteLeitura
              ))}
          </Etapa>
        </ol>
      </div>
    </div>
  )
}
