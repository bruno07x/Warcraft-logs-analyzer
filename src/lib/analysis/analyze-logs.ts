import "server-only";
import type { AnalysisResult, FetchedLog, LogReference, LogSlot, Result } from "@/types/analysis";
import { fetchLog } from "@/lib/warcraft-logs";
import { compareCasts } from "./compare-casts";
import { countCasts } from "./count-casts";
import { createObservations } from "./observations";

const slots: LogSlot[] = ["player", "referenceOne", "referenceTwo"];

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
 * Confirma que as três lutas pertencem ao mesmo encontro de chefe válido.
 * Classe, especialização, dificuldade e resultado são preservados como contexto e não bloqueiam a análise.
 */
function validateEncounter(logs: Record<LogSlot, FetchedLog>): Result<true> {
  const playerEncounterID = logs.player.metadata.encounterID;
  if (!Number.isSafeInteger(playerEncounterID) || playerEncounterID <= 0) {
    return { ok: false, error: { code: "invalid_encounter", slot: "player", message: "Seu log não contém um encontro de chefe válido para comparação." } };
  }

  for (const slot of ["referenceOne", "referenceTwo"] as const) {
    const encounterID = logs[slot].metadata.encounterID;
    if (!Number.isSafeInteger(encounterID) || encounterID <= 0 || encounterID !== playerEncounterID) {
      return {
        ok: false,
        error: {
          code: "different_encounter",
          slot,
          message: `${slotLabel(slot)} não pertence ao mesmo encontro do seu log.`,
        },
      };
    }
  }
  return { ok: true, value: true };
}

/**
 * Consulta, valida e compara três logs somente quando todos estiverem disponíveis.
 * Uma falha ou encontro incompatível retorna erro sem qualquer resultado parcial.
 */
export async function analyzeLogs(
  references: Record<LogSlot, LogReference>,
): Promise<Result<AnalysisResult>> {
  const results = await Promise.all(slots.map((slot) => fetchSlot(slot, references[slot])));
  const [playerResult, referenceOneResult, referenceTwoResult] = results;
  if (!playerResult.ok) return playerResult;
  if (!referenceOneResult.ok) return referenceOneResult;
  if (!referenceTwoResult.ok) return referenceTwoResult;

  const logs: Record<LogSlot, FetchedLog> = {
    player: playerResult.value,
    referenceOne: referenceOneResult.value,
    referenceTwo: referenceTwoResult.value,
  };
  const encounter = validateEncounter(logs);
  if (!encounter.ok) return encounter;

  const playerCasts = countCasts(logs.player.casts, logs.player.metadata.sourceID, logs.player.abilityNames);
  const referenceOneCasts = countCasts(logs.referenceOne.casts, logs.referenceOne.metadata.sourceID, logs.referenceOne.abilityNames);
  const referenceTwoCasts = countCasts(logs.referenceTwo.casts, logs.referenceTwo.metadata.sourceID, logs.referenceTwo.abilityNames);
  const comparisons = compareCasts(playerCasts, referenceOneCasts, referenceTwoCasts);

  return {
    ok: true,
    value: {
      logs: {
        player: logs.player.metadata,
        referenceOne: logs.referenceOne.metadata,
        referenceTwo: logs.referenceTwo.metadata,
      },
      comparisons,
      observations: createObservations(comparisons),
    },
  };
}
