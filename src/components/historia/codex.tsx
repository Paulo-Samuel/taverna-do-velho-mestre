"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { Convite } from "@/components/presenca/convite";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { BlocoFicha, EntradaDiario } from "@/lib/sistemas/tipos";
import { corDoNome } from "./cores";
import { fonteGotica } from "./fonte-gotica";
import { Retrato } from "./retrato";

// Códex do modo história: gaveta recolhível à esquerda (tela cheia no celular) com o personagem, as missões,
// as pessoas e os lugares que o mestre anotou no diário e o grupo. Tecla C abre e fecha; Esc fecha.

export type AbaCodex = "personagem" | "missoes" | "pessoas" | "lugares" | "grupo";

const ABAS: [AbaCodex, string][] = [
  ["personagem", "Ficha"],
  ["missoes", "Missões"],
  ["pessoas", "Pessoas"],
  ["lugares", "Lugares"],
  ["grupo", "Grupo"],
];

/** O jogador deste aparelho pode assumir este personagem? (mesmo critério da mesa avançada) */
export function podeAssumir(mesa: Mesa, p: PersonagemVisivel): boolean {
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? false;
  return euLocal || !p.jogador || p.jogador === mesa.eu.apelido;
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{titulo}</h4>
      {children}
    </section>
  );
}

