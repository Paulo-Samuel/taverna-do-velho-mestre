"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as identidade from "@/lib/cliente/identidade";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { BlocoFicha } from "@/lib/sistemas/tipos";

// Ajuste manual da ficha na mesa: o mestre esqueceu o dano, a Força de Vontade gasta, a Fome... o jogador corrige.
// Cliques seguidos se juntam (debounce) num só PATCH com variações; o valor aparece na hora e o SSE {e:"personagem"} confirma.

export type AlvoMarcador = { tipo: "pv" } | { tipo: "recurso"; id: string } | { tipo: "dinheiro" };
type Pendente = { pv: number; dinheiro: number; recursos: Record<string, number> };
type Lista = "condicoes" | "itens";
type Operacao = { lista: Lista; acao: "+" | "-"; texto: string };

const VAZIO: Pendente = { pv: 0, dinheiro: 0, recursos: {} };
/** Vampiro guarda "Recursos" (0–5) no campo de dinheiro; o servidor aplica o mesmo teto. */
const TETO_DINHEIRO: Record<string, number> = { vtm5: 5 };
const ESPERA_MS = 700;

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const chave = (a: AlvoMarcador) => (a.tipo === "recurso" ? `r:${a.id}` : a.tipo);
const somar = (a: Pendente, b: Pendente): Pendente => {
  const recursos = { ...a.recursos };
  for (const [id, d] of Object.entries(b.recursos)) recursos[id] = (recursos[id] ?? 0) + d;
  return { pv: a.pv + b.pv, dinheiro: a.dinheiro + b.dinheiro, recursos };
};
const vazio = (p: Pendente) => !p.pv && !p.dinheiro && Object.values(p.recursos).every((d) => !d);

export type ValorMarcador = { rotulo: string; atual: number; min: number; max: number; pendente: boolean };

export type AjusteFicha = {
  editando: boolean;
  alternarEdicao: () => void;
  /** o mestre está narrando (quando quem usa sabe): botões desligados */
  bloqueado: boolean;
  erro: string | null;
  valor: (alvo: AlvoMarcador) => ValorMarcador | null;
  mudar: (alvo: AlvoMarcador, delta: number) => void;
  alvoDaBarra: (rotulo: string, cor: string | undefined) => AlvoMarcador | null;
  alvoDaGrade: (rotulo: string) => AlvoMarcador | null;
  /** marcadores que nenhum bloco mostra (aparecem só no modo de edição) */
  soltos: AlvoMarcador[];
  condicoes: string[];
  itens: string[];
  adicionar: (lista: Lista, texto: string) => void;
  remover: (lista: Lista, texto: string) => void;
};

function aplicarOperacoes(base: string[], ops: Operacao[], lista: Lista): string[] {
  let r = [...base];
  for (const op of ops) {
    if (op.lista !== lista) continue;
    if (op.acao === "+") {
      if (lista === "itens" || !r.some((x) => normalizar(x) === normalizar(op.texto))) r = [...r, op.texto];
    } else {
      const i = r.indexOf(op.texto);
      if (i >= 0) r = r.filter((_, j) => j !== i);
    }
  }
  return r;
}

