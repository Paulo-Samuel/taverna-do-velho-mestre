import type { ReactNode } from "react";
import { clarear, escurecer } from "./cores";
import type { Ctx } from "./contexto";
import { CX, ESPELHO } from "./geometria";

// Pescoço, ombros, figurino de cada ofício e os acessórios (os de trás dos ombros e os da frente).

function par(lado: ReactNode, chave: string) {
  return (
    <g key={chave}>
      {lado}
      <g transform={ESPELHO}>{lado}</g>
    </g>
  );
}

function torso(S: number): string {
  return `M${CX - S - 4} 206 C${CX - S - 2} 182 ${CX - S + 4} 168 ${CX - S + 22} 162 C${CX - S + 36} 157 ${CX - 14} 152 ${CX} 152 C${CX + 14} 152 ${CX + S - 36} 157 ${CX + S - 22} 162 C${CX + S - 4} 168 ${CX + S + 2} 182 ${CX + S + 4} 206Z`;
}

export function Pescoco({ c }: { c: Ctx }) {
  const n = c.pescoco;
  const forma = `M${CX - n} 100 L${CX - n - 1} 152 Q${CX} 162 ${CX + n + 1} 152 L${CX + n} 100Z`;
  return (
    <g>
      <path d={forma} fill={c.url("pescoco")} />
      <path d={forma} fill={c.url("pescocoSombra")} />
      {c.d.sexo !== "mulher" && (
        <path d={`M${CX - n + 3} 128 L${CX - 3} 150 M${CX + n - 3} 128 L${CX + 3} 150`} stroke={c.pele.funda} strokeWidth={1} opacity={0.25} />
      )}
    </g>
  );
}

const MADEIRA = "#7a4a24";

