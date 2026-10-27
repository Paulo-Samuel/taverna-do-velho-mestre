// Tipografia de livro das duas mesas (leitor cena a cena e rolagem): tamanho de leitura com a escala escolhida no menu
// (--leitor-escala), medida de ~65 caracteres, capitular no primeiro parágrafo da cena, falas entre aspas destacadas,
// separador com o enfeite do tema e a abertura de capítulo (cabeçalho de cena). As cores vêm dos tokens do tema.

import type { ReactNode } from "react";

const CSS = `
.leitor-prosa{font-size:calc(var(--leitor-escala,1)*1.125rem);line-height:1.74;text-wrap:pretty;hyphens:auto;-webkit-hyphens:auto;font-kerning:normal;font-variant-ligatures:common-ligatures}
@media (min-width:640px){.leitor-prosa{font-size:calc(var(--leitor-escala,1)*1.2rem);line-height:1.76}}
.leitor-prosa p{margin:0 0 .9em}
.leitor-prosa p:last-child{margin-bottom:0}
.leitor-prosa strong{font-weight:600;color:var(--pergaminho)}
.leitor-medida{max-width:calc(var(--leitor-escala,1)*37rem)}
.leitor-fala{font-style:italic;color:color-mix(in srgb,var(--pergaminho) 84%,var(--ambar))}
.leitor-capitular::first-letter{float:left;font-family:var(--fonte-capitular,var(--font-titulo));font-style:normal;font-weight:400;font-size:4.05em;line-height:.78;
  padding:.07em .1em 0 0;color:var(--ambar);text-shadow:0 0 22px color-mix(in srgb,var(--ambar) 30%,transparent);transition:color .5s ease}
.leitor-capitular[data-oculta]::first-letter{color:transparent;text-shadow:none}
.leitor-separador{display:flex;align-items:center;justify-content:center;gap:.85em;margin:1.5em auto;max-width:15em;font-size:.8em;line-height:1;
  color:color-mix(in srgb,var(--ambar) 65%,transparent)}
.leitor-separador::before,.leitor-separador::after{content:"";flex:1;height:1px}
.leitor-separador::before{background:linear-gradient(to right,transparent,color-mix(in srgb,var(--ambar) 45%,transparent))}
.leitor-separador::after{background:linear-gradient(to left,transparent,color-mix(in srgb,var(--ambar) 45%,transparent))}
@media (prefers-reduced-motion:reduce){.leitor-capitular::first-letter{transition:none}}
`;

/** Os estilos da prosa (uma vez por página: o React junta os <style> com o mesmo href). */
export function EstiloProsa() {
  return (
    <style href="taverna-leitor-prosa" precedence="default">
      {CSS}
    </style>
  );
}

/** O parágrafo merece capitular? Começa com letra (não com fala nem travessão) e a primeira linha tem corpo para abraçá-la. */
export function capitularCabe(paragrafo: string): boolean {
  const limpo = paragrafo.replace(/^[*_]+/, "");
  return limpo.split("\n")[0].length >= 110 && /^\p{L}/u.test(limpo);
}

/** Enfeite do tema entre dois fios que somem nas pontas. Sem `simbolo`, usa o --ornamento do tema. */
export function Ornamento({ simbolo, className = "" }: { simbolo?: string; className?: string }) {
  return (
    <div className={`leitor-separador ${className}`} aria-hidden>
      {simbolo ?? <span className="ornamento" />}
    </div>
  );
}

/**
 * Abertura de capítulo (o cabeçalho de cena do mestre): "LOCAL · MOMENTO" em caixa alta espaçada, o título grande na letra
 * do tema e o enfeite embaixo, tudo centralizado no topo da página.
 */
export function AberturaCapitulo({
  titulo,
  local,
  momento,
  classeTitulo = "titulo",
  simbolo,
}: {
  titulo?: string | null;
  local?: string | null;
  momento?: string | null;
  /** fonte do título (letra gótica no modo história; a do tema na avançada) */
  classeTitulo?: string;
  simbolo?: string;
}): ReactNode {
  const linha = [local, momento].filter(Boolean).join(" · ");
  if (!titulo && !linha) return null;
  return (
    <header className="surgir mx-auto max-w-[34rem] pb-4 pt-5 text-center first:pt-1 sm:pt-7" data-abertura>
      {linha && <p className="text-[10.5px] font-semibold uppercase tracking-[0.34em] text-muted sm:text-[11px]">{linha}</p>}
      {titulo && <h2 className={`${classeTitulo} mt-2 text-balance text-[2rem] leading-[1.08] text-pergaminho sm:text-[2.6rem]`}>{titulo}</h2>}
      <Ornamento simbolo={simbolo} className="mb-0! mt-4! max-w-[11em]!" />
    </header>
  );
}
