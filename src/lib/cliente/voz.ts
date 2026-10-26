// Narração em voz alta com a Web Speech API (speechSynthesis): grátis, local e sem servidor.
// Fila de falas (um trecho por vez, em pedaços curtos: o Chrome corta falas longas no meio), escolha da voz pt-BR
// (as "Natural"/"Online" do Edge primeiro), velocidade e tom. Preferências no localStorage "taverna:voz".
// Tudo em forma de loja externa (assinar/ler) para useSyncExternalStore: o servidor sempre vê "sem voz".

export type PreferenciasVoz = {
  /** lê sozinho cada narração nova do mestre */
  auto: boolean;
  /** voiceURI escolhida; null = a melhor pt-BR disponível */
  voz: string | null;
  /** 0.5 a 2 */
  velocidade: number;
  /** 0.5 a 1.5 */
  tom: number;
};

export type EstadoVoz = {
  /** speechSynthesis existe e há pelo menos uma voz em português */
  disponivel: boolean;
  /** id do que está falando agora (ex.: "msg-123"), null em silêncio */
  falando: string | null;
};

const CHAVE = "taverna:voz";
export const PREFERENCIAS_VOZ_PADRAO: PreferenciasVoz = { auto: false, voz: null, velocidade: 1, tom: 1 };
const ESTADO_SERVIDOR: EstadoVoz = { disponivel: false, falando: null };

// ---------- limpeza do texto ----------

/**
 * Tira a marcação que não deve ser lida: ((fora do jogo)), **ênfase**, títulos (#), separadores (---), enfeites (✦ ❖ †)
 * e emojis. Parágrafos viram pausa (ponto final), espaços repetidos somem.
 */
export function limparParaFala(texto: string): string {
  return (
    texto
      // fala fora do jogo ((assim)) não é narração
      .replace(/\(\([\s\S]*?\)\)/g, " ")
      // separadores sozinhos na linha
      .replace(/^\s*(?:-{3,}|\*{3,}|_{3,}|✦+|[✦⚜❖❧⚔⁂★❦†•·\s]{3,})\s*$/gmu, "\n\n")
      // títulos de markdown e citações
      .replace(/^\s*#{1,6}\s+/gm, "")
      .replace(/^\s*>\s?/gm, "")
      // itens de lista no começo da linha
      .replace(/^\s*[-*•]\s+/gm, "")
      // ênfase: *, _, ~, `
      .replace(/[*_~`]+/g, "")
      // enfeites tipográficos e setas
      .replace(/[✦✧⚜❖❧⚔⁂★☆❦†‡§¶➶➤→←↑↓↶↻♥♪♫]/gu, " ")
      // emojis (pictogramas, bandeiras, modificadores de tom e o seletor de variação)
      .replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
      // parágrafo: pausa (sem dobrar a pontuação que já existe)
      .replace(/([^.!?…:;,\s])\s*\n{2,}\s*/g, "$1. ")
      .replace(/\s*\n+\s*/g, " ")
      .replace(/\s+([.,!?…;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/** Corta o texto em pedaços de até `max` caracteres, preferindo o fim de frase (o Chrome engasga com falas longas). */
export function dividirEmTrechos(texto: string, max = 220): string[] {
  const frases = texto.match(/[^.!?…]+(?:[.!?…]+["”»]?|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  const trechos: string[] = [];
  let atual = "";
  for (const frase of frases) {
    // frase gigante sem ponto: quebra nas vírgulas ou nos espaços
    const partes = frase.length > max ? (frase.match(new RegExp(`.{1,${max}}(?:[,;:]\\s|\\s|$)`, "g")) ?? [frase]) : [frase];
    for (const parte of partes.map((p) => p.trim()).filter(Boolean)) {
      if (atual && atual.length + 1 + parte.length > max) {
        trechos.push(atual);
        atual = parte;
      } else {
        atual = atual ? `${atual} ${parte}` : parte;
      }
    }
  }
  if (atual) trechos.push(atual);
  return trechos;
}

// ---------- vozes ----------

function sintese(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined" ? window.speechSynthesis : null;
}

/** Nota de preferência: as neurais do Edge ("Natural"/"Online") soam bem melhor que as antigas do Windows. */
function nota(v: SpeechSynthesisVoice): number {
  const nome = v.name.toLowerCase();
  const lang = v.lang.toLowerCase().replace("_", "-");
  let n = lang === "pt-br" ? 100 : 0;
  if (/natural/.test(nome)) n += 40;
  if (/online/.test(nome)) n += 20;
  if (/google/.test(nome)) n += 15;
  if (v.localService) n += 1;
  return n;
}

let vozesCache: SpeechSynthesisVoice[] = [];

/** Vozes em português, da melhor para a pior. */
export function vozesPt(): SpeechSynthesisVoice[] {
  return vozesCache;
}

function lerVozes() {
  const s = sintese();
  vozesCache = s ? s.getVoices().filter((v) => /^pt([-_]|$)/i.test(v.lang)).sort((a, b) => nota(b) - nota(a)) : [];
}

function vozEscolhida(): SpeechSynthesisVoice | null {
  const uri = preferenciasVoz().voz;
  return vozesCache.find((v) => v.voiceURI === uri) ?? vozesCache[0] ?? null;
}

/** Rótulo curto da voz: "Francisca (Natural) · pt-BR". */
export function nomeDaVoz(v: SpeechSynthesisVoice): string {
  const nome = v.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s*-\s*Portuguese.*$/i, "")
    .replace(/\s*Online\s*/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${nome} · ${v.lang.replace("_", "-")}`;
}

// ---------- preferências ----------

let prefs: PreferenciasVoz | null = null;
const ouvintesPrefs = new Set<() => void>();

function limitar(n: unknown, min: number, max: number, padrao: number) {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : padrao;
}

function lerPrefs(): PreferenciasVoz {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return PREFERENCIAS_VOZ_PADRAO;
    const p = JSON.parse(bruto) as Partial<PreferenciasVoz>;
    return {
      auto: typeof p.auto === "boolean" ? p.auto : false,
      voz: typeof p.voz === "string" ? p.voz : null,
      velocidade: limitar(p.velocidade, 0.5, 2, 1),
      tom: limitar(p.tom, 0.5, 1.5, 1),
    };
  } catch {
    return PREFERENCIAS_VOZ_PADRAO;
  }
}

export function preferenciasVoz(): PreferenciasVoz {
  if (!prefs) prefs = lerPrefs();
  return prefs;
}

export const preferenciasVozServidor = () => PREFERENCIAS_VOZ_PADRAO;

export function salvarPreferenciasVoz(mudanca: Partial<PreferenciasVoz>) {
  prefs = { ...preferenciasVoz(), ...mudanca };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prefs));
  } catch {
    // modo privado / armazenamento bloqueado: fica só na memória
  }
  for (const f of ouvintesPrefs) f();
}

