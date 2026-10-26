"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import type { EstadoHistoria } from "@/app/nova/historia-acoes";
import { apelido as apelidoSalvo } from "@/lib/cliente/identidade";
import type { SistemaPublico } from "@/lib/sistemas/tipos";
import { Musica } from "../musica";
import { gerarRetrato, type DadosRetrato } from "../retrato/dados";
import { RetratoSVG } from "../retrato/desenho";
import { CSS_CRIACAO } from "./estilos";
import { gotica } from "./fonte";
import { sortearGanchos } from "./ganchos";
import { sortearNomes } from "./nomes";

// Criação do modo história em quatro passos, no estilo "senta aí e conta quem você é": nome, aparência, ofício e passado.
// Sem número nenhum na tela; as regras ficam escondidas no sistema "historia". O rascunho vive no localStorage.

type Sexo = "homem" | "mulher" | "outro";

type Rascunho = {
  passo: number;
  nome: string;
  rodadaNomes: number;
  sexo: Sexo | "";
  origem: string;
  rodadaRostos: number;
  /** semente do rosto escolhido na grade */
  rosto: string;
  aparencia: string;
  classe: string;
  historia: string;
  rodadaGanchos: number;
  campanha: string;
};

const INICIAL: Rascunho = {
  passo: 0,
  nome: "",
  rodadaNomes: 0,
  sexo: "",
  origem: "",
  rodadaRostos: 0,
  rosto: "",
  aparencia: "",
  classe: "",
  historia: "",
  rodadaGanchos: 0,
  campanha: "",
};

const CHAVE = "taverna:rascunho-historia";
const ROSTOS_POR_RODADA = 8;

const SEXOS: { id: Sexo; nome: string }[] = [
  { id: "homem", nome: "Homem" },
  { id: "mulher", nome: "Mulher" },
  { id: "outro", nome: "Outro" },
];

const TITULOS = ["Como você se chama?", "Como você é?", "Qual é o seu ofício?", "De onde você vem?"];
const SUBTITULOS = [
  "O nome que os bardos vão errar nas canções.",
  "Escolha um rosto. Reclamações ao espelho.",
  "O que você faz quando a conversa acaba.",
  "Todo mundo chega na taverna fugindo de alguma coisa.",
];

// ---------- rascunho no localStorage ----------

function assinarNada() {
  return () => {};
}

