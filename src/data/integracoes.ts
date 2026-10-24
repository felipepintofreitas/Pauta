import { BookOpen, Briefcase, Calculator, FileSignature, Gavel, Newspaper, Timer, Users, type LucideIcon } from 'lucide-react'
import type { Rota } from '@/lib/permissoes'

// Sistemas externos citados no levantamento de dores do escritório. Nenhum está conectado no protótipo.

export type SituacaoNoEscritorio = 'Em uso' | 'Em migração' | 'Em avaliação' | 'Fonte oficial' | 'Tribunal'

export interface Integracao {
  id: string
  nome: string
  descricao: string
  situacao: SituacaoNoEscritorio
  /** Valor de Intimacao.fonte que este sistema alimentaria. */
  fonte?: string
  /** Valor de Processo.sistema atendido por este sistema. */
  sistema?: string
}

export type IdGrupo = 'intimacoes-oficiais' | 'tribunais' | 'gestao' | 'pesquisa-ia' | 'horas' | 'documentos' | 'apoio' | 'clientes'

/** Ligação de um grupo com um módulo da Pauta (rota) ou com outro grupo de integrações. */
export interface Conexao {
  rotulo: string
  descricao: string
  modulo?: Rota
  grupo?: IdGrupo
}

export interface GrupoIntegracoes {
  id: IdGrupo
  titulo: string
  descricao: string
  icone: LucideIcon
  /** Posição do card na página inicial; sem valor, o grupo só aparece em Integrações. */
  ordemInicio?: number
  itens: Integracao[]
  conexoes: Conexao[]
}

