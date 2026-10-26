import type { ReactNode } from "react";
import { clarear, escurecer, luminancia, misturar } from "./cores";
import type { Ctx } from "./contexto";
import { CX, ESPELHO, simetrico } from "./geometria";

// Cabelo (camada de trás e da frente) e o que vai na cabeça: capuz, elmo, chapéus, coroa de ossos, tiara, bandana.

function par(lado: ReactNode, chave: string) {
  return (
    <g key={chave}>
      {lado}
      <g transform={ESPELHO}>{lado}</g>
    </g>
  );
}

/** Ruído determinístico barato (sem sorteio no desenho: o mesmo retrato sai sempre igual). */
function ruido(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Juba serrilhada em volta da cabeça (bárbaro que não conhece pente). */
function juba(cx: number, cy: number, rx: number, ry: number, pontas: number): string {
  const pts: string[] = [];
  const ini = (150 * Math.PI) / 180;
  const fim = (390 * Math.PI) / 180;
  for (let i = 0; i <= pontas * 2; i++) {
    const a = ini + ((fim - ini) * i) / (pontas * 2);
    const k = i % 2 === 0 ? 1 + ruido(i) * 0.12 : 0.8 + ruido(i + 50) * 0.08;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M${pts.join(" L")} L${cx + rx * 0.5} ${cy + ry * 0.9} L${cx - rx * 0.5} ${cy + ry * 0.9}Z`;
}

function capCurto(c: Ctx, recuo = 0): string {
  const { L, g } = c;
  const T = g.topo - 10;
  return simetrico([CX, T], [
    [CX + L * 0.7, T, CX + L + 1, T + 10, CX + L, T + 28],
    [CX + L, T + 38 - recuo, CX + L - 1, T + 44 - recuo, CX + L - 3, T + 48 - recuo * 1.4],
    [CX + L - 5, T + 40 - recuo, CX + L - 6, T + 30 - recuo * 0.6, CX + L - 9, T + 24 - recuo * 0.5],
    [CX + 16, T + 16 - recuo * 0.5, CX + 8, T + 20 - recuo * 0.5, CX, T + 17 - recuo * 0.5],
  ]);
}

function frenteLonga(c: Ctx, folga = 0, ate = 92): string {
  const { L, g } = c;
  const T = g.topo - 10;
  return simetrico([CX, T + 4], [
    [CX + L * 0.6, T - 1, CX + L + 6 + folga, T + 10, CX + L + 6 + folga, T + 34],
    [CX + L + 7 + folga, T + 58, CX + L + 6 + folga, T + ate - 12, CX + L + 2 + folga, T + ate],
    [CX + L - 3, T + ate - 14, CX + L - 4, T + 58, CX + L - 6, T + 40],
    [CX + L - 9, T + 24, CX + 10, T + 14, CX, T + 12],
  ]);
}

function fiosCap(c: Ctx): ReactNode {
  const T = c.g.topo - 10;
  return (
    <g fill="none" strokeLinecap="round" opacity={0.55}>
      {[-16, -8, 2, 11, 19].map((dx, i) => (
        <path key={i} d={`M${CX + dx * 0.4} ${T + 2} Q${CX + dx} ${T + 6} ${CX + dx * 1.15} ${T + 18 + (i % 2) * 3}`} stroke={i % 2 ? c.cabelo.luz : c.cabelo.funda} strokeWidth={0.8} />
      ))}
    </g>
  );
}

function fiosLongos(c: Ctx, ate: number): ReactNode {
  const { L } = c;
  const T = c.g.topo - 10;
  return (
    <g fill="none" strokeLinecap="round" opacity={0.5}>
      {[0, 1, 2, 3].map((i) =>
        par(
          <path d={`M${CX + 6 + i * 5} ${T + 6 + i} Q${CX + L + i * 2} ${T + 20} ${CX + L + 2 + i} ${T + ate - 8 - i * 6}`} stroke={i % 2 ? c.cabelo.luz : c.cabelo.funda} strokeWidth={0.8} />,
          `f${i}`,
        ),
      )}
    </g>
  );
}

/** O que fica atrás da cabeça e do corpo: cabelo comprido, rabo, coque, juba. */
export function CabeloTras({ c }: { c: Ctx }) {
  const { d, L, g } = c;
  const T = g.topo - 10;
  if (d.cobertura === "capuz") return null;
  switch (d.cabelo.estilo) {
    case "longo":
    case "trancas":
      return (
        <path
          d={simetrico([CX, T - 2], [
            [CX + L + 2, T - 2, CX + L + 11, T + 14, CX + L + 11, T + 40],
            [CX + L + 12, T + 70, CX + L + 17, T + (d.cabelo.estilo === "trancas" ? 70 : 100), CX + L + 13, T + (d.cabelo.estilo === "trancas" ? 90 : 132)],
            [CX + L + 4, T + 120, CX + L - 6, T + 110, CX + L - 10, T + 100],
            [CX + 12, T + 96, CX + 6, T + 94, CX, T + 92],
          ])}
          fill={c.url("cabeloEscuro")}
        />
      );
    case "ondulado":
      return (
        <path
          d={simetrico([CX, T - 4], [
            [CX + L + 4, T - 4, CX + L + 14, T + 12, CX + L + 13, T + 34],
            [CX + L + 20, T + 48, CX + L + 10, T + 62, CX + L + 17, T + 78],
            [CX + L + 24, T + 94, CX + L + 12, T + 108, CX + L + 18, T + 124],
            [CX + L + 20, T + 136, CX + L + 8, T + 140, CX + L - 2, T + 128],
            [CX + L - 8, T + 120, CX + 10, T + 104, CX, T + 100],
          ])}
          fill={c.url("cabeloEscuro")}
        />
      );
    case "rabo":
      return (
        <g>
          <path d={`M84 ${T + 12} C60 ${T + 22} 52 ${T + 62} 60 ${T + 102} C64 ${T + 120} 56 ${T + 132} 50 ${T + 140} C70 ${T + 130} 76 ${T + 112} 74 ${T + 90} C72 ${T + 62} 78 ${T + 36} 94 ${T + 18}Z`} fill={c.url("cabeloEscuro")} />
          <path d={`M66 ${T + 30} C60 ${T + 60} 62 ${T + 90} 58 ${T + 120}`} fill="none" stroke={c.cabelo.luz} strokeWidth={0.8} opacity={0.5} />
        </g>
      );
    case "coque":
      return (
        <g>
          <circle cx={CX + 3} cy={T - 4} r={12} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          <path d={`M${CX - 5} ${T - 6} q8 -9 16 1 M${CX - 3} ${T} q7 -6 13 0`} fill="none" stroke={c.cabelo.funda} strokeWidth={0.8} opacity={0.7} />
          <path d={`M${CX - 12} ${T - 14} L${CX + 18} ${T + 4}`} stroke={c.detalhe.base} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "desgrenhado":
      return <path d={juba(CX, T + 52, L + 20, 66, 13)} fill={c.url("cabeloEscuro")} />;
    default:
      return null;
  }
}

/** Cabelo por cima da testa e das laterais. */
export function CabeloFrente({ c }: { c: Ctx }) {
  const { d, L, g } = c;
  const T = g.topo - 10;
  const cob = d.cobertura;
  const longo = d.cabelo.estilo === "longo" || d.cabelo.estilo === "ondulado" || d.cabelo.estilo === "trancas";
  // capuz e elmo escondem o topo; só mechas compridas escapam pelos lados
  if ((cob === "capuz" || cob === "elmo" || cob === "elmo-chifres") && !longo) {
    return null;
  }
  switch (d.cabelo.estilo) {
    case "careca":
      return (
        <g clipPath={c.url("rosto")}>
          <ellipse cx={90} cy={g.topo + 8} rx={10} ry={5} fill="#fff" opacity={0.22} filter={c.url("leve")} />
          <path d={`M${CX - L + 3} ${g.topo + 32} Q${CX - L + 4} ${g.topo + 14} ${CX - L + 12} ${g.topo + 6}`} stroke={c.cabelo.base} strokeWidth={3} opacity={0.18} fill="none" />
        </g>
      );
    case "raspado":
      return (
        <g opacity={0.6}>
          <path d={capCurto(c, 6)} fill={c.cabelo.base} filter={c.url("leve")} />
        </g>
      );
    case "curto":
      return (
        <g>
          <path d={capCurto(c)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          {fiosCap(c)}
          {/* franja de lado */}
          <path d={`M${CX - 4} ${T + 4} C${CX - 14} ${T + 10} ${CX - 20} ${T + 18} ${CX - 22} ${T + 28} C${CX - 14} ${T + 20} ${CX - 6} ${T + 16} ${CX + 4} ${T + 15}Z`} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.5} />
        </g>
      );
    case "moicano":
      return (
        <g>
          <path d={capCurto(c, 4)} fill={c.cabelo.base} opacity={0.28} filter={c.url("leve")} />
          <path
            d={`M${CX - 8} ${T + 18} L${CX - 10} ${T - 4} L${CX - 5} ${T + 4} L${CX - 3} ${T - 14} L${CX} ${T} L${CX + 3} ${T - 17} L${CX + 5} ${T + 2} L${CX + 10} ${T - 9} L${CX + 8} ${T + 18} Q${CX} ${T + 22} ${CX - 8} ${T + 18}Z`}
            fill={c.url("cabelo")}
            stroke={c.cabelo.funda}
            strokeWidth={0.6}
          />
        </g>
      );
    case "desgrenhado": {
      // franja serrilhada da direita para a esquerda
      const passo = (2 * L - 8) / 8;
      const franja = Array.from({ length: 8 }, (_, i) => {
        const x = CX + L - 4 - i * passo;
        const y = T + 22 + ruido(i + 7) * 7 - Math.abs(i - 4) * 0.6;
        return `L${(x - passo / 2).toFixed(1)} ${(y + 5).toFixed(1)} L${(x - passo).toFixed(1)} ${(y - 3).toFixed(1)}`;
      }).join(" ");
      return (
        <g>
          <path d={`M${CX - L - 2} ${T + 48} C${CX - L - 4} ${T + 10} ${CX - 14} ${T - 6} ${CX} ${T - 6} C${CX + 14} ${T - 6} ${CX + L + 4} ${T + 10} ${CX + L + 2} ${T + 48} L${CX + L - 4} ${T + 24} ${franja} Z`} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          {fiosCap(c)}
        </g>
      );
    }
    case "coque":
      return (
        <g>
          <path d={capCurto(c, 4)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          <path d={`M${CX} ${T + 2} Q${CX - 16} ${T + 6} ${CX - L + 2} ${T + 26} M${CX} ${T + 2} Q${CX + 16} ${T + 6} ${CX + L - 2} ${T + 26}`} fill="none" stroke={c.cabelo.luz} strokeWidth={0.7} opacity={0.5} />
        </g>
      );
    case "rabo":
      return (
        <g>
          <path d={capCurto(c, 5)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          <path d={`M${CX} ${T + 1} Q${CX - 18} ${T + 4} ${CX - L} ${T + 24} M${CX + 4} ${T + 2} Q${CX + 18} ${T + 6} ${CX + L - 1} ${T + 26}`} fill="none" stroke={c.cabelo.luz} strokeWidth={0.7} opacity={0.5} />
        </g>
      );
    case "trancas": {
      const tranca = (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8;
            const x = CX + L + 3 + t * 6;
            const y = T + 54 + t * 76;
            return <ellipse key={i} cx={x} cy={y} rx={5.6 - t * 1.6} ry={5.2} transform={`rotate(${i % 2 ? 18 : -18} ${x} ${y})`} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />;
          })}
          <rect x={CX + L + 6.5} y={T + 134} width={6} height={3.5} rx={1} fill={c.detalhe.base} />
          <path d={`M${CX + L + 8} ${T + 138} l-1 8 M${CX + L + 10} ${T + 138} l0.5 9 M${CX + L + 12} ${T + 138} l2 7`} stroke={c.cabelo.base} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      );
      return (
        <g>
          <path d={frenteLonga(c, 0, 56)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          {par(tranca, "trancas")}
        </g>
      );
    }
    case "ondulado":
      return (
        <g>
          <path d={frenteLonga(c, 3, 98)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          <g fill="none" stroke={c.cabelo.luz} strokeWidth={0.8} opacity={0.55} strokeLinecap="round">
            {[0, 1, 2].map((i) =>
              par(<path d={`M${CX + L + 2} ${T + 40 + i * 18} q5 4 0 8 q-5 4 0 8`} />, `o${i}`),
            )}
          </g>
          {fiosLongos(c, 98)}
        </g>
      );
    default:
      // longo
      return (
        <g>
          <path d={frenteLonga(c, 0, 92)} fill={c.url("cabelo")} stroke={c.cabelo.funda} strokeWidth={0.6} />
          {fiosLongos(c, 92)}
        </g>
      );
  }
}

// ---------- coberturas ----------

const METAL = { base: "#8a9098", luz: "#e2e6ea", sombra: "#3a3f46" };

/** Parte de trás do capuz e da gola: vai antes do pescoço. */
export function CoberturaTras({ c }: { c: Ctx }) {
  const { d, L } = c;
  if (d.cobertura !== "capuz") return null;
  const capuz = simetrico([CX, 22], [
    [CX + L + 16, 22, CX + L + 26, 52, CX + L + 25, 88],
    [CX + L + 24, 118, CX + L + 30, 140, CX + L + 46, 160],
    [CX + L + 40, 175, CX + 30, 178, CX, 180],
  ]);
  const interior = simetrico([CX, 38], [
    [CX + L + 9, 38, CX + L + 15, 64, CX + L + 14, 92],
    [CX + L + 13, 124, CX + L + 2, 140, CX, 142],
  ]);
  return (
    <g>
      <path d={capuz} fill={c.url("capuz")} stroke={c.roupa.funda} strokeWidth={0.8} />
      <path d={interior} fill={c.url("capuzInterior")} />
    </g>
  );
}

/** Borda do capuz, elmos e chapéus: por cima do cabelo. */
export function CoberturaFrente({ c }: { c: Ctx }) {
  const { d, L } = c;
  const sombraTesta = (y: number, forca = 0.4) => (
    <g clipPath={c.url("rosto")}>
      <ellipse cx={CX} cy={y} rx={34} ry={9} fill="#0c0608" opacity={forca} filter={c.url("suave")} />
    </g>
  );
  switch (d.cobertura) {
    case "capuz": {
      const borda = simetrico([CX, 34], [
        [CX + L + 10, 34, CX + L + 17, 60, CX + L + 16, 92],
        [CX + L + 15, 116, CX + L + 12, 134, CX + L + 8, 148],
        [CX + L + 3, 136, CX + L + 5, 116, CX + L + 5, 92],
        [CX + L + 4, 64, CX + 18, 54, CX, 54],
      ]);
      return (
        <g>
          {sombraTesta(60, 0.5)}
          <path d={borda} fill={c.url("capuz")} stroke={c.roupa.funda} strokeWidth={0.8} />
          <path d={`M${CX - 14} 40 Q${CX} 36 ${CX + 14} 40 M${CX + L + 10} 70 Q${CX + L + 13} 96 ${CX + L + 10} 124`} fill="none" stroke={c.roupa.luz} strokeWidth={0.8} opacity={0.4} />
        </g>
      );
    }
    case "elmo":
    case "elmo-chifres": {
      const elmo = simetrico([CX, 36], [
        [CX + L + 2, 36, CX + L + 6, 56, CX + L + 5, 74],
        [CX + L + 5, 90, CX + L + 3, 106, CX + L - 2, 116],
        [CX + L - 6, 110, CX + L - 8, 98, CX + L - 8, 86],
        [CX + L - 9, 76, CX + 14, 70, CX, 70],
      ]);
      const nasal = d.cobertura === "elmo" && (c.figurino === "guerreiro" || d.roupa === "malha");
      const enfeite = c.figurino === "paladino" ? c.detalhe.base : null;
      return (
        <g>
          {sombraTesta(74, 0.45)}
          {d.cobertura === "elmo-chifres" &&
            par(
              <path d={`M${CX + L - 2} 54 C${CX + L + 14} 48 ${CX + L + 22} 32 ${CX + L + 18} 12 C${CX + L + 28} 30 ${CX + L + 24} 56 ${CX + L + 4} 66Z`} fill={c.url("osso")} stroke="#4a3a24" strokeWidth={0.8} />,
              "chifres-elmo",
            )}
          <path d={elmo} fill={c.url("metal")} stroke={METAL.sombra} strokeWidth={1} />
          <path d={`M${CX - L + 8} 72 Q${CX} 66 ${CX + L - 8} 72`} fill="none" stroke={enfeite ?? METAL.sombra} strokeWidth={3} />
          <path d={`M${CX} 37 L${CX} 68`} stroke={METAL.luz} strokeWidth={1.4} opacity={0.6} />
          <ellipse cx={CX - 12} cy={48} rx={6} ry={9} fill="#fff" opacity={0.25} filter={c.url("leve")} />
          {[-1, 1].map((s) => [0.35, 0.7].map((t) => <circle key={`${s}${t}`} cx={CX + s * (L - 8) * t} cy={71 - (1 - t) * 3} r={1.1} fill={METAL.luz} />))}
          {nasal && <rect x={CX - 2.8} y={68} width={5.6} height={32} rx={2} fill={c.url("metal")} stroke={METAL.sombra} strokeWidth={0.8} />}
          {enfeite && <path d={elmo} fill="none" stroke={enfeite} strokeWidth={1.2} opacity={0.9} />}
        </g>
      );
    }
    case "chapeu-mago":
      return (
        <g>
          {sombraTesta(66, 0.5)}
          <ellipse cx={CX} cy={57} rx={L + 30} ry={10} transform={`rotate(-5 ${CX} 57)`} fill={c.url("capuz")} stroke={c.roupa.funda} strokeWidth={0.9} />
          <path
            d={`M${CX - L - 2} 56 C${CX - L + 4} 36 ${CX - 14} 18 ${CX + 6} 8 C${CX + 16} 3 ${CX + 30} 6 ${CX + 40} -2 C${CX + 32} 10 ${CX + 24} 14 ${CX + 20} 24 C${CX + L - 4} 34 ${CX + L} 46 ${CX + L + 2} 54 Q${CX} 60 ${CX - L - 2} 56Z`}
            fill={c.url("capuz")}
            stroke={c.roupa.funda}
            strokeWidth={0.9}
          />
          <path d={`M${CX - L - 1} 50 Q${CX} 56 ${CX + L + 1} 49 L${CX + L + 2} 55 Q${CX} 62 ${CX - L - 2} 56Z`} fill={c.url("ouro")} />
          <path d={`M${CX - 12} 40 Q${CX - 4} 22 ${CX + 10} 12`} fill="none" stroke={c.roupa.luz} strokeWidth={1} opacity={0.35} />
          <g fill={c.detalhe.base} opacity={0.85}>
            <path d={`M${CX + 6} 36 a5 5 0 1 0 4 -8 a4 4 0 1 1 -4 8Z`} />
            <path d={`M${CX - 10} 44 l1 -2.6 l1 2.6 l2.6 1 l-2.6 1 l-1 2.6 l-1 -2.6 l-2.6 -1Z`} />
            <path d={`M${CX + 14} 20 l0.7 -1.8 l0.7 1.8 l1.8 0.7 l-1.8 0.7 l-0.7 1.8 l-0.7 -1.8 l-1.8 -0.7Z`} />
          </g>
        </g>
      );
    case "chapeu-aba": {
      const copa = simetrico([CX, 28], [
        [CX + 16, 25, CX + L - 2, 34, CX + L - 2, 56],
        [CX + L - 6, 60, CX + 10, 61, CX, 61],
      ]);
      const couro = luminancia(d.corRoupa) > 0.3 ? escurecer(d.corRoupa, 0.3) : clarear(d.corRoupa, 0.15);
      return (
        <g>
          {sombraTesta(68, 0.55)}
          <ellipse cx={CX} cy={58} rx={L + 26} ry={9} transform={`rotate(-4 ${CX} 58)`} fill={couro} stroke={escurecer(couro, 0.5)} strokeWidth={0.9} />
          <path d={copa} fill={couro} stroke={escurecer(couro, 0.5)} strokeWidth={0.9} />
          <path d={`M${CX - L + 3} 50 Q${CX} 54 ${CX + L - 3} 50 L${CX + L - 2} 56 Q${CX} 60 ${CX - L + 2} 56Z`} fill={c.detalhe.base} opacity={0.9} />
          <path d={`M${CX - 8} 30 Q${CX} 36 ${CX + 8} 30`} fill="none" stroke={escurecer(couro, 0.5)} strokeWidth={0.9} />
          <ellipse cx={CX - 14} cy={40} rx={5} ry={8} fill="#fff" opacity={0.12} filter={c.url("leve")} />
        </g>
      );
    }
    case "chapeu-bardo": {
      const pena = luminancia(d.corDetalhe) > 0.6 ? "#c23b2a" : d.corDetalhe;
      return (
        <g>
          {sombraTesta(64, 0.4)}
          <path d={`M${CX + 12} 42 C${CX + 28} 18 ${CX + 52} 2 ${CX + 82} -4 C${CX + 64} 10 ${CX + 42} 26 ${CX + 20} 46Z`} fill={pena} stroke={escurecer(pena, 0.5)} strokeWidth={0.6} />
          <path d={`M${CX + 16} 44 C${CX + 34} 24 ${CX + 56} 8 ${CX + 80} -3`} fill="none" stroke={clarear(pena, 0.5)} strokeWidth={0.7} />
          <g stroke={escurecer(pena, 0.4)} strokeWidth={0.5} opacity={0.7}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${CX + 24 + i * 9} ${36 - i * 7} l${3 - i * 0.2} ${4 + i * 0.3}`} />
            ))}
          </g>
          <path
            d={`M${CX - L - 4} 58 C${CX - L - 8} 36 ${CX - 6} 26 ${CX + 20} 30 C${CX + L + 16} 32 ${CX + L + 22} 46 ${CX + L + 16} 56 C${CX + 10} 62 ${CX - 20} 62 ${CX - L - 4} 58Z`}
            fill={c.url("capuz")}
            stroke={c.roupa.funda}
            strokeWidth={0.9}
          />
          <path d={`M${CX - L - 3} 54 C${CX - 20} 59 ${CX + 10} 59 ${CX + L + 16} 52 L${CX + L + 16} 57 C${CX + 10} 63 ${CX - 20} 63 ${CX - L - 4} 59Z`} fill={c.url("ouro")} />
          <ellipse cx={CX - 6} cy={38} rx={10} ry={5} fill="#fff" opacity={0.15} filter={c.url("leve")} />
        </g>
      );
    }
    case "coroa-ossos": {
      const y = (dx: number) => 56 + 6 * (dx / L) ** 2;
      const ossos = [-L + 5, -L / 2, L / 2, L - 5].map((dx, i) => {
        const h = i === 1 || i === 2 ? 15 : 10;
        const x = CX + dx;
        const base = y(dx);
        return (
          <g key={i} transform={`rotate(${dx * 0.6} ${x} ${base})`}>
            <rect x={x - 1.4} y={base - h} width={2.8} height={h} fill={c.url("osso")} />
            <circle cx={x - 1.3} cy={base - h} r={1.7} fill={c.url("osso")} />
            <circle cx={x + 1.3} cy={base - h} r={1.7} fill={c.url("osso")} />
          </g>
        );
      });
      return (
        <g>
          {ossos}
          <path d={`M${CX - L} 62 Q${CX} 50 ${CX + L} 62`} fill="none" stroke="#2a1f18" strokeWidth={3.2} />
          <g transform={`translate(${CX} 52)`}>
            <circle r={5.5} fill={c.url("osso")} stroke="#4a3a24" strokeWidth={0.5} />
            <rect x={-3.2} y={3} width={6.4} height={4} rx={1} fill={c.url("osso")} />
            <circle cx={-2} cy={0} r={1.5} fill={d.aura ?? "#120c0a"} />
            <circle cx={2} cy={0} r={1.5} fill={d.aura ?? "#120c0a"} />
          </g>
        </g>
      );
    }
    case "tiara":
      return (
        <g>
          <path d={`M${CX - L + 1} 64 Q${CX} 54 ${CX + L - 1} 64`} fill="none" stroke={c.url("ouro")} strokeWidth={2.2} />
          <path d={`M${CX} 54 l3.4 4.6 l-3.4 4.6 l-3.4 -4.6Z`} fill={d.aura ?? "#7fc8ff"} stroke={c.detalhe.funda} strokeWidth={0.6} />
          <circle cx={CX} cy={58.6} r={4.5} fill={d.aura ?? "#7fc8ff"} opacity={0.35} filter={c.url("brilho")} />
        </g>
      );
    case "bandana": {
      const pano = misturar(d.corRoupa, "#8a1f1f", 0.5);
      return (
        <g>
          <path d={`M${CX - L - 1} 62 Q${CX} 46 ${CX + L + 1} 62 L${CX + L} 70 Q${CX} 56 ${CX - L} 70Z`} fill={pano} stroke={escurecer(pano, 0.5)} strokeWidth={0.8} />
          <path d={`M${CX + L} 64 C${CX + L + 8} 70 ${CX + L + 10} 82 ${CX + L + 12} 94 L${CX + L + 7} 92 C${CX + L + 6} 82 ${CX + L + 3} 74 ${CX + L - 1} 68Z`} fill={escurecer(pano, 0.15)} />
          <path d={`M${CX + L} 66 C${CX + L + 4} 76 ${CX + L + 4} 88 ${CX + L + 3} 98 L${CX + L - 1} 95 C${CX + L} 86 ${CX + L - 1} 76 ${CX + L - 2} 68Z`} fill={escurecer(pano, 0.3)} />
          <path d={`M${CX - L + 4} 63 Q${CX} 52 ${CX + L - 4} 63`} fill="none" stroke={clarear(pano, 0.3)} strokeWidth={0.7} opacity={0.6} />
        </g>
      );
    }
    default:
      return null;
  }
}

/** Chifres saem por cima do capuz e de enfeites leves; chapéu e elmo cobrem. */
export function chifresPorCima(cobertura: string) {
  return cobertura === "capuz" || cobertura === "bandana" || cobertura === "tiara" || cobertura === "coroa-ossos";
}

