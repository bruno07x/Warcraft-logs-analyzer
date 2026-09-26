import type {
  AnalysisSearchParams,
  LogInputs,
  LogReference,
  LogSlot,
  Result,
} from "@/types/analysis";
import { parseLogUrl } from "./log-url";

export const LOG_FIELDS = [
  { slot: "player", label: "Seu log", description: "O personagem que você quer analisar." },
  { slot: "referenceOne", label: "Referência 1", description: "O primeiro personagem para comparação." },
  { slot: "referenceTwo", label: "Referência 2", description: "O segundo personagem para comparação." },
] as const satisfies ReadonlyArray<{ slot: LogSlot; label: string; description: string }>;

export const EXAMPLE_LOG_URL =
  "https://www.warcraftlogs.com/reports/acAK7PwjZnvrGLq8?fight=2&type=healing&source=235";

/**
 * Valida os três logs antes de qualquer trabalho externo, inclusive em acesso direto.
 * @param params Query parameters originais; arrays são rejeitados como ambíguos.
 * @returns As três referências ou o primeiro erro, identificado pelo seu slot.
 */
export function validateAnalysisInput(
  params: AnalysisSearchParams,
): Result<Record<LogSlot, LogReference>> {
  const references = {} as Record<LogSlot, LogReference>;

  for (const { slot } of LOG_FIELDS) {
    const input = params[slot];
    if (Array.isArray(input)) {
      return {
        ok: false,
        error: { code: "duplicate_log", message: "Informe apenas uma URL para este log.", slot },
      };
    }
    const parsed = parseLogUrl(input ?? "");
    if (!parsed.ok) return { ok: false, error: { ...parsed.error, slot } };
    references[slot] = parsed.value;
  }

  return { ok: true, value: references };
}

/**
 * Recupera valores para edição, sem considerá-los validados.
 * Em parâmetros repetidos, preserva o primeiro valor para o usuário corrigir.
 * A validação server-side sempre recebe os parâmetros originais, sem esta redução.
 */
export function readLogInputs(params: AnalysisSearchParams): LogInputs {
  const inputs: LogInputs = { player: "", referenceOne: "", referenceTwo: "" };
  for (const { slot } of LOG_FIELDS) {
    const value = params[slot];
    inputs[slot] = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  }
  return inputs;
}

/** Serializa somente os campos do formulário, escapando URLs aninhadas com segurança. */
export function serializeLogInputs(inputs: LogInputs): string {
  return new URLSearchParams(inputs).toString();
}
