import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sun,
  Moon,
  Inbox,
  CalendarClock,
  ListChecks,
  Timer,
  FolderOpen,
  Receipt,
  FileText,
  Settings,
  Search,
  CalendarDays,
  Plug,
  ChevronLeft,
  Home,
  Check,
  Plus,
  LogOut,
  Menu as MenuIcone,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { NOMES_PERFIL, type Perfil } from '@/data/tipos'
import { menuDoPerfil, pode, type Rota } from '@/lib/permissoes'
import { gravar, ler } from '@/lib/armazenamento'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Avatar } from '../Avatar'
import { CronometroFlutuante } from '../Cronometro'
import { BuscaGlobal } from '../BuscaGlobal'
import { LancarHorasDialog } from '../LancarHorasDialog'

export const ITENS_MENU: Record<Rota, { rotulo: string; curto: string; caminho: string; icone: LucideIcon }> = {
  'meu-dia': { rotulo: 'Meu dia', curto: 'Meu dia', caminho: '/meu-dia', icone: Home },
  intimacoes: { rotulo: 'Intimações', curto: 'Intimações', caminho: '/intimacoes', icone: Inbox },
  prazos: { rotulo: 'Prazos', curto: 'Prazos', caminho: '/prazos', icone: CalendarClock },
  tarefas: { rotulo: 'Tarefas e controladoria', curto: 'Tarefas', caminho: '/tarefas', icone: ListChecks },
  timesheet: { rotulo: 'Timesheet', curto: 'Horas', caminho: '/timesheet', icone: Timer },
  processos: { rotulo: 'Processos', curto: 'Processos', caminho: '/processos', icone: FolderOpen },
  honorarios: { rotulo: 'Honorários', curto: 'Honorários', caminho: '/honorarios', icone: Receipt },
  relatorio: { rotulo: 'Relatório para o cliente', curto: 'Relatório', caminho: '/relatorio', icone: FileText },
  configuracoes: { rotulo: 'Configurações', curto: 'Ajustes', caminho: '/configuracoes', icone: Settings },
}

function useTema() {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
    gravar('pauta:tema-v2', escuro ? 'escuro' : 'claro')
  }, [escuro])
  return { escuro, alternar: () => setEscuro((v) => !v) }
}

/** Marca do escritório: "madrona" em azul e "advogados" em cinza, como no logo. */
function Marca() {
  return (
    <span className="flex flex-col leading-none" aria-hidden>
      <span className="text-[1.45rem] font-extrabold lowercase tracking-[-0.03em] text-brand">madrona</span>
      <span className="-mt-0.5 pl-px text-[0.8rem] font-normal lowercase tracking-[0.01em] text-brand-muted">advogados</span>
    </span>
  )
}

export function useContagens(): Partial<Record<Rota, number>> {
  const { db, usuario } = useApp()
  if (usuario.perfil === 'controladoria') return { intimacoes: db.intimacoes.filter((i) => i.status === 'Nova').length }
  if (usuario.perfil === 'financeiro') return { timesheet: db.lancamentos.filter((l) => l.status === 'Enviado').length }
  return {}
}

const ORDEM_PERFIS: Perfil[] = ['advogado', 'estagiario', 'controladoria', 'socio', 'financeiro']

function useUsuariosOrdenados() {
  const { db } = useApp()
  return ORDEM_PERFIS.flatMap((p) => db.usuarios.filter((u) => u.perfil === p))
}

