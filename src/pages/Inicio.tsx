import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, Clock3, Inbox, ListChecks, ShieldAlert, Timer, Wallet } from 'lucide-react'
import { useApp } from '@/store/store'
import { diaDaSemana, hojeISO, inicioDoMes, fimDoMes, somarDias } from '@/lib/datas'
import { horas } from '@/lib/formato'
import { urgencia, dataReferencia } from '@/lib/urgencia'
import { pode } from '@/lib/permissoes'
import { resumoCliente, somaMinutos } from '@/lib/negocio'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { CronometroDia } from '@/components/Cronometro'
import { CardGrupoIntegracao } from '@/components/Integracao'
import { GRUPOS_INICIO } from '@/data/integracoes'

interface Destaque {
  icone: typeof Timer
  rotulo: string
  valor: string
  classe?: string
}

/** Valor em reais abreviado para caber no card (ex.: R$ 133,9 mil). */
const reaisCurto = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)

const DIAS_CURTOS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']

/** Rótulo curto para os prazos do dia de referência: hoje, amanhã ou o dia da semana. */
function rotuloVencem(hoje: string, ref: string) {
  if (ref === hoje) return 'Para hoje'
  if (ref === somarDias(hoje, 1)) return 'Para amanhã'
  return `Para ${DIAS_CURTOS[diaDaSemana(ref)]}`
}

/** Números do dia mostrados no card, conforme o perfil. */
function useDestaques(): Destaque[] {
  const { db, usuario } = useApp()
  const hoje = hojeISO()
  const ref = dataReferencia()
  const abertos = db.prazos.filter((p) => !p.cumprido)
  const nivel = (d: string) => urgencia(d).nivel

  if (usuario.perfil === 'financeiro') {
    const enviados = db.lancamentos.filter((l) => l.status === 'Enviado')
    const aFaturar = db.clientes.reduce((s, c) => s + resumoCliente(db, c, inicioDoMes(hoje), fimDoMes(hoje)).total, 0)
    return [
      { icone: Timer, rotulo: 'A aprovar', valor: horas(somaMinutos(enviados)), classe: enviados.length ? 'urg-ate7' : undefined },
      { icone: Wallet, rotulo: 'A faturar', valor: reaisCurto(aFaturar) },
    ]
  }
  if (usuario.perfil === 'socio') {
    const vencidos = abertos.filter((p) => nivel(p.dataFatal) === 'vencido').length
    return [
      { icone: AlertTriangle, rotulo: 'Vencidos', valor: String(vencidos), classe: vencidos ? 'urg-vencido' : undefined },
      { icone: ShieldAlert, rotulo: 'A conferir', valor: String(abertos.filter((p) => p.conferencia === 'Pendente').length), classe: 'urg-ate7' },
      { icone: Wallet, rotulo: 'A faturar', valor: reaisCurto(db.clientes.reduce((s, c) => s + resumoCliente(db, c, inicioDoMes(hoje), fimDoMes(hoje)).total, 0)) },
    ]
  }
  const meus = usuario.perfil === 'controladoria' ? abertos : abertos.filter((p) => p.responsavelId === usuario.id)
  const vencidos = meus.filter((p) => nivel(p.dataFatal) === 'vencido').length
  const vencemHoje = meus.filter((p) => nivel(p.dataFatal) === 'hoje').length
  const tarefas = db.tarefas.filter((t) => t.responsavelId === usuario.id && t.status !== 'Concluída' && t.dataLimite <= ref).length
  const lancado = somaMinutos(db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data === hoje))
  const lista: Destaque[] = []
  if (usuario.perfil !== 'estagiario') {
    lista.push({ icone: AlertTriangle, rotulo: 'Vencidos', valor: String(vencidos), classe: vencidos ? 'urg-vencido' : undefined })
    lista.push({ icone: Clock3, rotulo: rotuloVencem(hoje, ref), valor: String(vencemHoje), classe: vencemHoje ? 'urg-hoje' : undefined })
  }
  if (usuario.perfil === 'controladoria') {
    const novas = db.intimacoes.filter((i) => i.status === 'Nova').length
    lista.push({ icone: Inbox, rotulo: 'Intimações', valor: String(novas), classe: novas ? 'urg-ate3' : undefined })
  } else {
    lista.push({ icone: ListChecks, rotulo: 'Tarefas', valor: String(tarefas) })
  }
  lista.push({ icone: Timer, rotulo: 'Horas', valor: `${horas(lancado)}/${horas(db.config.metaDiariaMin)}` })
  return lista
}

export function Inicio() {
  const { usuario } = useApp()
  const destaques = useDestaques()
  const lanca = pode(usuario.perfil, 'lancarHoras')
  return (
    <div className="lg:flex lg:h-[calc(100dvh-4rem-3rem)] lg:min-h-[30rem] lg:flex-col">
      <h1 className="sr-only">Início</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-4 lg:grid-rows-2">
        <Card className="relative flex flex-col p-4 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">
                <Link to="/pauta" className="after:absolute after:inset-0 after:rounded-lg focus:outline-none">
                  Pauta do Dia
                </Link>
              </h2>
              <p className="truncate text-sm text-muted-foreground">Sua rotina de hoje</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {destaques.map((d) => (
              <div key={d.rotulo} className={cn('rounded-md border px-2 py-1.5', d.classe ?? 'bg-muted/50')}>
                <dt className="flex min-w-0 items-center gap-1 text-xs font-medium">
                  <d.icone className="size-3 shrink-0" aria-hidden />
                  <span className="truncate" title={d.rotulo}>
                    {d.rotulo}
                  </span>
                </dt>
                <dd className="truncate text-lg font-semibold leading-tight tabular-nums">{d.valor}</dd>
              </div>
            ))}
          </dl>
          {lanca && (
            <div className="relative z-10 mt-auto flex pt-3">
              <CronometroDia />
            </div>
          )}
        </Card>
        {GRUPOS_INICIO.map((g) => (
          <CardGrupoIntegracao key={g.id} grupo={g} />
        ))}
      </div>
    </div>
  )
}
