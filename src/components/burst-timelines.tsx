import type { BurstCast, BurstTimelines as BurstTimelinesData, LogSlot } from "@/types/analysis";
import { AbilityIcon } from "@/components/ability-icon";

const TIMELINE_SLOTS: { slot: LogSlot; label: string }[] = [
  { slot: "player", label: "Você" },
  { slot: "referenceOne", label: "Referência 1" },
  { slot: "referenceTwo", label: "Referência 2" },
];

/** Formata o offset temporal em segundos com uma casa decimal em pt-BR. */
function formatOffset(offsetMs: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(offsetMs / 1_000);
}

/** Formata a duração da janela em segundos, com a unidade no singular ou plural. */
function formatDuration(durationMs: number): string {
  const seconds = durationMs / 1_000;
  const formattedSeconds = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(seconds);
  return `${formattedSeconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}

/** Agrupa os casts por habilidade e ordena as contagens da maior para a menor. */
function summarizeCasts(casts: BurstCast[]) {
  const totals = new Map<number, { name: string; icon?: string; count: number }>();
  for (const cast of casts) {
    const total = totals.get(cast.abilityID);
    if (total) {
      total.count += 1;
    } else {
      totals.set(cast.abilityID, {
        name: cast.abilityName,
        icon: cast.abilityIcon,
        count: 1,
      });
    }
  }
  return [...totals.entries()]
    .map(([abilityID, total]) => ({ abilityID, ...total }))
    .sort((left, right) => right.count - left.count);
}

/** Exibe até duas janelas de burst alinhadas por offset para os três logs. */
export function BurstTimelines({
  timelines,
  characterNames,
}: {
  timelines: BurstTimelinesData;
  characterNames: Record<LogSlot, string>;
}) {
  return (
    <section className="burst-timelines-section" aria-labelledby="burst-timelines-title">
      <div className="section-heading">
        <p className="eyebrow">SEQUÊNCIA DE HABILIDADES</p>
        <h2 id="burst-timelines-title">
          Timelines de burst (janela de {formatDuration(timelines.durationMs)})
        </h2>
      </div>
      <div className="burst-window-grid">
        {[0, 1].map((windowIndex) => {
          const columns = TIMELINE_SLOTS.map(({ slot, label }) => {
            const window = timelines[slot][windowIndex];
            return {
              slot,
              label,
              window,
              totals: window ? summarizeCasts(window.casts) : [],
            };
          });
          const maxSummaryAbilityCount = Math.max(...columns.map(({ totals }) => totals.length));
          const summaryMinHeight = 48 + maxSummaryAbilityCount * 31;

          return (
            <section
              className="burst-window panel"
              aria-labelledby={`burst-window-${windowIndex + 1}-title`}
              key={windowIndex}
            >
              <h3 id={`burst-window-${windowIndex + 1}-title`}>Burst {windowIndex + 1}</h3>
              <div className="burst-columns">
                {columns.map(({ slot, label, window, totals }) => (
                  <section className="burst-column" key={slot}>
                    <h4>
                      {label}
                      <span>{characterNames[slot]}</span>
                    </h4>
                    {window ? (
                      <>
                        <ol className="burst-cast-list">
                          {window.casts.map((cast, castIndex) => (
                            <li
                              className="burst-cast"
                              key={`${cast.offsetMs}-${cast.abilityID}-${castIndex}`}
                            >
                              <time dateTime={`PT${cast.offsetMs / 1_000}S`}>
                                {formatOffset(cast.offsetMs)}s
                              </time>
                              <span className="ability-label burst-ability-label">
                                <AbilityIcon icon={cast.abilityIcon} />
                                <span className="ability-name" title={cast.abilityName}>
                                  {cast.abilityName}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ol>
                        <div className="burst-cast-summary" style={{ minHeight: summaryMinHeight }}>
                          <h5>Totais na janela</h5>
                          <ul>
                            {totals.map((total) => (
                              <li key={total.abilityID}>
                                <span className="ability-label burst-ability-label">
                                  <AbilityIcon icon={total.icon} />
                                  <span className="ability-name" title={total.name}>
                                    {total.name}
                                  </span>
                                </span>
                                <strong>{total.count}x</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <p className="burst-missing">Burst não ativado</p>
                    )}
                  </section>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
