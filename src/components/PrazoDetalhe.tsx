import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck, ShieldCheck, Calculator, PencilLine } from 'lucide-react'
import type { Prazo } from '@/data/tipos'
import { useApp } from '@/store/store'
import { useConsultas } from '@/store/consultas'
import { data as fmtData, dataHora } from '@/lib/formato'
import { hojeISO } from '@/lib/datas'
import { pode } from '@/lib/permissoes'
import { urgencia } from '@/lib/urgencia'
import { cn } from '@/lib/utils'
import { Dialog } from './ui/dialog'
import { ConfirmDialog } from './ui/confirm'
import { Button } from './ui/button'
import { Input, Label } from './ui/form'
import { useToast } from './ui/toast'
import { AvisoCalculo, ConferenciaBadge, UrgenciaBadge } from './Urgencia'
import { Pessoa } from './Avatar'

/** Linha/cartão de prazo com faixa de cor de urgência. */
export function PrazoItem({ prazo, aoAbrir, compacto }: { prazo: Prazo; aoAbrir: (p: Prazo) => void; compacto?: boolean }) {
  const q = useConsultas()
  const processo = q.processo(prazo.processoId)
  const nivel = urgencia(prazo.dataFatal, prazo.cumprido).nivel
  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(prazo)}
        className={cn('flex w-full flex-col gap-1.5 rounded-md border border-l-4 bg-card p-3 text-left hover:bg-muted/60', `faixa-${nivel}`)}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-medium">{prazo.tipo}</span>
          <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />
          <ConferenciaBadge prazo={prazo} />
        </span>
        <span className="text-sm">{q.cliente(processo?.clienteId)?.nome}</span>
        <span className="break-all text-xs text-muted-foreground">
          {processo?.numero} · {processo?.tribunal}
        </span>
        {!compacto && (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Fatal: <strong className="text-foreground">{fmtData(prazo.dataFatal)}</strong>
            </span>
            <span>Segurança: {fmtData(prazo.dataSeguranca)}</span>
            <span>Resp.: {q.nomeUsuario(prazo.responsavelId)}</span>
          </span>
        )}
      </button>
    </li>
  )
}

export function PrazoDetalheDialog({ prazoId, aoFechar }: { prazoId: string | null; aoFechar: () => void }) {
  const { db, usuario, conferirPrazo, cumprirPrazo } = useApp()
  const q = useConsultas()
  const { toast } = useToast()
  const [cumprindo, setCumprindo] = useState(false)
  const [protocolo, setProtocolo] = useState(hojeISO())
  const [erro, setErro] = useState('')
  const prazo = db.prazos.find((p) => p.id === prazoId)
  if (!prazo) return null
  const processo = q.processo(prazo.processoId)!
  const tarefa = db.tarefas.find((t) => t.prazoId === prazo.id)
  const podeConferir = pode(usuario.perfil, 'conferirPrazo') && prazo.conferencia === 'Pendente'
  const mesmoLancador = prazo.lancadoPorId === usuario.id

  return (
    <>
      <Dialog
        aberto={!!prazoId}
        aoFechar={aoFechar}
        titulo={`${prazo.tipo} · ${q.cliente(processo.clienteId)?.nome}`}
        tamanho="lg"
        rodape={
          <>
            {podeConferir && (
              <Button
                variant="outline"
                disabled={mesmoLancador}
                title={mesmoLancador ? 'Quem lançou não pode conferir' : undefined}
                onClick={() => {
                  const r = conferirPrazo(prazo.id)
                  toast(r.ok ? 'Prazo conferido.' : r.erro, { tipo: r.ok ? 'sucesso' : 'erro' })
                }}
              >
                <ShieldCheck /> Conferir
              </Button>
            )}
            {!prazo.cumprido && pode(usuario.perfil, 'cumprirPrazo') && (
              <Button
                onClick={() => {
                  setProtocolo(hojeISO())
                  setErro('')
                  setCumprindo(true)
                }}
              >
                <CheckCheck /> Marcar como cumprido
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <UrgenciaBadge dataFatal={prazo.dataFatal} cumprido={prazo.cumprido} />
            <ConferenciaBadge prazo={prazo} />
          </div>
          {podeConferir && mesmoLancador && (
            <p className="rounded-md bg-muted p-2 text-xs">Você lançou este prazo. A conferência precisa ser feita por outra pessoa da controladoria.</p>
          )}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Data fatal</dt>
              <dd className="text-base font-semibold">{fmtData(prazo.dataFatal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data de segurança</dt>
              <dd className="text-base font-semibold">{fmtData(prazo.dataSeguranca)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Responsável</dt>
              <dd>
                <Pessoa nome={q.nomeUsuario(prazo.responsavelId)} id={prazo.responsavelId} />
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-muted-foreground">Processo</dt>
              <dd>
                <Link to={`/processos/${processo.id}`} className="break-all font-medium text-primary underline-offset-4 hover:underline" onClick={aoFechar}>
                  {processo.numero}
                </Link>{' '}
                · {processo.tribunal} · {processo.orgao}
              </dd>
            </div>
            {tarefa && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Tarefa vinculada</dt>
                <dd>
                  {tarefa.titulo} · {tarefa.status} · {q.nomeUsuario(tarefa.responsavelId)}
                </dd>
              </div>
            )}
            {prazo.cumprido && (
              <div>
                <dt className="text-xs text-muted-foreground">Protocolo</dt>
                <dd>{fmtData(prazo.dataProtocolo)}</dd>
              </div>
            )}
          </dl>

          <section className="rounded-md border p-3" aria-labelledby="memoria">
            <h3 id="memoria" className="mb-1 flex items-center gap-1.5 font-semibold">
              <Calculator className="size-4" aria-hidden /> Memória de cálculo
            </h3>
            <p>{prazo.memoria}</p>
            <p className="mt-2 text-xs text-muted-foreground">{prazo.regra}</p>
            {prazo.ajusteManual && (
              <p className="mt-2 flex gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <PencilLine className="size-4 shrink-0" aria-hidden />
                <span>
                  Ajuste manual de {fmtData(prazo.ajusteManual.dataCalculada)} para {fmtData(prazo.dataFatal)} por {q.nomeUsuario(prazo.ajusteManual.porId)}: “{prazo.ajusteManual.justificativa}”
                </span>
              </p>
            )}
            <AvisoCalculo className="mt-3" />
          </section>

          <p className="text-xs text-muted-foreground">
            Lançado por {q.nomeUsuario(prazo.lancadoPorId)} em {dataHora(prazo.lancadoEm)}
            {prazo.conferidoPorId && ` · Conferido por ${q.nomeUsuario(prazo.conferidoPorId)} em ${dataHora(prazo.conferidoEm!)}`}
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        aberto={cumprindo}
        titulo="Marcar prazo como cumprido?"
        descricao="Informe a data em que a peça foi protocolada. Essa ação fica registrada."
        confirmar="Confirmar cumprimento"
        aoCancelar={() => setCumprindo(false)}
        aoConfirmar={() => {
          const r = cumprirPrazo(prazo.id, protocolo)
          if (!r.ok) return setErro(r.erro)
          setCumprindo(false)
          toast('Prazo marcado como cumprido.')
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="data-protocolo">Data do protocolo</Label>
          <Input id="data-protocolo" type="date" required max={hojeISO()} value={protocolo} onChange={(e) => setProtocolo(e.target.value)} aria-invalid={!!erro} />
          {erro && <p className="text-xs text-red-700 dark:text-red-300">{erro}</p>}
        </div>
      </ConfirmDialog>
    </>
  )
}
