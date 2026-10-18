/**
 * Cálculo de prazos processuais (simplificado para o protótipo).
 *
 * Regras aplicadas:
 * - Publicação: 1º dia útil seguinte à disponibilização no DJEN (Lei 11.419/2006, art. 4º, §3º).
 * - Início: 1º dia útil seguinte à publicação; o dia do início conta como dia 1 (CPC, art. 224).
 * - Contagem em dias úteis por padrão (CPC, art. 219), excluindo sábados, domingos,
 *   feriados nacionais e feriados do tribunal.
 * - Suspensão no recesso forense de 20/12 a 20/01 (CPC, art. 220).
 * - Em dias corridos, se o último dia cair em dia não útil, prorroga para o próximo dia útil.
 * - Data de segurança: antecipada em 2 dias úteis em relação à data fatal.
 *
 * Módulo puro: não depende de React nem do estado da aplicação.
 */
import { diaDaSemana, somarDias, type DataISO } from './datas'
import { data as fmt } from './formato'

export type Contagem = 'uteis' | 'corridos'

/** `data` no formato "MM-DD" (repete todo ano) ou "AAAA-MM-DD" (data específica). */
export interface Feriado {
  data: string
  descricao: string
}

export interface Calendario {
  /** Retorna o motivo pelo qual o dia não é útil, ou null se for dia útil. */
  motivoNaoUtil(iso: DataISO): string | null
  ehDiaUtil(iso: DataISO): boolean
  emRecesso(iso: DataISO): boolean
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): DataISO {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const FIXOS_NACIONAIS: Feriado[] = [
  { data: '01-01', descricao: 'Confraternização Universal' },
  { data: '04-21', descricao: 'Tiradentes' },
  { data: '05-01', descricao: 'Dia do Trabalho' },
  { data: '09-07', descricao: 'Independência do Brasil' },
  { data: '10-12', descricao: 'Nossa Senhora Aparecida' },
  { data: '11-02', descricao: 'Finados' },
  { data: '11-15', descricao: 'Proclamação da República' },
  { data: '11-20', descricao: 'Dia Nacional de Zumbi e da Consciência Negra' },
  { data: '12-25', descricao: 'Natal' },
]

export function feriadosNacionais(ano: number): { data: DataISO; descricao: string }[] {
  const lista = FIXOS_NACIONAIS.map((f) => ({ data: `${ano}-${f.data}`, descricao: f.descricao }))
  lista.push({ data: somarDias(pascoa(ano), -2), descricao: 'Sexta-feira da Paixão' })
  return lista.sort((x, y) => x.data.localeCompare(y.data))
}

export function emRecesso(iso: DataISO): boolean {
  const md = iso.slice(5)
  return md >= '12-20' || md <= '01-20'
}

export function criarCalendario(feriadosTribunal: Feriado[] = [], nomeTribunal?: string): Calendario {
  const cacheNacionais = new Map<number, Map<string, string>>()
  const nacionais = (ano: number) => {
    let mapa = cacheNacionais.get(ano)
    if (!mapa) {
      mapa = new Map(feriadosNacionais(ano).map((f) => [f.data, f.descricao]))
      cacheNacionais.set(ano, mapa)
    }
    return mapa
  }
  const sufixo = nomeTribunal ? ` (${nomeTribunal})` : ''

  const motivoNaoUtil = (iso: DataISO): string | null => {
    if (emRecesso(iso)) return 'Recesso forense'
    const dia = diaDaSemana(iso)
    if (dia === 6) return 'Sábado'
    if (dia === 0) return 'Domingo'
    const nacional = nacionais(Number(iso.slice(0, 4))).get(iso)
    if (nacional) return `Feriado nacional: ${nacional}`
    const local = feriadosTribunal.find((f) => (f.data.length === 5 ? f.data === iso.slice(5) : f.data === iso))
    if (local) return `Feriado${sufixo}: ${local.descricao}`
    return null
  }

  return {
    motivoNaoUtil,
    ehDiaUtil: (iso) => motivoNaoUtil(iso) === null,
    emRecesso,
  }
}

/** Primeiro dia útil estritamente posterior a `iso`. */
export function proximoDiaUtil(iso: DataISO, cal: Calendario): DataISO {
  let d = somarDias(iso, 1)
  while (!cal.ehDiaUtil(d)) d = somarDias(d, 1)
  return d
}

/** Primeiro dia útil estritamente anterior a `iso`. */
export function diaUtilAnterior(iso: DataISO, cal: Calendario): DataISO {
  let d = somarDias(iso, -1)
  while (!cal.ehDiaUtil(d)) d = somarDias(d, -1)
  return d
}

/** Avança (ou recua, se negativo) `n` dias úteis a partir de `iso`. */
export function somarDiasUteis(iso: DataISO, n: number, cal: Calendario): DataISO {
  let d = iso
  for (let i = 0; i < Math.abs(n); i++) d = n > 0 ? proximoDiaUtil(d, cal) : diaUtilAnterior(d, cal)
  return d
}

/**
 * Quantidade de dias úteis de `de` (exclusive) até `ate` (inclusive).
 * Negativo quando `ate` é anterior a `de`.
 */
export function diasUteisEntre(de: DataISO, ate: DataISO, cal: Calendario): number {
  if (de === ate) return 0
  const sinal = ate > de ? 1 : -1
  let n = 0
  let d = de
  while (d !== ate) {
    d = somarDias(d, sinal)
    if (cal.ehDiaUtil(d)) n += sinal
  }
  return n
}

export interface EntradaCalculo {
  disponibilizacao: DataISO
  dias: number
  contagem: Contagem
  calendario: Calendario
  /** Dias úteis de antecedência da data de segurança. Padrão: 2. */
  antecedenciaSeguranca?: number
}

export interface DiaExcluido {
  data: DataISO
  motivo: string
}

export interface ResultadoCalculo {
  disponibilizacao: DataISO
  publicacao: DataISO
  inicio: DataISO
  dataFatal: DataISO
  dataSeguranca: DataISO
  dias: number
  contagem: Contagem
  prorrogado: boolean
  /** Feriados e dias de recesso dentro do período (fins de semana não são listados). */
  diasExcluidos: DiaExcluido[]
  memoria: string
  regra: string
}

export function calcularPrazo(entrada: EntradaCalculo): ResultadoCalculo {
  const { disponibilizacao, dias, contagem, calendario: cal } = entrada
  const antecedencia = entrada.antecedenciaSeguranca ?? 2
  if (!Number.isInteger(dias) || dias < 1) throw new Error('A quantidade de dias deve ser um inteiro positivo.')

  const publicacao = proximoDiaUtil(disponibilizacao, cal)
  const inicio = proximoDiaUtil(publicacao, cal)
  const excluidos: DiaExcluido[] = []
  const registrar = (d: DataISO) => {
    const motivo = cal.motivoNaoUtil(d)
    if (motivo && motivo !== 'Sábado' && motivo !== 'Domingo') excluidos.push({ data: d, motivo })
  }

  let dataFatal = inicio
  let prorrogado = false
  if (contagem === 'uteis') {
    let contados = 1
    while (contados < dias) {
      dataFatal = somarDias(dataFatal, 1)
      if (cal.ehDiaUtil(dataFatal)) contados++
      else registrar(dataFatal)
    }
  } else {
    // Dias corridos: o recesso suspende a contagem; os demais dias contam normalmente.
    let contados = 1
    while (contados < dias) {
      dataFatal = somarDias(dataFatal, 1)
      if (cal.emRecesso(dataFatal)) registrar(dataFatal)
      else contados++
    }
    if (!cal.ehDiaUtil(dataFatal)) {
      registrar(dataFatal)
      dataFatal = proximoDiaUtil(dataFatal, cal)
      prorrogado = true
    }
  }

  const dataSeguranca = somarDiasUteis(dataFatal, -antecedencia, cal)
  const unidade = contagem === 'uteis' ? (dias === 1 ? 'dia útil' : 'dias úteis') : dias === 1 ? 'dia corrido' : 'dias corridos'

  const partes = [
    `Disponibilizado em ${fmt(disponibilizacao)}`,
    `publicado em ${fmt(publicacao)}`,
    `início em ${fmt(inicio)}`,
    `${dias} ${unidade}`,
    `data fatal ${fmt(dataFatal)}${prorrogado ? ' (prorrogada para o próximo dia útil)' : ''}`,
  ]
  let memoria = partes.join(', ') + '.'
  const recesso = excluidos.filter((e) => e.motivo === 'Recesso forense')
  const feriados = excluidos.filter((e) => e.motivo !== 'Recesso forense')
  if (feriados.length) memoria += ` Não contados: ${feriados.map((f) => `${fmt(f.data)} (${f.motivo})`).join('; ')}.`
  if (recesso.length) memoria += ` Recesso forense de ${fmt(recesso[0].data)} a ${fmt(recesso[recesso.length - 1].data)} não contado.`
  memoria += ` Data de segurança: ${fmt(dataSeguranca)} (${antecedencia} dias úteis antes).`

  const regra =
    contagem === 'uteis'
      ? 'Contagem em dias úteis (CPC, art. 219), excluído o dia da publicação e incluído o do vencimento (CPC, art. 224). Publicação no 1º dia útil após a disponibilização no DJEN (Lei 11.419/2006, art. 4º, §3º). Prazos suspensos no recesso de 20/12 a 20/01 (CPC, art. 220).'
      : 'Contagem em dias corridos, com prorrogação para o primeiro dia útil se o vencimento cair em dia não útil (CPC, art. 224, §1º). Publicação no 1º dia útil após a disponibilização. Prazos suspensos no recesso de 20/12 a 20/01 (CPC, art. 220).'

  return { disponibilizacao, publicacao, inicio, dataFatal, dataSeguranca, dias, contagem, prorrogado, diasExcluidos: excluidos, memoria, regra }
}

/**
 * Encontra a data de disponibilização que leva a uma data fatal desejada
 * (usado apenas para gerar dados simulados coerentes com o cálculo).
 */
export function disponibilizacaoParaDataFatal(dataFatal: DataISO, dias: number, contagem: Contagem, cal: Calendario): DataISO {
  let palpite = contagem === 'uteis' ? somarDiasUteis(dataFatal, -(dias + 1), cal) : somarDias(dataFatal, -(dias + 2))
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const r = calcularPrazo({ disponibilizacao: palpite, dias, contagem, calendario: cal })
    if (r.dataFatal === dataFatal) return palpite
    palpite = somarDias(palpite, r.dataFatal < dataFatal ? 1 : -1)
  }
  return palpite
}

