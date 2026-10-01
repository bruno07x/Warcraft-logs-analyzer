import "server-only";
import { WarcraftLogsError } from "./errors";

const TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | undefined;
let pendingToken: Promise<string> | undefined;

/** Lê uma string não vazia do ambiente sem incluir seu valor em mensagens. */
function requireCredential(
  name: "WARCRAFT_LOGS_CLIENT_ID" | "WARCRAFT_LOGS_CLIENT_SECRET",
): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new WarcraftLogsError(
      "configuration",
      "A integração com o Warcraft Logs ainda não foi configurada neste servidor.",
    );
  }
  return value;
}

/** Verifica o formato mínimo da resposta OAuth antes de armazená-la. */
function decodeTokenResponse(value: unknown): { accessToken: string; expiresIn: number } {
  if (typeof value !== "object" || value === null) {
    throw new WarcraftLogsError(
      "invalid_response",
      "O Warcraft Logs retornou uma resposta inesperada.",
    );
  }
  const data = value as Record<string, unknown>;
  if (
    typeof data.access_token !== "string" ||
    data.access_token.length === 0 ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0
  ) {
    throw new WarcraftLogsError(
      "invalid_response",
      "O Warcraft Logs retornou uma resposta inesperada.",
    );
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/** Solicita e armazena um token com client_credentials, compartilhando requisições concorrentes. */
async function requestAccessToken(): Promise<string> {
  const clientID = requireCredential("WARCRAFT_LOGS_CLIENT_ID");
  const clientSecret = requireCredential("WARCRAFT_LOGS_CLIENT_SECRET");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientID}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new WarcraftLogsError(
        "authentication",
        "Não foi possível autenticar a integração com o Warcraft Logs.",
      );
    }
    if (response.status === 429) {
      throw new WarcraftLogsError(
        "rate_limit",
        "O Warcraft Logs limitou as consultas. Tente novamente em instantes.",
      );
    }
    if (!response.ok) {
      throw new WarcraftLogsError(
        "unavailable",
        "O Warcraft Logs está indisponível no momento. Tente novamente em instantes.",
      );
    }
    const token = decodeTokenResponse(await response.json());
    cachedToken = {
      value: token.accessToken,
      expiresAt: Date.now() + token.expiresIn * 1_000,
    };
    return token.accessToken;
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

/** Retorna um token reutilizável até 60 segundos antes da expiração. */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.value;
  }
  pendingToken ??= requestAccessToken().finally(() => {
    pendingToken = undefined;
  });
  return pendingToken;
}

/** Invalida somente o token em memória para permitir uma renovação após HTTP 401. */
export function clearAccessToken(): void {
  cachedToken = undefined;
}
