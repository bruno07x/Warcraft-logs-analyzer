# Automatic Reference Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encontrar e comparar automaticamente duas referências públicas compatíveis a partir de uma única URL do jogador, mostrando o percentil real de cada referência.

**Architecture:** A integração server-side primeiro carrega o log do jogador e seus metadados, incluindo item level. Um módulo isolado consulta e valida rankings por encounter, filtra candidatos e confirma cada log selecionado antes de a orquestração existente comparar casts. A interface passa a receber uma única URL e renderiza os percentis retornados pelo domínio.

**Tech Stack:** Next.js App Router, React, TypeScript estrito, Warcraft Logs GraphQL v2, ESLint e pnpm.

**Spec:** `docs/superpowers/specs/2026-09-27-automatic-reference-selection-design.md`

## Global Constraints

- Não criar testes unitários, de integração ou instalar framework de testes.
- Cada função criada ou alterada recebe JSDoc útil em português.
- Toda chamada à API Warcraft Logs permanece exclusiva do servidor e usa somente relatórios públicos (`allowUnlisted: false`).
- Critérios obrigatórios: mesmo encounter, dificuldade, especialização, faixa de item level, kill e duração em ±30.000 ms.
- Começar no percentil ≥97 e reduzir o limiar de um em um somente até achar duas referências; não relaxar os critérios obrigatórios.
- Não devolver análise parcial; o percentual exibido é o percentil real retornado pelo ranking, com uma casa decimal em pt-BR.
- Não registrar credenciais, tokens, respostas GraphQL completas ou URLs de candidatos descartados.

## Review Focus

1. Jogador sem especialização, dificuldade, kill ou item level confiável: falhar antes da busca de rankings, sem adivinhar filtro.
2. Ranking com candidato de duração a 30.001 ms, spec/dificuldade diferentes, sem kill ou duplicado: descartá-lo mesmo que tenha percentil maior.
3. Resposta `JSON` de rankings com campo inexistente, tipo errado ou IDs inseguros: tratá-la como resposta externa inválida, sem coercion.
4. Primeiro grupo de referências abaixo de 97: reduzir o limiar até selecionar duas e mostrar os percentis reais, não os limites de busca.
5. Não haver duas referências públicas que sobrevivam à validação do relatório: mostrar erro conhecido, sem tabela parcial e sem reduzir ±30 s/item level.

Os cinco itens acima serão cobertos por verificações manuais documentadas nas tarefas 1–4, pois o usuário decidiu explicitamente não manter testes automatizados.

## Mapa de arquivos

| Arquivos | Responsabilidade |
|---|---|
| `src/types/analysis.ts` | Tipos de item level, referência ranqueada, entrada de um log e percentis da análise. |
| `src/lib/validation/analysis-input.ts` | Aceita e serializa somente a URL `player`. |
| `src/lib/warcraft-logs/queries.ts` | Query de metadados com detalhe de combatente e query de rankings. |
| `src/lib/warcraft-logs/schemas.ts` | Decodifica item level e ranking JSON em tipos internos validados. |
| `src/lib/warcraft-logs/report.ts` | Expõe metadados completos de um relatório público. |
| `src/lib/warcraft-logs/rankings.ts` | Busca páginas de ranking e retorna candidatos normalizados. |
| `src/lib/analysis/reference-selection.ts` | Aplica compatibilidade, deduplicação, fallback de percentil e validação final. |
| `src/lib/analysis/analyze-logs.ts` | Coordena um log do jogador, descoberta das referências e comparação. |
| `src/components/log-form.tsx`, `src/app/page.tsx` | Formulário de URL única e cópia de orientação. |
| `src/components/log-summary.tsx`, `src/components/analysis-results.tsx` | Exibe item level e percentil das referências. |
| `src/app/analysis/page.tsx` | Lê a entrada única e apresenta falhas de descoberta. |
| `README.md`, `docs/manual-verification.md`, `docs/progress.md` | Documentação de API, comportamento, roteiro e evidências de verificação. |

### Task 1: Enriquecer o log do jogador e migrar a entrada para URL única