/** Estado e ações do ajuste manual de um personagem. `bloqueado` = mestre narrando (o servidor recusa também). */
export function useAjusteFicha(personagem: PersonagemVisivel, rotulos: { pv: string; dinheiro: string }, bloqueado = false): AjusteFicha {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [base, setBase] = useState(personagem);
  const [fila, setFila] = useState<Pendente>(VAZIO);
  const [enviado, setEnviado] = useState<Pendente>(VAZIO);
  const [ops, setOps] = useState<Operacao[]>([]);
  const filaRef = useRef<Pendente>(VAZIO);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relogioErro = useRef<ReturnType<typeof setTimeout> | null>(null);

  // a ficha nova chegou pelo SSE: o que já foi enviado está nela (o que ainda espera o debounce continua)
  if (base !== personagem) {
    setBase(personagem);
    setEnviado(VAZIO);
    setOps([]);
  }

  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      if (relogioErro.current) clearTimeout(relogioErro.current);
    },
    [],
  );

  const ficha = personagem.ficha;
  const url = `/api/campanhas/${personagem.campanhaId}/personagens/${personagem.id}/ficha`;

  function mostrarErro(msg: string) {
    setErro(msg);
    if (relogioErro.current) clearTimeout(relogioErro.current);
    relogioErro.current = setTimeout(() => setErro(null), 6000);
  }

  async function enviar(corpo: Record<string, unknown>, aoFalhar: () => void) {
    try {
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, autor: identidade.apelido() || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string; mudancas?: string[] };
      if (!r.ok) {
        aoFalhar();
        mostrarErro(j.erro ?? "Não deu para ajustar agora.");
      } else if (!j.mudancas?.length) aoFalhar(); // nada mudou (bateu no limite): nenhum SSE vai chegar
    } catch {
      aoFalhar();
      mostrarErro("Sem conexão com a taverna.");
    }
  }

  function despachar() {
    relogio.current = null;
    const pacote = filaRef.current;
    filaRef.current = VAZIO;
    setFila(VAZIO);
    if (vazio(pacote)) return;
    setEnviado((e) => somar(e, pacote));
    const recursos = Object.fromEntries(Object.entries(pacote.recursos).filter(([, d]) => d));
    void enviar(
      { ...(pacote.pv ? { pv: pacote.pv } : {}), ...(pacote.dinheiro ? { dinheiro: pacote.dinheiro } : {}), ...(Object.keys(recursos).length ? { recursos } : {}) },
      () => setEnviado(VAZIO),
    );
  }

  const pend = somar(enviado, fila);

  function valor(alvo: AlvoMarcador): ValorMarcador | null {
    if (alvo.tipo === "pv") {
      const atual = Math.max(0, Math.min(ficha.pvMax, ficha.pv + pend.pv));
      return { rotulo: rotulos.pv, atual, min: 0, max: ficha.pvMax, pendente: pend.pv !== 0 };
    }
    if (alvo.tipo === "dinheiro") {
      const max = TETO_DINHEIRO[ficha.sistema] ?? Number.MAX_SAFE_INTEGER;
      const atual = Math.max(0, Math.min(max, ficha.dinheiro + pend.dinheiro));
      return { rotulo: rotulos.dinheiro, atual, min: 0, max, pendente: pend.dinheiro !== 0 };
    }
    const r = ficha.recursos[alvo.id];
    if (!r) return null;
    const d = pend.recursos[alvo.id] ?? 0;
    // Vampiro: as caixas de Mancha são o que sobra da Humanidade (o servidor recalcula igual)
    const humanidade = ficha.sistema === "vtm5" && alvo.id === "mancha" ? valor({ tipo: "recurso", id: "humanidade" }) : null;
    const max = humanidade ? Math.max(0, 10 - humanidade.atual) : r.max;
    return { rotulo: r.rotulo, atual: Math.max(0, Math.min(max, r.atual + d)), min: 0, max, pendente: d !== 0 };
  }

  function mudar(alvo: AlvoMarcador, delta: number) {
    if (bloqueado) return;
    const v = valor(alvo);
    if (!v) return;
    const efetivo = Math.max(v.min, Math.min(v.max, v.atual + delta)) - v.atual;
    if (!efetivo) return;
    const extra: Pendente =
      alvo.tipo === "pv" ? { ...VAZIO, pv: efetivo } : alvo.tipo === "dinheiro" ? { ...VAZIO, dinheiro: efetivo } : { ...VAZIO, recursos: { [alvo.id]: efetivo } };
    filaRef.current = somar(filaRef.current, extra);
    setFila(filaRef.current);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(despachar, ESPERA_MS);
  }

  // qual campo da ficha cada barra/caixinha mostra: a 1ª barra de vida é a vida; o resto casa pelo rótulo do recurso
  const recursoPorRotulo = (rotulo: string) => Object.keys(ficha.recursos).find((id) => normalizar(ficha.recursos[id].rotulo) === normalizar(rotulo));
  const rotuloDinheiro = normalizar(rotulos.dinheiro);
  function alvoDaBarra(rotulo: string, cor: string | undefined): AlvoMarcador | null {
    if (cor === "vida" || normalizar(rotulo) === normalizar(rotulos.pv)) return { tipo: "pv" };
    const id = recursoPorRotulo(rotulo);
    return id ? { tipo: "recurso", id } : null;
  }
  function alvoDaGrade(rotulo: string): AlvoMarcador | null {
    const n = normalizar(rotulo);
    if (n === rotuloDinheiro || n === "dinheiro" || n === "moedas") return { tipo: "dinheiro" };
    const id = recursoPorRotulo(rotulo);
    return id ? { tipo: "recurso", id } : null;
  }

  const mostrados = new Set<string>();
  for (const b of personagem.blocos) {
    if (b.tipo === "barras") for (const x of b.itens) {
      const a = alvoDaBarra(x.rotulo, x.cor);
      if (a) mostrados.add(chave(a));
    }
    if (b.tipo === "grade") for (const x of b.itens) {
      const a = alvoDaGrade(x.rotulo);
      if (a) mostrados.add(chave(a));
    }
  }
  const soltos: AlvoMarcador[] = [
    ...(mostrados.has("pv") || ficha.pvMax <= 0 ? [] : [{ tipo: "pv" } as const]),
    ...Object.keys(ficha.recursos)
      .filter((id) => !mostrados.has(`r:${id}`))
      .map((id) => ({ tipo: "recurso", id }) as const),
    ...(mostrados.has("dinheiro") ? [] : [{ tipo: "dinheiro" } as const]),
  ];

  function operar(op: Operacao) {
    if (bloqueado) return;
    setOps((o) => [...o, op]);
    const campo = { condicoes: { "+": "adicionarCondicoes", "-": "removerCondicoes" }, itens: { "+": "adicionarItens", "-": "removerItens" } }[op.lista][op.acao];
    void enviar({ [campo]: [op.texto] }, () => setOps((o) => o.filter((x) => x !== op)));
  }

  return {
    editando,
    alternarEdicao: () => setEditando((e) => !e),
    bloqueado,
    erro,
    valor,
    mudar,
    alvoDaBarra,
    alvoDaGrade,
    soltos,
    condicoes: aplicarOperacoes(ficha.condicoes, ops, "condicoes"),
    itens: aplicarOperacoes(ficha.inventario, ops, "itens"),
    adicionar: (lista, texto) => {
      const t = texto.trim().slice(0, 120);
      if (t) operar({ lista, acao: "+", texto: t });
    },
    remover: (lista, texto) => operar({ lista, acao: "-", texto }),
  };
}

