"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { idUltimaMensagem, resumoParaLeitura, semAnteriormente, type BlocoResumo, type UltimaDoResumo } from "@/components/sessao/noite";
import type { Mensagem } from "@/lib/db";
import type { Cena, EntradaDiario } from "@/lib/sistemas/tipos";
import { fonteGotica } from "./fonte-gotica";
import { Icone } from "@/components/icones";
import { missaoEmAberto } from "@/lib/progresso-missoes";

/** O que a rota do livro devolve com ?formato=resumo (recapitulacao/fechamento chegam com a W21; antes, só o resumo). */
type Resumo = {
  resumo?: string | null;
  resumoAte?: number | null;
  /** a W21 devolve a última mensagem inteira; versões antigas mandavam só o id */
  ultimaMensagem?: UltimaDoResumo;
  fechamento?: string | null;
  recapitulacao?: string | null;
};

/** Quantas mensagens o resumo pode ficar para trás antes de avisar que o fim está só no livro. */
const DEFASAGEM = 20;

function Blocos({ blocos, classe }: { blocos: BlocoResumo[]; classe: string }) {
  return (
    <div className={`mt-3 space-y-2.5 leading-relaxed text-foreground/90 ${classe}`} data-anteriormente-resumo>
      {blocos.map((b, i) =>
        b.tipo === "paragrafo" ? (
          <p key={i}>{b.texto}</p>
        ) : (
          <ul key={i} className="space-y-1 pl-1">
            {b.itens.map((it, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-ambar/70" aria-hidden />
                <span className="min-w-0">{it}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

// "Anteriormente…": ao abrir uma mesa parada há mais de 3 horas, um cartão por cima do topo da conversa lembra onde a
// história estava: o resumo da campanha (ou o último parágrafo do mestre), o lugar e o momento da cena e as missões em
// aberto. Sem chamar a IA. "Continuar de onde paramos" fecha e rola até o fim; dá para recolher e reabrir.
// O resumo não vem no estado da mesa: busca na rota do livro (?formato=resumo).

/** Parada há mais que isso conta como "voltando à mesa". */
const PAUSA_MS = 3 * 60 * 60 * 1000;

/** O SQLite grava em UTC sem fuso ("2026-10-25 14:03:00"). */
export const dataDoBanco = (dataSqlite: string) => new Date(dataSqlite.replace(" ", "T") + "Z");

/** Último parágrafo do mestre, sem marcação (parágrafo curtinho junta com o anterior). */
export function ultimoParagrafoDoMestre(mensagens: Mensagem[]): string | null {
  const fala = mensagens.findLast((m) => m.tipo === "mestre" && m.texto.trim());
  if (!fala) return null;
  const paragrafos = fala.texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\(\([\s\S]*?\)\)/g, "").replace(/[*_#>`]+/g, "").replace(/\s+/g, " ").trim())
    .filter((p) => p && !/^[-✦\s]+$/.test(p));
  const ultimo = paragrafos.at(-1) ?? "";
  const texto = ultimo.length < 120 && paragrafos.length > 1 ? `${paragrafos.at(-2)} ${ultimo}` : ultimo;
  return texto.length > 520 ? `…${texto.slice(-520).replace(/^\S*\s/, "")}` : texto || null;
}

function haQuanto(ms: number): string {
  const horas = Math.round(ms / 3_600_000);
  if (horas < 24) return `há ${horas} horas`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses <= 1 ? "há um mês" : `há ${meses} meses`;
}

export function Anteriormente({
  campanhaId,
  nome,
  mensagens,
  cena,
  diario,
  livro = false,
  aoContinuar,
  aoMudarFase,
}: {
  campanhaId: number;
  nome: string;
  mensagens: Mensagem[];
  cena: Cena;
  diario: EntradaDiario[];
  /** visual de livro do modo história */
  livro?: boolean;
  aoContinuar: () => void;
  /** avisa quando o cartão abre (true) e quando recolhe ou fecha (false): a mesa tira o leitor de trás do véu do foco e do toque */
  aoMudarFase?: (aberto: boolean) => void;
}) {
  const [fase, setFase] = useState<"oculto" | "aberto" | "recolhido">("oculto");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [inteiro, setInteiro] = useState(false);
  const [pausa, setPausa] = useState(0);
  // as mensagens de quando o cartão decidiu abrir (o que chega depois é a sessão de hoje)
  const [iniciais, setIniciais] = useState(mensagens);
  const atuais = useRef(mensagens);
  useEffect(() => {
    atuais.current = mensagens;
  }, [mensagens]);

  // Decide se abre: a última mensagem é mais velha que a pausa e o cartão ainda não apareceu para ela nesta aba
  // (sessionStorage). Roda ao abrir a mesa, ao voltar para a aba (visibilitychange) e quando a conexão reabre com o estado
  // novo (estado_inicial): o aparelho que ficou a noite inteira com a mesa aberta também ganha o "Anteriormente".
  useEffect(() => {
    let controle: AbortController | null = null;
    const chave = `taverna:anteriormente:${campanhaId}`;
    const avaliar = (lista: Mensagem[]) => {
      const ultima = lista.at(-1);
      if (!ultima || controle) return;
      const parada = Date.now() - dataDoBanco(ultima.criadaEm).getTime();
      if (!(parada > PAUSA_MS)) return;
      try {
        if (sessionStorage.getItem(chave) === String(ultima.id)) return;
      } catch {
        /* sem storage: decide só pela pausa */
      }
      const c = new AbortController();
      controle = c;
      fetch(`/api/campanhas/${campanhaId}/livro?formato=resumo`, { signal: c.signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((corpo: Resumo | null) => {
          if (c.signal.aborted) return;
          controle = null;
          try {
            sessionStorage.setItem(chave, String(ultima.id));
          } catch {
            /* idem */
          }
          setResumo(corpo);
          setInteiro(false);
          setIniciais(lista);
          setPausa(parada);
          setFase("aberto");
        });
    };
    avaliar(atuais.current);
    const aoVoltar = () => document.visibilityState === "visible" && avaliar(atuais.current);
    const aoEvento = (e: Event) => {
      const ev = (e as CustomEvent<{ e?: string; estado?: { mensagens?: Mensagem[] } }>).detail;
      if (ev?.e === "estado_inicial" && ev.estado?.mensagens) avaliar(ev.estado.mensagens);
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("taverna:evento", aoEvento);
    return () => {
      controle?.abort();
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("taverna:evento", aoEvento);
    };
  }, [campanhaId]);

  // avisa a mesa quando o cartão abre e quando recolhe ou fecha (a função fica num ref: trocar de função não avisa de novo)
  const avisar = useRef(aoMudarFase);
  useEffect(() => {
    avisar.current = aoMudarFase;
  }, [aoMudarFase]);
  const botaoContinuar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    avisar.current?.(fase === "aberto");
  }, [fase]);
  useEffect(() => () => avisar.current?.(false), []);

  // Esc recolhe; ao abrir, o foco vai ao "Continuar de onde paramos"
  useEffect(() => {
    if (fase !== "aberto") return;
    botaoContinuar.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFase("recolhido");
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [fase]);

  // recolheu (Esc, chevron ou clique no véu): o foco fica na pílula, em vez de cair no <body>
  const botaoPilula = useRef<HTMLButtonElement>(null);
  const faseAnterior = useRef(fase);
  useEffect(() => {
    if (faseAnterior.current === "aberto" && fase === "recolhido") botaoPilula.current?.focus({ preventScroll: true });
    faseAnterior.current = fase;
  }, [fase]);

  if (fase === "oculto") return null;

  const continuar = () => {
    setFase("oculto");
    aoContinuar();
  };

  if (fase === "recolhido")
    return (
      <div
        className={`pointer-events-none z-20 flex justify-end px-4 ${
          // no livro, a coluna de texto ocupa a largura toda até a tela ficar bem larga: ali a pílula ganha uma linha própria
          // (não cobre a ação do topo da cena); em tela larga ela flutua na margem direita, fora da coluna
          livro ? "relative shrink-0 pt-2 xl:absolute xl:inset-x-0 xl:top-2 xl:pt-0" : "absolute inset-x-0 top-2"
        }`}
      >
        {/* no canto, fora do caminho do texto; no celular só o ícone (o nome fica para o leitor de tela e para a dica) */}
        <div className="pointer-events-auto surgir flex items-center overflow-hidden rounded-full border border-ambar/40 bg-surface/95 text-xs shadow-lg backdrop-blur">
          <button
            ref={botaoPilula}
            type="button"
            onClick={() => setFase("aberto")}
            className="relative inline-flex min-h-10 items-center gap-1.5 px-3 text-ambar hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ambar max-sm:w-10 max-sm:justify-center max-sm:px-0 sm:min-h-9"
            aria-expanded={false}
            aria-label="Abrir o resumo: Anteriormente"
            title="Anteriormente…"
          >
            <Icone nome="scroll" /> <span className="max-sm:sr-only">Anteriormente…</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFase("oculto");
              // a pílula some: o foco vai ao palco da mesa, em vez de cair no <body>
              document.getElementById("palco-da-mesa")?.focus({ preventScroll: true });
            }}
            className="grid min-h-10 w-10 place-items-center border-l border-border text-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ambar sm:min-h-9 sm:w-9" aria-label="Dispensar o resumo">
            <Icone nome="close" />
          </button>
        </div>
      </div>
    );

  // a recapitulação da última noite vem primeiro; depois o fechamento; depois o resumo da campanha; por fim, o último parágrafo
  // (a recapitulação costuma abrir com "Anteriormente…", que o título já diz)
  const escrito =
    [resumo?.recapitulacao, resumo?.fechamento, resumo?.resumo]
      .map((t) => (t ? semAnteriormente(t) : t))
      .find(Boolean) ?? null;
  const leitura = escrito ? resumoParaLeitura(escrito, inteiro ? 100_000 : 120) : null;
  // sem resumo, o último parágrafo do mestre costuma ser o próprio "Anteriormente…" que entrou no chat: tira a palavra também
  const ultimoParagrafo = leitura?.blocos.length ? null : ultimoParagrafoDoMestre(iniciais);
  const texto = ultimoParagrafo ? semAnteriormente(ultimoParagrafo) || ultimoParagrafo : null;
  const ultimoId = idUltimaMensagem(resumo?.ultimaMensagem);
  const atrasado =
    !resumo?.recapitulacao && !resumo?.fechamento && resumo?.resumo && resumo.resumoAte != null && ultimoId != null
      ? ultimoId - resumo.resumoAte > DEFASAGEM
      : false;
  const lugar = [cena.local, cena.momento].filter(Boolean).join(" · ");
  const missoes = diario.filter(missaoEmAberto);

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center px-3 pt-3 sm:px-6 sm:pt-5">
      {/* o véu: apaga a leitura de trás para o resumo ser a única coisa na página; clicar nele recolhe */}
      <div className="surgir absolute inset-0 bg-background/75 backdrop-blur-sm" onClick={() => setFase("recolhido")} data-anteriormente-veu aria-hidden />
      <section
        aria-labelledby="anteriormente-titulo"
        data-anteriormente
        className={`surgir relative max-h-[min(70dvh,34rem,calc(100%_-_0.75rem))] w-full max-w-[42rem] overflow-y-auto overscroll-contain rounded-xl border p-5 shadow-[0_20px_60px_-20px_color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur sm:p-6 ${
          livro ? "border-ambar/40 bg-background/95" : "cartao cartao-tema bg-surface/95"
        }`}
      >
        <button
          type="button"
          onClick={() => setFase("recolhido")}
          className="absolute right-2 top-2 grid size-10 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ambar sm:size-9"
          aria-label="Recolher o resumo"
          title="Recolher (Esc)"
        >
          <Icone nome="chevronDown" className="rotate-180" />
        </button>
        <p className="pr-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">Vocês pararam {haQuanto(pausa)}</p>
        {livro ? (
          <h2 id="anteriormente-titulo" className={`${fonteGotica.className} titulo-brilho mt-1.5 pr-8 text-3xl leading-tight text-pergaminho sm:text-4xl`}>
            Anteriormente, em {nome}…
          </h2>
        ) : (
          <h2 id="anteriormente-titulo" className="titulo titulo-brilho mt-1 pr-8 text-2xl leading-tight text-pergaminho">
            Anteriormente…
          </h2>
        )}
        <div className={`mt-3 h-px ${livro ? "bg-linear-to-r from-ambar/50 via-border to-transparent" : "bg-border"}`} />

        {lugar && (
          <p className="mt-3 text-sm text-muted">
            <Icone nome="place" />
            {cena.titulo && <span className="text-foreground">{cena.titulo} · </span>}
            {lugar}
          </p>
        )}
        {leitura?.blocos.length ? (
          <>
            <Blocos blocos={leitura.blocos} classe={livro ? "text-[1.05rem]" : "text-[15px]"} />
            {(leitura.cortado || inteiro) && (
              <button
                type="button"
                onClick={() => setInteiro((v) => !v)}
                className="mt-2 min-h-10 text-sm text-ambar underline-offset-4 hover:underline sm:min-h-9"
                aria-expanded={inteiro}
                data-resumo-inteiro
              >
                {inteiro ? "ler só o começo" : "ler o resumo inteiro"}
              </button>
            )}
            {atrasado && (
              <p className="mt-2 text-xs italic text-muted" data-resumo-atrasado>
                O resumo ainda não chegou ao fim da última noite: o que falta está no livro da campanha.
              </p>
            )}
          </>
        ) : texto ? (
          <p className={`mt-3 whitespace-pre-line leading-relaxed text-foreground/90 ${livro ? "text-[1.05rem] italic" : "text-[15px]"}`}>{texto}</p>
        ) : (
          <p className="mt-3 text-sm italic text-muted">O mestre não lembra de nada. Normal, ele bebe.</p>
        )}
        {missoes.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ambar">Missões em aberto</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {missoes.slice(0, 5).map((m) => (
                <li key={m.id} className="flex gap-2">
                  <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-ambar/70" aria-hidden />
                  <span className="min-w-0">
                    <span className="text-foreground">{m.titulo}</span>
                    {m.texto && <span className="text-muted">: {m.texto.length > 140 ? `${m.texto.slice(0, 140)}…` : m.texto}</span>}
                  </span>
                </li>
              ))}
              {missoes.length > 5 && <li className="text-xs text-muted">e mais {missoes.length - 5} no diário</li>}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button ref={botaoContinuar} type="button" onClick={continuar} className="btn-ambar min-h-11 px-6">
            Continuar de onde paramos
          </button>
          <Link href={`/mesa/${campanhaId}/livro`} className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-ambar hover:underline">
            <Icone nome="scroll" /> Reler o livro da campanha
          </Link>
        </div>
      </section>
    </div>
  );
}
