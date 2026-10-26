"use client";

// "Imprimir / salvar PDF": o diálogo de impressão do navegador já salva em PDF; o CSS de impressão do livro cuida do resto.
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ambar min-h-10 px-3 py-2 sm:px-4" data-imprimir aria-label="Imprimir ou salvar em PDF">
      <span aria-hidden>🖨</span>
      <span className="sm:hidden">PDF</span>
      <span className="hidden sm:inline">Imprimir / salvar PDF</span>
    </button>
  );
}
