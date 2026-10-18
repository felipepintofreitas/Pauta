import type { BancoDados, Cliente, Lancamento, Perfil } from '@/data/tipos'
import { criarCalendario, type Calendario } from './prazo'

const cacheCal = new WeakMap<object, Map<string, Calendario>>()

export function calendarioDoTribunal(db: BancoDados, tribunal: string): Calendario {
  let porTribunal = cacheCal.get(db.config.feriadosTribunal)
  if (!porTribunal) {
    porTribunal = new Map()
    cacheCal.set(db.config.feriadosTribunal, porTribunal)
  }
  let cal = porTribunal.get(tribunal)
  if (!cal) {
    cal = criarCalendario(db.config.feriadosTribunal[tribunal] ?? [], tribunal)
    porTribunal.set(tribunal, cal)
  }
  return cal
}

export function valorHora(db: BancoDados, perfil: Perfil, cliente?: Cliente): number {
  const base = db.config.valoresHora[perfil] ?? 0
  return base * (1 - (cliente?.contrato.descontoHora ?? 0))
}

/** Valor de um lançamento conforme o contrato do cliente (só contratos por hora geram valor por hora). */
export function valorLancamento(db: BancoDados, l: Lancamento): number {
  if (!l.faturavel) return 0
  const cliente = db.clientes.find((c) => c.id === l.clienteId)
  if (!cliente || cliente.contrato.modalidade !== 'hora') return 0
  const usuario = db.usuarios.find((u) => u.id === l.usuarioId)
  if (!usuario) return 0
  return Math.round((l.minutos / 60) * valorHora(db, usuario.perfil, cliente) * 100) / 100
}

export function somaMinutos(lista: { minutos: number }[]): number {
  return lista.reduce((s, l) => s + l.minutos, 0)
}

export interface ResumoCliente {
  minutos: number
  minutosFaturaveis: number
  minutosAprovadosAFaturar: number
  minutosPendentes: number
  valorHoras: number
  valorFixo: number
  total: number
}

/** Resumo de horas e valor a faturar de um cliente no período. */
export function resumoCliente(db: BancoDados, cliente: Cliente, inicio: string, fim: string): ResumoCliente {
  const doPeriodo = db.lancamentos.filter((l) => l.clienteId === cliente.id && l.data >= inicio && l.data <= fim)
  const aFaturar = doPeriodo.filter((l) => l.status === 'Aprovado' && l.faturavel && !l.preFaturaId)
  const valorHoras = aFaturar.reduce((s, l) => s + valorLancamento(db, l), 0)
  const jaCobradoFixo = db.preFaturas.some((pf) => pf.clienteId === cliente.id && pf.valorFixo > 0 && pf.inicio <= fim && pf.fim >= inicio)
  const valorFixo = cliente.contrato.modalidade === 'mensal' && !jaCobradoFixo ? cliente.contrato.valorMensal ?? 0 : 0
  return {
    minutos: somaMinutos(doPeriodo),
    minutosFaturaveis: somaMinutos(doPeriodo.filter((l) => l.faturavel)),
    minutosAprovadosAFaturar: somaMinutos(aFaturar),
    minutosPendentes: somaMinutos(doPeriodo.filter((l) => l.status === 'Enviado' || l.status === 'Rascunho')),
    valorHoras: Math.round(valorHoras * 100) / 100,
    valorFixo,
    total: Math.round((valorHoras + valorFixo) * 100) / 100,
  }
}
