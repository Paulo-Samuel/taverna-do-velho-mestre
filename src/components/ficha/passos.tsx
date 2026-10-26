"use client";

import { useState, type ReactNode } from "react";
import type { AncestralidadeDef, ClasseDef, OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
import { temaDoSistema } from "@/lib/temas";
import { cenariosSugeridos, GANCHOS_HISTORIA, TONS } from "./sugestoes";
import { agrupar, capitalizar, casaBusca, sinal } from "./utilidades";

// Passos do assistente de criação. São componentes controlados: o estado mora no formulário,
// que também escreve os <input type="hidden"> do contrato (lib/formulario-ficha.ts). Aqui nada tem `name`.

export type Escolhas = {
  sistemaId: string;
  ancestralidade: string;
  classe: string;
  antecedente: string;
  metodo: string;
  /** texto dos campos (vazio = o sistema decide) */
  atributos: Record<string, string>;
  pericias: string[];
  extras: Record<string, string[]>;
  nome: string;
  historia: string;
  jogador: string;
  campanha: string;
  cenario: string;
  tom: string;
  modoMesa: "livre" | "rodada";
  pin: string;
  adicionarMais: boolean;
};

export type PropsPasso = { sistema: SistemaPublico; e: Escolhas; atualizar: (parcial: Partial<Escolhas>) => void };

/* ---------- peças pequenas ---------- */

export function Titulo({ children, ajuda }: { children: ReactNode; ajuda?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="titulo text-2xl text-pergaminho">{children}</h2>
      {ajuda && <p className="mt-1 text-sm text-muted">{ajuda}</p>}
    </div>
  );
}

function Busca({ valor, mudar, placeholder }: { valor: string; mudar: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
        ⌕
      </span>
      <input type="search" value={valor} onChange={(ev) => mudar(ev.target.value)} placeholder={placeholder} className="campo pl-8" aria-label={placeholder} />
    </div>
  );
}

// alvo de toque de 40px no celular; no desktop volta ao tamanho de plaquinha
function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center rounded-full border px-3 py-1 text-left text-sm leading-snug transition sm:min-h-8 sm:text-xs ${ativo ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-foreground/80 hover:border-ambar/60 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Cartao({ ativo, desativado, onClick, children, tema }: { ativo: boolean; desativado?: boolean; onClick: () => void; children: ReactNode; tema?: string }) {
  // flex-col: o conteúdo fica no topo mesmo quando o vizinho da grade é mais alto; com tema, o cartão mostra as cores do sistema
  return (
    <button
      type="button"
      data-tema={tema}
      aria-pressed={ativo}
      disabled={desativado}
      onClick={onClick}
      className={`cartao relative flex h-full w-full ${tema ? "cartao-tema" : ""} flex-col justify-start p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        ativo ? "border-ambar bg-ambar/[0.07] ring-1 ring-ambar/70" : "hover:border-ambar/50 hover:bg-surface-2/60"
      }`}
    >
      {ativo && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-botao text-xs text-botao-texto" aria-hidden>
          ✓
        </span>
      )}
      {children}
    </button>
  );
}

function Selo({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-normal leading-snug ${destaque ? "border-ambar/50 text-ambar" : "border-border bg-surface-2/60 text-foreground/75"}`}>
      {children}
    </span>
  );
}

/** Traços curtos viram plaquinhas; frases ("Especialidade: Intimidação (assaltos) ou...") viram lista, que se lê melhor. */
function Tracos({ tracos }: { tracos: string[] }) {
  if (!tracos.length) return null;
  if (tracos.every((t) => t.length <= 24)) {
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {tracos.map((t) => (
          <Selo key={t}>{t}</Selo>
        ))}
      </div>
    );
  }
  return (
    <ul className="mt-2.5 space-y-1 border-t border-border/70 pt-2 text-[13px] leading-snug text-foreground/80">
      {tracos.map((t) => {
        // "Rótulo: resto" ganha o rótulo em destaque
        const [cabeca, ...resto] = t.split(/:\s+/);
        return (
          <li key={t} className="flex gap-1.5">
            <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-ambar-forte" aria-hidden />
            <span>
              {resto.length ? (
                <>
                  <span className="text-ambar">{cabeca}:</span> {resto.join(": ")}
                </>
              ) : (
                t
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Nada({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">{children}</p>;
}

const abrevDe = (sistema: SistemaPublico, id: string) => sistema.atributos.find((a) => a.id === id)?.abrev ?? id.toUpperCase();

export function ajustesTexto(sistema: SistemaPublico, a: AncestralidadeDef): string[] {
  return Object.entries(a.ajustes ?? {})
    .filter(([, v]) => v)
    .map(([id, v]) => `${sinal(v)} ${abrevDe(sistema, id)}`);
}

/* ---------- 1. sistema ---------- */

export function PassoSistema({ sistemas, e, escolher }: { sistemas: SistemaPublico[]; e: Escolhas; escolher: (id: string) => void }) {
  return (
    <>
      <Titulo ajuda="Cada sistema tem seu jeito de rolar e de matar personagens. Dá para ter campanhas em sistemas diferentes.">Que regras vamos usar?</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sistemas.map((s) => (
          <Cartao key={s.id} tema={temaDoSistema(s.id)} ativo={e.sistemaId === s.id} desativado={!s.pronto} onClick={() => escolher(s.id)}>
            <div className="flex items-start gap-3 pr-6">
              <span className="titulo flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-ambar/40 bg-ambar/10 px-1 text-sm text-ambar">
                {s.dadoPrincipal}
              </span>
              <div className="min-w-0">
                <p className="titulo text-lg leading-tight text-pergaminho">{s.nome}</p>
                {!s.pronto && <Selo destaque>em breve</Selo>}
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{s.descricao}</p>
            {s.pronto && (
              <p className="mt-2 text-xs text-muted">
                {s.classes.length} {s.rotulos.classe.toLowerCase()}
                {s.classes.length === 1 ? "" : "s"} · {s.ancestralidades.length} {s.rotulos.ancestralidade.toLowerCase()}
                {s.ancestralidades.length === 1 ? "" : "s"}
              </p>
            )}
            <p className="mt-auto pt-1.5 text-[11px] leading-snug text-muted">{s.licenca}</p>
          </Cartao>
        ))}
      </div>
    </>
  );
}

/* ---------- 2. ancestralidade ---------- */

export function PassoAncestralidade({ sistema, e, atualizar }: PropsPasso) {
  const [busca, setBusca] = useState("");
  const rotulo = sistema.rotulos.ancestralidade;
  const lista = sistema.ancestralidades.filter((a) => casaBusca(busca, a.nome, a.descricao, ...(a.tracos ?? [])));
  return (
    <>
      <Titulo ajuda={`${sistema.ancestralidades.length} opções. O mestre vai lembrar disso nas horas mais constrangedoras.`}>{rotulo}</Titulo>
      {sistema.ancestralidades.length > 6 && (
        <div className="mb-3">
          <Busca valor={busca} mudar={setBusca} placeholder={`Buscar ${rotulo.toLowerCase()} ou traço…`} />
        </div>
      )}
      {lista.length === 0 && <Nada>Ninguém com esse nome entrou na taverna hoje.</Nada>}
      <div className="grid gap-3 sm:grid-cols-2">
        {lista.map((a) => {
          const ajustes = ajustesTexto(sistema, a);
          return (
            <Cartao key={a.id} ativo={e.ancestralidade === a.id} onClick={() => atualizar({ ancestralidade: a.id })}>
              <p className="titulo pr-6 text-lg leading-tight text-pergaminho">{a.nome}</p>
              <p className="mt-1 text-sm text-foreground/90">{a.descricao}</p>
              {(ajustes.length > 0 || a.pv || a.deslocamento) && (
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ambar">
                  {ajustes.length > 0 && <span>{ajustes.join(", ")}</span>}
                  {a.pv ? <span>+{a.pv} {sistema.rotulos.pv}</span> : null}
                  {a.deslocamento && <span className="text-muted">deslocamento {a.deslocamento}</span>}
                </p>
              )}
              <Tracos tracos={a.tracos ?? []} />
            </Cartao>
          );
        })}
      </div>
    </>
  );
}

/* ---------- 3. classe ---------- */

const SEM_PAPEL = "outros";

export function PassoClasse({ sistema, e, atualizar }: PropsPasso) {
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("");
  const [fonte, setFonte] = useState("");
  const rotulo = sistema.rotulos.classe;
  const papeis = [...new Set(sistema.classes.map((c) => c.papel || SEM_PAPEL))];
  const fontes = [...new Set(sistema.classes.map((c) => c.fonte).filter((f): f is string => Boolean(f)))];
  const nomePericia = (id: string) => sistema.pericias.find((p) => p.id === id)?.nome ?? id;
  const atributo = (id?: string) => (id ? (sistema.atributos.find((a) => a.id === id)?.nome ?? id.toUpperCase()) : null);

  const lista = sistema.classes.filter(
    (c) =>
      (!papel || (c.papel || SEM_PAPEL) === papel) &&
      (!fonte || c.fonte === fonte) &&
      casaBusca(busca, c.nome, c.descricao, c.papel, c.fonte, atributo(c.atributoChave)),
  );
  // agrupa por papel quando não há filtro de papel e existe mais de um papel
  const grupos: [string, ClasseDef[]][] = !papel && papeis.length > 1 ? agrupar(lista, (c) => c.papel || SEM_PAPEL) : [["", lista]];

  return (
    <>
      <Titulo ajuda={`${sistema.classes.length} opções. Escolha pelo que você quer fazer na mesa, não pelo que parece mais forte.`}>{rotulo}</Titulo>
      <div className="mb-4 space-y-2">
        {sistema.classes.length > 6 && <Busca valor={busca} mudar={setBusca} placeholder={`Buscar ${rotulo.toLowerCase()}, papel, atributo…`} />}
        {papeis.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por papel">
            <Chip ativo={!papel} onClick={() => setPapel("")}>
              todos os papéis
            </Chip>
            {papeis.map((p) => (
              <Chip key={p} ativo={papel === p} onClick={() => setPapel(papel === p ? "" : p)}>
                {p}
              </Chip>
            ))}
          </div>
        )}
        {/* muitas fontes viram um seletor, senão os chips tomam a tela do celular */}
        {fontes.length > 4 && (
          <select value={fonte} onChange={(ev) => setFonte(ev.target.value)} className="campo py-1.5 text-sm" aria-label="Filtrar por fonte">
            <option value="">Todas as fontes ({fontes.length})</option>
            {fontes.map((f) => (
              <option key={f} value={f}>
                {f} ({sistema.classes.filter((c) => c.fonte === f).length})
              </option>
            ))}
          </select>
        )}
        {fontes.length > 1 && fontes.length <= 4 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por fonte">
            <Chip ativo={!fonte} onClick={() => setFonte("")}>
              todas as fontes
            </Chip>
            {fontes.map((f) => (
              <Chip key={f} ativo={fonte === f} onClick={() => setFonte(fonte === f ? "" : f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}
      </div>
      {lista.length === 0 && <Nada>Nenhuma opção com esse filtro. Talvez o mestre tenha expulsado todos.</Nada>}
      <div className="space-y-5">
        {grupos.map(([grupo, classes]) => (
          <section key={grupo || "todas"}>
            {grupo && (
              <h3 className="titulo mb-2 flex items-center gap-2 text-sm uppercase tracking-widest text-ambar">
                {capitalizar(grupo)} <span className="h-px flex-1 bg-border" aria-hidden />
              </h3>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((c) => {
                const ativo = e.classe === c.id;
                return (
                  <Cartao key={c.id} ativo={ativo} onClick={() => atualizar({ classe: c.id })}>
                    <div className="flex flex-wrap items-center gap-1.5 pr-6">
                      <p className="titulo text-lg leading-tight text-pergaminho">{c.nome}</p>
                      {c.fonte && fontes.length > 1 && <Selo>{c.fonte}</Selo>}
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{c.descricao}</p>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      {c.atributoChave && (
                        <span>
                          chave <span className="text-ambar">{atributo(c.atributoChave)}</span>
                        </span>
                      )}
                      {c.pvBase ? (
                        <span>
                          {sistema.rotulos.pv} <span className="text-ambar">{c.pvBase}</span>
                        </span>
                      ) : null}
                    </p>
                    {ativo && (c.pericias?.length || c.equipamento?.length) ? (
                      <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted">
                        {c.pericias?.length ? <p>Já sabe: {c.pericias.map(nomePericia).join(", ")}</p> : null}
                        {c.equipamento?.length ? <p>Leva: {c.equipamento.join(", ")}</p> : null}
                      </div>
                    ) : null}
                  </Cartao>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ---------- 4. antecedente ---------- */

export function PassoAntecedente({ sistema, e, atualizar }: PropsPasso) {
  const [busca, setBusca] = useState("");
  const rotulo = sistema.rotulos.antecedente ?? "Antecedente";
  const todos = sistema.antecedentes ?? [];
  const lista = todos.filter((a) => casaBusca(busca, a.nome, a.descricao));
  return (
    <>
      <Titulo ajuda="O que você fazia antes de decidir que arriscar a vida por moedas era uma boa ideia.">{rotulo}</Titulo>
      {todos.length > 6 && (
        <div className="mb-3">
          <Busca valor={busca} mudar={setBusca} placeholder={`Buscar ${rotulo.toLowerCase()}…`} />
        </div>
      )}
      {lista.length === 0 && <Nada>Nenhum passado com esse nome. Talvez seja melhor assim.</Nada>}
      <div className="grid gap-2 sm:grid-cols-2">
        {lista.map((a) => (
          <Cartao key={a.id} ativo={e.antecedente === a.id} onClick={() => atualizar({ antecedente: a.id })}>
            <p className="titulo pr-6 text-base leading-tight text-pergaminho">{a.nome}</p>
            {a.descricao && <p className="mt-1 text-sm text-foreground/90">{a.descricao}</p>}
          </Cartao>
        ))}
      </div>
    </>
  );
}

/* ---------- 5. atributos ---------- */

type PropsAtributos = PropsPasso & {
  carregando: boolean;
  /** pede ao servidor valores para o método (rola de novo nos métodos aleatórios) */
  sugerir: (metodo: string) => void;
  editar: (id: string, valor: string) => void;
  /** últimos valores sugeridos pelo servidor para o método atual */
  sugestao: Record<string, number> | null;
  /** troca de método ("Livre" mantém os valores) */
  escolherMetodo: (metodo: string) => void;
  /** troca os valores da distribuição de lugar */
  embaralhar: () => void;
};

/**
 * Como o método se comporta: "aleatorio" (rola dados no servidor), "livre" (o jogador digita o que quiser)
 * ou "fixo" (uma distribuição do livro, matriz padrão ou compra de pontos, sugerida pela classe).
 */
export function tipoMetodo(m?: { id: string; nome: string }): "aleatorio" | "livre" | "fixo" {
  if (!m) return "fixo";
  const t = `${m.id} ${m.nome}`.toLowerCase();
  if (/rol|\dd\d|aleat|embaralh|heroic/.test(t)) return "aleatorio";
  if (/livre/.test(t)) return "livre";
  return "fixo";
}

const multiconjunto = (valores: (string | number)[]) =>
  valores
    .map(Number)
    .sort((a, b) => a - b)
    .join(",");

export function PassoAtributos({ sistema, e, carregando, sugerir, editar, sugestao, escolherMetodo, embaralhar }: PropsAtributos) {
  const { min, max } = sistema.limitesAtributos;
  const anc = sistema.ancestralidades.find((a) => a.id === e.ancestralidade);
  const metodo = sistema.metodosAtributos.find((m) => m.id === e.metodo);
  const tipo = tipoMetodo(metodo);
  const metodoLivre = sistema.metodosAtributos.find((m) => tipoMetodo(m) === "livre");
  const vazios = sistema.atributos.every((a) => !e.atributos[a.id]);
  const numeros = sistema.atributos.map((a) => Number(e.atributos[a.id]));
  const total = numeros.every(Number.isFinite) && !vazios ? numeros.reduce((s, n) => s + n, 0) : null;
  // só avisa quando o sistema tem um modo livre para onde mandar o jogador (VtM, Fate...)
  const esperado = sugestao ? sistema.atributos.map((a) => sugestao[a.id]).filter((v) => v !== undefined) : [];
  const foraDaDistribuicao =
    tipo === "fixo" && metodoLivre && !vazios && esperado.length === sistema.atributos.length && multiconjunto(numeros) !== multiconjunto(esperado);

  function passo(id: string, delta: number) {
    const atual = Number(e.atributos[id]);
    const base = Number.isFinite(atual) && e.atributos[id] !== "" ? atual : min;
    editar(id, String(Math.max(min, Math.min(max, base + delta))));
  }

  return (
    <>
      <Titulo ajuda={`Valores de ${min} a ${max}. Peça uma sugestão ao servidor e ajuste à mão se quiser.`}>Atributos</Titulo>
      {sistema.metodosAtributos.length > 1 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Método">
          {sistema.metodosAtributos.map((m) => (
            <Cartao key={m.id} ativo={e.metodo === m.id} onClick={() => escolherMetodo(m.id)}>
              <p className="pr-6 font-semibold text-pergaminho">{m.nome}</p>
              <p className="mt-0.5 text-xs text-muted">{m.descricao}</p>
            </Cartao>
          ))}
        </div>
      )}
      {sistema.metodosAtributos.length === 1 && metodo && (
        <p className="mb-3 text-sm text-muted">
          <span className="text-pergaminho">{metodo.nome}:</span> {metodo.descricao}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {vazios || tipo === "aleatorio" ? (
          <button type="button" className="btn-borda py-1.5" disabled={carregando} onClick={() => sugerir(e.metodo)}>
            <span className={carregando ? "dado-rolando inline-block" : "inline-block"} aria-hidden>
              🎲
            </span>
            {carregando ? "Rolando…" : vazios ? "Sugerir valores" : "Rolar de novo"}
          </button>
        ) : (
          <>
            {tipo === "fixo" && (
              <button type="button" className="btn-borda py-1.5" onClick={embaralhar} title="Troca os mesmos valores de lugar">
                <span aria-hidden>🔀</span> Embaralhar
              </button>
            )}
            <button type="button" className="text-sm text-ambar hover:underline disabled:opacity-50" disabled={carregando} onClick={() => sugerir(e.metodo)}>
              {carregando ? "Buscando…" : "↺ Voltar à sugestão"}
            </button>
          </>
        )}
        {total !== null && <span className="text-xs text-muted">Soma: {total}</span>}
      </div>
      {foraDaDistribuicao && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ambar/40 bg-ambar/10 px-3 py-2 text-sm">
          <span>
            Fora da {metodo?.nome.toLowerCase()} (esperado: {[...esperado].sort((a, b) => b - a).join(", ")}).
          </span>
          {metodoLivre && (
            <button type="button" className="text-ambar hover:underline" onClick={() => escolherMetodo(metodoLivre.id)}>
              Usar {metodoLivre.nome.toLowerCase()}
            </button>
          )}
        </div>
      )}
      {vazios && !carregando && (
        <p className="mb-3 text-sm text-muted">Deixando em branco, o sistema distribui os valores pelo método escolhido na hora de criar.</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sistema.atributos.map((a) => {
          const valor = e.atributos[a.id] ?? "";
          const n = Number(valor);
          const invalido = valor !== "" && (!Number.isFinite(n) || n < min || n > max);
          const ajuste = anc?.ajustes?.[a.id];
          return (
            <div key={a.id} className={`rounded-lg border bg-surface-2/50 p-2 ${invalido ? "border-sangue" : "border-border"}`} title={a.descricao}>
              <label htmlFor={`attr-${a.id}`} className="flex items-baseline justify-between gap-1">
                <span className="truncate text-xs text-muted">{a.nome}</span>
                <span className="titulo text-xs text-ambar">{a.abrev}</span>
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" onClick={() => passo(a.id, -1)} className="h-10 w-9 shrink-0 rounded-md border border-border text-lg text-muted hover:border-ambar/60 hover:text-ambar sm:h-9 sm:w-8 sm:text-base" aria-label={`Diminuir ${a.nome}`}>
                  −
                </button>
                <input
                  id={`attr-${a.id}`}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  value={valor}
                  placeholder="—"
                  onChange={(ev) => editar(a.id, ev.target.value)}
                  className="campo h-10 min-w-0 px-1 sm:h-9 text-center text-lg tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => passo(a.id, 1)} className="h-10 w-9 shrink-0 rounded-md border border-border text-lg text-muted hover:border-ambar/60 hover:text-ambar sm:h-9 sm:w-8 sm:text-base" aria-label={`Aumentar ${a.nome}`}>
                  +
                </button>
              </div>
              {ajuste ? (
                <p className="mt-1 text-[11px] text-ambar">
                  {sinal(ajuste)} de {anc?.nome}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- 6. perícias ---------- */

export function PassoPericias({ sistema, e, atualizar }: PropsPasso) {
  const [busca, setBusca] = useState("");
  const limite = sistema.periciasEscolhiveis ?? 0;
  const daClasse = new Set(sistema.classes.find((c) => c.id === e.classe)?.pericias ?? []);
  const escolhidas = e.pericias.filter((p) => !daClasse.has(p));
  const lista = sistema.pericias.filter((p) => casaBusca(busca, p.nome, p.descricao, p.atributo && abrevDe(sistema, p.atributo)));
  const grupos = agrupar(lista, (p) => (p.atributo ? abrevDe(sistema, p.atributo) : ""));

  function alternar(id: string) {
    if (daClasse.has(id)) return;
    if (escolhidas.includes(id)) atualizar({ pericias: escolhidas.filter((p) => p !== id) });
    else if (escolhidas.length < limite) atualizar({ pericias: [...escolhidas, id] });
  }

  return (
    <>
      <Titulo
        ajuda={
          <>
            Escolha até <span className="text-ambar">{limite}</span> além das que {sistema.rotulos.classe.toLowerCase()} já dá.
          </>
        }
      >
        Perícias
      </Titulo>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-sm tabular-nums ${escolhidas.length === limite ? "border-ambar text-ambar" : "border-border text-muted"}`}>
          {escolhidas.length}/{limite}
        </span>
        {sistema.pericias.length > 12 && (
          <div className="min-w-0 flex-1">
            <Busca valor={busca} mudar={setBusca} placeholder="Buscar perícia…" />
          </div>
        )}
      </div>
      <div className="space-y-3">
        {grupos.map(([grupo, pericias]) => (
          <section key={grupo || "sem"}>
            {grupos.length > 1 && grupo && <h3 className="mb-1.5 text-xs uppercase tracking-widest text-ambar-forte">{grupo}</h3>}
            <div className="flex flex-wrap gap-1.5">
              {pericias.map((p) => {
                const fixa = daClasse.has(p.id);
                const ativa = fixa || escolhidas.includes(p.id);
                const cheio = !ativa && escolhidas.length >= limite;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={ativa}
                    disabled={fixa || cheio}
                    title={fixa ? `Já vem de ${sistema.rotulos.classe.toLowerCase()}` : p.descricao}
                    onClick={() => alternar(p.id)}
                    className={`min-h-10 rounded-full border px-3 py-1 text-sm transition disabled:cursor-not-allowed sm:min-h-8 ${
                      fixa
                        ? "border-musgo/60 bg-musgo/10 text-musgo"
                        : ativa
                          ? "border-ambar bg-ambar/15 text-ambar"
                          : cheio
                            ? "border-border text-muted/50"
                            : "border-border text-foreground hover:border-ambar/60"
                    }`}
                  >
                    {fixa && "✓ "}
                    {p.nome}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {daClasse.size > 0 && <p className="mt-3 text-xs text-muted">Em verde: já vêm de {sistema.rotulos.classe.toLowerCase()}.</p>}
    </>
  );
}

/* ---------- 7. opções do sistema ---------- */

type PropsCampo = { opcao: OpcaoCriacao; valores: string[]; mudar: (v: string[]) => void; destaque?: string };

function CampoOpcao({ opcao, valores, mudar, destaque }: PropsCampo) {
  const [busca, setBusca] = useState("");
  // opções que citam a ancestralidade escolhida (heranças, linhagens...) sobem para o topo
  const combina = (o: { nome: string; descricao?: string }) => Boolean(destaque) && casaBusca(destaque ?? "", o.nome, o.descricao);
  const todas = opcao.opcoes ?? [];
  const parcial = todas.some(combina) && !todas.every(combina);
  const opcoes = parcial ? [...todas.filter(combina), ...todas.filter((o) => !combina(o))] : todas;
  const fechada = (opcao.tipo === "escolha" || opcao.tipo === "multipla") && opcoes.length > 0;

  if (fechada) {
    const multipla = opcao.tipo === "multipla";
    const max = multipla ? (opcao.max ?? opcoes.length) : 1;
    const lista = opcoes.filter((o) => casaBusca(busca, o.nome, o.descricao));
    const alternar = (id: string) => {
      if (valores.includes(id)) mudar(valores.filter((v) => v !== id));
      else if (!multipla) mudar([id]);
      else if (valores.length < max) mudar([...valores, id]);
    };
    // listas longas de múltipla escolha (perícias do Vampiro) e opções sem descrição (atributos) viram botões compactos
    const compacta = opcoes.every((o) => !o.descricao) || (multipla && opcoes.length > 8);
    return (
      <div>
        {multipla && (
          <p className={`mb-1.5 text-xs tabular-nums ${valores.length >= max ? "text-ambar" : "text-muted"}`}>
            {valores.length}/{max} escolhida{max === 1 ? "" : "s"}
            {valores.length >= max && max > 1 ? " · tire uma para trocar" : ""}
          </p>
        )}
        {opcoes.length > 8 && (
          <div className="mb-2">
            <Busca valor={busca} mudar={setBusca} placeholder={`Buscar em ${opcao.rotulo.toLowerCase()}…`} />
          </div>
        )}
        {compacta ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {lista.map((o) => {
              const ativo = valores.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={ativo}
                  disabled={multipla && !ativo && valores.length >= max}
                  onClick={() => alternar(o.id)}
                  title={o.descricao}
                  className={`flex min-h-11 flex-col justify-center rounded-lg border px-3 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    ativo ? "border-ambar bg-ambar/10 text-ambar" : "border-border bg-surface/60 text-pergaminho hover:border-ambar/50"
                  }`}
                >
                  <span className="text-sm font-semibold leading-tight">
                    {ativo && <span aria-hidden>✓ </span>}
                    {o.nome}
                  </span>
                  {o.descricao && <span className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted">{o.descricao}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lista.map((o) => {
              const ativo = valores.includes(o.id);
              return (
                <Cartao key={o.id} ativo={ativo} desativado={multipla && !ativo && valores.length >= max} onClick={() => alternar(o.id)}>
                  <p className="pr-6 font-semibold leading-tight text-pergaminho">{o.nome}</p>
                  {o.descricao && <p className="mt-0.5 text-xs text-muted">{o.descricao}</p>}
                  {parcial && combina(o) && (
                    <span className="mt-1.5 self-start">
                      <Selo destaque>combina com {destaque}</Selo>
                    </span>
                  )}
                </Cartao>
              );
            })}
          </div>
        )}
        {lista.length === 0 && <Nada>Nada com esse nome.</Nada>}
      </div>
    );
  }

  if (opcao.tipo === "lista-texto") {
    const max = opcao.max ?? 6;
    const linhas = valores.length ? valores : [""];
    return (
      <div className="space-y-2">
        {linhas.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              maxLength={240}
              onChange={(ev) => mudar(linhas.map((x, j) => (j === i ? ev.target.value : x)))}
              className="campo"
              placeholder={`${opcao.rotulo} ${i + 1}`}
              aria-label={`${opcao.rotulo} ${i + 1}`}
            />
            {linhas.length > 1 && (
              <button type="button" onClick={() => mudar(linhas.filter((_, j) => j !== i))} className="btn-borda px-3" aria-label="Remover">
                ✕
              </button>
            )}
          </div>
        ))}
        {linhas.length < max && (
          <button type="button" onClick={() => mudar([...linhas, ""])} className="text-sm text-ambar hover:underline">
            + adicionar ({linhas.length}/{max})
          </button>
        )}
      </div>
    );
  }

  // texto, ou escolha sem lista de opções
  return <input value={valores[0] ?? ""} maxLength={240} onChange={(ev) => mudar([ev.target.value])} className="campo" placeholder={`${opcao.rotulo}…`} />;
}

export function PassoOpcoes({ sistema, e, atualizar, opcoes }: PropsPasso & { opcoes: OpcaoCriacao[] }) {
  const classe = sistema.classes.find((c) => c.id === e.classe);
  const anc = sistema.ancestralidades.find((a) => a.id === e.ancestralidade);
  return (
    <>
      <Titulo ajuda={`Os detalhes que fazem ${classe ? `este ${classe.nome.toLowerCase()}` : "este personagem"} ser diferente do resto. Os marcados com * são obrigatórios.`}>
        Escolhas de {sistema.nomeCurto}
      </Titulo>
      {/* uma linha separando cada pergunta: no Vampiro são mais de dez em sequência */}
      <div className="divide-y divide-border/70">
        {opcoes.map((o) => (
          <div key={o.id} className="py-5 first:pt-0 last:pb-0">
            <fieldset>
              <legend className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-pergaminho">
                <span>
                  {o.rotulo}
                  {o.obrigatoria && (
                    <span className="ml-1 text-sangue" title="obrigatório">
                      *<span className="sr-only"> (obrigatório)</span>
                    </span>
                  )}
                </span>
                {o.classes?.length ? <Selo destaque>de {classe?.nome ?? "classe"}</Selo> : null}
              </legend>
              {o.ajuda && <p className="mb-2 text-xs leading-relaxed text-muted">{o.ajuda}</p>}
              <CampoOpcao opcao={o} destaque={anc?.nome} valores={e.extras[o.id] ?? []} mudar={(v) => atualizar({ extras: { ...e.extras, [o.id]: v } })} />
            </fieldset>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- 8. identidade ---------- */

export function PassoIdentidade({ e, atualizar }: Omit<PropsPasso, "sistema">) {
  return (
    <>
      <Titulo ajuda="O nome que o mestre vai gritar quando tudo der errado.">Quem é você?</Titulo>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">
            Nome do personagem <span className="text-sangue">*</span>
          </span>
          <input value={e.nome} onChange={(ev) => atualizar({ nome: ev.target.value })} maxLength={60} className="campo" placeholder="Ex.: Brunhilda Pé-de-Ferro" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Jogador (seu apelido, para a mesa saber quem controla)</span>
          <input value={e.jogador} onChange={(ev) => atualizar({ jogador: ev.target.value })} maxLength={40} className="campo" placeholder="Deixe vazio para qualquer um poder usar" />
        </label>
        <div>
          <label htmlFor="historia" className="mb-1 block text-sm text-muted">
            História (opcional, mas o mestre adora material para usar contra você)
          </label>
          <textarea
            id="historia"
            value={e.historia}
            onChange={(ev) => atualizar({ historia: ev.target.value })}
            maxLength={2000}
            rows={5}
            className="campo resize-y"
            placeholder="De onde veio, o que quer, de quem foge…"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted">Ganchos:</span>
            {GANCHOS_HISTORIA.map((g) => (
              <Chip key={g} ativo={e.historia.includes(g)} onClick={() => !e.historia.includes(g) && atualizar({ historia: `${e.historia.trim()} ${g}`.trim() })}>
                {g}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 9. campanha ---------- */

export function PassoCampanha({ e, atualizar }: Omit<PropsPasso, "sistema">) {
  return (
    <>
      <Titulo ajuda="Onde a história começa e como a mesa funciona. Tudo isso pode ser só um rascunho: o mestre improvisa.">A campanha</Titulo>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Nome da campanha</span>
          <input value={e.campanha} onChange={(ev) => atualizar({ campanha: ev.target.value })} maxLength={80} className="campo" placeholder={e.nome ? `A saga de ${e.nome.trim()}` : "A saga de alguém"} />
        </label>

        <div>
          <label htmlFor="cenario" className="mb-1 block text-sm text-muted">
            Cenário: onde e como começa?
          </label>
          <textarea
            id="cenario"
            value={e.cenario}
            onChange={(ev) => atualizar({ cenario: ev.target.value })}
            maxLength={1500}
            rows={4}
            className="campo resize-y"
            placeholder="Em branco, o mestre inventa. Ele adora inventar."
          />
          <p className="mb-1.5 mt-2 text-xs text-muted">Sem ideia? Clique numa:</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {cenariosSugeridos(e.sistemaId).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => atualizar({ cenario: c })}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${e.cenario === c ? "border-ambar text-ambar" : "border-border text-muted hover:border-ambar/60 hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="tom" className="mb-1 block text-sm text-muted">
            Tom
          </label>
          <input id="tom" value={e.tom} onChange={(ev) => atualizar({ tom: ev.target.value })} maxLength={60} className="campo" placeholder="sombrio e debochado" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TONS.map((t) => (
              <Chip key={t} ativo={e.tom === t} onClick={() => atualizar({ tom: t })}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm text-muted">Como a mesa funciona</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Cartao ativo={e.modoMesa === "livre"} onClick={() => atualizar({ modoMesa: "livre" })}>
              <p className="pr-6 font-semibold text-pergaminho">Livre</p>
              <p className="mt-0.5 text-xs text-muted">Cada ação vai para o mestre assim que ele estiver livre. Bom para jogar sozinho ou em dupla.</p>
            </Cartao>
            <Cartao ativo={e.modoMesa === "rodada"} onClick={() => atualizar({ modoMesa: "rodada" })}>
              <p className="pr-6 font-semibold text-pergaminho">Por rodada</p>
              <p className="mt-0.5 text-xs text-muted">O mestre espera todo mundo agir antes de narrar. Bom para grupo grande e combate.</p>
            </Cartao>
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">PIN para entrar pela rede (opcional)</span>
          <input
            value={e.pin}
            onChange={(ev) => atualizar({ pin: ev.target.value.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 12) })}
            maxLength={12}
            autoComplete="off"
            className="campo max-w-48 tracking-widest"
            placeholder="ex.: 4321"
          />
          <span className="mt-1 block text-xs text-muted">Quem abrir a mesa de outro aparelho na rede local vai precisar dele. Neste computador não pede.</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-ambar/50">
          <input type="checkbox" checked={e.adicionarMais} onChange={(ev) => atualizar({ adicionarMais: ev.target.checked })} className="mt-1 h-4 w-4 accent-[var(--ambar)]" />
          <span className="text-sm">
            Vou adicionar mais personagens antes de começar
            <span className="block text-xs text-muted">O mestre só abre a cena quando vocês mandarem.</span>
          </span>
        </label>
      </div>
    </>
  );
}