**Files:**

- Modify: `src/types/analysis.ts`
- Modify: `src/lib/warcraft-logs/queries.ts`
- Modify: `src/lib/warcraft-logs/schemas.ts`
- Modify: `src/lib/warcraft-logs/report.ts`
- Modify: `src/lib/validation/analysis-input.ts`
- Modify: `src/components/log-form.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/analysis/page.tsx`
- Modify: `docs/manual-verification.md`

**Interfaces:**

- Consumes: `fetchLog(reference: LogReference): Promise<Result<FetchedLog>>` e `parseLogUrl(input: string): Result<LogReference>` existentes.
- Produces: `LogMetadata` com `itemLevel: number`; `AnalysisInput = { player: LogReference }`; `validateAnalysisInput(params): Result<AnalysisInput>`; `readLogInputs`/`serializeLogInputs` preservando apenas `player`.

- [ ] **Step 1: Confirmar manualmente a forma do item level na resposta oficial.**

Com credenciais reais, executar uma consulta GraphQL descartável que use `playerDetails(..., includeCombatantInfo: true)` para uma luta pública. Registrar apenas nomes de campos e tipos — nunca resposta completa, token ou URL privada — e decidir uma única regra para calcular/ler `itemLevel` finito positivo. Atualizar a query de metadados para trazer só os campos necessários.

- [ ] **Step 2: Acrescentar `itemLevel` aos contratos e ao decodificador.**

Em `src/types/analysis.ts`, acrescentar `itemLevel: number` a `LogMetadata`. Em `decodeReportMetadata(value, reference)`, validar item level do ator participante com o formato confirmado no passo 1. Dados ausentes, não finitos ou não positivos devem lançar `WarcraftLogsError("invalid_response", ...)`; não calcular a partir de um ator fora da luta.

- [ ] **Step 3: Migrar os parâmetros e o formulário para uma única entrada.**

Substituir os contratos de três slots por `AnalysisInput`, mantendo o nome de query `player`. O formulário deve ter somente label “Seu log”, explicação de que duas referências compatíveis serão encontradas automaticamente e a mesma validação client-side/server-side. A página `/analysis` deve preservar somente esse valor no retorno ao formulário.

- [ ] **Step 4: Atualizar roteiro e verificar a entrada.**

Verificar manualmente URL válida, ausente, repetida e inválida; confirmar que `referenceOne` e `referenceTwo` na URL são ignorados, que não há chamadas à API antes da navegação e que o retorno preserva apenas `player`. Com um log público, confirmar que item level válido chega ao resultado de `fetchLog`; registrar o que foi efetivamente validado.

- [ ] **Step 5: Verificar qualidade e registrar o incremento.**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: saída de sucesso dos três comandos. Atualizar `docs/progress.md` e criar commit `feat: accept one log and load item level` incluindo somente os arquivos desta tarefa.

### Task 2: Criar a fronteira segura para rankings do Warcraft Logs

**Files:**

- Modify: `src/types/analysis.ts`
- Modify: `src/lib/warcraft-logs/queries.ts`
- Modify: `src/lib/warcraft-logs/schemas.ts`
- Create: `src/lib/warcraft-logs/rankings.ts`
- Modify: `src/lib/warcraft-logs/index.ts`
- Modify: `README.md`
- Modify: `docs/manual-verification.md`

**Interfaces:**

- Consumes: `queryWarcraftLogs<T>(query, variables, decode)` e `LogMetadata` da tarefa 1.
- Produces: `RankedReference = { reference: LogReference; percentile: number; durationMs: number; itemLevel: number; encounterID: number; difficulty: string; specialization: string; kill: true }`; `fetchRankingPage(criteria: RankingCriteria, page: number): Promise<Result<RankedReference[]>>`.
- `RankingCriteria = { encounterID: number; difficulty: string; specialization: string; itemLevel: number }` permanece interno ao módulo de rankings.

- [ ] **Step 1: Confirmar a forma e os limites da resposta de `characterRankings`.**