/** Classe dos controles: aparecem ao passar o mouse/focar no grupo; no modo de edição (celular) ficam sempre à vista. */
export function classeRevelar(a: AjusteFicha, grupo: "marcador" | "item" = "marcador") {
  if (a.editando) return "pointer-events-auto opacity-100";
  const g = {
    marcador: "group-hover/marcador:pointer-events-auto group-hover/marcador:opacity-100 group-focus-within/marcador:pointer-events-auto group-focus-within/marcador:opacity-100",
    item: "group-hover/item:pointer-events-auto group-hover/item:opacity-100 group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100",
  }[grupo];
  return `pointer-events-none opacity-0 ${g}`;
}

function Botao({ rotulo, simbolo, desligado, aoClicar, grande, classe = "" }: { rotulo: string; simbolo: string; desligado: boolean; aoClicar: () => void; grande: boolean; classe?: string }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desligado}
      onClick={aoClicar}
      className={`grid ${grande ? "size-7 text-sm" : "size-5 text-xs"} shrink-0 place-items-center rounded-full border border-border bg-surface leading-none text-muted transition hover:border-ambar hover:text-ambar focus-visible:border-ambar focus-visible:text-ambar focus-visible:outline-none disabled:cursor-not-allowed disabled:border-border/40 disabled:text-muted/30 disabled:hover:border-border/40 disabled:hover:text-muted/30 ${classe}`}
    >
      {simbolo}
    </button>
  );
}

