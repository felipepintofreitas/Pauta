import { useMemo } from 'react'
import type { Cliente, Processo, Tarefa, Usuario, Prazo } from '@/data/tipos'
import { useApp } from './store'

/** Mapas de consulta por id, recalculados quando os dados mudam. */
export function useConsultas() {
  const { db } = useApp()
  return useMemo(() => {
    const processos = new Map(db.processos.map((p) => [p.id, p]))
    const clientes = new Map(db.clientes.map((c) => [c.id, c]))
    const usuarios = new Map(db.usuarios.map((u) => [u.id, u]))
    const tarefas = new Map(db.tarefas.map((t) => [t.id, t]))
    const prazos = new Map(db.prazos.map((p) => [p.id, p]))
    return {
      processo: (id?: string): Processo | undefined => (id ? processos.get(id) : undefined),
      cliente: (id?: string): Cliente | undefined => (id ? clientes.get(id) : undefined),
      usuario: (id?: string): Usuario | undefined => (id ? usuarios.get(id) : undefined),
      tarefa: (id?: string): Tarefa | undefined => (id ? tarefas.get(id) : undefined),
      prazo: (id?: string): Prazo | undefined => (id ? prazos.get(id) : undefined),
      nomeUsuario: (id?: string) => (id === 'sistema' ? 'Captura automática' : (id && usuarios.get(id)?.nome) || '—'),
      clienteDoProcesso: (id?: string) => {
        const p = id ? processos.get(id) : undefined
        return p ? clientes.get(p.clienteId) : undefined
      },
    }
  }, [db])
}
