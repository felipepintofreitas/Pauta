/**
 * Gera os dados simulados do protótipo. As datas são sempre relativas a hoje,
 * para que existam prazos vencidos, vencendo hoje e nos próximos dias.
 */
import { hojeISO, inicioDoMes, somarDias, somarMeses, fimDoMes, type DataISO } from '@/lib/datas'
import {
  calcularPrazo,
  criarCalendario,
  diaUtilAnterior,
  disponibilizacaoParaDataFatal,
  SUGESTOES_POR_ATO,
  somarDiasUteis,
  type Calendario,
} from '@/lib/prazo'
import { calendarioNacional, dataReferencia } from '@/lib/urgencia'
import { FERIADOS_PADRAO } from './feriados'
import type {
  Andamento,
  BancoDados,
  Cliente,
  EventoAuditoria,
  Intimacao,
  Lancamento,
  PreFatura,
  Prazo,
  Processo,
  Tarefa,
  Usuario,
  StatusTarefa,
} from './tipos'

export const VERSAO_DADOS = 4

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const USUARIOS: Usuario[] = [
  { id: 'u1', nome: 'Ana Ribeiro', perfil: 'advogado', cargo: 'Advogada sênior', equipe: 'Cível', email: 'ana.ribeiro@escritorio.adv.br' },
  { id: 'u2', nome: 'Bruno Cavalcanti', perfil: 'advogado', cargo: 'Advogado pleno', equipe: 'Trabalhista', email: 'bruno.cavalcanti@escritorio.adv.br' },
  { id: 'u3', nome: 'Carla Menezes', perfil: 'advogado', cargo: 'Advogada pleno', equipe: 'Tributário', email: 'carla.menezes@escritorio.adv.br' },
  { id: 'u4', nome: 'Diego Albuquerque', perfil: 'estagiario', cargo: 'Estagiário', equipe: 'Cível', email: 'diego.albuquerque@escritorio.adv.br' },
  { id: 'u5', nome: 'Elisa Pontes', perfil: 'controladoria', cargo: 'Coordenadora de controladoria', equipe: 'Controladoria', email: 'elisa.pontes@escritorio.adv.br' },
  { id: 'u6', nome: 'Fábio Lins', perfil: 'controladoria', cargo: 'Analista de controladoria', equipe: 'Controladoria', email: 'fabio.lins@escritorio.adv.br' },
  { id: 'u7', nome: 'Helena Barros', perfil: 'socio', cargo: 'Sócia', equipe: 'Cível', email: 'helena.barros@escritorio.adv.br' },
  { id: 'u8', nome: 'Igor Tavares', perfil: 'financeiro', cargo: 'Analista financeiro', equipe: 'Financeiro', email: 'igor.tavares@escritorio.adv.br' },
]

const TRIBUNAIS: Record<string, { j: string; tr: string; sistema: string; areas: string[]; orgaos: string[]; origem: string }> = {
  TJPE: { j: '8', tr: '17', sistema: 'PJe', areas: ['Cível', 'Consumidor', 'Empresarial'], orgaos: ['1ª Vara Cível da Capital', '12ª Vara Cível da Capital', '3ª Vara Cível de Jaboatão dos Guararapes', '2ª Vara Empresarial da Capital'], origem: '0001' },
  TRT6: { j: '5', tr: '06', sistema: 'PJe', areas: ['Trabalhista'], orgaos: ['3ª Vara do Trabalho do Recife', '10ª Vara do Trabalho do Recife', '1ª Vara do Trabalho de Olinda'], origem: '0003' },
  TRF5: { j: '4', tr: '05', sistema: 'PJe', areas: ['Tributário', 'Previdenciário'], orgaos: ['5ª Vara Federal de Pernambuco', '10ª Vara Federal de Pernambuco'], origem: '8300' },
  STJ: { j: '3', tr: '00', sistema: 'e-STJ', areas: ['Cível', 'Tributário'], orgaos: ['Terceira Turma', 'Primeira Turma', 'Segunda Seção'], origem: '0000' },
  TJSP: { j: '8', tr: '26', sistema: 'e-SAJ', areas: ['Cível', 'Empresarial'], orgaos: ['5ª Vara Cível do Foro Central', '2ª Vara Empresarial e de Conflitos de Arbitragem'], origem: '0100' },
  TRF4: { j: '4', tr: '04', sistema: 'eproc', areas: ['Tributário'], orgaos: ['2ª Vara Federal de Porto Alegre', '1ª Vara Federal de Curitiba'], origem: '7100' },
  TJPR: { j: '8', tr: '16', sistema: 'Projudi', areas: ['Consumidor', 'Cível'], orgaos: ['1º Juizado Especial Cível de Curitiba', '4ª Vara Cível de Curitiba'], origem: '0001' },
  TRT2: { j: '5', tr: '02', sistema: 'PJe', areas: ['Trabalhista'], orgaos: ['45ª Vara do Trabalho de São Paulo', '12ª Vara do Trabalho de São Paulo'], origem: '0045' },
}

