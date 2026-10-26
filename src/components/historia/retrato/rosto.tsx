import type { ReactNode } from "react";
import { escurecer, luminancia, misturar } from "./cores";
import type { Ctx } from "./contexto";
import type { FormatoOlho } from "./dados";
import { CX, ESPELHO, OLHO_Y, simetrico } from "./geometria";

// Cabeça e tudo que mora nela: orelhas, pele sombreada, olhos, sobrancelhas, nariz, boca, presas, barba, marcas e chifres.

/** Desenha no lado direito e repete espelhado no esquerdo. */
function par(lado: ReactNode, chave: string) {
  return (
    <g key={chave}>
      {lado}
      <g transform={ESPELHO}>{lado}</g>
    </g>
  );
}

// ---------- orelhas ----------

export function Orelhas({ c }: { c: Ctx }) {
  const { d, g, pele } = c;
  const x = CX + g.l - 1.5;
  const y = 92;
  const forma =
    d.orelhas === "pontuda"
      ? "M0 -7 C8 -13 17 -27 24 -36 C20 -21 13 -3 7 6 C5 10 2 12 0 10 Z"
      : d.orelhas === "pontinha"
        ? "M0 -9 C6 -13 12 -17 15 -21 C13 -10 11 0 7 6 C5 10 2 12 0 10 Z"
        : "M0 -10 C6 -14 10.5 -7 9.5 1 C8.6 8 4.5 12 0 10 Z";
  const dobra = d.orelhas === "pontuda" ? "M3 -5 C9 -12 14 -20 18 -27" : d.orelhas === "pontinha" ? "M3 -6 C7 -9 10 -12 12 -15" : "M2.5 -6 C6.5 -7 7 -1 5 4";
  const lado = (
    <g transform={`translate(${x} ${y})`}>
      <path d={forma} fill={pele.base} stroke={pele.contorno} strokeWidth={0.9} />
      <path d={forma} fill={pele.funda} opacity={0.25} transform="translate(1.5 1) scale(.8)" />
      <path d={dobra} fill="none" stroke={pele.sombra} strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
    </g>
  );
  return par(lado, "orelhas");
}

export function Brinco({ c }: { c: Ctx }) {
  const lado = <circle cx={CX + c.g.l + 2.5} cy={103} r={2.3} fill="none" stroke="#e0b860" strokeWidth={1.2} />;
  return par(lado, "brinco");
}

// ---------- cabeça ----------

export function Cabeca({ c }: { c: Ctx }) {
  const { g, pele, d } = c;
  const corado = d.sexo === "mulher" ? 0.17 : 0.1;
  return (
    <g>
      <path d={g.caminho} fill={c.url("pele")} stroke={pele.contorno} strokeWidth={1.2} />
      <g clipPath={c.url("rosto")}>
        {/* lado da sombra (a luz vem da esquerda, de uma vela que ninguém vê) */}
        <ellipse cx={CX + g.l - 1} cy={98} rx={14} ry={42} fill={pele.funda} opacity={0.4} filter={c.url("suave")} />
        <ellipse cx={CX} cy={g.queixo + 6} rx={30} ry={10} fill={pele.funda} opacity={0.35} filter={c.url("suave")} />
        <ellipse cx={CX - g.olhos} cy={86} rx={9} ry={5.5} fill={pele.funda} opacity={0.22} filter={c.url("leve")} />
        <ellipse cx={CX + g.olhos} cy={86} rx={9} ry={5.5} fill={pele.funda} opacity={0.3} filter={c.url("leve")} />
        <ellipse cx={92} cy={66} rx={15} ry={8} fill={pele.luz} opacity={0.4} filter={c.url("suave")} />
        <ellipse cx={CX - g.olhos - 4} cy={99} rx={7} ry={4} fill={pele.luz} opacity={0.32} filter={c.url("leve")} />
        <ellipse cx={CX - 17} cy={104} rx={7} ry={4} fill="#c0504d" opacity={corado} filter={c.url("leve")} />
        <ellipse cx={CX + 17} cy={104} rx={7} ry={4} fill="#c0504d" opacity={corado * 0.8} filter={c.url("leve")} />
      </g>
      <path d={g.caminho} fill="none" stroke={c.url("aro")} strokeWidth={2} />
    </g>
  );
}

