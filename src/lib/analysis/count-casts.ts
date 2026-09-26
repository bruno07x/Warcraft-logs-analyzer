import type { CastCount, CastEvent } from "@/types/analysis";

/**
 * Agrupa apenas casts concluídos do personagem selecionado.
 * `begincast`, eventos de pets e outros atores ficam fora do resultado para que
 * o domínio possa comparar somente ações efetivamente concluídas pelo jogador.
 */
export function countCasts(
  events: CastEvent[],
  sourceID: number,
  abilityNames: Record<number, string>,
): CastCount[] {
  const counts = new Map<number, number>();

  for (const event of events) {
    if (event.type !== "cast" || event.sourceID !== sourceID) continue;
    counts.set(event.abilityID, (counts.get(event.abilityID) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([abilityID, count]) => ({
      abilityID,
      abilityName: abilityNames[abilityID] ?? `Habilidade ${abilityID}`,
      count,
    }))
    .sort((left, right) => left.abilityName.localeCompare(right.abilityName, "pt-BR") || left.abilityID - right.abilityID);
}
