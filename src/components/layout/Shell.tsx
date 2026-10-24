import { useEffect, useState, type ReactNode } from 'react'
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
  ChevronLeft,
  Home,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { NOMES_PERFIL, type Perfil } from '@/data/tipos'
import { menuDoPerfil, pode, type Rota } from '@/lib/permissoes'
import { gravar } from '@/lib/armazenamento'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Select } from '../ui/form'
import { Avatar } from '../Avatar'
import { CronometroBarra, CronometroFlutuante } from '../Cronometro'
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

function Marca() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        P
      </span>
      <span className="text-lg">Pauta</span>
    </span>
  )
}

export function useContagens(): Partial<Record<Rota, number>> {
  const { db, usuario } = useApp()
  if (usuario.perfil === 'controladoria') return { intimacoes: db.intimacoes.filter((i) => i.status === 'Nova').length }
  if (usuario.perfil === 'financeiro') return { timesheet: db.lancamentos.filter((l) => l.status === 'Enviado').length }
  return {}
}

function SeletorPerfil({ id, className }: { id: string; className?: string }) {
  const { db, usuario, trocarUsuario } = useApp()
  const perfis: Perfil[] = ['advogado', 'estagiario', 'controladoria', 'socio', 'financeiro']
  return (
    <Select id={id} aria-label="Perfil em uso no protótipo" value={usuario.id} onChange={(e) => trocarUsuario(e.target.value)} className={className}>
      {perfis.map((p) => (
        <optgroup key={p} label={NOMES_PERFIL[p]}>
          {db.usuarios
            .filter((u) => u.perfil === p)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} · {NOMES_PERFIL[p]}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { usuario } = useApp()
  const { setBuscaAberta } = useUi()
  const tema = useTema()
  const local = useLocation()
  const contagens = useContagens()
  const [perfilAberto, setPerfilAberto] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [local.pathname])

  const menu = menuDoPerfil(usuario.perfil)
  const lancaHoras = pode(usuario.perfil, 'lancarHoras')
  const caminho = local.pathname
  const emConfig = caminho.startsWith('/configuracoes')
  const pendentesPauta = Object.values(contagens).reduce((s, n) => s + (n ?? 0), 0)
  const navegacao: { rotulo: string; caminho: string; icone: LucideIcon; ativo: boolean; contagem?: number }[] = [
    { rotulo: 'Pauta do Dia', caminho: '/pauta', icone: CalendarDays, ativo: caminho !== '/' && !emConfig, contagem: pendentesPauta },
  ]
  if (menu.includes('configuracoes')) navegacao.push({ rotulo: 'Configurações', caminho: '/configuracoes', icone: Settings, ativo: emConfig })
  const modulo = (Object.keys(ITENS_MENU) as Rota[]).find((r) => r !== 'configuracoes' && caminho.startsWith(ITENS_MENU[r].caminho) && ITENS_MENU[r].caminho !== '/')

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-card focus:p-3">
        Pular para o conteúdo
      </a>

      <div className="flex min-h-dvh flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:h-16 md:px-6">
          <Link to="/" aria-label="Pauta, ir para o início" title="Ir para o início" className="shrink-0 rounded-md">
            <Marca />
          </Link>
          <nav aria-label="Menu principal" className="ml-4 hidden items-center gap-1 md:flex">
            {navegacao.map((item) => {
              const Icone = item.icone
              return (
                <Link
                  key={item.caminho}
                  to={item.caminho}
                  aria-current={item.ativo ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                    item.ativo ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icone className="size-4 shrink-0" aria-hidden />
                  {item.rotulo}
                  {!!item.contagem && (
                    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {item.contagem}
                      <span className="sr-only"> pendentes</span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            className="ml-2 hidden min-h-10 w-full min-w-0 max-w-sm items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-muted xl:flex"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Buscar processo, cliente, tarefa…</span>
            <kbd className="ml-auto whitespace-nowrap rounded border bg-muted px-1.5 text-xs">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {lancaHoras && (
              <div className="hidden lg:block">
                <CronometroBarra />
              </div>
            )}
            <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setBuscaAberta(true)} aria-label="Buscar">
              <Search />
            </Button>
            <Button variant="ghost" size="icon" onClick={tema.alternar} aria-label={tema.escuro ? 'Usar modo claro' : 'Usar modo escuro'}>
              {tema.escuro ? <Sun /> : <Moon />}
            </Button>
            <div className="hidden items-center gap-2 xl:flex">
              <label htmlFor="perfil-desktop" className="text-xs text-muted-foreground">
                Perfil
              </label>
              <SeletorPerfil id="perfil-desktop" className="w-56" />
            </div>
            <Button variant="ghost" className="gap-2 px-2 xl:hidden" onClick={() => setPerfilAberto(true)} aria-label={`Trocar perfil (atual: ${usuario.nome}, ${NOMES_PERFIL[usuario.perfil]})`}>
              <Avatar nome={usuario.nome} id={usuario.id} />
              <span className="hidden text-left text-xs leading-tight sm:max-md:block">
                <span className="block font-medium text-foreground">{usuario.nome}</span>
                <span className="block text-muted-foreground">{NOMES_PERFIL[usuario.perfil]}</span>
              </span>
            </Button>
          </div>
        </header>

        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-36 pt-4 md:px-6 md:pb-10 md:pt-6">
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

      {/* Navegação inferior (celular) */}
      <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden">
        <ul className={cn('grid', navegacao.length === 2 ? 'grid-cols-3' : 'grid-cols-2')}>
          {[...navegacao.slice(0, 1), { rotulo: 'Buscar', caminho: '', icone: Search, ativo: false, contagem: 0 }, ...navegacao.slice(1)].map((item) => {
            const Icone = item.icone
            const conteudo = (
              <>
                <span className={cn('grid h-7 w-12 place-items-center rounded-full', item.ativo && 'bg-secondary')}>
                  <Icone className="size-5" aria-hidden />
                </span>
                {item.rotulo === 'Configurações' ? 'Ajustes' : item.rotulo}
                {!!item.contagem && (
                  <span className="absolute right-3 top-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {item.contagem}
                    <span className="sr-only"> pendentes</span>
                  </span>
                )}
              </>
            )
            const classe = cn('relative flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', item.ativo ? 'text-primary' : 'text-muted-foreground')
            return (
              <li key={item.rotulo}>
                {item.caminho ? (
                  <Link to={item.caminho} aria-current={item.ativo ? 'page' : undefined} className={classe}>
                    {conteudo}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setBuscaAberta(true)} className={classe}>
                    {conteudo}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <Dialog aberto={perfilAberto} aoFechar={() => setPerfilAberto(false)} titulo="Perfil do protótipo" descricao="Trocar o perfil muda o menu, a tela inicial e as permissões." tamanho="sm">
        <SeletorPerfil id="perfil-mobile" />
      </Dialog>

      {lancaHoras && <CronometroFlutuante />}
      <BuscaGlobal />
      <LancarHorasDialog />
    </div>
  )
}
