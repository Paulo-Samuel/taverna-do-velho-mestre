"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BotaoGastarXp } from "@/components/ficha/gastar-xp";
import { manchasDe, pedirRemorso } from "@/components/ficha/ajuste-ficha";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import { noiteAtual, noiteEncerrada, remorsoDesde, sessaoDaMesa, ultimoMarcador, xpDesde, type EstadoRemorso } from "./noite";
import { Icone } from "@/components/icones";

// "🌙 Encerrar a noite" como ritual, nas duas mesas (o botão mora no cabeçalho; no celular, no pé do painel/Códex).
// Diálogo em três passos: 1) Remorso (Vampiro): cada personagem com Manchas rola o próprio teste no cartão do dado
// (POST /personagens/[pid]/remorso, pacote W21) ou o grupo deixa "o mestre decide"; 2) XP: o que o sistema dá e as linhas
// "+N XP — motivo" que chegarem; 3) fechar: POST /encerrar ({ semRemorso }) → a mesa liga o "fechando" e o marcador chega.
// O 409 do servidor aparece com o motivo dele e, se for teste esperando, um "ir para o dado".

/** O que cada sistema dá de XP no fim da noite (texto curto; quem decide a conta é o mestre). */
const XP_POR_SISTEMA: Record<string, string> = {
  vtm5: "De 1 a 3 XP por personagem: 1 pela noite jogada, +1 se perseguiu a Ambição ou pôs as Convicções à prova, +1 por missão concluída.",
  dnd5e: "O mestre reparte o XP dos encontros e dos marcos da noite.",
  pf2e: "O mestre dá o XP das conquistas da noite (encontros, descobertas, objetivos).",
};
const XP_GENERICO = "O mestre fecha a cena e reparte a experiência da noite, com o motivo de cada um.";

type Fase = { tipo: "preparar" } | { tipo: "enviando" } | { tipo: "fechando"; antes: number | null } | { tipo: "erro"; texto: string; dado: boolean };

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Algum personagem com as Manchas cheias (sem caixa livre): o Remorso não pode esperar. Usado no pontinho do botão. */
export function remorsoUrgente(mesa: Pick<Mesa, "personagens" | "sistema">): boolean {
  return mesa.sistema.id === "vtm5" && mesa.personagens.some((p) => manchasDe(p)?.cheias);
}

/** Ícone da lua (botão do cabeçalho). */
export function IconeLua({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" fillOpacity={0.18} />
      <path d="M16 4.5v2M15 5.5h2M19.5 8.5v1.5M18.75 9.25h1.5" />
    </svg>
  );
}

