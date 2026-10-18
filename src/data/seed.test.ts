import { describe, expect, it } from 'vitest'
import { gerarDados } from './seed'
import { urgencia } from '@/lib/urgencia'

describe('dados simulados', () => {
  for (const hoje of ['2026-10-17', '2026-10-19', '2026-12-18', '2027-03-02']) {
    it(`gera as quantidades pedidas com itens urgentes (${hoje})`, () => {
      const db = gerarDados(hoje)
      expect(db.usuarios).toHaveLength(8)
      expect(db.clientes).toHaveLength(12)
      expect(db.processos).toHaveLength(40)
      expect(db.intimacoes).toHaveLength(25)
      expect(db.prazos).toHaveLength(60)
      expect(db.tarefas).toHaveLength(80)
      expect(db.lancamentos).toHaveLength(150)
      const niveis = db.prazos.map((p) => urgencia(p.dataFatal, p.cumprido, hoje).nivel)
      expect(niveis).toContain('vencido')
      expect(niveis).toContain('hoje')
      expect(niveis).toContain('ate3')
      expect(niveis).toContain('ate7')
    })
  }
  it('gera números CNJ no formato correto', () => {
    const db = gerarDados('2026-10-17')
    for (const p of db.processos) expect(p.numero).toMatch(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/)
  })
})
