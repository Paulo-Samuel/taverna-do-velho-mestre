"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as identidade from "@/lib/cliente/identidade";
import type { PersonagemVisivel } from "@/lib/mesa";
import { lerCondicao, textoCondicao } from "@/lib/sistemas/pf2e/condicoes";
import type { BlocoFicha, CondicaoDef } from "@/lib/sistemas/tipos";
import { Icone } from "@/components/icones";

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

/** `alemDoMax`: o "+" continua valendo no máximo (Mancha do Vampiro sem caixa livre vira degeneração no servidor). */
export type ValorMarcador = {
  rotulo: string;
  atual: number;
  min: number;
  max: number;
  pendente: boolean;
  alemDoMax?: boolean;
  /** só o "+" (Mancha do Vampiro: quem limpa as Manchas é o teste de Remorso, nunca a mão) */
  soSobe?: boolean;
  /** só muda no modo de ajuste e com confirmação (Humanidade: pela regra, só o Remorso ou a degeneração mexem nela) */
  protegido?: boolean;
};

/** Pergunta feita a cada clique em −/+ da Humanidade (modo de ajuste). */
export const AVISO_HUMANIDADE =
  "Pela regra, a Humanidade só muda no teste de Remorso ou por degeneração. Ajustar mesmo assim (correção do mestre)?";

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
  /** troca um texto por outro num PATCH só ("amedrontado 1" → "amedrontado 2"); `de` vazio = só adiciona */
  trocar: (lista: Lista, de: string | null, para: string | null) => void;
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
    // Humanidade do Vampiro: a pessoa já confirmou no clique (BotoesMarcador); o servidor recusa sem o `confirmado`
    const confirmado = ficha.sistema === "vtm5" && Boolean(recursos.humanidade);
    void enviar(
      {
        ...(pacote.pv ? { pv: pacote.pv } : {}),
        ...(pacote.dinheiro ? { dinheiro: pacote.dinheiro } : {}),
        ...(Object.keys(recursos).length ? { recursos } : {}),
        ...(confirmado ? { confirmado: true } : {}),
      },
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
    const protegido = ficha.sistema === "vtm5" && alvo.id === "humanidade";
    return {
      rotulo: r.rotulo,
      atual: Math.max(0, Math.min(max, r.atual + d)),
      min: 0,
      max,
      pendente: d !== 0,
      ...(humanidade ? { alemDoMax: true, soSobe: true } : {}),
      ...(protegido ? { protegido: true } : {}),
    };
  }

  function mudar(alvo: AlvoMarcador, delta: number) {
    if (bloqueado) return;
    const v = valor(alvo);
    if (!v) return;
    // Manchas não descem à mão; Humanidade só no modo de ajuste (a confirmação mora no botão)
    if (v.soSobe && delta < 0) return;
    if (v.protegido && !editando) return;
    // Mancha no máximo: o +1 vai assim mesmo (o servidor baixa a Humanidade e a caixa liberada recebe a Mancha)
    const efetivo = v.alemDoMax && delta > 0 && v.atual >= v.max ? delta : Math.max(v.min, Math.min(v.max, v.atual + delta)) - v.atual;
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

  /** Remove e adiciona no mesmo PATCH (o servidor aplica as adições e depois as remoções). */
  function trocar(lista: Lista, de: string | null, para: string | null) {
    if (bloqueado) return;
    const novo = para?.trim().slice(0, 120) || null;
    if (!de && !novo) return;
    if (de && novo && de === novo) return;
    const feitas: Operacao[] = [...(novo ? [{ lista, acao: "+" as const, texto: novo }] : []), ...(de ? [{ lista, acao: "-" as const, texto: de }] : [])];
    setOps((o) => [...o, ...feitas]);
    const campos = { condicoes: ["adicionarCondicoes", "removerCondicoes"], itens: ["adicionarItens", "removerItens"] }[lista];
    void enviar({ ...(novo ? { [campos[0]]: [novo] } : {}), ...(de ? { [campos[1]]: [de] } : {}) }, () => setOps((o) => o.filter((x) => !feitas.includes(x))));
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
    trocar,
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
      // before: no celular a área de toque chega a 40px sem aumentar o desenho do botão
      className={`relative grid before:absolute before:-inset-2.5 sm:before:hidden ${grande ? "size-7 text-sm" : "size-5 text-xs"} shrink-0 place-items-center rounded-full border border-border bg-surface leading-none text-muted transition hover:border-ambar hover:text-ambar focus-visible:border-ambar focus-visible:text-ambar focus-visible:outline-none disabled:cursor-not-allowed disabled:border-border/40 disabled:text-muted/30 disabled:hover:border-border/40 disabled:hover:text-muted/30 ${classe}`}
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
  // Humanidade do Vampiro: fora do modo de ajuste não tem −/+ (pela regra ela só muda no Remorso ou na degeneração)
  // As vagas dos dois botões ficam reservadas, para o número fechar na mesma coluna dos outros marcadores
  if (v.protegido && !ajuste.editando) {
    return (
      <span className={`inline-flex items-center gap-1 ${classe}`}>
        <span className="size-5 shrink-0" aria-hidden />
        {children}
        <span className="size-5 shrink-0" aria-hidden />
      </span>
    );
  }
  const revelar = classeRevelar(ajuste);
  const motivo = ajuste.bloqueado ? " (o mestre está narrando)" : "";
  // no modo de edição (celular) os botões crescem para caber o dedo
  const grande = ajuste.editando && !compacto;
  const mudar = (delta: number) => {
    if (v.protegido && !window.confirm(AVISO_HUMANIDADE)) return;
    ajuste.mudar(alvo, delta);
  };
  return (
    <span className={`inline-flex items-center gap-1 ${classe}`}>
      {/* Manchas: só o "+" (quem limpa é o teste de Remorso); o espaço do "−" fica vazio para o número não pular */}
      {v.soSobe ? (
        <span className={grande ? "size-7 shrink-0" : "size-5 shrink-0"} aria-hidden />
      ) : (
        <Botao rotulo={`Diminuir ${v.rotulo}${motivo}`} simbolo="−" desligado={ajuste.bloqueado || v.atual <= v.min} aoClicar={() => mudar(-1)} grande={grande} classe={revelar} />
      )}
      {children}
      <Botao
        rotulo={`Aumentar ${v.rotulo}${v.alemDoMax && v.atual >= v.max ? " (sem caixa livre: degeneração, −1 de Humanidade)" : ""}${motivo}`}
        simbolo="+"
        desligado={ajuste.bloqueado || (v.atual >= v.max && !v.alemDoMax)}
        aoClicar={() => mudar(1)}
        grande={grande}
        classe={revelar}
      />
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
        <span className={`min-w-10 text-right tabular-nums ${v.pendente ? "text-ambar" : "text-pergaminho"}`}>
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
        <Icone nome="close" />
      </button>
    </form>
  );
}

/**
 * Condição da lista fechada do sistema (PF2e): escolhe no seletor, acerta o valor no −/+ e grava com o nome canônico
 * ("amedrontado 2"). Se a ficha já tem a mesma condição com outra grafia ("medo 1"), troca em vez de duplicar. Texto livre
 * continua a um clique ("outra…").
 */
export function SeletorCondicao({ ajuste, condicoes, dica }: { ajuste: AjusteFicha; condicoes: CondicaoDef[]; dica: string }) {
  const [aberto, setAberto] = useState(false);
  const [livre, setLivre] = useState(false);
  const [id, setId] = useState(condicoes[0]?.id ?? "");
  const [valor, setValor] = useState(1);
  if (!ajuste.editando) return null;
  if (livre) return <AdicionarNaLista ajuste={ajuste} lista="condicoes" dica={dica} />;
  const def = condicoes.find((c) => c.id === id) ?? condicoes[0];
  if (!aberto || !def) {
    return (
      <button
        type="button"
        disabled={ajuste.bloqueado}
        onClick={() => setAberto(true)}
        className="mt-1 text-xs text-muted hover:text-ambar focus-visible:text-ambar focus-visible:outline-none disabled:text-muted/40"
      >
        + condição
      </button>
    );
  }
  const max = def.max ?? 9;
  const existente = ajuste.condicoes.find((c) => lerCondicao(c, condicoes)?.def.id === def.id) ?? null;
  function gravar(e: FormEvent) {
    e.preventDefault();
    if (!def) return;
    ajuste.trocar("condicoes", existente, textoCondicao(def, def.temValor ? valor : null));
    setAberto(false);
  }
  return (
    <form onSubmit={gravar} className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Adicionar condição">
      <select
        autoFocus
        value={def.id}
        onChange={(e) => {
          setId(e.target.value);
          setValor(1);
        }}
        aria-label="Condição"
        className="campo min-w-0 flex-1 px-2 py-1 text-xs"
      >
        {condicoes.map((c) => (
          <option key={c.id} value={c.id} title={c.efeito}>
            {c.nome}
          </option>
        ))}
      </select>
      {def.temValor && (
        <span className="inline-flex items-center gap-1" aria-label="Valor">
          <Botao rotulo="Diminuir valor" simbolo="−" desligado={valor <= 1} aoClicar={() => setValor((v) => Math.max(1, v - 1))} grande={false} />
          <span className="min-w-5 text-center text-xs tabular-nums text-pergaminho" aria-live="polite">
            {valor}
          </span>
          <Botao rotulo="Aumentar valor" simbolo="+" desligado={valor >= max} aoClicar={() => setValor((v) => Math.min(max, v + 1))} grande={false} />
        </span>
      )}
      <button type="submit" className="btn-borda px-2 py-1 text-xs" disabled={ajuste.bloqueado}>
        {existente ? "trocar" : "ok"}
      </button>
      <button type="button" className="px-1 text-xs text-muted hover:text-foreground" onClick={() => setLivre(true)}>
        outra…
      </button>
      <button type="button" className="px-1 text-xs text-muted hover:text-foreground" onClick={() => setAberto(false)} aria-label="Fechar">
        <Icone nome="close" />
      </button>
      {def.efeito && <p className="w-full text-xs text-muted">{def.efeito}</p>}
      {existente && <p className="w-full text-xs text-ambar">Já tem “{existente}”: grava no lugar dela.</p>}
    </form>
  );
}

/** −/+ no valor de uma condição que já está na ficha ("amedrontado 2" → 1 ou 3); no 0 ela sai. Precisa de `group/item`. */
export function PassoCondicao({ ajuste, texto, condicoes }: { ajuste: AjusteFicha; texto: string; condicoes: CondicaoDef[] }) {
  const lida = lerCondicao(texto, condicoes);
  if (!lida || !lida.def.temValor || lida.valor === null) return null;
  const { def, valor } = lida;
  const max = def.max ?? 9;
  const revelar = classeRevelar(ajuste, "item");
  // −, + e × ficam colados na etiqueta: cada área de toque para na metade do vão, senão o vizinho de cima engole o toque
  return (
    <>
      <Botao
        rotulo={`Baixar ${def.nome}`}
        simbolo="−"
        desligado={ajuste.bloqueado}
        aoClicar={() => ajuste.trocar("condicoes", texto, valor > 1 ? textoCondicao(def, valor - 1) : null)}
        grande={false}
        classe={`${revelar} before:-left-4.5 before:-right-0.5`}
      />
      <Botao
        rotulo={`Subir ${def.nome}`}
        simbolo="+"
        desligado={ajuste.bloqueado || valor >= max}
        aoClicar={() => ajuste.trocar("condicoes", texto, textoCondicao(def, valor + 1))}
        grande={false}
        classe={`${revelar} before:-left-0.5 before:-right-0.5`}
      />
    </>
  );
}

/** Botão × para tirar um item/condição. Precisa de um ancestral `group/item`. `colado`: vem logo depois de outros botões (etiqueta de condição). */
export function BotaoRemover({ ajuste, lista, texto, colado = false }: { ajuste: AjusteFicha; lista: Lista; texto: string; colado?: boolean }) {
  return (
    <button
      type="button"
      disabled={ajuste.bloqueado}
      onClick={() => ajuste.remover(lista, texto)}
      aria-label={`Tirar ${texto}`}
      title={`Tirar ${texto}`}
      // before: no celular a área de toque chega a 40px sem aumentar o desenho do ×; colado, ela cresce só para a direita (não cobre o "+")
      className={`relative shrink-0 px-0.5 text-[11px] leading-none text-muted before:absolute before:-inset-x-3.5 before:-inset-y-3.5 ${colado ? "before:-left-0.5 before:-right-[23px]" : ""} hover:text-sangue focus-visible:text-sangue focus-visible:outline-none disabled:text-muted/30 disabled:hover:text-muted/30 sm:before:hidden ${classeRevelar(ajuste, "item")}`}
    >
      <Icone nome="close" />
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
      <p className="mt-1 flex justify-between gap-2 text-xs text-muted">
        <span>só para você e a mesa: o mestre não lê isto</span>
        <span className={estado === "erro" ? "text-sangue" : ""} aria-live="polite">
          {situacao}
        </span>
      </p>
    </div>
  );
}

/** Manchas de um personagem do Vampiro (null fora do V5): `cheias` quando não sobra caixa (o Remorso é obrigatório no fim da noite). */
export function manchasDe(p: Pick<PersonagemVisivel, "ficha">): { atual: number; max: number; cheias: boolean } | null {
  if (p.ficha.sistema !== "vtm5") return null;
  const mancha = p.ficha.recursos.mancha;
  if (!mancha) return null;
  const humanidade = p.ficha.recursos.humanidade?.atual ?? 7;
  const max = Math.max(0, 10 - humanidade);
  return { atual: mancha.atual, max, cheias: max > 0 && mancha.atual >= max };
}

/**
 * Pede o teste de Remorso (rota do pacote W21): o servidor cria o pedido de teste pendente e o jogador rola no cartão do dado.
 * Devolve o id da mensagem do pedido, ou o recado de erro.
 */
export async function pedirRemorso(campanhaId: number, personagemId: number): Promise<{ mensagemId: number | null } | { erro: string }> {
  try {
    const r = await fetch(`/api/campanhas/${campanhaId}/personagens/${personagemId}/remorso`, { method: "POST" });
    const j = (await r.json().catch(() => null)) as { erro?: string; mensagemId?: number } | null;
    if (r.ok) return { mensagemId: j?.mensagemId ?? null };
    if (r.status === 404 && !j?.erro) return { erro: "O teste de Remorso ainda não chegou a esta taverna (atualize a taverna)." };
    return { erro: j?.erro ?? `Não deu para pedir o Remorso (erro ${r.status}).` };
  } catch {
    return { erro: "Sem conexão com a taverna." };
  }
}

/**
 * "Rolar Remorso" na ficha (Vampiro, com Manchas > 0): o teste vira um cartão de dado na mesa, que o jogador rola como os
 * outros; o resultado aplica a regra (Humanidade mantida ou perdida, Manchas limpas). `aoPedir` leva até o dado.
 */
export function BotaoRemorso({
  personagem,
  bloqueado = false,
  aoPedir,
  className = "",
}: {
  personagem: PersonagemVisivel;
  bloqueado?: boolean;
  aoPedir?: (mensagemId: number | null) => void;
  className?: string;
}) {
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const m = manchasDe(personagem);
  if (!m || m.atual <= 0) return null;
  async function pedir() {
    if (indo || bloqueado) return;
    setIndo(true);
    setErro(null);
    const r = await pedirRemorso(personagem.campanhaId, personagem.id);
    setIndo(false);
    if ("erro" in r) setErro(r.erro);
    else aoPedir?.(r.mensagemId);
  }
  return (
    <div className={className} data-remorso>
      <button
        type="button"
        onClick={() => void pedir()}
        disabled={indo || bloqueado}
        title={bloqueado ? "Espere o mestre terminar de narrar" : "Teste de Remorso: role contra as Manchas; ao passar, a Humanidade fica; ao falhar, cai 1"}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition disabled:opacity-50 ${
          m.cheias ? "border-sangue/70 bg-sangue/10 text-foreground hover:border-sangue" : "border-border text-muted hover:border-ambar/60 hover:text-ambar"
        }`}
        data-rolar-remorso
      >
        <Icone nome="drop" />
        {indo ? "Pedindo…" : "Rolar Remorso"}
        <span className="tabular-nums text-muted">
          ({m.atual} {m.atual === 1 ? "Mancha" : "Manchas"})
        </span>
      </button>
      {erro && (
        <p className="mt-1 text-xs leading-snug text-sangue" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
