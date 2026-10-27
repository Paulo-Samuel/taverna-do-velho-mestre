"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import type { EstadoHistoria } from "@/app/nova/historia-acoes";
import type { AventuraPublica } from "@/lib/aventuras/tipos";
import { apelido as apelidoSalvo } from "@/lib/cliente/identidade";
import { DIFICULDADES, dificuldadeDe, TAMANHOS, tamanhoDe, type Dificuldade, type TamanhoNarracao } from "@/lib/mestre/estilo";
import type { SistemaPublico } from "@/lib/sistemas/tipos";
import { Musica } from "../musica";
import { gerarRetrato, type DadosRetrato } from "../retrato/dados";
import { RetratoSVG } from "../retrato/desenho";
import { COMECOS, comecoDe, TONS, tomDe } from "./comecos";
import { CSS_CRIACAO } from "./estilos";
import { gotica } from "./fonte";
import { sortearGanchos } from "./ganchos";
import { sortearNomes } from "./nomes";

// Criação do modo história em cinco passos, no estilo "senta aí e conta quem você é": nome, aparência, ofício, passado e
// onde a história começa (com tom e estilo do mestre). Sem número nenhum na tela; as regras ficam escondidas no sistema
// "historia". O rascunho vive no localStorage e, ao voltar, a taverna pergunta se é para continuar.

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
  /** ids de COMECOS e TONS (comecos.ts); tom "aventura" = o tom que veio com a aventura pronta */
  comeco: string;
  tom: string;
  /** id da aventura pronta (vazio = vale o começo escolhido) */
  aventura: string;
  dificuldade: Dificuldade;
  narracao: TamanhoNarracao;
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
  comeco: "taverna",
  tom: "sombrio",
  aventura: "",
  dificuldade: "justa",
  narracao: "media",
};

const CHAVE = "taverna:rascunho-historia";
const ROSTOS_POR_RODADA = 8;

const SEXOS: { id: Sexo; nome: string }[] = [
  { id: "homem", nome: "Homem" },
  { id: "mulher", nome: "Mulher" },
  { id: "outro", nome: "Outro" },
];