// ---------- olhos ----------

const OLHOS: Record<FormatoOlho, { w: number; h1: number; h2: number; incl: number }> = {
  normal: { w: 6.5, h1: 4.2, h2: 2.8, incl: 0 },
  estreito: { w: 6.5, h1: 2.9, h2: 2, incl: 0 },
  arregalado: { w: 6.6, h1: 5, h2: 3.6, incl: 0 },
  cansado: { w: 6.5, h1: 3.4, h2: 2.6, incl: 0.9 },
  felino: { w: 7, h1: 3.7, h2: 2.4, incl: -1.9 },
};

export function caminhoOlho(formato: FormatoOlho): { contorno: string; palpebra: string; w: number; h1: number; h2: number; incl: number } {
  const { w, h1, h2, incl } = OLHOS[formato] ?? OLHOS.normal;
  const topo = `C${-w * 0.5} ${-h1 * 1.1} ${w * 0.5} ${-h1 * 1.1 + incl * 0.5} ${w} ${incl}`;
  return {
    contorno: `M${-w} 0 ${topo} C${w * 0.5} ${h2 * 1.15 + incl * 0.5} ${-w * 0.5} ${h2 * 1.15} ${-w} 0Z`,
    palpebra: `M${-w} 0 ${topo}`,
    w,
    h1,
    h2,
    incl,
  };
}

export function Olhos({ c }: { c: Ctx }) {
  const { d, g, pele } = c;
  const o = caminhoOlho(d.olhos.formato);
  const escala = d.origem === "halfling" ? 1.1 : 1;
  const mulher = d.sexo === "mulher";
  const branco = d.olhos.brilham ? c.url("olhoBrilho") : misturar("#efe6d6", d.pele, 0.15);
  const olho = (lado: 1 | -1) => (
    <g key={lado} transform={`translate(${CX + lado * g.olhos} ${OLHO_Y}) scale(${lado * escala} ${escala})`}>
      {d.olhos.brilham && <ellipse cx={0} cy={0} rx={9} ry={6} fill={d.olhos.cor} opacity={0.45} filter={c.url("brilho")} />}
      <path d={o.contorno} fill={branco} />
      <g clipPath={c.url("olho")}>
        {d.olhos.brilham ? (
          <ellipse cx={0.4} cy={-0.3} rx={0.8} ry={2.8} fill="#140806" />
        ) : (
          <>
            <circle cx={0.4} cy={-0.3} r={3.2} fill={c.url("iris")} />
            <circle cx={0.4} cy={-0.3} r={1.4} fill="#0d0806" />
            <circle cx={0.4} cy={-0.3} r={3.2} fill="none" stroke="#0d0806" strokeWidth={0.5} opacity={0.6} />
          </>
        )}
        {/* sombra da pálpebra sobre o globo */}
        <path d={`M${-o.w} ${-o.h1 * 1.6} L${o.w} ${-o.h1 * 1.6 + o.incl} L${o.w} ${o.incl - o.h1 * 0.2} Q0 ${-o.h1 * 0.6} ${-o.w} ${-o.h1 * 0.2}Z`} fill={pele.funda} opacity={0.3} />
      </g>
      <circle cx={-0.6} cy={-1.5} r={0.85} fill="#fff" opacity={0.9} />
      <path d={o.palpebra} fill="none" stroke={escurecer(d.pele, 0.75)} strokeWidth={mulher ? 2 : 1.5} strokeLinecap="round" />
      {mulher && <path d={`M${o.w - 0.6} ${o.incl - 0.3} l2.4 -1.8`} stroke={escurecer(d.pele, 0.8)} strokeWidth={1.1} strokeLinecap="round" />}
      <path
        d={`M${-o.w + 1.2} ${-o.h1 - 1.4} Q0 ${-o.h1 * 1.6 - 1.6} ${o.w - 0.6} ${-o.h1 - 1 + o.incl}`}
        fill="none"
        stroke={pele.sombra}
        strokeWidth={0.8}
        opacity={0.6}
      />
      <path d={`M${-o.w + 1} ${o.h2 * 0.9} Q0 ${o.h2 * 1.5} ${o.w - 1} ${o.h2 * 0.8 + o.incl}`} fill="none" stroke={pele.sombra} strokeWidth={0.6} opacity={0.45} />
      {d.olhos.formato === "cansado" && (
        <path d={`M${-o.w + 1.5} ${o.h2 + 2.4} Q0 ${o.h2 + 4.6} ${o.w - 1} ${o.h2 + 2.2 + o.incl}`} fill="none" stroke={pele.funda} strokeWidth={0.9} opacity={0.35} />
      )}
    </g>
  );
  return (
    <g>
      {olho(-1)}
      {olho(1)}
    </g>
  );
}

