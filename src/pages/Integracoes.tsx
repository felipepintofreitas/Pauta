import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Plug, WifiOff } from 'lucide-react'
import { useApp } from '@/store/store'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { CardGrupoIntegracao } from '@/components/Integracao'
import { ITENS_MENU } from '@/components/layout/Shell'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { EstadoVazio } from '@/components/ui/empty-state'
import { LinkBotao } from '@/components/ui/button'
import { podeAcessar } from '@/lib/permissoes'
import { usoDoItem } from '@/lib/integracoes'
import { FLUXO_INTEGRACOES, GRUPOS_INTEGRACOES, grupoPorId, type SituacaoNoEscritorio } from '@/data/integracoes'

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

      <section aria-labelledby="fluxo" className="mb-8">
        <h2 id="fluxo" className="text-base font-semibold">
          Como as integrações se encadeiam
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">Do DJEN ao protocolo, cada etapa passa por um grupo de sistemas.</p>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {FLUXO_INTEGRACOES.map((f, k) => {
            const g = grupoPorId(f.grupo)!
            return (
              <li key={f.grupo}>
                <Link to={`/integracoes/${g.id}`} className="flex h-full items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden>
                    {k + 1}
                  </span>
                  <span>
                    <span className="block font-medium">{g.titulo}</span>
                    <span className="text-muted-foreground">{f.passo}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <h2 className="mb-3 text-base font-semibold">Grupos de sistemas</h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GRUPOS_INTEGRACOES.map((g) => (
          <li key={g.id}>
            <CardGrupoIntegracao grupo={g} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GrupoIntegracao() {
  const { grupo: id } = useParams()
  const { db, usuario } = useApp()
  const grupo = grupoPorId(id ?? '')
  if (!grupo) return <EstadoVazio icone={Plug} titulo="Grupo de integrações não encontrado" descricao="Volte à lista de integrações." acao={<LinkBotao to="/integracoes">Ver integrações</LinkBotao>} />
  const conexoes = grupo.conexoes.filter((c) => !c.modulo || podeAcessar(usuario.perfil, c.modulo))

  return (
    <div>
      <CabecalhoPagina titulo={grupo.titulo} descricao={`${grupo.descricao} Offline neste protótipo.`} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {grupo.itens.map((item) => {
          const uso = usoDoItem(db, item)
          return (
            <li key={item.id} className="flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                  {item.nome.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{item.nome}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.descricao}</p>
                </div>
              </div>
              {uso && !podeAcessar(usuario.perfil, uso.modulo) && <p className="text-sm text-muted-foreground">{uso.texto}</p>}
              {uso && podeAcessar(usuario.perfil, uso.modulo) && (
                <Link to={uso.caminho} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary hover:underline md:min-h-0">
                  {uso.texto} <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  <WifiOff aria-hidden /> Offline
                </Badge>
                <Badge variant={VARIANTE_SITUACAO[item.situacao]}>{item.situacao === 'Em uso' ? 'Em uso no escritório' : item.situacao}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">Conexão em breve</span>
              </div>
            </li>
          )
        })}
      </ul>

      <section aria-labelledby="conexoes" className="mt-8">
        <h2 id="conexoes" className="text-base font-semibold">
          Como se conecta
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">Telas da Pauta e outros grupos de sistemas que usariam estes dados.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {conexoes.map((c) => {
            const destino = c.modulo ? ITENS_MENU[c.modulo] : null
            const Icone = destino?.icone ?? grupoPorId(c.grupo!)!.icone
            return (
              <li key={c.rotulo}>
                <Link to={destino ? destino.caminho : `/integracoes/${c.grupo}`} className="flex h-full items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                    <Icone className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {c.rotulo}
                      <span className="text-xs font-normal text-muted-foreground">{destino ? 'Tela da Pauta' : 'Integração'}</span>
                    </span>
                    <span className="text-muted-foreground">{c.descricao}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
