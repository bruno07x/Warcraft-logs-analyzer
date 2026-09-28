import "server-only";
import type { FetchedLog, Result } from "@/types/analysis";
import { fetchLog } from "@/lib/warcraft-logs";
import { fetchRankingCandidates, fetchRankingPercentile, resolveRankingReference } from "@/lib/warcraft-logs/rankings";

type SelectedReference = { log: FetchedLog; percentile: number };
const DURATION_TOLERANCE_MS = 30_000;
const MAX_RANKING_PAGES = 5;

/** O índice do ranking de Mítica+ é deslocado em uma unidade em relação ao nível exibido da chave. */
function rankingBracket(keystoneLevel: number | undefined): number {
  return keystoneLevel === undefined ? 0 : keystoneLevel - 1;
}

/** Encontra referências públicas compatíveis sem consultar relatórios fora da tolerância de duração. */
export async function findReferences(player: FetchedLog): Promise<Result<{ referenceOne: SelectedReference; referenceTwo: SelectedReference }>> {
  const metadata = player.metadata;
  if (!metadata.kill || !metadata.specialization || !metadata.className || !metadata.difficulty || !metadata.rankingMetric || !Number.isSafeInteger(metadata.encounterID) || metadata.encounterID <= 0) return { ok: false, error: { code: "no_matching_references", message: "Seu log não contém os metadados necessários para encontrar referências compatíveis." } };
  const eligible: SelectedReference[] = []; const seen = new Set<string>();
  let page = 1;
  let hasMorePages = true;
  while (page <= MAX_RANKING_PAGES && hasMorePages && eligible.length < 2) {
    const candidatesResult = await fetchRankingCandidates({ encounterID: metadata.encounterID, difficulty: Number(metadata.difficulty), bracket: rankingBracket(metadata.keystoneLevel), metric: metadata.rankingMetric, className: metadata.className, specialization: metadata.specialization }, page);
    if (!candidatesResult.ok) return candidatesResult;
    hasMorePages = candidatesResult.value.hasMorePages;
    page += 1;
    for (const candidate of candidatesResult.value.candidates) {
      const key = `${candidate.reportCode}:${candidate.fightID}:${candidate.characterName}`;
      if (seen.has(key) || candidate.className !== metadata.className || candidate.specialization !== metadata.specialization || candidate.keystoneLevel !== metadata.keystoneLevel || Math.abs(candidate.durationMs - metadata.durationMs) > DURATION_TOLERANCE_MS) continue;
      seen.add(key);
      const resolved = await resolveRankingReference(candidate); if (!resolved.ok) continue;
      if (resolved.value.reportCode === metadata.reportCode && resolved.value.fightID === metadata.fightID && resolved.value.sourceID === metadata.sourceID) continue;
      const log = await fetchLog(resolved.value); if (!log.ok) continue;
      const candidateMetadata = log.value.metadata;
      if (!candidateMetadata.kill || candidateMetadata.encounterID !== metadata.encounterID || candidateMetadata.difficulty !== metadata.difficulty || candidateMetadata.keystoneLevel !== metadata.keystoneLevel || candidateMetadata.specialization !== metadata.specialization || candidateMetadata.className !== metadata.className) continue;
      const percentile = await fetchRankingPercentile(resolved.value, candidate.characterName, candidate.className, candidate.specialization, metadata.rankingMetric); if (!percentile.ok) continue;
      eligible.push({ log: log.value, percentile: percentile.value });
      if (eligible.length === 2) break;
    }
  }
  return eligible.length === 2 ? { ok: true, value: { referenceOne: eligible[0], referenceTwo: eligible[1] } } : { ok: false, error: { code: "no_matching_references", message: "Não encontramos duas referências públicas compatíveis entre os melhores logs disponíveis." } };
}