export function EncerrarNoite({
  mesa,
  acoes,
  aberto,
  aoFechar,
  irParaMensagem,
}: {
  mesa: Mesa;
  acoes: AcoesMesa;
  aberto: boolean;
  aoFechar: () => void;
  /** leva até um cartão de dado da mesa (o diálogo fecha antes) */
  irParaMensagem: (id: number) => void;
}) {
  const [fase, setFase] = useState<Fase>({ tipo: "preparar" });
  const [mestreDecide, setMestreDecide] = useState(false);
  const [pedindo, setPedindo] = useState<number | null>(null);
  const [erroRemorso, setErroRemorso] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const devolverFoco = useRef<HTMLElement | null>(null);

  const vampiro = mesa.sistema.id === "vtm5";
  const desde = ultimoMarcador(mesa.mensagens) + 1;
  const sessaoCampanha = sessaoDaMesa(mesa);
  const encerrada = noiteEncerrada(mesa.mensagens);
  // o marcador novo chegou depois do pedido: a noite fechou (o número passa a ser o do marcador)
  const pronta = fase.tipo === "fechando" && encerrada !== null && encerrada.id !== fase.antes;
  const n = pronta && encerrada ? (encerrada.sessao ?? noiteAtual(mesa.mensagens, sessaoCampanha) - 1) : noiteAtual(mesa.mensagens, sessaoCampanha);
  const fecharRef = useRef(aoFechar);
  useEffect(() => {
    fecharRef.current = aoFechar;
  }, [aoFechar]);

  // quem precisa do Remorso: Manchas > 0, ou já tem teste nesta noite (pendente ou rolado)
  const remorso = useMemo(() => {
    if (!vampiro) return [];
    return mesa.personagens
      .map((p) => ({ p, m: manchasDe(p), estado: remorsoDesde(mesa.mensagens, desde, p.id, p.ficha.nome) as EstadoRemorso | null }))
      .filter((x) => (x.m && x.m.atual > 0) || x.estado);
  }, [vampiro, mesa.personagens, mesa.mensagens, desde]);
  const semRolar = remorso.filter((x) => !x.estado || x.estado.tipo === "pendente");
  const pendente = remorso.find((x) => x.estado?.tipo === "pendente")?.estado ?? null;
  const xp = xpDesde(mesa.mensagens, desde);

  // abriu: guarda quem tinha o foco, foca o diálogo; fechou: devolve
  useEffect(() => {
    if (!aberto) return;
    devolverFoco.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => caixa.current?.querySelector<HTMLElement>("[data-foco-inicial]")?.focus(), 30);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fecharRef.current();
      }
    };
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", esc);
      devolverFoco.current?.focus?.({ preventScroll: true });
    };
  }, [aberto]);

  // fechou o diálogo sem estar fechando a noite: volta ao começo na próxima vez
  useEffect(() => {
    if (aberto) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFase((f) => (f.tipo === "fechando" && !pronta && mesa.fechando ? f : { tipo: "preparar" }));
    setErroRemorso(null);
  }, [aberto, pronta, mesa.fechando]);

  // o turno do fechamento acabou sem marcador (erro do mestre, interrompido): depois de um respiro (o marcador pode chegar
  // logo atrás do estado), volta para o botão com o aviso, em vez de ficar "fechando" para sempre
  const viuFechando = useRef(false);
  useEffect(() => {
    if (fase.tipo !== "fechando") {
      viuFechando.current = false;
      return;
    }
    if (mesa.fechando || mesa.ocupado) {
      viuFechando.current = true;
      return;
    }
    if (!viuFechando.current || pronta) return;
    const t = setTimeout(() => {
      setFase({ tipo: "erro", texto: mesa.erro ? `O mestre não fechou a noite: ${minuscula(mesa.erro)}` : "O mestre parou antes de fechar a noite. Tente de novo.", dado: false });
    }, 2500);
    return () => clearTimeout(t);
  }, [fase.tipo, mesa.fechando, mesa.ocupado, pronta, mesa.erro]);

  if (!aberto) return null;

  async function rolarRemorso(pid: number) {
    setPedindo(pid);
    setErroRemorso(null);
    const r = await pedirRemorso(mesa.campanha.id, pid);
    setPedindo(null);
    if ("erro" in r) {
      setErroRemorso(r.erro);
      return;
    }
    if (r.mensagemId) {
      aoFechar();
      irParaMensagem(r.mensagemId);
    }
  }

  async function fecharNoite() {
    setFase({ tipo: "enviando" });
    const antes = noiteEncerrada(mesa.mensagens)?.id ?? null;
    try {
      const r = await fetch(`/api/campanhas/${mesa.campanha.id}/encerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mestreDecide ? { semRemorso: true } : {}),
      });
      const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
      if (r.ok) {
        acoes.marcarFechando();
        setFase({ tipo: "fechando", antes });
        return;
      }
      if (r.status === 404 && !corpo?.erro) {
        setFase({ tipo: "erro", texto: "Esta taverna ainda não sabe fechar a noite. Atualize a taverna.", dado: false });
        return;
      }
      const texto = corpo?.erro ?? `O mestre tropeçou no tapete (erro ${r.status}). Tente de novo.`;
      setFase({ tipo: "erro", texto: r.status === 409 ? `Agora não: ${minuscula(texto)}` : texto, dado: /teste|dado|remorso/i.test(texto) });
    } catch {
      setFase({ tipo: "erro", texto: "Sem conexão com a taverna. Tente de novo.", dado: false });
    }
  }

  const ocupado = mesa.ocupado || mesa.semSinal;
  const enviando = fase.tipo === "enviando";
  const fechando = fase.tipo === "fechando" && !pronta;
  // algum teste esperando o dado na mesa (o servidor recusa o encerramento): o primeiro que achar
  const testeEsperando =
    pendente?.mensagemId ??
    mesa.mensagens.findLast((m) => m.tipo === "dado" && (m.dados as { tipo?: string; status?: string } | null)?.tipo === "pedido_teste" && (m.dados as { status?: string }).status === "pendente")?.id ??
    null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/70 sm:place-items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
      data-encerrar-dialogo
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-encerrar"
        className="cartao surgir bg-surface! max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-b-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-encerrar" className="titulo flex items-center gap-2 text-xl text-ambar">
              <IconeLua className="size-5" />
              {pronta ? `Noite ${n} encerrada` : `Encerrar a noite ${n}`}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {pronta ? "O livro ganhou um fim de capítulo." : "O mestre fecha a cena, reparte o XP e marca o fim do capítulo no livro."}
            </p>
          </div>
          <button type="button" onClick={aoFechar} className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:text-foreground" aria-label="Fechar">
            ✕
          </button>
        </div>

        {pronta ? (
          <div className="space-y-3 text-sm" role="status">
            {xp.length > 0 && <ListaXp linhas={xp} />}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Link href={`/mesa/${mesa.campanha.id}/livro`} className="btn-borda min-h-10 px-3 py-1.5 text-xs"><Icone nome="scroll" />  Ler o livro
              </Link>
              <button type="button" className="btn-ambar min-h-10 px-4 py-1.5 text-xs" onClick={aoFechar} data-foco-inicial>
                Fechar
              </button>
            </div>
          </div>
        ) : fechando ? (
          <div className="flex items-center gap-3 rounded-lg border border-ambar/40 bg-ambar/5 px-3 py-3 text-sm" role="status" data-fechando-dialogo>
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-ambar motion-reduce:animate-none" aria-hidden />
            <span>
              O mestre apaga as velas e fecha a noite {n}… <span className="text-muted">(o XP e o marcador chegam na mesa)</span>
            </span>
          </div>
        ) : (
          <ol className="space-y-4 text-sm">
            {vampiro && (
              <li data-passo="remorso">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">1 · Remorso</p>
                {remorso.length === 0 ? (
                  <p className="text-foreground/85">Ninguém com Manchas esta noite. A consciência dorme tranquila.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {remorso.map(({ p, m, estado }) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2" data-remorso-de={p.id}>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{p.ficha.nome}</span>
                          {m && (
                            <span className={`ml-1.5 text-xs tabular-nums ${m.cheias ? "text-sangue" : "text-muted"}`}>
                              {m.atual} {m.atual === 1 ? "Mancha" : "Manchas"}
                              {m.cheias && " · sem caixa livre"}
                            </span>
                          )}
                        </span>
                        {estado?.tipo === "resolvido" ? (
                          <span className={`text-xs ${estado.sucesso === false ? "text-sangue" : "text-musgo"}`}>
                            {estado.sucesso === false ? "Humanidade −1" : estado.sucesso ? "Humanidade mantida" : (estado.rotulo ?? "rolado")}
                          </span>
                        ) : estado?.tipo === "pendente" ? (
                          <button
                            type="button"
                            className="btn-borda min-h-9 px-2.5 py-1 text-xs"
                            onClick={() => {
                              aoFechar();
                              irParaMensagem(estado.mensagemId);
                            }}
                          ><Icone nome="dice" />  Ir para o dado
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-borda min-h-9 px-2.5 py-1 text-xs"
                            disabled={pedindo !== null || ocupado || mestreDecide}
                            onClick={() => void rolarRemorso(p.id)}
                            data-dialogo-rolar-remorso
                          >
                            {pedindo === p.id ? "Pedindo…" : <><Icone nome="drop" /> Rolar Remorso</>}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {erroRemorso && (
                  <p className="mt-1.5 text-xs text-sangue" role="alert">
                    {erroRemorso}
                  </p>
                )}
                {semRolar.length > 0 && (
                  <label className="mt-2 flex items-start gap-2 text-xs text-muted">
                    <input type="checkbox" checked={mestreDecide} onChange={(e) => setMestreDecide(e.target.checked)} className="mt-0.5 accent-ambar" data-mestre-decide />
                    <span>
                      O mestre decide o Remorso no fechamento
                      <span className="block text-xs">Sem marcar, cada jogador rola o próprio teste antes de fechar.</span>
                    </span>
                  </label>
                )}
              </li>
            )}
            <li data-passo="xp">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{vampiro ? "2" : "1"} · Experiência</p>
              <p className="text-foreground/85">{XP_POR_SISTEMA[mesa.sistema.id] ?? XP_GENERICO}</p>
              {xp.length > 0 && <ListaXp linhas={xp} className="mt-2" />}
              {vampiro && xp.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {mesa.personagens.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5">
                      <span className="text-muted">{p.ficha.nome}:</span> <BotaoGastarXp personagem={p} />
                    </span>
                  ))}
                </div>
              )}
            </li>
            <li data-passo="fechar">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{vampiro ? "3" : "2"} · Fechar</p>
              {fase.tipo === "erro" && (
                <div className="mb-2 rounded-md border border-sangue/50 bg-sangue/10 px-3 py-2 text-xs leading-snug" role="alert" data-erro-encerrar>
                  <p>{fase.texto}</p>
                  {fase.dado && testeEsperando !== null && (
                    <button
                      type="button"
                      className="mt-1.5 text-ambar underline-offset-2 hover:underline"
                      onClick={() => {
                        aoFechar();
                        irParaMensagem(testeEsperando);
                      }}
                    ><Icone nome="dice" />  Ir para o dado
                    </button>
                  )}
                </div>
              )}
              {vampiro && semRolar.length > 0 && !mestreDecide && (
                <p className="mb-2 text-xs text-muted">Falta o Remorso de {semRolar.map((x) => x.p.ficha.nome).join(", ")}.</p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={aoFechar} className="min-h-10 rounded-md px-3 text-sm text-muted hover:text-foreground" data-foco-inicial={ocupado || undefined}>
                  Ainda não
                </button>
                <button
                  type="button"
                  className="btn-ambar min-h-10 px-4 py-1.5 text-sm"
                  disabled={enviando || ocupado}
                  title={ocupado ? "Espere o mestre terminar de narrar" : undefined}
                  onClick={() => void fecharNoite()}
                  data-confirmar-encerrar
                  data-foco-inicial={!ocupado || undefined}
                >
                  {enviando ? "Fechando…" : <><Icone nome="moon" /> Fechar a noite {n}</>}
                </button>
              </div>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

/** Faixa no lugar do campo de ação enquanto o mestre fecha a noite (FIM_DE_SESSAO na fila ou sendo narrado). */
export function FaixaFechando({ n }: { n: number }) {
  return (
    <div className="flex min-h-11 items-center justify-center gap-2.5 rounded-lg border border-ambar/40 bg-ambar/5 px-3 py-2 text-sm text-ambar" role="status" data-faixa-fechando>
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-ambar motion-reduce:animate-none" aria-hidden />
      <span><Icone nome="moon" />  Fechando a noite {n}…</span>
    </div>
  );
}

/**
 * Cartão "Noite N encerrada" no lugar do campo de ação depois do marcador: data, chips do XP e do Remorso da noite,
 * Voltar às campanhas, Ler o livro, Gastar XP (Vampiro) e o "Continuar jogando", que devolve o campo para a noite N+1.
 */
export function CartaoNoiteEncerrada({
  mesa,
  sessao,
  data,
  chips,
  aoContinuar,
}: {
  mesa: Mesa;
  sessao: number | null;
  data: string | null;
  chips: string[];
  aoContinuar: () => void;
}) {
  const quando = data ? new Date(data) : null;
  const dataCurta = quando && !Number.isNaN(quando.getTime()) ? quando.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : null;
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const proxima = sessao ? sessao + 1 : null;
  return (
    <section className="surgir rounded-xl border border-ambar/40 bg-surface/80 px-4 py-3 text-sm shadow-[0_0_30px_-18px_var(--ambar)]" aria-labelledby="titulo-noite-encerrada" data-noite-encerrada>
      <h2 id="titulo-noite-encerrada" className="titulo flex flex-wrap items-baseline gap-x-2 text-lg text-pergaminho">
        <span className="text-ambar">
          <IconeLua className="inline size-4 align-[-2px]" />
        </span>
        Noite{sessao ? ` ${sessao}` : ""} encerrada
        {dataCurta && <span className="text-xs font-normal text-muted">· {dataCurta}</span>}
      </h2>
      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="O que a noite deu">
          {chips.map((c) => (
            <li key={c} className="etiqueta border-ambar/40 text-foreground/90">
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href="/" className="btn-borda min-h-10 px-3 py-1.5 text-xs">
          ← Voltar às campanhas
        </Link>
        <Link href={`/mesa/${mesa.campanha.id}/livro`} className="btn-borda min-h-10 px-3 py-1.5 text-xs"><Icone nome="scroll" />  Ler o livro
        </Link>
        {mesa.sistema.id === "vtm5" && ativo && <BotaoGastarXp personagem={ativo} />}
        <button type="button" onClick={aoContinuar} className="ml-auto min-h-10 rounded-md px-2 text-xs text-ambar underline-offset-4 hover:underline" data-continuar-jogando>
          Continuar jogando{proxima ? ` (abre a noite ${proxima})` : ""} →
        </button>
      </div>
    </section>
  );
}

function ListaXp({ linhas, className = "" }: { linhas: { mensagemId: number; personagem: string; ganho: number; motivo: string }[]; className?: string }) {
  return (
    <ul className={`space-y-0.5 text-xs ${className}`} data-xp-noite>
      {linhas.map((x) => (
        <li key={x.mensagemId} className="flex gap-1.5">
          <span className="font-semibold text-ambar tabular-nums">+{x.ganho} XP</span>
          <span className="min-w-0 text-foreground/85">
            {x.personagem && <span className="font-semibold">{x.personagem}</span>}
            {x.motivo && ` — ${x.motivo}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
