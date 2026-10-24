// Sistemas externos citados no levantamento de dores do escritório. Nenhum está conectado no protótipo.

export type SituacaoNoEscritorio = 'Em uso' | 'Em migração' | 'Em avaliação' | 'Fonte oficial' | 'Tribunal'

export interface Integracao {
  id: string
  nome: string
  descricao: string
  situacao: SituacaoNoEscritorio
}

export interface GrupoIntegracoes {
  titulo: string
  descricao: string
  itens: Integracao[]
}

export const GRUPOS_INTEGRACOES: GrupoIntegracoes[] = [
  {
    titulo: 'Intimações e comunicações oficiais',
    descricao: 'Captura das publicações e citações que alimentam a caixa de Intimações.',
    itens: [
      { id: 'djen', nome: 'DJEN', descricao: 'Diário de Justiça Eletrônico Nacional, onde saem as intimações dirigidas aos advogados.', situacao: 'Fonte oficial' },
      { id: 'domicilio', nome: 'Domicílio Judicial Eletrônico', descricao: 'Citações e intimações pessoais das partes, obrigatórias desde 16/05/2025.', situacao: 'Fonte oficial' },
    ],
  },
  {
    titulo: 'Tribunais',
    descricao: 'Andamentos dos processos, hoje consultados em cada portal com login próprio.',
    itens: [
      { id: 'pje', nome: 'PJe', descricao: 'Processo Judicial Eletrônico, usado na maior parte dos tribunais.', situacao: 'Tribunal' },
      { id: 'esaj', nome: 'e-SAJ', descricao: 'Sistema de Automação da Justiça, usado em tribunais estaduais.', situacao: 'Tribunal' },
      { id: 'eproc', nome: 'eproc', descricao: 'Processo eletrônico da Justiça Federal e de alguns tribunais estaduais.', situacao: 'Tribunal' },
      { id: 'projudi', nome: 'Projudi', descricao: 'Processo Judicial Digital, usado em tribunais estaduais.', situacao: 'Tribunal' },
    ],
  },
  {
    titulo: 'Sistema de gestão do escritório',
    descricao: 'Processos, prazos, timesheet, financeiro e GED do escritório.',
    itens: [
      { id: 'legal-one', nome: 'Legal One', descricao: 'Sistema atual do escritório, com captura de intimações, workflow, GED e portal do cliente.', situacao: 'Em uso' },
      { id: 'elaw', nome: 'Elaw', descricao: 'Sistema para o qual o escritório está migrando.', situacao: 'Em migração' },
    ],
  },
  {
    titulo: 'Pesquisa e inteligência artificial',
    descricao: 'Jurisprudência, doutrina e redação assistida de peças.',
    itens: [
      { id: 'jusbrasil', nome: 'Jusbrasil', descricao: 'Pesquisa de jurisprudência e redação assistida com o Jus IA.', situacao: 'Em uso' },
      { id: 'turivius', nome: 'Turivius', descricao: 'Pesquisa jurisprudencial com jurimetria e análise preditiva.', situacao: 'Em uso' },
      { id: 'rt', nome: 'Revista dos Tribunais', descricao: 'Doutrina pela RT Online e ProView.', situacao: 'Em uso' },
      { id: 'saga', nome: 'SAGA', descricao: 'IA jurídica para peças, pareceres e contratos, com licença em expansão desde dez/2025.', situacao: 'Em uso' },
      { id: 'copilot', nome: 'Copilot', descricao: 'Assistente de IA da Microsoft para redação e revisão.', situacao: 'Em uso' },
    ],
  },
  {
    titulo: 'Horas',
    descricao: 'Captura automática de horas para o Timesheet.',
    itens: [
      { id: 'timeshifter', nome: 'TimeShifter', descricao: 'Monta o timesheet com IA a partir do que o advogado navega. Aplicativo e extensão de navegador.', situacao: 'Em avaliação' },
    ],
  },
  {
    titulo: 'Documentos e assinatura',
    descricao: 'Arquivos dos processos e assinatura de procurações, contratos e acordos.',
    itens: [
      { id: 'imanage', nome: 'iManage', descricao: 'Gestão eletrônica de documentos com versionamento.', situacao: 'Em uso' },
      { id: 'sharepoint', nome: 'SharePoint', descricao: 'Pastas compartilhadas da equipe.', situacao: 'Em uso' },
      { id: 'docusign', nome: 'DocuSign', descricao: 'Assinatura eletrônica de documentos.', situacao: 'Em uso' },
      { id: 'govbr', nome: 'Assinatura gov.br', descricao: 'Assinatura eletrônica gratuita do governo federal.', situacao: 'Fonte oficial' },
    ],
  },
  {
    titulo: 'Cálculos, correspondentes e certidões',
    descricao: 'Ferramentas de apoio usadas ao longo do processo.',
    itens: [
      { id: 'drcalc', nome: 'Dr. Calc', descricao: 'Cálculos judiciais de correção monetária e juros.', situacao: 'Em uso' },
      { id: 'juridico-certo', nome: 'Jurídico Certo', descricao: 'Contratação de correspondentes para audiências e diligências.', situacao: 'Em uso' },
      { id: 'portdata', nome: 'PortData', descricao: 'Emissão de certidões em lote e auditoria jurídica com classificação por IA.', situacao: 'Em uso' },
      { id: 'onr', nome: 'ONR / SAEC', descricao: 'Certidões e pesquisas no registro de imóveis.', situacao: 'Fonte oficial' },
      { id: 'enotariado', nome: 'e-Notariado', descricao: 'Atos notariais eletrônicos.', situacao: 'Fonte oficial' },
    ],
  },
  {
    titulo: 'Clientes e acessos',
    descricao: 'Relacionamento comercial e certificados digitais para protocolar.',
    itens: [
      { id: 'rdstation', nome: 'RD Station', descricao: 'CRM e marketing, observando o Provimento CFOAB nº 205/2021.', situacao: 'Em uso' },
      { id: 'whom', nome: 'Whom (Doc9)', descricao: 'Centraliza certificados digitais, permissões e registro de cada protocolo.', situacao: 'Em uso' },
      { id: 'expedit', nome: 'Expedit', descricao: 'Alternativa de Pernambuco para gestão de certificados digitais.', situacao: 'Em avaliação' },
    ],
  },
]
