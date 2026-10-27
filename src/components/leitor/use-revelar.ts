"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { calcularLimites, listarUnidades, marcarParagrafos, paginaDoX, textosDasPaginas, unidadeEm, VAO, type Unidade } from "./paginacao";

// Texto que se revela, como alguém contando, e as páginas do turno.
// O texto inteiro já está no DOM desde o começo (a página não muda de tamanho enquanto revela); o que ainda não foi "dito" fica
// transparente por um destaque CSS (CSS Custom Highlight API: ::highlight(leitor-oculto) { color: transparent }), atualizado a cada
// quadro sem re-renderizar o React. Cartões (dado, pedido de teste) ficam escondidos até o texto chegar neles.
// A posição revelada é guardada por turno: o texto que ainda chega (streaming) continua de onde parou, e desfazer/outra resposta
// recomeça a contagem. Sem suporte ao destaque, com a animação desligada ou com menos movimento, tudo aparece de uma vez.
// Também cuida da composição da página: texto curto fica no meio do palco (folga em cima, --folga), a capitular só aparece quando
// o texto chega nela, e virar a página tem uma transição curtinha (deslizar ou "virar a folha"), sem movimento para quem pediu menos.

/** Caracteres por segundo da narração. */
const CPS = 58;
const PAUSA_FRASE = 0.3;
const PAUSA_VIRGULA = 0.07;
const PAUSA_PARAGRAFO = 0.35;
const PAUSA_CARTAO = 0.35;
const NOME_DESTAQUE = "leitor-oculto";

type Medida = {
  chave: string;
  unidades: Unidade[];
  total: number;
  limites: number[];
  passo: number;
  base: number;
  /** parágrafos com capitular e a posição da primeira letra deles no fio */
  capitulares: { el: HTMLElement; inicio: number }[];
};

export type Transicao = "deslizar" | "virar";

/** Fração do espaço livre que vai para cima quando o texto cabe com folga (um pouco acima do meio: o centro ótico). */
const FRACAO_FOLGA = 0.4;

export type Layout = { chave: string; paginas: number; textos: string[] };

/** A página pedida dentro das que existem (-1 = a última). */
function paginaReal(m: Medida | null, p: number) {
  const n = m ? m.limites.length : 1;
  return p < 0 ? n - 1 : Math.min(p, n - 1);
}

export function suportaRevelar() {
  return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}

