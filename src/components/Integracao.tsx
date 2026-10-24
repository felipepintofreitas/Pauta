import { Link } from 'react-router-dom'
import { ArrowRight, Plug, WifiOff, type LucideIcon } from 'lucide-react'
import { useApp } from '@/store/store'
import { resumoDoGrupo } from '@/lib/integracoes'
import type { GrupoIntegracoes } from '@/data/integracoes'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useToast } from './ui/toast'

/** Botão de uma ação que dependeria de um sistema externo. No protótipo só avisa que está offline. */
export function AcaoIntegracao({ sistema, rotulo, icone: Icone = Plug, variant = 'outline' }: { sistema: string; rotulo: string; icone?: LucideIcon; variant?: 'outline' | 'ghost' }) {
  const { toast } = useToast()
  return (
    <Button variant={variant} onClick={() => toast(`${sistema} está offline neste protótipo. A conexão virá nas próximas versões.`, { tipo: 'info' })}>
      <Icone aria-hidden /> {rotulo}
      <WifiOff className="text-muted-foreground" aria-hidden />
      <span className="sr-only">(offline)</span>
    </Button>
  )
}

/** Bloco com as ações externas ligadas à tela atual. */
export function BlocoIntegracoes({ acoes, grupo }: { acoes: { sistema: string; rotulo: string; icone?: LucideIcon }[]; grupo?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Integrações
          <Badge variant="outline" className="font-normal text-muted-foreground">
            <WifiOff aria-hidden /> Offline
          </Badge>
        </CardTitle>
        <Link to={grupo ? `/integracoes/${grupo}` : '/integracoes'} className="text-sm font-medium text-primary hover:underline">
          Ver sistemas
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {acoes.map((a) => (
            <AcaoIntegracao key={a.rotulo} {...a} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Card de um grupo de integrações, usado na página inicial e na visão geral. */
export function CardGrupoIntegracao({ grupo }: { grupo: GrupoIntegracoes }) {
  const { db } = useApp()
  const Icone = grupo.icone
  return (
    <Card className="relative flex h-full flex-col p-5 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icone className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">
            <Link to={`/integracoes/${grupo.id}`} className="after:absolute after:inset-0 after:rounded-lg focus:outline-none">
              {grupo.titulo}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{grupo.descricao}</p>
        </div>
      </div>
      <p className="mt-3 text-sm">
        <span className="font-semibold">{resumoDoGrupo(db, grupo)}</span>
        <span className="text-muted-foreground"> · {grupo.itens.map((i) => i.nome).join(', ')}</span>
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <Badge variant="outline" className="text-muted-foreground">
          <WifiOff aria-hidden /> Offline
        </Badge>
        <span className="text-xs text-muted-foreground">
          {grupo.itens.length} {grupo.itens.length === 1 ? 'sistema' : 'sistemas'} · {grupo.conexoes.length} conexões
        </span>
        <ArrowRight className="ml-auto size-4 text-primary" aria-hidden />
      </div>
    </Card>
  )
}
