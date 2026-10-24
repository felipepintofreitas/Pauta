import type { BancoDados } from '@/data/tipos'
import type { Rota } from '@/lib/permissoes'
import type { GrupoIntegracoes, Integracao } from '@/data/integracoes'

export interface UsoIntegracao {
  texto: string
  caminho: string
  modulo: Rota
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Quanto dos dados do protótipo passaria por este sistema, com link para vê-los. */
export function usoDoItem(db: BancoDados, item: Integracao): UsoIntegracao | null {
  if (item.fonte) {
    const n = db.intimacoes.filter((i) => i.fonte === item.fonte).length
    return { texto: plural(n, 'intimação recebida', 'intimações recebidas'), caminho: `/intimacoes?fonte=${encodeURIComponent(item.fonte)}`, modulo: 'intimacoes' }
  }
  if (item.sistema) {
    const n = db.processos.filter((p) => p.sistema === item.sistema).length
    return { texto: plural(n, 'processo neste sistema', 'processos neste sistema'), caminho: `/processos?sistema=${encodeURIComponent(item.sistema)}`, modulo: 'processos' }
  }
  if (item.id === 'legal-one' || item.id === 'elaw') return { texto: `${plural(db.processos.length, 'processo', 'processos')} e ${plural(db.prazos.length, 'prazo', 'prazos')} a sincronizar`, caminho: '/processos', modulo: 'processos' }
  if (item.id === 'imanage' || item.id === 'docusign') {
    const n = db.processos.reduce((s, p) => s + p.documentos.length, 0)
    return { texto: plural(n, 'documento vinculado', 'documentos vinculados'), caminho: '/processos', modulo: 'processos' }
  }
  if (item.id === 'timeshifter') return { texto: plural(db.lancamentos.length, 'lançamento no Timesheet', 'lançamentos no Timesheet'), caminho: '/timesheet', modulo: 'timesheet' }
  return null
}

/** Número principal do card do grupo na página inicial. */
export function resumoDoGrupo(db: BancoDados, grupo: GrupoIntegracoes): string {
  switch (grupo.id) {
    case 'intimacoes-oficiais':
      return plural(db.intimacoes.length, 'intimação capturada', 'intimações capturadas')
    case 'tribunais':
      return `${plural(db.processos.length, 'processo', 'processos')} em ${new Set(db.processos.map((p) => p.sistema)).size} sistemas`
    case 'gestao':
      return `${plural(db.processos.length, 'processo', 'processos')} a sincronizar`
    case 'documentos':
      return plural(db.processos.reduce((s, p) => s + p.documentos.length, 0), 'documento vinculado', 'documentos vinculados')
    case 'clientes':
      return plural(db.clientes.length, 'cliente', 'clientes')
    default:
      return plural(grupo.itens.length, 'sistema', 'sistemas')
  }
}
