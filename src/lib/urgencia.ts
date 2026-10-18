import { diaDaSemana, diferencaDias, hojeISO, type DataISO } from './datas'
import { dataCurta } from './formato'
import { criarCalendario, diasUteisEntre, proximoDiaUtil } from './prazo'

export type NivelUrgencia = 'vencido' | 'hoje' | 'ate3' | 'ate7' | 'normal' | 'cumprido'

export const calendarioNacional = criarCalendario()

/**
 * Data usada como "hoje" para prazos e tarefas. Em fim de semana ou feriado,
 * a pauta mostra o próximo dia útil.
 */
export function dataReferencia(hoje: DataISO = hojeISO()): DataISO {
  return calendarioNacional.ehDiaUtil(hoje) ? hoje : proximoDiaUtil(hoje, calendarioNacional)
}

export interface Urgencia {
  nivel: NivelUrgencia
  rotulo: string
  diasUteis: number
}

const DIAS_SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']

export function urgencia(dataFatal: DataISO, cumprido = false, hoje: DataISO = hojeISO()): Urgencia {
  const ref = dataReferencia(hoje)
  if (cumprido) return { nivel: 'cumprido', rotulo: 'Cumprido', diasUteis: 0 }
  if (dataFatal < hoje) {
    const dias = diferencaDias(dataFatal, hoje)
    return { nivel: 'vencido', rotulo: dias === 1 ? 'Vencido ontem' : `Vencido há ${dias} dias`, diasUteis: -dias }
  }
  if (dataFatal === hoje) return { nivel: 'hoje', rotulo: 'Vence hoje', diasUteis: 0 }
  if (dataFatal === ref) {
    return { nivel: 'hoje', rotulo: `Vence no próximo dia útil (${DIAS_SEMANA[diaDaSemana(ref)]} ${dataCurta(ref)})`, diasUteis: 0 }
  }
  const n = diasUteisEntre(ref, dataFatal, calendarioNacional)
  const rotulo = n === 1 && diferencaDias(hoje, dataFatal) === 1 ? 'Vence amanhã' : n === 1 ? 'Em 1 dia útil' : `Em ${n} dias úteis`
  if (n <= 3) return { nivel: 'ate3', rotulo, diasUteis: n }
  if (n <= 7) return { nivel: 'ate7', rotulo, diasUteis: n }
  return { nivel: 'normal', rotulo, diasUteis: n }
}

export const ORDEM_URGENCIA: NivelUrgencia[] = ['vencido', 'hoje', 'ate3', 'ate7', 'normal', 'cumprido']

export const TITULO_GRUPO: Record<NivelUrgencia, string> = {
  vencido: 'Vencidos',
  hoje: 'Vencem hoje',
  ate3: 'Em até 3 dias úteis',
  ate7: 'Em até 7 dias úteis',
  normal: 'Mais adiante',
  cumprido: 'Cumpridos',
}
