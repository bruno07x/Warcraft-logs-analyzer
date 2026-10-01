import type { CastEvent, CombatStat, LogMetadata, LogReference } from "@/types/analysis";
import { WarcraftLogsError } from "./errors";

type MetadataPayload = {
  metadata: LogMetadata;
  startTime: number;
  endTime: number;
  abilityNames: Record<number, string>;
  abilityIcons: Record<number, string>;
  friendlyActorIDs: number[];
};

type EventPage = { events: CastEvent[]; nextPageTimestamp: number | null };

/** Lança um erro de contrato externo sem reproduzir o valor recebido. */
function invalidResponse(): never {
  throw new WarcraftLogsError(
    "invalid_response",
    "O Warcraft Logs retornou uma resposta inesperada.",
  );
}

/** Garante que um valor desconhecido seja um objeto simples indexável. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalidResponse();
  return value as Record<string, unknown>;
}

/** Identifica um objeto indexável sem invalidar metadados opcionais. */
function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Extrai os atributos requisitados sem deixar dados de combate ausentes bloquearem a análise. */
function combatStatsFrom(playerDetailsValue: unknown, sourceID: number): CombatStat[] {
  const playerDetails = optionalRecord(playerDetailsValue);
  const detailsData = optionalRecord(playerDetails?.data);
  const groups = optionalRecord(detailsData?.playerDetails);
  const detail =
    groups &&
    Object.values(groups)
      .flatMap((group) => (Array.isArray(group) ? group : []))
      .map(optionalRecord)
      .find((candidate) => candidate?.id === sourceID);
  const stats = optionalRecord(optionalRecord(detail)?.combatantInfo)?.stats;
  const statValues = optionalRecord(stats);
  const statFor = (label: string): CombatStat | undefined => {
    const stat = optionalRecord(statValues?.[label]);
    const value = stat?.min;
    return typeof value === "number" && Number.isFinite(value) ? { label, value } : undefined;
  };
  const primary = ["Intellect", "Strength", "Agility"]
    .map(statFor)
    .find((stat) => stat !== undefined);
  return [primary, ...["Stamina", "Crit", "Haste", "Mastery", "Versatility"].map(statFor)].filter(
    (stat): stat is CombatStat => stat !== undefined,
  );
}

/** Lê um número finito, preservando timestamps relativos com casas decimais. */
function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalidResponse();
  return value;
}

/** Lê um inteiro seguro requerido pela fronteira interna. */
function safeInteger(value: unknown): number {
  const number = finiteNumber(value);
  if (!Number.isSafeInteger(number)) invalidResponse();
  return number;
}

/** Lê uma string não vazia. */
function nonEmptyString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) invalidResponse();
  return value;
}

/** Navega pelo envelope reportData.report e diferencia relatório não público. */
function reportFrom(value: unknown): Record<string, unknown> {
  const data = record(value);
  const reportData = record(data.reportData);
  if (reportData.report === null) {
    throw new WarcraftLogsError("not_found", "O relatório não foi encontrado ou não é público.");
  }
  return record(reportData.report);
}

/**
 * Valida metadados e resolve somente um ator jogador participante da luta pedida.
 * Pets, NPCs, luta inexistente e ator fora da luta produzem erros conhecidos.
 */