/** Quanto tempo (s) leva para "dizer" a posição: pausas leves no fim das frases, nas vírgulas e entre parágrafos. */
function custo(unidades: Unidade[], pos: number): number {
  const u = unidadeEm(unidades, pos);
  if (!u) return 0;
  if (u.tipo === "cartao") return PAUSA_CARTAO;
  const i = pos - u.inicio;
  const c = u.no.data[i];
  const prox = u.no.data[i + 1];
  let t = 1 / CPS;
  if (/[.!?…]/.test(c) && (prox === undefined || /[\s"”»')]/.test(prox))) t += PAUSA_FRASE;
  else if (/[,;:—]/.test(c)) t += PAUSA_VIRGULA;
  if (i === u.tamanho - 1 && u.fimDeBloco) t += PAUSA_PARAGRAFO;
  return t;
}

export function useRevelar({
  chave,
  pagina,
  animar,
  lidoAoAbrir,
  aoPaginaExterna,
  transicao = "deslizar",
  centralizar = true,
}: {
  /** turno à vista */
  chave: string;
  /** página pedida (-1 = a última) */
  pagina: number;
  animar: boolean;
  /** turno sem nada que chegou nesta sessão: aparece inteiro */
  lidoAoAbrir: boolean;
  /** o visor rolou sozinho (foco andou para outra página, cartão cresceu e mudou de página): a página passa a ser esta */
  aoPaginaExterna: (k: number) => void;
  /** como a página troca */
  transicao?: Transicao;
  /** texto que cabe numa página só fica no meio do palco */
  centralizar?: boolean;
}) {
  /** o visor (overflow escondido, rola de página em página) e o fluxo de colunas dentro dele */
  const visor = useRef<HTMLDivElement>(null);
  const fluxo = useRef<HTMLDivElement>(null);
  const posicoes = useRef(new Map<string, number>());
  const medida = useRef<Medida | null>(null);
  const params = useRef({ chave, pagina, animar, lidoAoAbrir, aoPaginaExterna, transicao, centralizar });
  const [layout, setLayout] = useState<Layout>({ chave: "", paginas: 1, textos: [] });
  const [completa, setCompleta] = useState(true);
  const [terminou, setTerminou] = useState(true);
  const estadoVisivel = useRef({ completa: true, terminou: true });
  const aplicado = useRef<{ medida: Medida | null; pos: number }>({ medida: null, pos: -1 });
  const rolagem = useRef<{ alvo: number; ate: number } | null>(null);
  const seguir = useRef<{ el: HTMLElement; ate: number } | null>(null);
  /** a transição de página em andamento (medir espera ela acabar: o transform mexe nas coordenadas) */
  const animando = useRef<Animation | null>(null);
  /** o medir mais novo, para medir de novo no quadro seguinte (de dentro do próprio medir) */
  const remedir = useRef<() => void>(() => {});

  const lerPos = useCallback((m: Medida) => {
    const e = params.current;
    let pos = posicoes.current.get(m.chave);
    if (pos === undefined) pos = e.lidoAoAbrir || !e.animar ? Infinity : 0;
    // o turno encolheu (desfazer, outra resposta): volta junto, para o texto novo ser contado de novo
    if (pos > m.total) pos = m.total;
    posicoes.current.set(m.chave, pos);
    return pos;
  }, []);

  /** Desenha o estado revelado: destaque transparente do ponto atual até o fim e cartões ainda não alcançados escondidos. */
  const aplicar = useCallback((m: Medida, pos: number) => {
    if (aplicado.current.medida === m && aplicado.current.pos === pos) return;
    aplicado.current = { medida: m, pos };
    for (const c of m.capitulares) {
      const oculta = c.inicio >= pos;
      if (oculta !== c.el.hasAttribute("data-oculta")) c.el.toggleAttribute("data-oculta", oculta);
    }
    for (const u of m.unidades) {
      if (u.tipo !== "cartao") continue;
      const oculto = u.inicio >= pos;
      if (oculto !== u.el.hasAttribute("data-leitor-oculto")) u.el.toggleAttribute("data-leitor-oculto", oculto);
    }
    if (!suportaRevelar()) return;
    const ultima = m.unidades.at(-1);
    if (pos >= m.total || !ultima) {
      CSS.highlights.delete(NOME_DESTAQUE);
      return;
    }
    const u = unidadeEm(m.unidades, pos);
    if (!u) return;
    const r = document.createRange();
    if (u.tipo === "texto") r.setStart(u.no, pos - u.inicio);
    else r.setStartBefore(u.el);
    if (ultima.tipo === "texto") r.setEnd(ultima.no, ultima.tamanho);
    else r.setEndAfter(ultima.el);
    CSS.highlights.set(NOME_DESTAQUE, new Highlight(r));
  }, []);

  const atualizarVisivel = useCallback((m: Medida, pos: number) => {
    const alvo = m.limites[paginaReal(m, params.current.pagina)] ?? m.total;
    const c = pos >= alvo;
    const t = pos >= m.total;
    if (c !== estadoVisivel.current.completa) {
      estadoVisivel.current.completa = c;
      setCompleta(c);
    }
    if (t !== estadoVisivel.current.terminou) {
      estadoVisivel.current.terminou = t;
      setTerminou(t);
    }
  }, []);

  /** Leva o visor à página, de uma vez (a transição fica por conta do animarPagina). */
  const encaixar = useCallback(() => {
    const v = visor.current;
    const m = medida.current;
    if (!v || !m) return;
    const alvo = paginaReal(m, params.current.pagina) * m.passo;
    if (Math.abs(v.scrollLeft - alvo) < 1) return;
    rolagem.current = { alvo, ate: Date.now() + 900 };
    v.scrollTo({ left: alvo, behavior: "auto" });
  }, []);

  /** Mede o fluxo: marca parágrafos pequenos, conta as páginas, monta o fio e os limites. */
  const medir = useCallback(() => {
    const f = fluxo.current;
    const v = visor.current;
    if (!f || !v || !v.clientWidth || animando.current) return;
    const passo = v.clientWidth + VAO;
    const cs = getComputedStyle(f);
    // a folga de cima (texto curto no meio) entra no padding: a página útil não conta com ela
    const folgaAtual = parseFloat(f.style.getPropertyValue("--folga")) || 0;
    const alturaPagina = f.clientHeight - (parseFloat(cs.paddingTop) - folgaAtual) - parseFloat(cs.paddingBottom);
    marcarParagrafos(f, alturaPagina);
    const paginas = Math.max(1, Math.round((v.scrollWidth + VAO) / passo));
    // texto que cabe numa página só: o espaço que sobra vai um pouco para cima, para ele não ficar grudado no topo
    let folga = 0;
    const primeiro = f.firstElementChild;
    const ultimo = f.lastElementChild;
    if (paginas === 1 && params.current.centralizar && primeiro && ultimo) {
      const topo = primeiro.getBoundingClientRect().top - parseFloat(getComputedStyle(primeiro).marginTop);
      const fundo = ultimo.getBoundingClientRect().bottom + parseFloat(getComputedStyle(ultimo).marginBottom);
      const livre = alturaPagina - (fundo - topo);
      if (livre > 24) folga = Math.round(livre * FRACAO_FOLGA);
    }
    if (Math.abs(folga - folgaAtual) > 1) {
      f.style.setProperty("--folga", `${folga}px`);
      // a folga mudou a página: mede de novo antes de pintar (estável: com a folga nova o texto continua cabendo)
      if (paginas > 1 || folga < folgaAtual) requestAnimationFrame(() => remedir.current());
    }
    const { unidades, total } = listarUnidades(f);
    const base = f.getBoundingClientRect().left;
    const limites = calcularLimites(unidades, total, paginas, base, passo);
    const capitulares = [...f.querySelectorAll<HTMLElement>("[data-capitular]")].flatMap((el) => {
      const u = unidades.find((x) => x.tipo === "texto" && el.contains(x.no));
      return u ? [{ el, inicio: u.inicio }] : [];
    });
    const chaveAtual = params.current.chave;
    const m: Medida = { chave: chaveAtual, unidades, total, limites, passo, base, capitulares };
    medida.current = m;
    const textos = textosDasPaginas(unidades, limites);
    setLayout((l) =>
      l.chave === chaveAtual && l.paginas === paginas && l.textos.length === textos.length && l.textos.every((t, i) => t === textos[i])
        ? l
        : { chave: chaveAtual, paginas, textos },
    );
    const pos = lerPos(m);
    aplicar(m, pos);
    atualizarVisivel(m, pos);
    // cartão com que a pessoa mexeu (rolando o dado) cresceu e foi para outra página: a página vai atrás dele
    const s = seguir.current;
    if (s && s.ate > Date.now() && s.el.isConnected && f.contains(s.el)) {
      const r = s.el.getClientRects()[0];
      const k = r ? paginaDoX(r.left, f.getBoundingClientRect().left, passo) : paginaReal(m, params.current.pagina);
      // só quando ele foi empurrado para a frente (cresceu); se encolheu, a página atual já mostra o que vem depois dele
      if (k > paginaReal(m, params.current.pagina)) {
        params.current.aoPaginaExterna(k);
        return;
      }
    }
    encaixar();
  }, [lerPos, aplicar, atualizarVisivel, encaixar]);

  /** A transição de página: a folha nova entra deslizando (ou virando, no modo história) do lado de onde veio. */
  const animarPagina = useCallback(
    (dir: 1 | -1) => {
      const v = visor.current;
      if (!v || typeof v.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const virar = params.current.transicao === "virar";
      const origem = dir > 0 ? "left center" : "right center";
      const quadros: Keyframe[] = virar
        ? [
            { opacity: 0, transform: `perspective(1600px) rotateY(${dir * -11}deg) translateX(${dir * 14}px)`, transformOrigin: origem },
            { opacity: 1, transform: "none", transformOrigin: origem },
          ]
        : [
            { opacity: 0, transform: `translateX(${dir * 22}px)` },
            { opacity: 1, transform: "none" },
          ];
      const a = v.animate(quadros, { duration: virar ? 440 : 280, easing: "cubic-bezier(.2,.7,.25,1)" });
      animando.current = a;
      const fim = () => {
        if (animando.current !== a) return;
        animando.current = null;
        medir();
      };
      a.addEventListener("finish", fim);
      a.addEventListener("cancel", fim);
    },
    [medir],
  );

  // parâmetros novos a cada render; mede depois de cada render (o conteúdo do turno pode ter mudado)
  const paginaAnterior = useRef({ chave, pagina: paginaReal(null, pagina) });
  useLayoutEffect(() => {
    params.current = { chave, pagina, animar, lidoAoAbrir, aoPaginaExterna, transicao, centralizar };
    const real = paginaReal(medida.current?.chave === chave ? medida.current : null, pagina);
    const antes = paginaAnterior.current;
    const mudouPagina = antes.chave === chave && antes.pagina !== real;
    const mudouCena = antes.chave !== chave;
    paginaAnterior.current = { chave, pagina: real };
    // troca de página no meio da transição anterior: corta a anterior para medir e encaixar já
    if (mudouPagina || mudouCena) animando.current?.cancel();
    medir();
    if (mudouPagina) animarPagina(real > antes.pagina ? 1 : -1);
    // cena nova: entra com um esmaecer curto (só opacidade: não mexe nas medidas)
    else if (mudouCena && fluxo.current && typeof fluxo.current.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      fluxo.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease-out" });
  });

  // mudanças que não passam pelo React: tamanho da janela, fontes chegando, cartões crescendo, tema
  useEffect(() => {
    remedir.current = medir;
    const f = fluxo.current;
    const v = visor.current;
    if (!f || !v) return;
    let quadro = 0;
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(medir);
    };
    const tamanho = new ResizeObserver(agendar);
    tamanho.observe(v);
    const observarFilhos = () => {
      for (const filho of f.children) tamanho.observe(filho);
    };
    observarFilhos();
    const mutacoes = new MutationObserver((lista) => {
      if (lista.some((x) => x.type === "childList")) observarFilhos();
      agendar();
    });
    mutacoes.observe(f, { childList: true, subtree: true, characterData: true });
    document.fonts?.addEventListener?.("loadingdone", agendar);
    // tema/fonte trocados no documento
    const tema = new MutationObserver(agendar);
    tema.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-tema"] });
    // mexeu num cartão (rolar o dado): se ele crescer e mudar de página, a página vai atrás
    const tocar = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-cartao]");
      if (el) seguir.current = { el, ate: Date.now() + 15000 };
    };
    f.addEventListener("pointerdown", tocar);
    f.addEventListener("keydown", tocar);
    // o visor rolou sem a gente pedir (foco num elemento de outra página): a página acompanha
    let espera: ReturnType<typeof setTimeout> | undefined;
    const rolou = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const m = medida.current;
        if (!m) return;
        const r = rolagem.current;
        if (r && r.ate > Date.now() && Math.abs(v.scrollLeft - r.alvo) > 1) return;
        rolagem.current = null;
        const k = Math.round(v.scrollLeft / m.passo);
        if (k !== paginaReal(m, params.current.pagina)) params.current.aoPaginaExterna(k);
        else encaixar();
      }, 140);
    };
    v.addEventListener("scroll", rolou, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(espera);
      tamanho.disconnect();
      mutacoes.disconnect();
      tema.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", agendar);
      f.removeEventListener("pointerdown", tocar);
      f.removeEventListener("keydown", tocar);
      v.removeEventListener("scroll", rolou);
    };
  }, [medir, encaixar]);

  // o relógio do revelar: avança a posição pelo tempo, até o fim da página à vista (ou até onde o texto já chegou)
  useEffect(() => {
    let quadro = 0;
    let antes = performance.now();
    let saldo = 0;
    const passo = (agora: number) => {
      quadro = requestAnimationFrame(passo);
      const dt = Math.min(0.25, (agora - antes) / 1000);
      antes = agora;
      const m = medida.current;
      if (!m || m.chave !== params.current.chave) return;
      let pos = lerPos(m);
      const alvo = Math.min(m.total, m.limites[paginaReal(m, params.current.pagina)] ?? m.total);
      if (!params.current.animar || !suportaRevelar()) {
        pos = Math.max(pos, m.total);
      } else if (pos < alvo) {
        saldo += dt;
        while (pos < alvo) {
          const c = custo(m.unidades, pos);
          if (saldo < c) break;
          saldo -= c;
          pos++;
        }
      } else {
        saldo = 0;
      }
      posicoes.current.set(m.chave, pos);
      aplicar(m, pos);
      atualizarVisivel(m, pos);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      if (suportaRevelar()) CSS.highlights.delete(NOME_DESTAQUE);
    };
  }, [lerPos, aplicar, atualizarVisivel]);

  /** Mostra de uma vez o que falta da página à vista (clique, Espaço, Enter). */
  const revelarPagina = useCallback(() => {
    const m = medida.current;
    if (!m || m.chave !== params.current.chave) return;
    const alvo = m.limites[paginaReal(m, params.current.pagina)] ?? m.total;
    const pos = Math.max(lerPos(m), alvo);
    posicoes.current.set(m.chave, pos);
    aplicar(m, pos);
    atualizarVisivel(m, pos);
  }, [lerPos, aplicar, atualizarVisivel]);

  /** Dá por lido tudo até o fim da página k (ir direto ao dado). */
  const revelarAte = useCallback(
    (k: number) => {
      const m = medida.current;
      if (!m || m.chave !== params.current.chave) return;
      const alvo = m.limites[Math.min(Math.max(0, k), m.limites.length - 1)] ?? m.total;
      const pos = Math.max(lerPos(m), alvo);
      posicoes.current.set(m.chave, pos);
      aplicar(m, pos);
      atualizarVisivel(m, pos);
    },
    [lerPos, aplicar, atualizarVisivel],
  );

  /** Em que página do turno à vista está o elemento. */
  const paginaDe = useCallback(
    (el: Element) => {
      const f = fluxo.current;
      const m = medida.current;
      const r = el.getClientRects()[0];
      if (!f || !m || !r) return 0;
      return paginaDoX(r.left, f.getBoundingClientRect().left, m.passo);
    },
    [],
  );

  return { visor, fluxo, layout, completa, terminou, revelarPagina, revelarAte, paginaDe };
}
