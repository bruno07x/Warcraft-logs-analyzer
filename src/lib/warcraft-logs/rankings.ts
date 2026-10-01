import "server-only";
import type { LogReference, RankingMetric, Result } from "@/types/analysis";
import { queryWarcraftLogs } from "./client";
import { asWarcraftLogsError, WarcraftLogsError } from "./errors";
import { RANKING_CANDIDATES_QUERY, REPORT_ACTORS_QUERY, REPORT_RANKINGS_QUERY } from "./queries";

export type RankingCandidate = {
  reportCode: string;
  fightID: number;
  characterName: string;
  className: string;
  specialization: string;
  durationMs: number;
};
export type RankingPage = {
  candidates: RankingCandidate[];
  hasMorePages: boolean;
};
const bad = () => {
  throw new WarcraftLogsError(
    "invalid_response",
    "O Warcraft Logs retornou uma resposta inesperada.",
  );
};
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : bad();
const number = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : bad();
const integer = (value: unknown): number =>
  Number.isSafeInteger(number(value)) ? number(value) : bad();
const text = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value : bad();
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : bad());
const boolean = (value: unknown): boolean => (typeof value === "boolean" ? value : bad());

/** Busca uma página de candidatos ordenados pelo ranking público da especialização. */
export async function fetchRankingCandidates(
  criteria: {
    encounterID: number;
    difficulty: number;
    bracket: number;
    metric: RankingMetric;
    className: string;
    specialization: string;
  },
  page: number,
): Promise<Result<RankingPage>> {
  try {
    const candidates = await queryWarcraftLogs(
      RANKING_CANDIDATES_QUERY,
      { ...criteria, specName: criteria.specialization, page },
      (value) => {
        const encounter = object(object(value).worldData).encounter;
        const ranked = object(object(encounter).characterRankings);
        const candidates = list(ranked.rankings).flatMap((entry): RankingCandidate[] => {
          const row = object(entry);
          const report = object(row.report);
          const fightID = report.fightID;
          if (
            typeof report.code !== "string" ||
            report.code.trim().length === 0 ||
            typeof fightID !== "number" ||
            !Number.isSafeInteger(fightID) ||
            fightID <= 0
          )
            return [];
          return [
            {
              reportCode: report.code,
              fightID,
              characterName: text(row.name),
              className: text(row.class),
              specialization: text(row.spec),
              durationMs: number(row.duration),
            },
          ];
        });
        return { candidates, hasMorePages: boolean(ranked.hasMorePages) };
      },
    );
    return { ok: true, value: candidates };
  } catch (error) {
    const known = asWarcraftLogsError(error);
    return {
      ok: false,
      error: {
        code: known.code,
        message: "Não foi possível consultar os rankings do Warcraft Logs.",
      },
    };
  }
}

/** Resolve o ator local de um ranking público pelo nome, classe e luta do relatório. */
export async function resolveRankingReference(
  candidate: RankingCandidate,
): Promise<Result<LogReference>> {
  try {
    const reference = await queryWarcraftLogs(
      REPORT_ACTORS_QUERY,
      { code: candidate.reportCode, fightIDs: [candidate.fightID] },
      (value) => {
        const report = object(object(object(value).reportData).report);
        const fights = list(report.fights);
        if (fights.length !== 1) bad();
        const fight = object(fights[0]);
        const friendly = new Set(list(fight.friendlyPlayers).map(integer));
        const actors = list(object(report.masterData).actors);
        const matches = actors
          .map(object)
          .filter(
            (actor) =>
              friendly.has(integer(actor.id)) &&
              actor.type === "Player" &&
              actor.petOwner === null &&
              actor.name === candidate.characterName &&
              actor.subType === candidate.className,
          );
        if (matches.length !== 1)
          throw new WarcraftLogsError(
            "not_found",
            "O personagem do ranking não foi encontrado no relatório.",
          );
        return {
          reportCode: candidate.reportCode,
          fightID: candidate.fightID,
          sourceID: integer(matches[0].id),
        };
      },
    );
    return { ok: true, value: reference };
  } catch (error) {
    const known = asWarcraftLogsError(error);
    return {
      ok: false,
      error: {
        code: known.code,
        message: "O relatório de uma referência não está disponível.",
      },
    };
  }
}

/** Recupera o percentil real publicado pelo relatório para o personagem selecionado. */
export async function fetchRankingPercentile(
  reference: LogReference,
  characterName: string,
  className: string,
  specialization: string,
  metric: RankingMetric,
): Promise<Result<number>> {
  try {
    const percentile = await queryWarcraftLogs(
      REPORT_RANKINGS_QUERY,
      {
        code: reference.reportCode,
        fightIDs: [reference.fightID],
        playerMetric: metric,
      },
      (value) => {
        const report = object(object(object(value).reportData).report);
        const rankings = object(report.rankings);
        const data = list(rankings.data);
        if (data.length !== 1) bad();
        const roles = object(object(data[0]).roles);
        const players = Object.values(roles)
          .flatMap((role) => Object.values(object(role).characters ?? {}))
          .map(object);
        const match = players.find(
          (player) =>
            player.name === characterName &&
            player.class === className &&
            player.spec === specialization,
        );
        const result = number(match?.rankPercent);
        if (result < 0 || result > 100) bad();
        return result;
      },
    );
    return { ok: true, value: percentile };
  } catch (error) {
    const known = asWarcraftLogsError(error);
    return {
      ok: false,
      error: {
        code: known.code,
        message: "O percentil da referência não está disponível.",
      },
    };
  }
}
