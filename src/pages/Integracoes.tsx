import { WifiOff } from 'lucide-react'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { GRUPOS_INTEGRACOES, type SituacaoNoEscritorio } from '@/data/integracoes'

const VARIANTE_SITUACAO: Record<SituacaoNoEscritorio, BadgeProps['variant']> = {
  'Em uso': 'sucesso',
  'Em migração': 'alerta',
  'Em avaliação': 'info',
  'Fonte oficial': 'neutro',
  Tribunal: 'neutro',
}

export function Integracoes() {
  const total = GRUPOS_INTEGRACOES.reduce((s, g) => s + g.itens.length, 0)
  return (
    <div>
      <CabecalhoPagina titulo="Integrações" descricao={`${total} sistemas com que o escritório trabalha. Todos estão offline neste protótipo; a conexão virá nas próximas versões.`} />
      <div className="space-y-8">
        {GRUPOS_INTEGRACOES.map((grupo) => (
          <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.itens[0].id}`}>
            <h2 id={`grupo-${grupo.itens[0].id}`} className="text-base font-semibold">
              {grupo.titulo}
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">{grupo.descricao}</p>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {grupo.itens.map((item) => (
                <li key={item.id} className="flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                      {item.nome.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{item.nome}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.descricao}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-muted-foreground">
                      <WifiOff aria-hidden /> Offline
                    </Badge>
                    <Badge variant={VARIANTE_SITUACAO[item.situacao]}>{item.situacao === 'Em uso' ? 'Em uso no escritório' : item.situacao}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">Conexão em breve</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
