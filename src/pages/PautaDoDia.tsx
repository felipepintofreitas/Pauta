import { Link } from 'react-router-dom'
import { useApp } from '@/store/store'
import { menuDoPerfil, pode, type Rota } from '@/lib/permissoes'
import { CronometroBarra } from '@/components/Cronometro'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { ITENS_MENU, useContagens } from '@/components/layout/Shell'

const DESCRICOES: Record<Rota, string> = {
  'meu-dia': 'Alertas, prazos da semana, tarefas e horas de hoje.',
  intimacoes: 'Caixa de entrada do DJEN e do Domicílio Eletrônico, com classificação e conferência.',
  prazos: 'Lista e calendário de prazos com urgência e status de conferência.',
  tarefas: 'Quadro de tarefas ligadas aos prazos e carga da equipe.',
  timesheet: 'Lançamento rápido, semana em grade e aprovação de horas.',
  processos: 'Busca por número CNJ, cliente ou parte, e ficha completa.',
  honorarios: 'Valor a faturar, pré-faturas e recebimentos.',
  relatorio: 'Resumo em linguagem simples para enviar ao cliente.',
  configuracoes: '',
}

export function PautaDoDia() {
  const { usuario } = useApp()
  const contagens = useContagens()
  const opcoes = menuDoPerfil(usuario.perfil).filter((r) => r !== 'configuracoes')
  return (
    <div>
      <CabecalhoPagina titulo="Pauta do Dia" descricao="Tudo o que você precisa fazer hoje, sem perder prazo nem hora faturável." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {opcoes.map((r) => {
          const item = ITENS_MENU[r]
          const Icone = item.icone
          const n = contagens[r]
          return (
            <li key={r} className="relative flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary hover:bg-muted/40">
              <Link to={item.caminho} className="flex items-start gap-3 after:absolute after:inset-0 after:rounded-lg focus:outline-none">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <Icone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {item.rotulo}
                    {!!n && (
                      <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {n}
                        <span className="sr-only"> pendentes</span>
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{DESCRICOES[r]}</span>
                </span>
              </Link>
              {r === 'timesheet' && pode(usuario.perfil, 'lancarHoras') && (
                <div className="relative z-10 mt-auto self-start">
                  <CronometroBarra />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
