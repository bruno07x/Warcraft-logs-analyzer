/** Categorias internas convertidas em mensagens seguras na fronteira da integração. */
export type WarcraftLogsErrorCode =
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "not_found"
  | "invalid_response"
  | "unavailable";

/** Erro conhecido sem credenciais, tokens, GraphQL ou payload externo na mensagem pública. */
export class WarcraftLogsError extends Error {
  /** Cria um erro classificado preservando a causa apenas no servidor. */
  constructor(
    public readonly code: WarcraftLogsErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WarcraftLogsError";
  }
}

/** Normaliza falhas desconhecidas sem vazar detalhes do transporte ao usuário. */
export function asWarcraftLogsError(error: unknown): WarcraftLogsError {
  if (error instanceof WarcraftLogsError) return error;
  return new WarcraftLogsError(
    "unavailable",
    "O Warcraft Logs está indisponível no momento. Tente novamente em instantes.",
    { cause: error },
  );
}
