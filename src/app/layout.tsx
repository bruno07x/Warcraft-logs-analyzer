import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warcraft Logs Analyzer",
  description: "Prepare seus logs para comparar casts com dois jogadores de referência.",
};

/** Define o idioma, a navegação e a estrutura compartilhada das páginas de servidor. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Warcraft Logs Analyzer — início">
            <span className="brand-mark" aria-hidden="true">W</span>
            <span>WARCRAFT LOGS <strong>ANALYZER</strong></span>
          </Link>
          <span className="version-label">MVP · Etapa 1</span>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          Projeto educacional independente. Não afiliado à Blizzard Entertainment ou ao Warcraft Logs.
        </footer>
      </body>
    </html>
  );
}