// ---------- sobrancelhas ----------

const SOBRANCELHAS = {
  reta: "M-6 1 C-2 -0.8 3 -1 7 0 C3 -0.1 -2 0.5 -6 2.7Z",
  arqueada: "M-6 1.3 C-2 -2.6 3 -3 7.5 0.6 C3 -1.5 -2 -0.9 -6 2.7Z",
  grossa: "M-6.5 0 C-2 -2.2 3 -2.2 7.5 0 C3 1 -2 1.5 -6.5 3.6Z",
  franzida: "M-6 2.6 C-2 0 3 -1.6 7.5 -1.2 C3 0 -2 1.9 -6 4.3Z",
};

export function Sobrancelhas({ c }: { c: Ctx }) {
  const { d, g } = c;
  const cor = escurecer(misturar(d.cabelo.cor, d.pele, d.cabelo.estilo === "careca" ? 0.45 : 0.12), 0.12);
  const fina = d.sexo === "mulher" ? 0.8 : 1;
  const giro = d.expressao === "bravo" ? -10 : 0;
  const forma = SOBRANCELHAS[d.sobrancelha] ?? SOBRANCELHAS.reta;
  const sob = (lado: 1 | -1) => {
    const ergue = d.expressao === "desdem" && lado === 1 ? -2.2 : 0;
    return (
      <g key={lado} transform={`translate(${CX + lado * g.olhos} ${OLHO_Y - 10 + ergue}) scale(${lado} ${fina}) rotate(${giro})`}>
        <path d={forma} fill={cor} />
      </g>
    );
  };
  return (
    <g opacity={0.95}>
      {sob(-1)}
      {sob(1)}
    </g>
  );
}

// ---------- nariz ----------

export function Nariz({ c }: { c: Ctx }) {
  const { d, pele } = c;
  const w = { pequeno: 4, reto: 5, adunco: 5.2, largo: 7 }[d.nariz] ?? 5;
  const ponta = d.nariz === "pequeno" ? 101.5 : 103;
  const ponte = d.nariz === "adunco" ? `M103.5 85 C106.5 90 106.5 95 106.5 ${ponta - 1}` : `M103.5 85 C104.5 93 106 98 106.5 ${ponta - 1}`;
  return (
    <g>
      <path d={ponte} fill="none" stroke={pele.funda} strokeWidth={2.2} opacity={0.45} filter={c.url("leve")} />
      <path d={`M99 86 L98.6 ${ponta - 6}`} stroke={pele.luz} strokeWidth={1.8} opacity={0.4} filter={c.url("leve")} />
      {d.nariz === "adunco" && <ellipse cx={100.5} cy={92} rx={1.4} ry={2.4} fill={pele.luz} opacity={0.35} />}
      <ellipse cx={CX} cy={ponta + 2.5} rx={w - 0.5} ry={1.8} fill={pele.funda} opacity={0.35} filter={c.url("leve")} />
      <path d={`M${CX - w} ${ponta - 2} Q${CX - w - 1.6} ${ponta + 1.6} ${CX - w + 2.2} ${ponta + 2.4}`} fill="none" stroke={pele.sombra} strokeWidth={0.9} />
      <path d={`M${CX + w} ${ponta - 2} Q${CX + w + 1.6} ${ponta + 1.6} ${CX + w - 2.2} ${ponta + 2.4}`} fill="none" stroke={pele.funda} strokeWidth={1} />
      <ellipse cx={CX - 2.8} cy={ponta + 1.8} rx={1.4} ry={0.8} fill={escurecer(d.pele, 0.68)} opacity={0.75} />
      <ellipse cx={CX + 2.8} cy={ponta + 1.8} rx={1.4} ry={0.8} fill={escurecer(d.pele, 0.68)} opacity={0.75} />
      <ellipse cx={99} cy={ponta - 1.6} rx={2.3} ry={1.6} fill={pele.luz} opacity={0.5} />
    </g>
  );
}

