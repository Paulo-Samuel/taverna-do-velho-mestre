"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as TeclaReact, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CartaoDado } from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { SistemaPublico } from "@/lib/sistemas/tipos";
import { DADOS_RAPIDOS, EXEMPLOS, lerFaces, montarExpressao, somaConstantes, validarExpressao, type Lados } from "./notacao";

// Rolador de dados dos jogadores. Quem rola é o servidor (rota /api/campanhas/[id]/rolagem): o número é honesto
// e, se a rolagem for pública, aparece para a mesa inteira pelo fluxo de eventos.
// O painel é um popover no desktop e uma folha inferior no celular, em portal: o formulário da mesa tem
// backdrop-blur, que prenderia um `fixed` dentro dele.

export type PropsRolador = {
  campanhaId: number;
  sistema: SistemaPublico;
  /** personagem ativo neste aparelho (para testes com a ficha) */
  personagem: PersonagemVisivel | null;
  /** apelido de quem rola */
  autor: string;
  /** rolagem pública aceita: entra no chat na hora, mesmo que o SSE esteja engasgado (sem duplicar) */
  aoRolar?: (m: Mensagem) => void;
};

type Aba = "dados" | "teste" | "manual";
type Modo = "normal" | "vantagem" | "desvantagem";

type Pedido =
  | { tipo: "livre"; expressao: string; motivo?: string; privada?: boolean }
  | { tipo: "teste"; teste: string; alvo: number | null; modo: Modo; modificador: number; motivo?: string; privada?: boolean }
  | { tipo: "manual"; expressao?: string; valores: number[]; total: number; motivo?: string };

type ItemHistorico = { chave: string; quando: number; mensagem: Mensagem; pedido: Pedido };

const MAX_HISTORICO = 10;
const chaveHistorico = (campanhaId: number) => `taverna:rolagens:${campanhaId}`;

function lerHistorico(campanhaId: number): ItemHistorico[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(chaveHistorico(campanhaId)) ?? "[]");
    return Array.isArray(bruto) ? (bruto as ItemHistorico[]).slice(0, MAX_HISTORICO) : [];
  } catch {
    return [];
  }
}

function gravarHistorico(campanhaId: number, itens: ItemHistorico[]) {
  try {
    localStorage.setItem(chaveHistorico(campanhaId), JSON.stringify(itens));
  } catch {
    // armazenamento bloqueado: o histórico vive só até fechar a aba
  }
}

type RespostaRolagem = {
  erro?: string;
  privada?: boolean;
  mensagem?: Mensagem;
  texto?: string;
  dados?: Record<string, unknown>;
  personagemId?: number | null;
  autor?: string | null;
};

/** Item do histórico a partir da resposta da rota. A privada não existe no banco: montamos a mensagem só para desenhar o cartão. */
function novoItem(json: RespostaRolagem, pedido: Pedido): ItemHistorico {
  const agora = Date.now();
  const mensagem: Mensagem =
    json.privada || !json.mensagem
      ? { id: -agora, tipo: "dado", texto: json.texto ?? "", dados: json.dados ?? null, personagemId: json.personagemId ?? null, autor: json.autor ?? null, criadaEm: new Date(agora).toISOString() }
      : json.mensagem;
  return { chave: `${agora}-${Math.random().toString(36).slice(2, 7)}`, quando: agora, mensagem, pedido };
}

const consultaDesktop = "(min-width: 640px)";
function assinarTela(avisar: () => void) {
  const m = window.matchMedia(consultaDesktop);
  m.addEventListener("change", avisar);
  return () => m.removeEventListener("change", avisar);
}

