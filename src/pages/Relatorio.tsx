import { useMemo, useState } from 'react'
import { Printer, Link2 } from 'lucide-react'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import { hojeISO, somarDias } from '@/lib/datas'
import { data as fmtData, dataPorExtenso, horas } from '@/lib/formato'
import { somaMinutos } from '@/lib/negocio'
import { useCarregando } from '@/lib/hooks'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { AcaoIntegracao } from '@/components/Integracao'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

const ANDAMENTOS_SIMPLES: [RegExp, string][] = [
  [/^Distribuído/, 'O processo foi iniciado e encaminhado a um juiz.'],
  [/^Conclusos para despacho/, 'O processo está com o juiz para uma decisão de andamento.'],
  [/^Conclusos para decisão/, 'O processo está com o juiz para decisão.'],
  [/^Juntada de petição/, 'Uma manifestação foi anexada ao processo.'],
  [/^Expedição de mandado/, 'O tribunal emitiu uma comunicação às partes.'],
  [/^Juntada de procuração/, 'Documento de representação anexado ao processo.'],
  [/^Audiência de conciliação/, 'Houve audiência de conciliação, sem acordo.'],
  [/^Juntada de laudo/, 'O perito apresentou o laudo técnico.'],
  [/^Remetidos os autos à contadoria/, 'O processo foi enviado para cálculo de valores.'],
  [/^Recebidos os autos da contadoria/, 'Os cálculos de valores foram concluídos.'],
  [/^Intimação disponibilizada/, 'O tribunal publicou uma comunicação no processo e nossa equipe já está tratando.'],
]

const PRAZOS_SIMPLES: Record<string, string> = {
  Contestação: 'Apresentar a defesa',
  Recurso: 'Recorrer da decisão',
  Manifestação: 'Responder ao juiz',
  Réplica: 'Responder à defesa da outra parte',
  Audiência: 'Participar da audiência',
  Contrarrazões: 'Responder ao recurso da outra parte',
  'Pagamento/Impugnação': 'Analisar a cobrança de valores',
}

function simplificar(texto: string) {
  return ANDAMENTOS_SIMPLES.find(([r]) => r.test(texto))?.[1] ?? texto
}

const SITUACAO: Record<string, string> = { Ativo: 'Em andamento', Suspenso: 'Suspenso temporariamente', 'Em recurso': 'Em análise no tribunal superior', Arquivado: 'Encerrado' }

