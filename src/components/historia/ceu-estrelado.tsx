// Fundo do modo história: noite funda com estrelas sutis (duas camadas; a de cima pisca devagar) e o
// brilho de lareira do resto da taverna bem fraquinho no pé da página. Também traz os estilos próprios da mesa-livro.

const estrelas = (pontos: [number, number, number][], cor: string) =>
  pontos.map(([x, y, r]) => `radial-gradient(${r}px ${r}px at ${x}px ${y}px, ${cor}, transparent)`).join(",");

const CAMADA_1 = estrelas(
  [
    [23, 41, 1],
    [97, 160, 1],
    [151, 18, 1.4],
    [212, 233, 1],
    [270, 92, 1],
    [44, 288, 1.2],
    [318, 201, 1],
    [180, 310, 1],
    [339, 37, 1],
    [120, 251, 1],
    [255, 330, 1.3],
    [70, 120, 1],
  ],
  "rgba(241,228,196,.55)",
);
const CAMADA_2 = estrelas(
  [
    [61, 77, 1.6],
    [233, 141, 1.4],
    [389, 302, 1.8],
    [143, 377, 1.4],
    [455, 58, 1.5],
    [312, 455, 1.4],
    [20, 430, 1.6],
  ],
  "rgba(255,240,210,.8)",
);

const CSS = `
.ceu-historia { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(1200px 500px at 50% 115%, rgba(224,162,74,.10), transparent 65%),
    radial-gradient(900px 600px at 15% -10%, rgba(80,70,140,.16), transparent 60%),
    linear-gradient(180deg, #08070d 0%, #0d0a10 45%, #120d0a 100%); }
.ceu-historia::before, .ceu-historia::after { content: ""; position: absolute; inset: 0; }
.ceu-historia::before { background-image: ${CAMADA_1}; background-size: 360px 360px; opacity: .55; }
.ceu-historia::after { background-image: ${CAMADA_2}; background-size: 520px 520px; animation: ceu-piscar 7s ease-in-out infinite alternate; }
@keyframes ceu-piscar { from { opacity: .25 } to { opacity: .75 } }
.pensando i { display: inline-block; width: .38em; height: .38em; margin: 0 .12em; border-radius: 9999px; background: currentColor; animation: pensar 1.4s ease-in-out infinite; }
.pensando i:nth-child(2) { animation-delay: .2s } .pensando i:nth-child(3) { animation-delay: .4s }
@keyframes pensar { 0%, 80%, 100% { opacity: .2; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-3px) } }
.pedido-pendente { animation: pedido-brilho 2.8s ease-in-out infinite; }
@keyframes pedido-brilho { 0%, 100% { box-shadow: 0 0 60px -24px var(--ambar) } 50% { box-shadow: 0 0 72px -12px var(--ambar) } }
@media (prefers-reduced-motion: reduce) {
  .ceu-historia::after, .pensando i, .pedido-pendente { animation: none }
  .pensando i { opacity: .7 }
}
`;

export function CeuEstrelado() {
  return (
    <>
      <style href="taverna-mesa-historia" precedence="default">
        {CSS}
      </style>
      <div className="ceu-historia" aria-hidden />
    </>
  );
}
