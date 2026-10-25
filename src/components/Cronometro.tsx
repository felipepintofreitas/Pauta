import { useState } from 'react'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { useConsultas } from '@/store/consultas'
import { useAgora } from '@/lib/hooks'
import { cronometro as fmtCron } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import { Select, Label } from './ui/form'

function useTempo() {
  const { cronometro } = useApp()
  const rodando = cronometro.iniciadoEm !== null
  const agora = useAgora(1000, rodando)
  const ms = cronometro.acumuladoMs + (rodando ? agora - cronometro.iniciadoEm! : 0)
  return { ms, rodando, ativo: rodando || cronometro.acumuladoMs > 0 }
}

function useParar() {
  const { pararCronometro } = useApp()
  const { abrirLancamento } = useUi()
  return () => {
    const r = pararCronometro()
    abrirLancamento({ processoId: r.processoId, tarefaId: r.tarefaId, minutos: r.minutos, origem: 'cronometro' })
  }
}

function SeletorProcesso() {
  const { db, usuario, cronometro, definirAlvoCronometro } = useApp()
  const q = useConsultas()
  const meus = db.processos.filter((p) => p.responsavelId === usuario.id || db.tarefas.some((t) => t.processoId === p.id && t.responsavelId === usuario.id))
  const lista = meus.length ? meus : db.processos
  return (
    <div className="space-y-1.5">
      <Label htmlFor="cron-proc">Processo</Label>
      <Select id="cron-proc" value={cronometro.processoId ?? ''} onChange={(e) => definirAlvoCronometro({ processoId: e.target.value || undefined, tarefaId: undefined })}>
        <option value="">Definir ao parar</option>
        {lista.map((p) => (
          <option key={p.id} value={p.id}>
            {q.cliente(p.clienteId)?.nome} · {p.numero}
          </option>
        ))}
      </Select>
    </div>
  )
}

/** Versão do topo (desktop). */
export function CronometroBarra() {
  const { cronometro, iniciarCronometro, pausarCronometro, retomarCronometro } = useApp()
  const q = useConsultas()
  const { ms, rodando, ativo } = useTempo()
  const parar = useParar()
  const alvo = cronometro.tarefaId ? q.tarefa(cronometro.tarefaId)?.titulo : q.cliente(q.processo(cronometro.processoId)?.clienteId)?.nome
  return (
    <div className={cn('flex items-center gap-1 rounded-full border bg-card py-0.5 pl-3 pr-1', rodando && 'border-primary')} role="group" aria-label="Cronômetro">
      <Timer className={cn('size-4', rodando ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
      <span className="min-w-[4.2rem] font-mono text-sm tabular-nums" aria-live="off">
        {fmtCron(ms)}
      </span>
      {alvo && <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground xl:inline">{alvo}</span>}
      {!ativo ? (
        <Button size="sm" variant="ghost" onClick={() => iniciarCronometro()} className="rounded-full">
          <Play /> Iniciar
        </Button>
      ) : (
        <>
          <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={rodando ? pausarCronometro : retomarCronometro} aria-label={rodando ? 'Pausar cronômetro' : 'Retomar cronômetro'}>
            {rodando ? <Pause /> : <Play />}
          </Button>
          <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={parar} aria-label="Parar e lançar horas">
            <Square />
          </Button>
        </>
      )}
    </div>
  )
}

/** Versão compacta para os cards: parado, só o botão "Iniciar Dia"; em uso, o cronômetro completo. */
export function CronometroDia() {
  const { iniciarCronometro } = useApp()
  const { ativo } = useTempo()
  if (ativo) return <CronometroBarra />
  return (
    <Button size="sm" variant="outline" className="min-h-11 px-2.5 text-xs md:h-8 md:min-h-8 [&_svg]:size-3.5" onClick={() => iniciarCronometro()}>
      <Play /> Iniciar Dia
    </Button>
  )
}

/** Botão flutuante (celular). */
export function CronometroFlutuante() {
  const { iniciarCronometro, pausarCronometro, retomarCronometro } = useApp()
  const { ms, rodando, ativo } = useTempo()
  const parar = useParar()
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={ativo ? `Cronômetro ${rodando ? 'em andamento' : 'pausado'}: ${fmtCron(ms)}` : 'Abrir cronômetro'}
        className={cn(
          'fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 items-center gap-2 rounded-full px-4 shadow-lg md:hidden',
          ativo ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border',
        )}
      >
        <Timer className="size-5" aria-hidden />
        {ativo && <span className="font-mono text-sm tabular-nums">{fmtCron(ms)}</span>}
      </button>
      <Dialog aberto={aberto} aoFechar={() => setAberto(false)} titulo="Cronômetro" tamanho="sm">
        <div className="space-y-4">
          <p className="text-center font-mono text-4xl tabular-nums">{fmtCron(ms)}</p>
          <SeletorProcesso />
          <div className="grid grid-cols-2 gap-2">
            {!ativo ? (
              <Button size="lg" className="col-span-2" onClick={() => iniciarCronometro()}>
                <Play /> Iniciar
              </Button>
            ) : (
              <>
                <Button size="lg" variant="secondary" onClick={rodando ? pausarCronometro : retomarCronometro}>
                  {rodando ? <Pause /> : <Play />} {rodando ? 'Pausar' : 'Retomar'}
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setAberto(false)
                    parar()
                  }}
                >
                  <Square /> Parar e lançar
                </Button>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </>
  )
}

/** Botão para iniciar o cronômetro a partir de um processo ou tarefa. */
export function BotaoIniciarCronometro({ processoId, tarefaId, compacto }: { processoId: string; tarefaId?: string; compacto?: boolean }) {
  const { cronometro, iniciarCronometro } = useApp()
  const rodandoAqui = cronometro.iniciadoEm !== null && cronometro.processoId === processoId && cronometro.tarefaId === tarefaId
  return (
    <Button
      variant="outline"
      size={compacto ? 'icon' : 'sm'}
      disabled={rodandoAqui}
      onClick={() => iniciarCronometro({ processoId, tarefaId })}
      aria-label={compacto ? 'Iniciar cronômetro nesta tarefa' : undefined}
      title="Iniciar cronômetro"
    >
      <Timer />
      {!compacto && (rodandoAqui ? 'Cronometrando' : 'Cronômetro')}
    </Button>
  )
}
