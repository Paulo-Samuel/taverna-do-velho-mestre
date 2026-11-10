import { ALTURA, LARGURA, gerarCapa } from "@/lib/aventuras/capa-arte";

// Capa decorativa de uma aventura: SVG determinístico (id + sistema), só formas, cores do tema do cartão em volta
// (o ancestral com data-tema muda --ambar, --surface-2 etc.). aria-hidden: o título e a chamada dizem tudo.
// A composição (silhueta, horizonte, astro, cor do céu) vem pronta de capa-arte.ts; aqui só se pinta.
const mistura = (token: string, pct: number) => `color-mix(in srgb, var(--${token}) ${pct}%, var(--background))`;

export function CapaAventura({ id, sistema, className = "" }: { id: string; sistema: string; className?: string }) {
  const capa = gerarCapa(id, sistema);
  const gid = `capa-${id}`;
  const rad = (capa.angulo * Math.PI) / 180;
  const x2 = 0.5 + Math.sin(rad) * 0.5;
  const y2 = 0.5 - Math.cos(rad) * 0.5;
  const fio = capa.silhueta.contorno;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      // quando a capa é achatada (max-h no celular), corta o céu e nunca o pé da silhueta nem o horizonte
      preserveAspectRatio="xMidYMax slice"
      className={`block h-auto w-full ${className}`}
    >
      <defs>
        <linearGradient id={gid} x1={1 - x2} y1={1 - y2} x2={x2} y2={y2}>
          <stop offset="0" style={{ stopColor: "var(--surface-2)" }} />
          <stop offset="1" style={{ stopColor: mistura(capa.ceu, capa.brilho) }} />
        </linearGradient>
      </defs>
      <rect width={LARGURA} height={ALTURA} fill={`url(#${gid})`} />
      {capa.pontos.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} style={{ fill: "var(--pergaminho)", opacity: 0.55 }} />
      ))}
      <path d={capa.astro.d} style={{ fill: mistura("pergaminho", 70) }} />
      {capa.camadas.map((c, i) => (
        <path key={i} d={c.d} style={{ fill: mistura(c.token, c.mistura) }} />
      ))}
      <path
        d={capa.silhueta.d}
        fillRule="evenodd"
        style={{
          fill: mistura(capa.silhueta.token, capa.silhueta.mistura),
          stroke: fio > 0 ? mistura("pergaminho", fio) : "none",
          strokeWidth: fio > 0 ? 1.5 : 0,
          strokeLinejoin: "round",
          paintOrder: "stroke",
        }}
      />
      <rect y={ALTURA - 6} width={LARGURA} height={6} style={{ fill: "var(--background)", opacity: 0.6 }} />
    </svg>
  );
}
