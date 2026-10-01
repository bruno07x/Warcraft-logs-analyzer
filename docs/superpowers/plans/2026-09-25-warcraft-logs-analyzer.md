# Warcraft Logs Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir incrementalmente o MVP educacional que compara casts de um jogador com duas referências públicas.

**Architecture:** Next.js App Router com Server Components coordenando a análise, integração exclusiva no servidor e domínio independente de GraphQL. Formulário e filtros usam componentes cliente pequenos; query parameters preservam análises sem banco de dados.

**Tech Stack:** Next.js, React, TypeScript estrito, ESLint, CSS e pnpm. Na implementação, consultar a documentação oficial para selecionar versões estáveis compatíveis com Node e registrar versões exatas no lockfile.

**Spec:** `docs/superpowers/specs/2026-09-16-warcraft-logs-analyzer-design.md`

## Global Constraints

- “Todas as funções criadas no projeto possuem documentação JSDoc útil para estudo.”
- “O MVP não terá testes automatizados por decisão do projeto.” Usar verificações manuais, TypeScript, lint e build; não instalar um framework de testes.
- “A API GraphQL v2 será acessada exclusivamente no servidor.”
- “O MVP não bloqueará diferenças de classe, especialização, dificuldade ou resultado da luta, mas deve exibir esses metadados quando disponíveis.”
- “Uma falha em um dos três logs interrompe a comparação para evitar resultado parcial enganoso.”
- Sem autenticação de usuários, banco, IA, pets, relatórios privados/não listados ou normalização por duração.
- Cada tarefa inclui JSDoc, atualização do roteiro manual e registro das verificações realmente executadas.

## Review Focus

1. Hosts parecidos, credenciais embutidas e identificadores ambíguos: rejeitar antes da consulta externa (tarefa 1).
2. Consulta direta a `/analysis` com parâmetros ausentes ou repetidos: mostrar erro localizado, sem chamar a API (tarefas 1 e 5).
3. Resposta externa inválida, paginação repetida ou falha depois da primeira página: interromper sem resultado parcial (tarefa 2).
4. Habilidade ausente, média fracionária e casts de pets: zeros corretos, sem arredondar o cálculo nem atribuir pets ao jogador (tarefas 3 e 4).
5. Token expirado, rate limit e relatório sem acesso público: mensagens seguras, sem confundir indisponibilidade com URL inválida (tarefas 2 e 5).

## Estado inicial e decisões de execução

- Em 25/09/2026, apenas a especificação estava presente; não há código de aplicação nem plano anterior.
- Node disponível: `22.22.2`; pnpm: `11.19.0`. Compatibilidade das versões do framework ainda deve ser verificada.
- `git status --short` retorna “not a git repository”; `.git` é uma pasta protegida neste ambiente. Não substituir essa pasta. Trabalhar nos arquivos permitidos e registrar a impossibilidade de commits enquanto persistir.
- Execução recomendada: direta nesta sessão, um incremento por vez, começando pela tarefa 1. Revisar este plano antes da implementação.
- Detalhes de parsing abaixo refinam “host oficial esperado”: aceitar somente HTTPS e hostname `www.warcraftlogs.com`, conforme o exemplo aprovado; não aceitar subdomínios alternativos, credenciais ou portas não padrão.

## Mapa de arquivos

| Arquivos                                                                                                                | Responsabilidade                                 |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `.gitignore` | Ferramentas e configuração                       |
| `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`                                                         | Estrutura e entrada                              |
| `src/components/log-form.tsx`                                                                                           | Três campos, validação e navegação               |
| `src/types/analysis.ts`                                                                                                 | Contratos internos compartilhados                |
| `src/lib/validation/log-url.ts`, `src/lib/validation/analysis-input.ts`                                                 | Parsing puro e validação dos três logs           |
| `src/lib/warcraft-logs/auth.ts`, `client.ts`, `schemas.ts`, `queries.ts`, `report.ts`                                   | OAuth, transporte, validação externa e adaptação |
| `src/lib/analysis/count-casts.ts`, `compare-casts.ts`, `observations.ts`, `analyze-logs.ts`                             | Contagem, comparação, regras e orquestração      |
| `src/app/analysis/page.tsx`, `loading.tsx`, `error.tsx`                                                                 | Resultado e estados de navegação                 |
| `src/components/analysis-results.tsx`, `log-summary.tsx`                                                                | Filtros, tabela e metadados                      |
| `.env.example`, `README.md`, `docs/manual-verification.md`, `docs/progress.md`                                          | Configuração, estudo, verificação e retomada     |

## Tarefa 1 — Base Next.js e entrada validada (primeiro incremento)

**Arquivos:** configurações, layout, CSS, página inicial, formulário, tipos, módulos de validação, página inicial de `/analysis` e documentação do mapa acima.

**Interfaces:**

