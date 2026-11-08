import type { ReactNode, SVGProps } from "react";

/**
 * Ícones da taverna em traço (24×24, `currentColor`). Substituem os emojis coloridos do sistema, que mudam de
 * desenho em cada aparelho e destoam do pergaminho. O tamanho segue a fonte (`size-[1em]`), então trocar
 * `<span>📌</span>` por `<Icone nome="pin" />` não mexe no layout.
 */
const CAMINHOS = {
  pin: (
    <>
      <path d="M9 3h6l-1.2 6 2.7 2.5H7.5L10.2 9 9 3z" />
      <path d="M12 11.5V21" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M9 8h7M9 12h7M9 16h4" />
    </>
  ),
  dice: (
    <>
      <path d="M12 2.6 20.6 7.3v9.4L12 21.4 3.4 16.7V7.3z" />
      <path d="M12 7.6 7 16h10z" />
      <path d="M12 7.6V2.6M7 16l-3.6.7M17 16l3.6.7" />
    </>
  ),
  drop: <path d="M12 3c3.2 4.2 6 6.9 6 10.2a6 6 0 0 1-12 0C6 9.9 8.8 7.2 12 3z" />,
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2z" />,
  speech: (
    <path d="M20 15.4a2 2 0 0 1-2 2H9l-5 3.6V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
  ),
  book: (
    <>
      <path d="M12 6.6c-1.5-1.3-3.4-1.8-6-1.8v13.4c2.6 0 4.5.5 6 1.8 1.5-1.3 3.4-1.8 6-1.8V4.8c-2.6 0-4.5.5-6 1.8z" />
      <path d="M12 6.6v13.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.6" rx="2" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
    </>
  ),
  phone: (
    <>
      <rect x="8" y="2.5" width="8" height="19" rx="2" />
      <path d="M10.6 18.6h2.8" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.6" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  door: (
    <>
      <path d="M5 21V4.6A1.6 1.6 0 0 1 6.6 3H17v18" />
      <circle cx="13.8" cy="12" r="0.9" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7.6" r="3.2" />
      <path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6.1 6.6 12 6.6 21.4 12 21.4 12 17.9 17.4 12 17.4 2.6 12 2.6 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2.6 12S6.1 6.6 12 6.6c1.6 0 3 .5 4.2 1.2M21.4 12s-3.5 5.4-9.4 5.4c-1.6 0-3-.5-4.2-1.2" />
      <path d="M4 4l16 16" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.6v12.8L7.5 14.5H4z" />
      <path d="M15.4 9.2a3.8 3.8 0 0 1 0 5.6M18 6.6a7.4 7.4 0 0 1 0 10.8" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9.5h3.5L12 5.6v12.8L7.5 14.5H4z" />
      <path d="M16 10l4 4M20 10l-4 4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="7.6" rx="1.6" />
      <path d="M7 15.6h10v4.9H7z" />
    </>
  ),
  place: (
    <>
      <path d="M12 21.2s7-6.2 7-11.2a7 7 0 1 0-14 0c0 5 7 11.2 7 11.2z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  mug: (
    <>
      <path d="M4 8h12v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M5.4 5.6c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.5 3 5.8V20h10v-3.2c1.8-1.3 3-3.2 3-5.8a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11.2" r="1.4" />
      <circle cx="15" cy="11.2" r="1.4" />
      <path d="M10.5 17v3M13.5 17v3" />
    </>
  ),
  candle: (
    <>
      <path d="M9 9.5h6v10.5H9z" />
      <path d="M12 9.5V7.4" />
      <path d="M12 3c1.6 1.3 1.6 2.9 0 4.2C10.4 5.9 10.4 4.3 12 3z" />
    </>
  ),
  tent: (
    <>
      <path d="M12 3.4 21 20H3z" />
      <path d="M12 9.8 17.4 20H6.6z" />
    </>
  ),
  temple: (
    <>
      <path d="M3 9 12 3.4 21 9" />
      <path d="M5.5 9v9M10 9v9M14 9v9M18.5 9v9" />
      <path d="M3.4 20.6h17.2" />
    </>
  ),
  boat: (
    <>
      <path d="M3 14.4h18l-2.6 5H5.6z" />
      <path d="M12 3v11.4" />
      <path d="M12 4.6c3.6 1.5 5.7 4.1 6.1 8.2H12z" />
    </>
  ),
  path: (
    <>
      <path d="M6 21c0-5.6 3.4-7 6.2-9.6C14.6 9 15.6 6.4 18 5" />
      <path d="M15.6 4.6 18 5l-.6 2.5" />
      <path d="M4 21h4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="3.6" />
      <path d="M10.6 10.6 21 21" />
      <path d="M17.2 15.4 19 13.6M14.4 12.8l1.8-1.8" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="8.5" cy="6.6" rx="4.8" ry="2.4" />
      <path d="M3.7 6.6V11c0 1.3 2.2 2.4 4.8 2.4s4.8-1.1 4.8-2.4V6.6" />
      <ellipse cx="15" cy="13" rx="4.8" ry="2.4" />
      <path d="M10.2 13v4.4c0 1.3 2.2 2.4 4.8 2.4s4.8-1.1 4.8-2.4V13" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
      <path d="M12 7.6v8.8" />
    </>
  ),
  bolt: <path d="M13.2 2 5.4 13.2h5.6L10.8 22l7.8-11.2h-5.6z" />,
  note: (
    <>
      <circle cx="7.6" cy="17.4" r="2.5" />
      <path d="M10.1 17.4V5.4l8-2v10" />
      <circle cx="15.6" cy="15.4" r="2.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.5M12 18.7v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.8 12h2.5M18.7 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.6 12.6 9.6 17.6 20 6.6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  pencil: (
    <>
      <path d="M4 20l1-4L16.4 4.6a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.8 6.2 17.8 9.2" />
    </>
  ),
  arrowRight: <path d="M4 12h15.4M14 6.4l5.6 5.6-5.6 5.6" />,
  arrowDown: <path d="M12 4v15.4M6.4 14l5.6 5.6 5.6-5.6" />,
  shuffle: (
    <>
      <path d="M3 7h4l10 10h4M17 4l4 3-4 3M3 17h4l10-10h4M17 14l4 3-4 3" />
    </>
  ),
  bow: (
    <>
      <path d="M4 4c8 1.4 13.6 7 15 15" />
      <path d="M4 4l15 15" />
      <path d="M15.4 15.4 19 19l-3.2-1" />
    </>
  ),
  axe: (
    <>
      <path d="M13.2 3.6c3 1.2 5 3.4 5.8 6.4L13.6 15.4l-3.2-3.2 2.8-2.8" />
      <path d="M16.2 3.2 20.8 8" />
      <path d="M11.2 12.6 4 19.8" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3.4l1.9 5.4 5.4 1.9-5.4 1.9L11 18l-1.9-5.4L3.7 10.7l5.4-1.9z" />
      <path d="M18.6 15.4l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({
  nome,
  className,
  ...resto
}: { nome: NomeIcone } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={`inline-block size-[1em] shrink-0 align-[-0.125em] ${className ?? ""}`}
      {...resto}
    >
      {CAMINHOS[nome]}
    </svg>
  );
}

