"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { EfeitosVtm, FaixaDespertar, listaDespertares } from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import type { PersonagemVisivel } from "@/lib/mesa";
import { COR_GRAU, corDoNome, sinal } from "./cores";
import { Dado3D } from "./dado-3d";
import { lerParada, ParadaDados, PASSO_MS, qtdDados, type Parada, type ResultadoParada } from "./parada-dados";
import { Retrato } from "./retrato";

// O momento principal do modo história: o mestre pediu um teste e o jogador rola na tela.
// Pendente → cartão grande com os dados e o botão. Rolado aqui → d20 3D gira e assenta na face do servidor; nos outros sistemas a
// parada (d10 do Vampiro, d100, Fate, 2d6) treme e assenta dado a dado. Rolado em outro aparelho (ou ao recarregar) → resultado
// compacto: d20 numa linha, os outros com a mesma parada assentada em tamanho pequeno.
// Vampiro: teste que falhou com Força de Vontade sobrando fica "decidir" — o cartão oferece rerrolar até 3 dados normais (−1 FV) ou
// aceitar; o servidor aceita sozinho no prazo (rota /rerrolar) e só então manda o resultado ao mestre.

export type ResultadoRolagem = { natural: number | null; total: number; dados: number[]; grau: string; rotuloGrau: string };

type DadosPedido = {
  tipo?: string;
  status?: "pendente" | "decidir" | "resolvido" | "cancelado";
  /** status "decidir": até quando o servidor espera (epoch ms) e a mesa (para a rota /rerrolar) */
  decisao?: { ate?: number; campanhaId?: number };
  personagem?: string;
  personagemId?: number;
  teste?: string;
  alvo?: number | null;
  bonus?: number;
  perigoso?: boolean;
  motivo?: string;
  /** como a parada é rolada ("1d20+4", "7d10 (2 de Fome)", "4dF+2", "1d100") */
  expressao?: string;
  dadoPrincipal?: string;
  sistema?: string;
  modo?: string;
  /** custos anunciados antes do clique (Vampiro: "Despertar · Celeridade ●●", "Surto +2") */
  custos?: string[];
  resultado?: Partial<ResultadoRolagem> & ResultadoParada & { bonus?: number; alvo?: number | null };
};

type Resultado = ResultadoRolagem & ResultadoParada;

/** girando → assentando (dado parando na face) → pronto (conta na tela) → recolhido (vira o resultado compacto e solta o WebGL) */
type Rolagem = { fase: "girando" | "assentando" | "pronto" | "recolhido"; resultado: Resultado | null };

/** Tempo máximo esperando o dado 3D avisar que parou (se o aviso não vier, mostra o resultado assim mesmo). */
const ESPERA_MAXIMA_MS = 4000;

/** Prazo da decisão de rerrolar (igual ao PRAZO_DECISAO_MS do servidor; só para a barrinha). */
const PRAZO_DECISAO_MS = 20_000;

/** Quanto tempo o dado grande fica na tela depois do resultado. Depois vira o resumo compacto: cada Dado3D usa um contexto
 * WebGL e o navegador só aguenta uns 16 por página, então só o teste ativo mantém o dado montado. */
const DADO_NA_TELA_MS = 8000;

/** A parada treme pelo menos isso, mesmo se o servidor responder na hora (senão a rolagem nem aparece). */
const GIRO_MINIMO_MS = 900;

export function dadosDoPedido(m: Mensagem): DadosPedido {
  return (m.dados ?? {}) as DadosPedido;
}

/** O d20 3D só serve para testes de d20; paradas de d10 (Vampiro), d100, Fate e 2d6 usam a parada em SVG. */
function usaD20(d: DadosPedido) {
  return !d.expressao || /(^|[^\d])d20/i.test(d.expressao);
}

/** "17 + 4 = 21 vs 12" (ou "21 vs 12" quando o sistema não tem dado natural). */
function conta(natural: number | null | undefined, bonus: number, total: number, alvo: number | null | undefined) {
  const base = typeof natural === "number" ? `${natural} ${bonus >= 0 ? "+" : "−"} ${Math.abs(bonus)} = ${total}` : String(total);
  return typeof alvo === "number" ? `${base} vs ${alvo}` : base;
}

