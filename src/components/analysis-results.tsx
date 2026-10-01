"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LogSummary } from "@/components/log-summary";
import type { AbilityComparison, AnalysisResult, Observation } from "@/types/analysis";

/** Formata contagens sem arredondar os valores calculados pelo domínio. */
function formatNumber(value: number, sign = false): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 10,
    signDisplay: sign ? "always" : "auto",
  }).format(value);
}

/** Aplica busca por habilidade e a opção de ocultar observações neutras. */
function filterComparisons(
  comparisons: AbilityComparison[],
  search: string,
  hideNeutral: boolean,
): AbilityComparison[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  return comparisons.filter(
    (comparison) =>
      (normalizedSearch === "" ||
        comparison.abilityName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) &&
      (!hideNeutral || comparison.difference !== 0),
  );
}

/** Dá uma classe visual à observação sem depender de cor para transmitir severidade. */
function observationClass(observation: Observation): string {
  return `observation observation-${observation.severity}`;
}

/** Oferece filtros locais para a análise já calculada no servidor. */
export function AnalysisResults({
  analysis,
  returnHref,
}: {
  analysis: AnalysisResult;
  returnHref: string;
}) {
  const [search, setSearch] = useState("");
  const [hideNeutral, setHideNeutral] = useState(false);
  const visibleComparisons = useMemo(
    () => filterComparisons(analysis.comparisons, search, hideNeutral),
    [analysis.comparisons, hideNeutral, search],
  );
  const comparisonKey = (comparison: AbilityComparison) =>
    comparison.comparisonKey ?? `${comparison.abilityID}:${comparison.targetCategory ?? "total"}`;
  const observationKey = (observation: Observation) =>
    observation.comparisonKey ?? `${observation.abilityID}:total`;
  const visibleComparisonKeys = useMemo(
    () => new Set(visibleComparisons.map(comparisonKey)),
    [visibleComparisons],
  );
  const visibleObservations = analysis.observations.filter((observation) =>
    visibleComparisonKeys.has(observationKey(observation)),
  );
  return (
    <div className="page-shell analysis-shell">
      <p className="eyebrow">ANÁLISE DE CASTS</p>
      <h1>
        {analysis.logs.player.encounterName}
        <br />
        <span>em comparação.</span>
      </h1>
      <p className="intro-copy">
        Contagens absolutas de casts concluídos. A tabela inclui habilidades usadas ao menos cinco
        vezes por cada referência, em ordem decrescente da média. Duração, estratégia, talentos e
        equipamento não são normalizados nem avaliados.
      </p>
      <section className="summary-section" aria-labelledby="logs-title">
        <div className="section-heading">
          <p className="eyebrow">OS TRÊS LOGS</p>
          <h2 id="logs-title">Contexto da comparação</h2>
        </div>
        <div className="reference-grid">
          <LogSummary label="Você" metadata={analysis.logs.player} />
          <LogSummary
            label="Referência 1"
            metadata={analysis.logs.referenceOne}
            percentile={analysis.referencePercentiles.referenceOne}
          />
          <LogSummary
            label="Referência 2"
            metadata={analysis.logs.referenceTwo}
            percentile={analysis.referencePercentiles.referenceTwo}
          />
        </div>
      </section>
      <section className="observations-section" aria-labelledby="observations-title">
        <div className="section-heading">
          <p className="eyebrow">OBSERVAÇÕES</p>
          <h2 id="observations-title">Diferenças encontradas</h2>
        </div>
        {visibleObservations.length > 0 ? (
          <ul className="observation-list">
            {visibleObservations.map((observation) => (
              <li className={observationClass(observation)} key={observationKey(observation)}>
                <strong>
                  {observation.severity === "critical"
                    ? "Ausência"
                    : observation.severity === "warning"
                      ? "Abaixo da média"
                      : observation.severity === "positive"
                        ? "Acima da média"
                        : "Na média"}
                </strong>
                <span>{observation.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Nenhuma observação corresponde aos filtros atuais.</p>
        )}
      </section>
      <section className="comparison-section" aria-labelledby="comparison-title">
        <div className="section-heading comparison-heading">
          <div>
            <p className="eyebrow">TABELA COMPLETA</p>
            <h2 id="comparison-title">Todas as habilidades</h2>
          </div>
          <p aria-live="polite" className="result-count">
            {visibleComparisons.length} de {analysis.comparisons.length} habilidades
          </p>
        </div>
        <div className="filters">
          <label className="search-label" htmlFor="ability-search">
            Buscar habilidade
            <input
              id="ability-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: Holy Shock"
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hideNeutral}
              onChange={(event) => setHideNeutral(event.target.checked)}
            />
            Ocultar resultados neutros
          </label>
        </div>
        {visibleComparisons.length > 0 ? (
          <div className="table-wrap" tabIndex={0} aria-label="Tabela de comparação de casts">
            <table>
              <thead>
                <tr>
                  <th>Habilidade</th>
                  <th>Você</th>
                  <th>Referência 1 ({analysis.logs.referenceOne.characterName})</th>
                  <th>Referência 2 ({analysis.logs.referenceTwo.characterName})</th>
                  <th>Média</th>
                  <th>Diferença</th>
                </tr>
              </thead>
              <tbody>
                {visibleComparisons.map((comparison) => (
                  <tr key={comparisonKey(comparison)}>
                    <th scope="row">{comparison.abilityName}</th>
                    <td>{formatNumber(comparison.playerCasts)}</td>
                    <td>{formatNumber(comparison.referenceOneCasts)}</td>
                    <td>{formatNumber(comparison.referenceTwoCasts)}</td>
                    <td>{formatNumber(comparison.referenceAverage)}</td>
                    <td
                      className={
                        comparison.difference < 0
                          ? "difference-negative"
                          : comparison.difference > 0
                            ? "difference-positive"
                            : "difference-neutral"
                      }
                    >
                      {formatNumber(comparison.difference, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Nenhuma habilidade corresponde aos filtros atuais.</p>
        )}
      </section>
      <Link className="button-link" href={returnHref}>
        ← Voltar ao formulário
      </Link>
    </div>
  );
}