/**
 * Emoji colorido -> ícone. Vale para os textos que ainda chegam como string (rótulos de dados, chips,
 * linhas do diário); o que não estiver aqui continua saindo como está, sem quebrar nada.
 */
const EMOJI_ICONE: Record<string, NomeIcone> = {
  "📌": "pin",
  "📜": "scroll",
  "🎲": "dice",
  "🩸": "drop",
  "🌙": "moon",
  "💬": "speech",
  "📖": "book",
  "🔒": "lock",
  "📱": "phone",
  "🖥️": "desktop",
  "🖥": "desktop",
  "🚪": "door",
  "👤": "person",
  "👁️": "eye",
  "👁": "eye",
  "🙈": "eyeOff",
  "🔊": "sound",
  "🔈": "soundOff",
  "🖨️": "printer",
  "🖨": "printer",
  "📍": "place",
  "🍺": "mug",
  "⚡": "bolt",
  "🕯️": "candle",
  "🕯": "candle",
  "⛵": "boat",
  "🎪": "tent",
  "🏛️": "temple",
  "🏛": "temple",
  "🎻": "note",
  "🗝️": "key",
  "🗝": "key",
  "💀": "skull",
  "☠": "skull",
  "💰": "coins",
  "🐎": "path",
  "⚰️": "skull",
  "⚰": "skull",
  "🛡️": "shield",
  "🛡": "shield",
  "🔀": "shuffle",
  "⛓️": "lock",
  "⛓": "lock",
  "🏹": "bow",
  "🪓": "axe",
  "✨": "sparkle",
};

const RE_EMOJI = new RegExp(
  "(" + Object.keys(EMOJI_ICONE).sort((a, b) => b.length - a.length).join("|") + ")",
  "u",
);

/** Texto com emoji: cada emoji conhecido vira `<Icone>` no meio do texto, com o mesmo tamanho da fonte. */
export function TextoComIcones({ texto }: { texto: string }) {
  const partes = texto.split(RE_EMOJI);
  if (partes.length === 1) return <>{texto}</>;
  return (
    <>
      {partes.map((parte, i) =>
        EMOJI_ICONE[parte] ? <Icone key={i} nome={EMOJI_ICONE[parte]} /> : parte,
      )}
    </>
  );
}
