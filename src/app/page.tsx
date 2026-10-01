import { LogForm } from "@/components/log-form";
import { readLogInputs, serializeLogInputs } from "@/lib/validation/analysis-input";
import type { AnalysisSearchParams } from "@/types/analysis";

/**
 * Renderiza a entrada no servidor e recupera os valores de um link de retorno.
 * A chave reinicia o estado do formulário quando a navegação muda esses valores.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<AnalysisSearchParams>;
}) {
  const inputs = readLogInputs(await searchParams);

  return (
    <div className="page-shell">
      <section className="intro" aria-labelledby="home-title">
        <p className="eyebrow">CADA CAST CONTA</p>
        <h1 id="home-title">
          Um novo olhar
          <br />
          sobre seus <span>logs.</span>
        </h1>
        <p className="intro-copy">
          Informe seu log; encontraremos duas referências do mesmo encontro para comparar suas
          habilidades.
        </p>
      </section>
      <div className="entry-grid">
        <section className="panel form-panel" aria-labelledby="form-title">
          <div className="panel-heading">
            <span className="step-marker" aria-hidden="true">
              01
            </span>
            <div>
              <h2 id="form-title">Comece pelo seu log</h2>
              <p>
                Selecione a luta e o personagem; as referências serão encontradas automaticamente.
              </p>
            </div>
          </div>
          <LogForm key={serializeLogInputs(inputs)} initialInput={inputs} />
        </section>
        <aside className="guide" aria-labelledby="guide-title">
          <p className="eyebrow">ANTES DE COMEÇAR</p>
          <h2 id="guide-title">
            Boas referências,
            <br />
            mais contexto.
          </h2>
          <ol className="guide-list">
            <li>
              <strong>Use relatórios públicos</strong>
              <p>Copie a URL da barra de endereços no Warcraft Logs.</p>
            </li>
            <li>
              <strong>Escolha o mesmo encontro</strong>
              <p>Prefira lutas de duração semelhante para uma comparação útil.</p>
            </li>
            <li>
              <strong>Identifique o personagem</strong>
              <p>
                O endereço precisa incluir os parâmetros <code>fight</code> e <code>source</code>.
              </p>
            </li>
          </ol>
          <div className="notice">
            <strong>Primeira etapa: validar os links</strong>
            <p>
              Por enquanto, confirmamos apenas o formato das URLs. A consulta aos relatórios e a
              comparação de casts estarão disponíveis nas próximas etapas.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