/** Sugestões de prazo por tipo de ato (prazos usuais do CPC/CLT, para apoio). */
export interface SugestaoPrazo {
  tipoPrazo: string
  dias: number
  contagem: Contagem
  tarefa: string
}

export const SUGESTOES_POR_ATO: Record<string, SugestaoPrazo> = {
  'Citação': { tipoPrazo: 'Contestação', dias: 15, contagem: 'uteis', tarefa: 'Elaborar contestação' },
  'Sentença': { tipoPrazo: 'Recurso', dias: 15, contagem: 'uteis', tarefa: 'Elaborar recurso de apelação' },
  'Sentença trabalhista': { tipoPrazo: 'Recurso', dias: 8, contagem: 'uteis', tarefa: 'Elaborar recurso ordinário' },
  'Decisão interlocutória': { tipoPrazo: 'Recurso', dias: 15, contagem: 'uteis', tarefa: 'Avaliar e elaborar agravo de instrumento' },
  'Despacho para manifestação': { tipoPrazo: 'Manifestação', dias: 5, contagem: 'uteis', tarefa: 'Elaborar manifestação' },
  'Intimação para réplica': { tipoPrazo: 'Réplica', dias: 15, contagem: 'uteis', tarefa: 'Elaborar réplica' },
  'Designação de audiência': { tipoPrazo: 'Audiência', dias: 1, contagem: 'uteis', tarefa: 'Preparar audiência' },
  'Embargos de declaração': { tipoPrazo: 'Contrarrazões', dias: 5, contagem: 'uteis', tarefa: 'Elaborar contrarrazões aos embargos' },
  'Acórdão': { tipoPrazo: 'Recurso', dias: 15, contagem: 'uteis', tarefa: 'Avaliar recurso especial/extraordinário' },
  'Cumprimento de sentença': { tipoPrazo: 'Pagamento/Impugnação', dias: 15, contagem: 'uteis', tarefa: 'Analisar cumprimento de sentença' },
}

export const TIPOS_ATO = Object.keys(SUGESTOES_POR_ATO)