export function Corpo({ c }: { c: Ctx }) {
  const { d, ombro: S, roupa, detalhe, pele } = c;
  const base = torso(S);
  const contorno = <path d={base} fill="none" stroke={roupa.funda} strokeWidth={1} />;
  const sombraPescoco = <ellipse cx={CX} cy={156} rx={18} ry={5} fill="#0c0608" opacity={0.35} filter={c.url("leve")} />;

  switch (d.roupa) {
    case "armadura": {
      const peito = `M${CX - S + 26} 163 Q${CX} 150 ${CX + S - 26} 163 L${CX + S - 30} 206 L${CX - S + 30} 206Z`;
      const ombreira = (x: number, y: number, k: number) => (
        <g>
          <path d={`M${x - 20 * k} ${y + 4} C${x - 18 * k} ${y - 14} ${x + 14 * k} ${y - 18} ${x + 22 * k} ${y + 2} C${x + 16 * k} ${y + 8} ${x - 10 * k} ${y + 12} ${x - 20 * k} ${y + 4}Z`} fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.9} />
          <path d={`M${x - 16 * k} ${y + 10} C${x - 12 * k} ${y + 2} ${x + 14 * k} ${y} ${x + 22 * k} ${y + 12} C${x + 14 * k} ${y + 18} ${x - 6 * k} ${y + 20} ${x - 16 * k} ${y + 10}Z`} fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.9} />
          <path d={`M${x - 18 * k} ${y + 3} C${x - 14 * k} ${y - 12} ${x + 12 * k} ${y - 15} ${x + 20 * k} ${y + 1}`} fill="none" stroke={detalhe.base} strokeWidth={1.3} opacity={c.figurino === "paladino" ? 1 : 0.5} />
          <circle cx={x} cy={y - 6} r={1.2} fill="#e2e6ea" />
        </g>
      );
      return (
        <g>
          <path d={base} fill={c.url("roupa")} />
          <path d={peito} fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.9} />
          <path d={`M${CX} 156 L${CX} 206`} stroke="#e2e6ea" strokeWidth={1.2} opacity={0.5} />
          <path d={`M${CX - S + 30} 186 Q${CX} 180 ${CX + S - 30} 186`} fill="none" stroke="#2a2e34" strokeWidth={0.8} opacity={0.6} />
          {c.figurino === "paladino" && (
            <g>
              <path d={`M${CX - 11} 172 L${CX + 11} 172 L${CX + 13} 206 L${CX - 13} 206Z`} fill={c.url("roupa")} stroke={detalhe.base} strokeWidth={1.2} />
              <path d={`M${CX} 178 L${CX} 198 M${CX - 6} 184 L${CX + 6} 184`} stroke={c.url("ouro")} strokeWidth={2.4} />
            </g>
          )}
          <path d={`M${CX - 16} 148 Q${CX} 157 ${CX + 16} 148 L${CX + 18} 159 Q${CX} 168 ${CX - 18} 159Z`} fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.8} />
          {ombreira(CX + S - 16, 166, 1)}
          <g transform={ESPELHO}>{ombreira(CX + S - 16, 166, 1)}</g>
          {contorno}
        </g>
      );
    }
    case "malha":
      return (
        <g>
          <path d={base} fill={c.url("metal")} />
          <path d={base} fill={c.url("malha")} />
          <path d={`M${CX - 12} 166 L${CX + 12} 166 L${CX + 15} 206 L${CX - 15} 206Z`} fill={c.url("roupa")} stroke={roupa.funda} strokeWidth={0.8} />
          <path d={`M${CX - 12} 166 L${CX + 12} 166`} stroke={detalhe.base} strokeWidth={1.4} />
          {par(<path d={`M${CX + 14} 154 L${CX + S - 14} 166 L${CX + S - 18} 172 L${CX + 12} 160Z`} fill="#4a2e1a" stroke="#2a1a0e" strokeWidth={0.6} />, "alca")}
          <path d={`M${CX - 17} 146 Q${CX} 156 ${CX + 17} 146 L${CX + 19} 157 Q${CX} 167 ${CX - 19} 157Z`} fill="#4a2e1a" stroke="#2a1a0e" strokeWidth={0.7} />
          {contorno}
        </g>
      );
    case "couro":
      return (
        <g>
          <path d={base} fill={c.url("roupa")} />
          {sombraPescoco}
          <path d={`M${CX - 16} 146 Q${CX} 156 ${CX + 16} 146 L${CX + 18} 157 Q${CX} 167 ${CX - 18} 157Z`} fill={roupa.sombra} stroke={roupa.funda} strokeWidth={0.7} />
          <path d={`M${CX - S + 18} 162 L${CX - S + 28} 158 L${CX + S - 6} 206 L${CX + S - 18} 206Z`} fill="#3e2616" stroke="#20120a" strokeWidth={0.7} />
          <rect x={CX + 4} y={176} width={9} height={8} rx={1} transform={`rotate(38 ${CX + 8} 180)`} fill="none" stroke={detalhe.base} strokeWidth={1.6} />
          {par(<path d={`M${CX + 22} 160 Q${CX + S - 14} 160 ${CX + S - 2} 178`} fill="none" stroke={roupa.luz} strokeWidth={0.7} strokeDasharray="1.6 1.6" opacity={0.6} />, "costura")}
          {par(<path d={`M${CX + S - 30} 162 C${CX + S - 22} 156 ${CX + S - 8} 160 ${CX + S - 2} 172 C${CX + S - 12} 170 ${CX + S - 22} 170 ${CX + S - 30} 162Z`} fill={roupa.sombra} stroke={roupa.funda} strokeWidth={0.6} />, "placa")}
          {contorno}
        </g>
      );
    case "manto":
      return (
        <g>
          <path d={base} fill={c.url("roupa")} />
          {sombraPescoco}
          {par(<path d={`M${CX + 13} 151 C${CX + 10} 172 ${CX + 4} 188 ${CX + 2} 206`} fill="none" stroke={c.url("ouro")} strokeWidth={3} />, "barra")}
          <path d={`M${CX - 12} 151 C${CX - 9} 172 ${CX - 3} 188 ${CX} 206 C${CX + 3} 188 ${CX + 9} 172 ${CX + 12} 151Z`} fill={roupa.funda} opacity={0.6} />
          <circle cx={CX} cy={158} r={3.6} fill={c.url("ouro")} stroke={detalhe.funda} strokeWidth={0.5} />
          {d.aura && <circle cx={CX} cy={158} r={1.8} fill={d.aura} />}
          {c.figurino === "mago" && (
            <g fill={detalhe.base} opacity={0.6}>
              {[
                [CX - S + 20, 180],
                [CX + S - 18, 190],
                [CX - 30, 198],
                [CX + 34, 172],
              ].map(([x, y], i) => (
                <path key={i} d={`M${x} ${y - 3} l0.9 2.1 l2.1 0.9 l-2.1 0.9 l-0.9 2.1 l-0.9 -2.1 l-2.1 -0.9 l2.1 -0.9Z`} />
              ))}
            </g>
          )}
          {contorno}
        </g>
      );
    case "pele": {
      // peito à mostra e manto de pele nos ombros: frio é para quem tem camisa
      const pelagem: string[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = CX + 16 + t * (S - 10);
        const y = 168 + t * 18 + (i % 2 ? 7 : 0);
        pelagem.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      const manto = `M${CX + 12} 150 C${CX + S - 30} 150 ${CX + S - 6} 156 ${CX + S + 6} 188 L${CX + S + 6} 192 L${pelagem.reverse().join(" L")}Z`;
      return (
        <g>
          <path d={base} fill={c.url("pescoco")} />
          <path d={`M${CX - 20} 178 Q${CX - 10} 186 ${CX} 181 Q${CX + 10} 186 ${CX + 20} 178`} fill="none" stroke={pele.funda} strokeWidth={1.2} opacity={0.5} />
          <path d={`M${CX - 22} 160 Q${CX - 10} 164 ${CX - 2} 160 M${CX + 22} 160 Q${CX + 10} 164 ${CX + 2} 160`} fill="none" stroke={pele.luz} strokeWidth={1} opacity={0.45} />
          <path d={`M${CX + S - 22} 162 L${CX + S - 12} 166 L${CX - S + 16} 206 L${CX - S + 4} 206Z`} fill="#4a2e1a" stroke="#20120a" strokeWidth={0.7} />
          <g fill="#ece2c8" stroke="#6a5a3a" strokeWidth={0.4}>
            {[-12, -6, 0, 6, 12].map((dx) => (
              <path key={dx} d={`M${CX + dx - 1.6} ${160 + Math.abs(dx) * -0.15 + 4} l1.6 ${6 - Math.abs(dx) * 0.1} l1.6 ${-6 + Math.abs(dx) * 0.1}Z`} />
            ))}
          </g>
          <path d={`M${CX - 14} 162 Q${CX} 168 ${CX + 14} 162`} fill="none" stroke="#3a2416" strokeWidth={0.8} />
          {par(
            <g>
              <path d={manto} fill={c.url("roupa")} stroke={roupa.funda} strokeWidth={0.7} />
              {[0, 1, 2, 3].map((i) => (
                <path key={i} d={`M${CX + 22 + i * 9} ${156 + i * 2} q3 8 1 16`} fill="none" stroke={i % 2 ? roupa.luz : roupa.funda} strokeWidth={0.8} opacity={0.6} />
              ))}
            </g>,
            "pelagem",
          )}
          {contorno}
        </g>
      );
    }
    case "batina":
      return (
        <g>
          <path d={base} fill={c.url("roupa")} />
          {sombraPescoco}
          {par(
            <g>
              <path d={`M${CX + 9} 152 L${CX + 6} 206 L${CX + 16} 206 L${CX + 17} 154Z`} fill={c.url("ouro")} stroke={detalhe.funda} strokeWidth={0.6} />
              <path d={`M${CX + 11} 192 l0 8 M${CX + 8.5} 195 l5 0`} stroke={escurecer(d.corDetalhe, 0.6)} strokeWidth={1.2} />
            </g>,
            "estola",
          )}
          <path d={`M${CX - 15} 148 Q${CX} 158 ${CX + 15} 148 L${CX + 16} 154 Q${CX} 164 ${CX - 16} 154Z`} fill={clarear(d.corRoupa, 0.2)} stroke={roupa.funda} strokeWidth={0.6} />
          {contorno}
        </g>
      );
    default: {
      // túnica (e o gibão do bardo, com mangas bufantes)
      const bardo = c.figurino === "bardo";
      return (
        <g>
          <path d={base} fill={c.url("roupa")} />
          <path d={`M${CX - 13} 151 L${CX} 174 L${CX + 13} 151Z`} fill={c.url("pescoco")} />
          <path d={`M${CX - 13} 151 L${CX} 174 L${CX + 13} 151`} fill="none" stroke={bardo ? detalhe.base : roupa.funda} strokeWidth={2} />
          {bardo ? (
            <g>
              <path d={`M${CX - 6} 158 L${CX + 6} 162 M${CX + 6} 158 L${CX - 6} 162 M${CX - 4} 165 L${CX + 4} 168 M${CX + 4} 165 L${CX - 4} 168`} stroke={detalhe.base} strokeWidth={0.8} />
              {par(
                <g>
                  <ellipse cx={CX + S - 16} cy={168} rx={17} ry={11} fill={c.url("roupa")} stroke={roupa.funda} strokeWidth={0.8} />
                  {[-8, 0, 8].map((dx) => (
                    <path key={dx} d={`M${CX + S - 16 + dx} 158 q2 10 0 20`} stroke={detalhe.base} strokeWidth={2.2} opacity={0.85} fill="none" />
                  ))}
                </g>,
                "mangas",
              )}
            </g>
          ) : (
            par(<path d={`M${CX + 24} 158 Q${CX + S - 18} 164 ${CX + S - 6} 182`} fill="none" stroke={roupa.funda} strokeWidth={0.9} opacity={0.6} />, "costura")
          )}
          {contorno}
        </g>
      );
    }
  }
}