Usar a documentação oficial e uma consulta descartável autenticada para confirmar os campos de ranking que identificam relatório, luta, ator, percentil, duração, item level/bracket, dificuldade e spec. Confirmar também como derivar o `bracket` correto a partir do item level do jogador. Registrar no README a query, argumentos, campos efetivamente usados e o fato de que rankings são JSON não congelado.

- [ ] **Step 2: Definir query e decodificador explícito de JSON externo.**

Adicionar a query pelo `worldData.encounter(id).characterRankings`, passando `bracket`, dificuldade, `specName`, `page` e tamanho suportado. Em `schemas.ts`, implementar `decodeRankingPage(value: unknown): RankedReference[]`, reutilizando validadores de objeto/número/string, rejeitando envelope/página estruturalmente inválidos e descartando linhas isoladas que não tenham todos os campos necessários. Nunca usar `as` para converter JSON externo em candidato.

- [ ] **Step 3: Implementar `fetchRankingPage`.**

Em `rankings.ts`, traduzir `RankingCriteria` para os argumentos GraphQL confirmados no passo 1, chamar `queryWarcraftLogs` e converter erros para o mesmo `Result` seguro usado por `fetchLog`. Não buscar casts ou relatórios aqui; a responsabilidade é somente uma página de candidatos ordenáveis.

- [ ] **Step 4: Fazer verificação manual de fronteira.**

Com uma resposta real salva somente em memória/temporário descartável, confirmar pelo menos uma página válida e validar: percentil decimal, IDs seguros e candidato com relatório público. Simular localmente envelope inválido, linha sem ID e `percentile` não numérico no decodificador temporário; confirmar que a resposta não vira uma referência. Documentar somente o resultado, sem anexar payloads.

- [ ] **Step 5: Verificar qualidade e registrar o incremento.**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: saída de sucesso dos três comandos. Atualizar documentação/progresso e criar commit `feat: fetch validated ranking candidates`.

### Task 3: Selecionar duas referências com fallback de percentil

**Files:**

- Create: `src/lib/analysis/reference-selection.ts`
- Modify: `src/lib/warcraft-logs/errors.ts`
- Modify: `src/types/analysis.ts`
- Modify: `docs/manual-verification.md`
- Modify: `docs/progress.md`

**Interfaces:**

- Consumes: `FetchedLog`, `RankedReference`, `fetchRankingPage(criteria, page)` e `fetchLog(reference)`.
- Produces: `SelectedReference = { log: FetchedLog; percentile: number }`; `findReferences(player: FetchedLog): Promise<Result<{ referenceOne: SelectedReference; referenceTwo: SelectedReference }>>`.
- Produces: código público `no_matching_references` em `WarcraftLogsErrorCode`/`AnalysisError`.

- [ ] **Step 1: Implementar requisitos e predicado de compatibilidade.**

`findReferences` deve falhar imediatamente com `no_matching_references` se o log do jogador não tiver encounter positivo, dificuldade, especialização, kill e item level válidos. Criar uma função interna que aceite um `RankedReference` somente se encounter, dificuldade, specialization, item level bracket, kill e `Math.abs(candidate.durationMs - player.metadata.durationMs) <= 30_000` corresponderem.

- [ ] **Step 2: Implementar busca determinística e deduplicação.**

Iterar percentis mínimos de 97 até 0; para cada limiar, percorrer páginas ainda necessárias e considerar apenas candidatos ainda não avaliados que atendam ao limiar. Ordenar por percentil decrescente, depois `reportCode`, `fightID` e `sourceID`; guardar uma chave composta para impedir repetição e excluir o log do jogador. Parar instantaneamente ao selecionar dois candidatos. Não repetir uma página ou reavaliar candidato quando o limiar cair.

- [ ] **Step 3: Confirmar o log antes de selecioná-lo.**

Para cada candidato que passa no predicado, chamar `fetchLog`. Depois da resposta, conferir novamente encounter, dificuldade, especialização, itemLevel, kill e duração contra os metadados efetivamente retornados. Descartar candidato que falhar ou divergir; preservar `{ log, percentile }` apenas para seleção confirmada. Se esgotar rankings sem dois, retornar `no_matching_references`, sem logs parciais.

