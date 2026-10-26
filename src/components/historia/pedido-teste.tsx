"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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

export type ResultadoRolagem = { natural: number | null; total: number; dados: number[]; grau: string; rotuloGrau: string };

type DadosPedido = {
  tipo?: string;
  status?: "pendente" | "resolvido" | "cancelado";
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
  resultado?: Partial<ResultadoRolagem> & ResultadoParada & { bonus?: number; alvo?: number | null };
};

type Resultado = ResultadoRolagem & ResultadoParada;

/** girando → assentando (dado parando na face) → pronto (conta na tela) → recolhido (vira o resultado compacto e solta o WebGL) */
type Rolagem = { fase: "girando" | "assentando" | "pronto" | "recolhido"; resultado: Resultado | null };

/** Tempo máximo esperando o dado 3D avisar que parou (se o aviso não vier, mostra o resultado assim mesmo). */
const ESPERA_MAXIMA_MS = 4000;

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
  if (d.perigoso) {
    chips.push(
      <Chip key="perigo" tom="border-sangue/60 bg-sangue/10! font-semibold text-sangue">
        ⚠ Teste perigoso
      </Chip>,
    );
  }
  return <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">{chips}</div>;
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

  useEffect(() => {
    if (fase !== "pronto") return;
    const t = setTimeout(() => setRolagem((r) => (r ? { ...r, fase: "recolhido" } : r)), DADO_NA_TELA_MS);
    return () => clearTimeout(t);
  }, [fase]);

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
  if ((!rolagem && d.status === "resolvido") || fase === "recolhido") {
    const r = d.resultado ?? rolagem?.resultado ?? {};
    if (!d20) {
      const corGrau = corParada(r);
      const forte = r.rotuloGrau === "Crítico Sujo" || r.rotuloGrau === "Falha Bestial" || r.grau === "falha_critica";
      return (
        <div
          className={`surgir mx-auto my-5 max-w-xl rounded-lg border px-3 py-2.5 text-sm ${forte ? "border-sangue/55 bg-sangue/5" : "border-border/70 bg-surface/50"}`}
          aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}: ${rotuloParada(r)}`}
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
            <ParadaDados parada={parada} resultado={r} fase="assentado" compacto />
            <span className="tabular-nums text-foreground/80">
              {contaParada(parada, r, alvo)}
              {partesDoRotulo(r).resto && <span className="text-muted"> · {partesDoRotulo(r).resto}</span>}
            </span>
          </div>
          {r.detalhes && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{r.detalhes}</p>}
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
  const resultado = rolagem?.resultado ?? null;
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
          <ParadaDados parada={parada} resultado={resultado} fase={!rolagem ? "espera" : rolagem.fase === "girando" ? "rolando" : "assentado"} novo />
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
          {resultado.detalhes && <p className="mx-auto mt-2 max-w-md text-xs text-muted">{resultado.detalhes}</p>}
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
