"use client";

import { useState, type ReactNode } from "react";
import type { AventuraPublica } from "@/lib/aventuras/tipos";
import { DIFICULDADES, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, TAMANHOS, type Dificuldade, type TamanhoNarracao } from "@/lib/mestre/estilo";
import { exemploDoCampo, sementesDe, type ParSemente } from "@/lib/sistemas/sementes";
import type { AncestralidadeDef, ClasseDef, OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
import { temaDoSistema } from "@/lib/temas";
import { bloqueadosPara, nomeAoAcaso, sortear, sortearOutro, sortearPericias, sugerirPar, sugerirTexto, valoresDe } from "./sugestoes";
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
  /** id da aventura pronta escolhida (vazio = campanha livre) */
  aventura: string;
  modoMesa: "livre" | "rodada";
  pin: string;
  adicionarMais: boolean;
  /** estilo do mestre (mesmas opções dos ajustes da mesa, em lib/mestre/estilo.ts) */
  dificuldade: Dificuldade;
  narracao: TamanhoNarracao;
  foco: string[];
  focoLivre: string;
  instrucoes: string;
  dados: "jogador" | "automatico";
  sugestoes: boolean;
};

export type PropsPasso = { sistema: SistemaPublico; e: Escolhas; atualizar: (parcial: Partial<Escolhas>) => void };

/* ---------- peças pequenas ---------- */

export function Titulo({ children, ajuda, acao }: { children: ReactNode; ajuda?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1 basis-64">
        <h2 className="titulo text-2xl text-pergaminho">{children}</h2>
        {ajuda && <p className="mt-1 text-sm text-muted">{ajuda}</p>}
      </div>
      {acao && <div className="flex shrink-0 flex-wrap gap-2">{acao}</div>}
    </div>
  );
}

/** Botão de sortear do passo (escolhe uma opção válida ao acaso). */
export function BotaoSortear({ onClick, children = "Sortear", titulo }: { onClick: () => void; children?: ReactNode; titulo?: string }) {
  return (
    <button type="button" onClick={onClick} title={titulo ?? "Escolhe uma opção válida ao acaso"} className="btn-borda min-h-10 py-1.5 text-sm sm:min-h-9">
      <span aria-hidden>🎲</span> {children}
    </button>
  );
}

/** Dadinho ao lado de um campo de texto: sugere um valor com a cara do sistema. */
function BotaoDado({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={rotulo}
      aria-label={rotulo}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-base transition hover:border-ambar/60 hover:bg-ambar/10 active:scale-95"
    >
      <span aria-hidden>🎲</span>
    </button>
  );
}

