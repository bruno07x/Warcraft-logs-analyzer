# Seleção automática de referências — Design

## Objetivo

Remover a necessidade de o usuário informar manualmente duas URLs de referência. A
aplicação receberá apenas uma URL pública — o log que será analisado — e escolherá
duas referências públicas comparáveis a partir dos rankings do Warcraft Logs.

As referências devem ser jogadores do mesmo encontro, dificuldade e especialização,
em uma faixa de item level comparável, com kill e duração a no máximo 30 segundos da
luta do usuário. A escolha privilegia desempenho alto, sem esconder o percentil que
motivou a seleção.

## Critérios de sucesso

- O formulário exige somente a URL de “Seu log”.
- A aplicação encontra duas referências públicas elegíveis sem o usuário copiar suas
  URLs manualmente.
- A busca começa com percentil de ranking maior ou igual a 97 e reduz o limite de um
  em um até encontrar duas referências ou esgotar os rankings disponíveis.
- Toda referência efetivamente usada passa pela validação normal de relatório, luta
  e personagem antes da comparação de casts.
- A tela de análise mostra o percentil real de cada referência escolhida.
- Nenhuma referência é escolhida se não atender aos critérios de compatibilidade.

## Fora de escopo

- Permitir que o usuário altere manualmente as referências nesta entrega.
- Atribuir uma nota de qualidade à estratégia, composição, talentos ou buffs.
- Relaxar duração, encontro, dificuldade, especialização, item level ou kill para
  obter uma referência a qualquer custo.
- Persistir rankings, resultados ou análises em banco de dados.
- Testes unitários ou de integração automatizados, por decisão explícita do projeto.

## Fluxo da interface

Na rota `/`, o formulário terá somente o campo “Seu log”. Depois de validar a URL,
a navegação para `/analysis` preservará apenas o identificador desse log. A página
de análise executará a descoberta no servidor e exibirá estado de carregamento
enquanto a seleção e a comparação ocorrem.

Quando a análise for bem-sucedida, os três cartões continuam sendo exibidos. Cada
cartão de referência inclui, além dos metadados existentes, `Percentil: 97,4%`
(formatação pt-BR, com uma casa decimal). O cartão do usuário não mostrará um
percentil, pois o percentil que interessa neste fluxo é o de ranking de cada
referência selecionada.

Caso não existam duas referências que atendam a todos os requisitos, a página mostra
um erro seguro explicando que não foi possível encontrar referências públicas
compatíveis. Não haverá análise parcial nem troca silenciosa dos critérios.

## Critérios de elegibilidade

Partindo do `FetchedLog` do usuário, uma referência candidata precisa ter:

1. o mesmo `encounterID`;
2. a mesma dificuldade;
3. a mesma especialização;
4. uma kill;
5. item level na mesma faixa/bracket de ranking do usuário;
6. duração com diferença absoluta menor ou igual a 30.000 ms;
7. URL pública e dados validados pela integração existente;
8. `reportCode`, `fightID` e `sourceID` distintos das referências já escolhidas e do
   próprio jogador.

O item level de cada personagem deve ser obtido dos dados detalhados de combatente
fornecidos pelo Warcraft Logs. A implementação converte esse valor para o bracket
de item level exposto pela API de rankings. Se a API não fornecer item level válido
para o jogador ou candidato, a descoberta falha com erro conhecido: não deve
adivinhar ou omitir esse critério.

## Busca e seleção

A integração consultará `worldData.encounter(id)` e
`characterRankings`, o endpoint de ranking por personagem do Warcraft Logs. A
consulta deve passar encounter, dificuldade, especialização e bracket de item level
do jogador; solicitar resultados com log de origem e dados necessários para criar
uma `LogReference`.

O retorno de rankings é um escalar JSON externo. Um decodificador específico deve
validar estruturalmente todos os campos usados: percentil/rank, código do relatório,
identificador da luta, identificador do ator, encounter, duração e item level quando
presente. Campos ausentes, tipos inesperados e identificadores inválidos descartam
o candidato; uma resposta estruturalmente inválida invalida a consulta de rankings.

