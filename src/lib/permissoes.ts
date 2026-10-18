import type { Perfil } from '@/data/tipos'

export type Rota = 'meu-dia' | 'intimacoes' | 'prazos' | 'tarefas' | 'timesheet' | 'processos' | 'honorarios' | 'relatorio' | 'configuracoes'

export type Acao =
  | 'classificarIntimacao'
  | 'lancarPrazo'
  | 'conferirPrazo'
  | 'distribuirTarefas'
  | 'cumprirPrazo'
  | 'aprovarHoras'
  | 'gerarPreFatura'
  | 'configurar'
  | 'verEquipe'
  | 'lancarHoras'

const MENU: Record<Perfil, Rota[]> = {
  advogado: ['meu-dia', 'prazos', 'tarefas', 'timesheet', 'processos', 'relatorio'],
  estagiario: ['meu-dia', 'tarefas', 'timesheet', 'processos'],
  controladoria: ['meu-dia', 'intimacoes', 'prazos', 'tarefas', 'processos', 'timesheet', 'configuracoes'],
  socio: ['meu-dia', 'prazos', 'tarefas', 'honorarios', 'processos', 'relatorio', 'timesheet', 'intimacoes', 'configuracoes'],
  financeiro: ['meu-dia', 'timesheet', 'honorarios', 'relatorio', 'processos', 'configuracoes'],
}

const ACOES: Record<Perfil, Acao[]> = {
  advogado: ['cumprirPrazo', 'lancarHoras'],
  estagiario: ['lancarHoras'],
  controladoria: ['classificarIntimacao', 'lancarPrazo', 'conferirPrazo', 'distribuirTarefas', 'cumprirPrazo', 'verEquipe', 'configurar', 'lancarHoras'],
  socio: ['cumprirPrazo', 'distribuirTarefas', 'verEquipe', 'lancarHoras', 'configurar', 'gerarPreFatura'],
  financeiro: ['aprovarHoras', 'gerarPreFatura', 'verEquipe', 'configurar'],
}

export function menuDoPerfil(perfil: Perfil): Rota[] {
  return MENU[perfil]
}

export function pode(perfil: Perfil, acao: Acao): boolean {
  return ACOES[perfil].includes(acao)
}

export function podeAcessar(perfil: Perfil, rota: Rota): boolean {
  return MENU[perfil].includes(rota)
}

/** Advogados e estagiários veem por padrão apenas os próprios itens. */
export function vePropriosPorPadrao(perfil: Perfil): boolean {
  return perfil === 'advogado' || perfil === 'estagiario'
}
