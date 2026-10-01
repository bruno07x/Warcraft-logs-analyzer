/** Identificadores de um personagem em uma luta específica de um relatório. */
export type LogReference = {
  reportCode: string;
  fightID: number;
  sourceID: number;
  rankingMetric?: RankingMetric;
};

/** Métrica de throughput que define a categoria do ranking de referência. */
export type RankingMetric = "hps" | "dps";

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
export type Result<T> = { ok: true; value: T } | { ok: false; error: AnalysisError };

/** Evento de cast já desacoplado do JSON variável retornado pela API. */
export type CastEvent = {
  type: string;
  sourceID: number;
  targetID?: number;
  abilityID: number;
  timestamp: number;
};

/** Regra declarativa que define o gatilho e a duração de uma janela de burst. */
export type BurstDefinition = {
  className: string;
  specialization: string;
  triggerAbilityID: number;
  durationMs: number;
  label: string;
};

/** Cast exibido na timeline com tempo relativo ao início da janela. */
export type BurstCast = {
  offsetMs: number;
  abilityID: number;
  abilityName: string;
  abilityIcon?: string;
};

/** Janela de burst com duração fixa e casts em ordem temporal. */
export type BurstWindow = {
  label: string;
  durationMs: number;
  casts: BurstCast[];
};

/** Duas posições de janela para cada log; null indica que o burst não foi ativado. */
export type BurstTimelines = Record<LogSlot, (BurstWindow | null)[]> & { durationMs: number };

/** Papel do alvo de um cast, preservando o total para leitura geral. */
export type CastTargetCategory = "total" | "ally" | "enemy" | "unknown";

/** Atributo de combate observado no personagem durante a luta. */
export type CombatStat = { label: string; value: number };

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
  keystoneLevel?: number;
  rankingMetric?: RankingMetric;
  kill?: boolean;
  durationMs: number;
  reportUrl: string;
  combatStats: CombatStat[];
};

/** Resultado da integração antes das regras de contagem e comparação. */
export type FetchedLog = {
  metadata: LogMetadata;
  casts: CastEvent[];
  abilityNames: Record<number, string>;
  abilityIcons: Record<number, string>;
  friendlyActorIDs: number[];
};

/** Total de casts concluídos de uma habilidade por personagem. */
export type CastCount = {
  comparisonKey?: string;
  abilityID: number;
  abilityName: string;
  targetCategory?: CastTargetCategory;
  count: number;
};

/** Uma habilidade alinhada entre jogador e duas referências. */
export type AbilityComparison = {
  comparisonKey?: string;
  abilityID: number;
  abilityName: string;
  targetCategory?: CastTargetCategory;
  playerCasts: number;
  referenceOneCasts: number;
  referenceTwoCasts: number;
  referenceAverage: number;
  difference: number;
};

/** Observação determinística sobre uma única diferença de contagem. */
export type Observation = {
  comparisonKey?: string;
  abilityID: number;
  severity: "critical" | "warning" | "positive" | "neutral";
  message: string;
};

/** Resultado pronto para a futura página de análise, sem detalhes do transporte. */
export type AnalysisResult = {
  logs: Record<LogSlot, LogMetadata>;
  referencePercentiles: Pick<Record<LogSlot, number>, "referenceOne" | "referenceTwo">;
  comparisons: AbilityComparison[];
  abilityIcons: Record<number, string>;
  observations: Observation[];
  burstTimelines?: BurstTimelines;
};
