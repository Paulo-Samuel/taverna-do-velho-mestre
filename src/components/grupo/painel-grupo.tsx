"use client";

import Link from "next/link";
import { useState } from "react";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import { Avatar, quemAgiu, resumoPersonagem } from "./avatar";

// Grupo da mesa: cartão de cada personagem (vida, recursos, condições, quem controla), troca do ativo,
// responsável, remoção e, no modo rodada, quem já agiu e quem ainda está pensando.

function Barra({ rotulo, atual, max, cor }: { rotulo: string; atual: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{rotulo}</span>
        <span className="tabular-nums text-foreground">
          {atual}/{max}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full transition-[width] duration-500 ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function corVida(atual: number, max: number) {
  if (max <= 0) return "bg-muted";
  const f = atual / max;
  return f <= 0 ? "bg-muted" : f <= 0.25 ? "bg-sangue" : f <= 0.5 ? "bg-ambar-forte" : "bg-musgo";
}

/** Campo do responsável: vazio = livre (qualquer um na mesa local usa). */
function Responsavel({ personagem, campanhaId, sugestao, aoErro }: { personagem: PersonagemVisivel; campanhaId: number; sugestao: string; aoErro: (e: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(personagem.jogador);
  const [salvando, setSalvando] = useState(false);

  async function salvar(jogador: string) {
    setSalvando(true);
    try {
      const r = await fetch(`/api/campanhas/${campanhaId}/personagens/${personagem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jogador }),
      });
      if (!r.ok) aoErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? `Erro ${r.status}`);
      else setEditando(false);
    } catch {
      aoErro("A taverna não respondeu.");
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(personagem.jogador || sugestao);
          setEditando(true);
        }}
        className="text-left text-muted hover:text-ambar"
        title="Quem responde por este personagem"
      >
        {personagem.jogador ? (
          <>
            de <span className="text-foreground">{personagem.jogador}</span>
          </>
        ) : (
          "sem dono (qualquer um joga)"
        )}{" "}
        ✎
      </button>
    );
  }
  return (
    <form
      className="flex w-full gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar(valor.trim());
      }}
    >
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={40}
        placeholder="apelido do jogador (vazio = livre)"
        aria-label={`Responsável por ${personagem.ficha.nome}`}
        className="campo min-w-0 flex-1 px-2 py-1 text-xs"
        autoFocus
      />
      <button className="rounded-md border border-ambar px-2 text-xs text-ambar" disabled={salvando}>
        ok
      </button>
      <button type="button" className="px-1 text-xs text-muted hover:text-foreground" onClick={() => setEditando(false)} aria-label="Cancelar">
        ✕
      </button>
    </form>
  );
}

function CartaoPersonagem({
  mesa,
  acoes,
  p,
  indice,
  agiu,
  aoErro,
}: {
  mesa: Mesa;
  acoes: AcoesMesa;
  p: PersonagemVisivel;
  indice: number;
  /** null fora do modo rodada */
  agiu: boolean | null;
  aoErro: (e: string) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const ativo = p.id === mesa.eu.personagemId;
  const { ficha } = p;
  const rotulos = mesa.sistema.rotulos;
  // recursos com máximo (espaços de magia, foco, sorte...): os três primeiros cabem no cartão
  const recursos = Object.entries(ficha.recursos ?? {})
    .filter(([, r]) => r && r.max > 0)
    .slice(0, 3);
  const aparelhos = mesa.presenca.filter((j) => j.personagemId === p.id);
  const caido = ficha.pvMax > 0 && ficha.pv <= 0;

  async function remover() {
    setRemovendo(true);
    try {
      const r = await fetch(`/api/campanhas/${mesa.campanha.id}/personagens/${p.id}`, { method: "DELETE" });
      if (!r.ok) aoErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? `Erro ${r.status}`);
      // o evento personagem_removido tira o cartão; se era o ativo, passa para outro
      else if (ativo) acoes.escolherPersonagem(mesa.personagens.find((o) => o.id !== p.id)?.id ?? null);
    } catch {
      aoErro("A taverna não respondeu.");
    } finally {
      setRemovendo(false);
      setConfirmando(false);
    }
  }

  return (
    <li className={`rounded-lg border p-3 transition ${ativo ? "border-ambar bg-ambar/5" : "border-border"}`}>
      <div className="flex items-start gap-2.5">
        <Avatar mesa={mesa} personagem={p} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-semibold text-pergaminho">{ficha.nome}</p>
            {agiu !== null && (
              <span className={`shrink-0 rounded-full px-1.5 text-[10px] uppercase tracking-wider ${agiu ? "bg-musgo/30 text-[#a9c48a]" : "bg-surface-2 text-muted"}`}>
                {agiu ? "agiu ✓" : "falta agir"}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">{resumoPersonagem(mesa, p)}</p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {ficha.pvMax > 0 && <Barra rotulo={caido ? `${rotulos.pv} · caído!` : rotulos.pv} atual={ficha.pv} max={ficha.pvMax} cor={corVida(ficha.pv, ficha.pvMax)} />}
        {recursos.map(([id, r]) => (
          <Barra key={id} rotulo={r.rotulo} atual={r.atual} max={r.max} cor="bg-[#7d8fd6]" />
        ))}
      </div>

      {(ficha.defesa > 0 || ficha.condicoes.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
          {ficha.defesa > 0 && (
            <span className="rounded border border-border px-1.5 text-muted">
              {rotulos.defesa} <span className="text-foreground">{ficha.defesa}</span>
            </span>
          )}
          {ficha.condicoes.map((c) => (
            <span key={c} className="rounded border border-sangue/50 bg-sangue/10 px-1.5 text-[#e98b7d]">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 space-y-0.5 text-xs">
        <Responsavel personagem={p} campanhaId={mesa.campanha.id} sugestao={mesa.eu.apelido} aoErro={aoErro} />
        {aparelhos.length > 0 && (
          <p className="text-muted">
            agora com:{" "}
            {aparelhos.map((j, i) => (
              <span key={j.clienteId}>
                {i > 0 && ", "}
                <span className={j.clienteId === mesa.eu.clienteId ? "text-ambar" : "text-foreground"}>
                  {j.clienteId === mesa.eu.clienteId ? "este aparelho" : j.apelido}
                </span>
                {!j.local && j.clienteId !== mesa.eu.clienteId && " (rede)"}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
        {ativo ? (
          <span className="text-ambar">▶ agindo agora</span>
        ) : (
          <button type="button" className="rounded-md border border-ambar/60 px-2.5 py-1 text-ambar hover:bg-ambar/10" onClick={() => acoes.escolherPersonagem(p.id)}>
            Jogar com este{indice < 9 && <span className="ml-1 hidden text-muted sm:inline">Alt+{indice + 1}</span>}
          </button>
        )}
        <span className="flex-1" />
        {confirmando ? (
          <span className="flex items-center gap-2">
            <span className="text-muted">Tirar do grupo?</span>
            <button type="button" className="text-sangue hover:underline" disabled={removendo} onClick={() => void remover()}>
              {removendo ? "tirando…" : "sim, tirar"}
            </button>
            <button type="button" className="text-muted hover:text-foreground" onClick={() => setConfirmando(false)}>
              não
            </button>
          </span>
        ) : (
          <button type="button" className="text-muted hover:text-sangue" onClick={() => setConfirmando(true)} disabled={mesa.ocupado} title={mesa.ocupado ? "Espere o mestre terminar" : undefined}>
            remover
          </button>
        )}
      </div>
    </li>
  );
}

export function PainelGrupo({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const [erro, setErro] = useState<string | null>(null);
  const rodada = mesa.campanha.modo === "rodada";
  const agiram = rodada ? quemAgiu(mesa) : null;
  const faltam = agiram ? mesa.personagens.filter((p) => !agiram.has(p.id)) : [];

  return (
    <div className="space-y-3 text-sm">
      {rodada && mesa.personagens.length > 0 && (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
          Modo rodada:{" "}
          {faltam.length === 0
            ? mesa.fila.length
              ? "todos agiram, o mestre vai narrar."
              : "esperando a primeira ação."
            : `faltam ${faltam.map((p) => p.ficha.nome).join(", ")}.`}
        </p>
      )}

      {mesa.personagens.length === 0 ? (
        <p className="text-muted">Mesa vazia. Nem o bardo apareceu.</p>
      ) : (
        <ul className="space-y-2.5">
          {mesa.personagens.map((p, i) => (
            <CartaoPersonagem key={p.id} mesa={mesa} acoes={acoes} p={p} indice={i} agiu={agiram ? agiram.has(p.id) : null} aoErro={setErro} />
          ))}
        </ul>
      )}

      {erro && (
        <div className="flex items-start justify-between gap-2 rounded-md border border-sangue/60 bg-sangue/10 px-3 py-2 text-xs">
          <p>{erro}</p>
          <button onClick={() => setErro(null)} className="text-muted hover:text-foreground" aria-label="Fechar">
            ✕
          </button>
        </div>
      )}

      <Link href={`/mesa/${mesa.campanha.id}/personagens/novo`} className="btn-borda w-full">
        + Adicionar personagem
      </Link>
      {mesa.personagens.length > 1 && (
        <p className="text-center text-[11px] text-muted">Mesa local: troque quem age pelos chips acima do campo de ação ou com Alt+1…9.</p>
      )}
    </div>
  );
}
