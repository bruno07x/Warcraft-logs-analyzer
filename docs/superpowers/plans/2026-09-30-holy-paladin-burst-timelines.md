# Holy Paladin Burst Timelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Exibir as duas primeiras janelas de Avenging Wrath nos três logs da análise para comparar a ordem de casts em offsets relativos.

**Architecture:** Preservar os timestamps dos eventos na fronteira da API e validar cada timestamp antes de criar `CastEvent`. Um catálogo de domínio seleciona a regra pelo par classe/especialização e calcula até duas janelas; `AnalysisResult` carrega as janelas para uma seção visual responsiva depois da tabela.

**Tech Stack:** Next.js App Router, React, TypeScript estrito, Warcraft Logs GraphQL v2, CSS, ESLint, Prettier e pnpm.

**Spec:** `docs/superpowers/specs/2026-09-27-holy-paladin-burst-timelines-design.md`

## Global Constraints

- Trabalhar no checkout e branch atuais; não criar nem usar git worktrees.
- Não criar, alterar ou executar testes unitários nesta fase.
- Incluir JSDoc em todas as funções implementadas.
- Suportar somente `Paladin` / `Holy`, com `Avenging Wrath` (`31884`) e duração de `20_000` ms.
- Exibir até duas janelas por log; coletar eventos em `[triggerTimestamp, triggerTimestamp + durationMs)`.
- A ausência de gatilho ou de uma segunda ativação não invalida a análise; a janela ausente será exibida como “Burst não ativado”.
- Especializações sem regra seguem com a análise atual e sem a seção de timeline.
- A timeline mostra somente offsets e nomes de habilidade; não avalia a qualidade da rotação.

## Review Focus

1. Um timestamp ausente, não numérico ou não finito na resposta de eventos retorna `invalid_response`, sem resultado parcial.
2. O cast que ativa Avenging Wrath aparece no offset `0.0s`.
3. Um cast exatamente no fim da janela fica fora dela; um cast no instante de início fica dentro.
4. Nenhuma ativação ou uma única ativação gera slots ausentes sem falhar os outros logs.
5. Logs de especializações não suportadas continuam sem a seção de timeline e mantêm a análise existente.

Como `AGENTS.md` proíbe testes unitários, cada etapa será verificada por typecheck/lint e a entrega por build e roteiro manual; não adicionar suítes ou arquivos de teste.

---

### Task 1: Preservar e validar timestamps da API

**Files:**

- Modify: `src/lib/warcraft-logs/queries.ts`
- Modify: `src/types/analysis.ts`
- Modify: `src/lib/warcraft-logs/schemas.ts`
- Modify: `src/lib/warcraft-logs/report.ts`

**Interfaces:**

- `CastEvent` passa a conter `timestamp: number`, em milissegundos absolutos conforme retornado pelo Warcraft Logs.
- `decodeEventPage(value: unknown, sourceID: number)` continua validando a página externa e inclui timestamp finito em cada evento.
- `fetchLog(reference)` continua agregando as páginas sem converter os timestamps; eventos sem timestamp válido invalidam a resposta completa.

- [x] **Step 1: Preservar timestamps do payload e tipar o evento.**

Os timestamps já vêm dentro dos objetos JSON do campo `data` de `events`; não adicioná-los como campo separado do paginador GraphQL. Atualizar `CastEvent` com `timestamp: number`.

- [x] **Step 2: Decodificar timestamps obrigatórios.**

Em `decodeEventPage`, ler `event.timestamp` com o validador numérico finito existente e retorná-lo no evento. Preservar a validação atual de `type`, `sourceID`, `abilityID` e alvo.

- [x] **Step 3: Verificar os contratos TypeScript.**

Run: `pnpm typecheck && pnpm lint`

Expected: ambos concluem sem erros; nenhuma outra criação de `CastEvent` fica sem timestamp.

### Task 2: Implementar catálogo e cálculo de janelas

**Files:**

- Create: `src/lib/analysis/burst-timelines.ts`
- Modify: `src/types/analysis.ts`

**Interfaces:**

- `BurstDefinition = { className: string; specialization: string; triggerAbilityID: number; durationMs: number; label: string }`.
- `BurstCast = { offsetMs: number; abilityID: number; abilityName: string }`.
- `BurstWindow = { label: string; durationMs: number; casts: BurstCast[] }`.
- `AnalysisResult.burstTimelines?` é `Record<LogSlot, (BurstWindow | null)[]>`; cada array tem exatamente dois slots quando há regra para o jogador.
- Exportar `getBurstDefinition(className?: string, specialization?: string): BurstDefinition | undefined` e `buildBurstWindows(log: FetchedLog, definition: BurstDefinition): (BurstWindow | null)[]`.

