const CARTOES = [0, 1, 2, 3, 4, 5];
const FILTROS = ["w-24", "w-32", "w-24", "w-20", "w-28"];

// O raio de `.esqueleto` (globals.css, fora de camada) ganha das classes `rounded-*`: onde o canto precisa ser outro, vai no estilo.
const SEM_CANTO = { borderRadius: 0 };
const PILULA = { borderRadius: 9999 };

/** Esqueleto da vitrine enquanto o mural de contratos carrega: mesma casca da página (título, filtros, grade de cartões). */
export default function CarregandoAventuras() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="relative" role="status" aria-busy="true">
        <span className="sr-only">Abrindo a vitrine de aventuras…</span>
        <div className="esqueleto h-9 w-64 max-w-full" />
        <div className="esqueleto mt-3 h-4 w-80 max-w-full" />
        <div className="mt-10 flex gap-2 overflow-hidden">
          {FILTROS.map((largura, i) => (
            <div key={i} className={`esqueleto h-10 shrink-0 ${largura}`} style={PILULA} />
          ))}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARTOES.map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="esqueleto aspect-[320/104] w-full" style={SEM_CANTO} />
              <div className="space-y-2 p-4">
                <div className="esqueleto h-4 w-3/4" />
                <div className="esqueleto h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
