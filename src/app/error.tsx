"use client";

import { useEffect } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

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

const ICONES: Record<keyof typeof TEXTOS, NomeIcone> = { atualizada: "candle", desligada: "door", outro: "skull" };

export default function ErroDaPagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[taverna]", error);
  }, [error]);

  const tipo = tipoDoErro(error);
  const { titulo, texto } = TEXTOS[tipo];
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center" role="alert">
      <div className="cartao cartao-matiz flex w-full max-w-xl flex-col items-center p-6 sm:p-10">
        <span
          className="grid size-16 place-items-center rounded-full border border-ambar-forte/50 bg-ambar/10 text-3xl text-ambar"
          aria-hidden
        >
          <Icone nome={ICONES[tipo]} />
        </span>
        <h1 className="titulo titulo-brilho mt-3 text-balance text-3xl text-pergaminho sm:text-4xl">{titulo}</h1>
        <p className="mt-3 text-pretty text-muted">{texto}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-ambar min-h-11" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
          {tipo === "outro" && (
            <button type="button" className="btn-borda min-h-11" onClick={() => retry()}>
              Tentar de novo
            </button>
          )}
        </div>
        {/* navegação completa de propósito: depois de um erro (ou de uma atualização) é melhor recarregar tudo */}
        <button
          type="button"
          className="mt-2 inline-flex min-h-10 items-center text-sm text-muted underline-offset-2 hover:text-ambar hover:underline"
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          onClick={() => window.location.assign("/")}
        >
          Voltar às campanhas
        </button>
        {error.digest && <p className="mt-6 text-xs text-muted select-all">código do erro: {error.digest}</p>}
      </div>
    </main>
  );
}