export function Relatorio() {
  const { db } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const hoje = hojeISO()
  const [clienteId, setClienteId] = useState(db.clientes[0].id)
  const [de, setDe] = useState(somarDias(hoje, -30))
  const [ate, setAte] = useState(hoje)
  const carregando = useCarregando(500, clienteId + de + ate)
  const cliente = q.cliente(clienteId)!

  const dados = useMemo(() => {
    const processos = db.processos.filter((p) => p.clienteId === clienteId && p.status !== 'Arquivado')
    return processos.map((p) => ({
      p,
      andamentos: p.andamentos.filter((a) => a.data >= somarDias(de, -60) && a.data <= ate).slice(0, 3),
      proximos: db.prazos.filter((z) => z.processoId === p.id && !z.cumprido && z.dataFatal >= hoje).sort((a, b) => a.dataFatal.localeCompare(b.dataFatal)).slice(0, 2),
      minutos: somaMinutos(db.lancamentos.filter((l) => l.processoId === p.id && l.data >= de && l.data <= ate)),
    }))
  }, [db, clienteId, de, ate, hoje])
  const totalMin = dados.reduce((s, d) => s + d.minutos, 0)
  const totalProximos = dados.reduce((s, d) => s + d.proximos.length, 0)

  const copiarLink = async () => {
    const url = `https://pauta.exemplo.com.br/r/${clienteId}-${de.replace(/-/g, '')}${ate.replace(/-/g, '')}`
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copiado. Ele expira em 30 dias (simulado).')
    } catch {
      toast(`Link simulado: ${url}`, { tipo: 'info' })
    }
  }

  return (
    <div>
      <div className="nao-imprimir">
        <CabecalhoPagina
          titulo="Relatório para o cliente"
          descricao="Um resumo em linguagem simples, pronto para enviar ou imprimir."
          acoes={
            <>
              <Button variant="outline" onClick={copiarLink}>
                <Link2 /> Copiar link
              </Button>
              <AcaoIntegracao sistema="RD Station" rotulo="Registrar no RD Station" icone={Send} />
              <Button onClick={() => window.print()}>
                <Printer /> Imprimir
              </Button>
            </>
          }
        />
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3">
          <Campo rotulo="Cliente" id="rel-cli">
            <Select id="rel-cli" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="De" id="rel-de">
            <Input id="rel-de" type="date" value={de} max={ate} onChange={(e) => e.target.value && setDe(e.target.value)} />
          </Campo>
          <Campo rotulo="Até" id="rel-ate">
            <Input id="rel-ate" type="date" value={ate} min={de} max={hoje} onChange={(e) => e.target.value && setAte(e.target.value)} />
          </Campo>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">Pré-visualização em formato A4</p>
      </div>

      <div className="area-impressao -mx-4 overflow-hidden bg-muted px-2 py-4 md:mx-0 md:rounded-lg md:p-6">
        <article className="folha-a4 mx-auto w-full max-w-[210mm] bg-white p-5 text-slate-900 shadow-md md:min-h-[297mm] md:p-[16mm]" aria-label="Relatório para o cliente">
          {carregando ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3 bg-slate-200" />
              <Skeleton className="h-4 w-1/2 bg-slate-200" />
              <Skeleton className="h-24 w-full bg-slate-200" />
              <Skeleton className="h-24 w-full bg-slate-200" />
            </div>
          ) : (
            <>
              <header className="mb-6 border-b border-slate-300 pb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">Relatório de acompanhamento</p>
                <h2 className="mt-1 text-2xl font-semibold">{cliente.nome}</h2>
                <p className="text-sm text-slate-600">
                  Período de {fmtData(de)} a {fmtData(ate)} · emitido em {dataPorExtenso(hoje)}
                </p>
              </header>

              <section className="mb-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-100 p-3">
                  <p className="text-2xl font-semibold">{dados.length}</p>
                  <p className="text-xs text-slate-600">{dados.length === 1 ? 'processo em andamento' : 'processos em andamento'}</p>
                </div>
                <div className="rounded-md bg-slate-100 p-3">
                  <p className="text-2xl font-semibold">{horas(totalMin)}</p>
                  <p className="text-xs text-slate-600">dedicadas pela equipe</p>
                </div>
                <div className="rounded-md bg-slate-100 p-3">
                  <p className="text-2xl font-semibold">{totalProximos}</p>
                  <p className="text-xs text-slate-600">próximas etapas agendadas</p>
                </div>
              </section>

              {!dados.length ? (
                <p className="text-sm">Não há processos em andamento para este cliente no período.</p>
              ) : (
                <div className="space-y-5">
                  {dados.map(({ p, andamentos, proximos, minutos }) => (
                    <section key={p.id} className="break-inside-avoid border-b border-slate-200 pb-4">
                      <h3 className="font-semibold">
                        {cliente.nome} {p.polo === 'ativo' ? 'contra' : 'em ação movida por'} {p.parteContraria}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Processo nº {p.numero} · {p.orgao} ({p.tribunal}) · {SITUACAO[p.status]}
                      </p>
                      <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">O que aconteceu</p>
                          {andamentos.length ? (
                            <ul className="space-y-1">
                              {andamentos.map((a) => (
                                <li key={a.id}>
                                  <span className="text-slate-500">{fmtData(a.data)}:</span> {simplificar(a.descricao)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-600">Sem novidades no período.</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Próximos passos</p>
                          {proximos.length ? (
                            <ul className="space-y-1">
                              {proximos.map((z) => (
                                <li key={z.id}>
                                  {PRAZOS_SIMPLES[z.tipo] ?? z.tipo} até {fmtData(z.dataFatal)}.
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-600">Aguardando o andamento do tribunal.</p>
                          )}
                          <p className="mt-2 text-slate-600">Tempo dedicado no período: {horas(minutos)}</p>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              )}
              <footer className="mt-6 text-xs text-slate-500">
                Dúvidas? Fale com {q.nomeUsuario(dados[0]?.p.responsavelId ?? 'u7')}, responsável pelo seu atendimento. Este relatório resume as informações disponíveis nos sistemas dos tribunais e no acompanhamento da nossa equipe.
              </footer>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
