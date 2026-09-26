"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { EXAMPLE_LOG_URL, LOG_FIELDS, serializeLogInputs } from "@/lib/validation/analysis-input";
import { parseLogUrl } from "@/lib/validation/log-url";
import type { LogInputs, LogSlot } from "@/types/analysis";

/**
 * Exibe erros junto aos três campos e navega apenas quando todos forem válidos.
 * O formulário GET também permite a validação no servidor sem JavaScript.
 */
export function LogForm({ initialInputs }: { initialInputs: LogInputs }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Partial<Record<LogSlot, string>>>({});
  const [isPending, startTransition] = useTransition();

  /** Limpa a mensagem do campo em edição sem alterar os valores dos outros logs. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const slot = event.currentTarget.name as LogSlot;
    const nextErrors = { ...errors };
    delete nextErrors[slot];
    setErrors(nextErrors);
  }

  /** Valida cada URL, foca o primeiro erro e preserva os valores na navegação. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const inputs: LogInputs = { player: "", referenceOne: "", referenceTwo: "" };
    const nextErrors: Partial<Record<LogSlot, string>> = {};
    let firstInvalid: LogSlot | undefined;

    for (const { slot } of LOG_FIELDS) {
      inputs[slot] = String(data.get(slot) ?? "");
      const result = parseLogUrl(inputs[slot]);
      if (!result.ok) {
        nextErrors[slot] = result.error.message;
        firstInvalid ??= slot;
      }
    }

    setErrors(nextErrors);
    if (firstInvalid) {
      const field = form.elements.namedItem(firstInvalid);
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }

    /** Mantém o botão em estado de espera até a nova página estar disponível. */
    function navigateToAnalysis() {
      router.push(`/analysis?${serializeLogInputs(inputs)}`);
    }
    startTransition(navigateToAnalysis);
  }

  /** Associa exemplo e erro ao campo, mantendo labels consistentes entre as páginas. */
  function renderField({ slot, label, description }: (typeof LOG_FIELDS)[number], index: number) {
    const error = errors[slot];
    return (
      <div className="log-field" key={slot}>
        <label htmlFor={slot}><span className="field-number" aria-hidden="true">0{index + 1}</span>{label}</label>
        <p id={`${slot}-description`} className="field-description">{description}</p>
        <input
          id={slot}
          name={slot}
          type="url"
          required
          defaultValue={initialInputs[slot]}
          placeholder="https://www.warcraftlogs.com/reports/…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={`${slot}-description ${slot}-example${error ? ` ${slot}-error` : ""}`}
          onChange={handleChange}
          readOnly={isPending}
        />
        <p className="field-example" id={`${slot}-example`}>Exemplo: <code>{EXAMPLE_LOG_URL}</code></p>
        {error && <p className="field-error" id={`${slot}-error`}>Erro: {error}</p>}
      </div>
    );
  }

  return (
    <form action="/analysis" method="get" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      {LOG_FIELDS.map(renderField)}
      <div className="form-actions">
        <p>Os links ficam no endereço da página para você poder voltar e compartilhá-los.</p>
        <button type="submit" disabled={isPending}>
          {isPending ? "Validando…" : "Validar URLs"}<span aria-hidden="true"> →</span>
        </button>
      </div>
      <p className="sr-only" role="status">
        {Object.keys(errors).length > 0 ? "Há URLs inválidas. Revise os campos indicados." : isPending ? "Preparando os links." : ""}
      </p>
    </form>
  );
}