// ---------- boca ----------

const CANTOS = {
  serio: { e: 0, dir: 0, meio: 0.8 },
  sorriso: { e: -1.2, dir: -2.3, meio: 2.1 },
  desdem: { e: 0.6, dir: -2, meio: 0.6 },
  bravo: { e: 1.6, dir: 1.6, meio: -0.4 },
};

export function Boca({ c }: { c: Ctx }) {
  const { d, g, pele } = c;
  const y = g.bocaY;
  const w = d.origem === "halfling" ? 6.5 : d.sexo === "mulher" ? 7 : 8;
  const k = CANTOS[d.expressao] ?? CANTOS.serio;
  const ex = CX - w;
  const ey = y + k.e;
  const dx = CX + w;
  const dy = y + k.dir;
  const inferior = d.sexo === "mulher" ? 4.8 : 3.6;
  const linha = `M${ex} ${ey} Q${CX} ${y + k.meio} ${dx} ${dy}`;
  return (
    <g>
      <ellipse cx={CX} cy={y + inferior + 2} rx={5} ry={1.5} fill={pele.funda} opacity={0.28} filter={c.url("leve")} />
      <path d={`M${ex} ${ey} C${CX - 5} ${y - 2.6} ${CX - 2} ${y - 2.9} ${CX} ${y - 2} C${CX + 2} ${y - 2.9} ${CX + 5} ${y - 2.6} ${dx} ${dy} Q${CX} ${y + k.meio} ${ex} ${ey}Z`} fill={escurecer(pele.labio, 0.18)} />
      <path d={`M${ex} ${ey} Q${CX} ${y + k.meio} ${dx} ${dy} C${CX + 5} ${y + inferior} ${CX - 5} ${y + inferior} ${ex} ${ey}Z`} fill={pele.labio} />
      <ellipse cx={CX - 0.5} cy={y + inferior * 0.55} rx={3} ry={1} fill={pele.luz} opacity={0.35} />
      <path d={linha} fill="none" stroke={escurecer(d.pele, 0.72)} strokeWidth={1.1} strokeLinecap="round" />
      {d.expressao === "sorriso" && <path d={`M${dx + 0.4} ${dy - 1.6} q1.2 1.2 0.4 2.8`} fill="none" stroke={pele.sombra} strokeWidth={0.7} />}
      {d.presas &&
        par(
          <path
            d={`M${CX + 5.5} ${y + 2.4} C${CX + 5} ${y - 2.6} ${CX + 6} ${y - 6} ${CX + 7.8} ${y - 7.6} C${CX + 8.3} ${y - 4} ${CX + 8.5} ${y - 1} ${CX + 8.3} ${y + 2.6}Z`}
            fill="#efe6cf"
            stroke="#7a6a4a"
            strokeWidth={0.5}
          />,
          "presas",
        )}
    </g>
  );
}

// ---------- barba ----------

