# Progresso do Warcraft Logs Analyzer

## Sessão de 25/09/2026

- Lida a especificação aprovada em `superpowers/specs/2026-09-16-warcraft-logs-analyzer-design.md`.
- Criado e revisado o plano incremental em `superpowers/plans/2026-09-25-warcraft-logs-analyzer.md`, cobrindo base/validação, integração, comparação, regras e interface final.
- Nenhum código de aplicação ou dependência foi criado nesta etapa de planejamento.
- Verificações: inventário dos arquivos; leitura da especificação; Node `22.22.2`; pnpm `11.19.0`; conferência do plano contra o escopo e os contratos entre tarefas.
- Git indisponível: `git status --short` retorna “not a git repository”. A pasta `.git` protegida não foi alterada; nenhum commit realizado.
- Typecheck, lint e build ainda não se aplicam: aplicação não criada.
- Próxima tarefa não iniciada: tarefa 1 do plano — base Next.js, formulário e parsing/validação das três URLs, antes da API externa.
- Plano pronto para revisão e escolha de execução. Recomendação: execução direta, um incremento por vez.
- Sem alteração do escopo aprovado. O plano explicita parsing HTTPS com host `www.warcraftlogs.com` e IDs positivos únicos, para revisão antes da implementação.

## Implementação — primeiro incremento

Após aprovação do plano e da execução direta, implementada a tarefa 1:

- Base Next.js 16.3.6, React 19.3.0, TypeScript estrito, ESLint, pnpm e lockfile.
- Formulário responsivo em português com três URLs, exemplos, erros junto aos campos, foco no primeiro erro e estado de navegação.
- Parsing puro de HTTPS/host/código/IDs e validação repetida no servidor, inclusive para query parameters externos ausentes ou repetidos.
- Página `/analysis` com os identificadores extraídos e aviso explícito de que a integração ainda não existe. Retorno preserva valores.
- JSDoc em todas as funções autorais; README e roteiro manual disponíveis.

Verificações executadas:

| Verificação                      | Resultado                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Passou após autorização específica do script de `unrs-resolver`                                                        |
| `pnpm typecheck`                 | Passou, incluindo geração dos tipos das rotas                                                                          |
| `pnpm lint`                      | Passou sem avisos ou erros                                                                                             |
| `pnpm build`                     | Passou; `/` e `/analysis` renderizadas no servidor por requisição                                                      |
| Parser no terminal               | 29 entradas conferidas, incluindo formatos válidos, origem inválida, credenciais e IDs ausentes/repetidos/inválidos    |
| Chromium — formulário            | Envio vazio, referência inválida, foco no primeiro erro e navegação válida conferidos                                  |
| Chromium — servidor/retorno      | Reload, parâmetros ausentes/repetidos em cada slot e retorno após sucesso/erro preservando URLs codificadas conferidos |
| Chromium — mobile                | Formulário e resultado em 375px, sem overflow horizontal; capturas revisadas                                           |
| Chromium — sem JavaScript        | Formulário GET chega ao resultado validado no servidor                                                                 |
| Chromium — rede e execução       | Nenhuma requisição externa ou exceção de página observada                                                              |

A ferramenta de navegador e as entradas exploratórias foram temporárias, sem criar suíte de testes no projeto. Não foram verificadas todas as combinações de browsers nem navegação por leitor de tela.

Limitações do ambiente e decisões:

- Git continua indisponível: sem worktree, commits ou PR. Arquivos e progresso preservados nesta pasta.
- Typecheck/lint precisaram de execução fora do sandbox devido ao banco SQLite do pnpm. O build também precisou dessa execução porque o subprocesso TypeScript retornava saída vazia no ambiente restrito; fora dele passou sem alteração no código.
- `typecheck` inclui `next typegen` antes de `tsc --noEmit` para funcionar em checkout limpo.
- ESLint 9 foi mantido por compatibilidade declarada dos plugins do Next.js; npm avisa que essa linha está fora de suporte. Revisar atualização quando os plugins suportarem ESLint 10. TypeScript 5.9 é compatível com o parser atual.
- `pnpm-workspace.yaml` autoriza somente o script nativo de `unrs-resolver` necessário ao lint.

Revisão independente do primeiro incremento concluída sem achados críticos, importantes ou menores.

## Implementação — segundo incremento

Implementada a camada server-side da tarefa 2:

- OAuth `client_credentials` com credenciais exclusivamente no servidor, timeout, cache até 60 segundos antes da expiração e compartilhamento de renovação concorrente.
- Transporte GraphQL público com uma única renovação após 401, tratamento de 429/404/5xx/timeout e mensagens públicas sem detalhes internos.
- Consultas com `allowUnlisted: false`, luta específica, atores/habilidades do `masterData` e eventos `Casts` por luta e `sourceID`.
- Decodificação explícita de payloads `unknown`; relatório/luta/ator ausentes, pet/NPC e campos malformados são rejeitados antes do domínio.
- Paginação integral por `nextPageTimestamp`, exigindo avanço dentro do intervalo da luta. Uma falha invalida o resultado inteiro.
- Habilidades ausentes do `masterData` recebem o nome `Habilidade <ID>`.
- `.env.example`, README e roteiro manual atualizados. A integração permanece fora dos Client Components.

Verificações executadas:

| Verificação                | Resultado                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`           | Passou                                                                                                                                                              |
| `pnpm lint`                | Passou sem avisos ou erros                                                                                                                                          |
| `pnpm build`               | Passou após a adição da camada server-side                                                                                                                          |
| Decodificadores sintéticos | Metadados e página válidos aceitos; relatório ausente, luta ausente, ator fora da luta, pet, habilidade/evento/cursor inválidos rejeitados com categorias esperadas |
| Configuração ausente       | `fetchLog` retornou `configuration` sem tentar rede e sem expor credenciais                                                                                         |
| Paginação sintética        | Duas páginas agregadas nos cursores `100 → 300 → fim`; token reutilizado; habilidade desconhecida recebeu fallback                                                  |
| Renovação sintética        | 401 descartou o primeiro token, obteve um segundo e repetiu a consulta uma única vez                                                                                |
| Rate limit sintético       | 429 retornou `rate_limit` sem repetição                                                                                                                             |

Não havia `WARCRAFT_LOGS_CLIENT_ID` e `WARCRAFT_LOGS_CLIENT_SECRET` no ambiente. Portanto, autenticação e consultas contra o serviço real, relatório inexistente real e paginação real permanecem pendentes; não foram declarados validados. Os cenários sintéticos foram scripts temporários em `/tmp`, sem criar suíte automatizada no projeto.

O Git agora reconhece um repositório vazio em `master`, mas `.git` permanece sem escrita no ambiente e nenhum commit foi criado. Próxima etapa após validar a integração real: **tarefa 3 — contagem e comparação pura**.

## Implementação — terceiro incremento

Implementados os módulos puros de domínio para a tarefa 3:

- `countCasts` conta somente eventos `cast` do `sourceID` informado. `begincast`, pets e outros atores não participam.
- `compareCasts` forma a união de todas as habilidades, preenche ausências com zero e calcula média e diferença sem arredondamento.
- Nomes seguem a prioridade jogador, referência 1 e referência 2; nomes ausentes usam `Habilidade <ID>`.
- Os resultados ficam ordenados por nome e identificador, sem consultar API, usar React ou normalizar duração.

Verificações executadas:

| Verificação                 | Resultado                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Checagem manual descartável | 5 assertivas passaram: casts válidos, exclusão de `begincast`/outro ator, médias fracionárias, união, listas vazias e fallback de nome |
| `pnpm typecheck`            | Passou                                                                                                                                 |
| `pnpm lint`                 | Passou sem avisos ou erros                                                                                                             |
| `pnpm build`                | Passou                                                                                                                                 |

Próxima tarefa não iniciada: **tarefa 4 — regras determinísticas e coordenação dos três logs**. A validação contra a API real da tarefa 2 ainda depende de credenciais.

## Implementação — quarto incremento

Implementadas as regras e a coordenação da tarefa 4:

- Observações `critical`, `warning`, `positive` e `neutral` descrevem somente diferenças de contagem.
- `analyzeLogs` consulta os três slots em paralelo, identifica o slot em qualquer erro e não devolve análise parcial.
- As três lutas precisam compartilhar um `encounterID` inteiro e positivo; pulls/trash e encontros diferentes são rejeitados.
- Classe, especialização, dificuldade e resultado da luta não bloqueiam a análise.
- Contagem, comparação e observações só ocorrem depois da validação completa. Uma lista de casts vazia continua sendo um resultado válido.

Verificações executadas:

| Verificação                 | Resultado                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checagem manual descartável | 9 assertivas passaram: quatro severidades, diferenças fracionárias, encontro compatível/incompatível, falha localizada e metadados distintos permitidos |
| `pnpm typecheck`            | Passou após correção do estreitamento de resultados paralelos                                                                                           |
| `pnpm lint`                 | Passou sem avisos ou erros                                                                                                                              |
| `pnpm build`                | Passou                                                                                                                                                  |

No momento deste registro, a tarefa 5 — interface final da análise — ainda não havia começado, e a validação real da API da tarefa 2 estava pendente. Essas etapas foram concluídas posteriormente.

## Timelines de burst do Holy Paladin

- O decodificador valida e preserva o timestamp absoluto que vem em cada objeto do campo JSON `data` de casts do Warcraft Logs.
- O catálogo de burst define Paladin/Holy com Avenging Wrath (`31884`) e janelas de `20_000` ms. O domínio calcula, por log, as duas primeiras ativações e mantém ausências como slots vazios.
- A análise inclui timelines tipadas somente para especializações com regra. A seção visual mostra casts e offsets para os três logs, com estado “Burst não ativado” e colunas empilhadas em telas estreitas.
- O roteiro manual para zero, uma ou duas ativações, ordenação, limite temporal, especializações sem regra e layout móvel está em `docs/manual-verification.md`.

Verificações desta entrega:

| Verificação                                    | Resultado                                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format` e `pnpm format:check`            | Passaram                                                                                                                            |
| `pnpm typecheck`                               | Passou                                                                                                                              |
| `pnpm lint`                                    | Passou sem avisos ou erros                                                                                                          |
| `pnpm build`                                   | Passou                                                                                                                              |
| Warcraft Logs público Holy Paladin             | Fight 40 retornou 691 casts com timestamps finitos e duas ativações de Avenging Wrath; as janelas continham 27 e 34 casts           |
| Rota `/analysis` com o relatório público       | HTML server-rendered incluiu a seção, Burst 1/2, personagem e Avenging Wrath em `0,0s`; análise completada sem erro                 |
| Cenários zero/uma ativação                     | Não validados com um segundo relatório público nesta sessão                                                                         |
| Inspeção visual do desktop e viewport de 375px | Não executada: não há navegador nem Playwright disponíveis nesta sessão; o CSS responsivo e o markup foram conferidos estaticamente |