- [ ] **Step 4: Verificar manualmente as regras de seleção.**

Usar uma lista local descartável de candidatos para confirmar: seleção imediata de dois ≥97; fallback 97→96→… até encontrar dois; exclusão de 30.001 ms, spec/dificuldade/item level/kill incompatíveis e duplicados; percentil real preservado; ausência de duas referências resulta no erro conhecido. Com API real, validar ao menos um cenário disponível e registrar qualquer bloqueio por credenciais/rate limit.

- [ ] **Step 5: Verificar qualidade e registrar o incremento.**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: saída de sucesso dos três comandos. Atualizar `docs/progress.md` e criar commit `feat: select compatible ranked references`.

### Task 4: Orquestrar a análise automática e apresentar percentis

**Files:**

- Modify: `src/lib/analysis/analyze-logs.ts`
- Modify: `src/types/analysis.ts`
- Modify: `src/app/analysis/page.tsx`
- Modify: `src/components/log-summary.tsx`
- Modify: `src/components/analysis-results.tsx`
- Modify: `src/app/globals.css`
- Modify: `README.md`
- Modify: `docs/manual-verification.md`
- Modify: `docs/progress.md`

**Interfaces:**

- Consumes: `analyzeLogs(player: LogReference): Promise<Result<AnalysisResult>>` and `findReferences(player: FetchedLog)`.
- Produces: `AnalysisResult = { logs: { player: LogMetadata; referenceOne: LogMetadata; referenceTwo: LogMetadata }; referencePercentiles: { referenceOne: number; referenceTwo: number }; comparisons: AbilityComparison[]; observations: Observation[] }`.
- `LogSummary({ metadata, label, percentile? }: { metadata: LogMetadata; label: string; percentile?: number })`.

- [ ] **Step 1: Trocar a coordenação de três URLs pela descoberta automática.**

Alterar `analyzeLogs` para buscar primeiro e somente o log do jogador, chamar `findReferences`, então executar a contagem, comparação e observações com os dois `FetchedLog` selecionados. Encaminhar erros conhecidos sem atribuir slot inexistente; o erro de descoberta deve explicar que não foram encontradas duas referências públicas compatíveis.

- [ ] **Step 2: Propagar e formatar os percentis.**

Incluir `referencePercentiles` no `AnalysisResult`. Passar cada valor ao cartão correspondente e renderizar `Percentil: ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(percentile)}%`. Renderizar item level nos três cartões. O cartão “Você” não recebe percentil e nenhum componente cliente importa o módulo server-only.

- [ ] **Step 3: Ajustar estados, cópia e acessibilidade.**

Atualizar texto da página para explicar a descoberta automática e os critérios fixos. Preservar o loading existente durante toda a descoberta e manter erro esperado como alerta com retorno ao único campo. Conferir que cartões mantêm título único e que percentil/item level não dependem só de cor.

- [ ] **Step 4: Validar o fluxo completo manualmente.**

Com credenciais e logs públicos, executar: seleção ≥97; um caso de fallback com percentis exibidos; referência exatamente ±30 s; candidato inválido descartado; nenhuma referência; credenciais ausentes; recarregamento e link compartilhável contendo só `player`; teclado e largura móvel. Confirmar que análise não surge parcialmente e que bundles cliente não incluem credenciais/módulos de integração.

- [ ] **Step 5: Verificação final e handoff.**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: saída de sucesso dos três comandos. Consolidar resultados reais e limitações no README, roteiro manual e progresso; revisar JSDoc das funções alteradas. Criar commit `feat: analyze logs with automatic references` e solicitar revisão de código antes de integrar.

## Critério de conclusão

A funcionalidade estará concluída somente quando as quatro tarefas estiverem marcadas, os três comandos de qualidade tiverem saída de sucesso e as verificações manuais realizadas (ou bloqueadas por dependência externa) estiverem registradas. Não declarar que rankings ou item level foram validados contra a API real sem credenciais e evidência correspondente.