O algoritmo é determinístico:

```text
limitePercentil = 97
enquanto limitePercentil >= 0 e houver páginas de ranking:
  ler candidatos ainda não avaliados com percentil >= limitePercentil
  para cada candidato, em ordem de percentil decrescente e desempate estável:
    descartar se não atender duração, duplicidade ou metadados declarados
    buscar e validar o log completo
    se continuar elegível, adicionar como referência
    parar imediatamente ao obter duas referências
  reduzir limitePercentil em 1
```

Páginas devem ser buscadas somente enquanto forem necessárias para avaliar candidatos
e devem parar logo após duas seleções validadas. Um cache em memória, de vida curta,
por combinação de encounter/dificuldade/spec/bracket pode evitar repetir a resposta
de ranking em análises concorrentes, mas não deve guardar dados indefinidamente.

O percentil exibido é o valor do candidato retornado pelo ranking, preservado junto
à referência selecionada. O limiar usado na iteração não é exibido como se fosse o
percentil real.

## Arquitetura e tipos

O módulo `src/lib/warcraft-logs/` ganha uma fronteira de rankings, separada da busca
de relatório:

- `rankings.ts`: consulta GraphQL e normalização/validação dos candidatos.
- `reference-selection.ts`: regras de elegibilidade, paginação, deduplicação e
  seleção das duas referências.
- `queries.ts` e `schemas.ts`: novas consultas e decodificadores de dados externos.

Os tipos internos incluem equivalentes a:

```ts
type RankedReference = {
  reference: LogReference;
  percentile: number;
  durationMs: number;
  itemLevel: number;
};

type SelectedReference = RankedReference & {
  metadata: LogMetadata;
};
```

`LogMetadata` passará a incluir `itemLevel`. `AnalysisResult` manterá os metadados
dos três logs e acrescentará percentis somente para `referenceOne` e
`referenceTwo`, evitando atribuir indevidamente um ranking ao log do usuário.

`analyzeLogs` deixará de receber três `LogReference`: receberá a referência do
jogador, buscará seu log, descobrirá as duas referências e somente então executará a
comparação atual. Essa ordem evita consultar casts das referências antes de confirmar
que elas são compatíveis.

## Erros e limites externos

- Sem credenciais, autenticação, rate limit e indisponibilidade mantêm as mensagens
  públicas seguras já usadas pela integração.
- Uma resposta de ranking inesperada gera `invalid_response`; dados incompletos de
  um único candidato apenas o descartam.
- Não encontrar duas referências elegíveis retorna `no_matching_references`, sem
  resultado parcial.
- O código não registra tokens, respostas GraphQL completas nem URLs de relatórios
  não selecionados.
- As consultas continuam exclusivamente no servidor e usam somente relatórios
  públicos (`allowUnlisted: false`).

## Verificação

Não serão criados testes automatizados. A entrega será verificada com `pnpm
typecheck`, `pnpm lint` e `pnpm build`, mais roteiro manual com credenciais reais:

1. log elegível com duas referências no percentil >= 97;
2. caso que exija reduzir o limiar e confirme os percentis reais mostrados;
3. candidatos fora de ±30 s, item level, spec, dificuldade ou sem kill;
4. ranking sem duas referências compatíveis;
5. relatório/ranking não público, rate limit e credenciais ausentes;
6. retorno ao formulário e link compartilhável contendo somente o log do usuário.

## Fontes e decisão de API

O campo `Encounter.characterRankings` permite filtrar rankings por bracket (faixa de
item level no WoW), dificuldade, spec e página. A documentação classifica rankings
como dados não congelados, portanto a aplicação os trata como candidatos e valida o
relatório selecionado antes de usar seus casts. A consulta de `playerDetails` do
relatório oferece dados detalhados de combatente usados para confirmar item level.

- https://www.warcraftlogs.com/v2-api-docs/warcraft/encounter.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/report.doc.html