/** Avatar do usuário logado com os dados dele, a troca de usuário e a saída do sistema. */
function MenuUsuario({ aoSair }: { aoSair: () => void }) {
  const { usuario, trocarUsuario } = useApp()
  const usuarios = useUsuariosOrdenados()
  const { aberto, setAberto, caixa, botao } = usePainel()
  return (
    <div ref={caixa} className="relative">
      <Button ref={botao} variant="ghost" size="icon" className="rounded-full" aria-label={`Conta de ${usuario.nome}`} aria-expanded={aberto} aria-controls="menu-usuario" onClick={() => setAberto((v) => !v)}>
        <Avatar nome={usuario.nome} id={usuario.id} />
      </Button>
      {aberto && (
        <div id="menu-usuario" className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border bg-card shadow-lg">
          <div className="flex items-center gap-3 border-b p-3">
            <Avatar nome={usuario.nome} id={usuario.id} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold">{usuario.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {usuario.cargo} · {NOMES_PERFIL[usuario.perfil]}
              </p>
              <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-1.5">
            <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground" id="trocar-usuario">
              Trocar usuário
            </p>
            <ul aria-labelledby="trocar-usuario">
              {usuarios.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    aria-current={u.id === usuario.id ? 'true' : undefined}
                    onClick={() => {
                      trocarUsuario(u.id)
                      setAberto(false)
                    }}
                    className={cn('flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted', u.id === usuario.id && 'bg-secondary text-secondary-foreground')}
                  >
                    <Avatar nome={u.nome} id={u.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">{NOMES_PERFIL[u.perfil]}</span>
                    </span>
                    {u.id === usuario.id && <Check className="size-4 shrink-0" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t p-1.5">
            <button type="button" onClick={aoSair} className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-red-700 hover:bg-muted dark:text-red-300">
              <LogOut className="size-4" aria-hidden /> Sair do sistema
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tela mostrada depois de sair: no protótipo, entrar é só escolher um usuário. */
function TelaEntrada({ aoEntrar }: { aoEntrar: (id: string) => void }) {
  const usuarios = useUsuariosOrdenados()
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <Marca />
        <h1 className="mt-4 text-xl font-semibold">Você saiu do sistema</h1>
        <p className="mb-4 text-sm text-muted-foreground">Escolha um usuário para entrar de novo. No protótipo não há senha.</p>
        <ul className="space-y-1">
          {usuarios.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => aoEntrar(u.id)} className="flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm hover:border-primary hover:bg-muted">
                <Avatar nome={u.nome} id={u.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{u.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {u.cargo} · {NOMES_PERFIL[u.perfil]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

type ItemNavegacao = { rotulo: string; caminho: string; icone: LucideIcon; ativo: boolean; contagem?: number }

/** Estado de um painel suspenso: fecha ao trocar de página, ao clicar fora e com Esc. */
function usePainel() {
  const [aberto, setAberto] = useState(false)
  const local = useLocation()
  const caixa = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => setAberto(false), [local.pathname])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])
  return { aberto, setAberto, caixa, botao }
}

/** Menu colapsável no canto superior direito com as áreas do sistema. */
function MenuPrincipal({ itens, aoLancarHoras }: { itens: ItemNavegacao[]; aoLancarHoras?: () => void }) {
  const { aberto, setAberto, caixa, botao } = usePainel()
  const pendentes = itens.reduce((s, i) => s + (i.contagem ?? 0), 0)
  return (
    <div ref={caixa} className="relative">
      <Button ref={botao} variant="ghost" size="icon" className="relative" aria-label="Menu" aria-expanded={aberto} aria-controls="menu-principal" onClick={() => setAberto((v) => !v)}>
        {aberto ? <X /> : <MenuIcone />}
        {!!pendentes && (
          <span className="absolute right-0.5 top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {pendentes}
            <span className="sr-only"> pendentes</span>
          </span>
        )}
      </Button>
      {aberto && (
        <nav id="menu-principal" aria-label="Menu principal" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border bg-card p-1.5 shadow-lg">
          <ul>
            {itens.map((item) => {
              const Icone = item.icone
              return (
                <li key={item.caminho}>
                  <Link
                    to={item.caminho}
                    aria-current={item.ativo ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                      item.ativo ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <Icone className="size-4 shrink-0" aria-hidden />
                    {item.rotulo}
                    {!!item.contagem && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {item.contagem}
                        <span className="sr-only"> pendentes</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
          {aoLancarHoras && (
            <div className="mt-1 border-t pt-1">
              <button
                type="button"
                onClick={() => {
                  setAberto(false)
                  aoLancarHoras()
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Lançar horas
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { usuario, trocarUsuario } = useApp()
  const { setBuscaAberta, abrirLancamento } = useUi()
  const [conectado, setConectado] = useState(() => ler<string>('pauta:sessao') !== 'saiu')
  const tema = useTema()
  const local = useLocation()
  const contagens = useContagens()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [local.pathname])

  const menu = menuDoPerfil(usuario.perfil)
  const lancaHoras = pode(usuario.perfil, 'lancarHoras')
  const caminho = local.pathname
  const emConfig = caminho.startsWith('/configuracoes')
  const emIntegracoes = caminho.startsWith('/integracoes')
  const grupoIntegracao = caminho.startsWith('/integracoes/')
  const pendentesPauta = Object.values(contagens).reduce((s, n) => s + (n ?? 0), 0)
  const navegacao: ItemNavegacao[] = [
    { rotulo: 'Pauta do Dia', caminho: '/pauta', icone: CalendarDays, ativo: caminho !== '/' && !emConfig && !emIntegracoes, contagem: pendentesPauta },
    { rotulo: 'Integrações', caminho: '/integracoes', icone: Plug, ativo: emIntegracoes },
  ]
  if (menu.includes('configuracoes')) navegacao.push({ rotulo: 'Configurações', caminho: '/configuracoes', icone: Settings, ativo: emConfig })
  const sair = () => {
    gravar('pauta:sessao', 'saiu')
    setConectado(false)
  }
  const entrar = (id: string) => {
    trocarUsuario(id)
    gravar('pauta:sessao', 'conectado')
    setConectado(true)
  }
  const modulo = (Object.keys(ITENS_MENU) as Rota[]).find((r) => r !== 'configuracoes' && caminho.startsWith(ITENS_MENU[r].caminho) && ITENS_MENU[r].caminho !== '/')

  if (!conectado) return <TelaEntrada aoEntrar={entrar} />

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-card focus:p-3">
        Pular para o conteúdo
      </a>

      <div className="flex min-h-dvh flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:h-16 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link to="/" aria-label="Madrona Advogados, ir para o início" title="Ir para o início" className="shrink-0 rounded-md">
              <Marca />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            className="hidden min-h-10 w-[22rem] shrink items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-muted lg:flex xl:w-[28rem]"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Buscar processo, cliente, tarefa…</span>
            <kbd className="ml-auto whitespace-nowrap rounded border bg-muted px-1.5 text-xs">Ctrl K</kbd>
          </button>
          <div className="flex flex-1 items-center justify-end gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setBuscaAberta(true)} aria-label="Buscar">
              <Search />
            </Button>
            <Button variant="ghost" size="icon" onClick={tema.alternar} aria-label={tema.escuro ? 'Usar modo claro' : 'Usar modo escuro'}>
              {tema.escuro ? <Sun /> : <Moon />}
            </Button>
            <MenuUsuario aoSair={sair} />
            <MenuPrincipal itens={navegacao} aoLancarHoras={lancaHoras ? () => abrirLancamento() : undefined} />
          </div>
        </header>

        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-6 md:pt-6">
          {grupoIntegracao && (
            <nav aria-label="Você está em" className="mb-2 text-sm">
              <Link to="/integracoes" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline md:min-h-0">
                <ChevronLeft className="size-4" aria-hidden /> Integrações
              </Link>
            </nav>
          )}
          {modulo && (
            <nav aria-label="Você está em" className="mb-2 text-sm">
              <Link to="/pauta" className="inline-flex min-h-11 items-center gap-1 font-medium text-primary hover:underline md:min-h-0">
                <ChevronLeft className="size-4" aria-hidden /> Pauta do Dia
              </Link>
              <span className="text-muted-foreground"> / {ITENS_MENU[modulo].rotulo}</span>
            </nav>
          )}
          {children}
        </main>
      </div>

      {lancaHoras && <CronometroFlutuante />}
      <BuscaGlobal />
      <LancarHorasDialog />
    </div>
  )
}