function rotulo(r: { rotuloGrau?: string; grau?: string }) {
  const t = (r.rotuloGrau ?? "").trim();
  if (t) return /[!.]$/.test(t) ? t : `${t}!`;
  return r.grau?.includes("sucesso") ? "Sucesso!" : "Falha.";
}

/** Título só com o nome do teste: o "precisa de um teste" já está na linha de cima. */
function tituloDoTeste(teste: string) {
  return teste.replace(/^teste\s+de\s+/i, "").trim() || "Teste";
}

// ---------- parada (sistemas sem d20) ----------

/** Rótulo do grau como o sistema chama, sem exclamação inventada ("Crítico Sujo", "Sucesso Difícil", "Falha Bestial"). */
function rotuloParada(r: ResultadoParada) {
  return (r.rotuloGrau ?? "").trim() || (r.grau?.includes("sucesso") ? "Sucesso" : "Falha");
}

/** Rótulos longos viram nome curto + explicação: "Falha — o mestre faz um movimento" e "Falha (tirou Normal, exigia Difícil)". */
function partesDoRotulo(r: ResultadoParada): { nome: string; resto: string } {
  const t = rotuloParada(r);
  const m = t.match(/^(.+?)\s+[—–]\s+(.+)$/) ?? t.match(/^(.+?)\s*\((.+)\)$/);
  return m ? { nome: m[1].trim(), resto: m[2].trim() } : { nome: t, resto: "" };
}

/** Cor do grau com os tokens do tema: Crítico Sujo e Falha Bestial em sangue, crítico na cor de crítico do tema. */
function corParada(r: ResultadoParada) {
  if (r.rotuloGrau === "Crítico Sujo" || r.rotuloGrau === "Falha Bestial" || r.grau === "falha_critica") return "var(--sangue)";
  if (r.grau === "sucesso_critico") return "var(--critico)";
  return COR_GRAU[r.grau ?? ""] ?? "var(--foreground)";
}

/** A conta embaixo do grau, no jeito de cada sistema. */
function contaParada(p: Parada, r: ResultadoParada, alvoPedido: number | null) {
  const dados = r.dados ?? [];
  const total = r.total ?? 0;
  const alvo = typeof r.alvo === "number" ? r.alvo : alvoPedido;
  if (p.sabor === "vtm5") {
    if (r.vtm === "despertar") return r.rotuloGrau ?? "";
    const pares = Math.floor(dados.filter((v) => v === 10).length / 2);
    const partes = [`${total} ${total === 1 ? "sucesso" : "sucessos"}`];
    if (typeof alvo === "number") partes.push(`dificuldade ${alvo}`);
    if (pares) partes.push(`${pares} ${pares === 1 ? "par" : "pares"} de 10`);
    return partes.join(" · ");
  }
  if (p.sabor === "d100") {
    const valor = typeof r.natural === "number" ? r.natural : total;
    return typeof r.alvo === "number" ? `rolou ${valor} · precisava de ${r.alvo} ou menos` : `rolou ${valor}`;
  }
  if (p.sabor === "fate") {
    const soma = dados.reduce((a, b) => a + b, 0);
    const bonus = r.bonus ?? 0;
    return `dados ${sinal(soma)}${bonus ? ` · perícia ${sinal(bonus)}` : ""} = ${sinal(total)}${typeof alvo === "number" ? ` contra ${sinal(alvo)}` : ""}`;
  }
  if (p.sabor === "pbta") {
    const bonus = r.bonus ?? 0;
    return `${dados.slice(0, 2).join(" + ")}${bonus ? ` ${bonus > 0 ? "+" : "−"} ${Math.abs(bonus)}` : ""} = ${total}`;
  }
  return typeof alvo === "number" ? `${total} vs ${alvo}` : String(total);
}

// ---------- cabeçalho comum (d20 e parada) ----------

