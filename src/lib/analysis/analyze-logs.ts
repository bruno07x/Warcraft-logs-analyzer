import "server-only";
import type { AnalysisResult, FetchedLog, LogReference, LogSlot, Result } from "@/types/analysis";
import { fetchLog } from "@/lib/warcraft-logs";
import { compareCasts } from "./compare-casts";
import { countCasts } from "./count-casts";
import { buildBurstTimelines } from "./burst-timelines";
import { createObservations } from "./observations";
import { findReferences } from "./reference-selection";

/** Fornece o nome do campo na mesma linguagem usada pela interface. */
function slotLabel(slot: LogSlot): string {
  if (slot === "player") return "Seu log";
  return slot === "referenceOne" ? "Referência 1" : "Referência 2";
}

/** Associa uma falha de consulta ao campo que a originou, sem expor dados internos. */
async function fetchSlot(slot: LogSlot, reference: LogReference): Promise<Result<FetchedLog>> {
  try {
    const result = await fetchLog(reference);
    if (result.ok) return result;
    return {
      ok: false,
      error: { ...result.error, slot, message: `${slotLabel(slot)}: ${result.error.message}` },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "unavailable",
        slot,
        message: `${slotLabel(slot)}: não foi possível consultar o Warcraft Logs. Tente novamente em instantes.`,
      },
    };
  }
}

/**
 * Consulta, valida e compara três logs somente quando todos estiverem disponíveis.
 * Uma falha ou encontro incompatível retorna erro sem qualquer resultado parcial.
 */
export async function analyzeLogs(playerReference: LogReference): Promise<Result<AnalysisResult>> {
  const playerResult = await fetchSlot("player", playerReference);
  if (!playerResult.ok) return playerResult;
  const references = await findReferences(playerResult.value);
  if (!references.ok) return references;
  const logs = {
    player: playerResult.value,
    referenceOne: references.value.referenceOne.log,
    referenceTwo: references.value.referenceTwo.log,
  };

  const playerCasts = countCasts(
    logs.player.casts,
    logs.player.metadata.sourceID,
    logs.player.abilityNames,
    logs.player.friendlyActorIDs,
  );
  const referenceOneCasts = countCasts(
    logs.referenceOne.casts,
    logs.referenceOne.metadata.sourceID,
    logs.referenceOne.abilityNames,
    logs.referenceOne.friendlyActorIDs,
  );
  const referenceTwoCasts = countCasts(
    logs.referenceTwo.casts,
    logs.referenceTwo.metadata.sourceID,
    logs.referenceTwo.abilityNames,
    logs.referenceTwo.friendlyActorIDs,
  );
  const comparisons = compareCasts(playerCasts, referenceOneCasts, referenceTwoCasts);
  const burstTimelines = buildBurstTimelines(logs);

  return {
    ok: true,
    value: {
      logs: {
        player: logs.player.metadata,
        referenceOne: logs.referenceOne.metadata,
        referenceTwo: logs.referenceTwo.metadata,
      },
      referencePercentiles: {
        referenceOne: references.value.referenceOne.percentile,
        referenceTwo: references.value.referenceTwo.percentile,
      },
      comparisons,
      abilityIcons: {
        ...logs.referenceTwo.abilityIcons,
        ...logs.referenceOne.abilityIcons,
        ...logs.player.abilityIcons,
      },
      observations: createObservations(comparisons),
      ...(burstTimelines ? { burstTimelines } : {}),
    },
  };
}
