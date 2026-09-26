import assert from "node:assert/strict";
import test from "node:test";
import { compareCasts } from "../src/lib/analysis/compare-casts";
import { createObservations } from "../src/lib/analysis/observations";
import type { AbilityComparison, CastCount } from "../src/types/analysis";

function cast(abilityID: number, abilityName: string, count: number): CastCount {
  return { abilityID, abilityName, count };
}

test("considera apenas habilidades usadas ao menos cinco vezes por ambas as referências", () => {
  const comparisons = compareCasts(
    [cast(1, "Elegível", 0), cast(2, "Pouca referência 1", 8), cast(3, "Pouca referência 2", 4)],
    [cast(1, "Elegível", 5), cast(2, "Pouca referência 1", 4), cast(3, "Pouca referência 2", 8)],
    [cast(1, "Elegível", 7), cast(2, "Pouca referência 1", 8), cast(3, "Pouca referência 2", 4)],
  );

  assert.deepEqual(comparisons.map((comparison) => comparison.abilityID), [1]);
});

test("ordena habilidades elegíveis pela maior média das referências", () => {
  const comparisons = compareCasts(
    [cast(1, "Alfa", 8), cast(2, "Zeta", 8), cast(3, "Beta", 8)],
    [cast(1, "Alfa", 8), cast(2, "Zeta", 12), cast(3, "Beta", 10)],
    [cast(1, "Alfa", 8), cast(2, "Zeta", 10), cast(3, "Beta", 10)],
  );

  assert.deepEqual(comparisons.map((comparison) => comparison.abilityID), [2, 3, 1]);
});

test("não marca ausência quando somente uma referência passou do limiar", () => {
  const comparison: AbilityComparison = {
    abilityID: 1,
    abilityName: "Proteção",
    playerCasts: 0,
    referenceOneCasts: 8,
    referenceTwoCasts: 4,
    referenceAverage: 6,
    difference: -6,
  };

  assert.notEqual(createObservations([comparison])[0].severity, "critical");
});
