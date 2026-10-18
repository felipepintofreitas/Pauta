import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { AppProvider, useApp } from '@/store/store'
import { UiProvider } from '@/store/ui'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Shell } from '@/components/layout/Shell'
import { EstadoVazio } from '@/components/ui/empty-state'
import { LinkBotao } from '@/components/ui/button'
import { NOMES_PERFIL } from '@/data/tipos'
import { podeAcessar, type Rota } from '@/lib/permissoes'
import { useEffect, type ReactNode } from 'react'
import { MeuDia } from '@/pages/MeuDia'
import { Intimacoes } from '@/pages/Intimacoes'
import { IntimacaoDetalhe } from '@/pages/IntimacaoDetalhe'
import { Prazos } from '@/pages/Prazos'
import { Tarefas } from '@/pages/Tarefas'
import { Timesheet } from '@/pages/Timesheet'
import { Processos, ProcessoDetalhe } from '@/pages/Processos'
import { Honorarios } from '@/pages/Honorarios'
import { Relatorio } from '@/pages/Relatorio'
import { Configuracoes } from '@/pages/Configuracoes'

function Protegida({ rota, children }: { rota: Rota; children: ReactNode }) {
  const { usuario } = useApp()
  if (podeAcessar(usuario.perfil, rota)) return <>{children}</>
  return (
    <EstadoVazio
      icone={ShieldOff}
      titulo="Esta tela não faz parte do seu perfil"
      descricao={`O perfil ${NOMES_PERFIL[usuario.perfil]} não tem acesso a esta área. Troque o perfil no topo da tela ou volte ao seu dia.`}
      acao={<LinkBotao to="/">Ir para Meu dia</LinkBotao>}
    />
  )
}

function AvisoDadosRenovados() {
  const { dadosRenovados } = useApp()
  const { toast } = useToast()
  useEffect(() => {
    if (dadosRenovados) toast('Dados de demonstração atualizados para hoje.', { tipo: 'info' })
  }, [dadosRenovados, toast])
  return null
}

function TituloDaPagina() {
  const { pathname } = useLocation()
  useEffect(() => {
    const nomes: Record<string, string> = { intimacoes: 'Intimações', prazos: 'Prazos', tarefas: 'Tarefas', timesheet: 'Timesheet', processos: 'Processos', honorarios: 'Honorários', relatorio: 'Relatório', configuracoes: 'Configurações' }
    const secao = nomes[pathname.split('/')[1]] ?? 'Meu dia'
    document.title = `${secao} · Pauta`
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <UiProvider>
          <HashRouter>
            <AvisoDadosRenovados />
            <TituloDaPagina />
            <Shell>
              <Routes>
                <Route path="/" element={<MeuDia />} />
                <Route path="/intimacoes" element={<Protegida rota="intimacoes"><Intimacoes /></Protegida>} />
                <Route path="/intimacoes/:id" element={<Protegida rota="intimacoes"><IntimacaoDetalhe /></Protegida>} />
                <Route path="/prazos" element={<Protegida rota="prazos"><Prazos /></Protegida>} />
                <Route path="/tarefas" element={<Protegida rota="tarefas"><Tarefas /></Protegida>} />
                <Route path="/timesheet" element={<Protegida rota="timesheet"><Timesheet /></Protegida>} />
                <Route path="/processos" element={<Protegida rota="processos"><Processos /></Protegida>} />
                <Route path="/processos/:id" element={<Protegida rota="processos"><ProcessoDetalhe /></Protegida>} />
                <Route path="/honorarios" element={<Protegida rota="honorarios"><Honorarios /></Protegida>} />
                <Route path="/relatorio" element={<Protegida rota="relatorio"><Relatorio /></Protegida>} />
                <Route path="/configuracoes" element={<Protegida rota="configuracoes"><Configuracoes /></Protegida>} />
                <Route path="*" element={<EstadoVazio icone={ShieldOff} titulo="Página não encontrada" descricao="O endereço não existe no protótipo." acao={<LinkBotao to="/">Ir para Meu dia</LinkBotao>} />} />
              </Routes>
            </Shell>
          </HashRouter>
        </UiProvider>
      </AppProvider>
    </ToastProvider>
  )
}
