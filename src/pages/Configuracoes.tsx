import { useState } from 'react'
import { Trash2, Plus, RotateCcw } from 'lucide-react'
import { useApp } from '@/store/store'
import { NOMES_PERFIL, type Perfil } from '@/data/tipos'
import { TRIBUNAIS } from '@/data/feriados'
import { feriadosNacionais } from '@/lib/prazo'
import { hojeISO } from '@/lib/datas'
import { data as fmtData, horas, reais } from '@/lib/formato'
import { CabecalhoPagina } from '@/components/Cabecalho'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Campo, Checkbox, Input, Select } from '@/components/ui/form'
import { ConfirmDialog } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { Pessoa } from '@/components/Avatar'

function rotuloFeriado(data: string) {
  return data.length === 5 ? `${data.slice(3)}/${data.slice(0, 2)} (todo ano)` : fmtData(data)
}

export function Configuracoes() {
  const { db, usuario, definirMeta, definirValorHora, adicionarFeriado, removerFeriado, alterarPerfilUsuario, restaurarDados } = useApp()
  const { toast } = useToast()
  const p = usuario.perfil
  const editaFeriados = p === 'controladoria' || p === 'socio'
  const editaMeta = p === 'controladoria' || p === 'socio'
  const editaValores = p === 'socio' || p === 'financeiro'
  const editaUsuarios = p === 'socio'

  const [tribunal, setTribunal] = useState(TRIBUNAIS[0])
  const [novaData, setNovaData] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [anual, setAnual] = useState(true)
  const [restaurando, setRestaurando] = useState(false)
  const ano = Number(hojeISO().slice(0, 4))
  const lista = [...(db.config.feriadosTribunal[tribunal] ?? [])].sort((a, b) => a.data.slice(-5).localeCompare(b.data.slice(-5)))

  const somenteLeitura = (quem: string) => <p className="mb-3 text-xs text-muted-foreground">Somente {quem} alteram esta seção.</p>

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Configurações" descricao="Calendário forense, metas, valores e perfis." />

      <Card>
        <CardHeader>
          <CardTitle>Feriados por tribunal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editaFeriados && somenteLeitura('controladoria e sócios')}
          <p className="text-sm text-muted-foreground">
            Além destes, o cálculo exclui sábados, domingos, feriados nacionais e o recesso de 20/12 a 20/01. Alterações valem para os próximos prazos lançados.
          </p>
          <Campo rotulo="Tribunal" id="cfg-trib" className="max-w-xs">
            <Select id="cfg-trib" value={tribunal} onChange={(e) => setTribunal(e.target.value)}>
              {TRIBUNAIS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Campo>
          <ul className="divide-y rounded-md border">
            {lista.map((f) => (
              <li key={f.data} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="w-36 shrink-0 tabular-nums">{rotuloFeriado(f.data)}</span>
                <span className="min-w-0 flex-1">{f.descricao}</span>
                {editaFeriados && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${f.descricao}`}
                    onClick={() => {
                      removerFeriado(tribunal, f.data)
                      toast(`“${f.descricao}” removido do ${tribunal}.`, { acao: { rotulo: 'Desfazer', aoClicar: () => adicionarFeriado(tribunal, f) } })
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
            {!lista.length && <li className="p-3 text-sm text-muted-foreground">Nenhum feriado local cadastrado.</li>}
          </ul>
          {editaFeriados && (
            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_auto_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                if (!novaData || !novaDesc.trim()) return toast('Informe a data e a descrição.', { tipo: 'erro' })
                adicionarFeriado(tribunal, { data: anual ? novaData.slice(5) : novaData, descricao: novaDesc.trim() })
                toast(`Feriado adicionado ao ${tribunal}.`)
                setNovaData('')
                setNovaDesc('')
              }}
            >
              <Campo rotulo="Data" id="nf-data">
                <Input id="nf-data" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
              </Campo>
              <Campo rotulo="Descrição" id="nf-desc">
                <Input id="nf-desc" value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} placeholder="Ex.: Suspensão de expediente (Portaria 12/2026)" />
              </Campo>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox checked={anual} onChange={(e) => setAnual(e.target.checked)} /> Repete todo ano
              </label>
              <Button type="submit">
                <Plus /> Adicionar
              </Button>
            </form>
          )}
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Feriados nacionais de {ano}</summary>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              {feriadosNacionais(ano).map((f) => (
                <li key={f.data}>
                  {fmtData(f.data)} · {f.descricao}
                </li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta diária de horas</CardTitle>
          </CardHeader>
          <CardContent>
            {!editaMeta && somenteLeitura('controladoria e sócios')}
            <Campo rotulo="Meta por pessoa" id="cfg-meta" className="max-w-xs">
              <Select id="cfg-meta" value={db.config.metaDiariaMin} disabled={!editaMeta} onChange={(e) => definirMeta(Number(e.target.value))}>
                {[300, 360, 420, 480, 540].map((m) => (
                  <option key={m} value={m}>
                    {horas(m)}
                  </option>
                ))}
              </Select>
            </Campo>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valores por hora por perfil</CardTitle>
          </CardHeader>
          <CardContent>
            {!editaValores && somenteLeitura('sócios e o financeiro')}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(['socio', 'advogado', 'estagiario'] as Perfil[]).map((perfil) => (
                <Campo key={perfil} rotulo={NOMES_PERFIL[perfil]} id={`vh-${perfil}`} ajuda={reais(db.config.valoresHora[perfil])}>
                  <Input
                    id={`vh-${perfil}`}
                    type="number"
                    min={0}
                    step={10}
                    inputMode="decimal"
                    disabled={!editaValores}
                    defaultValue={db.config.valoresHora[perfil]}
                    onBlur={(e) => {
                      const v = Number(e.target.value)
                      if (v >= 0 && v !== db.config.valoresHora[perfil]) {
                        definirValorHora(perfil, v)
                        toast(`Valor por hora de ${NOMES_PERFIL[perfil]} atualizado para ${reais(v)}.`)
                      }
                    }}
                  />
                </Campo>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Descontos por cliente ficam no contrato de honorários.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários e perfis</CardTitle>
        </CardHeader>
        <CardContent>
          {!editaUsuarios && somenteLeitura('sócios')}
          <ul className="divide-y">
            {db.usuarios.map((u) => (
              <li key={u.id} className="grid gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem] sm:items-center">
                <Pessoa nome={u.nome} id={u.id} className="text-sm font-medium" />
                <span className="text-xs text-muted-foreground">
                  {u.cargo} · {u.equipe} · {u.email}
                </span>
                <Select aria-label={`Perfil de ${u.nome}`} value={u.perfil} disabled={!editaUsuarios || u.id === usuario.id} onChange={(e) => alterarPerfilUsuario(u.id, e.target.value as Perfil)}>
                  {(Object.keys(NOMES_PERFIL) as Perfil[]).map((x) => (
                    <option key={x} value={x}>
                      {NOMES_PERFIL[x]}
                    </option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados de demonstração</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">Os dados ficam salvos neste navegador e são recriados a cada dia, com datas relativas a hoje. Restaure para desfazer tudo o que foi feito no protótipo.</p>
          <Button variant="outline" onClick={() => setRestaurando(true)}>
            <RotateCcw /> Restaurar dados
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        aberto={restaurando}
        perigo
        titulo="Restaurar dados de demonstração?"
        descricao="Todas as alterações feitas no protótipo serão descartadas."
        confirmar="Restaurar"
        aoCancelar={() => setRestaurando(false)}
        aoConfirmar={() => {
          restaurarDados()
          setRestaurando(false)
          toast('Dados de demonstração restaurados.')
        }}
      />
    </div>
  )
}