/** Par −/+ de um marcador. Precisa de um ancestral com a classe `group/marcador`. `compacto`: sem crescer no modo de edição. */
export function BotoesMarcador({
  ajuste,
  alvo,
  children,
  classe = "",
  compacto = false,
}: {
  ajuste: AjusteFicha;
  alvo: AlvoMarcador;
  children?: ReactNode;
  classe?: string;
  compacto?: boolean;
}) {
  const v = ajuste.valor(alvo);
  if (!v) return <>{children}</>;
  const revelar = classeRevelar(ajuste);
  const motivo = ajuste.bloqueado ? " (o mestre está narrando)" : "";
  // no modo de edição (celular) os botões crescem para caber o dedo
  const grande = ajuste.editando && !compacto;
  return (
    <span className={`inline-flex items-center gap-1 ${classe}`}>
      <Botao rotulo={`Diminuir ${v.rotulo}${motivo}`} simbolo="−" desligado={ajuste.bloqueado || v.atual <= v.min} aoClicar={() => ajuste.mudar(alvo, -1)} grande={grande} classe={revelar} />
      {children}
      <Botao rotulo={`Aumentar ${v.rotulo}${motivo}`} simbolo="+" desligado={ajuste.bloqueado || v.atual >= v.max} aoClicar={() => ajuste.mudar(alvo, 1)} grande={grande} classe={revelar} />
    </span>
  );
}

/** Linha compacta "Rótulo  − 3/5 +" para marcadores que a ficha não mostra em barra (modo de edição). */
export function LinhaMarcador({ ajuste, alvo }: { ajuste: AjusteFicha; alvo: AlvoMarcador }) {
  const v = ajuste.valor(alvo);
  if (!v) return null;
  const ilimitado = v.max >= Number.MAX_SAFE_INTEGER;
  return (
    <div className="group/marcador flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-muted">{v.rotulo}</span>
      <BotoesMarcador ajuste={ajuste} alvo={alvo}>
        <span className={`min-w-10 text-center tabular-nums ${v.pendente ? "text-ambar" : "text-pergaminho"}`}>
          {v.atual}
          {!ilimitado && <span className="text-muted">/{v.max}</span>}
        </span>
      </BotoesMarcador>
    </div>
  );
}

/**
 * Campo "adicionar" de uma lista (condição, item): só no modo de edição (um botão escondido no hover deixaria um buraco
 * na leitura). Abre num clique, Enter grava, Esc fecha.
 */
export function AdicionarNaLista({ ajuste, lista, dica }: { ajuste: AjusteFicha; lista: Lista; dica: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const rotulo = lista === "condicoes" ? "condição" : "item";
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    ajuste.adicionar(lista, texto);
    setTexto("");
  }
  if (!ajuste.editando) return null;
  if (!aberto) {
    return (
      <button
        type="button"
        disabled={ajuste.bloqueado}
        onClick={() => setAberto(true)}
        className="mt-1 text-xs text-muted hover:text-ambar focus-visible:text-ambar focus-visible:outline-none disabled:text-muted/40"
      >
        + {rotulo}
      </button>
    );
  }
  return (
    <form onSubmit={enviar} className="mt-1.5 flex gap-1.5">
      <input
        autoFocus
        value={texto}
        maxLength={120}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setAberto(false)}
        placeholder={dica}
        aria-label={lista === "condicoes" ? "Nova condição" : "Novo item"}
        className="campo min-w-0 flex-1 px-2 py-1 text-xs"
      />
      <button type="submit" className="btn-borda px-2 py-1 text-xs" disabled={ajuste.bloqueado || !texto.trim()}>
        ok
      </button>
      <button type="button" className="px-1 text-xs text-muted hover:text-foreground" onClick={() => setAberto(false)} aria-label="Fechar">
        ✕
      </button>
    </form>
  );
}