export function assinarPreferenciasVoz(f: () => void): () => void {
  ouvintesPrefs.add(f);
  const aoArmazenar = (e: StorageEvent) => {
    if (e.key !== CHAVE) return;
    prefs = lerPrefs();
    f();
  };
  window.addEventListener("storage", aoArmazenar);
  return () => {
    ouvintesPrefs.delete(f);
    window.removeEventListener("storage", aoArmazenar);
  };
}

// ---------- estado (disponível / falando) ----------

let estado: EstadoVoz = ESTADO_SERVIDOR;
const ouvintesEstado = new Set<() => void>();
let iniciado = false;

function mudarEstado(novo: Partial<EstadoVoz>) {
  const proximo = { ...estado, ...novo };
  if (proximo.disponivel === estado.disponivel && proximo.falando === estado.falando) return;
  estado = proximo;
  for (const f of ouvintesEstado) f();
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  const s = sintese();
  if (!s) return;
  const atualizar = () => {
    lerVozes();
    mudarEstado({ disponivel: vozesCache.length > 0 });
  };
  atualizar();
  // as vozes chegam depois (Chrome/Edge carregam assíncrono; as online demoram mais)
  s.addEventListener?.("voiceschanged", atualizar);
  // sair da página (fechar a aba, navegar para fora) cala o mestre
  window.addEventListener("pagehide", () => parar());
}

export function estadoVoz(): EstadoVoz {
  iniciar();
  return estado;
}

export const estadoVozServidor = () => ESTADO_SERVIDOR;

export function assinarEstadoVoz(f: () => void): () => void {
  iniciar();
  ouvintesEstado.add(f);
  return () => ouvintesEstado.delete(f);
}

// ---------- fila de falas ----------

type Item = { id: string; trechos: string[] };
const fila: Item[] = [];
/** muda a cada parar(): falas antigas que terminarem depois não avançam a fila */
let geracao = 0;

function proximoTrecho(g: number) {
  const s = sintese();
  if (!s || g !== geracao) return;
  const item = fila[0];
  if (!item) {
    mudarEstado({ falando: null });
    return;
  }
  const trecho = item.trechos.shift();
  if (trecho === undefined) {
    fila.shift();
    proximoTrecho(g);
    return;
  }
  mudarEstado({ falando: item.id });
  const fala = new SpeechSynthesisUtterance(trecho);
  const voz = vozEscolhida();
  if (voz) {
    fala.voice = voz;
    fala.lang = voz.lang;
  } else {
    fala.lang = "pt-BR";
  }
  const p = preferenciasVoz();
  fala.rate = p.velocidade;
  fala.pitch = p.tom;
  const seguir = () => proximoTrecho(g);
  fala.onend = seguir;
  fala.onerror = seguir;
  s.speak(fala);
}

/**
 * Põe um texto na fila (limpo e cortado em trechos). `interromper` cala o que estiver falando e fala só este
 * (o botão "ouvir"); sem ele, entra no fim da fila (leitura automática).
 */
export function falar(texto: string, opcoes: { id: string; interromper?: boolean }): boolean {
  const s = sintese();
  if (!s || !estadoVoz().disponivel) return false;
  const trechos = dividirEmTrechos(limparParaFala(texto));
  if (!trechos.length) return false;
  if (opcoes.interromper) parar();
  fila.push({ id: opcoes.id, trechos });
  // o Chrome às vezes fica "pausado" depois de um cancel: retoma antes de falar
  if (s.paused) s.resume();
  if (!estado.falando) proximoTrecho(geracao);
  return true;
}

/** Cala tudo e esvazia a fila. */
export function parar() {
  geracao++;
  fila.length = 0;
  sintese()?.cancel();
  mudarEstado({ falando: null });
}
