"use client";

import { useEffect } from "react";

// Erro no próprio layout: sem este arquivo, cairia na tela branca do Next. Aqui o layout não existe, então a página traz
// <html> e <body> próprios e nenhum componente da casa.
// As cores espelham o tema padrão de temas.css (fundo, pergaminho e âmbar): aqui os tokens podem não ter carregado.
const FUNDO = "#0B0908";
const TEXTO = "#F1E4C4";
const AMBAR = "#D9A54E";

export default function ErroGlobal({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[taverna]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          background: FUNDO,
          color: TEXTO,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "17px",
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        <title>A taverna tropeçou feio · Taverna do Velho Mestre</title>
        <main role="alert" style={{ maxWidth: "34rem" }}>
          <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 400, color: AMBAR }}>A taverna tropeçou feio</h1>
          <p style={{ margin: "12px 0 0" }}>
            Deu um erro antes mesmo de a porta abrir. Recarregue a página; se insistir, feche e abra a taverna pelo atalho.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "24px",
              minHeight: "44px",
              padding: "0 20px",
              border: 0,
              borderRadius: "8px",
              background: AMBAR,
              color: FUNDO,
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Recarregar a página
          </button>
          {error.digest && (
            <p style={{ margin: "24px 0 0", fontSize: "12px", opacity: 0.8, userSelect: "all" }}>código do erro: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
