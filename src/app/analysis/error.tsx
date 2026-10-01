"use client";

/** Apresenta uma falha inesperada sem revelar a exceção e permite nova tentativa. */
export default function AnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <div className="page-shell result-shell">
      <p className="eyebrow">FALHA INESPERADA</p>
      <h1>
        Não foi possível
        <br />
        <span>continuar.</span>
      </h1>
      <div className="panel error-panel" role="alert">
        <h2>Tente novamente</h2>
        <p>
          Ocorreu uma falha inesperada ao preparar a análise. Seus links continuam no endereço desta
          página.
        </p>
      </div>
      <button type="button" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
