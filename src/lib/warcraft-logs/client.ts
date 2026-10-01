import "server-only";
import { clearAccessToken, getAccessToken } from "./auth";
import { WarcraftLogsError } from "./errors";

const GRAPHQL_URL = "https://www.warcraftlogs.com/api/v2/client";
const REQUEST_TIMEOUT_MS = 15_000;

/** Extrai somente a mensagem pública segura de uma falha HTTP conhecida. */
function errorForStatus(status: number): WarcraftLogsError {
  if (status === 401 || status === 403) {
    return new WarcraftLogsError(
      "authentication",
      "Não foi possível autenticar a integração com o Warcraft Logs.",
    );
  }
  if (status === 429) {
    return new WarcraftLogsError(
      "rate_limit",
      "O Warcraft Logs limitou as consultas. Tente novamente em instantes.",
    );
  }
  if (status === 404) {
    return new WarcraftLogsError("not_found", "O relatório não foi encontrado ou não é público.");
  }
  return new WarcraftLogsError(
    "unavailable",
    "O Warcraft Logs está indisponível no momento. Tente novamente em instantes.",
  );
}

/** Executa uma chamada GraphQL autenticada e retorna o payload ainda não validado. */
async function requestGraphQL(
  query: string,
  variables: Record<string, unknown>,
  mayRenewToken: boolean,
): Promise<unknown> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401 && mayRenewToken) {
      clearAccessToken();
      return requestGraphQL(query, variables, false);
    }
    if (!response.ok) throw errorForStatus(response.status);

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      throw new WarcraftLogsError(
        "invalid_response",
        "O Warcraft Logs retornou uma resposta inesperada.",
      );
    }
    const envelope = payload as Record<string, unknown>;
    if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
      throw new WarcraftLogsError(
        "invalid_response",
        "O Warcraft Logs não conseguiu processar a consulta.",
      );
    }
    if (!("data" in envelope)) {
      throw new WarcraftLogsError(
        "invalid_response",
        "O Warcraft Logs retornou uma resposta inesperada.",
      );
    }
    return envelope.data;
  } catch (error) {
    if (error instanceof WarcraftLogsError) throw error;
    if (error instanceof SyntaxError) {
      throw new WarcraftLogsError(
        "invalid_response",
        "O Warcraft Logs retornou uma resposta inesperada.",
        { cause: error },
      );
    }
    throw new WarcraftLogsError(
      "unavailable",
      "O Warcraft Logs está indisponível no momento. Tente novamente em instantes.",
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Consulta a API pública e obriga o chamador a validar o payload antes de usá-lo.
 * Uma resposta 401 renova o token uma única vez; outras falhas nunca são repetidas.
 */
export async function queryWarcraftLogs<T>(
  query: string,
  variables: Record<string, unknown>,
  decode: (value: unknown) => T,
): Promise<T> {
  return decode(await requestGraphQL(query, variables, true));
}
