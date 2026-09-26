import type { AbilityComparison, CastCount } from "@/types/analysis";

export const MINIMUM_REFERENCE_CASTS = 5;

/** Transforma uma lista de contagens em busca por identificador de habilidade. */
function indexByAbility(counts: CastCount[]): Map<number, CastCount> {
  return new Map(counts.map((cast) => [cast.abilityID, cast]));
}

/**
 * Considera somente habilidades usadas ao menos cinco vezes por cada referência,
 * calcula média e diferença sem arredondar e as ordena pela maior média.
 */
export function compareCasts(
  player: CastCount[],
  referenceOne: CastCount[],
  referenceTwo: CastCount[],
): AbilityComparison[] {
  const playerByAbility = indexByAbility(player);
  const referenceOneByAbility = indexByAbility(referenceOne);
  const referenceTwoByAbility = indexByAbility(referenceTwo);
  const abilityIDs = new Set([
    ...playerByAbility.keys(),
    ...referenceOneByAbility.keys(),
    ...referenceTwoByAbility.keys(),
  ]);

  return [...abilityIDs]
    .map((abilityID) => {
      const playerCast = playerByAbility.get(abilityID);
      const referenceOneCast = referenceOneByAbility.get(abilityID);
      const referenceTwoCast = referenceTwoByAbility.get(abilityID);
      const playerCasts = playerCast?.count ?? 0;
      const referenceOneCasts = referenceOneCast?.count ?? 0;
      const referenceTwoCasts = referenceTwoCast?.count ?? 0;
      const referenceAverage = (referenceOneCasts + referenceTwoCasts) / 2;

      return {
        abilityID,
        abilityName: playerCast?.abilityName ?? referenceOneCast?.abilityName ?? referenceTwoCast?.abilityName ?? `Habilidade ${abilityID}`,
        playerCasts,
        referenceOneCasts,
        referenceTwoCasts,
        referenceAverage,
        difference: playerCasts - referenceAverage,
      };
    })
    .filter((comparison) => comparison.referenceOneCasts >= MINIMUM_REFERENCE_CASTS && comparison.referenceTwoCasts >= MINIMUM_REFERENCE_CASTS)
    .sort((left, right) => right.referenceAverage - left.referenceAverage || left.abilityName.localeCompare(right.abilityName, "pt-BR") || left.abilityID - right.abilityID);
}
