import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Home,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '@/store/store'
import { useUi } from '@/store/ui'
import { NOMES_PERFIL, type Perfil } from '@/data/tipos'
import { menuDoPerfil, pode, type Rota } from '@/lib/permissoes'
import { gravar, ler } from '@/lib/armazenamento'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Select } from '../ui/form'
import { Avatar } from '../Avatar'
import { CronometroBarra, CronometroFlutuante } from '../Cronometro'
import { BuscaGlobal } from '../BuscaGlobal'
import { LancarHorasDialog } from '../LancarHorasDialog'

export const ITENS_MENU: Record<Rota, { rotulo: string; curto: string; caminho: string; icone: LucideIcon }> = {
  'meu-dia': { rotulo: 'Meu dia', curto: 'Meu dia', caminho: '/', icone: Home },
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
    gravar('pauta:tema', escuro ? 'escuro' : 'claro')
  }, [escuro])
  return { escuro, alternar: () => setEscuro((v) => !v) }
}

function Marca({ recolhido }: { recolhido?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span aria-hidden className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        P
      </span>
      {!recolhido && <span className="text-lg">Pauta</span>}
    </span>
  )
}

function useContagens(): Partial<Record<Rota, number>> {
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
  const [recolhido, setRecolhido] = useState(() => ler<boolean>('pauta:menu-recolhido') ?? false)
  const [maisAberto, setMaisAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  useEffect(() => gravar('pauta:menu-recolhido', recolhido), [recolhido])
  useEffect(() => {
    setMaisAberto(false)
    window.scrollTo(0, 0)
  }, [local.pathname])

  const menu = menuDoPerfil(usuario.perfil)
  const lancaHoras = pode(usuario.perfil, 'lancarHoras')
  const principais = menu.slice(0, 4)
  const extras = menu.slice(4)
  const extraAtivo = extras.some((r) => ITENS_MENU[r].caminho !== '/' && local.pathname.startsWith(ITENS_MENU[r].caminho))

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-md focus:bg-card focus:p-3">
        Pular para o conteúdo
      </a>

      {/* Menu lateral (desktop) */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-[width] md:flex', recolhido ? 'w-[4.5rem]' : 'w-60')} aria-label="Menu principal">
        <div className={cn('flex h-16 items-center border-b', recolhido ? 'justify-center' : 'justify-between px-4')}>
          <Marca recolhido={recolhido} />
          {!recolhido && (
            <Button variant="ghost" size="icon" onClick={() => setRecolhido(true)} aria-label="Recolher menu">
              <PanelLeftClose />
            </Button>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {menu.map((r) => {
            const item = ITENS_MENU[r]
            const Icone = item.icone
            const n = contagens[r]
            return (
              <NavLink
                key={r}
                to={item.caminho}
                end={item.caminho === '/'}
                title={recolhido ? item.rotulo : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    recolhido && 'justify-center px-0',
                    isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icone className="size-5 shrink-0" aria-hidden />
                <span className={cn(recolhido && 'sr-only')}>{item.rotulo}</span>
                {!!n && (
                  <span className={cn('ml-auto rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground', recolhido && 'absolute right-1 top-1')}>
                    {n}
                    <span className="sr-only"> pendentes</span>
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
        {recolhido && (
          <div className="flex justify-center border-t p-2">
            <Button variant="ghost" size="icon" onClick={() => setRecolhido(false)} aria-label="Expandir menu">
              <PanelLeftOpen />
            </Button>
          </div>
        )}
      </aside>

      <div className={cn('flex min-h-dvh flex-col transition-[padding]', recolhido ? 'md:pl-[4.5rem]' : 'md:pl-60')}>
        {/* Barra superior */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:h-16 md:px-6">
          <span className="md:hidden">
            <Marca />
          </span>
          <button
            type="button"
            onClick={() => setBuscaAberta(true)}
            className="hidden min-h-10 w-full max-w-sm items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-muted md:flex"
          >
            <Search className="size-4" aria-hidden />
            Buscar processo, cliente, tarefa…
            <kbd className="ml-auto rounded border bg-muted px-1.5 text-xs">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {lancaHoras && (
              <div className="hidden md:block">
                <CronometroBarra />
              </div>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setBuscaAberta(true)} aria-label="Buscar">
              <Search />
            </Button>
            <Button variant="ghost" size="icon" onClick={tema.alternar} aria-label={tema.escuro ? 'Usar modo claro' : 'Usar modo escuro'}>
              {tema.escuro ? <Sun /> : <Moon />}
            </Button>
            <div className="hidden items-center gap-2 lg:flex">
              <label htmlFor="perfil-desktop" className="text-xs text-muted-foreground">
                Perfil
              </label>
              <SeletorPerfil id="perfil-desktop" className="w-64" />
            </div>
            <Button variant="ghost" className="gap-2 px-2 lg:hidden" onClick={() => setPerfilAberto(true)} aria-label={`Trocar perfil (atual: ${usuario.nome}, ${NOMES_PERFIL[usuario.perfil]})`}>
              <Avatar nome={usuario.nome} id={usuario.id} />
              <span className="hidden text-left text-xs leading-tight sm:block">
                <span className="block font-medium text-foreground">{usuario.nome}</span>
                <span className="block text-muted-foreground">{NOMES_PERFIL[usuario.perfil]}</span>
              </span>
            </Button>
          </div>
        </header>

        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-36 pt-4 md:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>

      {/* Navegação inferior (celular) */}
      <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden">
        <ul className="grid grid-cols-5">
          {principais.map((r) => {
            const item = ITENS_MENU[r]
            const Icone = item.icone
            const n = contagens[r]
            return (
              <li key={r}>
                <NavLink
                  to={item.caminho}
                  end={item.caminho === '/'}
                  className={({ isActive }) => cn('relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('grid h-7 w-12 place-items-center rounded-full', isActive && 'bg-secondary')}>
                        <Icone className="size-5" aria-hidden />
                      </span>
                      {item.curto}
                      {!!n && (
                        <span className="absolute right-3 top-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {n}
                          <span className="sr-only"> pendentes</span>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              className={cn('flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', extraAtivo ? 'text-primary' : 'text-muted-foreground')}
            >
              <span className={cn('grid h-7 w-12 place-items-center rounded-full', extraAtivo && 'bg-secondary')}>
                <MoreHorizontal className="size-5" aria-hidden />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Dialog aberto={maisAberto} aoFechar={() => setMaisAberto(false)} titulo="Mais opções" tamanho="sm">
        <ul className="space-y-1">
          {extras.map((r) => {
            const item = ITENS_MENU[r]
            const Icone = item.icone
            return (
              <li key={r}>
                <NavLink to={item.caminho} className={({ isActive }) => cn('flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium', isActive ? 'bg-secondary' : 'hover:bg-muted')}>
                  <Icone className="size-5" aria-hidden />
                  {item.rotulo}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </Dialog>

      <Dialog aberto={perfilAberto} aoFechar={() => setPerfilAberto(false)} titulo="Perfil do protótipo" descricao="Trocar o perfil muda o menu, a tela inicial e as permissões." tamanho="sm">
        <SeletorPerfil id="perfil-mobile" />
      </Dialog>

      {lancaHoras && <CronometroFlutuante />}
      <BuscaGlobal />
      <LancarHorasDialog />
    </div>
  )
}
