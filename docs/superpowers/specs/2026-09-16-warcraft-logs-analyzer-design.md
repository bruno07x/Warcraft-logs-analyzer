# Warcraft Logs Analyzer — Design do MVP

## Objetivo

Criar uma aplicação educacional em Next.js para comparar os casts de um jogador de World of Warcraft com dois jogadores de referência. Os três dados de entrada serão URLs de relatórios públicos já processados pelo Warcraft Logs.

O projeto deve ensinar os principais conceitos de Next.js sem adicionar, no primeiro MVP, autenticação de usuários, banco de dados, inteligência artificial ou normalização por duração da luta.

## Critérios de sucesso

- O usuário informa três URLs públicas válidas do Warcraft Logs.
- A aplicação identifica relatório, luta e personagem em cada URL.
- Os três registros são validados como pertencentes ao mesmo encontro.
- A aplicação consulta todos os eventos de cast necessários na API do Warcraft Logs.
- A tela de resultado compara as contagens absolutas das habilidades.
- A aplicação mostra os dois valores de referência, sua média e a diferença do jogador para essa média.
- Regras determinísticas geram observações objetivas sobre as diferenças.
- O fluxo atende personagens DPS e healers.
- Todas as funções criadas no projeto possuem documentação JSDoc útil para estudo.

## Fora do escopo inicial

- Relatórios privados ou não listados.
- Login e contas de usuários.
- Persistência em banco de dados.
- Histórico de análises.
- Recomendações geradas por IA.
- Normalização por duração, casts por minuto ou disponibilidade de cooldown.
- Julgamento de rotação ideal, talentos, equipamento ou estratégia do grupo.
- Atribuição de casts de pets e invocações ao jogador.
- Testes unitários ou de integração automatizados.

## Entrada

A tela inicial recebe três URLs:

1. Log do jogador que deseja melhorar.
2. Primeiro log de referência.
3. Segundo log de referência.

Exemplo de URL aceita:

```text
https://www.warcraftlogs.com/reports/acAK7PwjZnvrGLq8?fight=2&type=healing&source=235
```

A aplicação extrai:

- `reportCode`: `acAK7PwjZnvrGLq8`;
- `fightID`: `2`;
- `sourceID`: `235`.

O parâmetro `type` não participa da identificação nem do cálculo. Parâmetros adicionais desconhecidos são ignorados. A aplicação deve aceitar somente o host oficial esperado e exigir os três identificadores.

## Arquitetura

A aplicação usará Next.js com App Router, TypeScript em modo estrito e componentes de servidor por padrão.

Ela será dividida em quatro áreas:

- **Interface:** formulário, estados de carregamento/erro e página de resultado.
- **Integração:** autenticação e consultas GraphQL à API do Warcraft Logs.
- **Domínio:** parsing das URLs, validação dos registros, normalização e comparação dos casts.
- **Regras:** transformação das diferenças em observações objetivas.

Fluxo principal:

```text
Formulário com três URLs
        |
        v
Extração de reportCode, fightID e sourceID
        |
        v
Consulta server-side à API GraphQL
        |
        v
Validação do encontro e dos personagens
        |
        v
Paginação e agrupamento dos casts
        |
        v
Comparação e regras determinísticas
        |
        v
Página de resultado
```

## Rotas e navegação

### `/`

Exibe o formulário com os campos “Seu log”, “Referência 1” e “Referência 2”. Cada campo apresenta exemplo e mensagem de validação. Ao enviar dados válidos, a interface navega para a análise.

### `/analysis`

Recebe as três URLs ou seus identificadores serializados em query parameters. Por se tratarem de relatórios públicos, isso permite atualizar e compartilhar uma análise sem persistência.

A página é um Server Component responsável por coordenar a consulta e montar os dados iniciais. Interações locais, como busca por habilidade e filtro de diferenças, ficam em um Client Component pequeno.

### Estados auxiliares

- `loading.tsx` apresenta o carregamento da análise.
- `error.tsx` apresenta uma falha inesperada recuperável.
- Erros esperados de entrada ou da API são tratados como resultado de domínio e informam qual dos três logs falhou.

## Integração com o Warcraft Logs

A API GraphQL v2 será acessada exclusivamente no servidor. O MVP usará OAuth 2.0 no fluxo `client_credentials`, adequado a dados públicos.

As variáveis de ambiente incluirão as credenciais do cliente e nunca serão expostas a Client Components. O access token será reutilizado até próximo de sua expiração, evitando uma nova autenticação por consulta.

Para cada log, a integração deve:

1. Obter os metadados do relatório, luta e personagem.
2. Buscar os eventos de cast do `sourceID` na luta indicada.
3. Seguir a paginação até não existir uma próxima página.
4. Retornar um modelo interno independente do formato GraphQL.

Respostas externas devem ser validadas antes de entrar no domínio. Erros de autenticação, rate limit, relatório inexistente e indisponibilidade serão convertidos em erros conhecidos e seguros para exibição.

## Modelo de domínio

O domínio trabalhará com estruturas equivalentes a:

```ts
type LogReference = {
  reportCode: string;
  fightID: number;
  sourceID: number;
};

type CastCount = {
  abilityID: number;
  abilityName: string;
  count: number;
};

type AbilityComparison = {
  abilityID: number;
  abilityName: string;
  playerCasts: number;
  referenceOneCasts: number;
  referenceTwoCasts: number;
  referenceAverage: number;
  difference: number;
};
```

Os nomes finais podem mudar durante o plano de implementação, mas as responsabilidades e os limites entre integração e domínio devem permanecer.

## Validação

Antes de comparar, a aplicação verifica:

- formato e origem das três URLs;
- existência de relatório, luta e personagem;
- acesso público aos relatórios;
- mesmo encontro nas três lutas;
- disponibilidade dos eventos necessários.

O MVP não bloqueará diferenças de classe, especialização, dificuldade ou resultado da luta, mas deve exibir esses metadados quando disponíveis. Isso permite que o usuário perceba uma comparação inadequada sem ampliar as regras iniciais.

## Contagem e comparação

A aplicação considerará eventos de casts concluídos pelo personagem selecionado. Ela não atribuirá ao jogador eventos emitidos por pets ou invocações.

Os casts serão agrupados por `abilityID`, usando o nome da habilidade para apresentação. Para entrar na tabela e nas observações, uma habilidade precisa ter ao menos cinco casts em cada uma das duas referências. Dentro desse conjunto, uma habilidade ausente no log do jogador receberá contagem zero.

Para cada habilidade:

```text
referenceAverage = (referenceOneCasts + referenceTwoCasts) / 2
difference = playerCasts - referenceAverage
```

Não haverá normalização por tempo no MVP. A decisão pressupõe que o usuário selecionará lutas suficientemente semelhantes.

A tabela será ordenada pela média das referências, da maior para a menor; empates usarão nome e identificador da habilidade para manter a ordem estável.

## Regras objetivas

Cada comparação gera uma classificação:

- `critical`: jogador teve zero casts e cada referência teve ao menos cinco casts;
- `warning`: jogador ficou abaixo da média;
- `positive`: jogador ficou acima da média;
- `neutral`: jogador igualou a média.

Exemplos de mensagens:

```text
Você não utilizou “Tranquility”; as referências utilizaram essa habilidade.
Você utilizou “Wild Growth” 4 vezes menos que a média das referências.
Você utilizou “Swiftmend” 2 vezes mais que a média das referências.
```

As regras descrevem diferenças observadas. Elas não devem afirmar que uma decisão foi incorreta ou ignorar contexto de luta, estratégia, talentos e equipamento.

## Interface do resultado

A página apresentará:

- identificação do encontro;
- resumo dos três personagens;
- recomendações ordenadas por severidade;
- busca por nome de habilidade;
- opção para esconder resultados neutros;
- tabela completa de comparação;
- ação para retornar ao formulário preservando os valores anteriores.

Colunas da tabela:

| Habilidade | Você | Referência 1 | Referência 2 | Média | Diferença |
|---|---:|---:|---:|---:|---:|
| Avenging Wrath | 2 | 3 | 3 | 3 | -1 |
| Holy Shock | 38 | 42 | 40 | 41 | -3 |

A interface será responsiva e usará cores discretas, acompanhadas por texto ou ícone, para não depender exclusivamente de cor.

## Organização sugerida

```text
src/
├── app/
│   ├── page.tsx
│   └── analysis/
│       ├── page.tsx
│       ├── loading.tsx
│       └── error.tsx
├── components/
├── lib/
│   ├── analysis/
│   ├── validation/
│   └── warcraft-logs/
└── types/
```

A estrutura poderá ser refinada no plano, preservando módulos pequenos e responsabilidades explícitas.

## Documentação e qualidade

Todas as funções autorais, incluindo componentes React, devem possuir JSDoc que explique sua responsabilidade e, quando aplicável, parâmetros, retorno, exceções e decisões que não sejam óbvias.

JSDoc não substituirá nomes claros nem tipos TypeScript. Comentários devem explicar propósito e decisões, não apenas repetir o código.

O MVP não terá testes automatizados por decisão do projeto. A verificação incluirá:

- TypeScript em modo estrito;
- lint;
- build de produção;
- roteiro manual cobrindo URLs válidas e inválidas, habilidades ausentes, falhas da API e os filtros da interface.

## Tratamento de erros

- Uma URL inválida é identificada antes de qualquer consulta externa.
- Uma falha em um dos três logs interrompe a comparação para evitar resultado parcial enganoso.
- A mensagem identifica “Seu log”, “Referência 1” ou “Referência 2”.
- Credenciais, tokens e detalhes internos da API nunca aparecem para o usuário.
- Rate limit ou indisponibilidade produzem mensagem para tentar novamente, sem classificar o log como inválido.

## Evoluções futuras

- Normalização por duração e casts por minuto.
- Detecção de oportunidades de cooldown.
- Comparação de buffs, dano, cura e overhealing.
- Regras específicas por função, classe ou especialização.
- Inclusão de pets e invocações.
- Histórico persistente e compartilhamento por identificador curto.
- Relatórios privados com autorização do usuário.
- Recomendações textuais assistidas por IA.
- Testes automatizados do domínio e da integração.

## Como retomar o projeto em outro dia

Este arquivo é a fonte de verdade do escopo aprovado. Em uma nova conversa ou sessão, use uma solicitação como:

> Leia `docs/superpowers/specs/2026-09-16-warcraft-logs-analyzer-design.md` e retome o projeto a partir dela. Antes de implementar, crie ou revise o plano de implementação e me diga qual é a próxima etapa.

Ao terminar cada sessão de desenvolvimento, registrar no repositório:

- tarefas concluídas;
- verificações executadas;
- próxima tarefa ainda não iniciada;
- decisões que alterem esta especificação.

Commits pequenos e descritivos também funcionarão como pontos de retomada. Não é necessário concluir o MVP em uma única sessão.

## Próximo passo aprovado após esta especificação

Criar um plano de implementação incremental. O primeiro incremento deve preparar o projeto Next.js e implementar o parsing e a validação das URLs antes de integrar a API externa.
