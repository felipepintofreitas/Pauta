import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { gerarDados, VERSAO_DADOS } from '@/data/seed'
import type {
  BancoDados,
  Cronometro,
  Intimacao,
  Lancamento,
  Perfil,
  PreFatura,
  Prazo,
  StatusPreFatura,
  Tarefa,
  Usuario,
} from '@/data/tipos'
import { gravar, ler, remover } from '@/lib/armazenamento'
import { hojeISO, type DataISO } from '@/lib/datas'
import { data as fmtData } from '@/lib/formato'
import { calendarioDoTribunal, valorLancamento } from '@/lib/negocio'
import { calcularPrazo, somarDiasUteis, type Contagem, type Feriado } from '@/lib/prazo'
import { pode } from '@/lib/permissoes'

const CHAVE_DB = 'pauta:dados'
const CHAVE_USUARIO = 'pauta:usuario'
const CHAVE_CRONOMETRO = 'pauta:cronometro'

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; erro: string }
const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })
const falha = (erro: string): Resultado<never> => ({ ok: false, erro })

function carregarDados(): { db: BancoDados; renovado: boolean } {
  const salvo = ler<BancoDados>(CHAVE_DB)
  const hoje = hojeISO()
  if (salvo && salvo.versao === VERSAO_DADOS && salvo.geradoEm === hoje) return { db: salvo, renovado: false }
  return { db: gerarDados(hoje), renovado: !!salvo }
}

let sequencia = 0
function novoId(prefixo: string) {
  sequencia += 1
  return `${prefixo}${Date.now().toString(36)}${sequencia}`
}

function agora() {
  return new Date().toISOString()
}

export interface DadosPrazo {
  tipo: string
  dias: number
  contagem: Contagem
  /** Data fatal informada manualmente (exige justificativa). */
  dataFatalAjustada?: DataISO
  justificativa?: string
}

export interface NovoLancamento {
  processoId: string
  minutos: number
  data?: DataISO
  tarefaId?: string
  descricao?: string
  faturavel?: boolean
}

interface Contexto {
  db: BancoDados
  usuario: Usuario
  dadosRenovados: boolean
  trocarUsuario(id: string): void
  cronometro: Cronometro
  iniciarCronometro(alvo?: { processoId?: string; tarefaId?: string }): void
  pausarCronometro(): void
  retomarCronometro(): void
  definirAlvoCronometro(alvo: { processoId?: string; tarefaId?: string }): void
  /** Para o cronômetro e devolve os minutos contados (arredondados para cima em blocos de 5). */
  pararCronometro(): { minutos: number; processoId?: string; tarefaId?: string }

  classificarIntimacoes(ids: string[], tipoAto: string, responsavelId: string): Resultado
  lancarPrazo(intimacaoId: string, dados: DadosPrazo): Resultado<Prazo>
  gerarTarefaDaIntimacao(intimacaoId: string, dados: { titulo: string; responsavelId: string; dataLimite: DataISO; estimativaMin: number }): Resultado<Tarefa>
  conferirPrazo(prazoId: string): Resultado
  cumprirPrazo(prazoId: string, dataProtocolo: DataISO): Resultado

  criarTarefa(dados: Omit<Tarefa, 'id' | 'criadoPorId'>): Tarefa
  atualizarTarefa(id: string, patch: Partial<Tarefa>): void

  lancarHoras(dados: NovoLancamento): Lancamento
  atualizarLancamento(id: string, patch: Partial<Lancamento>): void
  excluirLancamento(id: string): void
  restaurarLancamento(l: Lancamento): void
  enviarParaAprovacao(ids: string[]): number
  aprovarLancamentos(ids: string[]): number
  devolverLancamentos(ids: string[], comentario: string): number

  gerarPreFatura(clienteId: string, inicio: DataISO, fim: DataISO): Resultado<PreFatura>
  alterarStatusPreFatura(id: string, status: StatusPreFatura): void

