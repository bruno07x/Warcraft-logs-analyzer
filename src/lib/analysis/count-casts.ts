import type { CastCount, CastEvent, CastTargetCategory } from "@/types/analysis";

const categoryLabel: Record<CastTargetCategory, string> = {
  total: "",
  ally: " — aliados",
  enemy: " — inimigos",
  unknown: "",
};

/** Classifica o alvo sem tratar casts sem alvo como ofensivos. */
function targetCategory(event: CastEvent, friendlyActorIDs: Set<number>): Exclude<CastTargetCategory, "total"> {
  if (event.targetID === undefined || event.targetID <= 0) return "unknown";
  return friendlyActorIDs.has(event.targetID) ? "ally" : "enemy";
}

/**
 * Agrupa apenas casts concluídos do personagem selecionado.
 * `begincast`, eventos de pets e outros atores ficam fora do resultado para que
 * o domínio possa comparar somente ações efetivamente concluídas pelo jogador.
 */
export function countCasts(
  events: CastEvent[],
  sourceID: number,
  abilityNames: Record<number, string>,
  friendlyActorIDs: number[],
): CastCount[] {
  const counts = new Map<number, Map<Exclude<CastTargetCategory, "total">, number>>();
  const friends = new Set(friendlyActorIDs);

  for (const event of events) {
    if (event.type !== "cast" || event.sourceID !== sourceID) continue;
    const categories = counts.get(event.abilityID) ?? new Map();
    const category = targetCategory(event, friends);
    categories.set(category, (categories.get(category) ?? 0) + 1);
    counts.set(event.abilityID, categories);
  }

  return [...counts.entries()].flatMap(([abilityID, categories]) => {
    const name = abilityNames[abilityID] ?? `Habilidade ${abilityID}`;
    const total = [...categories.values()].reduce((sum, count) => sum + count, 0);
    const result: CastCount[] = [{ comparisonKey: `${abilityID}:total`, abilityID, abilityName: name, targetCategory: "total", count: total }];
    if ((categories.get("ally") ?? 0) > 0 && (categories.get("enemy") ?? 0) > 0) {
      result.push(
        { comparisonKey: `${abilityID}:ally`, abilityID, abilityName: `${name}${categoryLabel.ally}`, targetCategory: "ally", count: categories.get("ally") ?? 0 },
        { comparisonKey: `${abilityID}:enemy`, abilityID, abilityName: `${name}${categoryLabel.enemy}`, targetCategory: "enemy", count: categories.get("enemy") ?? 0 },
      );
    }
    return result;
  })
    .sort((left, right) => left.abilityName.localeCompare(right.abilityName, "pt-BR") || left.abilityID - right.abilityID);
}
