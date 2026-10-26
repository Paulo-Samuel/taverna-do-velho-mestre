"use client";

import { useEffect, useState } from "react";
import { CartaoDado } from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import type { PersonagemVisivel } from "@/lib/mesa";
import { COR_GRAU, corDoNome, sinal } from "./cores";
import { Dado3D } from "./dado-3d";
import { Retrato } from "./retrato";

// O momento principal do modo história: o mestre pediu um teste e o jogador rola o d20 na tela.
// Pendente → cartão grande com o dado e o botão. Rolado aqui → o dado gira, assenta na face sorteada pelo servidor e
// mostra a conta. Rolado em outro aparelho (ou ao recarregar) → só o resultado, compacto.

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
  resultado?: Partial<ResultadoRolagem> & { bonus?: number; alvo?: number | null };
};

/** girando → assentando (dado parando na face) → pronto (conta na tela) → recolhido (vira o resultado compacto e solta o WebGL) */
type Rolagem = { fase: "girando" | "assentando" | "pronto" | "recolhido"; resultado: ResultadoRolagem | null };

/** Tempo máximo esperando o dado 3D avisar que parou (se o aviso não vier, mostra o resultado assim mesmo). */
const ESPERA_MAXIMA_MS = 4000;

/** Quanto tempo o dado grande fica na tela depois do resultado. Depois vira o resumo compacto: cada Dado3D usa um contexto
 * WebGL e o navegador só aguenta uns 16 por página, então só o teste ativo mantém o dado montado. */
const DADO_NA_TELA_MS = 8000;

export function dadosDoPedido(m: Mensagem): DadosPedido {
  return (m.dados ?? {}) as DadosPedido;
}

/** O d20 3D só serve para testes de d20; paradas de d10 (Vampiro), d100, Fate e 2d6 usam o cartão de dados do sistema. */
function usaD20(d: DadosPedido) {
  return !d.expressao || /(^|[^\d])d20/i.test(d.expressao);
}

/** O resultado desenhado pelo cartão de dados (visual próprio de cada sistema). */
function CartaoDoSistema({ mensagem, resultado, novo }: { mensagem: Mensagem; resultado: unknown; novo: boolean }) {
  return <CartaoDado mensagem={{ ...mensagem, dados: { ...(resultado as Record<string, unknown>), tipo: "teste" } }} novo={novo} />;
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
  const nome = personagem?.ficha.nome ?? d.personagem ?? "Alguém";
  const cor = corDoNome(nome);
  const bonus = typeof d.bonus === "number" ? d.bonus : (d.resultado?.bonus ?? 0);
  const alvo = d.alvo ?? d.resultado?.alvo ?? null;
  const teste = d.teste ?? "Teste";
  const d20 = usaD20(d);

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
    const r = await rolar(mensagem.id);
    if (!r) {
      setRolagem(null);
      return;
    }
    setRolagem({ fase: d20 && typeof r.natural === "number" ? "assentando" : "pronto", resultado: r });
  }

  // cancelado: uma linha riscada
  if (!rolagem && d.status === "cancelado") {
    return (
      <p className="surgir my-4 text-center text-sm text-muted">
        <span className="line-through decoration-muted/60">
          Teste de {teste} de {nome}
        </span>{" "}
        <span className="italic">(cancelado)</span>
      </p>
    );
  }

  // resolvido em outro aparelho, numa visita anterior ou já recolhido: resultado compacto (sem Dado3D)
  if ((!rolagem && d.status === "resolvido") || fase === "recolhido") {
    const r = d.resultado ?? rolagem?.resultado ?? {};
    if (!d20) return <CartaoDoSistema mensagem={mensagem} resultado={r} novo={false} />;
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
            · Teste de {teste}
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

  // pendente (ou rolado agora neste aparelho): o cartão grande com o dado
  const resultado = rolagem?.resultado ?? null;
  const pronto = rolagem?.fase === "pronto" && resultado;
  const natural = resultado?.natural ?? null;
  const destaque = natural === 20 ? "critico" : natural === 1 ? "falha" : null;
  const corGrau = resultado ? COR_GRAU[resultado.grau] : undefined;
  // esperando o clique deste aparelho: o cartão respira (brilho em ceu-estrelado.tsx) para chamar o olho
  const esperando = !rolagem && podeRolar;
  return (
    <section
      id={`pedido-${mensagem.id}`}
      className={`surgir pedido-teste relative mx-auto my-8 max-w-xl scroll-mt-24 overflow-hidden rounded-2xl border bg-surface/85 px-4 pb-5 pt-4 text-center shadow-[0_0_60px_-24px_var(--ambar)] sm:px-6 ${
        esperando ? "pedido-pendente border-ambar/70" : "border-ambar/50"
      }`}
      aria-live="polite"
      aria-label={`Teste de ${teste} de ${nome}`}
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        {personagem && <Retrato ficha={personagem.ficha} tamanho={28} />}
        <span className="font-semibold" style={{ color: cor }}>
          {nome}
        </span>
        <span>precisa de um teste</span>
      </div>
      <h3 className="titulo mt-2 text-xl text-pergaminho sm:text-2xl">
        Teste de {teste}
        {typeof alvo === "number" && <span className="text-muted"> — {d20 ? "CD" : "Dificuldade"} {alvo}</span>}
        {d20 ? <span className="text-ambar"> ({sinal(bonus)})</span> : d.expressao && <span className="text-ambar"> ({d.expressao})</span>}
      </h3>
      {d.motivo && <p className="mx-auto mt-1.5 max-w-md text-[0.95rem] italic text-foreground/80">{d.motivo}</p>}
      {d.perigoso && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sangue/60 bg-sangue/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-sangue">
          ⚠ perigoso
        </p>
      )}

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
      ) : pronto ? (
        <div className="mt-4 text-left">
          <CartaoDoSistema mensagem={mensagem} resultado={resultado} novo />
        </div>
      ) : (
        <p className={`mt-4 text-5xl ${rolagem ? "dado-rolando inline-block" : ""}`} aria-hidden>
          🎲
        </p>
      )}

      {pronto && !d20 ? null : pronto ? (
        <p className="surgir mt-4 text-lg tabular-nums sm:text-xl">
          <span className="text-foreground/90">{conta(resultado.natural, bonus, resultado.total, alvo)}</span>
          <span className="text-muted"> · </span>
          <span className="titulo font-semibold" style={{ color: corGrau }}>
            {rotulo(resultado)}
          </span>
        </p>
      ) : rolagem ? (
        <p className="mt-4 text-sm italic text-muted">O dado corre pela mesa…</p>
      ) : podeRolar ? (
        <button
          type="button"
          data-rolar
          className="btn-ambar mt-4 min-h-12 px-8 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar"
          onClick={() => void clicar()}
        >
          🎲 {d20 ? "Rolar o dado" : "Rolar os dados"}
        </button>
      ) : (
        <p className="mt-4 text-sm italic text-muted">Esperando {personagem?.jogador || nome} rolar o dado…</p>
      )}
    </section>
  );
}