  definirMeta(minutos: number): void
  definirValorHora(perfil: Perfil, valor: number): void
  adicionarFeriado(tribunal: string, feriado: Feriado): void
  removerFeriado(tribunal: string, data: string): void
  alterarPerfilUsuario(id: string, perfil: Perfil): void
  restaurarDados(): void
}

const Ctx = createContext<Contexto | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const inicial = useMemo(carregarDados, [])
  const [db, setDb] = useState<BancoDados>(inicial.db)
  const [usuarioId, setUsuarioId] = useState<string>(() => ler<string>(CHAVE_USUARIO) ?? 'u1')
  const [cronometro, setCronometro] = useState<Cronometro>(() => ler<Cronometro>(CHAVE_CRONOMETRO) ?? { iniciadoEm: null, acumuladoMs: 0 })
  const dbRef = useRef(db)
  dbRef.current = db

  useEffect(() => {
    const t = window.setTimeout(() => gravar(CHAVE_DB, db), 250)
    return () => window.clearTimeout(t)
  }, [db])
  useEffect(() => gravar(CHAVE_USUARIO, usuarioId), [usuarioId])
  useEffect(() => gravar(CHAVE_CRONOMETRO, cronometro), [cronometro])

  const usuario = db.usuarios.find((u) => u.id === usuarioId) ?? db.usuarios[0]
  const usuarioRef = useRef(usuario)
  usuarioRef.current = usuario

  /** Aplica uma alteração sobre uma cópia do banco. */
  const mudar = useCallback((fn: (rascunho: BancoDados) => void) => {
    const copia = structuredClone(dbRef.current)
    fn(copia)
    dbRef.current = copia
    setDb(copia)
  }, [])

  const registrar = (i: Intimacao, acao: string) => i.historico.push({ em: agora(), usuarioId: usuarioRef.current.id, acao })

  const contexto: Contexto = {
    db,
    usuario,
    dadosRenovados: inicial.renovado,
    trocarUsuario: setUsuarioId,
    cronometro,
    iniciarCronometro(alvo) {
      setCronometro({ iniciadoEm: Date.now(), acumuladoMs: 0, processoId: alvo?.processoId, tarefaId: alvo?.tarefaId })
    },
    pausarCronometro() {
      setCronometro((c) => (c.iniciadoEm ? { ...c, iniciadoEm: null, acumuladoMs: c.acumuladoMs + Date.now() - c.iniciadoEm } : c))
    },
    retomarCronometro() {
      setCronometro((c) => (c.iniciadoEm ? c : { ...c, iniciadoEm: Date.now() }))
    },
    definirAlvoCronometro(alvo) {
      setCronometro((c) => ({ ...c, ...alvo }))
    },
    pararCronometro() {
      const c = cronometro
      const ms = c.acumuladoMs + (c.iniciadoEm ? Date.now() - c.iniciadoEm : 0)
      setCronometro({ iniciadoEm: null, acumuladoMs: 0 })
      return { minutos: Math.max(5, Math.ceil(ms / 60000 / 5) * 5), processoId: c.processoId, tarefaId: c.tarefaId }
    },

    classificarIntimacoes(ids, tipoAto, responsavelId) {
      if (!pode(usuario.perfil, 'classificarIntimacao')) return falha('Seu perfil não pode classificar intimações.')
      const responsavel = db.usuarios.find((u) => u.id === responsavelId)
      mudar((r) => {
        for (const i of r.intimacoes.filter((x) => ids.includes(x.id))) {
          const reclassificando = i.status !== 'Nova'
          i.tipoAto = tipoAto
          i.responsavelId = responsavelId
          i.classificadoPorId = usuarioRef.current.id
          if (i.status === 'Nova') i.status = 'Classificada'
          registrar(i, `${reclassificando ? 'Reclassificou' : 'Classificou'} como "${tipoAto}" e atribuiu a ${responsavel?.nome ?? 'responsável'}`)
        }
      })
      return ok(undefined)
    },

    lancarPrazo(intimacaoId, dados) {
      if (!pode(usuario.perfil, 'lancarPrazo')) return falha('Seu perfil não pode lançar prazos.')
      const intim = db.intimacoes.find((i) => i.id === intimacaoId)
      if (!intim) return falha('Intimação não encontrada.')
      if (intim.status === 'Nova') return falha('Classifique a intimação antes de lançar o prazo.')
      if (intim.prazoId) return falha('Esta intimação já tem prazo lançado.')
      if (dados.dataFatalAjustada && !dados.justificativa?.trim()) return falha('Informe a justificativa do ajuste manual.')
      const processo = db.processos.find((p) => p.id === intim.processoId)!
      const cal = calendarioDoTribunal(db, processo.tribunal)
      const calc = calcularPrazo({ disponibilizacao: intim.disponibilizacao, dias: dados.dias, contagem: dados.contagem, calendario: cal })
      const ajustado = dados.dataFatalAjustada && dados.dataFatalAjustada !== calc.dataFatal
      const prazo: Prazo = {
        id: novoId('pz'),
        processoId: processo.id,
        intimacaoId,
        tipo: dados.tipo,
        dataInicial: calc.disponibilizacao,
        publicacao: calc.publicacao,
        inicio: calc.inicio,
        dias: dados.dias,
        contagem: dados.contagem,
        dataFatal: ajustado ? dados.dataFatalAjustada! : calc.dataFatal,
        dataSeguranca: ajustado ? somarDiasUteis(dados.dataFatalAjustada!, -2, cal) : calc.dataSeguranca,
        regra: calc.regra,
        memoria: calc.memoria,
        ajusteManual: ajustado ? { dataCalculada: calc.dataFatal, justificativa: dados.justificativa!.trim(), porId: usuario.id, em: agora() } : undefined,
        conferencia: 'Pendente',
        lancadoPorId: usuario.id,
        lancadoEm: agora(),
        responsavelId: intim.responsavelId ?? processo.responsavelId,
        cumprido: false,
      }
      mudar((r) => {
        r.prazos.push(prazo)
        const i = r.intimacoes.find((x) => x.id === intimacaoId)!
        i.prazoId = prazo.id
        i.status = 'Prazo lançado'
        registrar(i, `Lançou prazo de ${prazo.tipo.toLowerCase()} (${prazo.dias} ${prazo.contagem === 'uteis' ? 'dias úteis' : 'dias corridos'}) com data fatal em ${fmtData(prazo.dataFatal)}`)
        if (prazo.ajusteManual) registrar(i, `Ajustou manualmente a data fatal de ${fmtData(calc.dataFatal)} para ${fmtData(prazo.dataFatal)}: "${prazo.ajusteManual.justificativa}"`)
      })
      return ok(prazo)
    },

    gerarTarefaDaIntimacao(intimacaoId, dados) {
      const intim = db.intimacoes.find((i) => i.id === intimacaoId)
      if (!intim?.prazoId) return falha('Lance o prazo antes de gerar a tarefa.')
      if (intim.tarefaId) return falha('A tarefa desta intimação já foi gerada.')
      const tarefa: Tarefa = {
        id: novoId('t'),
        titulo: dados.titulo,
        processoId: intim.processoId,
        prazoId: intim.prazoId,
        responsavelId: dados.responsavelId,
        criadoPorId: usuario.id,
        dataLimite: dados.dataLimite,
        prioridade: 'Alta',
        status: 'A fazer',
        estimativaMin: dados.estimativaMin,
      }
      const nome = db.usuarios.find((u) => u.id === dados.responsavelId)?.nome
      mudar((r) => {
        r.tarefas.push(tarefa)
        const i = r.intimacoes.find((x) => x.id === intimacaoId)!
        i.tarefaId = tarefa.id
        registrar(i, `Gerou a tarefa "${tarefa.titulo}" para ${nome}`)
      })
      return ok(tarefa)
    },

    conferirPrazo(prazoId) {
      const prazo = db.prazos.find((p) => p.id === prazoId)
      if (!prazo) return falha('Prazo não encontrado.')
      if (!pode(usuario.perfil, 'conferirPrazo')) return falha('Somente a controladoria confere prazos.')
      if (prazo.lancadoPorId === usuario.id) return falha('Quem lançou o prazo não pode conferi-lo. Peça a outra pessoa da controladoria.')
      if (prazo.conferencia === 'Conferido') return falha('Este prazo já foi conferido.')
      const intim = prazo.intimacaoId ? db.intimacoes.find((i) => i.id === prazo.intimacaoId) : undefined
      if (intim && !intim.tarefaId) return falha('Gere a tarefa vinculada antes da conferência.')
      mudar((r) => {
        const p = r.prazos.find((x) => x.id === prazoId)!
        p.conferencia = 'Conferido'
        p.conferidoPorId = usuarioRef.current.id
        p.conferidoEm = agora()
        const i = p.intimacaoId ? r.intimacoes.find((x) => x.id === p.intimacaoId) : undefined
        if (i) {
          i.status = 'Conferida'
          i.conferidoPorId = usuarioRef.current.id
          registrar(i, `Conferiu o prazo (data fatal ${fmtData(p.dataFatal)})`)
        }
      })
      return ok(undefined)
    },

    cumprirPrazo(prazoId, dataProtocolo) {
      if (!dataProtocolo) return falha('Informe a data do protocolo.')
      if (dataProtocolo > hojeISO()) return falha('A data do protocolo não pode ser futura.')
      mudar((r) => {
        const p = r.prazos.find((x) => x.id === prazoId)!
        p.cumprido = true
        p.dataProtocolo = dataProtocolo
        const i = p.intimacaoId ? r.intimacoes.find((x) => x.id === p.intimacaoId) : undefined
        if (i) registrar(i, `Marcou o prazo como cumprido (protocolo em ${fmtData(dataProtocolo)})`)
      })
      return ok(undefined)
    },

    criarTarefa(dados) {
      const tarefa: Tarefa = { ...dados, id: novoId('t'), criadoPorId: usuario.id }
      mudar((r) => void r.tarefas.push(tarefa))
      return tarefa
    },
    atualizarTarefa(id, patch) {
      mudar((r) => {
        const t = r.tarefas.find((x) => x.id === id)
        if (!t) return
        Object.assign(t, patch)
        if (patch.status === 'Concluída' && !t.concluidaEm) t.concluidaEm = hojeISO()
        if (patch.status && patch.status !== 'Concluída') t.concluidaEm = undefined
      })
    },

    lancarHoras(dados) {
      const processo = db.processos.find((p) => p.id === dados.processoId)!
      const tarefa = dados.tarefaId ? db.tarefas.find((t) => t.id === dados.tarefaId) : undefined
      const l: Lancamento = {
        id: novoId('l'),
        usuarioId: usuario.id,
        data: dados.data ?? hojeISO(),
        minutos: dados.minutos,
        processoId: processo.id,
        tarefaId: dados.tarefaId,
        clienteId: processo.clienteId,
        descricao: dados.descricao?.trim() || tarefa?.titulo || 'Atividade no processo',
        faturavel: dados.faturavel ?? true,
        status: 'Rascunho',
        criadoEm: agora(),
      }
      mudar((r) => void r.lancamentos.push(l))
      return l
    },
    atualizarLancamento(id, patch) {
      mudar((r) => {
        const l = r.lancamentos.find((x) => x.id === id)
        if (l) Object.assign(l, patch)
      })
    },
    excluirLancamento(id) {
      mudar((r) => void (r.lancamentos = r.lancamentos.filter((l) => l.id !== id)))
    },
    restaurarLancamento(l) {
      mudar((r) => void r.lancamentos.push(l))
    },
    enviarParaAprovacao(ids) {
      let n = 0
      mudar((r) => {
        for (const l of r.lancamentos) {
          if (ids.includes(l.id) && l.status === 'Rascunho') {
            l.status = 'Enviado'
            n++
          }
        }
      })
      return n
    },
    aprovarLancamentos(ids) {
      let n = 0
      mudar((r) => {
        for (const l of r.lancamentos) {
          if (ids.includes(l.id) && l.status === 'Enviado') {
            l.status = 'Aprovado'
            l.aprovadoEm = hojeISO()
            l.comentario = undefined
            n++
          }
        }
      })
      return n
    },
    devolverLancamentos(ids, comentario) {
      let n = 0
      mudar((r) => {
        for (const l of r.lancamentos) {
          if (ids.includes(l.id) && l.status === 'Enviado') {
            l.status = 'Rascunho'
            l.comentario = comentario
            n++
          }
        }
      })
      return n
    },

    gerarPreFatura(clienteId, inicio, fim) {
      if (!pode(usuario.perfil, 'gerarPreFatura')) return falha('Seu perfil não pode gerar pré-faturas.')
      const cliente = db.clientes.find((c) => c.id === clienteId)!
      const elegiveis = db.lancamentos.filter(
        (l) => l.clienteId === clienteId && l.data >= inicio && l.data <= fim && l.status === 'Aprovado' && l.faturavel && !l.preFaturaId,
      )
      const valorFixo = cliente.contrato.modalidade === 'mensal' ? cliente.contrato.valorMensal ?? 0 : 0
      if (!elegiveis.length && !valorFixo) return falha('Não há horas aprovadas e faturáveis neste período.')
      const valorHoras = elegiveis.reduce((s, l) => s + valorLancamento(db, l), 0)
      const pf: PreFatura = {
        id: novoId('pf'),
        numero: `PF-${hojeISO().slice(0, 4)}-${String(100 + db.preFaturas.length).padStart(4, '0')}`,
        clienteId,
        inicio,
        fim,
        lancamentoIds: elegiveis.map((l) => l.id),
        valorHoras: Math.round(valorHoras * 100) / 100,
        valorFixo,
        total: Math.round((valorHoras + valorFixo) * 100) / 100,
        status: 'A faturar',
        criadaEm: hojeISO(),
      }
      mudar((r) => {
        r.preFaturas.push(pf)
        for (const l of r.lancamentos) if (pf.lancamentoIds.includes(l.id)) l.preFaturaId = pf.id
      })
      return ok(pf)
    },
    alterarStatusPreFatura(id, status) {
      mudar((r) => {
        const pf = r.preFaturas.find((x) => x.id === id)
        if (!pf) return
        pf.status = status
        if (status === 'Faturada') {
          pf.faturadaEm = hojeISO()
          for (const l of r.lancamentos) if (pf.lancamentoIds.includes(l.id)) l.status = 'Faturado'
        }
        if (status === 'Recebida') pf.recebidaEm = hojeISO()
      })
    },

    definirMeta(minutos) {
      mudar((r) => void (r.config.metaDiariaMin = minutos))
    },
    definirValorHora(perfil, valor) {
      mudar((r) => void (r.config.valoresHora[perfil] = valor))
    },
    adicionarFeriado(tribunal, feriado) {
      mudar((r) => {
        const lista = (r.config.feriadosTribunal[tribunal] ??= [])
        if (!lista.some((f) => f.data === feriado.data)) lista.push(feriado)
      })
    },
    removerFeriado(tribunal, dataFeriado) {
      mudar((r) => void (r.config.feriadosTribunal[tribunal] = (r.config.feriadosTribunal[tribunal] ?? []).filter((f) => f.data !== dataFeriado)))
    },
    alterarPerfilUsuario(id, perfil) {
      mudar((r) => {
        const u = r.usuarios.find((x) => x.id === id)
        if (u) u.perfil = perfil
      })
    },
    restaurarDados() {
      remover(CHAVE_DB)
      const novo = gerarDados(hojeISO())
      dbRef.current = novo
      setDb(novo)
      setCronometro({ iniciadoEm: null, acumuladoMs: 0 })
    },
  }

  return <Ctx.Provider value={contexto}>{children}</Ctx.Provider>
}

export function useApp(): Contexto {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp fora do AppProvider')
  return c
}