/** Depois de sortear, leva o cartão escolhido para o meio da tela (listas longas escondem a escolha). */
function mostrarCartao(id: string) {
  requestAnimationFrame(() => document.getElementById(`cartao-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
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

function Cartao({
  ativo,
  desativado,
  onClick,
  children,
  tema,
  id,
  titulo,
}: {
  ativo: boolean;
  desativado?: boolean;
  onClick: () => void;
  children: ReactNode;
  tema?: string;
  id?: string;
  titulo?: string;
}) {
  // flex-col: o conteúdo fica no topo mesmo quando o vizinho da grade é mais alto; com tema, o cartão mostra as cores do sistema
  return (
    <button
      type="button"
      id={id ? `cartao-${id}` : undefined}
      title={titulo}
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
  function sortearAqui() {
    const id = sortearOutro(
      sistema.ancestralidades.map((a) => a.id),
      e.ancestralidade,
    );
    setBusca("");
    atualizar({ ancestralidade: id });
    mostrarCartao(id);
  }
  return (
    <>
      <Titulo
        ajuda={`${sistema.ancestralidades.length} opções. O mestre vai lembrar disso nas horas mais constrangedoras.`}
        acao={sistema.ancestralidades.length > 1 && <BotaoSortear onClick={sortearAqui} />}
      >
        {rotulo}
      </Titulo>
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
            <Cartao key={a.id} id={a.id} ativo={e.ancestralidade === a.id} onClick={() => atualizar({ ancestralidade: a.id })}>
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

  function sortearAqui() {
    const id = sortearOutro(
      sistema.classes.map((c) => c.id),
      e.classe,
    );
    setBusca("");
    setPapel("");
    setFonte("");
    atualizar({ classe: id });
    mostrarCartao(id);
  }

  return (
    <>
      <Titulo
        ajuda={`${sistema.classes.length} opções. Escolha pelo que você quer fazer na mesa, não pelo que parece mais forte.`}
        acao={sistema.classes.length > 1 && <BotaoSortear onClick={sortearAqui} />}
      >
        {rotulo}
      </Titulo>
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
                  <Cartao key={c.id} id={c.id} ativo={ativo} onClick={() => atualizar({ classe: c.id })}>
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
  function sortearAqui() {
    const id = sortearOutro(
      todos.map((a) => a.id),
      e.antecedente,
    );
    setBusca("");
    atualizar({ antecedente: id });
    mostrarCartao(id);
  }
  return (
    <>
      <Titulo
        ajuda={
          sistema.id === "vtm5"
            ? "Há quanto tempo você está morto. Mais velho é mais forte, e tem mais inimigos."
            : "O que você fazia antes de decidir que arriscar a vida por moedas era uma boa ideia."
        }
        acao={todos.length > 1 && <BotaoSortear onClick={sortearAqui} />}
      >
        {rotulo}
      </Titulo>
      {todos.length > 6 && (
        <div className="mb-3">
          <Busca valor={busca} mudar={setBusca} placeholder={`Buscar ${rotulo.toLowerCase()}…`} />
        </div>
      )}
      {lista.length === 0 && <Nada>Nenhum passado com esse nome. Talvez seja melhor assim.</Nada>}
      <div className="grid gap-2 sm:grid-cols-2">
        {lista.map((a) => (
          <Cartao key={a.id} id={a.id} ativo={e.antecedente === a.id} onClick={() => atualizar({ antecedente: a.id })}>
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
        acao={<BotaoSortear onClick={() => atualizar({ pericias: sortearPericias(sistema, e.classe) })} titulo="Sorteia as perícias livres" />}
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

type PropsCampo = {
  opcao: OpcaoCriacao;
  valores: string[];
  mudar: (v: string[]) => void;
  destaque?: string;
  /** valores já escolhidos numa opção exclusiva com esta (valor → rótulo de onde está) */
  bloqueados?: Map<string, string>;
  /** placeholder com a cara do sistema */
  exemplo?: string;
  /** 🎲 dos campos de texto: devolve uma sugestão (null = sem sementes para este campo) */
  sugerir?: (linhas: string[]) => string | null;
};

function CampoOpcao({ opcao, valores, mudar, destaque, bloqueados, exemplo, sugerir }: PropsCampo) {
  const [busca, setBusca] = useState("");
  // opções que citam a ancestralidade escolhida (heranças, linhagens...) sobem para o topo
  const combina = (o: { nome: string; descricao?: string }) => Boolean(destaque) && casaBusca(destaque ?? "", o.nome, o.descricao);
  const todas = opcao.opcoes ?? [];
  const parcial = todas.some(combina) && !todas.every(combina);
  const opcoes = parcial ? [...todas.filter(combina), ...todas.filter((o) => !combina(o))] : todas;
  const fechada = (opcao.tipo === "escolha" || opcao.tipo === "multipla") && opcoes.length > 0;
  const temDado = Boolean(sugerir);

  if (fechada) {
    const multipla = opcao.tipo === "multipla";
    const max = multipla ? (opcao.max ?? opcoes.length) : 1;
    const lista = opcoes.filter((o) => casaBusca(busca, o.nome, o.descricao));
    const alternar = (id: string) => {
      if (valores.includes(id)) mudar(valores.filter((v) => v !== id));
      else if (bloqueados?.has(id)) return;
      else if (!multipla) mudar([id]);
      else if (valores.length < max) mudar([...valores, id]);
    };
    const sobra = valores.length - max;
    // listas longas de múltipla escolha (perícias do Vampiro) e opções sem descrição (atributos) viram botões compactos
    const compacta = opcoes.every((o) => !o.descricao) || (multipla && opcoes.length > 8);
    return (
      <div>
        {multipla && (
          <p className={`mb-1.5 text-xs tabular-nums ${sobra > 0 ? "text-sangue" : valores.length >= max ? "text-ambar" : "text-muted"}`}>
            {valores.length}/{max} escolhida{max === 1 ? "" : "s"}
            {sobra > 0 ? ` · passou da cota: tire ${sobra}` : valores.length >= max && max > 1 ? " · tire uma para trocar" : ""}
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
              const ondeEsta = !ativo ? bloqueados?.get(o.id) : undefined;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={ativo}
                  disabled={Boolean(ondeEsta) || (multipla && !ativo && valores.length >= max)}
                  onClick={() => alternar(o.id)}
                  title={ondeEsta ? `Já está em ${ondeEsta}` : o.descricao}
                  className={`flex min-h-11 flex-col justify-center rounded-lg border px-3 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    ativo ? "border-ambar bg-ambar/10 text-ambar" : "border-border bg-surface/60 text-pergaminho hover:border-ambar/50"
                  }`}
                >
                  <span className="text-sm font-semibold leading-tight">
                    {ativo && <span aria-hidden>✓ </span>}
                    {o.nome}
                  </span>
                  {ondeEsta ? (
                    <span className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted">em {ondeEsta.toLowerCase()}</span>
                  ) : (
                    o.descricao && <span className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted">{o.descricao}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lista.map((o) => {
              const ativo = valores.includes(o.id);
              const ondeEsta = !ativo ? bloqueados?.get(o.id) : undefined;
              return (
                <Cartao
                  key={o.id}
                  ativo={ativo}
                  desativado={Boolean(ondeEsta) || (multipla && !ativo && valores.length >= max)}
                  titulo={ondeEsta ? `Já está em ${ondeEsta}` : undefined}
                  onClick={() => alternar(o.id)}
                >
                  <p className="pr-6 font-semibold leading-tight text-pergaminho">{o.nome}</p>
                  {o.descricao && <p className="mt-0.5 text-xs text-muted">{o.descricao}</p>}
                  {ondeEsta && (
                    <span className="mt-1.5 self-start">
                      <Selo>já em {ondeEsta.toLowerCase()}</Selo>
                    </span>
                  )}
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
    const trocar = (i: number, v: string) => mudar(linhas.map((x, j) => (j === i ? v : x)));
    return (
      <div className="space-y-2">
        {linhas.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              maxLength={240}
              onChange={(ev) => trocar(i, ev.target.value)}
              className="campo"
              placeholder={i === 0 && exemplo ? exemplo : `${opcao.rotulo} ${i + 1}`}
              aria-label={`${opcao.rotulo} ${i + 1}`}
            />
            {temDado && (
              <BotaoDado
                rotulo={`Sugerir ${opcao.rotulo.toLowerCase()} ${i + 1}`}
                onClick={() => {
                  // manda todas as linhas (inclusive a atual) para o dado não devolver o mesmo texto
                  const sugestao = sugerir?.(linhas);
                  if (sugestao) trocar(i, sugestao);
                }}
              />
            )}
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
  return (
    <div className="flex gap-2">
      <input value={valores[0] ?? ""} maxLength={240} onChange={(ev) => mudar([ev.target.value])} className="campo" placeholder={exemplo ?? `${opcao.rotulo}…`} />
      {temDado && (
        <BotaoDado
          rotulo={`Sugerir ${opcao.rotulo.toLowerCase()}`}
          onClick={() => {
            const sugestao = sugerir?.(valores);
            if (sugestao) mudar([sugestao]);
          }}
        />
      )}
    </div>
  );
}

/** Duas listas que andam juntas, linha a linha (Convicção ↔ Pedra de Toque): cada linha é um par. */
function CampoPar({ par, a, b, e, atualizar }: { par: ParSemente; a: OpcaoCriacao; b: OpcaoCriacao } & Omit<PropsPasso, "sistema">) {
  const max = Math.min(a.max ?? 3, b.max ?? 3);
  const colA = e.extras[a.id] ?? [];
  const colB = e.extras[b.id] ?? [];
  const n = Math.max(1, colA.length, colB.length);
  const linhas = Array.from({ length: n }, (_, i) => [colA[i] ?? "", colB[i] ?? ""] as const);
  const gravar = (novas: (readonly [string, string])[]) =>
    atualizar({ extras: { ...e.extras, [a.id]: novas.map((l) => l[0]), [b.id]: novas.map((l) => l[1]) } });
  const trocar = (i: number, lado: 0 | 1, v: string) => gravar(linhas.map((l, j) => (j === i ? (lado === 0 ? [v, l[1]] : [l[0], v]) : l)));
  return (
    <fieldset>
      <legend className="mb-1 font-semibold text-pergaminho">{par.titulo}</legend>
      <p className="mb-2 text-xs leading-relaxed text-muted">{par.ajuda}</p>
      <div className="space-y-3">
        {linhas.map(([conv, pedra], i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-surface-2/40 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] uppercase tracking-widest text-ambar-forte">
              <span>Par {i + 1}</span>
              <span className="flex gap-1.5">
                <BotaoDado
                  rotulo={`Sugerir o par ${i + 1}`}
                  onClick={() => {
                    const outros = { ...e, extras: { ...e.extras, [a.id]: colA.filter((_, j) => j !== i) } };
                    const novo = sugerirPar(e.sistemaId, a.id, outros);
                    if (novo) gravar(linhas.map((l, j) => (j === i ? novo : l)));
                  }}
                />
                {n > 1 && (
                  <button type="button" onClick={() => gravar(linhas.filter((_, j) => j !== i))} className="btn-borda h-10 px-3" aria-label={`Remover o par ${i + 1}`}>
                    ✕
                  </button>
                )}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-0.5 block text-xs text-muted">{par.rotulos[0]}</span>
                <input value={conv} maxLength={240} onChange={(ev) => trocar(i, 0, ev.target.value)} className="campo" placeholder={par.exemplos[0]} />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs text-muted">{par.rotulos[1]}</span>
                <input value={pedra} maxLength={240} onChange={(ev) => trocar(i, 1, ev.target.value)} className="campo" placeholder={par.exemplos[1]} />
              </label>
            </div>
          </div>
        ))}
      </div>
      {n < max && (
        <button type="button" onClick={() => gravar([...linhas, ["", ""]])} className="mt-2 text-sm text-ambar hover:underline">
          + adicionar par ({n}/{max})
        </button>
      )}
    </fieldset>
  );
}

type PropsOpcoes = PropsPasso & { opcoes: OpcaoCriacao[]; sortearOpcoes: (modo: "faltam" | "tudo") => void };

export function PassoOpcoes({ sistema, e, atualizar, opcoes, sortearOpcoes }: PropsOpcoes) {
  const classe = sistema.classes.find((c) => c.id === e.classe);
  const anc = sistema.ancestralidades.find((a) => a.id === e.ancestralidade);
  const s = sementesDe(sistema.id);
  const ctx = { classe: e.classe, ancestralidade: e.ancestralidade };
  // pares (Convicção ↔ Pedra de Toque) viram um bloco só, no lugar da primeira das duas opções
  const pares = (s.pares ?? []).filter((p) => opcoes.some((o) => o.id === p.campo) && opcoes.some((o) => o.id === p.par));
  const segundos = new Set(pares.map((p) => p.par));
  const faltam = opcoes.some((o) => !valoresDe(o, e.extras).length && !s.deixarParaOSistema?.includes(o.id) && (o.opcoes?.length || s.campos?.[o.id]?.gerar || pares.some((p) => p.campo === o.id)));
  return (
    <>
      <Titulo
        ajuda={`Os detalhes que fazem ${classe ? `este ${classe.nome.toLowerCase()}` : "este personagem"} ser diferente do resto. Os marcados com * são obrigatórios; o 🎲 sugere.`}
        acao={
          faltam ? (
            <BotaoSortear onClick={() => sortearOpcoes("faltam")} titulo="Preenche só o que está vazio">
              Sortear o que falta
            </BotaoSortear>
          ) : (
            <BotaoSortear onClick={() => sortearOpcoes("tudo")} titulo="Refaz as escolhas e as sugestões (o que você digitou sem sugestão fica)">
              Sortear tudo de novo
            </BotaoSortear>
          )
        }
      >
        Escolhas de {sistema.nomeCurto}
      </Titulo>
      {/* uma linha separando cada pergunta: no Vampiro são mais de dez em sequência */}
      <div className="divide-y divide-border/70">
        {opcoes.map((o) => {
          if (segundos.has(o.id)) return null;
          const par = pares.find((p) => p.campo === o.id);
          const b = par && opcoes.find((x) => x.id === par.par);
          if (par && b) {
            return (
              <div key={o.id} className="py-5 first:pt-0 last:pb-0">
                <CampoPar par={par} a={o} b={b} e={e} atualizar={atualizar} />
              </div>
            );
          }
          const campo = s.campos?.[o.id];
          return (
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
                <CampoOpcao
                  opcao={o}
                  destaque={anc?.nome}
                  valores={e.extras[o.id] ?? []}
                  mudar={(v) => atualizar({ extras: { ...e.extras, [o.id]: v } })}
                  bloqueados={o.exclusivaCom?.length ? bloqueadosPara(o, opcoes, e.extras) : undefined}
                  exemplo={exemploDoCampo(campo, ctx)}
                  sugerir={campo?.gerar ? (linhas) => sugerirTexto(sistema.id, o.id, e, { ...e.extras, [o.id]: linhas }) : undefined}
                />
              </fieldset>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- 8. identidade ---------- */

/** Mostra `n` itens a partir de `inicio`, dando a volta na lista (para o "↻ outras ideias"). */
function janela<T>(lista: T[], inicio: number, n: number): T[] {
  if (lista.length <= n) return lista;
  return Array.from({ length: n }, (_, i) => lista[(inicio + i) % lista.length]);
}

export function PassoIdentidade({ e, atualizar }: Omit<PropsPasso, "sistema">) {
  const s = sementesDe(e.sistemaId);
  const [inicio, setInicio] = useState(0);
  const ganchos = janela(s.ganchos, inicio, 6);
  const juntar = (g: string) => !e.historia.includes(g) && atualizar({ historia: `${e.historia.trim()} ${g}`.trim() });
  return (
    <>
      <Titulo ajuda="O nome que o mestre vai gritar quando tudo der errado.">Quem é você?</Titulo>
      <div className="space-y-4">
        <div>
          <label htmlFor="nome-personagem" className="mb-1 block text-sm text-muted">
            Nome do personagem <span className="text-sangue">*</span>
          </label>
          <div className="flex gap-2">
            <input id="nome-personagem" value={e.nome} onChange={(ev) => atualizar({ nome: ev.target.value })} maxLength={60} className="campo" placeholder={s.exemploNome} />
            <BotaoDado rotulo="Sortear um nome" onClick={() => atualizar({ nome: nomeAoAcaso(e.sistemaId) })} />
          </div>
        </div>
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
            placeholder={s.exemploHistoria}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Ganchos:</span>
            {ganchos.map((g) => (
              <Chip key={g} ativo={e.historia.includes(g)} onClick={() => juntar(g)}>
                {g}
              </Chip>
            ))}
            {s.ganchos.length > 6 && (
              <button type="button" onClick={() => setInicio((i) => i + 6)} className="min-h-10 px-2 text-xs text-ambar hover:underline sm:min-h-8">
                ↻ outros ganchos
              </button>
            )}
            <button type="button" onClick={() => juntar(sortear(s.ganchos.filter((g) => !e.historia.includes(g))))} className="min-h-10 px-2 text-xs text-ambar hover:underline sm:min-h-8">
              🎲 me dá um
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 9. campanha ---------- */

const DADOS: { id: Escolhas["dados"]; nome: string; texto: string }[] = [
  { id: "jogador", nome: "O jogador, na tela", texto: "O mestre pede o teste e espera você rolar. Mais suspense, um clique a mais." },
  { id: "automatico", nome: "O mestre, na hora", texto: "O servidor rola assim que o mestre pede e ele já narra o resultado. Mais rápido." },
];

/** Resumo de uma linha do estilo da mesa (no "Mais opções da mesa" fechado e no resumo final). */
export function resumoEstilo(e: Escolhas): string {
  const focos = [...e.foco.map((f) => FOCOS.find((x) => x.id === f)?.nome ?? f), e.focoLivre.trim()].filter(Boolean);
  return [
    `dificuldade ${DIFICULDADES.find((d) => d.id === e.dificuldade)?.nome.toLowerCase()}`,
    `narração ${TAMANHOS.find((t) => t.id === e.narracao)?.nome.toLowerCase()}`,
    e.dados === "automatico" ? "o mestre rola" : "você rola",
    e.sugestoes ? "com ações sugeridas" : "sem ações sugeridas",
    focos.length ? `foco: ${focos.join(", ").toLowerCase()}` : "",
    e.instrucoes.trim() ? "com regras da casa" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Escolher uma aventura pronta: preenche nome, cenário e tom da campanha (tudo continua editável). */
export function comAventura(a: AventuraPublica | undefined): Partial<Escolhas> {
  return a ? { aventura: a.id, campanha: a.titulo, cenario: a.cenario, tom: a.tom } : {};
}

/** Desmarcar a aventura: limpa só o que ainda é dela (o que a pessoa reescreveu fica). */
export function semAventura(e: Escolhas, a: AventuraPublica | undefined): Partial<Escolhas> {
  if (!a) return { aventura: "" };
  return {
    aventura: "",
    ...(e.campanha === a.titulo ? { campanha: "" } : {}),
    ...(e.cenario === a.cenario ? { cenario: "" } : {}),
    ...(e.tom === a.tom ? { tom: "" } : {}),
  };
}

/** Cartões das aventuras prontas do sistema, no topo do passo da campanha. */
function BlocoAventuras({ e, atualizar, aventuras }: Omit<PropsPasso, "sistema"> & { aventuras: AventuraPublica[] }) {
  const escolhida = aventuras.find((a) => a.id === e.aventura);
  const alternar = (a: AventuraPublica) => atualizar(a.id === e.aventura ? semAventura(e, a) : comAventura(a));
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-pergaminho">📜 Ou comece com uma aventura pronta</legend>
      <p className="mb-2 text-xs text-muted">
        Missão escrita para este sistema: o mestre recebe um roteiro secreto (NPCs, pistas, reviravoltas) e improvisa em cima. Você não lê o roteiro, claro.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {aventuras.map((a) => (
          <Cartao key={a.id} ativo={a.id === e.aventura} onClick={() => alternar(a)} titulo={a.id === e.aventura ? "Clique de novo para desmarcar" : undefined}>
            <p className="pr-6 font-semibold leading-tight text-pergaminho">{a.titulo}</p>
            <p className="mt-1 text-xs leading-snug text-foreground/85">{a.chamada}</p>
            <p className="mt-auto pt-2 text-[11px] text-muted">
              {[a.duracao, a.recomendado, a.tom].filter(Boolean).join(" · ")}
            </p>
          </Cartao>
        ))}
      </div>
      {escolhida && (
        <p role="status" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-musgo/50 bg-musgo/10 px-3 py-2 text-xs">
          <span>
            ✓ <span className="font-semibold">{escolhida.titulo}</span> marcada. Nome, cenário e tom abaixo vieram dela e dá para mexer à vontade.
          </span>
          <button type="button" onClick={() => atualizar(semAventura(e, escolhida))} className="-my-1 rounded px-2 py-1 text-ambar hover:bg-ambar/10 hover:underline">
            Desmarcar
          </button>
        </p>
      )}
    </fieldset>
  );
}

export function PassoCampanha({ e, atualizar, aventuras = [] }: Omit<PropsPasso, "sistema"> & { aventuras?: AventuraPublica[] }) {
  const s = sementesDe(e.sistemaId);
  const [inicio, setInicio] = useState(0);
  const cenarios = janela(s.cenarios, inicio, 6);
  const alternarFoco = (id: string) => atualizar({ foco: e.foco.includes(id) ? e.foco.filter((f) => f !== id) : [...e.foco, id] });
  return (
    <>
      <Titulo ajuda="Onde a história começa e como a mesa funciona. Tudo isso pode ser só um rascunho: o mestre improvisa.">A campanha</Titulo>
      <div className="space-y-5">
        {aventuras.length > 0 && <BlocoAventuras e={e} atualizar={atualizar} aventuras={aventuras} />}

        <div>
          <label htmlFor="nome-campanha" className="mb-1 block text-sm text-muted">
            Nome da campanha
          </label>
          <div className="flex gap-2">
            <input
              id="nome-campanha"
              value={e.campanha}
              onChange={(ev) => atualizar({ campanha: ev.target.value })}
              maxLength={80}
              className="campo"
              placeholder={e.nome ? `A saga de ${e.nome.trim()}` : "A saga de alguém"}
            />
            <BotaoDado rotulo="Sortear um nome de campanha" onClick={() => atualizar({ campanha: sortearOutro(s.campanhas, e.campanha) })} />
          </div>
        </div>

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
            placeholder={s.exemploCenario}
          />
          <div className="mb-1.5 mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
            <span>Sem ideia? Clique numa:</span>
            {s.cenarios.length > 6 && (
              <button type="button" onClick={() => setInicio((i) => i + 6)} className="-my-2 py-2 text-ambar hover:underline">
                ↻ outras ideias
              </button>
            )}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {cenarios.map((c) => (
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
          <input id="tom" value={e.tom} onChange={(ev) => atualizar({ tom: ev.target.value })} maxLength={60} className="campo" placeholder={s.tons[0]} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.tons.map((t) => (
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

        {/* estilo do mestre e o resto dos ajustes: fechado, com o resumo à vista; tudo muda depois em Ajustes da mesa */}
        <details className="group/mais rounded-lg border border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-pergaminho">Mais opções da mesa</span>
              <span className="block text-xs text-muted">{resumoEstilo(e)}</span>
            </span>
            <span className="text-muted transition-transform group-open/mais:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>
          <div className="space-y-5 border-t border-border px-3 pb-4 pt-3">
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted">Dificuldade</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {DIFICULDADES.map((d) => (
                  <Cartao key={d.id} ativo={e.dificuldade === d.id} onClick={() => atualizar({ dificuldade: d.id })}>
                    <p className="pr-6 font-semibold text-pergaminho">{d.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">{d.texto}</p>
                  </Cartao>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted">Tamanho da narração</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {TAMANHOS.map((t) => (
                  <Cartao key={t.id} ativo={e.narracao === t.id} onClick={() => atualizar({ narracao: t.id })}>
                    <p className="pr-6 font-semibold text-pergaminho">{t.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">{t.texto}</p>
                  </Cartao>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted">Foco (opcional): o que o mestre deve privilegiar</legend>
              <div className="flex flex-wrap gap-1.5">
                {FOCOS.map((f) => (
                  <Chip key={f.id} ativo={e.foco.includes(f.id)} onClick={() => alternarFoco(f.id)}>
                    {e.foco.includes(f.id) && "✓ "}
                    {f.nome}
                  </Chip>
                ))}
              </div>
              <input
                value={e.focoLivre}
                onChange={(ev) => atualizar({ focoLivre: ev.target.value })}
                maxLength={MAX_FOCO_LIVRE}
                aria-label="Outro foco, em poucas palavras"
                placeholder={e.sistemaId === "vtm5" ? "Outro, em poucas palavras (ex.: política da Camarilla)" : "Outro, em poucas palavras (ex.: política de guildas)"}
                className="campo mt-2"
              />
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Regras da casa</span>
              <textarea
                value={e.instrucoes}
                onChange={(ev) => atualizar({ instrucoes: ev.target.value })}
                maxLength={MAX_INSTRUCOES}
                rows={3}
                className="campo resize-y"
                placeholder="“sem aranhas”, “NPCs falam com sotaque nordestino”, “regra da casa: críticos explodem”"
              />
              <span className="mt-1 flex justify-between gap-2 text-xs text-muted">
                <span>O mestre segue isto acima das regras gerais (menos as de segurança).</span>
                <span aria-live="polite">
                  {e.instrucoes.length}/{MAX_INSTRUCOES}
                </span>
              </span>
            </label>
            <fieldset>
              <legend className="mb-1.5 text-sm text-muted">Quem rola os testes</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {DADOS.map((d) => (
                  <Cartao key={d.id} ativo={e.dados === d.id} onClick={() => atualizar({ dados: d.id })}>
                    <p className="pr-6 font-semibold text-pergaminho">{d.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">{d.texto}</p>
                  </Cartao>
                ))}
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-ambar/50">
              <input type="checkbox" checked={e.sugestoes} onChange={(ev) => atualizar({ sugestoes: ev.target.checked })} className="mt-1 h-4 w-4 accent-[var(--ambar)]" />
              <span className="text-sm">
                Ações sugeridas
                <span className="block text-xs text-muted">A cada turno o mestre oferece 3 opções clicáveis. Dá para escrever a própria ação do mesmo jeito.</span>
              </span>
            </label>
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
          </div>
        </details>

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