function Chip({ children, tom = "border-border/80 text-foreground/85" }: { children: ReactNode; tom?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border bg-background/30 px-2.5 py-0.5 text-xs ${tom}`}>{children}</span>;
}

/** Pílulas abaixo do título: dificuldade, como rola e o aviso de perigo. */
function Chips({ d, parada, d20, bonus, alvo }: { d: DadosPedido; parada: Parada; d20: boolean; bonus: number; alvo: number | null }) {
  const chips: ReactNode[] = [];
  if (d20) {
    if (typeof alvo === "number") chips.push(<Chip key="cd">CD {alvo}</Chip>);
    chips.push(<Chip key="bonus">Bônus {sinal(bonus)}</Chip>);
    if (d.modo === "vantagem" || d.modo === "desvantagem") chips.push(<Chip key="modo">Com {d.modo}</Chip>);
  } else if (parada.sabor === "vtm5") {
    if (typeof alvo === "number") chips.push(<Chip key="dif">Dificuldade {alvo}</Chip>);
    chips.push(
      <Chip key="parada">
        {parada.qtd} {parada.qtd === 1 ? "dado" : "dados"}
        {parada.fome > 0 && (
          <>
            <span className="text-muted">·</span>
            <span className="inline-block size-2 rotate-45 bg-sangue" aria-hidden />
            <span className="text-sangue">{parada.fome} de Fome</span>
          </>
        )}
      </Chip>,
    );
  } else if (parada.sabor === "d100") {
    chips.push(<Chip key="d100">1d100 · role abaixo do valor</Chip>);
    if (alvo === 2 || alvo === 3) chips.push(<Chip key="exige">Exige {alvo === 3 ? "Extremo" : "Difícil"}</Chip>);
  } else if (parada.sabor === "fate") {
    if (typeof alvo === "number") chips.push(<Chip key="op">Oposição {sinal(alvo)}</Chip>);
    chips.push(<Chip key="fate">{parada.qtd}dF{bonus ? ` · perícia ${sinal(bonus)}` : ""}</Chip>);
  } else {
    if (parada.sabor === "outro" && typeof alvo === "number") chips.push(<Chip key="alvo">Alvo {alvo}</Chip>);
    const mod = bonus || parada.mod;
    chips.push(
      <Chip key="dados">
        {parada.qtd}d{parada.lados}
        {mod ? ` ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}` : ""}
      </Chip>,
    );
  }
  for (const [i, c] of (Array.isArray(d.custos) ? d.custos : []).entries()) {
    chips.push(
      <Chip key={`custo${i}`} tom="border-sangue/50 text-sangue">
        {/^surto/i.test(c) ? "⚡" : "🩸"} {c}
      </Chip>,
    );
  }
  if (d.perigoso) {
    chips.push(
      <Chip key="perigo" tom="border-sangue/60 bg-sangue/10! font-semibold text-sangue">
        ⚠ Teste perigoso
      </Chip>,
    );
  }
  return <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">{chips}</div>;
}

/** Vampiro: o Despertar do poder rolado junto com a parada e as pílulas do que mudou (Fome, Surto gasto, Ressonância, frenesi). */
function SangueDoResultado({ r, centro = false, novo = false }: { r: ResultadoParada; centro?: boolean; novo?: boolean }) {
  // Despertar e Surto avulsos já mostram tudo na própria parada e na conta
  if (r.vtm === "despertar" || r.vtm === "surto") return <EfeitosVtm efeitos={r.efeitos} centro={centro} />;
  const despertares = listaDespertares(r.despertares).filter((x) => !x.previsto);
  if (!despertares.length && !Array.isArray(r.efeitos)) return null;
  return (
    <div className={centro ? "mx-auto max-w-md" : ""}>
      {despertares.map((x, i) => (
        <FaixaDespertar key={i} x={x} centro={centro} novo={novo} />
      ))}
      <EfeitosVtm efeitos={r.efeitos} centro={centro} />
    </div>
  );
}

// ---------- rerrolar com Força de Vontade (Vampiro) ----------

/** Linha do que a rerrolagem custou: "↻ Força de Vontade 7 → 6 (superficial) · rerrolou 2→8, 4→6". */
function LinhaVontade({ r, centro = false }: { r: ResultadoParada; centro?: boolean }) {
  const x = r.rerrolado;
  if (!x?.vontade) return null;
  return (
    <p className={`mt-1.5 text-xs text-ambar ${centro ? "text-center" : ""}`}>
      <span className="font-semibold">
        ↻ Força de Vontade {x.vontade.antes} → {x.vontade.depois}
      </span>{" "}
      <span className="text-muted">(superficial)</span>
      {x.dados?.length ? <> · rerrolou {x.dados.map((t) => `${t.antes}→${t.depois}`).join(", ")}</> : null}
      {x.grauAntes && <span className="text-muted"> · antes: {x.grauAntes}</span>}
    </p>
  );
}

/** Os dados normais que o servidor vai rolar de novo (os menores abaixo de 6, até 3), só para o cartão mostrar. */
function escolhaDaRerrolagem(r: ResultadoParada): number[] {
  const dados = r.dados ?? [];
  const normais = dados.slice(0, dados.length - (Array.isArray(r.dadosFome) ? r.dadosFome.length : 0));
  return normais
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v < 6)
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .slice(0, 3)
    .map((x) => x.v);
}

/** Teste em decisão: quem controla o personagem rerrola ou aceita; os outros esperam. Prazo vencido sem resposta do servidor
 * (reiniciou no meio) → o navegador aceita (o servidor ignora se já fechou). */
function DecisaoVontade({
  mensagemId,
  d,
  r,
  podeRolar,
  quem,
  vontade,
  aoRerrolar,
}: {
  mensagemId: number;
  d: DadosPedido;
  r: ResultadoParada;
  podeRolar: boolean;
  quem: string;
  vontade: { atual: number; max: number } | null;
  aoRerrolar: (novo: Resultado) => void;
}) {
  const ate = d.decisao?.ate ?? 0;
  const campanhaId = d.decisao?.campanhaId;
  const [agora, setAgora] = useState(0);
  const [enviando, setEnviando] = useState<"rerrolar" | "aceitar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const t0 = setTimeout(tique, 0);
    const t = setInterval(tique, 250);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!ate || !campanhaId) return;
    const t = setTimeout(
      () => {
        void fetch(`/api/campanhas/${campanhaId}/rerrolar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagemId, aceitar: true, sozinho: true }),
        }).catch(() => undefined);
      },
      Math.max(0, ate + 2500 - Date.now()),
    );
    return () => clearTimeout(t);
  }, [ate, campanhaId, mensagemId]);

  async function decidir(aceitar: boolean) {
    if (enviando || !campanhaId) return;
    setEnviando(aceitar ? "aceitar" : "rerrolar");
    setErro(null);
    const resp = await fetch(`/api/campanhas/${campanhaId}/rerrolar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aceitar ? { mensagemId, aceitar: true } : { mensagemId }),
    }).catch(() => null);
    const corpo = resp ? ((await resp.json().catch(() => ({}))) as { resultado?: Resultado; erro?: string }) : {};
    if (!resp?.ok) {
      setErro(corpo.erro ?? "Não deu certo. Tente de novo.");
      setEnviando(null);
      return;
    }
    // a mensagem atualizada chega pelo fluxo de eventos e tira os botões; o resultado já anima aqui
    if (!aceitar && corpo.resultado) aoRerrolar(corpo.resultado);
  }

  const resta = agora ? Math.max(0, ate - agora) : PRAZO_DECISAO_MS;
  const escolha = escolhaDaRerrolagem(r);
  return (
    <div className="surgir mx-auto mt-4 max-w-md rounded-xl border border-ambar/45 bg-background/35 px-3 py-3 text-center" data-decisao={mensagemId}>
      <p className="text-sm text-foreground/90">
        Gastar <span className="font-semibold text-ambar">Força de Vontade</span>?
        {vontade && (
          <span className="text-muted">
            {" "}
            ({vontade.atual}/{vontade.max})
          </span>
        )}
      </p>
      {escolha.length > 0 && (
        <p className="mt-0.5 text-xs text-muted">
          Rola de novo {escolha.length === 1 ? "o dado normal que falhou" : `os ${escolha.length} dados normais que falharam`} ({escolha.join(", ")}); os de Fome ficam.
        </p>
      )}
      {podeRolar ? (
        <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            data-rerrolar
            disabled={enviando !== null}
            onClick={() => void decidir(false)}
            className="btn-ambar min-h-11 flex-col gap-0 px-4 py-2 leading-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar"
          >
            <span>{enviando === "rerrolar" ? "Rerrolando…" : "↻ Rerrolar com Força de Vontade"}</span>
            <span className="text-[11px] font-normal opacity-80">até 3 dados normais · −1 FV</span>
          </button>
          <button
            type="button"
            data-aceitar
            disabled={enviando !== null}
            onClick={() => void decidir(true)}
            className="btn-borda min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar"
          >
            {enviando === "aceitar" ? "Aceitando…" : "Aceitar o resultado"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm italic text-muted">Aguardando {quem} decidir…</p>
      )}
      <div className="mx-auto mt-3 h-1 max-w-xs overflow-hidden rounded-full bg-border/60" aria-hidden>
        <div className="h-full bg-ambar/80 transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (resta / PRAZO_DECISAO_MS) * 100)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        aceita sozinho em {Math.ceil(resta / 1000)} s{podeRolar ? " · F rerrola, Enter aceita" : ""}
      </p>
      {erro && <p className="mt-1 text-xs text-sangue">{erro}</p>}
    </div>
  );
}

export function PedidoTeste({
  mensagem,
  personagem,
  podeRolar,
  rolar,
}: {
  mensagem: Mensagem;
  personagem: PersonagemVisivel | null;
  /** este aparelho controla o personagem do teste (ou é a mesa local) */
  podeRolar: boolean;
  rolar: (mensagemId: number) => Promise<ResultadoRolagem | null>;
}) {
  const d = dadosDoPedido(mensagem);
  const [rolagem, setRolagem] = useState<Rolagem | null>(null);
  // desfazer o turno devolve o teste para "pendente": o dado já rolado aqui volta a esperar (ajuste durante a renderização)
  const [statusVisto, setStatusVisto] = useState(d.status);
  if (d.status !== statusVisto) {
    setStatusVisto(d.status);
    if (d.status === "pendente" && rolagem && rolagem.fase !== "girando") setRolagem(null);
  }
  // a rerrolagem com Força de Vontade chegou com o cartão aberto (aqui ou em outro aparelho): os dados trocados rolam de novo
  const temRerrolagem = Boolean(d.resultado?.rerrolado);
  const [rerrolagemVista, setRerrolagemVista] = useState(temRerrolagem);
  const [rerrolagemNova, setRerrolagemNova] = useState(false);
  if (temRerrolagem !== rerrolagemVista) {
    setRerrolagemVista(temRerrolagem);
    setRerrolagemNova(temRerrolagem);
  }
  const decidindo = d.status === "decidir";
  const vontade = personagem?.ficha.recursos?.vontade ?? null;
  const nome = personagem?.ficha.nome ?? d.personagem ?? "Alguém";
  const cor = corDoNome(nome);
  const bonus = typeof d.bonus === "number" ? d.bonus : (d.resultado?.bonus ?? 0);
  const alvo = d.alvo ?? d.resultado?.alvo ?? null;
  const teste = d.teste ?? "Teste";
  const d20 = usaD20(d);
  const parada = lerParada(d.expressao, d.sistema);

  // rede de segurança: o dado não avisou que parou
  const fase = rolagem?.fase;
  useEffect(() => {
    if (fase !== "assentando") return;
    const t = setTimeout(() => setRolagem((r) => (r ? { ...r, fase: "pronto" } : r)), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [fase]);

  // em decisão (rerrolar ou aceitar) o cartão grande fica até o jogador escolher
  useEffect(() => {
    if (fase !== "pronto" || decidindo) return;
    const t = setTimeout(() => setRolagem((r) => (r ? { ...r, fase: "recolhido" } : r)), DADO_NA_TELA_MS);
    return () => clearTimeout(t);
  }, [fase, decidindo]);

  function aoRerrolar(novo: Resultado) {
    setRolagem((r) => (r ? { ...r, resultado: novo } : r));
    setRerrolagemVista(true);
    setRerrolagemNova(true);
  }
  const decisao = (r: ResultadoParada) =>
    decidindo ? (
      <DecisaoVontade
        mensagemId={mensagem.id}
        d={d}
        r={r}
        podeRolar={podeRolar}
        quem={personagem?.jogador || nome}
        vontade={vontade ? { atual: vontade.atual, max: vontade.max } : null}
        aoRerrolar={aoRerrolar}
      />
    ) : null;

  async function clicar() {
    if (rolagem) return;
    setRolagem({ fase: "girando", resultado: null });
    const reduzido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const [r] = await Promise.all([rolar(mensagem.id), d20 || reduzido ? null : new Promise((ok) => setTimeout(ok, GIRO_MINIMO_MS))]);
    if (!r) {
      setRolagem(null);
      return;
    }
    // a rota devolve o ResultadoTeste inteiro (dadosFome, alvo, detalhes...), não só o pedaço tipado em ResultadoRolagem
    setRolagem({ fase: d20 && typeof r.natural === "number" ? "assentando" : "pronto", resultado: r as Resultado });
  }

  // cancelado: uma linha riscada
  if (!rolagem && d.status === "cancelado") {
    return (
      <p className="surgir my-4 text-center text-sm text-muted">
        <span className="line-through decoration-muted/60">
          Teste de {tituloDoTeste(teste)} de {nome}
        </span>{" "}
        <span className="italic">(cancelado)</span>
      </p>
    );
  }

  // resolvido em outro aparelho, numa visita anterior ou já recolhido: resultado compacto (sem Dado3D)
  if ((!rolagem && (d.status === "resolvido" || decidindo)) || fase === "recolhido") {
    const r = d.resultado ?? rolagem?.resultado ?? {};
    if (!d20) {
      const corGrau = corParada(r);
      const forte = r.rotuloGrau === "Crítico Sujo" || r.rotuloGrau === "Falha Bestial" || r.grau === "falha_critica";
      return (
        <div
          id={`pedido-${mensagem.id}`}
          className={`surgir mx-auto my-5 max-w-xl scroll-mt-24 rounded-lg border px-3 py-2.5 text-sm ${
            forte ? "border-sangue/55 bg-sangue/5" : decidindo ? "border-ambar/60 bg-surface/60" : "border-border/70 bg-surface/50"
          }`}
          aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}: ${rotuloParada(r)}`}
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate pt-0.5 text-xs text-muted">
              <span className="font-semibold" style={{ color: cor }}>
                {nome}
              </span>{" "}
              · {tituloDoTeste(teste)}
            </p>
            <span className="titulo max-w-[55%] shrink-0 text-balance text-right font-semibold leading-tight" style={{ color: corGrau }}>
              {partesDoRotulo(r).nome}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ParadaDados parada={parada} resultado={r} fase="assentado" compacto rerrolar={rerrolagemNova} />
            <span className="tabular-nums text-foreground/80">
              {contaParada(parada, r, alvo)}
              {partesDoRotulo(r).resto && <span className="text-muted"> · {partesDoRotulo(r).resto}</span>}
            </span>
          </div>
          <SangueDoResultado r={r} />
          <LinhaVontade r={r} />
          {r.detalhes && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{r.detalhes}</p>}
          {decisao(r)}
        </div>
      );
    }
    const grau = r.grau ?? "";
    return (
      <div className="surgir mx-auto my-5 flex max-w-xl items-center gap-3 rounded-lg border border-border/70 bg-surface/50 px-3 py-2 text-sm">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-md border text-base font-semibold tabular-nums"
          style={{ borderColor: COR_GRAU[grau] ?? "var(--border)", color: COR_GRAU[grau] }}
          aria-hidden
        >
          {r.natural ?? r.total ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            <span className="font-semibold" style={{ color: cor }}>
              {nome}
            </span>{" "}
            · Teste de {tituloDoTeste(teste)}
          </p>
          <p className="tabular-nums">
            <span className="text-foreground/80">{conta(r.natural, bonus, r.total ?? 0, alvo)}</span>
            <span className="text-muted"> · </span>
            <span className="font-semibold" style={{ color: COR_GRAU[grau] }}>
              {rotulo(r)}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // pendente (ou rolado agora neste aparelho): o cartão grande com os dados
  // depois da rerrolagem vale o resultado novo (chega pela rota ou pelo fluxo de eventos)
  const resultado = ((d.resultado?.rerrolado ? d.resultado : null) as Resultado | null) ?? rolagem?.resultado ?? null;
  const pronto = rolagem?.fase === "pronto" && resultado;
  const natural = resultado?.natural ?? null;
  const destaque = natural === 20 ? "critico" : natural === 1 ? "falha" : null;
  const corGrau = resultado ? COR_GRAU[resultado.grau] : undefined;
  // esperando o clique deste aparelho: o cartão respira (brilho em ceu-estrelado.tsx) para chamar o olho
  const esperando = !rolagem && podeRolar;
  // o texto do resultado espera o último dado da parada assentar
  const atraso = { "--atraso": `${qtdDados(parada, resultado) * PASSO_MS + 480}ms` } as CSSProperties;
  return (
    <section
      id={`pedido-${mensagem.id}`}
      className={`surgir pedido-teste relative mx-auto my-8 max-w-xl scroll-mt-24 overflow-hidden rounded-2xl border bg-surface/85 px-4 pb-5 pt-4 text-center shadow-[0_0_60px_-24px_var(--ambar)] sm:px-6 ${
        esperando ? "pedido-pendente border-ambar/70" : "border-ambar/50"
      }`}
      aria-live="polite"
      aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}`}
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        {personagem && <Retrato ficha={personagem.ficha} tamanho={28} />}
        <span className="font-semibold" style={{ color: cor }}>
          {nome}
        </span>
        <span>precisa de um teste</span>
      </div>
      <h3 className="titulo mx-auto mt-2 max-w-md text-balance text-[1.35rem] leading-tight text-pergaminho sm:text-2xl">{tituloDoTeste(teste)}</h3>
      <Chips d={d} parada={parada} d20={d20} bonus={bonus} alvo={alvo} />
      {d.motivo && <p className="mx-auto mt-2.5 max-w-md text-[0.95rem] italic text-foreground/80">{d.motivo}</p>}

      {d20 ? (
        <div className="mt-4 flex justify-center">
          <Dado3D
            valor={natural}
            rolando={rolagem?.fase === "girando"}
            tamanho={150}
            destaque={rolagem && rolagem.fase !== "girando" ? destaque : null}
            aoParar={() => setRolagem((r) => (r && r.fase === "assentando" ? { ...r, fase: "pronto" } : r))}
          />
        </div>
      ) : (
        <div className="mt-5 flex min-h-14 justify-center">
          <ParadaDados
            parada={parada}
            resultado={resultado}
            fase={!rolagem ? "espera" : rolagem.fase === "girando" ? "rolando" : "assentado"}
            novo
            rerrolar={rerrolagemNova}
          />
        </div>
      )}

      {pronto && !d20 ? (
        <div className="pd-depois mt-4" style={atraso}>
          <p className="titulo text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: corParada(resultado) }}>
            {partesDoRotulo(resultado).nome}
          </p>
          {partesDoRotulo(resultado).resto && (
            <p className="mx-auto mt-0.5 max-w-md text-balance text-sm" style={{ color: corParada(resultado) }}>
              {partesDoRotulo(resultado).resto}
            </p>
          )}
          <p className="mt-1 text-sm tabular-nums text-foreground/85 sm:text-base">{contaParada(parada, resultado, alvo)}</p>
          <SangueDoResultado r={resultado} centro novo />
          <LinhaVontade r={resultado} centro />
          {resultado.detalhes && <p className="mx-auto mt-2 max-w-md text-xs text-muted">{resultado.detalhes}</p>}
          {decisao(resultado)}
        </div>
      ) : pronto ? (
        <p className="surgir mt-4 text-lg tabular-nums sm:text-xl">
          <span className="text-foreground/90">{conta(resultado.natural, bonus, resultado.total, alvo)}</span>
          <span className="text-muted"> · </span>
          <span className="titulo font-semibold" style={{ color: corGrau }}>
            {rotulo(resultado)}
          </span>
        </p>
      ) : rolagem ? (
        <p className="mt-4 text-sm italic text-muted">{d20 ? "O dado corre pela mesa…" : "Os dados correm pela mesa…"}</p>
      ) : podeRolar ? (
        <button
          type="button"
          data-rolar
          className="btn-ambar mt-5 min-h-12 w-full max-w-xs px-8 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar sm:w-auto"
          onClick={() => void clicar()}
        >
          🎲 {d20 ? "Rolar o dado" : "Rolar os dados"}
        </button>
      ) : (
        <p className="mt-4 text-sm italic text-muted">
          Esperando {personagem?.jogador || nome} rolar {d20 ? "o dado" : "os dados"}…
        </p>
      )}
    </section>
  );
}