- `LogReference = { reportCode: string; fightID: number; sourceID: number }`.
- `LogSlot = 'player' | 'referenceOne' | 'referenceTwo'`; `LogInputs = Record<LogSlot, string>`.
- `Result<T> = { ok: true; value: T } | { ok: false; error: AnalysisError }`.
- `AnalysisError = { code: string; message: string; slot?: LogSlot }`; mensagens públicas controladas pela aplicação.
- `parseLogUrl(input: string): Result<LogReference>`.
- `validateAnalysisInput(params: Record<string, string | string[] | undefined>): Result<Record<LogSlot, LogReference>>`.

- [x] Consultar a documentação oficial do Next.js e preparar scripts `dev`, `build`, `start`, `lint` (ESLint CLI) e `typecheck` (`tsc --noEmit`), com versões compatíveis e TypeScript estrito. Preservar `docs/` ao criar a base.
- [x] Implementar o parsing com `URL`: trim externo; HTTPS/host acima; caminho `/reports/<código alfanumérico>` com barra final opcional; `fight` e `source` únicos, decimais inteiros positivos seguros. Rejeitar `last`, zero, negativos, frações, notação exponencial e valores fora de `Number.isSafeInteger`; ignorar `type` e demais parâmetros desconhecidos. Não interpretar fragmentos como identificadores.
- [x] Implementar a validação dos três parâmetros nomeados `player`, `referenceOne`, `referenceTwo`, rejeitando ausência, listas e strings inválidas e atribuindo o slot correto ao erro.
- [x] Criar formulário acessível em português com labels, exemplos e erros junto aos campos. Preservar os valores recebidos da query e navegar com URLs serializadas via `URLSearchParams` após validar os três campos.
- [x] Implementar `/analysis` como Server Component que repete a validação. Neste incremento, exibir apenas confirmação dos identificadores e aviso explícito de que a integração ainda não foi implementada; incluir retorno ao formulário preservando os valores.
- [x] Verificar manualmente o exemplo da especificação, parâmetros extras, host fraudulento, URL com usuário/senha, IDs inválidos/repetidos, campos vazios e acesso direto à análise. Confirmar que nenhuma chamada ao Warcraft Logs é feita.
- [x] Rodar `pnpm typecheck`, `pnpm lint`, `pnpm build`; registrar resultados e instruções `pnpm dev` no README. Atualizar `docs/progress.md` com tarefa 2 como próxima; fazer commit `feat: scaffold app and validate log URLs` se o Git estiver disponível.

## Tarefa 2 — Integração server-side e paginação

**Arquivos:** `src/lib/warcraft-logs/*`, `.env.example`, tipos, README e roteiro manual.

**Interfaces:**

- `getAccessToken(): Promise<string>`; `queryWarcraftLogs<T>(query: string, variables: Record<string, unknown>, decode: (value: unknown) => T): Promise<T>`; funções internas podem lançar erros conhecidos, convertidos na fronteira de `fetchLog`.
- `CastEvent = { type: string; sourceID: number; abilityID: number }`.
- `LogMetadata = { reportCode: string; fightID: number; sourceID: number; encounterID: number; encounterName: string; characterName: string; className?: string; specialization?: string; difficulty?: string; kill?: boolean; durationMs: number }`.
- `FetchedLog = { metadata: LogMetadata; casts: CastEvent[]; abilityNames: Record<number, string> }`.
- `fetchLog(reference: LogReference): Promise<Result<FetchedLog>>`.

- [x] Consultar documentação oficial e schema GraphQL v2 do Warcraft Logs para confirmar endpoints, visibilidade, metadados, eventos concluídos e cursor; registrar fontes e decisões no README antes de escrever consultas.
- [x] Criar credenciais `WARCRAFT_LOGS_CLIENT_ID` e `WARCRAFT_LOGS_CLIENT_SECRET`, somente no servidor, usando `server-only`. Reutilizar token em memória até 60 segundos antes da expiração e compartilhar a renovação em andamento; não registrar segredos.
- [x] Implementar transporte com timeout, validação de JSON/GraphQL e erros conhecidos para configuração, autenticação, rate limit, relatório ausente/sem acesso e indisponibilidade. Permitir no máximo uma renovação após 401; não repetir indefinidamente.
- [x] Validar respostas de `unknown` com validadores explícitos em `schemas.ts`, sem confiar em casts TypeScript. Resolver relatório público, luta e ator jogador existentes; rejeitar ator pet e visibilidade não pública.
- [x] Buscar todas as páginas no intervalo da luta, filtrando o ator selecionado. Validar avanço do cursor; falhas em qualquer página invalidam todo o log. Resolver nomes via metadados de habilidades; nome ausente recebe `Habilidade <ID>`.
- [ ] Verificar manualmente com credenciais e logs públicos disponíveis: autenticação, reuso do token, relatório inexistente, personagem/luta inexistentes e relatório paginado. Para falhas difíceis de reproduzir, usar depuração local descartável de respostas (sem suíte automatizada); registrar cenários não executados e dependências externas.
- [x] Rodar typecheck, lint e build; atualizar progresso e commit `feat: integrate public Warcraft Logs reports` se possível. (Verificações passaram; commit bloqueado pela escrita de `.git`.)

## Tarefa 3 — Contagem e comparação pura

**Arquivos:** tipos, `count-casts.ts`, `compare-casts.ts`, roteiro manual.

**Interfaces:**