// ---------- acessórios ----------

/** Armas penduradas atrás dos ombros: desenhadas antes do corpo. */
export function AcessorioTras({ c }: { c: Ctx }) {
  const { d } = c;
  switch (d.acessorio) {
    case "espada":
      return (
        <g transform="rotate(24 150 160)">
          <rect x={146} y={136} width={8} height={70} fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.7} />
          <rect x={147} y={104} width={6} height={30} rx={1.5} fill="#3a2414" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M147 ${108 + i * 5} l6 3`} stroke="#6a4a2a" strokeWidth={1} />
          ))}
          <rect x={136} y={132} width={28} height={5} rx={2} fill={c.url("ouro")} stroke="#3a2a14" strokeWidth={0.6} />
          <circle cx={150} cy={101} r={5} fill={c.url("ouro")} stroke="#3a2a14" strokeWidth={0.6} />
        </g>
      );
    case "machado":
      return (
        <g>
          <path d="M70 206 L44 70" stroke={MADEIRA} strokeWidth={5} strokeLinecap="round" />
          <path d="M70 206 L44 70" stroke="#000" strokeWidth={1.5} opacity={0.25} transform="translate(1.5 0)" />
          <path d="M46 66 C30 56 16 64 14 82 C24 76 34 78 44 88Z" fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.8} />
          <path d="M48 64 C60 56 72 60 76 72 C68 70 58 74 51 84Z" fill={c.url("metal")} stroke="#2a2e34" strokeWidth={0.8} />
          <path d="M16 80 C24 70 34 70 42 78" fill="none" stroke="#e2e6ea" strokeWidth={1} opacity={0.6} />
          <rect x={42} y={86} width={8} height={4} rx={1} transform="rotate(-11 46 88)" fill="#3a2414" />
        </g>
      );
    case "arco":
      return (
        <g>
          <path d="M20 30 Q78 108 24 198" fill="none" stroke={MADEIRA} strokeWidth={5} strokeLinecap="round" />
          <path d="M20 30 Q78 108 24 198" fill="none" stroke="#c99a5a" strokeWidth={1.2} opacity={0.6} />
          <path d="M20 30 L24 198" stroke="#e8dcc0" strokeWidth={0.8} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M${138 + i * 4} 168 L${158 + i * 6} ${100 + i * 4}`} stroke="#8a6a44" strokeWidth={1.8} />
              <path d={`M${158 + i * 6} ${100 + i * 4} l-5 1 l3 -9 l5 1Z`} fill={i === 1 ? "#efe6d6" : "#a83a2a"} />
            </g>
          ))}
        </g>
      );
    case "besta":
      return (
        <g>
          <path d="M128 180 L170 98" stroke="#4a2e1a" strokeWidth={6} strokeLinecap="round" />
          <path d="M148 86 Q168 96 188 114" fill="none" stroke="#2a1a10" strokeWidth={4} strokeLinecap="round" />
          <path d="M148 86 L176 112 L188 114" fill="none" stroke="#d8cfb8" strokeWidth={0.7} />
          <path d="M168 96 l6 -6" stroke={c.url("metal")} strokeWidth={3} />
        </g>
      );
    case "foice":
      return (
        <g>
          <path d="M150 206 L162 40" stroke="#2a1d16" strokeWidth={4.5} strokeLinecap="round" />
          <path d="M161 42 C178 28 200 32 210 50 C194 42 178 42 162 54Z" fill={c.url("metal")} stroke="#1a1d22" strokeWidth={0.8} />
          <path d="M166 44 C180 36 196 38 206 48" fill="none" stroke="#e2e6ea" strokeWidth={0.8} opacity={0.5} />
        </g>
      );
    default:
      return null;
  }
}