export function Barba({ c }: { c: Ctx }) {
  const { d, g } = c;
  if (d.barba === "nenhuma") return null;
  const l = g.l;
  const y = g.bocaY;
  const q = g.queixo;
  const fios = c.cabelo.funda;

  if (d.barba === "costeletas") {
    return par(
      <path d={`M${CX + l - 1} 72 L${CX + l + 1.8} 72 C${CX + l + 2.2} 90 ${CX + l} 100 ${CX + l - 4} 108 C${CX + l - 5.5} 100 ${CX + l - 4.5} 88 ${CX + l - 4.5} 76Z`} fill={c.url("cabelo")} />,
      "costeletas",
    );
  }

  const bigode = simetrico([CX, y - 3.6], [
    [CX + 3, y - 4.7, CX + 8, y - 4.5, CX + 11, y - 1.5],
    d.barba === "cavanhaque" ? [CX + 12, y - 0.4, CX + 12, y + 0.6, CX + 11, y + 1.2] : [CX + 13, y + 0.5, CX + 14, y + 4, CX + 13, y + 7.5],
    [CX + 11, y + 3, CX + 9, y - 0.8, CX + 4, y - 1.6],
    [CX + 2, y - 1.9, CX + 1, y - 1.6, CX, y - 1.2],
  ]);

  if (d.barba === "bigode") {
    return (
      <g>
        <path d={bigode} fill={c.url("cabelo")} stroke={fios} strokeWidth={0.4} />
      </g>
    );
  }

  if (d.barba === "cavanhaque") {
    const queixo = simetrico([CX, y + 4.6], [
      [CX + 3, y + 4.6, CX + 5, y + 5, CX + 6, y + 6.5],
      [CX + 7, y + 11, CX + 5, q + 5, CX, q + 7],
    ]);
    return (
      <g>
        <path d={queixo} fill={c.url("cabelo")} />
        <path d={bigode} fill={c.url("cabelo")} stroke={fios} strokeWidth={0.4} />
      </g>
    );
  }

  const ext = d.barba === "longa" ? 52 : d.barba === "cheia" ? 13 : 1;
  const ultimo: [number, number, number, number, number, number] =
    d.barba === "longa" ? [CX + l - 12, 134 + ext * 0.7, CX + 8, q + ext - 4, CX, q + ext + 4] : [CX + l - 9, 130 + ext * 0.75, CX + 12, q + ext, CX, q + ext + 3];
  const barba = simetrico([CX, y + 4.6], [
    [CX + 4, y + 4.6, CX + 7, y + 3.6, CX + 9.5, y + 2],
    [CX + 13, y - 4, CX + l - 9, 96, CX + l - 1.5, 84],
    [CX + l + 2.5, 100, CX + l + 3, 114, CX + l - 3, 122 + ext * 0.35],
    ultimo,
  ]);

  if (d.barba === "rala") {
    return (
      <g opacity={0.42}>
        <path d={barba} fill={c.cabelo.base} filter={c.url("leve")} />
        <path d={bigode} fill={c.cabelo.base} filter={c.url("leve")} />
      </g>
    );
  }

  const fundo = q + ext;
  const linhas = [-14, -8, -3, 3, 8, 14].map((dx, i) => (
    <path
      key={i}
      d={`M${CX + dx * 1.2} ${y + 8} Q${CX + dx * 1.1} ${(y + fundo) / 2} ${CX + dx * 0.55} ${fundo - 4}`}
      fill="none"
      stroke={i % 2 ? c.cabelo.luz : fios}
      strokeWidth={0.7}
      opacity={0.55}
    />
  ));
  return (
    <g>
      <path d={barba} fill={c.url("cabelo")} stroke={fios} strokeWidth={0.6} />
      {linhas}
      {d.barba === "longa" && (
        <g>
          <rect x={CX - 5} y={fundo - 16} width={10} height={4} rx={1.2} fill={c.url("ouro")} stroke="#5a4020" strokeWidth={0.5} />
          <rect x={CX - 3.6} y={fundo - 7} width={7.2} height={3.4} rx={1} fill={c.url("ouro")} stroke="#5a4020" strokeWidth={0.5} />
        </g>
      )}
      <path d={bigode} fill={c.url("cabelo")} stroke={fios} strokeWidth={0.5} />
    </g>
  );
}

