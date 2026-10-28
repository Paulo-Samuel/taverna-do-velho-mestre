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
.leitor-aparte{margin:1.35em 0;padding:.7em 1em .8em;border-radius:.7rem;border:1px solid color-mix(in srgb,var(--ambar) 18%,var(--border));
  border-left:2px solid color-mix(in srgb,var(--ambar) 55%,transparent);background:color-mix(in srgb,var(--surface-2) 62%,transparent);
  font-size:.84em;line-height:1.62;font-style:normal;color:color-mix(in srgb,var(--foreground) 88%,transparent);hyphens:manual;-webkit-hyphens:manual}
.leitor-aparte:first-child{margin-top:0}
.leitor-aparte-rotulo{display:flex;align-items:center;gap:.45em;margin:0 0 .3em!important;font-size:.74em;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:color-mix(in srgb,var(--ambar) 78%,var(--foreground))}
.leitor-aparte-texto p{margin:0!important}
.leitor-aparte-texto p+p{margin-top:.45em!important}
.leitor-aparte em,.leitor-aparte .leitor-fala{font-style:normal;color:inherit}
.leitor-fim-noite{display:flex;flex-direction:column;align-items:center;gap:.45rem;margin:2rem auto .75rem;text-align:center}
.leitor-fim-noite-titulo{font-family:var(--fonte-capitular,var(--font-titulo));font-size:1.35rem;line-height:1.1;letter-spacing:.04em;color:var(--pergaminho)}
.leitor-fim-noite-data{font-size:10.5px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--muted)}
.leitor-mudancas{margin:2.25rem 0 .25rem}
.leitor-mudancas-titulo{display:flex;align-items:center;gap:.8em;margin-bottom:.7rem;font-size:10.5px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;
  color:color-mix(in srgb,var(--muted) 92%,var(--foreground))}
.leitor-mudancas-titulo::before,.leitor-mudancas-titulo::after{content:"";flex:1;height:1px}
.leitor-mudancas-titulo::before{background:linear-gradient(to right,transparent,color-mix(in srgb,var(--ambar) 35%,transparent))}
.leitor-mudancas-titulo::after{background:linear-gradient(to left,transparent,color-mix(in srgb,var(--ambar) 35%,transparent))}
.leitor-mudancas-grupos{display:flex;flex-direction:column;align-items:center;gap:.45rem}
.leitor-mudancas-grupo{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.4rem}
.leitor-mudancas-quem{margin-right:.15rem;font-size:13px;font-weight:600;letter-spacing:.06em;font-variant-caps:all-small-caps;color:var(--ambar)}
.leitor-mudancas-quem-outro{color:var(--muted)}
.leitor-chip{display:inline-flex;align-items:center;gap:.38em;min-height:1.75rem;max-width:100%;padding:.15rem .62rem;border-radius:999px;font-size:12.5px;line-height:1.2;
  border:1px solid color-mix(in srgb,var(--ambar) 24%,transparent);background:color-mix(in srgb,var(--ambar) 6%,transparent);
  color:color-mix(in srgb,var(--foreground) 86%,transparent);transition:border-color .2s,background-color .2s,color .2s;cursor:help}
.leitor-chip>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.leitor-chip:hover,.leitor-chip[aria-expanded=true]{border-color:color-mix(in srgb,var(--ambar) 60%,transparent);background:color-mix(in srgb,var(--ambar) 12%,transparent);color:var(--foreground)}
.leitor-chip-icone{font-size:.85em;line-height:1;color:var(--ambar)}
.leitor-chip-ruim{border-color:color-mix(in srgb,var(--sangue) 38%,transparent);background:color-mix(in srgb,var(--sangue) 8%,transparent)}
.leitor-chip-ruim .leitor-chip-icone{color:color-mix(in srgb,var(--sangue) 80%,var(--foreground))}
.leitor-chip-ruim:hover,.leitor-chip-ruim[aria-expanded=true]{border-color:color-mix(in srgb,var(--sangue) 70%,transparent);background:color-mix(in srgb,var(--sangue) 14%,transparent)}
.leitor-chip-bom{border-color:color-mix(in srgb,var(--musgo) 40%,transparent);background:color-mix(in srgb,var(--musgo) 8%,transparent)}
.leitor-chip-bom .leitor-chip-icone{color:color-mix(in srgb,var(--musgo) 85%,var(--foreground))}
.leitor-chip-bom:hover,.leitor-chip-bom[aria-expanded=true]{border-color:color-mix(in srgb,var(--musgo) 75%,transparent);background:color-mix(in srgb,var(--musgo) 14%,transparent)}
.leitor-chip-balao{position:fixed;z-index:80;padding:.55rem .75rem;border-radius:.6rem;border:1px solid color-mix(in srgb,var(--ambar) 35%,var(--border));
  background:var(--surface);box-shadow:0 12px 32px -12px rgba(0,0,0,.7);font-size:12.5px;line-height:1.5;color:var(--foreground);pointer-events:none}
.leitor-escrevendo{display:flex;flex-direction:column;align-items:center;gap:.6rem;margin:2.5rem 0;color:var(--muted);text-align:center}
.leitor-escrevendo-pena{width:4.5rem;height:2rem;color:color-mix(in srgb,var(--ambar) 85%,transparent)}
.leitor-escrevendo-tinta{stroke-dasharray:70;stroke-dashoffset:70;animation:leitor-tinta 2.6s ease-in-out infinite}
.leitor-escrevendo-mao{animation:leitor-mao 2.6s ease-in-out infinite}
.leitor-escrevendo-frase{font-size:.95rem;font-style:italic;animation:surgir .5s ease-out both}
.leitor-escrevendo-pontos i{display:inline-block;width:.3em;height:.3em;margin-left:.22em;border-radius:999px;background:var(--ambar);animation:leitor-ponto 1.4s ease-in-out infinite;vertical-align:.1em}
.leitor-escrevendo-pontos i:nth-child(2){animation-delay:.2s}.leitor-escrevendo-pontos i:nth-child(3){animation-delay:.4s}
@keyframes leitor-tinta{0%{stroke-dashoffset:70;opacity:1}70%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
@keyframes leitor-mao{0%{transform:translateX(-44px)}70%{transform:translateX(0)}100%{transform:translateX(0);opacity:.6}}
@keyframes leitor-ponto{0%,100%{opacity:.25}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.leitor-escrevendo-tinta{animation:none;stroke-dashoffset:0}.leitor-escrevendo-mao,.leitor-escrevendo-pontos i,.leitor-escrevendo-frase{animation:none}}
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
