# Warcraft Logs Analyzer

Projeto educacional em Next.js para comparar os casts de um jogador com duas referências do Warcraft Logs.

**Estado atual: quarto incremento.** O formulário valida URLs, a integração busca casts e o domínio coordena os três logs, compara habilidades e gera observações objetivas. A página ainda apresenta somente identificadores; a tabela de resultado entra no próximo incremento.

## Executar localmente

Requisitos: Node.js 22.22.2 ou superior e pnpm 11.19.0.

```sh
pnpm install
pnpm dev
```

Copie `.env.example` para `.env.local` e preencha as credenciais de um cliente do Warcraft Logs quando quiser exercitar a integração. A interface atual continua funcionando sem credenciais porque ainda não chama `fetchLog`.

Para produção local:

```sh
pnpm build
pnpm start
```

## Verificações

```sh
pnpm typecheck
pnpm lint
pnpm build
```

`typecheck` gera os tipos de rotas do Next.js antes de executar `tsc --noEmit`, inclusive em um checkout sem `.next`. O TypeScript opera em modo estrito; o lint usa a CLI do ESLint com regras Next.js e TypeScript. O lockfile registra as versões resolvidas; use `pnpm install --frozen-lockfile` para reproduzi-las.

Por decisão do projeto, não há suíte de testes automatizados. O [roteiro manual](docs/manual-verification.md) descreve cenários e resultados esperados; as verificações efetivamente executadas ficam em [progresso](docs/progress.md).

## Usar o primeiro incremento

1. Abra um relatório público no Warcraft Logs e selecione uma luta e um personagem.
2. Copie a URL para “Seu log”; repita para “Referência 1” e “Referência 2”.
3. Selecione **Validar URLs**. Erros aparecem junto aos campos e o primeiro campo inválido recebe foco.
4. Em `/analysis`, confira relatório (`reportCode`), luta (`fightID`) e personagem (`sourceID`). O botão de retorno preserva os valores informados.

URL de exemplo para validar o formato (não é uma confirmação de que o relatório existe):

```text
https://www.warcraftlogs.com/reports/acAK7PwjZnvrGLq8?fight=2&type=healing&source=235
```

São aceitos HTTPS, host `www.warcraftlogs.com`, código alfanumérico e os parâmetros únicos `fight` e `source` com inteiros positivos seguros. `type` e parâmetros desconhecidos não afetam a identificação. IDs no fragmento `#` não substituem parâmetros da query. Não são aceitos `fight=last`, credenciais na URL, outros hosts ou portas alternativas. Espaços externos são tolerados.

Os três valores são serializados nos query parameters `player`, `referenceOne` e `referenceTwo`. Isso permite atualizar ou compartilhar a página sem persistência. Ao corrigir um link com um desses parâmetros repetidos, o formulário recupera o primeiro valor para edição; a página de análise rejeita a repetição antes dessa redução.

## Como o código se organiza

- `src/app/layout.tsx`: idioma pt-BR, metadados, cabeçalho e rodapé.
- `src/app/page.tsx`: Server Component que recupera valores da query e renderiza o formulário.
- `src/components/log-form.tsx`: Client Component responsável por interação, erros e navegação. O formulário GET também chega à validação server-side sem JavaScript.
- `src/lib/validation/log-url.ts`: função pura `parseLogUrl`, reutilizada no navegador e servidor, sem rede.
- `src/lib/validation/analysis-input.ts`: validação dos três slots e serialização para navegação.
- `src/types/analysis.ts`: contratos TypeScript, incluindo `Result<T>` para distinguir sucesso e erro esperado.
- `src/app/analysis/page.tsx`: Server Component que valida novamente os parâmetros originais e mostra a conferência provisória.
- `src/lib/warcraft-logs/auth.ts`: OAuth `client_credentials`, cache do token e renovação compartilhada.
- `src/lib/warcraft-logs/client.ts`: transporte GraphQL com timeout, uma renovação após 401 e erros seguros.
- `src/lib/warcraft-logs/schemas.ts`: validação de respostas externas recebidas como `unknown`.
- `src/lib/warcraft-logs/report.ts`: metadados, ator jogador e paginação integral dos casts.
- `src/lib/analysis/count-casts.ts`: agrupamento de casts concluídos de um ator, sem pets e sem `begincast`.
- `src/lib/analysis/compare-casts.ts`: filtro de habilidades usadas ao menos cinco vezes por cada referência, cálculo de média e diferença sem normalização ou arredondamento e ordem decrescente pela média.
- `src/lib/analysis/observations.ts`: classificação objetiva das diferenças, sem recomendar rotação.
- `src/lib/analysis/analyze-logs.ts`: coordenação das três consultas, validação do encontro e interrupção sem resultado parcial.
- `src/app/globals.css`: apresentação responsiva, foco visível e erros descritos em texto.

Todas as funções autorais têm JSDoc. A divisão permite estudar a fronteira servidor/cliente sem misturar consultas externas com parsing ou apresentação.

## Próximas etapas

A tarefa 5 adicionará a interface final de resultado. Consulte o [plano](docs/superpowers/plans/2026-09-25-warcraft-logs-analyzer.md) e a [especificação](docs/superpowers/specs/2026-09-16-warcraft-logs-analyzer-design.md).

## Referências de implementação

- [Next.js: instalação manual e requisitos](https://nextjs.org/docs/app/getting-started/installation).
- [Next.js: páginas e `searchParams` assíncrono](https://nextjs.org/docs/app/api-reference/file-conventions/page).
- [Next.js: ESLint com Core Web Vitals e TypeScript](https://nextjs.org/docs/app/api-reference/config/eslint).
- [Warcraft Logs: OAuth e API GraphQL v2](https://www.warcraftlogs.com/api/docs).
- [Warcraft Logs: schema do relatório](https://www.warcraftlogs.com/v2-api-docs/warcraft/report.doc.html).
- [Warcraft Logs: atores e habilidades do relatório](https://www.warcraftlogs.com/v2-api-docs/warcraft/reportmasterdata.doc.html).

A API pública usa `https://www.warcraftlogs.com/api/v2/client` com OAuth `client_credentials`. Consultas usam `allowUnlisted: false`; relatório privado, não listado ou inexistente não entra no domínio. A integração solicita `Casts` por luta e ator, valida `nextPageTimestamp` estritamente crescente e descarta todo o resultado se qualquer página falhar. `masterData` fornece nomes de habilidades e identifica atores `Player`; pets e NPCs são rejeitados.

Next.js 16.3.6 e React 19.3.0 foram confirmados no registro npm durante a implementação. TypeScript permanece na linha 5.9 porque `typescript-eslint` exige versão menor que 6.1. ESLint permanece na linha 9 porque os plugins React, imports e acessibilidade utilizados por `eslint-config-next` ainda declaram suporte somente até essa linha. O registro npm avisa que ESLint 9 está fora de suporte; revisar essa dependência quando os plugins suportarem ESLint 10.

`pnpm-workspace.yaml` permite explicitamente o script de instalação de `unrs-resolver`, dependência nativa da resolução de imports do lint. Nenhuma aprovação global de scripts foi configurada.
