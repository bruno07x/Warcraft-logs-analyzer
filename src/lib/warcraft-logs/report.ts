import "server-only";
import type { FetchedLog, LogReference, Result } from "@/types/analysis";
import { queryWarcraftLogs } from "./client";
import { asWarcraftLogsError, WarcraftLogsError } from "./errors";
import { REPORT_CASTS_QUERY, REPORT_METADATA_QUERY } from "./queries";
import { decodeEventPage, decodeReportMetadata } from "./schemas";

/** Mensagens públicas por categoria, sem conteúdo do GraphQL ou da exceção original. */
function publicMessage(code: ReturnType<typeof asWarcraftLogsError>["code"]): string {
  switch (code) {
    case "configuration":
      return "A integração com o Warcraft Logs ainda não foi configurada neste servidor.";
    case "authentication":
      return "Não foi possível autenticar a integração com o Warcraft Logs.";
    case "rate_limit":
      return "O Warcraft Logs limitou as consultas. Tente novamente em instantes.";
    case "not_found":
      return "O relatório, a luta ou o personagem não foi encontrado ou não é público.";
    case "invalid_response":
      return "O Warcraft Logs retornou dados que não puderam ser validados.";
    case "unavailable":
      return "O Warcraft Logs está indisponível no momento. Tente novamente em instantes.";
  }
}

/**
 * Busca metadados e todas as páginas de casts para uma referência pública.
 * Nenhum resultado parcial é devolvido quando qualquer página falha.
 */
export async function fetchLog(reference: LogReference): Promise<Result<FetchedLog>> {
  try {
    const metadataPayload = await queryWarcraftLogs(
      REPORT_METADATA_QUERY,
      { code: reference.reportCode, fightIDs: [reference.fightID] },
      (value) => decodeReportMetadata(value, reference),
    );
    const casts = [];
    let cursor = metadataPayload.startTime;
    const seenCursors = new Set<number>();

    while (cursor < metadataPayload.endTime) {
      if (seenCursors.has(cursor)) {
        throw new WarcraftLogsError(
          "invalid_response",
          "O Warcraft Logs retornou uma paginação inválida.",
        );
      }
      seenCursors.add(cursor);
      const page = await queryWarcraftLogs(
        REPORT_CASTS_QUERY,
        {
          code: reference.reportCode,
          fightIDs: [reference.fightID],
          sourceID: reference.sourceID,
          startTime: cursor,
          endTime: metadataPayload.endTime,
        },
        (value) => decodeEventPage(value, reference.sourceID),
      );
      casts.push(...page.events);
      if (page.nextPageTimestamp === null) break;
      if (page.nextPageTimestamp <= cursor || page.nextPageTimestamp > metadataPayload.endTime) {
        throw new WarcraftLogsError(
          "invalid_response",
          "O Warcraft Logs retornou uma paginação inválida.",
        );
      }
      cursor = page.nextPageTimestamp;
    }

    for (const cast of casts) {
      metadataPayload.abilityNames[cast.abilityID] ??= `Habilidade ${cast.abilityID}`;
    }

    return {
      ok: true,
      value: {
        metadata: metadataPayload.metadata,
        casts,
        abilityNames: metadataPayload.abilityNames,
        friendlyActorIDs: metadataPayload.friendlyActorIDs,
      },
    };
  } catch (error) {
    const known = asWarcraftLogsError(error);
    return { ok: false, error: { code: known.code, message: publicMessage(known.code) } };
  }
}
