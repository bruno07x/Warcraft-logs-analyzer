/** Identificadores de um personagem em uma luta específica de um relatório. */
export type LogReference = {
  reportCode: string;
  fightID: number;
  sourceID: number;
};

/** Posição de cada log na comparação; também nomeia os query parameters. */
export type LogSlot = "player" | "referenceOne" | "referenceTwo";

export type LogInputs = { player: string };

/** Formato fornecido pelo App Router, incluindo parâmetros repetidos. */
export type AnalysisSearchParams = Record<string, string | string[] | undefined>;

/** Erro esperado com mensagem segura para apresentação, sem detalhes internos. */
export type AnalysisError = {
  code: string;
  message: string;
  slot?: LogSlot;
};

/** Obriga quem consome o resultado a tratar o erro antes de acessar os dados. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AnalysisError };

/** Evento de cast já desacoplado do JSON variável retornado pela API. */
export type CastEvent = {
  type: string;
  sourceID: number;
  abilityID: number;
};

/** Dados necessários para contextualizar um jogador e sua luta. */
export type LogMetadata = {
  reportCode: string;
  fightID: number;
  sourceID: number;
  encounterID: number;
  encounterName: string;
  characterName: string;
  className?: string;
  specialization?: string;
  difficulty?: string;
  kill?: boolean;
  itemLevel: number;
  durationMs: number;
};

/** Resultado da integração antes das regras de contagem e comparação. */
export type FetchedLog = {
  metadata: LogMetadata;
  casts: CastEvent[];
  abilityNames: Record<number, string>;
};

/** Total de casts concluídos de uma habilidade por personagem. */
export type CastCount = {
  abilityID: number;
  abilityName: string;
  count: number;
};

/** Uma habilidade alinhada entre jogador e duas referências. */
export type AbilityComparison = {
  abilityID: number;
  abilityName: string;
  playerCasts: number;
  referenceOneCasts: number;
  referenceTwoCasts: number;
  referenceAverage: number;
  difference: number;
};

/** Observação determinística sobre uma única diferença de contagem. */
export type Observation = {
  abilityID: number;
  severity: "critical" | "warning" | "positive" | "neutral";
  message: string;
};

/** Resultado pronto para a futura página de análise, sem detalhes do transporte. */
export type AnalysisResult = {
  logs: Record<LogSlot, LogMetadata>;
  referencePercentiles: Pick<Record<LogSlot, number>, "referenceOne" | "referenceTwo">;
  comparisons: AbilityComparison[];
  observations: Observation[];
};
