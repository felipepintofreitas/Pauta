import type { Feriado } from '@/lib/prazo'

const carnaval: Feriado[] = [
  { data: '2026-02-16', descricao: 'Carnaval (segunda-feira)' },
  { data: '2026-02-17', descricao: 'Carnaval (terça-feira)' },
  { data: '2027-02-08', descricao: 'Carnaval (segunda-feira)' },
  { data: '2027-02-09', descricao: 'Carnaval (terça-feira)' },
]
const corpus: Feriado[] = [
  { data: '2026-06-04', descricao: 'Corpus Christi' },
  { data: '2027-05-27', descricao: 'Corpus Christi' },
]
const semanaSantaFederal: Feriado[] = [
  { data: '2026-04-01', descricao: 'Quarta-feira Santa' },
  { data: '2026-04-02', descricao: 'Quinta-feira Santa' },
  { data: '2027-03-24', descricao: 'Quarta-feira Santa' },
  { data: '2027-03-25', descricao: 'Quinta-feira Santa' },
]
const federal: Feriado[] = [
  { data: '08-11', descricao: 'Fundação dos cursos jurídicos' },
  { data: '11-01', descricao: 'Todos os Santos' },
  { data: '12-08', descricao: 'Dia da Justiça' },
]

/** Feriados e suspensões padrão por tribunal (editáveis em Configurações). */
export const FERIADOS_PADRAO: Record<string, Feriado[]> = {
  TJPE: [
    { data: '03-06', descricao: 'Revolução Pernambucana (Data Magna)' },
    { data: '06-24', descricao: 'São João' },
    { data: '07-16', descricao: 'Nossa Senhora do Carmo (Recife)' },
    { data: '10-28', descricao: 'Dia do Servidor Público' },
    { data: '12-08', descricao: 'Nossa Senhora da Conceição (Recife)' },
    ...carnaval,
    ...corpus,
  ],
  TRT6: [
    { data: '03-06', descricao: 'Revolução Pernambucana (Data Magna)' },
    { data: '06-24', descricao: 'São João' },
    { data: '08-11', descricao: 'Fundação dos cursos jurídicos' },
    { data: '10-28', descricao: 'Dia do Servidor Público' },
    ...carnaval,
  ],
  TRF5: [...federal, ...carnaval, ...semanaSantaFederal],
  TRF4: [...federal, ...carnaval, ...semanaSantaFederal],
  STJ: [...federal, ...carnaval, ...semanaSantaFederal],
  TJSP: [
    { data: '01-25', descricao: 'Aniversário de São Paulo' },
    { data: '07-09', descricao: 'Revolução Constitucionalista' },
    { data: '10-28', descricao: 'Dia do Servidor Público' },
    ...carnaval,
    ...corpus,
  ],
  TJPR: [
    { data: '09-08', descricao: 'Nossa Senhora da Luz dos Pinhais (Curitiba)' },
    { data: '10-28', descricao: 'Dia do Servidor Público' },
    { data: '12-19', descricao: 'Emancipação Política do Paraná' },
    ...carnaval,
    ...corpus,
  ],
  TRT2: [
    { data: '01-25', descricao: 'Aniversário de São Paulo' },
    { data: '07-09', descricao: 'Revolução Constitucionalista' },
    { data: '08-11', descricao: 'Fundação dos cursos jurídicos' },
    { data: '10-28', descricao: 'Dia do Servidor Público' },
    ...carnaval,
  ],
}

export const TRIBUNAIS = Object.keys(FERIADOS_PADRAO)
