import type { LogReference, Result } from "@/types/analysis";

/**
 * Lê um único identificador decimal positivo, sem coerções como "2e3" ou "2.5".
 * @returns O inteiro seguro, ou null quando ausente, repetido ou inválido.
 */
function readPositiveID(params: URLSearchParams, name: string): number | null {
  const values = params.getAll(name);
  if (values.length !== 1 || !/^[0-9]+$/.test(values[0])) return null;

  const value = Number(values[0]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Extrai relatório, luta e personagem de uma URL oficial do Warcraft Logs.
 * Não consulta a API: formato válido não comprova existência ou acesso público.
 * Parâmetros desconhecidos e fragmentos não participam da identificação.
 * @param input URL colada pelo usuário, com espaços externos opcionais.
 * @returns Identificadores ou erro de domínio; entradas inválidas não lançam exceção.
 */
export function parseLogUrl(input: string): Result<LogReference> {
  const text = input.trim();
  if (!text) {
    return { ok: false, error: { code: "missing_url", message: "Informe a URL deste log." } };
  }

  // URL normaliza barras invertidas e alguns espaços; rejeitá-los evita aceitar
  // uma origem escrita de forma ambígua antes de analisar seus componentes.
  if (!/^https:\/\//i.test(text) || /[\s\\]/.test(text)) {
    return {
      ok: false,
      error: { code: "invalid_url", message: "Use uma URL completa iniciada por https://www.warcraftlogs.com/reports/." },
    };
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: { code: "invalid_url", message: "A URL não é válida. Copie o endereço completo do relatório." } };
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.warcraftlogs.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return {
      ok: false,
      error: { code: "invalid_origin", message: "Use apenas https://www.warcraftlogs.com, sem credenciais ou portas alternativas." },
    };
  }

  const reportMatch = /^\/reports\/([a-zA-Z0-9]+)\/?$/.exec(url.pathname);
  if (!reportMatch) {
    return {
      ok: false,
      error: { code: "invalid_report", message: "A URL deve conter /reports/ seguido pelo código do relatório." },
    };
  }

  const fightID = readPositiveID(url.searchParams, "fight");
  if (fightID === null) {
    return {
      ok: false,
      error: { code: "invalid_fight", message: "Selecione uma luta específica: fight deve aparecer uma vez, com um número inteiro positivo." },
    };
  }

  const sourceID = readPositiveID(url.searchParams, "source");
  if (sourceID === null) {
    return {
      ok: false,
      error: { code: "invalid_source", message: "Selecione um personagem: source deve aparecer uma vez, com um número inteiro positivo." },
    };
  }

  return { ok: true, value: { reportCode: reportMatch[1], fightID, sourceID } };
}
