import type { LogMetadata } from "@/types/analysis";

/** Formata uma duração em milissegundos para uma leitura compacta na tela. */
function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Formata atributos inteiros ou fracionários conforme retornados pelo relatório. */
function formatStat(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

/** Apresenta os metadados conhecidos de um personagem sem bloquear campos ausentes. */
export function LogSummary({
  metadata,
  label,
  percentile,
}: {
  metadata: LogMetadata;
  label: string;
  percentile?: number;
}) {
  const details = [
    metadata.className,
    metadata.specialization,
    metadata.difficulty ? `Dificuldade ${metadata.difficulty}` : undefined,
    metadata.kill === undefined ? undefined : metadata.kill ? "Vitória" : "Tentativa",
  ].filter((detail): detail is string => Boolean(detail));
  return (
    <section
      className="panel log-summary"
      aria-labelledby={`${metadata.reportCode}-${metadata.sourceID}-title`}
    >
      <p className="summary-label">{label}</p>
      <h2 id={`${metadata.reportCode}-${metadata.sourceID}-title`}>{metadata.characterName}</h2>
      <p className="summary-code">
        <code>{metadata.reportCode}</code> · luta {metadata.fightID} ·{" "}
        {formatDuration(metadata.durationMs)}
      </p>
      {details.length > 0 && <p className="summary-details">{details.join(" · ")}</p>}
      {percentile !== undefined && (
        <p className="summary-details">
          Percentil:{" "}
          {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(percentile)}%
        </p>
      )}
      {metadata.combatStats.length > 0 && (
        <dl className="combat-stats">
          {metadata.combatStats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{formatStat(stat.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <a className="report-link" href={metadata.reportUrl} target="_blank" rel="noreferrer">
        Abrir log ↗
      </a>
    </section>
  );
}