const PASSOS = ["Nome", "Rosto", "Ofício", "Passado", "Começo"];
const ULTIMO = PASSOS.length - 1;
const TITULOS = ["Como você se chama?", "Como você é?", "Qual é o seu ofício?", "De onde você vem?", "Onde tudo começa?"];
const SUBTITULOS = [
  "O nome que os bardos vão errar nas canções.",
  "Escolha um rosto. Reclamações ao espelho.",
  "O que você faz quando a conversa acaba.",
  "Todo mundo chega na taverna fugindo de alguma coisa.",
  "O Velho Mestre serve a primeira cena. Você escolhe a mesa.",
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
    r.passo = Math.max(0, Math.min(ULTIMO, Number(r.passo) || 0));
    // rascunhos de antes do passo "Começo" (ou mexidos à mão) caem nos padrões
    r.comeco = comecoDe(r.comeco).id;
    r.aventura = typeof r.aventura === "string" ? r.aventura : "";
    r.tom = r.tom === "aventura" && r.aventura ? "aventura" : tomDe(r.tom).id;
    r.dificuldade = dificuldadeDe(r.dificuldade);
    r.narracao = tamanhoDe(r.narracao);
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

/** vale a pena perguntar se continua: já tem nome ou passou do primeiro passo */
const temProgresso = (r: Rascunho) => r.nome.trim().length > 0 || r.passo > 0;

function retratoDo(r: Rascunho): DadosRetrato | null {
  return r.rosto && r.sexo && r.origem ? gerarRetrato(r.rosto, { sexo: r.sexo, origem: r.origem, classe: r.classe || undefined }) : null;
}

/** Mini cartão do herói: o resumo antes de começar e o "continuar de onde parou". */
function CartaoHeroi({ retrato, nome, linhas }: { retrato: DadosRetrato | null; nome: string; linhas: ReactNode[] }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-ambar/35 bg-background/50 p-3 shadow-[inset_0_0_30px_-18px_var(--ambar)] sm:p-4">
      {retrato ? (
        <RetratoSVG dados={retrato} tamanho={84} titulo={`Retrato de ${nome}`} className="shrink-0" />
      ) : (
        <span className="grid size-[84px] shrink-0 place-items-center rounded-xl border border-dashed border-border text-3xl text-muted" aria-hidden>
          ?
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`${gotica.className} truncate text-[1.7rem] leading-tight text-pergaminho`}>{nome || "Sem nome (ainda)"}</p>
        {linhas.filter(Boolean).map((l, i) => (
          <p key={i} className={`text-sm leading-snug ${i === 0 ? "text-foreground/90" : "mt-0.5 text-muted"}`}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Quem volta com um herói pela metade: continuar ou começar do zero (o rascunho só some com o segundo botão). */
function Oferta({
  rascunho,
  origem,
  classe,
  onContinuar,
  onZerar,
}: {
  rascunho: Rascunho;
  origem?: string;
  classe?: string;
  onContinuar: () => void;
  onZerar: () => void;
}) {
  const retrato = useMemo(() => retratoDo(rascunho), [rascunho]);
  return (
    <section className="cartao surgir relative overflow-clip border-ambar/25 bg-surface/85 px-5 py-7 backdrop-blur-sm sm:px-8">
      <h1 className={`${gotica.className} text-center text-[2.1rem] leading-tight text-pergaminho sm:text-5xl`}>De volta, é?</h1>
      <p className="mt-2 text-center text-sm italic text-muted">Alguém ficou esperando no balcão. E ainda não pagou a conta.</p>
      <div className="mt-6">
        <CartaoHeroi
          retrato={retrato}
          nome={rascunho.nome.trim()}
          linhas={[
            [origem, classe].filter(Boolean).join(" · ") || "Ainda sem origem nem ofício",
            `Parou no passo ${rascunho.passo + 1} de ${PASSOS.length}: ${PASSOS[rascunho.passo]}`,
          ]}
        />
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" onClick={onContinuar} className="btn-ambar min-h-12 flex-1 py-3 text-base" autoFocus>
          Continuar de onde parei
        </button>
        <button type="button" onClick={onZerar} className="btn-borda min-h-12 px-4">
          Começar do zero
        </button>
      </div>
    </section>
  );
}

// ---------- componente ----------

export type PropsCriacao = {
  sistema: SistemaPublico;
  /** semente vinda do servidor: nomes e rostos sugeridos mudam a cada visita sem quebrar a hidratação */
  semente: string;
  /** server action que cria campanha + personagem (src/app/nova/historia-acoes.ts) */
  acao: (estado: EstadoHistoria, form: FormData) => Promise<EstadoHistoria>;
  /** aventuras prontas do modo história (só a parte pública; o roteiro fica no servidor) */
  aventuras?: AventuraPublica[];
  /** aventura já marcada ao abrir (link do início: /nova?aventura=<id>) */
  aventuraInicial?: string;
};

export function CriacaoHistoria({ sistema, semente, acao, aventuras = [], aventuraInicial }: PropsCriacao) {
  const salvo = useSyncExternalStore(assinarNada, lerRascunhoBruto, () => null);
  const doSalvo = useMemo(() => lerRascunho(salvo), [salvo]);
  const [editado, setEditado] = useState<Rascunho | null>(null);
  // rascunho com algum progresso: antes de tudo, a taverna pergunta se é para continuar (nada é carregado sem pedir)
  const pendente = !editado && doSalvo && temProgresso(doSalvo) ? doSalvo : null;
  // veio do início com uma aventura: ela já começa marcada (e o tom é o dela)
  const base = useMemo<Rascunho>(() => (aventuraInicial ? { ...INICIAL, aventura: aventuraInicial, tom: "aventura" } : INICIAL), [aventuraInicial]);
  const r = editado ?? base;
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, enviar, enviando] = useActionState<EstadoHistoria, FormData>(acao, { erro: null });

  // a ação falhou: o rascunho (tirado do armazenamento no envio) volta, para sobreviver a um recarregar da página
  useEffect(() => {
    if (estado.erro && editado) gravarRascunho(editado);
  }, [estado, editado]);

  function mudar(p: Partial<Rascunho>) {
    const novo = { ...r, ...p };
    setEditado(novo);
    gravarRascunho(novo);
    setAviso(null);
  }

  const sugestoes = useMemo(() => sortearNomes(`${semente}|${r.rodadaNomes}`, r.sexo), [semente, r.rodadaNomes, r.sexo]);
  const sementesRostos = useMemo(
    () => Array.from({ length: ROSTOS_POR_RODADA }, (_, i) => `${semente}:${r.rodadaRostos}:${i}`),
    [semente, r.rodadaRostos],
  );
  const rostosGrade = useMemo(
    () => (r.sexo && r.origem ? sementesRostos.map((s) => ({ semente: s, dados: gerarRetrato(s, { sexo: r.sexo, origem: r.origem }) })) : []),
    [sementesRostos, r.sexo, r.origem],
  );
  const retrato: DadosRetrato | null = useMemo(
    () => retratoDo({ ...INICIAL, rosto: r.rosto, sexo: r.sexo, origem: r.origem, classe: r.classe }),
    [r.rosto, r.sexo, r.origem, r.classe],
  );
  const ganchos = useMemo(
    () => (r.classe ? sortearGanchos(r.classe, r.sexo, `${semente}|${r.rodadaGanchos}`) : []),
    [r.classe, r.sexo, semente, r.rodadaGanchos],
  );

  const classe = sistema.classes.find((c) => c.id === r.classe);
  const origem = sistema.ancestralidades.find((a) => a.id === r.origem);
  const comeco = comecoDe(r.comeco);
  const tom = tomDe(r.tom);
  const aventura = aventuras.find((a) => a.id === r.aventura);
  const tomDaAventura = Boolean(aventura) && r.tom === "aventura";
  const tomNome = tomDaAventura ? "Tom da aventura" : tom.nome;
  const dificuldade = DIFICULDADES.find((d) => d.id === r.dificuldade) ?? DIFICULDADES[1];
  const narracao = TAMANHOS.find((t) => t.id === r.narracao) ?? TAMANHOS[1];

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

  /** o passo mais adiantado que dá para abrir: o primeiro com pendência (ou o último, se está tudo certo) */
  const alcancavel = [0, 1, 2].find((p) => problemaDoPasso(p)) ?? ULTIMO;

  function irPara(passo: number) {
    mudar({ passo: Math.max(0, Math.min(ULTIMO, passo)) });
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduzido ? "auto" : "smooth" });
  }

  function avancar() {
    const p = problemaDoPasso(r.passo);
    if (p) {
      setAviso(p);
      return;
    }
    irPara(r.passo + 1);
  }

  function voltar() {
    irPara(r.passo - 1);
  }

  function enterAvanca(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      avancar();
    }
  }

  const linhasHistoria = r.historia.split("\n").map((l) => l.trim());

  // clicar de novo no gancho tira ele da história
  function usarGancho(g: string) {
    if (linhasHistoria.includes(g)) {
      mudar({ historia: r.historia.split("\n").filter((l) => l.trim() !== g).join("\n").trim() });
      return;
    }
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
    // o rascunho sai do armazenamento quando a mesa vai ser criada; se a ação devolver erro, o efeito lá em cima o regrava
    gravarRascunho(null);
    enviar(form);
  }

  function continuarRascunho() {
    if (pendente) setEditado(aventuraInicial ? { ...pendente, aventura: aventuraInicial, tom: "aventura" } : pendente);
  }

  function comecarDoZero() {
    gravarRascunho(null);
    setEditado({ ...base });
  }

  /** Marcar (ou desmarcar, clicando de novo) uma aventura pronta: o nome da campanha acompanha se ninguém mexeu nele. */
  function alternarAventura(a: AventuraPublica) {
    const nomeLivre = !r.campanha.trim() || r.campanha === aventura?.titulo;
    if (a.id === r.aventura) mudar({ aventura: "", tom: r.tom === "aventura" ? "sombrio" : r.tom, campanha: nomeLivre ? "" : r.campanha });
    else mudar({ aventura: a.id, tom: "aventura", campanha: nomeLivre ? a.titulo : r.campanha });
  }

  function escolherComeco(id: string) {
    if (!aventura) return mudar({ comeco: id });
    mudar({ comeco: id, aventura: "", tom: r.tom === "aventura" ? "sombrio" : r.tom, campanha: r.campanha === aventura.titulo ? "" : r.campanha });
  }

  const progresso = ((r.passo + 1) / PASSOS.length) * 100;
  const historiaFinal = r.historia.trim() || ganchos[0] || "";

  return (
    // overflow-clip (e não hidden) para a barra de botões poder grudar no pé da tela
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-clip">
      <style href="taverna-criacao-historia" precedence="default">
        {CSS_CRIACAO}
      </style>
      <div className="criacao-ceu" aria-hidden>
        <div className="criacao-estrelas" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:pt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* os cinco passos: os já liberados dão para clicar (voltar ao nome sem apertar Voltar quatro vezes); no celular só o
              atual mostra o nome, os outros ficam no número */}
          {pendente ? (
            <span className="flex-1" />
          ) : (
          <nav aria-label="Passos da criação" className="min-w-0 flex-1">
            <p className="sr-only">
              Passo {r.passo + 1} de {PASSOS.length}: {PASSOS[r.passo]}
            </p>
            <ol className="flex items-center gap-0.5 sm:gap-1">
              {PASSOS.map((nome, i) => {
                const atual = i === r.passo;
                const feito = !atual && (i < 3 ? !problemaDoPasso(i) : i < r.passo);
                return (
                  <li key={nome} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => irPara(i)}
                      disabled={i > alcancavel || enviando}
                      aria-current={atual ? "step" : undefined}
                      className={`flex min-h-10 items-center gap-1.5 rounded-full px-1.5 text-xs transition sm:px-2 ${
                        atual ? "text-pergaminho" : feito ? "text-ambar/90 hover:text-ambar" : "text-muted hover:text-foreground"
                      } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-muted`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums ${
                          atual ? "border-ambar bg-ambar text-[#1a120c]" : feito ? "border-ambar/70 text-ambar" : "border-border"
                        }`}
                        aria-hidden
                      >
                        {feito ? "✓" : i + 1}
                      </span>
                      <span className={`truncate ${atual ? "font-semibold" : "sr-only sm:not-sr-only"}`}>{nome}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          )}
          <Musica musica={{ humor: "taverna", energia: "baixa" }} />
        </div>

        {pendente ? (
          <Oferta
            rascunho={pendente}
            origem={sistema.ancestralidades.find((a) => a.id === pendente.origem)?.nome}
            classe={sistema.classes.find((c) => c.id === pendente.classe)?.nome}
            onContinuar={continuarRascunho}
            onZerar={comecarDoZero}
          />
        ) : (
        <form action={aoEnviar} className="cartao relative overflow-clip border-ambar/25 bg-surface/85 backdrop-blur-sm">
          <div className="h-1 w-full bg-surface-2">
            <div className="criacao-progresso h-full bg-ambar" style={{ width: `${progresso}%` }} />
          </div>

          <div key={r.passo} className="criacao-passo px-5 pt-6 sm:px-8 sm:pt-8">
            <h1 className={`${gotica.className} text-center text-[2.1rem] leading-tight text-pergaminho drop-shadow-[0_2px_10px_rgba(224,162,74,0.25)] sm:text-5xl`}>
              {TITULOS[r.passo]}
            </h1>
            <p className="mt-2 text-center text-sm italic text-muted">{SUBTITULOS[r.passo]}</p>
            {aventura && r.passo < ULTIMO && (
              <p className="mx-auto mt-3 w-fit rounded-full border border-ambar/40 bg-ambar/10 px-3 py-1 text-center text-xs text-pergaminho">
                📜 Aventura escolhida: {aventura.titulo}
              </p>
            )}

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
                      <Opcao key={n} ativo={r.nome === n} onClick={() => mudar({ nome: n })} className="truncate px-2">
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
                  {!r.historia.trim() && ganchos[0] && (
                    <p className="mt-1.5 text-xs italic text-muted">Deixou em branco? O mestre fica com o primeiro gancho aí embaixo.</p>
                  )}
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
                      {ganchos.map((g, i) => {
                        const usado = linhasHistoria.includes(g);
                        const padrao = !r.historia.trim() && i === 0;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => usarGancho(g)}
                            aria-pressed={usado}
                            title={usado ? "Tirar da história" : "Pôr na história"}
                            className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm italic transition ${
                              usado
                                ? "border-ambar bg-ambar/12 text-pergaminho shadow-[0_0_18px_-8px_var(--ambar)]"
                                : padrao
                                  ? "border-ambar/40 border-dashed bg-surface-2/60 text-foreground hover:border-ambar/70"
                                  : "border-border bg-surface-2/60 text-foreground hover:border-ambar/60 hover:text-pergaminho"
                            }`}
                          >
                            <span className={`mt-px shrink-0 not-italic ${usado ? "text-ambar" : "text-muted"}`} aria-hidden>
                              {usado ? "✓" : "+"}
                            </span>
                            <span className="min-w-0 flex-1">“{g}”</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------- passo 5: onde começa, tom e estilo do mestre ---------- */}
            {r.passo === 4 && (
              <div className="mt-6 space-y-6">
                <div>
                  <Rotulo>A primeira cena</Rotulo>
                  <div className="grid grid-cols-2 gap-2">
                    {COMECOS.map((c) => {
                      const ativo = !aventura && r.comeco === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => escolherComeco(c.id)}
                          aria-pressed={ativo}
                          className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                            ativo ? "border-ambar bg-ambar/12 shadow-[0_0_22px_-10px_var(--ambar)]" : "border-border bg-surface-2/60 hover:border-ambar/60"
                          }`}
                        >
                          {ativo && (
                            <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-ambar text-[11px] font-bold text-[#1a120c]" aria-hidden>
                              ✓
                            </span>
                          )}
                          <span className="text-2xl leading-none" aria-hidden>
                            {c.icone}
                          </span>
                          <span className={`pr-5 text-sm font-semibold leading-tight ${ativo ? "text-ambar" : "text-pergaminho"}`}>{c.nome}</span>
                          {/* no celular a descrição só aparece embaixo, a do escolhido: oito cartões altos viravam rolagem */}
                          <span className="hidden text-xs leading-snug text-muted sm:block">{c.texto}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!aventura && <p className="mt-2 text-sm italic text-muted sm:hidden">{comeco.texto}</p>}
                </div>

                {/* aventuras prontas: o lugar do começo vira uma missão inteira, com roteiro secreto para o mestre */}
                {aventuras.length > 0 && (
                  <div>
                    <Rotulo>Ou uma aventura pronta</Rotulo>
                    <div className="grid gap-2">
                      {aventuras.map((a) => {
                        const ativo = r.aventura === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => alternarAventura(a)}
                            aria-pressed={ativo}
                            title={ativo ? "Clique de novo para desmarcar" : undefined}
                            className={`relative flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                              ativo ? "border-ambar bg-ambar/12 shadow-[0_0_22px_-10px_var(--ambar)]" : "border-border bg-surface-2/60 hover:border-ambar/60"
                            }`}
                          >
                            {ativo && (
                              <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-ambar text-[11px] font-bold text-[#1a120c]" aria-hidden>
                                ✓
                              </span>
                            )}
                            <span className="text-2xl leading-none" aria-hidden>
                              📜
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block pr-5 text-sm font-semibold leading-tight ${ativo ? "text-ambar" : "text-pergaminho"}`}>{a.titulo}</span>
                              <span className="mt-1 block text-xs leading-snug text-muted">{a.chamada}</span>
                              <span className="mt-1 block text-[11px] text-muted/80">
                                {a.duracao} · {a.tom}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {aventura && (
                      <p className="mt-2 text-sm italic text-muted">O Velho Mestre já leu o roteiro. Você, não. É assim que tem que ser.</p>
                    )}
                  </div>
                )}

                <div>
                  <Rotulo>O tom da história</Rotulo>
                  <div className="flex flex-wrap gap-2">
                    {aventura && (
                      <Opcao ativo={tomDaAventura} onClick={() => mudar({ tom: "aventura" })} className="py-2">
                        Da aventura
                      </Opcao>
                    )}
                    {TONS.map((t) => (
                      <Opcao key={t.id} ativo={!tomDaAventura && r.tom === t.id} onClick={() => mudar({ tom: t.id })} className="py-2">
                        {t.nome}
                      </Opcao>
                    ))}
                  </div>
                  <p className="mt-2 text-sm italic text-muted">{tomDaAventura && aventura ? `O tom que a aventura pede: ${aventura.tom}.` : tom.texto}</p>
                </div>

                {/* estilo rápido do mestre: fechado por padrão; o resumo do que está valendo fica no próprio título */}
                <details className="group rounded-xl border border-border bg-surface-2/40">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold text-pergaminho">Como você quer o mestre?</span>
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted">
                      {dificuldade.nome} · <span className="hidden sm:inline">narração</span> {narracao.nome.toLowerCase()}
                      <span className="text-ambar transition group-open:rotate-180" aria-hidden>
                        ▾
                      </span>
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-border/60 px-3 pb-4 pt-3">
                    <div>
                      <Rotulo>Dificuldade</Rotulo>
                      <div className="grid grid-cols-3 gap-2">
                        {DIFICULDADES.map((d) => (
                          <Opcao key={d.id} ativo={r.dificuldade === d.id} onClick={() => mudar({ dificuldade: d.id })} className="px-2">
                            {d.nome}
                          </Opcao>
                        ))}
                      </div>
                      <p className="mt-2 text-xs leading-snug text-muted">{dificuldade.texto}</p>
                    </div>
                    <div>
                      <Rotulo>Tamanho da narração</Rotulo>
                      <div className="grid grid-cols-3 gap-2">
                        {TAMANHOS.map((t) => (
                          <Opcao key={t.id} ativo={r.narracao === t.id} onClick={() => mudar({ narracao: t.id })} className="px-2">
                            {t.nome}
                          </Opcao>
                        ))}
                      </div>
                      <p className="mt-2 text-xs leading-snug text-muted">{narracao.texto}</p>
                    </div>
                    <p className="text-xs italic text-muted">Dá para mudar depois, nos ajustes da mesa.</p>
                  </div>
                </details>

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

                <div>
                  <Rotulo>Quem entra em cena</Rotulo>
                  <CartaoHeroi
                    retrato={retrato}
                    nome={r.nome.trim()}
                    linhas={[
                      [origem?.nome, classe?.nome].filter(Boolean).join(" · "),
                      aventura ? `📜 ${aventura.titulo}` : `${comeco.icone} ${comeco.id === "livre" ? "Onde começa: o mestre escolhe" : `Começa ${comeco.onde}`}`,
                      `${tomNome} · mestre ${dificuldade.nome.toLowerCase()}`,
                    ]}
                  />
                </div>
              </div>
            )}

            {/* barra de botões: gruda no pé da tela nos passos compridos (rostos, ofícios), com o aviso logo acima */}
            <div className="sticky bottom-0 z-10 -mx-5 mt-7 border-t border-border/50 bg-surface/95 px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur sm:-mx-8 sm:px-8">
              {(aviso || estado.erro) && (
                <p role="alert" className="surgir mb-3 rounded-md border border-sangue/50 bg-sangue/10 px-3 py-2 text-sm text-pergaminho">
                  {aviso ?? estado.erro}
                </p>
              )}
              <div className="flex items-center gap-3">
                {r.passo > 0 && (
                  <button type="button" onClick={voltar} className="btn-borda min-h-12 px-4" disabled={enviando}>
                    ← Voltar
                  </button>
                )}
                {r.passo < ULTIMO ? (
                  <button type="button" onClick={avancar} className="btn-ambar min-h-12 flex-1 py-3 text-base">
                    Continuar →
                  </button>
                ) : (
                  <button type="submit" className="btn-ambar min-h-12 flex-1 py-3 text-base" disabled={enviando}>
                    {enviando ? "Acendendo as velas…" : "Começar a aventura"}
                  </button>
                )}
              </div>
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
          <input type="hidden" name="comeco" value={r.comeco} />
          <input type="hidden" name="tom" value={tomDaAventura ? "aventura" : tomDe(r.tom).id} />
          {aventura && <input type="hidden" name="aventura" value={aventura.id} />}
          <input type="hidden" name="dificuldade" value={r.dificuldade} />
          <input type="hidden" name="narracao" value={r.narracao} />
        </form>
        )}

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
