import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { Prazo } from '@/data/tipos'
import { urgencia } from '@/lib/urgencia'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'

export function UrgenciaBadge({ dataFatal, cumprido, className }: { dataFatal: string; cumprido?: boolean; className?: string }) {
  const u = urgencia(dataFatal, cumprido)
  const Icone = u.nivel === 'cumprido' ? CheckCircle2 : u.nivel === 'vencido' || u.nivel === 'hoje' ? AlertTriangle : Clock
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5', `urg-${u.nivel}`, className)}>
      <Icone aria-hidden />
      {u.rotulo}
    </span>
  )
}

export function ConferenciaBadge({ prazo }: { prazo: Pick<Prazo, 'conferencia'> }) {
  return prazo.conferencia === 'Conferido' ? (
    <Badge variant="sucesso">
      <ShieldCheck aria-hidden />
      Conferido
    </Badge>
  ) : (
    <Badge variant="alerta">
      <ShieldAlert aria-hidden />
      Sem conferência
    </Badge>
  )
}

export function AvisoCalculo({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100', className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      Cálculo de apoio. Confira antes de protocolar.
    </p>
  )
}
