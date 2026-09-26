# Roteiro manual

Execute com `pnpm dev`, ou `pnpm build` seguido de `pnpm start`. O estado de execução deste roteiro fica em `progress.md`; as caixas abaixo são uma lista para repetir em cada sessão.

## Incremento 1 — URLs e navegação

Use como base:

```text
https://www.warcraftlogs.com/reports/acAK7PwjZnvrGLq8?fight=2&type=healing&source=235
```

| Cenário | Ação | Resultado esperado |
|---|---|---|
| Entrada válida | Colar o exemplo nos três campos e enviar | Três cartões com relatório `acAK7PwjZnvrGLq8`, luta `2`, personagem `235`; aviso explícito de integração pendente |
| Parâmetros extras | Alterar `type` e adicionar `foo=bar` | Mesmos identificadores |
| Espaços externos/barra final | Acrescentar espaços antes/depois, ou `/` após o código | Formato aceito |
| Campos vazios | Enviar sem preencher | Erros nos três campos; foco em “Seu log”; sem navegação |
| Erro na referência | Manter dois válidos e invalidar a referência 1 ou 2 | Erro junto ao campo correspondente e foco nele |
| Protocolo/host | Usar HTTP, host sem `www`, subdomínio falso ou `www.warcraftlogs.com.evil.test` | Rejeição antes de qualquer rede externa |
| Credenciais/porta | Usar `https://user:password@www.warcraftlogs.com/...` ou porta `:444` | Rejeição; nunca navegar para o endereço colado |
| Caminho | Remover código, inserir hífen no código ou acrescentar `/extra` | Rejeição de relatório inválido |
| Identificadores ausentes | Remover `fight` ou `source` | Mensagem específica para luta/personagem |
| Identificadores inválidos | Usar `last`, `0`, `-1`, `1.5`, `2e3`, `Infinity`, `9007199254740992` em cada ID | Rejeição |
| IDs repetidos | Adicionar outro `fight=2` ou `source=235` | Rejeição mesmo se os valores forem iguais |
| Fragmento | Substituir `?fight=2&source=235` por `#fight=2&source=235` | Rejeição por ausência dos IDs na query |
| Acesso direto incompleto | Abrir `/analysis` ou remover um parâmetro externo | Página de erro identifica o slot; retorno ao formulário |
| Parâmetro externo repetido | Duplicar `player`, `referenceOne` ou `referenceTwo` na URL da análise | Página de erro identifica o slot e exige uma única URL |
| Retorno | Voltar pelo botão após sucesso ou erro | Três valores anteriores preservados; para parâmetro repetido, primeiro valor disponível para correção |
| Atualização/compartilhamento | Atualizar `/analysis` e abrir o mesmo endereço em outra aba | Mesmos identificadores, sem banco de dados |
| Codificação | Incluir parâmetro extra com `&`, `+` ou texto codificado; voltar | A URL original é preservada pela serialização externa |
| Teclado | Usar Tab/Shift+Tab/Enter e o link de pular conteúdo | Foco visível, labels associados, primeiro erro focado |
| Mobile | Usar largura de 375px | Sem rolagem horizontal; campos e botões acessíveis |
| JavaScript desativado | Preencher e enviar o formulário | GET chega à análise; servidor valida e permite retornar |
| Rede | Inspecionar a aba Network durante envio válido e inválido | Apenas recursos e navegação locais; nenhuma chamada à API do Warcraft Logs |

## Incremento 2 — integração server-side

Estes cenários exigem `WARCRAFT_LOGS_CLIENT_ID` e `WARCRAFT_LOGS_CLIENT_SECRET` válidos e uma chamada temporária a `fetchLog`, pois a interface ainda não coordena os três logs:

| Cenário | Resultado esperado |
|---|---|
| Credenciais ausentes | Erro `configuration`, sem expor nomes/valores internos |
| Log público válido | Metadados da luta/jogador, mapa de habilidades e todas as páginas de eventos |
| Relatório privado, não listado ou inexistente | Erro seguro `not_found` |
| Luta/ator inexistente ou ator fora da luta | Erro seguro `not_found` |
| `sourceID` de pet/NPC | Rejeição como não jogador |
| HTTP 401 | Token descartado e uma única renovação; segundo 401 encerra a consulta |
| HTTP 429 | Erro `rate_limit`, sem repetir a consulta |
| Timeout/5xx | Erro `unavailable` orientando nova tentativa |
| JSON/GraphQL/schema inválido | Erro `invalid_response`, sem resultado parcial |
| Cursor repetido, regressivo ou após o fim da luta | Erro `invalid_response`, sem loop ou resultado parcial |
| Página posterior falha | Nenhum cast das páginas anteriores é devolvido |

## Incremento 3 — contagem e comparação

Use dados descartáveis no domínio, sem chamar a API:

| Cenário | Resultado esperado |
|---|---|
| Casts concluídos | Dois eventos `cast` do ator `10` para a habilidade `100` resultam em contagem `2` |
| Evento iniciado | Um `begincast` não entra na contagem |
| Outro ator ou pet | Evento com `sourceID` diferente não entra na contagem |
| Nome ausente | Habilidade `999` ausente do mapa recebe `Habilidade 999` |
| Média fracionária | Jogador `2`, referências `3` e `4` resulta em média `3,5` e diferença `-1,5` |
| Habilidade elegível | Jogador `0`, referências `5` e `7` entra na tabela, com média `6` e diferença `-6` |
| Limiar das referências | Habilidade com menos de cinco casts em qualquer referência não entra na tabela nem nas observações |
| Ordem da tabela | Médias `11`, `10` e `8` aparecem nessa ordem decrescente; empates usam nome e identificador |
| Listas vazias | Três listas vazias produzem uma comparação vazia |

Não aplicar normalização por duração, casts por minuto, decisões de rotação ou atribuição de pets neste incremento.

## Incremento 4 — observações e coordenação

| Cenário | Resultado esperado |
|---|---|
| Ausência do jogador | Zero casts do jogador e ao menos cinco casts em cada referência gera `critical` |
| Abaixo da média | Diferença negativa, sem ausência total, gera `warning` com valor fracionário quando aplicável |
| Acima da média | Diferença positiva gera `positive` |
| Igualdade | Diferença zero gera `neutral` |
| Ordem | Observações ficam em `critical`, `warning`, `positive`, `neutral`, com desempate estável por habilidade |
| Mesmo encontro | Três `encounterID` positivos iguais permitem a análise |
| Encontro distinto ou pull | Referência com encontro distinto, zero ou inválido interrompe sem comparações |
| Falha por slot | Falha de qualquer log traz `slot` e nome do campo; não há resultado parcial |
| Metadados diferentes | Classe, especialização, dificuldade e resultado diferentes continuam permitidos e preservados |
| Lista vazia confirmada | Um log sem casts válidos gera contagens zero, sem ser tratado como erro |

## Incrementos posteriores — ainda indisponíveis

- Coordenação da interface para três relatórios e validação de encontros diferentes.
- Casts concluídos do jogador, exclusão de pets, habilidade ausente e média fracionária.
- Quatro severidades, busca por habilidade, filtro de neutros e resultado sem correspondências.

Esses cenários serão detalhados e executados conforme as tarefas 2–5 forem implementadas; não são funcionalidades do primeiro incremento.
