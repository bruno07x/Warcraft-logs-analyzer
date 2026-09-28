# Changelog

## Versão 2 — Comparações equivalentes e casts por alvo

- A seleção automática de referências agora respeita a métrica do log fornecido: HPS para cura e DPS para dano.
- Referências são filtradas pelo mesmo encontro, dificuldade, nível de Mítica+, especialização, classe e vitória.
- A duração da referência é limitada a uma tolerância de 30 segundos em relação ao log analisado.
- A busca usa a paginação dos rankings e a conversão correta do nível da chave para o `bracket` da API do Warcraft Logs.
- Habilidades usadas tanto em aliados quanto em inimigos passam a mostrar linhas separadas para cada tipo de alvo, além do total.
- Casts sem alvo identificado continuam no total da habilidade, mas não aparecem como uma categoria separada.
- Os cabeçalhos da tabela agora identificam cada referência pelo nome do jogador.

## Versão 1 — Analisador inicial de logs

- Inclusão de formulário para informar um log público do Warcraft Logs.
- Leitura dos metadados da luta, personagem, especialização, duração e atributos de combate.
- Comparação das contagens de casts entre o jogador e duas referências.
- Exibição de média, diferença e observações de uso por habilidade.
- Filtros locais para buscar habilidades e ocultar resultados neutros.
- Links diretos para os logs analisados.