function editavel(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

const rotuloLados = (l: Lados) => (l === "F" ? "dF" : `d${l}`);

/** Dado inicial conforme a mecânica do sistema (d20, d100, Fate, PbtA). */
function dadoPadrao(sistema: SistemaPublico): { lados: Lados; qtd: number } {
  const p = sistema.dadoPrincipal.toLowerCase();
  if (p.includes("d100") || p.includes("%")) return { lados: 100, qtd: 1 };
  if (p.includes("df")) return { lados: "F", qtd: 4 };
  if (p.includes("2d6")) return { lados: 6, qtd: 2 };
  return { lados: 20, qtd: 1 };
}

function Contador({ rotulo, valor, mudar, min, max, sinal }: { rotulo: string; valor: number; mudar: (v: number) => void; min: number; max: number; sinal?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-muted">{rotulo}</span>
      <button type="button" className="size-8 rounded-md border border-border text-lg leading-none hover:border-ambar hover:text-ambar disabled:opacity-40" onClick={() => mudar(Math.max(min, valor - 1))} disabled={valor <= min} aria-label={`menos ${rotulo}`}>
        −
      </button>
      <span className="w-9 text-center tabular-nums" aria-live="polite">
        {sinal && valor > 0 ? `+${valor}` : valor}
      </span>
      <button type="button" className="size-8 rounded-md border border-border text-lg leading-none hover:border-ambar hover:text-ambar disabled:opacity-40" onClick={() => mudar(Math.min(max, valor + 1))} disabled={valor >= max} aria-label={`mais ${rotulo}`}>
        +
      </button>
    </div>
  );
}

function Segmentado<T extends string>({ opcoes, valor, mudar, desabilitado }: { opcoes: [T, string][]; valor: T; mudar: (v: T) => void; desabilitado?: boolean }) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-md border border-border bg-border text-xs ${desabilitado ? "opacity-40" : ""}`} style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
      {opcoes.map(([id, rotulo]) => (
        <button
          key={id}
          type="button"
          disabled={desabilitado}
          aria-pressed={valor === id}
          onClick={() => mudar(id)}
          className={`px-2 py-1.5 ${valor === id ? "bg-ambar/15 text-ambar" : "bg-surface-2 text-muted hover:text-foreground"}`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

function Campo({ rotulo, children, ajuda }: { rotulo: string; children: ReactNode; ajuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{rotulo}</span>
      {children}
      {ajuda}
    </label>
  );
}

export function RoladorDados({ campanhaId, sistema, personagem, autor, aoRolar }: PropsRolador) {
  const inicial = dadoPadrao(sistema);
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [aba, setAba] = useState<Aba>("dados");
  // controles rápidos
  const [lados, setLados] = useState<Lados>(inicial.lados);
  const [qtd, setQtd] = useState(inicial.qtd);
  // a quantidade inicial é do sistema (2d6 no PbtA, 4dF no Fate): só a escolhida pelo jogador sobrevive à troca de dado
  const qtdDoJogador = useRef(false);
  const [mod, setMod] = useState(0);
  const [modo, setModo] = useState<Modo>("normal");
  /** null = expressão montada pelos controles; texto = o jogador escreveu à mão */
  const [livre, setLivre] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [privada, setPrivada] = useState(false);
  // teste da ficha
  const [teste, setTeste] = useState(sistema.testesSugeridos[0] ?? sistema.pericias[0]?.nome ?? sistema.atributos[0]?.nome ?? "");
  const [alvo, setAlvo] = useState("");
  const [modoTeste, setModoTeste] = useState<Modo>("normal");
  const [modTeste, setModTeste] = useState(0);
  // dados físicos
  const [manualExpr, setManualExpr] = useState("");
  const [manualFaces, setManualFaces] = useState("");
  const [manualTotal, setManualTotal] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<ItemHistorico | null>(null);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const historicoCarregado = useRef(false);

  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const desktop = useSyncExternalStore(assinarTela, () => window.matchMedia(consultaDesktop).matches, () => false);

  const expressao = livre ?? montarExpressao(qtd, lados, mod, modo);
  const problema = livre !== null ? validarExpressao(livre) : null;
  const ehD20 = sistema.dadoPrincipal.toLowerCase().includes("d20");
  const rotuloAlvo = sistema.dadoPrincipal === "d100" || sistema.dadoPrincipal === "2d6" ? null : sistema.dadoPrincipal === "4dF" ? "Oposição (opcional)" : `${sistema.rotulos.defesa === "CA" ? "CD ou CA" : "CD"} (opcional)`;

  // testes possíveis: os comuns do sistema, depois perícias e atributos (sem repetir)
  const grupos = useMemo(() => {
    const vistos = new Set<string>();
    const unico = (nome: string) => {
      const k = nome.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    };
    const abrev = (id?: string) => sistema.atributos.find((a) => a.id === id)?.abrev;
    return [
      { rotulo: "Comuns", itens: sistema.testesSugeridos.filter(unico).map((n) => ({ valor: n, rotulo: n })) },
      {
        rotulo: "Perícias",
        itens: sistema.pericias.filter((p) => unico(p.nome)).map((p) => ({ valor: p.nome, rotulo: abrev(p.atributo) ? `${p.nome} (${abrev(p.atributo)})` : p.nome })),
      },
      { rotulo: "Atributos", itens: sistema.atributos.filter((a) => unico(a.nome)).map((a) => ({ valor: a.nome, rotulo: a.nome })) },
    ].filter((g) => g.itens.length);
  }, [sistema]);

  const calcularPosicao = useCallback(() => {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const largura = Math.min(368, window.innerWidth - 16);
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)), bottom: window.innerHeight - r.top + 8 });
  }, []);

  const abrir = useCallback(() => {
    if (!historicoCarregado.current) {
      historicoCarregado.current = true;
      setHistorico(lerHistorico(campanhaId));
    }
    calcularPosicao();
    setAberto(true);
  }, [campanhaId, calcularPosicao]);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    setErro(null);
    if (devolverFoco) botao.current?.focus();
  }, []);

  // atalho global: "d" fora de campos de texto, ou Alt+Shift+D em qualquer lugar
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const combo = e.altKey && e.shiftKey && e.code === "KeyD";
      const simples = !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === "d" && !editavel(e.target);
      if (!combo && !(simples && !aberto)) return;
      e.preventDefault();
      if (aberto) fechar();
      else abrir();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, abrir, fechar]);

  // enquanto aberto: acompanha a tela e fecha ao clicar fora (no desktop; no celular há o fundo escuro)
  useEffect(() => {
    if (!aberto) return;
    // foco no próprio painel: atalhos funcionam de cara e Enter já rola
    painel.current?.focus({ preventScroll: true });
    function aoApertar(e: PointerEvent) {
      const alvo = e.target as Node;
      if (painel.current?.contains(alvo) || botao.current?.contains(alvo)) return;
      if (window.matchMedia(consultaDesktop).matches) fechar(false);
    }
    window.addEventListener("resize", calcularPosicao);
    window.addEventListener("scroll", calcularPosicao, true);
    document.addEventListener("pointerdown", aoApertar);
    return () => {
      window.removeEventListener("resize", calcularPosicao);
      window.removeEventListener("scroll", calcularPosicao, true);
      document.removeEventListener("pointerdown", aoApertar);
    };
  }, [aberto, calcularPosicao, fechar]);

  function escolherDado(l: Lados) {
    setLivre(null);
    setErro(null);
    // Fate quase sempre é 4dF; trocar de dado volta para 1 (ou mantém a quantidade se o jogador já mexeu)
    if (l === "F" && lados !== "F") setQtd(4);
    else if (l !== "F" && (lados === "F" || (l !== lados && !qtdDoJogador.current))) setQtd(1);
    setLados(l);
  }

  function montarPedido(): Pedido | string {
    const m = motivo.trim() || undefined;
    if (aba === "dados") {
      const p = validarExpressao(expressao);
      return p ?? { tipo: "livre", expressao, motivo: m, privada };
    }
    if (aba === "teste") {
      if (!personagem) return "Escolha com qual personagem você está agindo para testar com a ficha.";
      if (!teste) return "Escolha um teste.";
      const a = alvo.trim() === "" ? null : Number(alvo);
      if (a !== null && !Number.isInteger(a)) return "O alvo precisa ser um número inteiro.";
      return { tipo: "teste", teste, alvo: a, modo: ehD20 ? modoTeste : "normal", modificador: modTeste, motivo: m, privada };
    }
    const expr = manualExpr.trim();
    if (expr) {
      const p = validarExpressao(expr);
      if (p) return p;
    }
    const valores = lerFaces(manualFaces);
    if (valores === null) return "Faces: números separados por espaço ou vírgula (Fate: + − 0).";
    const total = manualTotal.trim() === "" ? (valores.length ? valores.reduce((a, b) => a + b, 0) + somaConstantes(expr) : null) : Number(manualTotal);
    if (total === null || !Number.isInteger(total)) return "Informe o total (ou as faces, que a taverna soma).";
    return { tipo: "manual", expressao: expr || undefined, valores, total, motivo: m };
  }

  async function enviar(pedido: Pedido) {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/campanhas/${campanhaId}/rolagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pedido, personagemId: personagem?.id ?? null, autor: autor || undefined }),
      });
      const json = (await resposta.json().catch(() => ({}))) as RespostaRolagem;
      if (!resposta.ok) {
        setErro(json.erro ?? "O dado rolou para debaixo do balcão. Tente de novo.");
        return;
      }
      const item = novoItem(json, pedido);
      if (!json.privada && json.mensagem) aoRolar?.(json.mensagem);
      setUltimo(item);
      setHistorico((h) => {
        const novo = [item, ...h].slice(0, MAX_HISTORICO);
        gravarHistorico(campanhaId, novo);
        return novo;
      });
      if (pedido.tipo === "manual") {
        setManualFaces("");
        setManualTotal("");
      }
    } catch {
      setErro("Sem conexão com a taverna. O dado ficou no ar.");
    } finally {
      setEnviando(false);
    }
  }

  function rolarAgora() {
    const pedido = montarPedido();
    if (typeof pedido === "string") setErro(pedido);
    else void enviar(pedido);
  }

  function limparHistorico() {
    setHistorico([]);
    setUltimo(null);
    gravarHistorico(campanhaId, []);
  }

  // teclado dentro do painel: Esc fecha, Enter rola; fora dos campos, números escolhem o dado
  function aoTeclarPainel(e: TeclaReact) {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      fechar();
      return;
    }
    const alvoEl = e.target as HTMLElement;
    if (e.key === "Enter" && !["BUTTON", "TEXTAREA", "SELECT", "SUMMARY"].includes(alvoEl.tagName)) {
      e.preventDefault();
      rolarAgora();
      return;
    }
    if (editavel(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (/^[1-8]$/.test(k)) {
      setAba("dados");
      escolherDado(DADOS_RAPIDOS[Number(k) - 1]);
    } else if (k === "+" || k === "=") {
      setLivre(null);
      qtdDoJogador.current = true;
      setQtd((q) => Math.min(20, q + 1));
    } else if (k === "-") {
      setLivre(null);
      qtdDoJogador.current = true;
      setQtd((q) => Math.max(1, q - 1));
    } else if (k === "a" || k === "z") {
      const m: Modo = k === "a" ? "vantagem" : "desvantagem";
      if (aba === "teste") setModoTeste((v) => (v === m ? "normal" : m));
      else {
        setLivre(null);
        setModo((v) => (v === m ? "normal" : m));
      }
    } else if (k === "p") setPrivada((v) => !v);
    else if (k === "r") rolarAgora();
    else return;
    e.preventDefault();
  }

  const vantagemPossivel = lados === 20 && qtd === 1 && livre === null;
  const rotuloRolar =
    aba === "dados" ? `Rolar ${expressao}` : aba === "teste" ? `Testar ${teste || "…"}` : "Registrar resultado";

  const conteudoPainel = (
    <>
      {/* fundo escuro só no celular */}
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] sm:hidden" onClick={() => fechar(false)} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal={!desktop}
        aria-label="Rolador de dados"
        tabIndex={-1}
        onKeyDown={aoTeclarPainel}
        style={desktop && pos ? { left: pos.left, bottom: pos.bottom } : undefined}
        className="surgir fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border border-border bg-surface text-sm text-foreground shadow-[0_-10px_50px_-10px_black] outline-none sm:inset-x-auto sm:max-h-[min(80dvh,42rem)] sm:w-[23rem] sm:rounded-xl sm:shadow-[0_20px_60px_-15px_black]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex items-center gap-2 border-b border-border px-4 pb-2 pt-2 sm:pt-3">
          <h2 className="titulo text-lg text-pergaminho">Rolador</h2>
          <span className="min-w-0 flex-1 truncate text-xs text-muted">{personagem ? `${personagem.ficha.nome}${autor ? ` · ${autor}` : ""}` : autor || "sem personagem"}</span>
          <button type="button" onClick={() => fechar()} className="grid size-8 place-items-center rounded-md text-muted hover:text-foreground" aria-label="Fechar rolador">
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-3 text-xs" role="tablist">
          {(
            [
              ["dados", "Dados"],
              ["teste", "Teste da ficha"],
              ["manual", "Dados físicos"],
            ] as [Aba, string][]
          ).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => {
                setAba(id);
                setErro(null);
              }}
              className={`-mb-px border-b-2 px-2.5 py-2 ${aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {aba === "dados" && (
            <>
              <div className="grid grid-cols-8 gap-1" role="group" aria-label="Dado">
                {DADOS_RAPIDOS.map((l, i) => {
                  const ativo = livre === null && lados === l;
                  return (
                    <button
                      key={String(l)}
                      type="button"
                      aria-pressed={ativo}
                      title={`${rotuloLados(l)} (tecla ${i + 1})`}
                      onClick={() => escolherDado(l)}
                      className={`h-11 rounded-md border text-xs font-semibold transition ${ativo ? "border-ambar bg-ambar/15 text-ambar" : "border-border bg-surface-2 text-muted hover:border-ambar/60 hover:text-foreground"}`}
                    >
                      {l === 100 ? "d%" : rotuloLados(l)}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Contador
                  rotulo="Qtd."
                  valor={qtd}
                  min={1}
                  max={20}
                  mudar={(v) => {
                    setLivre(null);
                    qtdDoJogador.current = true;
                    setQtd(v);
                  }}
                />
                <Contador
                  rotulo="Mod."
                  valor={mod}
                  min={-20}
                  max={30}
                  sinal
                  mudar={(v) => {
                    setLivre(null);
                    setMod(v);
                  }}
                />
              </div>
              <Segmentado<Modo>
                opcoes={[
                  ["normal", "Normal"],
                  ["vantagem", "Vantagem"],
                  ["desvantagem", "Desvantagem"],
                ]}
                valor={vantagemPossivel ? modo : "normal"}
                desabilitado={!vantagemPossivel}
                mudar={(v) => {
                  setLivre(null);
                  setModo(v);
                }}
              />
              <Campo
                rotulo="Expressão"
                ajuda={
                  problema ? (
                    <span className="mt-1 block text-xs text-sangue">{problema}</span>
                  ) : (
                    <details className="mt-1 text-xs text-muted">
                      <summary className="cursor-pointer select-none hover:text-foreground">exemplos de notação</summary>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {EXEMPLOS.map((ex) => (
                          <button
                            key={ex.expressao}
                            type="button"
                            title={ex.ajuda}
                            onClick={() => {
                              setLivre(ex.expressao);
                              setErro(null);
                            }}
                            className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] hover:border-ambar hover:text-ambar"
                          >
                            {ex.expressao}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5">kh/kl mantém maiores/menores · dh/dl descarta · ! explode · dF é dado Fate</p>
                    </details>
                  )
                }
              >
                <input
                  value={expressao}
                  onChange={(e) => {
                    setLivre(e.target.value);
                    setErro(null);
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  inputMode="text"
                  maxLength={80}
                  aria-invalid={Boolean(problema)}
                  className={`campo font-mono ${problema ? "border-sangue/70" : ""}`}
                />
              </Campo>
            </>
          )}

          {aba === "teste" &&
            (personagem ? (
              <>
                <Campo rotulo={`Teste de ${personagem.ficha.nome}`}>
                  <select value={teste} onChange={(e) => setTeste(e.target.value)} className="campo">
                    {grupos.map((g) => (
                      <optgroup key={g.rotulo} label={g.rotulo}>
                        {g.itens.map((t) => (
                          <option key={`${g.rotulo}-${t.valor}`} value={t.valor}>
                            {t.rotulo}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Campo>
                <div className="flex flex-wrap items-end gap-3">
                  {rotuloAlvo && (
                    <Campo rotulo={rotuloAlvo}>
                      <input value={alvo} onChange={(e) => setAlvo(e.target.value.replace(/[^\d-]/g, ""))} inputMode="numeric" placeholder="—" className="campo w-24" />
                    </Campo>
                  )}
                  <Contador rotulo="Mod." valor={modTeste} mudar={setModTeste} min={-20} max={20} sinal />
                </div>
                {ehD20 && (
                  <Segmentado<Modo>
                    opcoes={[
                      ["normal", "Normal"],
                      ["vantagem", "Vantagem"],
                      ["desvantagem", "Desvantagem"],
                    ]}
                    valor={modoTeste}
                    mudar={setModoTeste}
                  />
                )}
                <p className="text-xs text-muted">O bônus sai da ficha; o sistema ({sistema.nomeCurto}) decide o grau de sucesso.</p>
              </>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-muted">Escolha com qual personagem você está agindo (ao lado de “Agindo como”) para testar com a ficha.</p>
            ))}

          {aba === "manual" && (
            <>
              <p className="text-xs text-muted">Rolou na mesa de verdade? Conte o resultado. Fica marcado como manual — a taverna confia, mas anota.</p>
              <Campo rotulo="Expressão (opcional)">
                <input value={manualExpr} onChange={(e) => setManualExpr(e.target.value)} placeholder="1d20+5" spellCheck={false} autoCapitalize="off" maxLength={80} className="campo font-mono" />
              </Campo>
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <Campo rotulo="Faces (opcional)">
                  <input value={manualFaces} onChange={(e) => setManualFaces(e.target.value)} placeholder="14  ou  + − 0 +" spellCheck={false} maxLength={200} className="campo" />
                </Campo>
                <Campo rotulo="Total">
                  <input value={manualTotal} onChange={(e) => setManualTotal(e.target.value.replace(/[^\d-]/g, ""))} inputMode="numeric" placeholder="soma" className="campo" />
                </Campo>
              </div>
            </>
          )}

          <Campo rotulo="Motivo (opcional)">
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder={aba === "teste" ? "escalar o muro da guilda" : "dano do machado"} className="campo" />
          </Campo>

          {historico.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span className="uppercase tracking-wider">Minhas últimas</span>
                <button type="button" onClick={limparHistorico} className="hover:text-sangue">
                  limpar
                </button>
              </div>
              <ul className="divide-y divide-border/60 rounded-md border border-border">
                {historico.map((h) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const r = (h.mensagem.dados ?? {}) as Record<string, any>;
                  const rotulo = r.tipo === "teste" ? `${r.teste} · ${r.rotuloGrau}` : r.motivo || "Rolagem";
                  const detalhe = r.expressao ?? "";
                  return (
                    <li key={h.chave} className="flex items-center gap-2 px-2.5 py-1.5">
                      <span className="titulo w-9 shrink-0 text-right text-base text-pergaminho tabular-nums">{r.total ?? "?"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs">{rotulo}</span>
                        <span className="block truncate text-[10px] text-muted">
                          {detalhe}
                          {r.privada ? " · só para você" : ""}
                          {r.manual ? " · manual" : ""} · {new Date(h.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                      {h.pedido.tipo !== "manual" && (
                        <button type="button" onClick={() => void enviar(h.pedido)} disabled={enviando} className="shrink-0 rounded px-1.5 py-1 text-xs text-muted hover:text-ambar" title="Rolar de novo igualzinho" aria-label="Rolar de novo">
                          ↻
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {(erro || ultimo) && (
          // resultado fora da rolagem do painel: sempre à vista, logo acima do botão
          <div className="space-y-2 border-t border-border px-4 pb-1 pt-3" aria-live="polite">
            {erro && (
              <p className="rounded-md border border-sangue/60 bg-sangue/10 px-3 py-2 text-xs" role="alert">
                {erro}
              </p>
            )}
            {ultimo && <CartaoDado key={ultimo.chave} mensagem={ultimo.mensagem} novo />}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {aba !== "manual" ? (
            <button
              type="button"
              onClick={() => setPrivada((v) => !v)}
              aria-pressed={privada}
              title="Tecla P"
              className={`shrink-0 rounded-md border px-2.5 py-2 text-xs ${privada ? "border-sky-300/60 bg-sky-300/10 text-sky-300" : "border-border text-muted hover:text-foreground"}`}
            >
              {privada ? "🙈 Só para mim" : "👁 Pública"}
            </button>
          ) : (
            <span className="shrink-0 text-xs text-muted">sempre pública</span>
          )}
          <button type="button" onClick={rolarAgora} disabled={enviando || (aba === "dados" && Boolean(problema)) || (aba === "teste" && !personagem)} className="btn-ambar min-w-0 flex-1 px-3">
            <span className="truncate">{enviando ? "Rolando…" : rotuloRolar}</span>
          </button>
        </div>
        <p className="hidden px-4 pb-2 text-[10px] text-muted sm:block">Enter rola · 1–8 escolhe o dado · +/− quantidade · A/Z vantagem/desvantagem · P privada · Esc fecha</p>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title="Rolar dados (tecla D)"
        className={`min-h-10 rounded-md border px-2.5 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0 sm:px-2 ${aberto ? "border-ambar bg-ambar/10 text-ambar" : "border-border text-foreground/90 hover:border-ambar hover:text-ambar"}`}
      >
        🎲 Dados
      </button>
      {aberto && createPortal(conteudoPainel, document.body)}
    </>
  );
}