- [x] **Step 1: Declarar tipos e regra Holy Paladin.**

Adicionar os tipos de timeline em `analysis.ts`. No catálogo indexado por classe/especialização, cadastrar Paladin/Holy, habilidade `31884`, duração `20_000` e rótulo `Avenging Wrath`.

- [x] **Step 2: Construir duas janelas cronológicas.**

Implementar `buildBurstWindows` para filtrar somente eventos `cast` do `sourceID` do log, ordenar cronologicamente, escolher os dois primeiros gatilhos e coletar em cada janela eventos do mesmo personagem com início inclusivo e fim exclusivo. Calcular `offsetMs` relativo ao gatilho e resolver o nome via `abilityNames`, usando `Habilidade <ID>` como fallback. Retornar dois slots, preenchendo ausências com `null`.

- [x] **Step 3: Verificar qualidade estática.**

Run: `pnpm typecheck && pnpm lint`

Expected: ambos concluem sem erros e todas as funções novas têm JSDoc em português.

### Task 3: Integrar timelines ao resultado da análise

**Files:**

- Modify: `src/lib/analysis/analyze-logs.ts`
- Modify: `src/lib/analysis/burst-timelines.ts`
- Modify: `src/types/analysis.ts`

**Interfaces:**

- Exportar `buildBurstTimelines(logs: Record<LogSlot, FetchedLog>): Record<LogSlot, (BurstWindow | null)[]> | undefined`.
- A função usa a regra do log do jogador; sem regra retorna `undefined`. Com regra, calcula janelas independentes para jogador e ambas referências.
- `analyzeLogs` inclui `burstTimelines` no resultado somente quando o jogador tem regra cadastrada.

- [x] **Step 1: Calcular resultado para os três slots.**

Implementar `buildBurstTimelines` em `burst-timelines.ts`, usando a mesma definição para os três logs, sem alinhar timestamps absolutos entre relatórios.

- [x] **Step 2: Anexar timelines sem alterar a comparação agregada.**

Em `analyzeLogs`, calcular e incluir as timelines junto de `comparisons` e `observations`. Preservar o comportamento e o formato das análises sem regra cadastrada.

- [x] **Step 3: Verificar integração e contratos.**

Run: `pnpm typecheck && pnpm lint`

Expected: ambos concluem sem erros e os consumidores existentes de `AnalysisResult` permanecem válidos.

### Task 4: Exibir seção responsiva e documentar verificação manual

**Files:**

- Create: `src/components/burst-timelines.tsx`
- Modify: `src/components/analysis-results.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/manual-verification.md`
- Modify: `docs/progress.md`
- Modify: `changelog.md`

**Interfaces:**

- `BurstTimelines` recebe timelines tipadas por slot e nomes dos três personagens necessários aos cabeçalhos.
- `AnalysisResults` renderiza a seção “Timelines de burst” depois da tabela somente quando `analysis.burstTimelines` existe.
- Cada subseção “Burst 1” e “Burst 2” mostra três colunas na ordem Você, Referência 1, Referência 2; `null` mostra “Burst não ativado”.

- [x] **Step 1: Criar o componente semântica e visualmente responsivo.**

Renderizar offsets em segundos com uma casa decimal em pt-BR e nomes de habilidade em listas temporais. Empilhar as colunas em telas estreitas mantendo a ordem definida; incluir headings associados e estrutura semântica.

- [x] **Step 2: Posicionar a seção e adicionar estilos.**

Renderizar após a tabela de habilidades. Adicionar estilos para duas janelas, três colunas e breakpoint mobile, seguindo tokens e convenções visuais atuais.

- [x] **Step 3: Atualizar roteiro e progresso.**

Documentar verificação manual para Holy Paladin com zero, uma e duas ativações; ordem dos casts, cast inicial em `0.0s`, limite de 20 segundos e layout mobile; confirmar que outra especialização não exibe a seção. Registrar as verificações realmente executadas em `docs/progress.md` e resumir o recurso em `changelog.md`.

- [x] **Step 4: Verificar entrega.**

Run: `pnpm format && pnpm format:check && pnpm typecheck && pnpm lint && pnpm build`

Expected: todos os comandos concluem sem erros. Executar o roteiro manual com um relatório público Holy Paladin se as credenciais e a rede estiverem disponíveis; caso contrário, registrar claramente essa limitação.
