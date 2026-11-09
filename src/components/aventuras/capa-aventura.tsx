import { ALTURA, LARGURA, gerarCapa } from "@/lib/aventuras/capa-arte";

// Capa decorativa de uma aventura: SVG determinístico (id + sistema), só formas, cores do tema do cartão em volta
// (o ancestral com data-tema muda --ambar, --surface-2 etc.). aria-hidden: o título e a chamada dizem tudo.
const mistura = (token: string, pct: number) => `color-mix(in srgb, var(--${token}) ${pct}%, var(--background))`;

export function CapaAventura({ id, sistema, className = "" }: { id: string; sistema: string; className?: string }) {
  const capa = gerarCapa(id, sistema);
  const gid = `capa-${id}`;
  const rad = (capa.angulo * Math.PI) / 180;
  const x2 = 0.5 + Math.sin(rad) * 0.5;
  const y2 = 0.5 - Math.cos(rad) * 0.5;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block h-auto w-full ${className}`}
    >
      <defs>
        <linearGradient id={gid} x1={1 - x2} y1={1 - y2} x2={x2} y2={y2}>
          <stop offset="0" style={{ stopColor: "var(--surface-2)" }} />
          <stop offset="1" style={{ stopColor: mistura("ambar-forte", capa.brilho) }} />
        </linearGradient>
      </defs>
      <rect width={LARGURA} height={ALTURA} fill={`url(#${gid})`} />
      {capa.pontos.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} style={{ fill: "var(--pergaminho)", opacity: 0.55 }} />
      ))}
      <circle cx={capa.astro.cx} cy={capa.astro.cy} r={capa.astro.r} style={{ fill: mistura("pergaminho", 70) }} />
      {capa.serras.map((s, i) => (
        <path key={i} d={s.d} style={{ fill: mistura(s.token, s.mistura) }} />
      ))}
      <path d={capa.silhueta.d} fillRule="evenodd" style={{ fill: mistura(capa.silhueta.token, capa.silhueta.mistura) }} />
      <rect y={ALTURA - 6} width={LARGURA} height={6} style={{ fill: "var(--background)", opacity: 0.6 }} />
    </svg>
  );
}
