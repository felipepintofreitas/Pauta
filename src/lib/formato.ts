import { deISO, type DataISO } from './datas'

/** dd/mm/aaaa */
export function data(iso: DataISO | undefined | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** dd/mm */
export function dataCurta(iso: DataISO): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

export function dataHora(isoCompleto: string): string {
  const d = new Date(isoCompleto)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()} às ${hh}h${mi}`
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function dataPorExtenso(iso: DataISO): string {
  const d = deISO(iso)
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function diaSemanaCurto(iso: DataISO): string {
  return DIAS_CURTOS[deISO(iso).getDay()]
}

export function mesAno(iso: DataISO): string {
  const d = deISO(iso)
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function reais(valor: number): string {
  return moeda.format(valor)
}

export function numero(valor: number, casas = 0): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export function percentual(valor: number): string {
  return `${numero(valor * 100, 0)}%`
}

/** Minutos para "1h30", "45min", "2h". */
export function horas(minutos: number): string {
  const total = Math.round(minutos)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** Cronômetro "1:05:09". */
export function cronometro(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/** Interpreta "1h30", "1:30", "90", "45min", "1,5" (horas) e retorna minutos. */
export function interpretarDuracao(texto: string): number | null {
  const t = texto.trim().toLowerCase().replace(/\s+/g, '')
  if (!t) return null
  let m = t.match(/^(\d+)h(?:(\d{1,2})(?:min|m)?)?$/)
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0)
  m = t.match(/^(\d+):(\d{1,2})$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = t.match(/^(\d+)(?:min|m)$/)
  if (m) return Number(m[1])
  m = t.match(/^(\d+)[.,](\d+)$/)
  if (m) return Math.round(parseFloat(`${m[1]}.${m[2]}`) * 60)
  m = t.match(/^(\d+)$/)
  if (m) return Number(m[1])
  return null
}