// ---------- marcas ----------

const SARDAS: [number, number, number][] = [
  [-14, 97, 0.7], [-10, 100, 0.6], [-17, 101, 0.8], [-12, 104, 0.6], [-6, 96, 0.5], [-4, 99, 0.6],
  [14, 97, 0.7], [10, 100, 0.6], [17, 101, 0.8], [12, 104, 0.6], [6, 96, 0.5], [4, 99, 0.6], [-20, 98, 0.5], [20, 99, 0.5],
];

/** Marcas pintadas na pele, desenhadas antes dos olhos (pintura de guerra, tatuagens, sardas). */
export function MarcasPele({ c }: { c: Ctx }) {
  const { d, g } = c;
  const cor = d.corMarca;
  if (d.marca === "sardas") {
    return (
      <g fill={escurecer(d.pele, 0.38)} opacity={0.55}>
        {SARDAS.map(([dx, y, r], i) => (
          <circle key={i} cx={CX + dx} cy={y} r={r} />
        ))}
      </g>
    );
  }
  if (d.marca === "pintura-guerra") {
    if (luminancia(cor) > 0.6) {
      // três riscos de tinta clara na bochecha
      return (
        <g clipPath={c.url("rosto")} fill={cor} opacity={0.8} filter={c.url("tinta")}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${CX - g.olhos - 5 + i * 4} ${OLHO_Y + 6} l2.2 0 l-0.6 14 l-1.4 0Z`} />
          ))}
          <path d={`M${CX - 1.5} 62 l3 0 l-0.5 18 l-2 0Z`} />
        </g>
      );
    }
    return (
      <g clipPath={c.url("rosto")} opacity={0.72} filter={c.url("tinta")}>
        <path d={`M${CX - g.l} ${OLHO_Y - 7} L${CX + g.l} ${OLHO_Y - 8} L${CX + g.l} ${OLHO_Y + 5} L${CX + 4} ${OLHO_Y + 4} L${CX} ${OLHO_Y + 8} L${CX - 4} ${OLHO_Y + 4} L${CX - g.l} ${OLHO_Y + 5}Z`} fill={cor} />
      </g>
    );
  }
  if (d.marca === "runas") {
    const x = CX - g.olhos - 3;
    return (
      <g fill="none" stroke={cor} strokeWidth={0.9} strokeLinecap="round" opacity={0.75}>
        <path d={`M${x} ${OLHO_Y + 8} l0 6 M${x} ${OLHO_Y + 10} l2.5 -2`} />
        <path d={`M${x - 4} ${OLHO_Y + 10} l0 5 l2.4 -2.5 l0 -2.5`} />
        <path d={`M${x + 4} ${OLHO_Y + 12} l-1.5 4 l3 0`} />
        <path d={`M${CX} 60 l0 10 M${CX - 3} 63 l3 3 l3 -3`} />
      </g>
    );
  }
  return null;
}

/** Marcas que ficam por cima de tudo no rosto (cicatrizes, tapa-olho, sigilo brilhante). */
export function MarcasFrente({ c }: { c: Ctx }) {
  const { d, g } = c;
  const cicatriz = (caminho: string, chave: string) => (
    <g key={chave} fill="none" strokeLinecap="round">
      <path d={caminho} stroke={escurecer(misturar(d.pele, "#c0504d", 0.45), 0.25)} strokeWidth={2.4} opacity={0.75} />
      <path d={caminho} stroke={misturar(d.pele, "#ffe0d0", 0.45)} strokeWidth={0.8} opacity={0.9} />
    </g>
  );
  switch (d.marca) {
    case "cicatriz-olho":
      return cicatriz(`M${CX + g.olhos - 3} ${OLHO_Y - 16} L${CX + g.olhos + 1} ${OLHO_Y - 4} M${CX + g.olhos + 2} ${OLHO_Y + 3} L${CX + g.olhos + 5} ${OLHO_Y + 13}`, "olho");
    case "cicatriz-bochecha":
      return cicatriz(`M${CX + g.olhos + 6} ${OLHO_Y + 6} Q${CX + g.olhos + 2} ${OLHO_Y + 14} ${CX + g.olhos - 5} ${OLHO_Y + 20}`, "bochecha");
    case "cicatriz-queixo":
      return cicatriz(`M${CX - 5} ${g.queixo - 9} L${CX + 1} ${g.queixo - 1}`, "queixo");
    case "tapa-olho": {
      const x = CX - g.olhos;
      return (
        <g>
          <path d={`M${x - 6} ${OLHO_Y - 2} L${CX - g.l - 3} ${OLHO_Y - 9} M${x + 5} ${OLHO_Y - 4} L${CX + g.l + 2} ${OLHO_Y - 17}`} stroke="#1a1412" strokeWidth={1.6} />
          <ellipse cx={x} cy={OLHO_Y} rx={7} ry={5.8} fill="#1d1714" stroke="#3a2c22" strokeWidth={0.8} />
          <ellipse cx={x - 2} cy={OLHO_Y - 2} rx={2.5} ry={1.4} fill="#fff" opacity={0.12} />
        </g>
      );
    }
    case "sigilo":
      return (
        <g transform={`translate(${CX} 64)`}>
          <circle r={5} fill={d.corMarca} opacity={0.5} filter={c.url("brilho")} />
          <g fill="none" stroke={d.corMarca} strokeWidth={0.9}>
            <circle r={3.6} />
            <path d="M0 -3.6 L3.1 1.8 L-3.1 1.8Z" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

// ---------- chifres ----------

export function ChifresDesenho({ c }: { c: Ctx }) {
  const { d, L, g } = c;
  if (d.chifres === "nenhum") return null;
  if (d.chifres === "carneiro") {
    const x = CX + L - 7;
    const espiral = `M${x} 58 C${x + 12} 42 ${x + 32} 46 ${x + 32} 66 C${x + 32} 82 ${x + 16} 86 ${x + 12} 76 C${x + 9} 68 ${x + 18} 64 ${x + 21} 70`;
    return par(
      <g fill="none" strokeLinecap="round">
        <path d={espiral} stroke="#1e1614" strokeWidth={9} />
        <path d={espiral} stroke={c.url("chifre")} strokeWidth={7.4} />
        <path d={espiral} stroke="#120c0a" strokeWidth={7.4} strokeDasharray="1.2 3" opacity={0.45} />
        <path d={espiral} stroke="#fff" strokeWidth={1.2} opacity={0.18} transform="translate(-1.2 -1.6)" />
      </g>,
      "carneiro",
    );
  }
  const topo = g.topo;
  const forma =
    d.chifres === "curvos"
      ? `M106 ${topo + 10} C108 ${topo - 6} 118 ${topo - 20} 134 ${topo - 26} C146 ${topo - 30} 154 ${topo - 24} 157 ${topo - 15} C148 ${topo - 22} 138 ${topo - 20} 130 ${topo - 12} C122 ${topo - 4} 116 ${topo + 4} 114 ${topo + 13}Z`
      : `M107 ${topo + 9} C107 ${topo - 3} 109 ${topo - 16} 116 ${topo - 28} C117 ${topo - 16} 116 ${topo - 2} 115 ${topo + 10}Z`;
  return par(
    <g transform={d.chifres === "retos" ? `rotate(14 110 ${topo + 8})` : undefined}>
      <path d={forma} fill={c.url("chifre")} stroke="#120c0a" strokeWidth={0.9} />
      <path d={forma} fill="none" stroke="#120c0a" strokeWidth={3} strokeDasharray="0.8 3.2" opacity={0.35} />
    </g>,
    "chifres",
  );
}
