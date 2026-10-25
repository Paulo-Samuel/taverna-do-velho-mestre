"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";

// Quem está na mesa agora (aparelhos conectados), o estado da conexão e o apelido deste aparelho.
// Na primeira visita (sem apelido salvo) pergunta como chamar o jogador.

const desde = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function CampoApelido({ inicial, aoSalvar, rotulo = "Salvar" }: { inicial: string; aoSalvar: (nome: string) => void; rotulo?: string }) {
  const [nome, setNome] = useState(inicial);
  const limpo = nome.trim();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (limpo) aoSalvar(limpo);
      }}
    >
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={40}
        placeholder="Seu apelido"
        aria-label="Seu apelido"
        className="campo min-w-0 flex-1 py-1.5"
        autoComplete="nickname"
      />
      <button className="btn-ambar px-3 py-1.5" disabled={!limpo || limpo === inicial}>
        {rotulo}
      </button>
    </form>
  );
}

/** Pergunta o apelido na primeira visita deste aparelho. */
function BoasVindas({ aoSalvar }: { aoSalvar: (nome: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-apelido">
      <div className="cartao surgir w-full max-w-sm p-5">
        <h2 id="titulo-apelido" className="titulo text-xl text-ambar">
          Como te chamam na taverna?
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">Aparece para os outros na mesa. Dá para trocar depois, mas o taverneiro vai lembrar.</p>
        <CampoApelido inicial="" aoSalvar={aoSalvar} rotulo="Entrar" />
        <button type="button" className="mt-3 text-xs text-muted hover:text-ambar" onClick={() => aoSalvar("Viajante")}>
          Prefiro o anonimato de &quot;Viajante&quot;
        </button>
      </div>
    </div>
  );
}

export function Presenca({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const [aberto, setAberto] = useState(false);
  const [semAcesso, setSemAcesso] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const id = mesa.campanha.id;
  const nomeDe = (pid: number | null) => mesa.personagens.find((p) => p.id === pid)?.ficha.nome;
  // eu primeiro, depois quem está na máquina da taverna, depois a rede
  const jogadores = [...mesa.presenca].sort(
    (a, b) => Number(b.clienteId === mesa.eu.clienteId) - Number(a.clienteId === mesa.eu.clienteId) || Number(b.local) - Number(a.local),
  );

  // fecha o painel ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  // conexão caída por um tempo: pode ser só o Wi-Fi, ou o PIN que mudou (aí o servidor recusa e o EventSource desiste)
  useEffect(() => {
    if (mesa.conectado || !mesa.eu.clienteId) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/campanhas/${id}/pin`, { cache: "no-store" }).catch(() => null);
      const corpo = r?.ok ? ((await r.json()) as { liberado?: boolean }) : null;
      if (corpo && !corpo.liberado) setSemAcesso(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [mesa.conectado, mesa.eu.clienteId, id]);

  const situacao = mesa.conectado ? "Conectado" : semAcesso ? "Barrado na porta" : "Reconectando…";

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted hover:text-foreground"
        aria-expanded={aberto}
        aria-label={`${situacao}. ${mesa.presenca.length} na mesa`}
      >
        <span className={`size-2 rounded-full ${mesa.conectado ? "bg-musgo" : "animate-pulse bg-sangue"}`} />
        {mesa.presenca.length} na mesa
      </button>

      {aberto && (
        <div className="cartao surgir fixed inset-x-4 top-20 z-40 p-4 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <p className={`mb-3 flex items-center gap-2 text-xs ${mesa.conectado ? "text-musgo" : "text-sangue"}`}>
            <span className={`size-2 rounded-full ${mesa.conectado ? "bg-musgo" : "animate-pulse bg-sangue"}`} />
            {mesa.conectado ? "Conectado à mesa" : semAcesso ? "O PIN da mesa mudou" : "Sem sinal da taverna, tentando de novo…"}
          </p>

          <p className="mb-1.5 text-xs uppercase tracking-wider text-muted">Na mesa agora</p>
          {jogadores.length === 0 ? (
            <p className="text-sm text-muted">Ninguém… nem você, pelo visto.</p>
          ) : (
            <ul className="space-y-1.5">
              {jogadores.map((j) => (
                <li key={j.clienteId} className="flex items-center gap-2 text-sm">
                  <span aria-hidden title={j.local ? "Na máquina da taverna" : "Pela rede"}>
                    {j.local ? "🖥️" : "📱"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className={j.clienteId === mesa.eu.clienteId ? "text-ambar" : "text-foreground"}>{j.apelido}</span>
                    {j.clienteId === mesa.eu.clienteId && <span className="text-muted"> (você)</span>}
                    <span className="block truncate text-xs text-muted">
                      {nomeDe(j.personagemId) ? `como ${nomeDe(j.personagemId)}` : "só assistindo"} · {j.local ? "esta máquina" : "rede"}
                    </span>
                  </span>
                  <span className="text-xs text-muted">{desde(j.desde)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-xs uppercase tracking-wider text-muted">Seu apelido</p>
            {/* key: recomeça o campo quando o apelido muda por fora (outra aba, boas-vindas) */}
            <CampoApelido key={mesa.eu.apelido} inicial={mesa.eu.apelido} aoSalvar={acoes.mudarApelido} />
            <Link href={`/mesa/${id}/entrar`} className="mt-3 inline-block text-xs text-muted hover:text-ambar">
              Trocar de personagem ou entrar de outro jeito →
            </Link>
          </div>
        </div>
      )}

      {semAcesso && !mesa.conectado && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-md border border-sangue/60 bg-surface px-4 py-3 text-sm shadow-lg">
          A porta da taverna mudou de tranca (PIN novo).{" "}
          <Link href={`/mesa/${id}/entrar`} className="text-ambar underline">
            Entrar de novo
          </Link>
        </div>
      )}

      {mesa.eu.clienteId && !mesa.eu.apelido && <BoasVindas aoSalvar={acoes.mudarApelido} />}
    </div>
  );
}