export function decodeReportMetadata(value: unknown, reference: LogReference): MetadataPayload {
  const report = reportFrom(value);
  if (nonEmptyString(report.code) !== reference.reportCode) invalidResponse();
  if (!Array.isArray(report.fights) || report.fights.length !== 1) {
    throw new WarcraftLogsError(
      "not_found",
      "A luta selecionada não foi encontrada neste relatório.",
    );
  }
  const fight = record(report.fights[0]);
  const fightID = safeInteger(fight.id);
  if (fightID !== reference.fightID) invalidResponse();
  const startTime = finiteNumber(fight.startTime);
  const endTime = finiteNumber(fight.endTime);
  if (startTime < 0 || endTime <= startTime) invalidResponse();
  if (!Array.isArray(fight.friendlyPlayers) || !fight.friendlyPlayers.every(Number.isSafeInteger)) {
    invalidResponse();
  }
  const playerIndex = fight.friendlyPlayers.indexOf(reference.sourceID);
  if (playerIndex === -1) {
    throw new WarcraftLogsError("not_found", "O personagem selecionado não participou desta luta.");
  }

  const masterData = record(report.masterData);
  if (!Array.isArray(masterData.actors) || !Array.isArray(masterData.abilities)) invalidResponse();
  const friendlyActorIDs = new Set(fight.friendlyPlayers);
  for (const actorValue of masterData.actors) {
    const candidate = record(actorValue);
    if (
      typeof candidate.petOwner === "number" &&
      Number.isSafeInteger(candidate.petOwner) &&
      friendlyActorIDs.has(candidate.petOwner)
    ) {
      friendlyActorIDs.add(safeInteger(candidate.id));
    }
  }
  const actorValue = masterData.actors.find((candidate) => {
    const actor = record(candidate);
    return actor.id === reference.sourceID;
  });
  if (actorValue === undefined) {
    throw new WarcraftLogsError(
      "not_found",
      "O personagem selecionado não foi encontrado neste relatório.",
    );
  }
  const actor = record(actorValue);
  if (actor.type !== "Player" || actor.petOwner !== null) {
    throw new WarcraftLogsError(
      "not_found",
      "O identificador selecionado não pertence a um personagem jogador.",
    );
  }
  const abilityNames: Record<number, string> = {};
  const abilityIcons: Record<number, string> = {};
  for (const abilityValue of masterData.abilities) {
    const ability = record(abilityValue);
    const gameID = safeInteger(ability.gameID);
    // O catálogo oficial inclui "Unknown Ability" com gameID 0. Ele não pode
    // identificar um cast comparável, mas não invalida as demais habilidades.
    if (gameID <= 0) continue;
    abilityNames[gameID] = nonEmptyString(ability.name);
    if (typeof ability.icon === "string" && /^[a-z0-9_-]+\.jpg$/i.test(ability.icon)) {
      abilityIcons[gameID] = ability.icon;
    }
  }

  let specialization: string | undefined;
  if (fight.friendlySpecs !== null && fight.friendlySpecs !== undefined) {
    if (!Array.isArray(fight.friendlySpecs)) invalidResponse();
    const spec = fight.friendlySpecs[playerIndex];
    if (spec !== null && spec !== undefined) specialization = nonEmptyString(spec);
  }

  const difficultyValue = fight.difficulty;
  const difficulty =
    difficultyValue === null || difficultyValue === undefined
      ? undefined
      : String(safeInteger(difficultyValue));
  const keystoneLevelValue = fight.keystoneLevel;
  const keystoneLevel =
    keystoneLevelValue === null || keystoneLevelValue === undefined
      ? undefined
      : safeInteger(keystoneLevelValue);
  if (keystoneLevel !== undefined && keystoneLevel <= 0) invalidResponse();
  const killValue = fight.kill;
  if (killValue !== null && killValue !== undefined && typeof killValue !== "boolean")
    invalidResponse();
  const combatStats = combatStatsFrom(report.playerDetails, reference.sourceID);

  return {
    metadata: {
      reportCode: reference.reportCode,
      fightID,
      sourceID: reference.sourceID,
      encounterID: safeInteger(fight.encounterID),
      encounterName: nonEmptyString(fight.name),
      characterName: nonEmptyString(actor.name),
      className:
        actor.subType === null || actor.subType === undefined
          ? undefined
          : nonEmptyString(actor.subType),
      specialization,
      difficulty,
      keystoneLevel,
      rankingMetric: reference.rankingMetric,
      kill: killValue ?? undefined,
      durationMs: endTime - startTime,
      reportUrl: `https://www.warcraftlogs.com/reports/${reference.reportCode}?fight=${fightID}&type=casts&source=${reference.sourceID}`,
      combatStats,
    },
    startTime,
    endTime,
    abilityNames,
    abilityIcons,
    friendlyActorIDs: [...friendlyActorIDs],
  };
}

/** Valida uma página completa; um único evento malformado invalida a análise. */
export function decodeEventPage(value: unknown, sourceID: number): EventPage {
  const report = reportFrom(value);
  const paginator = record(report.events);
  if (!Array.isArray(paginator.data)) invalidResponse();

  const events = paginator.data.map((eventValue): CastEvent => {
    const event = record(eventValue);
    const eventSourceID = safeInteger(event.sourceID);
    if (eventSourceID !== sourceID) invalidResponse();
    const abilityID = safeInteger(event.abilityGameID);
    if (abilityID <= 0) invalidResponse();
    const targetID =
      event.targetID === null || event.targetID === undefined
        ? undefined
        : safeInteger(event.targetID);
    return {
      type: nonEmptyString(event.type),
      sourceID: eventSourceID,
      targetID,
      abilityID,
      timestamp: finiteNumber(event.timestamp),
    };
  });

  const cursor = paginator.nextPageTimestamp;
  if (cursor === null) return { events, nextPageTimestamp: null };
  return { events, nextPageTimestamp: finiteNumber(cursor) };
}
