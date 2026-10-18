import type { DataISO } from '@/lib/datas'
import type { Contagem, Feriado } from '@/lib/prazo'

export type Perfil = 'advogado' | 'estagiario' | 'controladoria' | 'socio' | 'financeiro'

export const NOMES_PERFIL: Record<Perfil, string> = {
  advogado: 'Advogado(a)',
  estagiario: 'Estagiário(a)/paralegal',
  controladoria: 'Controladoria',
  socio: 'Sócio(a)',
  financeiro: 'Financeiro',
}

export interface Usuario {
  id: string
  nome: string
  perfil: Perfil
  cargo: string
  equipe: string
  email: string
}

export type ModalidadeContrato = 'mensal' | 'hora' | 'exito'

export const NOMES_MODALIDADE: Record<ModalidadeContrato, string> = {
  mensal: 'Mensal fixo',
  hora: 'Por hora',
  exito: 'Êxito',
}

export interface ContratoHonorarios {
  modalidade: ModalidadeContrato
  valorMensal?: number
  percentualExito?: number
  /** Desconto sobre a tabela de valores por hora por perfil (0 a 1). */
  descontoHora?: number
  observacao: string
}

export interface Cliente {
  id: string
  nome: string
  tipo: 'PF' | 'PJ'
  documento: string
  contato: { nome: string; email: string; telefone: string }
  contrato: ContratoHonorarios
}

export interface Andamento {
  id: string
  data: DataISO
  descricao: string
  origem: string
}

export type StatusProcesso = 'Ativo' | 'Suspenso' | 'Em recurso' | 'Arquivado'

export interface Processo {
  id: string
  numero: string
  tribunal: string
  sistema: string
  orgao: string
  area: string
  clienteId: string
  parteContraria: string
  polo: 'ativo' | 'passivo'
  responsavelId: string
  equipe: string
  status: StatusProcesso
  valorCausa: number
  andamentos: Andamento[]
  documentos: { titulo: string; url: string }[]
}

export type StatusIntimacao = 'Nova' | 'Classificada' | 'Prazo lançado' | 'Conferida'
export const STATUS_INTIMACAO: StatusIntimacao[] = ['Nova', 'Classificada', 'Prazo lançado', 'Conferida']

export interface EventoAuditoria {
  em: string
  usuarioId: string
  acao: string
}

export type FonteIntimacao = 'DJEN' | 'Domicílio Judicial Eletrônico'

export interface Intimacao {
  id: string
  processoId: string
  fonte: FonteIntimacao
  disponibilizacao: DataISO
  publicacao: DataISO
  teor: string
  status: StatusIntimacao
  tipoAto?: string
  /** Responsável pelo cumprimento, definido na classificação. */
  responsavelId?: string
  classificadoPorId?: string
  conferidoPorId?: string
  prazoId?: string
  tarefaId?: string
  historico: EventoAuditoria[]
}

export interface AjusteManual {
  dataCalculada: DataISO
  justificativa: string
  porId: string
  em: string
}

export interface Prazo {
  id: string
  processoId: string
  intimacaoId?: string
  tipo: string
  /** Data de disponibilização (data inicial do cálculo). */
  dataInicial: DataISO
  publicacao: DataISO
  inicio: DataISO
  dias: number
  contagem: Contagem
  dataFatal: DataISO
  dataSeguranca: DataISO
  regra: string
  memoria: string
  ajusteManual?: AjusteManual
  conferencia: 'Pendente' | 'Conferido'
  lancadoPorId: string
  lancadoEm: string
  conferidoPorId?: string
  conferidoEm?: string
  responsavelId: string
  cumprido: boolean
  dataProtocolo?: DataISO
}

export type StatusTarefa = 'A fazer' | 'Em andamento' | 'Em revisão' | 'Concluída'
export const STATUS_TAREFA: StatusTarefa[] = ['A fazer', 'Em andamento', 'Em revisão', 'Concluída']
export type Prioridade = 'Alta' | 'Média' | 'Baixa'

export interface Tarefa {
  id: string
  titulo: string
  processoId: string
  prazoId?: string
  responsavelId: string
  criadoPorId: string
  dataLimite: DataISO
  prioridade: Prioridade
  status: StatusTarefa
  estimativaMin: number
  concluidaEm?: DataISO
}

export type StatusLancamento = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Faturado'

export interface Lancamento {
  id: string
  usuarioId: string
  data: DataISO
  minutos: number
  processoId: string
  tarefaId?: string
  clienteId: string
  descricao: string
  faturavel: boolean
  status: StatusLancamento
  /** Comentário do Financeiro ao devolver. */
  comentario?: string
  criadoEm: string
  aprovadoEm?: DataISO
  preFaturaId?: string
}

export type StatusPreFatura = 'A faturar' | 'Faturada' | 'Recebida'

export interface PreFatura {
  id: string
  numero: string
  clienteId: string
  inicio: DataISO
  fim: DataISO
  lancamentoIds: string[]
  valorHoras: number
  valorFixo: number
  total: number
  status: StatusPreFatura
  criadaEm: DataISO
  faturadaEm?: DataISO
  recebidaEm?: DataISO
}

export interface Configuracoes {
  metaDiariaMin: number
  valoresHora: Record<Perfil, number>
  feriadosTribunal: Record<string, Feriado[]>
}

export interface BancoDados {
  versao: number
  geradoEm: DataISO
  usuarios: Usuario[]
  clientes: Cliente[]
  processos: Processo[]
  intimacoes: Intimacao[]
  prazos: Prazo[]
  tarefas: Tarefa[]
  lancamentos: Lancamento[]
  preFaturas: PreFatura[]
  config: Configuracoes
}

export interface Cronometro {
  iniciadoEm: number | null
  acumuladoMs: number
  processoId?: string
  tarefaId?: string
}