export const GRUPOS_INTEGRACOES: GrupoIntegracoes[] = [
  {
    id: 'intimacoes-oficiais',
    titulo: 'Intimações e comunicações oficiais',
    descricao: 'Captura das publicações e citações que alimentam a caixa de Intimações.',
    icone: Newspaper,
    ordemInicio: 2,
    itens: [
      { id: 'djen', nome: 'DJEN', descricao: 'Diário de Justiça Eletrônico Nacional, onde saem as intimações dirigidas aos advogados.', situacao: 'Fonte oficial', fonte: 'DJEN' },
      { id: 'domicilio', nome: 'Domicílio Judicial Eletrônico', descricao: 'Citações e intimações pessoais das partes, obrigatórias desde 16/05/2025.', situacao: 'Fonte oficial', fonte: 'Domicílio Judicial Eletrônico' },
    ],
    conexoes: [
      { rotulo: 'Intimações', descricao: 'Cada publicação capturada entra na caixa de Intimações para ser classificada.', modulo: 'intimacoes' },
      { rotulo: 'Prazos', descricao: 'A data de disponibilização é o ponto de partida do cálculo do prazo.', modulo: 'prazos' },
      { rotulo: 'Tribunais', descricao: 'Da intimação se abre o processo no sistema do tribunal.', grupo: 'tribunais' },
      { rotulo: 'Sistema de gestão', descricao: 'Intimação e prazo ficam registrados também no Legal One ou no Elaw.', grupo: 'gestao' },
    ],
  },
  {
    id: 'tribunais',
    titulo: 'Tribunais',
    descricao: 'Andamentos dos processos, hoje consultados em cada portal com login próprio.',
    icone: Gavel,
    ordemInicio: 6,
    itens: [
      { id: 'pje', nome: 'PJe', descricao: 'Processo Judicial Eletrônico, usado na maior parte dos tribunais.', situacao: 'Tribunal', sistema: 'PJe' },
      { id: 'esaj', nome: 'e-SAJ', descricao: 'Sistema de Automação da Justiça, usado em tribunais estaduais.', situacao: 'Tribunal', sistema: 'e-SAJ' },
      { id: 'eproc', nome: 'eproc', descricao: 'Processo eletrônico da Justiça Federal e de alguns tribunais estaduais.', situacao: 'Tribunal', sistema: 'eproc' },
      { id: 'projudi', nome: 'Projudi', descricao: 'Processo Judicial Digital, usado em tribunais estaduais.', situacao: 'Tribunal', sistema: 'Projudi' },
      { id: 'estj', nome: 'e-STJ', descricao: 'Peticionamento e consulta de processos no Superior Tribunal de Justiça.', situacao: 'Tribunal', sistema: 'e-STJ' },
    ],
    conexoes: [
      { rotulo: 'Processos', descricao: 'Os andamentos de cada tribunal aparecem na ficha do processo.', modulo: 'processos' },
      { rotulo: 'Intimações oficiais', descricao: 'As intimações do DJEN apontam para o processo no tribunal.', grupo: 'intimacoes-oficiais' },
      { rotulo: 'Clientes e acessos', descricao: 'Protocolar exige o certificado digital guardado no Whom.', grupo: 'clientes' },
      { rotulo: 'Documentos e assinatura', descricao: 'As peças protocoladas saem da pasta do processo.', grupo: 'documentos' },
    ],
  },
  {
    id: 'gestao',
    titulo: 'Sistema de gestão do escritório',
    descricao: 'Processos, prazos, timesheet, financeiro e GED do escritório.',
    icone: Briefcase,
    ordemInicio: 1,
    itens: [
      { id: 'legal-one', nome: 'Legal One', descricao: 'Sistema atual do escritório, com captura de intimações, workflow, GED e portal do cliente.', situacao: 'Em uso' },
      { id: 'elaw', nome: 'Elaw', descricao: 'Sistema para o qual o escritório está migrando.', situacao: 'Em migração' },
    ],
    conexoes: [
      { rotulo: 'Processos', descricao: 'A carteira de processos viria do sistema de gestão.', modulo: 'processos' },
      { rotulo: 'Prazos', descricao: 'Prazos lançados aqui seriam espelhados lá.', modulo: 'prazos' },
      { rotulo: 'Timesheet', descricao: 'Horas aprovadas seguiriam para o faturamento do sistema.', modulo: 'timesheet' },
      { rotulo: 'Honorários', descricao: 'Pré-faturas e recebimentos sincronizados com o financeiro.', modulo: 'honorarios' },
      { rotulo: 'Documentos e assinatura', descricao: 'O GED do Legal One guarda parte dos documentos.', grupo: 'documentos' },
    ],
  },
  {
    id: 'pesquisa-ia',
    titulo: 'Pesquisa e inteligência artificial',
    descricao: 'Jurisprudência, doutrina e redação assistida de peças.',
    icone: BookOpen,
    ordemInicio: 5,
    itens: [
      { id: 'jusbrasil', nome: 'Jusbrasil', descricao: 'Pesquisa de jurisprudência e redação assistida com o Jus IA.', situacao: 'Em uso' },
      { id: 'turivius', nome: 'Turivius', descricao: 'Pesquisa jurisprudencial com jurimetria e análise preditiva.', situacao: 'Em uso' },
      { id: 'rt', nome: 'Revista dos Tribunais', descricao: 'Doutrina pela RT Online e ProView.', situacao: 'Em uso' },
      { id: 'saga', nome: 'SAGA', descricao: 'IA jurídica para peças, pareceres e contratos, com licença em expansão desde dez/2025.', situacao: 'Em uso' },
      { id: 'copilot', nome: 'Copilot', descricao: 'Assistente de IA da Microsoft para redação e revisão.', situacao: 'Em uso' },
    ],
    conexoes: [
      { rotulo: 'Intimações', descricao: 'Da intimação classificada se pesquisa e se minuta a resposta.', modulo: 'intimacoes' },
      { rotulo: 'Tarefas', descricao: 'Tarefas de peça abririam a pesquisa e a minuta.', modulo: 'tarefas' },
      { rotulo: 'Documentos e assinatura', descricao: 'A minuta revisada é salva na pasta do processo.', grupo: 'documentos' },
      { rotulo: 'Tribunais', descricao: 'A jurimetria mostra como decide a turma ou a vara do processo.', grupo: 'tribunais' },
    ],
  },
  {
    id: 'horas',
    titulo: 'Horas',
    descricao: 'Captura automática de horas para o Timesheet.',
    icone: Timer,
    itens: [
      { id: 'timeshifter', nome: 'TimeShifter', descricao: 'Monta o timesheet com IA a partir do que o advogado navega. Aplicativo e extensão de navegador.', situacao: 'Em avaliação' },
    ],
    conexoes: [
      { rotulo: 'Timesheet', descricao: 'As sugestões de lançamento entrariam para revisão antes de enviar.', modulo: 'timesheet' },
      { rotulo: 'Honorários', descricao: 'Menos horas perdidas, mais valor a faturar.', modulo: 'honorarios' },
    ],
  },
  {
    id: 'documentos',
    titulo: 'Documentos e assinatura',
    descricao: 'Arquivos dos processos e assinatura de procurações, contratos e acordos.',
    icone: FileSignature,
    ordemInicio: 3,
    itens: [
      { id: 'imanage', nome: 'iManage', descricao: 'Gestão eletrônica de documentos com versionamento.', situacao: 'Em uso' },
      { id: 'sharepoint', nome: 'SharePoint', descricao: 'Pastas compartilhadas da equipe.', situacao: 'Em uso' },
      { id: 'docusign', nome: 'DocuSign', descricao: 'Assinatura eletrônica de documentos.', situacao: 'Em uso' },
      { id: 'govbr', nome: 'Assinatura gov.br', descricao: 'Assinatura eletrônica gratuita do governo federal.', situacao: 'Fonte oficial' },
    ],
    conexoes: [
      { rotulo: 'Processos', descricao: 'Cada processo teria a sua pasta, aberta pela aba Documentos.', modulo: 'processos' },
      { rotulo: 'Pesquisa e IA', descricao: 'Minutas geradas com IA são salvas aqui para revisão.', grupo: 'pesquisa-ia' },
      { rotulo: 'Tribunais', descricao: 'A versão final segue para protocolo no sistema do tribunal.', grupo: 'tribunais' },
      { rotulo: 'Clientes e acessos', descricao: 'Procurações e contratos assinados pelo cliente.', grupo: 'clientes' },
    ],
  },
  {
    id: 'apoio',
    titulo: 'Cálculos, correspondentes e certidões',
    descricao: 'Ferramentas de apoio usadas ao longo do processo.',
    icone: Calculator,
    ordemInicio: 7,
    itens: [
      { id: 'drcalc', nome: 'Dr. Calc', descricao: 'Cálculos judiciais de correção monetária e juros.', situacao: 'Em uso' },
      { id: 'juridico-certo', nome: 'Jurídico Certo', descricao: 'Contratação de correspondentes para audiências e diligências.', situacao: 'Em uso' },
      { id: 'portdata', nome: 'PortData', descricao: 'Emissão de certidões em lote e auditoria jurídica com classificação por IA.', situacao: 'Em uso' },
      { id: 'onr', nome: 'ONR / SAEC', descricao: 'Certidões e pesquisas no registro de imóveis.', situacao: 'Fonte oficial' },
      { id: 'enotariado', nome: 'e-Notariado', descricao: 'Atos notariais eletrônicos.', situacao: 'Fonte oficial' },
    ],
    conexoes: [
      { rotulo: 'Processos', descricao: 'Cálculos e certidões ficam ligados ao processo.', modulo: 'processos' },
      { rotulo: 'Tarefas', descricao: 'Audiências e diligências fora da sede viram tarefas com correspondente.', modulo: 'tarefas' },
      { rotulo: 'Honorários', descricao: 'O custo do correspondente entra como despesa reembolsável.', modulo: 'honorarios' },
      { rotulo: 'Documentos e assinatura', descricao: 'Certidões e laudos são arquivados na pasta do processo.', grupo: 'documentos' },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes e acessos',
    descricao: 'Relacionamento comercial e certificados digitais para protocolar.',
    icone: Users,
    ordemInicio: 4,
    itens: [
      { id: 'rdstation', nome: 'RD Station', descricao: 'CRM e marketing, observando o Provimento CFOAB nº 205/2021.', situacao: 'Em uso' },
      { id: 'whom', nome: 'Whom (Doc9)', descricao: 'Centraliza certificados digitais, permissões e registro de cada protocolo.', situacao: 'Em uso' },
      { id: 'expedit', nome: 'Expedit', descricao: 'Alternativa de Pernambuco para gestão de certificados digitais.', situacao: 'Em avaliação' },
    ],
    conexoes: [
      { rotulo: 'Relatório para o cliente', descricao: 'O relatório enviado fica registrado no histórico do cliente no CRM.', modulo: 'relatorio' },
      { rotulo: 'Tribunais', descricao: 'O certificado digital libera o protocolo em cada sistema.', grupo: 'tribunais' },
      { rotulo: 'Documentos e assinatura', descricao: 'Contratos de honorários assinados pelo cliente.', grupo: 'documentos' },
    ],
  },
]

export const grupoPorId = (id: string) => GRUPOS_INTEGRACOES.find((g) => g.id === id)

export const GRUPOS_INICIO = GRUPOS_INTEGRACOES.filter((g) => g.ordemInicio).sort((a, b) => a.ordemInicio! - b.ordemInicio!)

/** Do DJEN ao protocolo: a ordem em que as integrações se encadeiam no dia a dia. */
export const FLUXO_INTEGRACOES: { grupo: IdGrupo; passo: string }[] = [
  { grupo: 'intimacoes-oficiais', passo: 'A intimação chega pelo DJEN ou pelo Domicílio Eletrônico.' },
  { grupo: 'gestao', passo: 'Prazo e tarefa ficam registrados no sistema de gestão.' },
  { grupo: 'tribunais', passo: 'O advogado abre os autos no sistema do tribunal.' },
  { grupo: 'pesquisa-ia', passo: 'Pesquisa jurisprudência e minuta a peça com IA.' },
  { grupo: 'apoio', passo: 'Faz cálculos, pede certidões ou contrata correspondente, se precisar.' },
  { grupo: 'documentos', passo: 'Salva a versão final e colhe assinaturas.' },
  { grupo: 'clientes', passo: 'Protocola com o certificado digital e informa o cliente.' },
]
