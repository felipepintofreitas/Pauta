import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarDays, Clock3, Inbox, ListChecks, Plus, ShieldAlert, Timer, Wallet } from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { NOMES_PERFIL } from '@/data/tipos'
import { hojeISO, inicioDoMes, fimDoMes } from '@/lib/datas'
import { dataPorExtenso, horas, reais } from '@/lib/formato'
import { urgencia, dataReferencia } from '@/lib/urgencia'
import { pode } from '@/lib/permissoes'
import { resumoCliente, somaMinutos } from '@/lib/negocio'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CardGrupoIntegracao } from '@/components/Integracao'
import { GRUPOS_INICIO } from '@/data/integracoes'

interface Destaque {
  icone: typeof Timer
  rotulo: string
  valor: string
  classe?: string
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
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
      { icone: Timer, rotulo: 'Horas para aprovar', valor: horas(somaMinutos(enviados)), classe: enviados.length ? 'urg-ate7' : undefined },
      { icone: Wallet, rotulo: 'A faturar no mês', valor: reais(aFaturar) },
    ]
  }
  if (usuario.perfil === 'socio') {
    const vencidos = abertos.filter((p) => nivel(p.dataFatal) === 'vencido').length
    return [
      { icone: AlertTriangle, rotulo: 'Prazos vencidos', valor: String(vencidos), classe: vencidos ? 'urg-vencido' : undefined },
      { icone: ShieldAlert, rotulo: 'Sem conferência', valor: String(abertos.filter((p) => p.conferencia === 'Pendente').length), classe: 'urg-ate7' },
      { icone: Wallet, rotulo: 'A faturar no mês', valor: reais(db.clientes.reduce((s, c) => s + resumoCliente(db, c, inicioDoMes(hoje), fimDoMes(hoje)).total, 0)) },
    ]
  }
  const meus = usuario.perfil === 'controladoria' ? abertos : abertos.filter((p) => p.responsavelId === usuario.id)
  const vencidos = meus.filter((p) => nivel(p.dataFatal) === 'vencido').length
  const vencemHoje = meus.filter((p) => nivel(p.dataFatal) === 'hoje').length
  const tarefas = db.tarefas.filter((t) => t.responsavelId === usuario.id && t.status !== 'Concluída' && t.dataLimite <= ref).length
  const lancado = somaMinutos(db.lancamentos.filter((l) => l.usuarioId === usuario.id && l.data === hoje))
  const lista: Destaque[] = []
  if (usuario.perfil !== 'estagiario') {
    lista.push({ icone: AlertTriangle, rotulo: 'Prazos vencidos', valor: String(vencidos), classe: vencidos ? 'urg-vencido' : undefined })
    lista.push({ icone: Clock3, rotulo: ref === hoje ? 'Vencem hoje' : 'Vencem no próximo dia útil', valor: String(vencemHoje), classe: vencemHoje ? 'urg-hoje' : undefined })
  }
  if (usuario.perfil === 'controladoria') {
    const novas = db.intimacoes.filter((i) => i.status === 'Nova').length
    lista.push({ icone: Inbox, rotulo: 'Intimações novas', valor: String(novas), classe: novas ? 'urg-ate3' : undefined })
  } else {
    lista.push({ icone: ListChecks, rotulo: 'Tarefas para hoje', valor: String(tarefas) })
  }
  lista.push({ icone: Timer, rotulo: 'Horas hoje', valor: `${horas(lancado)} de ${horas(db.config.metaDiariaMin)}` })
  return lista
}

export function Inicio() {
  const { usuario } = useApp()
  const { abrirLancamento } = useUi()
  const destaques = useDestaques()
  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{dataPorExtenso(hojeISO())}</p>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {saudacao()}, {usuario.nome.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {usuario.cargo} · {NOMES_PERFIL[usuario.perfil]}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="relative flex flex-col p-5 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">
                <Link to="/pauta" className="after:absolute after:inset-0 after:rounded-lg focus:outline-none">
                  Pauta do Dia
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">Prazos, intimações, tarefas, horas e honorários da sua rotina.</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {destaques.map((d) => (
              <div key={d.rotulo} className={cn('rounded-md border px-3 py-2', d.classe ?? 'bg-muted/50')}>
                <dt className="flex items-center gap-1 text-xs font-medium">
                  <d.icone className="size-3.5 shrink-0" aria-hidden /> {d.rotulo}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{d.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {pode(usuario.perfil, 'lancarHoras') && (
              <Button className="relative z-10" onClick={() => abrirLancamento()}>
                <Plus /> Lançar horas
              </Button>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary" aria-hidden>
              Abrir <ArrowRight className="size-4" />
            </span>
          </div>
        </Card>
        {GRUPOS_INICIO.map((g) => (
          <CardGrupoIntegracao key={g.id} grupo={g} />
        ))}
      </div>
    </div>
  )
}
