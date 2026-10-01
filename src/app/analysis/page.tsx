import Link from "next/link";
import { AnalysisResults } from "@/components/analysis-results";
import { analyzeLogs } from "@/lib/analysis/analyze-logs";
import {
  readLogInputs,
  serializeLogInputs,
  validateAnalysisInput,
} from "@/lib/validation/analysis-input";
import type { AnalysisSearchParams, LogSlot } from "@/types/analysis";

/** Recupera o rótulo apresentado ao usuário para um slot de log. */
function labelForSlot(slot: LogSlot | undefined): string {
  return slot === "player" ? "Seu log" : "Análise";
}

/** Exibe uma falha esperada, preservando os valores para correção no formulário. */
function AnalysisFailure({
  label,
  message,
  returnHref,
}: {
  label: string;
  message: string;
  returnHref: string;
}) {
  return (
    <div className="page-shell result-shell">
      <p className="eyebrow">NÃO FOI POSSÍVEL ANALISAR</p>
      <h1>
        Precisamos de
        <br />
        uma <span>correção.</span>
      </h1>
      <div className="panel error-panel" role="alert">
        <h2>{label}</h2>
        <p>{message}</p>
      </div>
      <Link className="button-link" href={returnHref}>
        Voltar e corrigir URLs
      </Link>
    </div>
  );
}

/** Valida a query no servidor, coordena a análise e entrega somente dados seguros ao cliente. */
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<AnalysisSearchParams>;
}) {
  const params = await searchParams;
  const parsed = validateAnalysisInput(params);
  const returnHref = `/?${serializeLogInputs(readLogInputs(params))}`;
  if (!parsed.ok)
    return (
      <AnalysisFailure
        label={labelForSlot(parsed.error.slot)}
        message={parsed.error.message}
        returnHref={returnHref}
      />
    );

  const analysis = await analyzeLogs(parsed.value);
  if (!analysis.ok)
    return (
      <AnalysisFailure
        label={labelForSlot(analysis.error.slot)}
        message={analysis.error.message}
        returnHref={returnHref}
      />
    );
  return <AnalysisResults analysis={analysis.value} returnHref={returnHref} />;
}