/** Botão × para tirar um item/condição. Precisa de um ancestral `group/item`. */
export function BotaoRemover({ ajuste, lista, texto }: { ajuste: AjusteFicha; lista: Lista; texto: string }) {
  return (
    <button
      type="button"
      disabled={ajuste.bloqueado}
      onClick={() => ajuste.remover(lista, texto)}
      aria-label={`Tirar ${texto}`}
      title={`Tirar ${texto}`}
      className={`shrink-0 px-0.5 text-[11px] leading-none text-muted hover:text-sangue focus-visible:text-sangue focus-visible:outline-none disabled:text-muted/30 disabled:hover:text-muted/30 ${classeRevelar(ajuste, "item")}`}
    >
      ✕
    </button>
  );
}

/** Mensagem de erro/aviso do ajuste (mestre narrando, sem conexão...). */
export function AvisoAjuste({ ajuste }: { ajuste: AjusteFicha }) {
  if (!ajuste.erro && !(ajuste.editando && ajuste.bloqueado)) return null;
  return (
    <p role="status" className="rounded-md border border-sangue/40 bg-sangue/10 px-2 py-1 text-xs text-sangue">
      {ajuste.erro ?? "O mestre está narrando. Ajuste quando ele terminar."}
    </p>
  );
}

/** Blocos que a edição acrescenta quando a ficha não mostra (lista de condições vazia some da leitura). */
export function blocoVazio(titulo: "Condições" | "Inventário"): BlocoFicha {
  return titulo === "Condições" ? { tipo: "etiquetas", titulo, itens: [] } : { tipo: "lista", titulo, itens: [] };
}

// ---------- anotações do jogador ----------

const LIMITE_NOTAS = 8000;

/** Bloco de notas do personagem: salva sozinho (debounce) numa coluna própria. O mestre não lê. */
export function NotasJogador({ campanhaId, personagemId, linhas = 5 }: { campanhaId: number; personagemId: number; linhas?: number }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"carregando" | "pronto" | "salvando" | "salvo" | "erro">("carregando");
  const url = `/api/campanhas/${campanhaId}/personagens/${personagemId}/notas`;
  const pendente = useRef<string | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((j: { notas?: string }) => {
        if (!vivo) return;
        setTexto(j.notas ?? "");
        setEstado("pronto");
      })
      .catch(() => vivo && setEstado("erro"));
    return () => {
      vivo = false;
    };
  }, [url]);

  // saiu da ficha (trocou de personagem, fechou a gaveta) com texto por salvar: manda mesmo assim
  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
      if (pendente.current !== null) {
        void fetch(url, { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notas: pendente.current }) });
      }
    },
    [url],
  );

  async function salvar() {
    relogio.current = null;
    const notas = pendente.current;
    if (notas === null) return;
    pendente.current = null;
    setEstado("salvando");
    try {
      const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notas }) });
      setEstado(r.ok ? (pendente.current === null ? "salvo" : "salvando") : "erro");
    } catch {
      setEstado("erro");
    }
  }

  function mudar(v: string) {
    setTexto(v);
    pendente.current = v;
    setEstado("salvando");
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => void salvar(), 800);
  }

  const situacao = { carregando: "abrindo…", pronto: "", salvando: "salvando…", salvo: "salvo", erro: "não salvou (sem conexão?)" }[estado];
  return (
    <div>
      <textarea
        value={texto}
        onChange={(e) => mudar(e.target.value)}
        disabled={estado === "carregando"}
        maxLength={LIMITE_NOTAS}
        rows={linhas}
        placeholder="Nomes, pistas, desconfianças, a dívida com o anão… o que você não quer esquecer."
        aria-label="Minhas anotações sobre o personagem"
        className="campo resize-y px-2.5 py-2 text-sm leading-relaxed"
      />
      <p className="mt-1 flex justify-between gap-2 text-[11px] text-muted">
        <span>só para você e a mesa: o mestre não lê isto</span>
        <span className={estado === "erro" ? "text-sangue" : ""} aria-live="polite">
          {situacao}
        </span>
      </p>
    </div>
  );
}