/** Acessórios na frente do corpo. */
export function AcessorioFrente({ c }: { c: Ctx }) {
  const { d, detalhe } = c;
  const aura = d.aura;
  switch (d.acessorio) {
    case "cajado":
      return (
        <g>
          <path d="M172 206 L163 50" stroke={c.url("madeira")} strokeWidth={5.5} strokeLinecap="round" />
          <path d="M168 120 l3 -2 M166 86 l-3 -2" stroke="#3a2414" strokeWidth={1.6} />
          <path d="M163 52 C156 46 156 36 162 30 M163 52 C170 46 171 36 165 30" fill="none" stroke="#5a3418" strokeWidth={2} />
          {aura && <circle cx={163} cy={36} r={16} fill={aura} opacity={0.35} filter={c.url("brilho")} />}
          <path d="M163 26 L168 36 L163 46 L158 36Z" fill={aura ?? "#9ad8ff"} stroke="#fff" strokeWidth={0.6} />
          <path d="M163 28 L165 36 L163 44" fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.7} />
        </g>
      );
    case "cranio":
      return (
        <g>
          {aura && <ellipse cx={160} cy={176} rx={22} ry={18} fill={aura} opacity={0.3} filter={c.url("brilho")} />}
          <ellipse cx={160} cy={168} rx={15} ry={14} fill={c.url("osso")} stroke="#4a3a24" strokeWidth={0.8} />
          <rect x={151} y={174} width={18} height={12} rx={4} fill={c.url("osso")} stroke="#4a3a24" strokeWidth={0.8} />
          <ellipse cx={154} cy={169} rx={4} ry={4.4} fill="#140c0a" />
          <ellipse cx={166} cy={169} rx={4} ry={4.4} fill="#140c0a" />
          {aura && (
            <g fill={aura}>
              <circle cx={154} cy={169} r={1.5} />
              <circle cx={166} cy={169} r={1.5} />
            </g>
          )}
          <path d="M160 174 l-2 4 l4 0Z" fill="#140c0a" />
          <path d="M154 182 l0 4 M158 182 l0 4.5 M162 182 l0 4.5 M166 182 l0 4" stroke="#4a3a24" strokeWidth={0.8} />
          <path d="M150 160 Q154 154 160 155" fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.4} />
        </g>
      );
    case "alaude":
      return (
        <g>
          <path d="M162 178 L198 128 L203 132 L168 182Z" fill="#4a2a14" stroke="#20120a" strokeWidth={0.6} />
          <path d="M198 128 L206 116 L212 120 L203 132Z" fill="#3a2010" />
          <g transform="rotate(-35 156 192)">
            <ellipse cx={156} cy={192} rx={27} ry={20} fill={c.url("madeira")} stroke="#20120a" strokeWidth={0.8} />
            <ellipse cx={150} cy={186} rx={12} ry={7} fill="#fff" opacity={0.12} />
            <circle cx={160} cy={192} r={5.5} fill="#1a0e08" stroke={detalhe.base} strokeWidth={1} />
          </g>
          <path d="M163 182 L200 129 M165 183 L201 131" stroke="#e8dcc0" strokeWidth={0.4} opacity={0.8} />
        </g>
      );
    case "simbolo":
      return (
        <g>
          <path d={`M${CX - 13} 152 Q${CX} 178 ${CX + 13} 152`} fill="none" stroke={detalhe.base} strokeWidth={1} strokeDasharray="1.6 1" />
          {aura && <circle cx={CX} cy={177} r={9} fill={aura} opacity={0.35} filter={c.url("brilho")} />}
          <g transform={`translate(${CX} 177)`}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <path key={a} d="M-1.4 -6 L0 -9.5 L1.4 -6Z" transform={`rotate(${a})`} fill={c.url("ouro")} />
            ))}
            <circle r={5.6} fill={c.url("ouro")} stroke={detalhe.funda} strokeWidth={0.6} />
            <circle r={2.4} fill={detalhe.funda} opacity={0.5} />
          </g>
        </g>
      );
    case "escudo":
      return (
        <g transform="rotate(-8 40 180)">
          <path d="M12 150 L68 150 C70 178 58 198 40 212 C22 198 10 178 12 150Z" fill={c.url("roupa")} stroke="#2a2e34" strokeWidth={3} />
          <path d="M12 150 L68 150 C70 178 58 198 40 212 C22 198 10 178 12 150Z" fill="none" stroke={c.url("metal")} strokeWidth={2} />
          {c.figurino === "paladino" ? (
            <path d="M40 158 L40 198 M28 170 L52 170" stroke={c.url("ouro")} strokeWidth={4} />
          ) : (
            <path d="M14 168 L40 184 L66 168 L66 176 L40 192 L14 176Z" fill={c.url("ouro")} opacity={0.9} />
          )}
          <ellipse cx={26} cy={160} rx={8} ry={4} fill="#fff" opacity={0.12} />
        </g>
      );
    case "adagas":
      return (
        <g>
          {[
            [CX - 18, 178, -28],
            [CX + 22, 186, 30],
          ].map(([x, y, a], i) => (
            <g key={i} transform={`rotate(${a} ${x} ${y})`}>
              <rect x={x - 1.8} y={y - 14} width={3.6} height={12} rx={1} fill="#2a1a10" />
              <rect x={x - 6} y={y - 2.5} width={12} height={2.6} rx={1} fill={c.url("metal")} />
              <circle cx={x} cy={y - 15} r={2.2} fill={c.url("metal")} />
            </g>
          ))}
        </g>
      );
    case "grimorio":
      return (
        <g transform="rotate(-12 38 184)">
          <rect x={20} y={160} width={40} height={50} rx={3} fill="#efe2c4" />
          <rect x={16} y={158} width={40} height={50} rx={3} fill="#3a1e14" stroke="#1a0c08" strokeWidth={0.8} />
          <rect x={20} y={162} width={32} height={42} rx={2} fill="none" stroke={detalhe.base} strokeWidth={1} />
          {aura && <circle cx={36} cy={182} r={9} fill={aura} opacity={0.4} filter={c.url("brilho")} />}
          <path d="M36 174 L42 186 L30 186Z M36 190 l0 -4" fill="none" stroke={aura ?? detalhe.base} strokeWidth={1.2} />
          <rect x={53} y={176} width={6} height={10} rx={1} fill={c.url("ouro")} />
        </g>
      );
    default:
      return null;
  }
}