- `CastCount` e `AbilityComparison` com os campos e fórmulas exatos da especificação.
- `countCasts(events: CastEvent[], sourceID: number, abilityNames: Record<number, string>): CastCount[]`.
- `compareCasts(player: CastCount[], referenceOne: CastCount[], referenceTwo: CastCount[]): AbilityComparison[]`.

- [x] Contar exclusivamente eventos concluídos `cast` do `sourceID` escolhido, agrupados por `abilityID`; excluir início de cast e eventos de outros atores.
- [x] Comparar habilidades com ao menos cinco casts em cada referência, usando zero na ausência do jogador, média aritmética e diferença sem arredondamento. Escolher nome na ordem jogador, referência 1, referência 2; ordenar pela maior média e desempatar por nome e ID.
- [x] Verificar manualmente dados locais descartáveis: contagens `2/3/4` produzem média `3,5` e diferença `-1,5`; `0/1/0` produz `0,5` e `-0,5`; habilidades só do jogador e arrays vazios funcionam; eventos de pet e `begincast` não contam.
- [x] Rodar typecheck, lint e build; atualizar progresso e commit `feat: compare completed cast counts` se possível. (Verificações passaram; commit bloqueado pela escrita de `.git`.)

## Tarefa 4 — Regras e coordenação da análise

**Arquivos:** tipos, `observations.ts`, `analyze-logs.ts`, roteiro manual.

**Interfaces:**

- `Observation = { abilityID: number; severity: 'critical' | 'warning' | 'positive' | 'neutral'; message: string }`.
- `AnalysisResult = { logs: Record<LogSlot, LogMetadata>; comparisons: AbilityComparison[]; observations: Observation[] }`.
- `createObservations(comparisons: AbilityComparison[]): Observation[]`.
- `analyzeLogs(references: Record<LogSlot, LogReference>): Promise<Result<AnalysisResult>>`.

- [x] Implementar classificações na precedência `critical`, `warning`, `positive`, `neutral`, com mensagens descritivas em português, incluindo diferenças fracionárias; `critical` exige zero casts do jogador e ao menos cinco casts em cada referência. Não inferir qualidade da rotação.
- [x] Consultar os três logs com `fetchLog`, acrescentando slot aos erros. Exigir o mesmo `encounterID` válido e positivo; não comparar pulls sem encontro identificável. Não bloquear classe, especialização, dificuldade ou resultado diferentes.
- [x] Coordenar contagem, comparação e observações somente após sucesso completo. Lista vazia confirmada pela API significa zero casts; campo ausente ou dados indisponíveis significam erro.
- [x] Verificar manualmente as quatro classificações, encontros diferentes e falha em cada slot. Confirmar que não há análise parcial e que diferenças de classe/dificuldade continuam permitidas.
- [x] Rodar typecheck, lint e build; atualizar progresso e commit `feat: orchestrate analysis and observations` se possível. (Verificações passaram; commit bloqueado pela escrita de `.git`.)

## Tarefa 5 — Resultado completo e verificação do MVP

**Arquivos:** página de análise, loading, error, componentes de resultado/resumo, CSS e documentação.

**Interfaces:** `AnalysisResults({ analysis }: { analysis: AnalysisResult })` concentra busca e filtro locais; `LogSummary({ metadata, label }: { metadata: LogMetadata; label: string })` apresenta metadados. Página usa `validateAnalysisInput` antes de `analyzeLogs`.

- [ ] Substituir a confirmação provisória pela análise real no Server Component. Não importar integração em componentes cliente nem depender de credenciais durante o build; consultar dados em tempo de requisição.
- [ ] Mostrar encontro, três resumos, duração, classe/especialização/dificuldade/resultado quando disponíveis e ressalva de contagens absolutas sem normalização. Exibir observações por severidade e tabela com as seis colunas da especificação.
- [ ] Implementar busca por nome sem diferenciar maiúsculas e filtro para esconder neutros, mantendo feedback quando nenhum resultado corresponder. Formatar números em pt-BR sem alterar os cálculos.
- [ ] Implementar carregamento, erros esperados localizados e error boundary com mensagem genérica e tentativa de recuperação. Preservar valores ao retornar ao formulário, inclusive após erro; não exibir mensagens internas de exceções.
- [ ] Verificar fluxo no navegador com teclado e largura móvel, busca/filtro, reload, link compartilhado, retorno preservado, três logs válidos, falhas por slot e ausência de credenciais. Confirmar que bundles cliente não contêm credenciais nem módulos da integração.
- [ ] Rodar typecheck, lint e build. Consolidar roteiro manual, limitações e pendências reais em `docs/progress.md`; revisar JSDoc de todas as funções autorais. Commit `feat: present cast analysis results` se possível.

## Critério de conclusão e retomada

Cada incremento só é concluído após suas verificações locais. Cenários dependentes de credenciais ou relatórios não disponíveis ficam explicitamente pendentes; não declarar validação de integração sem evidência. Atualizar as caixas deste plano e `docs/progress.md` ao final da sessão, identificando a próxima tarefa não iniciada e quaisquer alterações de escopo.
