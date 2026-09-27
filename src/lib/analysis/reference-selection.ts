import "server-only";
import type { FetchedLog, Result } from "@/types/analysis";
import { fetchLog } from "@/lib/warcraft-logs";
import { fetchRankingCandidates, fetchRankingPercentile, resolveRankingReference } from "@/lib/warcraft-logs/rankings";

type SelectedReference = { log: FetchedLog; percentile: number };
const sameItemLevel = (left: number, right: number) => Math.abs(left - right) <= 3;

/** Encontra duas referências públicas compatíveis, reduzindo o mínimo de percentil quando necessário. */
export async function findReferences(player: FetchedLog): Promise<Result<{ referenceOne: SelectedReference; referenceTwo: SelectedReference }>> {
  const metadata = player.metadata;
  if (!metadata.kill || !metadata.specialization || !metadata.className || !metadata.difficulty || !Number.isSafeInteger(metadata.encounterID) || metadata.encounterID <= 0) return { ok: false, error: { code: "no_matching_references", message: "Seu log não contém os metadados necessários para encontrar referências compatíveis." } };
  const candidatesResult = await fetchRankingCandidates({ encounterID: metadata.encounterID, difficulty: Number(metadata.difficulty), className: metadata.className, specialization: metadata.specialization }, 1);
  if (!candidatesResult.ok) return candidatesResult;
  const eligible: SelectedReference[] = []; const seen = new Set<string>();
  for (const candidate of candidatesResult.value) {
      const key = `${candidate.reportCode}:${candidate.fightID}:${candidate.characterName}`;
      if (seen.has(key) || candidate.className !== metadata.className || candidate.specialization !== metadata.specialization || Math.abs(candidate.durationMs - metadata.durationMs) > 30_000) continue;
      seen.add(key);
      const resolved = await resolveRankingReference(candidate); if (!resolved.ok) continue;
      if (resolved.value.reportCode === metadata.reportCode && resolved.value.fightID === metadata.fightID && resolved.value.sourceID === metadata.sourceID) continue;
      const log = await fetchLog(resolved.value); if (!log.ok) continue;
      const candidateMetadata = log.value.metadata;
      if (!candidateMetadata.kill || candidateMetadata.encounterID !== metadata.encounterID || candidateMetadata.difficulty !== metadata.difficulty || candidateMetadata.specialization !== metadata.specialization || candidateMetadata.className !== metadata.className || !sameItemLevel(candidateMetadata.itemLevel, metadata.itemLevel) || Math.abs(candidateMetadata.durationMs - metadata.durationMs) > 30_000) continue;
      const percentile = await fetchRankingPercentile(resolved.value, candidate.characterName, candidate.className, candidate.specialization); if (!percentile.ok) continue;
      eligible.push({ log: log.value, percentile: percentile.value });
  }
  const selected: SelectedReference[] = [];
  for (let minimum = 97; minimum >= 0 && selected.length < 2; minimum -= 1) {
    for (const candidate of eligible) if (candidate.percentile >= minimum && !selected.includes(candidate)) { selected.push(candidate); if (selected.length === 2) break; }
  }
  return selected.length === 2 ? { ok: true, value: { referenceOne: selected[0], referenceTwo: selected[1] } } : { ok: false, error: { code: "no_matching_references", message: "Não encontramos duas referências públicas compatíveis com seu log." } };
}
