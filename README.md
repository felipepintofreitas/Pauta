# Pauta (protótipo)

Protótipo navegável da rotina diária de advogados: prazos, intimações, tarefas, horas e honorários. Sem back-end: os dados simulados são gerados a cada dia, relativos à data de hoje, e ficam no `localStorage` do navegador.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes do cálculo de prazo e dos dados simulados
npm run build    # gera dist/ (abre de qualquer pasta: base relativa e HashRouter)
```

Requer Node 20 ou superior.

## Publicação

Cada push no `main` publica o app no GitHub Pages pelo workflow `.github/workflows/deploy.yml`: https://felipepintofreitas.github.io/Pauta/

## Organização

```
src/
  pages/        uma tela por arquivo (Meu dia, Intimações, Prazos, Tarefas, Timesheet, Processos, Honorários, Relatório, Configurações)
  components/   layout (menu lateral, barra inferior), diálogos, cronômetro, busca global e componentes no estilo shadcn/ui em components/ui
  data/         tipos, feriados por tribunal e gerador de dados simulados (seed.ts)
  lib/          prazo.ts (cálculo de prazo, isolado e testado), urgência, formatação pt-BR, permissões por perfil
  store/        estado da aplicação (React Context) com persistência protegida por try/catch
```

## Cálculo de prazo (`src/lib/prazo.ts`)

Módulo puro, sem React. Publicação no 1º dia útil após a disponibilização, início no dia útil seguinte, contagem em dias úteis (CPC, art. 219) excluindo fins de semana, feriados nacionais (incluindo Sexta-feira da Paixão, calculada pela Páscoa) e feriados do tribunal, suspensão no recesso de 20/12 a 20/01 (CPC, art. 220) e data de segurança 2 dias úteis antes. Dias corridos prorrogam para o próximo dia útil. O teste reproduz o exemplo da especificação (disponibilizado em 14/10/2025, fatal em 06/11/2025 no TJPE).

Simplificações: o Domicílio Judicial Eletrônico usa a mesma regra do DJEN (sem a ciência tácita de 10 dias), e Carnaval e Corpus Christi entram como feriados do tribunal (editáveis em Configurações).

## Para testar os critérios de aceite

- **3 toques:** perfil Ana (advogada), em Meu dia toque em “Lançar horas”, escolha um processo recente e toque em “30min”.
- **4 etapas:** perfil Elisa (controladoria), abra uma intimação nova, classifique, lance o prazo e gere a tarefa. A conferência fica bloqueada para ela; troque para Fábio no seletor de perfil e confira. O histórico mostra os dois.
- Em fim de semana ou feriado, a pauta mostra o próximo dia útil e avisa no topo de Meu dia.
- “Restaurar dados” em Configurações desfaz tudo.
