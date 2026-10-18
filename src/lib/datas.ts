/** Datas são sempre strings ISO "AAAA-MM-DD" no fuso local. */
export type DataISO = string

export function deISO(iso: DataISO): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d, 12)
}

export function paraISO(data: Date): DataISO {
  const a = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

export function hojeISO(): DataISO {
  return paraISO(new Date())
}

export function somarDias(iso: DataISO, dias: number): DataISO {
  const d = deISO(iso)
  d.setDate(d.getDate() + dias)
  return paraISO(d)
}

export function diaDaSemana(iso: DataISO): number {
  return deISO(iso).getDay()
}

export function diferencaDias(de: DataISO, ate: DataISO): number {
  return Math.round((deISO(ate).getTime() - deISO(de).getTime()) / 86400000)
}

export function inicioDaSemana(iso: DataISO): DataISO {
  const dia = diaDaSemana(iso)
  return somarDias(iso, dia === 0 ? -6 : 1 - dia)
}

export function inicioDoMes(iso: DataISO): DataISO {
  return iso.slice(0, 8) + '01'
}

export function fimDoMes(iso: DataISO): DataISO {
  const d = deISO(iso)
  return paraISO(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
}

export function somarMeses(iso: DataISO, meses: number): DataISO {
  const d = deISO(inicioDoMes(iso))
  return paraISO(new Date(d.getFullYear(), d.getMonth() + meses, 1, 12))
}
