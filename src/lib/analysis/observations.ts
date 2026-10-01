import type { AbilityComparison, Observation } from "@/types/analysis";
import { MINIMUM_REFERENCE_CASTS } from "./compare-casts";

const severityOrder: Record<Observation["severity"], number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

/** Formata contagens fracionárias sem mudar o valor usado pela comparação. */
function formatDifference(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 }).format(value);
}

/** Seleciona texto singular ou plural conforme a diferença observada. */
function timesLabel(value: number): string {
  return value === 1 ? "vez" : "vezes";
}

/** Converte uma comparação em descrição observável, sem prescrever uma decisão de jogo. */
function createObservation(comparison: AbilityComparison): Observation {
  if (
    comparison.playerCasts === 0 &&
    comparison.referenceOneCasts >= MINIMUM_REFERENCE_CASTS &&
    comparison.referenceTwoCasts >= MINIMUM_REFERENCE_CASTS
  ) {
    return {
      comparisonKey: comparison.comparisonKey,
      abilityID: comparison.abilityID,
      severity: "critical",
      message: `Você não utilizou “${comparison.abilityName}”; as referências utilizaram essa habilidade.`,
    };
  }

  if (comparison.difference < 0) {
    const difference = Math.abs(comparison.difference);
    return {
      comparisonKey: comparison.comparisonKey,
      abilityID: comparison.abilityID,
      severity: "warning",
      message: `Você utilizou “${comparison.abilityName}” ${formatDifference(difference)} ${timesLabel(difference)} menos que a média das referências.`,
    };
  }

  if (comparison.difference > 0) {
    return {
      comparisonKey: comparison.comparisonKey,
      abilityID: comparison.abilityID,
      severity: "positive",
      message: `Você utilizou “${comparison.abilityName}” ${formatDifference(comparison.difference)} ${timesLabel(comparison.difference)} mais que a média das referências.`,
    };
  }

  return {
    comparisonKey: comparison.comparisonKey,
    abilityID: comparison.abilityID,
    severity: "neutral",
    message: `Você igualou a média das referências em “${comparison.abilityName}”.`,
  };
}

/**
 * Cria uma observação para cada habilidade e prioriza ausências antes de outras diferenças.
 * O desempate por identificador mantém a ordem estável quando nomes coincidem.
 */
export function createObservations(comparisons: AbilityComparison[]): Observation[] {
  return comparisons.map(createObservation).sort((left, right) => {
    const severityDifference = severityOrder[left.severity] - severityOrder[right.severity];
    return (
      severityDifference ||
      (left.comparisonKey ?? `${left.abilityID}:total`).localeCompare(
        right.comparisonKey ?? `${right.abilityID}:total`,
      )
    );
  });
}