function lerRascunhoBruto(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function gravarRascunho(r: Rascunho | null) {
  try {
    if (r) localStorage.setItem(CHAVE, JSON.stringify(r));
    else localStorage.removeItem(CHAVE);
  } catch {
    // modo privado: o rascunho fica só na memória, como as promessas de taverneiro
  }
}

function lerRascunho(bruto: string | null): Rascunho | null {
  if (!bruto) return null;
  try {
    const o = JSON.parse(bruto) as Partial<Rascunho>;
    if (!o || typeof o !== "object") return null;
    const r = { ...INICIAL, ...o };
    r.passo = Math.max(0, Math.min(3, Number(r.passo) || 0));
    return r;
  } catch {
    return null;
  }
}

// ---------- pecinhas ----------

function Opcao({ ativo, onClick, children, className = "" }: { ativo: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-lg border px-3 py-2.5 text-sm transition ${
        ativo ? "border-ambar bg-ambar/15 text-pergaminho shadow-[0_0_18px_-8px_var(--ambar)]" : "border-border bg-surface-2/60 text-foreground hover:border-ambar/60"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Rotulo({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{children}</p>;
}

// ---------- componente ----------

export type PropsCriacao = {
  sistema: SistemaPublico;
  /** semente vinda do servidor: nomes e rostos sugeridos mudam a cada visita sem quebrar a hidratação */
  semente: string;
  /** server action que cria campanha + personagem (src/app/nova/historia-acoes.ts) */
  acao: (estado: EstadoHistoria, form: FormData) => Promise<EstadoHistoria>;
};

export function CriacaoHistoria({ sistema, semente, acao }: PropsCriacao) {
  const salvo = useSyncExternalStore(assinarNada, lerRascunhoBruto, () => null);
  const doSalvo = useMemo(() => lerRascunho(salvo), [salvo]);
  const [editado, setEditado] = useState<Rascunho | null>(null);
  const r = editado ?? doSalvo ?? INICIAL;
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, enviar, enviando] = useActionState<EstadoHistoria, FormData>(acao, { erro: null });

  function mudar(p: Partial<Rascunho>) {
    const novo = { ...r, ...p };
    setEditado(novo);
    gravarRascunho(novo);
    setAviso(null);
  }

  const sugestoes = useMemo(() => sortearNomes(`${semente}|${r.rodadaNomes}`), [semente, r.rodadaNomes]);
  const sementesRostos = useMemo(
    () => Array.from({ length: ROSTOS_POR_RODADA }, (_, i) => `${semente}:${r.rodadaRostos}:${i}`),
    [semente, r.rodadaRostos],
  );
  const rostosGrade = useMemo(
    () => (r.sexo && r.origem ? sementesRostos.map((s) => ({ semente: s, dados: gerarRetrato(s, { sexo: r.sexo, origem: r.origem }) })) : []),
    [sementesRostos, r.sexo, r.origem],
  );
  const retrato: DadosRetrato | null = useMemo(
    () => (r.rosto && r.sexo && r.origem ? gerarRetrato(r.rosto, { sexo: r.sexo, origem: r.origem, classe: r.classe || undefined }) : null),
    [r.rosto, r.sexo, r.origem, r.classe],
  );
  const ganchos = useMemo(
    () => (r.classe ? sortearGanchos(r.classe, r.sexo, `${semente}|${r.rodadaGanchos}`) : []),
    [r.classe, r.sexo, semente, r.rodadaGanchos],
  );

  const classe = sistema.classes.find((c) => c.id === r.classe);
  const origem = sistema.ancestralidades.find((a) => a.id === r.origem);

  function problemaDoPasso(passo: number): string | null {
    if (passo === 0 && r.nome.trim().length < 2) return "Todo herói tem nome. Até os que morrem na primeira cena.";
    if (passo === 1) {
      if (!r.sexo) return "Diga como você é.";
      if (!r.origem) return "Escolha uma origem. Ninguém nasce do nada (quase ninguém).";
      if (!r.rosto) return "Escolha um rosto. Prometo que nenhum deles é pior que o seu de verdade.";
    }
    if (passo === 2 && !r.classe) return "Escolha um ofício. Desocupado a taverna já tem demais.";
    return null;
  }

  function avancar() {
    const p = problemaDoPasso(r.passo);
    if (p) {
      setAviso(p);
      return;
    }
    mudar({ passo: Math.min(3, r.passo + 1) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltar() {
    mudar({ passo: Math.max(0, r.passo - 1) });
  }

  function enterAvanca(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      avancar();
    }
  }

  function usarGancho(g: string) {
    const atual = r.historia.trim();
    mudar({ historia: atual ? `${atual}\n${g}` : g });
  }

  function aoEnviar(form: FormData) {
    for (let p = 0; p < 3; p++) {
      const problema = problemaDoPasso(p);
      if (problema) {
        mudar({ passo: p });
        setAviso(problema);
        return;
      }
    }
    form.set("jogador", apelidoSalvo());
    // o rascunho só sai do armazenamento quando a mesa vai ser criada; se der erro, ele volta na próxima edição
    gravarRascunho(null);
    enviar(form);
  }

  const progresso = ((r.passo + 1) / 4) * 100;
  const historiaFinal = r.historia.trim() || ganchos[0] || "";

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <style href="taverna-criacao-historia" precedence="default">
        {CSS_CRIACAO}
      </style>
      <div className="criacao-ceu" aria-hidden>
        <div className="criacao-estrelas" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:pt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">
            Passo {r.passo + 1} de 4
          </p>
          <Musica musica={{ humor: "taverna", energia: "baixa" }} />
        </div>

        <form action={aoEnviar} className="cartao relative overflow-hidden border-ambar/25 bg-surface/85 backdrop-blur-sm">
          <div className="h-1 w-full bg-surface-2">
            <div className="criacao-progresso h-full bg-ambar" style={{ width: `${progresso}%` }} />
          </div>

          <div key={r.passo} className="criacao-passo px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
            <h1 className={`${gotica.className} text-center text-[2.1rem] leading-tight text-pergaminho drop-shadow-[0_2px_10px_rgba(224,162,74,0.25)] sm:text-5xl`}>
              {TITULOS[r.passo]}
            </h1>
            <p className="mt-2 text-center text-sm italic text-muted">{SUBTITULOS[r.passo]}</p>

            {/* ---------- passo 1: nome ---------- */}
            {r.passo === 0 && (
              <div className="mt-7 space-y-6">
                <input
                  className="campo text-center text-lg"
                  value={r.nome}
                  onChange={(e) => mudar({ nome: e.target.value.slice(0, 40) })}
                  onKeyDown={enterAvanca}
                  placeholder="Seu nome, aventureiro"
                  aria-label="Nome do personagem"
                  autoComplete="off"
                  autoFocus
                />
                <div>
                  <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                    <span className="h-px flex-1 bg-border" />
                    ou escolha um
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sugestoes.map((n) => (
                      <Opcao key={n} ativo={r.nome === n} onClick={() => mudar({ nome: n })} className="truncate">
                        {n}
                      </Opcao>
                    ))}
                  </div>
                  <button type="button" onClick={() => mudar({ rodadaNomes: r.rodadaNomes + 1 })} className="mx-auto mt-3 block text-sm text-ambar hover:underline">
                    ↻ Sortear outros
                  </button>
                </div>
              </div>
            )}

            {/* ---------- passo 2: aparência ---------- */}
            {r.passo === 1 && (
              <div className="mt-7 space-y-6">
                <div>
                  <Rotulo>Você é</Rotulo>
                  <div className="grid grid-cols-3 gap-2">
                    {SEXOS.map((s) => (
                      <Opcao key={s.id} ativo={r.sexo === s.id} onClick={() => mudar({ sexo: s.id })}>
                        {s.nome}
                      </Opcao>
                    ))}
                  </div>
                </div>
                <div>
                  <Rotulo>Origem</Rotulo>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sistema.ancestralidades.map((a) => (
                      <Opcao key={a.id} ativo={r.origem === a.id} onClick={() => mudar({ origem: a.id })}>
                        {a.nome}
                      </Opcao>
                    ))}
                  </div>
                  {origem && <p className="mt-2 text-sm italic text-muted">{origem.descricao}</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <Rotulo>Rosto</Rotulo>
                    {rostosGrade.length > 0 && (
                      <button type="button" onClick={() => mudar({ rodadaRostos: r.rodadaRostos + 1, rosto: "" })} className="text-sm text-ambar hover:underline">
                        ↻ Outros rostos
                      </button>
                    )}
                  </div>
                  {rostosGrade.length ? (
                    <div className="grid grid-cols-4 gap-2">
                      {rostosGrade.map((f) => (
                        <button
                          key={f.semente}
                          type="button"
                          onClick={() => mudar({ rosto: f.semente })}
                          aria-pressed={r.rosto === f.semente}
                          aria-label="Escolher este rosto"
                          className={`relative rounded-[14px] p-[3px] transition ${r.rosto === f.semente ? "scale-105 bg-ambar shadow-[0_0_22px_-2px_var(--ambar)]" : "bg-transparent opacity-75 hover:opacity-100"}`}
                        >
                          <RetratoSVG dados={f.dados} className="block h-auto w-full" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
                      Diga quem você é e de onde vem; o pintor não trabalha no escuro.
                    </p>
                  )}
                </div>
                <div>
                  <Rotulo>Algum detalhe? (opcional)</Rotulo>
                  <input
                    className="campo"
                    value={r.aparencia}
                    onChange={(e) => mudar({ aparencia: e.target.value.slice(0, 200) })}
                    onKeyDown={enterAvanca}
                    placeholder="cicatriz no queixo, olhar de quem deve dinheiro"
                    aria-label="Detalhe de aparência"
                  />
                </div>
              </div>
            )}

            {/* ---------- passo 3: ofício ---------- */}
            {r.passo === 2 && (
              <div className="mt-6 space-y-4">
                {retrato && (
                  <div className="flex items-center justify-center gap-4">
                    <RetratoSVG dados={retrato} tamanho={104} titulo={`Retrato de ${r.nome}`} />
                    <div className="min-w-0">
                      <p className={`${gotica.className} truncate text-3xl text-pergaminho`}>{r.nome}</p>
                      <p className="text-sm text-muted">
                        {origem?.nome ?? ""}
                        {classe ? ` · ${classe.nome}` : " · sem ofício (ainda)"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {sistema.classes.map((c) => {
                    const ativo = r.classe === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => mudar({ classe: c.id })}
                        aria-pressed={ativo}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          ativo ? "border-ambar bg-ambar/12 shadow-[0_0_22px_-10px_var(--ambar)]" : "border-border bg-surface-2/60 hover:border-ambar/60"
                        }`}
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-background/60 text-2xl" aria-hidden>
                          {c.icone ?? "⚔️"}
                        </span>
                        <span className="min-w-0">
                          <span className={`block font-semibold ${ativo ? "text-ambar" : "text-pergaminho"}`}>{c.nome}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-muted">{c.descricao}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------- passo 4: passado ---------- */}
            {r.passo === 3 && (
              <div className="mt-6 space-y-5">
                {retrato && (
                  <div className="flex items-center justify-center gap-4">
                    <RetratoSVG dados={retrato} tamanho={88} titulo={`Retrato de ${r.nome}`} />
                    <div className="min-w-0">
                      <p className={`${gotica.className} truncate text-3xl text-pergaminho`}>{r.nome}</p>
                      <p className="text-sm text-muted">
                        {origem?.nome} · {classe?.nome}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <Rotulo>Sua história, em poucas linhas</Rotulo>
                  <textarea
                    className="campo min-h-28 resize-y leading-relaxed"
                    value={r.historia}
                    onChange={(e) => mudar({ historia: e.target.value.slice(0, 1500) })}
                    placeholder="De onde veio, o que deixou para trás, quem quer sua cabeça…"
                    aria-label="História do personagem"
                  />
                </div>
                {ganchos.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <Rotulo>Ou pegue um gancho</Rotulo>
                      <button type="button" onClick={() => mudar({ rodadaGanchos: r.rodadaGanchos + 1 })} className="text-sm text-ambar hover:underline">
                        ↻ Outros
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ganchos.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => usarGancho(g)}
                          className="block w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2.5 text-left text-sm italic text-foreground transition hover:border-ambar/60 hover:text-pergaminho"
                        >
                          “{g}”
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Rotulo>Nome da campanha (opcional)</Rotulo>
                  <input
                    className="campo"
                    value={r.campanha}
                    onChange={(e) => mudar({ campanha: e.target.value.slice(0, 80) })}
                    placeholder={`A saga de ${r.nome.trim() || "alguém"}`}
                    aria-label="Nome da campanha"
                  />
                </div>
              </div>
            )}

            {(aviso || estado.erro) && (
              <p role="alert" className="mt-5 rounded-md border border-sangue/50 bg-sangue/10 px-3 py-2 text-sm text-pergaminho">
                {aviso ?? estado.erro}
              </p>
            )}

            <div className="mt-7 flex items-center gap-3">
              {r.passo > 0 && (
                <button type="button" onClick={voltar} className="btn-borda px-4" disabled={enviando}>
                  ← Voltar
                </button>
              )}
              {r.passo < 3 ? (
                <button type="button" onClick={avancar} className="btn-ambar flex-1 py-3 text-base">
                  Continuar →
                </button>
              ) : (
                <button type="submit" className="btn-ambar flex-1 py-3 text-base" disabled={enviando}>
                  {enviando ? "Acendendo as velas…" : "Começar a aventura"}
                </button>
              )}
            </div>
          </div>

          <input type="hidden" name="nome" value={r.nome.trim()} />
          <input type="hidden" name="sexo" value={r.sexo} />
          <input type="hidden" name="origem" value={r.origem} />
          <input type="hidden" name="classe" value={r.classe} />
          <input type="hidden" name="aparencia" value={r.aparencia.trim()} />
          <input type="hidden" name="historia" value={historiaFinal} />
          <input type="hidden" name="campanha" value={r.campanha.trim()} />
          <input type="hidden" name="retrato" value={retrato ? JSON.stringify(retrato) : ""} />
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Prefere escolher as regras?{" "}
          <Link href="/nova/avancada" className="text-ambar/90 underline-offset-4 hover:underline">
            Modo avançado
          </Link>
        </p>
      </main>
    </div>
  );
}
