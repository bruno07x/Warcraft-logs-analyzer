import type {
  AnalysisSearchParams,
  LogReference,
  Result,
} from "@/types/analysis";
import { parseLogUrl } from "./log-url";

export const LOG_FIELD = { slot: "player", label: "Seu log", description: "O personagem que você quer analisar." } as const;

export const EXAMPLE_LOG_URL =
  "https://www.warcraftlogs.com/reports/acAK7PwjZnvrGLq8?fight=2&type=healing&source=235";

/**
 * Valida o log do jogador antes de qualquer trabalho externo, inclusive em acesso direto.
 * @param params Query parameters originais; arrays são rejeitados como ambíguos.
 * @returns As três referências ou o primeiro erro, identificado pelo seu slot.
 */
export function validateAnalysisInput(
  params: AnalysisSearchParams,
): Result<LogReference> {
  const input = params.player;
  if (Array.isArray(input)) return { ok: false, error: { code: "duplicate_log", message: "Informe apenas uma URL para seu log.", slot: "player" } };
  const parsed = parseLogUrl(input ?? "");
  return parsed.ok ? parsed : { ok: false, error: { ...parsed.error, slot: "player" } };
}

/**
 * Recupera valores para edição, sem considerá-los validados.
 * Em parâmetros repetidos, preserva o primeiro valor para o usuário corrigir.
 * A validação server-side sempre recebe os parâmetros originais, sem esta redução.
 */
export function readLogInputs(params: AnalysisSearchParams): string {
  const value = params.player;
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Serializa somente os campos do formulário, escapando URLs aninhadas com segurança. */
export function serializeLogInputs(input: string): string {
  return new URLSearchParams({ player: input }).toString();
}
