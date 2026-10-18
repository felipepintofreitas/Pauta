import { describe, expect, it } from 'vitest'
import { calcularPrazo, criarCalendario, diasUteisEntre, disponibilizacaoParaDataFatal, feriadosNacionais, pascoa, proximoDiaUtil, somarDiasUteis } from './prazo'

const tjpe = criarCalendario([{ data: '10-28', descricao: 'Dia do Servidor Público' }], 'TJPE')
const semFeriadosLocais = criarCalendario()

describe('calendário forense', () => {
  it('calcula a Páscoa', () => {
    expect(pascoa(2025)).toBe('2025-04-20')
    expect(pascoa(2026)).toBe('2026-04-05')
  })

  it('inclui a Sexta-feira da Paixão e a Consciência Negra entre os feriados nacionais', () => {
    const datas = feriadosNacionais(2026).map((f) => f.data)
    expect(datas).toContain('2026-04-03')
    expect(datas).toContain('2026-11-20')
  })

  it('pula fim de semana e feriado ao buscar o próximo dia útil', () => {
    expect(proximoDiaUtil('2025-10-10', semFeriadosLocais)).toBe('2025-10-13')
    expect(proximoDiaUtil('2025-10-27', tjpe)).toBe('2025-10-29')
  })

  it('trata o recesso de 20/12 a 20/01 como dias não úteis', () => {
    expect(tjpe.ehDiaUtil('2025-12-22')).toBe(false)
    expect(tjpe.ehDiaUtil('2026-01-20')).toBe(false)
    expect(tjpe.ehDiaUtil('2026-01-21')).toBe(true)
  })
})

describe('calcularPrazo', () => {
  it('reproduz o exemplo da especificação (15 dias úteis no TJPE)', () => {
    const r = calcularPrazo({ disponibilizacao: '2025-10-14', dias: 15, contagem: 'uteis', calendario: tjpe })
    expect(r.publicacao).toBe('2025-10-15')
    expect(r.inicio).toBe('2025-10-16')
    expect(r.dataFatal).toBe('2025-11-06')
    expect(r.dataSeguranca).toBe('2025-11-04')
    expect(r.diasExcluidos.map((d) => d.data)).toEqual(['2025-10-28'])
    expect(r.memoria).toContain('Disponibilizado em 14/10/2025, publicado em 15/10/2025, início em 16/10/2025, 15 dias úteis, data fatal 06/11/2025')
  })

  it('sem o feriado local, o mesmo prazo vence um dia útil antes', () => {
    const r = calcularPrazo({ disponibilizacao: '2025-10-14', dias: 15, contagem: 'uteis', calendario: semFeriadosLocais })
    expect(r.dataFatal).toBe('2025-11-05')
  })

  it('suspende a contagem no recesso forense', () => {
    const r = calcularPrazo({ disponibilizacao: '2025-12-17', dias: 5, contagem: 'uteis', calendario: tjpe })
    expect(r.inicio).toBe('2025-12-19')
    expect(r.dataFatal).toBe('2026-01-26')
    expect(r.memoria).toContain('Recesso forense de 20/12/2025 a 20/01/2026')
  })

  it('em dias corridos, prorroga o vencimento que cai no fim de semana', () => {
    const r = calcularPrazo({ disponibilizacao: '2025-10-14', dias: 3, contagem: 'corridos', calendario: semFeriadosLocais })
    // início 16/10 (qui), 3º dia = 18/10 (sáb) → prorroga para 20/10 (seg)
    expect(r.dataFatal).toBe('2025-10-20')
    expect(r.prorrogado).toBe(true)
  })

  it('rejeita quantidade de dias inválida', () => {
    expect(() => calcularPrazo({ disponibilizacao: '2025-10-14', dias: 0, contagem: 'uteis', calendario: tjpe })).toThrow()
  })

  it('encontra a disponibilização que gera uma data fatal desejada', () => {
    const disp = disponibilizacaoParaDataFatal('2025-11-06', 15, 'uteis', tjpe)
    expect(calcularPrazo({ disponibilizacao: disp, dias: 15, contagem: 'uteis', calendario: tjpe }).dataFatal).toBe('2025-11-06')
  })
})

describe('dias úteis', () => {
  it('conta dias úteis entre datas', () => {
    expect(diasUteisEntre('2025-10-24', '2025-10-29', tjpe)).toBe(2)
    expect(diasUteisEntre('2025-10-29', '2025-10-24', tjpe)).toBe(-2)
    expect(somarDiasUteis('2025-11-06', -2, tjpe)).toBe('2025-11-04')
  })
})
