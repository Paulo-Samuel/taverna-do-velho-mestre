"use client";

import Link from "next/link";
import { useState } from "react";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import { corDoRecurso } from "@/components/ficha/cores-recurso";
import { Icone } from "@/components/icones";
import { EstadoVazio } from "@/components/estado-vazio";
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
        <div className={`h-full rounded-full transition-[width] duration-[var(--mov-barra)] ease-out motion-reduce:transition-none ${cor}`} style={{ width: `${pct}%` }} />
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
        className="inline-flex min-h-10 items-center gap-1 rounded px-1.5 text-left text-muted hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0 sm:px-0"
        title="Quem responde por este personagem"
      >
        <span>
          {personagem.jogador ? (
            <>
              de <span className="text-foreground">{personagem.jogador}</span>
            </>
          ) : (
            "sem dono (qualquer um joga)"
          )}
        </span>
        <Icone nome="pencil" />
      </button>
    );
  }
  return (
    <form
      className="flex w-full items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar(valor.trim());
      }}
    >
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={40}
        placeholder="Apelido do jogador (vazio = livre)"
        aria-label={`Responsável por ${personagem.ficha.nome}`}
        className="campo min-w-0 flex-1 px-2 py-1 text-xs"
        autoFocus
      />
      <button className="btn-borda min-h-10 px-3 text-xs sm:min-h-0 sm:px-2 sm:py-1" disabled={salvando}>
        ok
      </button>
      <button type="button" className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ambar sm:size-8" onClick={() => setEditando(false)} aria-label="Cancelar">
        <Icone nome="close" />
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
  // mesma cor da barra na aba da ficha: o tipo vem dos blocos que o sistema desenha (o que a ficha não mostra em barra fica no anil)
  const tipoDaBarra = new Map<string, string>();
  for (const b of p.blocos) if (b.tipo === "barras") for (const x of b.itens) tipoDaBarra.set(x.rotulo, x.cor ?? "outro");
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
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 text-[11px] uppercase tracking-wider ${agiu ? "bg-[color-mix(in_srgb,var(--grau-sucesso)_22%,transparent)] text-[var(--grau-sucesso)]" : "bg-surface-2 text-muted"}`}
              >
                {agiu ? (
                  <>
                    agiu <Icone nome="check" />
                  </>
                ) : (
                  "falta agir"
                )}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">{resumoPersonagem(mesa, p)}</p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {ficha.pvMax > 0 && <Barra rotulo={caido ? `${rotulos.pv} · caído!` : rotulos.pv} atual={ficha.pv} max={ficha.pvMax} cor={corVida(ficha.pv, ficha.pvMax)} />}
        {recursos.map(([id, r]) => (
          <Barra key={id} rotulo={r.rotulo} atual={r.atual} max={r.max} cor={corDoRecurso(tipoDaBarra.get(r.rotulo) ?? "magia")} />
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
            <span key={c} className="rounded border border-sangue/50 bg-sangue/10 px-1.5 text-[var(--grau-falha)]">
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
          <span className="inline-flex items-center gap-1 text-ambar">
            <Icone nome="chevronDown" className="-rotate-90" />
            agindo agora
          </span>
        ) : (
          <button type="button" className="inline-flex min-h-10 items-center rounded-md border border-ambar/60 px-2.5 py-1 text-ambar hover:bg-ambar/10 focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0" onClick={() => acoes.escolherPersonagem(p.id)}>
            Jogar com este{indice < 9 && <span className="ml-1 hidden text-muted sm:inline">Alt+{indice + 1}</span>}
          </button>
        )}
        <span className="flex-1" />
        {confirmando ? (
          <span className="flex flex-wrap items-center justify-end gap-3">
            <span className="text-muted">Tirar do grupo?</span>
            <button type="button" className="btn-perigo min-h-10 px-3 text-xs sm:min-h-0 sm:py-1" disabled={removendo} onClick={() => void remover()}>
              {removendo ? "tirando…" : "sim, tirar"}
            </button>
            <button type="button" className="inline-flex min-h-10 items-center rounded px-1.5 text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0 sm:px-0" onClick={() => setConfirmando(false)}>
              não
            </button>
          </span>
        ) : (
          <button type="button" className="inline-flex min-h-10 items-center rounded px-1.5 text-muted hover:text-sangue focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0 sm:px-0" onClick={() => setConfirmando(true)} disabled={mesa.ocupado} title={mesa.ocupado ? "Espere o mestre terminar" : undefined}>
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
        <EstadoVazio compacto icone="person">
          Mesa vazia. Nem o bardo apareceu.
        </EstadoVazio>
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
          <button type="button" onClick={() => setErro(null)} className="-my-1.5 -mr-2 grid size-10 shrink-0 place-items-center rounded-md text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ambar sm:size-8" aria-label="Fechar o aviso">
            <Icone nome="close" />
          </button>
        </div>
      )}

      <Link href={`/mesa/${mesa.campanha.id}/personagens/novo`} className={`${mesa.personagens.length === 0 ? "btn-ambar" : "btn-borda"} w-full`}>
        + Adicionar personagem
      </Link>
      {mesa.personagens.length === 1 && (
        <p className="mt-2 text-center text-xs text-muted">
          Aventura solo por enquanto. Dá para sentar mais gente neste computador ou chamar pela rede com o convite, no menu do cabeçalho.
        </p>
      )}
      {mesa.personagens.length > 1 && (
        <p className="text-center text-xs text-muted">Mesa local: troque quem age pelos chips acima do campo de ação ou com Alt+1…9.</p>
      )}
    </div>
  );
}