const DISTRIBUICAO_TRIBUNAIS = ['TJPE', 'TJPE', 'TJPE', 'TJPE', 'TJPE', 'TRT6', 'TRT6', 'TRT6', 'TRT6', 'TRF5', 'TRF5', 'TRF5', 'STJ', 'TJSP', 'TJSP', 'TRF4', 'TJPR', 'TRT2']

function digitoCNJ(base: string): string {
  const resto = BigInt(base + '00') % 97n
  return String(98n - resto).padStart(2, '0')
}

export function numeroCNJ(sequencial: number, ano: number, tribunal: string): string {
  const t = TRIBUNAIS[tribunal]
  const n = String(sequencial).padStart(7, '0')
  const dd = digitoCNJ(`${n}${ano}${t.j}${t.tr}${t.origem}`)
  return `${n}-${dd}.${ano}.${t.j}.${t.tr}.${t.origem}`
}

function digitosVerificadores(base: number[], pesos: number[][]): number[] {
  const nums = [...base]
  for (const p of pesos) {
    const soma = nums.reduce((s, n, i) => s + n * p[i], 0)
    const r = soma % 11
    nums.push(r < 2 ? 0 : 11 - r)
  }
  return nums.slice(base.length)
}

function cnpj(rng: () => number): string {
  const base = Array.from({ length: 8 }, () => Math.floor(rng() * 10)).concat([0, 0, 0, 1])
  const dv = digitosVerificadores(base, [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ])
  const d = base.concat(dv).join('')
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function cpf(rng: () => number): string {
  const base = Array.from({ length: 9 }, () => Math.floor(rng() * 10))
  const dv = digitosVerificadores(base, [
    [10, 9, 8, 7, 6, 5, 4, 3, 2],
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  ])
  const d = base.concat(dv).join('')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const CLIENTES_BASE: Omit<Cliente, 'id' | 'documento'>[] = [
  { nome: 'Construtora Recife Norte S.A.', tipo: 'PJ', contato: { nome: 'Rodrigo Maranhão', email: 'juridico@recifenorte.com.br', telefone: '(81) 3456-7810' }, contrato: { modalidade: 'hora', descontoHora: 0.1, observacao: 'Tabela do escritório com 10% de desconto.' } },
  { nome: 'Rede Mais Saúde Hospitais Ltda.', tipo: 'PJ', contato: { nome: 'Patrícia Lacerda', email: 'patricia.lacerda@maissaude.com.br', telefone: '(81) 3301-2200' }, contrato: { modalidade: 'mensal', valorMensal: 28000, observacao: 'Partido mensal para contencioso cível e consumidor.' } },
  { nome: 'Agro Vale do São Francisco Ltda.', tipo: 'PJ', contato: { nome: 'Henrique Brandão', email: 'henrique@agrovale.com.br', telefone: '(87) 3861-4400' }, contrato: { modalidade: 'hora', observacao: 'Tabela cheia do escritório.' } },
  { nome: 'Transportes Capibaribe Ltda.', tipo: 'PJ', contato: { nome: 'Luciana Moura', email: 'luciana.moura@tcapibaribe.com.br', telefone: '(81) 3221-9087' }, contrato: { modalidade: 'hora', descontoHora: 0.05, observacao: 'Desconto de 5% sobre a tabela.' } },
  { nome: 'Capital Sertão Financeira S.A.', tipo: 'PJ', contato: { nome: 'Marcelo Freire', email: 'contencioso@capitalsertao.com.br', telefone: '(81) 3033-1500' }, contrato: { modalidade: 'mensal', valorMensal: 45000, observacao: 'Partido mensal, contencioso de massa.' } },
  { nome: 'Supermercados Boa Praça Ltda.', tipo: 'PJ', contato: { nome: 'Sandra Vilela', email: 'sandra@boapraca.com.br', telefone: '(81) 3128-6600' }, contrato: { modalidade: 'hora', observacao: 'Tabela cheia do escritório.' } },
  { nome: 'Têxtil Paulista Indústria S.A.', tipo: 'PJ', contato: { nome: 'Fernando Arruda', email: 'fernando.arruda@textilpaulista.com.br', telefone: '(11) 3876-1020' }, contrato: { modalidade: 'hora', descontoHora: 0.15, observacao: 'Desconto de 15% por volume.' } },
  { nome: 'TecSul Software Ltda.', tipo: 'PJ', contato: { nome: 'Gabriela Nunes', email: 'gabriela@tecsul.com.br', telefone: '(41) 3029-7744' }, contrato: { modalidade: 'mensal', valorMensal: 12000, observacao: 'Consultivo e contencioso tributário.' } },
  { nome: 'Energia Litoral S.A.', tipo: 'PJ', contato: { nome: 'Otávio Rezende', email: 'otavio.rezende@energialitoral.com.br', telefone: '(81) 3412-5050' }, contrato: { modalidade: 'hora', observacao: 'Tabela cheia do escritório.' } },
  { nome: 'Mariana Costa Albuquerque', tipo: 'PF', contato: { nome: 'Mariana Costa Albuquerque', email: 'mariana.albuquerque@email.com', telefone: '(81) 99812-3344' }, contrato: { modalidade: 'exito', percentualExito: 0.2, observacao: '20% sobre o proveito econômico.' } },
  { nome: 'Roberto Siqueira Lima', tipo: 'PF', contato: { nome: 'Roberto Siqueira Lima', email: 'roberto.slima@email.com', telefone: '(81) 98877-1020' }, contrato: { modalidade: 'exito', percentualExito: 0.25, observacao: '25% sobre o valor recebido.' } },
  { nome: 'Joana Ferreira Campos', tipo: 'PF', contato: { nome: 'Joana Ferreira Campos', email: 'joana.campos@email.com', telefone: '(11) 99654-2211' }, contrato: { modalidade: 'hora', observacao: 'Tabela cheia do escritório.' } },
]

const PARTES_PJ = ['Ferreira & Lima Comércio Ltda.', 'Construtora Atlântica Ltda.', 'Banco Meridional S.A.', 'Logística Guararapes Ltda.', 'Seguradora Horizonte S.A.', 'Condomínio Edifício Mirante do Cais', 'Distribuidora Nordeste Alimentos Ltda.']
const PARTES_PF = ['José Carlos da Silva', 'Maria Aparecida Souza', 'Antônio Pereira Neto', 'Francisca Oliveira Santos', 'Paulo Henrique Barbosa', 'Luana Cristina Melo', 'Severino Ramos de Araújo', 'Tatiane Gomes Rocha']
const PARTES_PUBLICAS = ['Fazenda Nacional', 'União Federal', 'Instituto Nacional do Seguro Social (INSS)', 'Estado de Pernambuco', 'Município do Recife']

const ANDAMENTOS_GENERICOS = [
  'Distribuído por sorteio',
  'Juntada de petição de manifestação',
  'Conclusos para despacho',
  'Expedição de mandado de intimação',
  'Juntada de procuração',
  'Audiência de conciliação realizada sem acordo',
  'Conclusos para decisão',
  'Juntada de laudo pericial',
  'Remetidos os autos à contadoria',
  'Recebidos os autos da contadoria',
]

const TAREFAS_AVULSAS = [
  'Reunião de alinhamento com o cliente',
  'Pesquisar jurisprudência sobre o tema',
  'Revisar cálculos de liquidação',
  'Atualizar relatório de contingência',
  'Solicitar documentos ao cliente',
  'Analisar proposta de acordo',
  'Preparar memoriais',
  'Conferir certidão de publicação',
  'Despachar com o(a) magistrado(a)',
  'Organizar provas documentais',
]

const DESCRICOES_HORAS = [
  'Análise dos autos e estratégia processual',
  'Reunião com o cliente',
  'Pesquisa de jurisprudência',
  'Elaboração de minuta',
  'Revisão de peça',
  'Ligação com a parte contrária para tratativas de acordo',
  'Acompanhamento processual',
  'Preparação para audiência',
  'Despacho com o gabinete',
  'Análise de documentos enviados pelo cliente',
]

function teorPorAto(ato: string, p: Processo, cliente: Cliente, dataAudiencia: DataISO): string {
  const autor = p.polo === 'ativo' ? cliente.nome : p.parteContraria
  const reu = p.polo === 'ativo' ? p.parteContraria : cliente.nome
  const cab = `PROCESSO Nº ${p.numero} – ${p.orgao.toUpperCase()}. ${p.area === 'Trabalhista' ? 'RECLAMANTE' : 'AUTOR'}: ${autor.toUpperCase()}. ${p.area === 'Trabalhista' ? 'RECLAMADO' : 'RÉU'}: ${reu.toUpperCase()}. `
  const [a, m, d] = dataAudiencia.split('-')
  const textos: Record<string, string> = {
    'Citação': `Fica a parte ré, por intermédio de seus advogados, INTIMADA de que restou infrutífera a audiência de conciliação, iniciando-se o prazo de 15 (quinze) dias úteis para apresentação de contestação, sob pena de revelia (CPC, arts. 335 e 344).`,
    'Sentença': `SENTENÇA. Ante o exposto, JULGO PARCIALMENTE PROCEDENTES os pedidos formulados na inicial, com resolução do mérito (CPC, art. 487, I), para condenar a parte ré ao pagamento de indenização por danos materiais, a ser apurada em liquidação. Custas e honorários advocatícios de 10% sobre o valor da condenação, em proporção. Publique-se. Registre-se. Intimem-se.`,
    'Sentença trabalhista': `Ficam as partes INTIMADAS da sentença proferida nos autos, que julgou PROCEDENTES EM PARTE os pedidos, condenando a reclamada ao pagamento de horas extras e reflexos. Prazo recursal de 8 (oito) dias.`,
    'Decisão interlocutória': `DECISÃO. Presentes os requisitos do art. 300 do CPC, DEFIRO o pedido de tutela de urgência para determinar a suspensão dos efeitos do protesto até ulterior deliberação. Intimem-se.`,
    'Despacho para manifestação': `DESPACHO. Intime-se a parte ${p.polo === 'ativo' ? 'autora' : 'ré'} para, no prazo de 5 (cinco) dias, manifestar-se sobre o laudo pericial juntado aos autos. Após, conclusos.`,
    'Intimação para réplica': `Intime-se a parte autora para, querendo, apresentar réplica à contestação e documentos, no prazo de 15 (quinze) dias (CPC, arts. 350 e 351).`,
    'Designação de audiência': `DESPACHO. Designo audiência de instrução e julgamento para o dia ${d}/${m}/${a}, às 10h00, a ser realizada de forma telepresencial. As partes deverão apresentar rol de testemunhas no prazo legal. Intimem-se.`,
    'Embargos de declaração': `Intime-se a parte embargada para, querendo, manifestar-se sobre os embargos de declaração opostos, no prazo de 5 (cinco) dias (CPC, art. 1.023, §2º).`,
    'Acórdão': `ACÓRDÃO. Vistos, relatados e discutidos estes autos, acordam os integrantes do órgão julgador, por unanimidade, em NEGAR PROVIMENTO ao recurso, nos termos do voto do(a) Relator(a).`,
    'Cumprimento de sentença': `Intime-se a parte executada para, no prazo de 15 (quinze) dias, efetuar o pagamento voluntário do débito, sob pena de multa de 10% e honorários de 10% (CPC, art. 523, §1º).`,
  }
  return cab + textos[ato]
}

function quando(dataISO: DataISO, hora: number, minuto: number): string {
  const [a, m, d] = dataISO.split('-').map(Number)
  return new Date(a, m - 1, d, hora, minuto).toISOString()
}

export function gerarDados(hoje: DataISO = hojeISO()): BancoDados {
  const rng = mulberry32(20261017)
  const int = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1))
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
  const chance = (p: number) => rng() < p

  const ref = dataReferencia(hoje)
  const ultimoUtil = calendarioNacional.ehDiaUtil(hoje) ? hoje : diaUtilAnterior(hoje, calendarioNacional)
  const calendarios: Record<string, Calendario> = {}
  for (const t of Object.keys(TRIBUNAIS)) calendarios[t] = criarCalendario(FERIADOS_PADRAO[t], t)

  // Clientes
  const clientes: Cliente[] = CLIENTES_BASE.map((c, i) => ({ ...c, id: `c${i + 1}`, documento: c.tipo === 'PJ' ? cnpj(rng) : cpf(rng) }))

  // Processos
  const responsavelPorArea: Record<string, string[]> = {
    Cível: ['u1', 'u1', 'u7'],
    Consumidor: ['u1', 'u7'],
    Empresarial: ['u7', 'u1'],
    Trabalhista: ['u2'],
    Tributário: ['u3'],
    Previdenciário: ['u3'],
  }
  const equipePorArea: Record<string, string> = { Cível: 'Cível', Consumidor: 'Cível', Empresarial: 'Cível', Trabalhista: 'Trabalhista', Tributário: 'Tributário', Previdenciário: 'Tributário' }

  const processos: Processo[] = []
  for (let i = 0; i < 40; i++) {
    const tribunal = DISTRIBUICAO_TRIBUNAIS[i % DISTRIBUICAO_TRIBUNAIS.length]
    const t = TRIBUNAIS[tribunal]
    const area = pick(t.areas)
    const cliente = clientes[(i * 7 + 3) % clientes.length]
    const ano = int(2019, 2026)
    let parteContraria: string
    let polo: 'ativo' | 'passivo'
    if (area === 'Tributário' || area === 'Previdenciário') {
      parteContraria = area === 'Tributário' ? pick(['Fazenda Nacional', 'União Federal']) : 'Instituto Nacional do Seguro Social (INSS)'
      polo = 'ativo'
    } else if (area === 'Trabalhista') {
      parteContraria = cliente.tipo === 'PJ' ? pick(PARTES_PF) : pick(PARTES_PJ)
      polo = cliente.tipo === 'PJ' ? 'passivo' : 'ativo'
    } else {
      parteContraria = chance(0.15) ? pick(PARTES_PUBLICAS.slice(3)) : chance(0.5) ? pick(PARTES_PJ) : pick(PARTES_PF)
      polo = chance(0.55) ? 'passivo' : 'ativo'
    }
    const id = `p${i + 1}`
    const andamentos: Andamento[] = []
    const qtd = int(3, 6)
    let dataAnd = somarDias(hoje, -int(5, 20))
    for (let k = 0; k < qtd; k++) {
      andamentos.push({ id: `${id}-a${k}`, data: dataAnd, descricao: pick(ANDAMENTOS_GENERICOS), origem: `${t.sistema} – ${tribunal}` })
      dataAnd = somarDias(dataAnd, -int(10, 60))
    }
    andamentos[andamentos.length - 1].descricao = 'Distribuído por sorteio'
    processos.push({
      id,
      numero: numeroCNJ(int(1000, 99999) * 10 + int(0, 9), ano, tribunal),
      tribunal,
      sistema: t.sistema,
      orgao: pick(t.orgaos),
      area,
      clienteId: cliente.id,
      parteContraria,
      polo,
      responsavelId: pick(responsavelPorArea[area]),
      equipe: equipePorArea[area],
      status: i % 13 === 7 ? 'Em recurso' : i % 17 === 9 ? 'Suspenso' : 'Ativo',
      valorCausa: Math.round((int(15, 2500) * 1000 + int(0, 99) * 10) * (cliente.tipo === 'PF' ? 0.1 : 1)),
      andamentos,
      documentos: [
        { titulo: 'Petição inicial (GED)', url: `https://ged.exemplo.com.br/processos/${id}/peticao-inicial` },
        { titulo: `Autos no ${t.sistema}`, url: `https://consulta.exemplo.jus.br/${tribunal.toLowerCase()}/${id}` },
        { titulo: 'Pasta do cliente', url: `https://ged.exemplo.com.br/clientes/${cliente.id}` },
      ],
    })
  }
  const procPorId = new Map(processos.map((p) => [p.id, p]))
  const cliPorId = new Map(clientes.map((c) => [c.id, c]))

  const prazos: Prazo[] = []
  const tarefas: Tarefa[] = []
  const controladores = ['u5', 'u6']

  function criarPrazo(opts: {
    processo: Processo
    ato: string
    disponibilizacao?: DataISO
    dataFatal?: DataISO
    intimacaoId?: string
    conferido: boolean
    cumprido: boolean
  }): Prazo {
    const sug = SUGESTOES_POR_ATO[opts.ato]
    const cal = calendarios[opts.processo.tribunal]
    const disp = opts.disponibilizacao ?? disponibilizacaoParaDataFatal(opts.dataFatal!, sug.dias, sug.contagem, cal)
    const r = calcularPrazo({ disponibilizacao: disp, dias: sug.dias, contagem: sug.contagem, calendario: cal })
    const lancador = pick(controladores)
    const conferente = controladores.find((c) => c !== lancador)!
    const prazo: Prazo = {
      id: `pz${prazos.length + 1}`,
      processoId: opts.processo.id,
      intimacaoId: opts.intimacaoId,
      tipo: sug.tipoPrazo,
      dataInicial: r.disponibilizacao,
      publicacao: r.publicacao,
      inicio: r.inicio,
      dias: sug.dias,
      contagem: sug.contagem,
      dataFatal: r.dataFatal,
      dataSeguranca: r.dataSeguranca,
      regra: r.regra,
      memoria: r.memoria,
      conferencia: opts.conferido ? 'Conferido' : 'Pendente',
      lancadoPorId: lancador,
      lancadoEm: quando(r.publicacao < hoje ? r.publicacao : disp, 9, int(0, 59)),
      conferidoPorId: opts.conferido ? conferente : undefined,
      conferidoEm: opts.conferido ? quando(r.publicacao < hoje ? r.publicacao : disp, int(11, 17), int(0, 59)) : undefined,
      responsavelId: opts.processo.responsavelId,
      cumprido: opts.cumprido,
      dataProtocolo: opts.cumprido ? somarDiasUteis(r.dataFatal, -int(0, 2), cal) : undefined,
    }
    prazos.push(prazo)

    // Tarefa vinculada
    const diasUteisAte = r.dataFatal < ref ? -1 : r.dataFatal === ref ? 0 : 10
    let status: StatusTarefa
    if (opts.cumprido) status = 'Concluída'
    else if (diasUteisAte <= 0) status = pick(['Em andamento', 'Em revisão', 'Em revisão'])
    else status = pick(['A fazer', 'A fazer', 'Em andamento'])
    const paraEstagiario = opts.processo.equipe === 'Cível' && chance(0.3)
    tarefas.push({
      id: `t${tarefas.length + 1}`,
      titulo: sug.tarefa,
      processoId: opts.processo.id,
      prazoId: prazo.id,
      responsavelId: paraEstagiario ? 'u4' : opts.processo.responsavelId,
      criadoPorId: lancador,
      dataLimite: r.dataSeguranca < ref && !opts.cumprido ? r.dataFatal : r.dataSeguranca,
      prioridade: diasUteisAte <= 0 ? 'Alta' : pick(['Alta', 'Média', 'Média', 'Baixa']),
      status,
      estimativaMin: pick([60, 90, 120, 180, 240, 300]),
      concluidaEm: opts.cumprido ? prazo.dataProtocolo : undefined,
    })
    return prazo
  }

  // Intimações
  const ATOS_CIVEIS = Object.keys(SUGESTOES_POR_ATO).filter((a) => a !== 'Sentença trabalhista')
  const ATOS_TRAB = ['Sentença trabalhista', 'Despacho para manifestação', 'Designação de audiência', 'Embargos de declaração']
  const statusIntimacoes: Intimacao['status'][] = [
    ...Array(8).fill('Nova'),
    ...Array(6).fill('Classificada'),
    ...Array(5).fill('Prazo lançado'),
    ...Array(6).fill('Conferida'),
  ]
  const intimacoes: Intimacao[] = statusIntimacoes.map((status, i) => {
    const processo = processos[(i * 3 + 1) % processos.length]
    const cliente = cliPorId.get(processo.clienteId)!
    const ato = processo.area === 'Trabalhista' ? pick(ATOS_TRAB) : pick(ATOS_CIVEIS)
    const recuo = status === 'Nova' ? int(0, 2) : status === 'Classificada' ? int(1, 3) : int(2, 6)
    const cal = calendarios[processo.tribunal]
    let disp = somarDiasUteis(ultimoUtil, -recuo, calendarioNacional)
    if (!cal.ehDiaUtil(disp)) disp = diaUtilAnterior(disp, cal)
    const r = calcularPrazo({ disponibilizacao: disp, dias: 1, contagem: 'uteis', calendario: cal })
    const fonte = processo.tribunal.startsWith('TRF') || chance(0.2) ? 'Domicílio Judicial Eletrônico' : 'DJEN'
    const id = `i${i + 1}`
    const historico: EventoAuditoria[] = [{ em: quando(disp, 7, int(0, 59)), usuarioId: 'sistema', acao: `Recebeu a intimação pelo ${fonte}` }]
    const intim: Intimacao = {
      id,
      processoId: processo.id,
      fonte,
      disponibilizacao: disp,
      publicacao: r.publicacao,
      teor: teorPorAto(ato, processo, cliente, somarDiasUteis(ref, int(15, 40), calendarioNacional)),
      status,
      historico,
    }
    processo.andamentos.unshift({ id: `${processo.id}-int${i}`, data: disp, descricao: `Intimação disponibilizada (${ato.toLowerCase()})`, origem: fonte })
    if (status !== 'Nova') {
      const classificador = pick(controladores)
      intim.tipoAto = ato
      intim.responsavelId = processo.responsavelId
      intim.classificadoPorId = classificador
      historico.push({ em: quando(disp, 9, int(0, 59)), usuarioId: classificador, acao: `Classificou como "${ato}" e definiu o responsável` })
    }
    if (status === 'Prazo lançado' || status === 'Conferida') {
      const prazo = criarPrazo({ processo, ato, disponibilizacao: disp, intimacaoId: id, conferido: status === 'Conferida', cumprido: false })
      const tarefa = tarefas[tarefas.length - 1]
      intim.prazoId = prazo.id
      intim.tarefaId = tarefa.id
      historico.push({ em: quando(disp, 10, int(0, 59)), usuarioId: prazo.lancadoPorId, acao: `Lançou prazo de ${prazo.tipo.toLowerCase()} com data fatal em ${prazo.dataFatal.split('-').reverse().join('/')}` })
      historico.push({ em: quando(disp, 10, int(0, 59)), usuarioId: prazo.lancadoPorId, acao: `Gerou a tarefa "${tarefa.titulo}"` })
      if (status === 'Conferida') {
        intim.conferidoPorId = prazo.conferidoPorId
        historico.push({ em: prazo.conferidoEm!, usuarioId: prazo.conferidoPorId!, acao: 'Conferiu o prazo' })
      }
    }
    return intim
  })

  // Prazos avulsos (originados de intimações anteriores)
  const alvos: { k: number; cumprido: boolean; conferido?: boolean }[] = [
    { k: -3, cumprido: false }, { k: -1, cumprido: false }, { k: -2, cumprido: false, conferido: false },
    { k: 0, cumprido: false }, { k: 0, cumprido: false }, { k: 0, cumprido: false, conferido: false }, { k: 0, cumprido: false },
    ...[1, 1, 2, 2, 3, 3, 1, 2].map((k, i) => ({ k, cumprido: false, conferido: i % 3 !== 0 })),
    ...[4, 4, 5, 5, 6, 6, 7, 7, 5].map((k, i) => ({ k, cumprido: false, conferido: i % 4 !== 1 })),
    ...[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 22, 24, 25].map((k, i) => ({ k, cumprido: false, conferido: i % 3 !== 2 })),
    ...[-1, -2, -4, -5, -7, -9, -11, -13, -16, -20].map((k) => ({ k, cumprido: true, conferido: true })),
  ]
  alvos.forEach((alvo, i) => {
    const processo = processos[(i * 11 + 5) % processos.length]
    const cal = calendarios[processo.tribunal]
    let fatal = somarDiasUteis(ref, alvo.k, calendarioNacional)
    if (alvo.k === 0) fatal = ref
    while (!cal.ehDiaUtil(fatal)) fatal = somarDias(fatal, alvo.k >= 0 ? 1 : -1)
    const atos = processo.area === 'Trabalhista' ? ATOS_TRAB : ATOS_CIVEIS.filter((a) => a !== 'Designação de audiência')
    criarPrazo({ processo, ato: pick(atos), dataFatal: fatal, conferido: alvo.conferido ?? true, cumprido: alvo.cumprido })
  })

  // Tarefas avulsas
  const pessoasTarefas = ['u1', 'u1', 'u2', 'u3', 'u4', 'u4', 'u7']
  const offsetsAvulsas = [0, 0, 0, 0, 1, 2, -1, -2, 3, 5, 0, 4, 6, 8, 10, 1, -3, 2, 7, 0]
  offsetsAvulsas.forEach((k, i) => {
    const responsavelId = pessoasTarefas[i % pessoasTarefas.length]
    const candidatos = processos.filter((p) => p.responsavelId === responsavelId || (responsavelId === 'u4' && p.equipe === 'Cível'))
    const processo = candidatos.length ? pick(candidatos) : pick(processos)
    const concluida = i % 6 === 5
    const dataLimite = k === 0 ? ref : somarDiasUteis(ref, k, calendarioNacional)
    tarefas.push({
      id: `t${tarefas.length + 1}`,
      titulo: TAREFAS_AVULSAS[i % TAREFAS_AVULSAS.length],
      processoId: processo.id,
      responsavelId,
      criadoPorId: pick(['u5', 'u6', 'u7', processo.responsavelId]),
      dataLimite,
      prioridade: pick(['Alta', 'Média', 'Baixa']),
      status: concluida ? 'Concluída' : k < 0 ? 'Em andamento' : pick(['A fazer', 'A fazer', 'Em andamento']),
      estimativaMin: pick([30, 60, 90, 120]),
      concluidaEm: concluida ? (dataLimite < hoje ? dataLimite : hoje) : undefined,
    })
  })

  // Lançamentos de horas (últimos 30 dias)
  const lancamentos: Lancamento[] = []
  const pessoasHoras = ['u1', 'u2', 'u3', 'u4', 'u7']
  const inicioMesAtual = inicioDoMes(hoje)
  function novoLancamento(usuarioId: string, data: DataISO, minutos: number, extra: Partial<Lancamento> = {}) {
    const candidatos = processos.filter((p) => p.responsavelId === usuarioId || (usuarioId === 'u4' && p.equipe === 'Cível') || (usuarioId === 'u7' && p.equipe === 'Cível'))
    const processo = extra.processoId ? procPorId.get(extra.processoId)! : pick(candidatos.length ? candidatos : processos)
    const tarefasDoProc = tarefas.filter((t) => t.processoId === processo.id && t.responsavelId === usuarioId)
    const tarefa = tarefasDoProc.length && chance(0.5) ? pick(tarefasDoProc) : undefined
    const idade = Math.round((Date.parse(hoje) - Date.parse(data)) / 86400000)
    let status: Lancamento['status'] = 'Aprovado'
    if (data === hoje) status = 'Rascunho'
    else if (idade <= 4) status = 'Enviado'
    lancamentos.push({
      id: `l${lancamentos.length + 1}`,
      usuarioId,
      data,
      minutos,
      processoId: processo.id,
      tarefaId: tarefa?.id,
      clienteId: processo.clienteId,
      descricao: tarefa ? tarefa.titulo : pick(DESCRICOES_HORAS),
      faturavel: chance(0.86),
      status,
      criadoEm: quando(data, int(17, 19), int(0, 59)),
      aprovadoEm: status === 'Aprovado' ? somarDias(data, 2) : undefined,
      ...extra,
    })
  }

  for (let d = 29; d >= 1; d--) {
    const data = somarDias(hoje, -d)
    if (!calendarioNacional.ehDiaUtil(data)) continue
    for (const u of pessoasHoras) {
      const qtd = 1 + (chance(0.42) ? 1 : 0)
      for (let q = 0; q < qtd; q++) novoLancamento(u, data, pick([30, 45, 60, 90, 120, 150, 180, 210, 240]))
    }
  }
  // Hoje: Ana com 3h30, demais com algo lançado
  const procAna = processos.filter((p) => p.responsavelId === 'u1')
  novoLancamento('u1', hoje, 120, { processoId: procAna[0]?.id, descricao: 'Elaboração de minuta de contestação' })
  novoLancamento('u1', hoje, 90, { processoId: procAna[1]?.id, descricao: 'Reunião com o cliente' })
  novoLancamento('u2', hoje, 150)
  novoLancamento('u4', hoje, 60)
  novoLancamento('u3', hoje, 240)
  // Um lançamento devolvido pelo Financeiro
  const devolvido = lancamentos.find((l) => l.usuarioId === 'u1' && l.status === 'Enviado')
  if (devolvido) {
    devolvido.status = 'Rascunho'
    devolvido.comentario = 'Detalhar melhor a descrição, o cliente exige atividade específica no relatório.'
  }
  // Ajusta para exatamente 150 lançamentos (remove os mais antigos ou completa)
  while (lancamentos.length > 150) lancamentos.splice(lancamentos.findIndex((l) => l.data !== hoje && l.data >= somarDias(hoje, -29)), 1)
  while (lancamentos.length < 150) novoLancamento(pick(pessoasHoras), somarDiasUteis(ultimoUtil, -int(5, 15), calendarioNacional), pick([30, 60, 90]))
  lancamentos.forEach((l, i) => (l.id = `l${i + 1}`))

  // Pré-faturas do mês anterior
  const preFaturas: PreFatura[] = []
  const config = {
    metaDiariaMin: 8 * 60,
    valoresHora: { socio: 950, advogado: 550, estagiario: 180, controladoria: 0, financeiro: 0 },
    feriadosTribunal: JSON.parse(JSON.stringify(FERIADOS_PADRAO)),
  }
  const mesAnterior = somarMeses(hoje, -1)
  const fimMesAnterior = fimDoMes(mesAnterior)
  const perfilDe = new Map(USUARIOS.map((u) => [u.id, u.perfil]))
  clientes.forEach((cliente, i) => {
    if (cliente.contrato.modalidade === 'exito') return
    const doMes = lancamentos.filter((l) => l.clienteId === cliente.id && l.data >= mesAnterior && l.data <= fimMesAnterior && l.status === 'Aprovado' && l.faturavel)
    if (!doMes.length && cliente.contrato.modalidade !== 'mensal') return
    const id = `pf${preFaturas.length + 1}`
    const valorHoras =
      cliente.contrato.modalidade === 'hora'
        ? doMes.reduce((s, l) => s + (l.minutos / 60) * config.valoresHora[perfilDe.get(l.usuarioId)!] * (1 - (cliente.contrato.descontoHora ?? 0)), 0)
        : 0
    const valorFixo = cliente.contrato.modalidade === 'mensal' ? cliente.contrato.valorMensal ?? 0 : 0
    const faturadaEm = somarDiasUteis(inicioMesAtual, 2, calendarioNacional) <= hoje ? somarDiasUteis(inicioMesAtual, 2, calendarioNacional) : inicioMesAtual
    const recebida = i % 2 === 0
    doMes.forEach((l) => {
      l.status = 'Faturado'
      l.preFaturaId = id
    })
    preFaturas.push({
      id,
      numero: `PF-${mesAnterior.slice(0, 4)}-${String(100 + preFaturas.length).padStart(4, '0')}`,
      clienteId: cliente.id,
      inicio: mesAnterior,
      fim: fimMesAnterior,
      lancamentoIds: doMes.map((l) => l.id),
      valorHoras: Math.round(valorHoras * 100) / 100,
      valorFixo,
      total: Math.round((valorHoras + valorFixo) * 100) / 100,
      status: recebida ? 'Recebida' : 'Faturada',
      criadaEm: faturadaEm,
      faturadaEm,
      recebidaEm: recebida && somarDias(faturadaEm, 6) <= hoje ? somarDias(faturadaEm, 6) : undefined,
    })
    if (recebida && !preFaturas[preFaturas.length - 1].recebidaEm) preFaturas[preFaturas.length - 1].status = 'Faturada'
  })

  processos.forEach((p) => p.andamentos.sort((a, b) => b.data.localeCompare(a.data)))
  return {
    versao: VERSAO_DADOS,
    geradoEm: hoje,
    usuarios: USUARIOS.map((u) => ({ ...u })),
    clientes,
    processos,
    intimacoes,
    prazos,
    tarefas,
    lancamentos,
    preFaturas,
    config,
  }
}