function Barra({ rotulo, atual, max, cor }: { rotulo: string; atual: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0;
  const fundo =
    cor === "magia"
      ? "bg-sky-400"
      : cor === "sanidade"
        ? "bg-violet-400"
        : cor === "vida"
          ? pct > 50
            ? "bg-musgo"
            : pct > 20
              ? "bg-ambar"
              : "bg-sangue"
          : "bg-ambar";
  return (
    <div aria-label={`${rotulo}: ${atual} de ${max}`}>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted">{rotulo}</span>
        <span className="tabular-nums">
          <span className="text-pergaminho">{atual}</span>
          <span className="text-muted">/{max}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-background/70 ring-1 ring-border">
        <div className={`h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${fundo}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bloco({ b }: { b: BlocoFicha }) {
  switch (b.tipo) {
    case "barras":
      return (
        <div className="mt-4 space-y-3">
          {b.itens.map((x, i) => (
            <Barra key={`${x.rotulo}-${i}`} {...x} />
          ))}
        </div>
      );
    case "grade": {
      const grade = (
        <div className="grid grid-cols-3 gap-1.5">
          {b.itens.map((x, i) => (
            <div key={`${x.rotulo}-${i}`} className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5 text-center" title={x.detalhe}>
              <p className="text-[10px] uppercase tracking-wider text-muted">{x.rotulo}</p>
              <p className="tabular-nums text-pergaminho">{x.valor}</p>
            </div>
          ))}
        </div>
      );
      return b.titulo ? <Secao titulo={b.titulo}>{grade}</Secao> : <div className="mt-4">{grade}</div>;
    }
    case "etiquetas":
      return (
        <Secao titulo={b.titulo}>
          {b.itens.length ? (
            <div className="flex flex-wrap gap-1.5">
              {b.itens.map((x, i) => (
                <span key={`${x}-${i}`} className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-sm text-foreground/90">
                  {x}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted">Nada por aqui.</p>
          )}
        </Secao>
      );
    case "lista":
      return (
        <Secao titulo={b.titulo}>
          {b.itens.length ? (
            <ul className="space-y-1 text-sm">
              {b.itens.map((x, i) => (
                <li key={`${x}-${i}`} className="flex gap-2">
                  <span className="text-ambar/70" aria-hidden>
                    ◆
                  </span>
                  <span className="text-foreground/90">{x}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-muted">Nada por aqui.</p>
          )}
        </Secao>
      );
    case "texto":
      return (
        <Secao titulo={b.titulo}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{b.texto}</p>
        </Secao>
      );
  }
}

function AbaPersonagem({ mesa, p }: { mesa: Mesa; p: PersonagemVisivel | null }) {
  if (!p) return <p className="text-sm italic text-muted">Nenhum personagem nesta mesa ainda.</p>;
  const s = mesa.sistema;
  const origem = s.ancestralidades.find((a) => a.id === p.ficha.ancestralidade)?.nome ?? p.ficha.ancestralidade;
  const classe = s.classes.find((c) => c.id === p.ficha.classe)?.nome ?? p.ficha.classe;
  const temBarras = p.blocos.some((b) => b.tipo === "barras");
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Retrato ficha={p.ficha} tamanho={128} />
        <h3 className={`${fonteGotica.className} mt-3 text-3xl leading-tight`} style={{ color: corDoNome(p.ficha.nome) }}>
          {p.ficha.nome}
        </h3>
        <p className="text-sm text-muted">
          {[origem, classe].filter(Boolean).join(" ")} · {s.rotulos.nivel} {p.ficha.nivel}
        </p>
      </div>
      {!temBarras && <Barra rotulo={s.rotulos.pv} atual={p.ficha.pv} max={p.ficha.pvMax} cor="vida" />}
      {p.blocos.length ? (
        p.blocos.map((b, i) => <Bloco key={i} b={b} />)
      ) : (
        <Secao titulo="Bolsa">
          <p className="text-sm">
            {p.ficha.dinheiro} {s.rotulos.dinheiro}
          </p>
        </Secao>
      )}
    </div>
  );
}

const STATUS: Record<string, [string, string]> = {
  aberta: ["em andamento", "border-ambar/60 text-ambar"],
  concluida: ["concluída", "border-musgo/60 text-musgo"],
  falhou: ["fracassou", "border-sangue/60 text-sangue"],
  aliado: ["aliado", "border-musgo/60 text-musgo"],
  amigo: ["amigo", "border-musgo/60 text-musgo"],
  neutro: ["neutro", "border-border text-muted"],
  hostil: ["hostil", "border-sangue/60 text-sangue"],
  inimigo: ["inimigo", "border-sangue/60 text-sangue"],
  morto: ["morto", "border-border text-muted line-through"],
};

function Selo({ status }: { status: string }) {
  if (!status) return null;
  const [rotulo, cor] = STATUS[status] ?? [status, "border-border text-muted"];
  return <span className={`shrink-0 rounded-full border px-2 py-px text-[10px] uppercase tracking-wider ${cor}`}>{rotulo}</span>;
}

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function Campo({ rotulo, valor }: { rotulo: string; valor: unknown }) {
  const t = texto(valor);
  if (!t) return null;
  return (
    <p className="text-sm leading-snug">
      <span className="text-muted">{rotulo}: </span>
      <span className="text-foreground/90">{t}</span>
    </p>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm italic text-muted">{children}</p>;
}

function AbaMissoes({ entradas }: { entradas: EntradaDiario[] }) {
  const missoes = entradas.filter((e) => e.tipo === "missao").sort((a, b) => Number(a.status !== "aberta") - Number(b.status !== "aberta"));
  if (!missoes.length) return <Vazio>Nenhuma missão ainda. O mundo está esperando.</Vazio>;
  return (
    <ul className="space-y-3">
      {missoes.map((m) => {
        const pistas = Array.isArray(m.dados?.pistas) ? (m.dados.pistas as unknown[]).filter((x): x is string => typeof x === "string") : [];
        return (
          <li key={m.id} className={`rounded-lg border border-border/80 bg-surface-2/60 p-3 ${m.status !== "aberta" ? "opacity-75" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-pergaminho">{m.titulo}</p>
              <Selo status={m.status} />
            </div>
            {m.texto && <p className="mt-1 text-sm leading-relaxed text-foreground/85">{m.texto}</p>}
            <div className="mt-2 space-y-0.5">
              <Campo rotulo="Objetivo" valor={m.dados?.objetivo} />
              <Campo rotulo="Recompensa" valor={m.dados?.recompensa} />
            </div>
            {pistas.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider text-muted">Pistas</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {pistas.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ambar/70" aria-hidden>
                        ⁂
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AbaPessoas({ entradas }: { entradas: EntradaDiario[] }) {
  const npcs = entradas.filter((e) => e.tipo === "npc").sort((a, b) => Number(a.status === "morto") - Number(b.status === "morto"));
  if (!npcs.length) return <Vazio>Ninguém conhecido por enquanto.</Vazio>;
  return (
    <ul className="space-y-3">
      {npcs.map((n) => (
        <li key={n.id} className={`rounded-lg border border-border/80 bg-surface-2/60 p-3 ${n.status === "morto" ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold" style={{ color: corDoNome(n.titulo) }}>
              {n.titulo}
            </p>
            <Selo status={n.status} />
          </div>
          {n.texto && <p className="mt-1 text-sm leading-relaxed text-foreground/85">{n.texto}</p>}
          <div className="mt-2 space-y-0.5">
            <Campo rotulo="Aparência" valor={n.dados?.aparencia} />
            <Campo rotulo="Voz" valor={n.dados?.voz} />
            <Campo rotulo="Jeito" valor={n.dados?.jeito} />
            <Campo rotulo="Desejo" valor={n.dados?.desejo} />
            <Campo rotulo="Temperamento" valor={n.dados?.temperamento} />
            <Campo rotulo="Relação" valor={n.dados?.relacao} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListaSimples({ entradas, icone }: { entradas: EntradaDiario[]; icone: string }) {
  return (
    <ul className="space-y-2">
      {entradas.map((e) => (
        <li key={e.id} className="rounded-lg border border-border/80 bg-surface-2/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-pergaminho">
              <span className="mr-1.5 text-ambar/70" aria-hidden>
                {icone}
              </span>
              {e.titulo}
            </p>
            <Selo status={e.status} />
          </div>
          {e.texto && <p className="mt-1 text-sm leading-relaxed text-foreground/85">{e.texto}</p>}
        </li>
      ))}
    </ul>
  );
}

function AbaLugares({ mesa }: { mesa: Mesa }) {
  const lugares = mesa.diario.filter((e) => e.tipo === "local");
  const itens = mesa.diario.filter((e) => e.tipo === "item");
  const notas = mesa.diario.filter((e) => e.tipo === "nota");
  return (
    <div>
      {mesa.cena.local && (
        <div className="mb-4 rounded-lg border border-ambar/40 bg-ambar/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Agora</p>
          <p className="font-semibold text-pergaminho">{mesa.cena.local}</p>
          {[mesa.cena.momento, mesa.cena.clima].filter(Boolean).length > 0 && (
            <p className="text-sm text-muted">{[mesa.cena.momento, mesa.cena.clima].filter(Boolean).join(" · ")}</p>
          )}
          {mesa.cena.situacao && <p className="mt-1 text-sm text-foreground/85">{mesa.cena.situacao}</p>}
        </div>
      )}
      {lugares.length ? <ListaSimples entradas={lugares} icone="⌂" /> : !mesa.cena.local && <Vazio>Nenhum lugar anotado ainda.</Vazio>}
      {itens.length > 0 && (
        <Secao titulo="Objetos notáveis">
          <ListaSimples entradas={itens} icone="◆" />
        </Secao>
      )}
      {notas.length > 0 && (
        <Secao titulo="Anotações">
          <ListaSimples entradas={notas} icone="❡" />
        </Secao>
      )}
    </div>
  );
}

function AbaGrupo({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const link = `/mesa/${mesa.campanha.id}/personagens/novo`;
  return (
    <div>
      <ul className="space-y-2">
        {mesa.personagens.map((p) => {
          const ativo = p.id === mesa.eu.personagemId;
          const s = mesa.sistema;
          const classe = s.classes.find((c) => c.id === p.ficha.classe)?.nome ?? p.ficha.classe;
          const pct = p.ficha.pvMax > 0 ? Math.max(0, Math.min(100, (p.ficha.pv / p.ficha.pvMax) * 100)) : 0;
          const presente = mesa.presenca.some((j) => j.personagemId === p.id && j.clienteId !== mesa.eu.clienteId);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${ativo ? "border-ambar/60 bg-ambar/5" : "border-border/80 bg-surface-2/60"}`}
            >
              <Retrato ficha={p.ficha} tamanho={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" style={{ color: corDoNome(p.ficha.nome) }}>
                  {p.ficha.nome}
                </p>
                <p className="truncate text-xs text-muted">
                  {classe} · {s.rotulos.nivel} {p.ficha.nivel}
                  {p.jogador && ` · ${p.jogador}`}
                  {presente && " · na mesa"}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/70">
                  <div className={`h-full ${pct > 50 ? "bg-musgo" : pct > 20 ? "bg-ambar" : "bg-sangue"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              {ativo ? (
                <span className="shrink-0 text-xs text-ambar">você</span>
              ) : podeAssumir(mesa, p) ? (
                <button type="button" className="btn-borda min-h-10 shrink-0 px-3 py-1.5 text-xs" onClick={() => acoes.escolherPersonagem(p.id)}>
                  Jogar com
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {mesa.personagens.length === 0 && <Vazio>Ninguém sentado à mesa.</Vazio>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={link} className="btn-borda min-h-10 px-3 py-1.5 text-sm">
          + Adicionar personagem
        </Link>
        {/* no desktop o convite fica no cabeçalho; aqui só no celular (a gaveta ocupa a tela, o modal cabe nela) */}
        <div className="sm:hidden">
          <Convite campanhaId={mesa.campanha.id} temPin={mesa.campanha.temPin} />
        </div>
      </div>
    </div>
  );
}

export function Codex({
  mesa,
  acoes,
  aberto,
  aoFechar,
  aba,
  aoMudarAba,
}: {
  mesa: Mesa;
  acoes: AcoesMesa;
  aberto: boolean;
  aoFechar: () => void;
  aba: AbaCodex;
  aoMudarAba: (aba: AbaCodex) => void;
}) {
  const painel = useRef<HTMLElement>(null);
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? mesa.personagens[0] ?? null;
  const missoesAbertas = mesa.diario.filter((e) => e.tipo === "missao" && e.status === "aberta").length;

  // Esc fecha; o foco vai para dentro da gaveta ao abrir (teclado e leitor de tela)
  useEffect(() => {
    if (!aberto) return;
    painel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);

  return (
    <>
      {/* fundo escurecido (só no desktop; no celular a gaveta ocupa a tela toda) */}
      <div
        className={`fixed inset-0 z-40 hidden bg-black/50 transition-opacity duration-300 motion-reduce:transition-none sm:block ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={aoFechar}
        aria-hidden
      />
      <aside
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal={aberto}
        aria-label="Códex"
        aria-hidden={!aberto}
        inert={!aberto}
        className={`fixed inset-0 z-50 flex flex-col bg-background shadow-[20px_0_60px_-30px_black] outline-none transition-transform duration-300 ease-out motion-reduce:transition-none sm:right-auto sm:w-[400px] sm:border-r sm:border-border ${aberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <h2 className={`${fonteGotica.className} text-2xl text-ambar`}>Códex</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="grid size-10 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label="Fechar o códex"
            title="Fechar (C ou Esc)"
          >
            ✕
          </button>
        </div>
        {/* as cinco abas cabem na largura (celular e gaveta de 400px) sem rolar de lado */}
        <nav className="flex border-b border-border/70 px-1 text-sm" role="tablist" aria-label="Seções do códex">
          {ABAS.map(([id, rotulo]) => (
            <button
              key={id}
              id={`codex-aba-${id}`}
              type="button"
              role="tab"
              aria-selected={aba === id}
              aria-controls="codex-painel"
              onClick={() => aoMudarAba(id)}
              className={`-mb-px flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-1 transition-colors ${
                aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span className="truncate">{rotulo}</span>
              {id === "missoes" && missoesAbertas > 0 && (
                <span className="grid min-w-4 shrink-0 place-items-center rounded-full bg-ambar/20 px-1 text-[10px] leading-4 text-ambar" aria-label={`${missoesAbertas} em andamento`}>
                  {missoesAbertas}
                </span>
              )}
              {id === "grupo" && mesa.personagens.length > 1 && <span className="shrink-0 text-[10px] text-muted">{mesa.personagens.length}</span>}
            </button>
          ))}
        </nav>
        <div
          key={aba}
          id="codex-painel"
          className="surgir flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          role="tabpanel"
          aria-labelledby={`codex-aba-${aba}`}
        >
          {aba === "personagem" && <AbaPersonagem mesa={mesa} p={ativo} />}
          {aba === "missoes" && <AbaMissoes entradas={mesa.diario} />}
          {aba === "pessoas" && <AbaPessoas entradas={mesa.diario} />}
          {aba === "lugares" && <AbaLugares mesa={mesa} />}
          {aba === "grupo" && <AbaGrupo mesa={mesa} acoes={acoes} />}
        </div>
        <div className="flex items-center gap-3 border-t border-border/70 py-1 pl-4 pr-2 text-[11px] text-muted">
          <p className="min-w-0 flex-1 truncate" title={`${mesa.sistema.nomeCurto} · Mestre: ${mesa.provedor}`}>
            {mesa.sistema.nomeCurto} · Mestre: {mesa.provedor}
            {mesa.limite?.uso != null && ` · plano ${Math.round(mesa.limite.uso * 100)}%`}
          </p>
          <Link
            href={`/mesa/${mesa.campanha.id}/livro`}
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 hover:bg-surface-2 hover:text-ambar"
            title="Livro da campanha: a história inteira, para reler, imprimir ou baixar"
          >
            <span aria-hidden>📜</span> Livro
          </Link>
          <Link href={`/mesa/${mesa.campanha.id}/ajustes`} className="flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 hover:bg-surface-2 hover:text-ambar">
            <span aria-hidden>⚙</span> Ajustes da mesa
          </Link>
        </div>
      </aside>
    </>
  );
}
