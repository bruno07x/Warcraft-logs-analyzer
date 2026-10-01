import type { AbilityComparison, CastCount } from "@/types/analysis";

export const MINIMUM_REFERENCE_CASTS = 2;

/** Transforma uma lista de contagens em busca por habilidade e categoria de alvo. */
function indexByComparisonKey(counts: CastCount[]): Map<string, CastCount> {
  return new Map(counts.map((cast) => [cast.comparisonKey ?? `${cast.abilityID}:total`, cast]));
}

/**
 * Considera somente habilidades usadas ao menos três vezes por cada referência,
 * calcula média e diferença sem arredondar e as ordena pela maior média.
 */
export function compareCasts(
  player: CastCount[],
  referenceOne: CastCount[],
  referenceTwo: CastCount[],
): AbilityComparison[] {
  const playerByKey = indexByComparisonKey(player);
  const referenceOneByKey = indexByComparisonKey(referenceOne);
  const referenceTwoByKey = indexByComparisonKey(referenceTwo);
  const comparisonKeys = new Set([
    ...playerByKey.keys(),
    ...referenceOneByKey.keys(),
    ...referenceTwoByKey.keys(),
  ]);

  return [...comparisonKeys]
    .map((comparisonKey) => {
      const playerCast = playerByKey.get(comparisonKey);
      const referenceOneCast = referenceOneByKey.get(comparisonKey);
      const referenceTwoCast = referenceTwoByKey.get(comparisonKey);
      const abilityID =
        playerCast?.abilityID ?? referenceOneCast?.abilityID ?? referenceTwoCast?.abilityID ?? 0;
      const playerCasts = playerCast?.count ?? 0;
      const referenceOneCasts = referenceOneCast?.count ?? 0;
      const referenceTwoCasts = referenceTwoCast?.count ?? 0;
      const referenceAverage = (referenceOneCasts + referenceTwoCasts) / 2;

      return {
        comparisonKey,
        abilityID,
        abilityName:
          playerCast?.abilityName ??
          referenceOneCast?.abilityName ??
          referenceTwoCast?.abilityName ??
          `Habilidade ${abilityID}`,
        targetCategory:
          playerCast?.targetCategory ??
          referenceOneCast?.targetCategory ??
          referenceTwoCast?.targetCategory ??
          "total",
        playerCasts,
        referenceOneCasts,
        referenceTwoCasts,
        referenceAverage,
        difference: playerCasts - referenceAverage,
      };
    })
    .filter(
      (comparison) =>
        comparison.referenceOneCasts >= MINIMUM_REFERENCE_CASTS &&
        comparison.referenceTwoCasts >= MINIMUM_REFERENCE_CASTS,
    )
    .sort(
      (left, right) =>
        right.referenceAverage - left.referenceAverage ||
        left.abilityName.localeCompare(right.abilityName, "pt-BR") ||
        left.abilityID - right.abilityID,
    );
}
