"use client";

import { useEffect } from "react";

// Erro inesperado numa página. Os dois casos mais comuns numa taverna local têm explicação própria:
// a taverna foi atualizada (recompilada) com a página aberta, ou o servidor foi desligado.

function tipoDoErro(e: Error): "atualizada" | "desligada" | "outro" {
  const m = `${e.name} ${e.message}`;
  if (/server action|failed to find|chunkloaderror|loading chunk|dynamically imported module|deployment/i.test(m)) return "atualizada";
  if (/failed to fetch|networkerror|load failed|fetch failed|econnrefused/i.test(m)) return "desligada";
  return "outro";
}

const TEXTOS = {
  atualizada: {
    titulo: "A taverna mudou de lugar os móveis",
    texto: "Ela foi atualizada enquanto esta página estava aberta. Recarregue e tente de novo: nada do que estava salvo se perdeu.",
  },
  desligada: {
    titulo: "O taverneiro fechou a porta",
    texto: "O servidor da taverna não respondeu. Se ele foi desligado, abra de novo pelo atalho da Área de Trabalho e recarregue esta página.",
  },
  outro: {
    titulo: "Alguém derrubou a bandeja",
    texto: "Deu um erro inesperado aqui. Tente de novo; se insistir, recarregue a página.",
  },
};

export default function ErroDaPagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[taverna]", error);
  }, [error]);

  const tipo = tipoDoErro(error);
  const { titulo, texto } = TEXTOS[tipo];
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col items-center justify-center px-4 py-12 text-center" role="alert">
      <p className="titulo text-6xl text-ambar/80" aria-hidden>
        ⚠
      </p>
      <h1 className="titulo mt-3 text-3xl text-pergaminho">{titulo}</h1>
      <p className="mt-3 text-muted">{texto}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-ambar min-h-11" onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
        {tipo === "outro" && (
          <button type="button" className="btn-borda min-h-11" onClick={() => retry()}>
            Tentar de novo
          </button>
        )}
        {/* navegação completa de propósito: depois de um erro (ou de uma atualização) é melhor recarregar tudo */}
        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
        <button type="button" className="btn-borda min-h-11" onClick={() => window.location.assign("/")}>
          Voltar às campanhas
        </button>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted/70">código do erro: {error.digest}</p>}
    </main>
  );
}
