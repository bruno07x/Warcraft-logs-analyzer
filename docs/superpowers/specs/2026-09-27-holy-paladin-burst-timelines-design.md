# Design: timelines de burst do Holy Paladin

## Objetivo

Exibir as duas primeiras janelas de burst de cada log analisado para facilitar a comparação visual da sequência de casts. A feature é observacional: ela mostra o que cada personagem usou, sem concluir que uma decisão de rotação foi correta ou incorreta.

O primeiro suporte será para Holy Paladin. Cada janela começa quando o jogador casta `Avenging Wrath` e cobre os 20 segundos seguintes.

## Escopo

- Suportar `Paladin` com especialização `Holy`.
- Detectar `Avenging Wrath` pelo game ID `31884`.
- Criar no máximo duas janelas de 20 segundos por log.
- Exibir as janelas em listas temporais lado a lado para jogador, referência 1 e referência 2.
- Manter a análise atual disponível para especializações sem regra de burst.

Ficam fora de escopo: inferir burst por throughput, permitir configuração manual de habilidade/duração, avaliar qualidade de rotação ou suportar outras especializações nesta entrega.

## Catálogo de bursts

Um módulo de domínio conterá regras declarativas indexadas por classe e especialização. Cada regra terá:

```ts
type BurstDefinition = {
  className: string;
  specialization: string;
  triggerAbilityID: number;
  durationMs: number;
  label: string;
};
```

A primeira regra será:

```ts
{
  className: "Paladin",
  specialization: "Holy",
  triggerAbilityID: 31884,
  durationMs: 20_000,
  label: "Avenging Wrath",
}
```

Adicionar novas especializações exigirá somente uma nova regra, desde que a janela seja iniciada por um cast e tenha duração fixa.

## Dados e cálculo

Os eventos de cast passarão a preservar o timestamp fornecido pelo Warcraft Logs. Para cada log:

1. Resolver a regra pelo par classe/especialização.
2. Filtrar casts concluídos do personagem cujo `abilityID` seja o gatilho.
3. Selecionar os dois primeiros gatilhos em ordem cronológica.
4. Para cada gatilho, coletar casts no intervalo inclusivo de início e exclusivo de fim: `[triggerTimestamp, triggerTimestamp + durationMs)`.
5. Converter o timestamp de cada cast para um offset em milissegundos relativo ao início da janela.

O próprio cast de `Avenging Wrath` aparece em `0.0s`. As janelas são independentes por log e são alinhadas visualmente por offset, não pelo momento absoluto da luta.

O resultado de análise conterá timelines tipadas por slot e índice de janela. Cada entrada incluirá rótulo, duração e a sequência de casts com offset, identificador e nome da habilidade.

## Estados sem dados

Se não existir regra para uma especialização, a análise continuará normal e não exibirá a seção de timeline.

Se um log suportado não ativar `Avenging Wrath`, ou só o fizer uma vez, a janela ausente será exibida como “Burst não ativado”. Isso não transforma a análise em erro e não impede a exibição das janelas disponíveis nos outros logs.

## Interface

Depois da tabela de comparação, a página de resultados terá uma seção “Timelines de burst”. Ela exibirá até duas subseções, “Burst 1” e “Burst 2”.

Cada subseção usará o layout B escolhido: três colunas de listas temporais, uma para “Você”, “Referência 1” e “Referência 2”. Cada item contém o offset formatado em segundos e o nome da habilidade. Em telas estreitas, as colunas empilham verticalmente mantendo a mesma ordem.

Os dados de alvo continuam disponíveis no domínio para a tabela agregada existente, mas a primeira versão da timeline mostra somente a ordem de habilidade para manter a leitura rápida.

## Tratamento de erros e verificação

Timestamp ausente ou inválido em um cast invalida a resposta externa, seguindo a política atual de validação estrita. A ausência de gatilho não é erro de integração.

Nesta fase, não serão criados nem executados testes unitários, conforme `AGENTS.md`. A entrega será verificada com `pnpm typecheck`, `pnpm lint`, `pnpm build` e uma inspeção manual de um log de Holy Paladin quando a API estiver disponível.
