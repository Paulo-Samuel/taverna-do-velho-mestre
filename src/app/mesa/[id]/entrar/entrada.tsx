"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as identidade from "@/lib/cliente/identidade";

// Tela de chegada: 1) apelido, 2) PIN (se a mesa tiver e este aparelho ainda não entrou), 3) personagem.

export type PersonagemEntrada = { id: number; nome: string; jogador: string; resumo: string; pv: number; pvMax: number };
type Presente = { apelido: string; personagemId: number | null; local: boolean };

type Props = {
  campanha: { id: number; nome: string; cenario: string };
  sistema: { nome: string; nomeCurto: string };
  temPin: boolean;
  liberado: boolean;
  local: boolean;
  personagens: PersonagemEntrada[];
  presenca: Presente[];
};

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

function Passo({ n, titulo, feito, children }: { n: number; titulo: string; feito?: boolean; children: React.ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-muted">
        <span className={`grid size-6 place-items-center rounded-full border text-xs ${feito ? "border-musgo text-musgo" : "border-ambar text-ambar"}`}>
          {feito ? "✓" : n}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function Entrada({ campanha, sistema, temPin, liberado, local, personagens, presenca }: Props) {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [pin, setPin] = useState("");
  const [ocupado, setOcupado] = useState<number | "pin" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [meuAtivo, setMeuAtivo] = useState<number | null>(null);

  // localStorage só existe depois da hidratação
  useEffect(() => {
    const salvo = identidade.apelido();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApelido(salvo);
    setConfirmado(Boolean(salvo));
    setMeuAtivo(identidade.personagemAtivo(campanha.id));
  }, [campanha.id]);

  // a lista de quem está jogando muda enquanto a pessoa decide: atualiza de tempos em tempos
  useEffect(() => {
    if (!liberado) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [liberado, router]);

  const nomeLimpo = apelido.trim();
  const pronto = confirmado && liberado;

  function confirmarApelido() {
    if (!nomeLimpo) return;
    identidade.salvarApelido(nomeLimpo);
    setConfirmado(true);
  }

  async function enviarPin() {
    setOcupado("pin");
    setErro(null);
    const r = await fetch(`/api/campanhas/${campanha.id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    const corpo = r ? await r.json().catch(() => ({})) : {};
    setOcupado(null);
    if (!r?.ok) return setErro(corpo.erro ?? "A taverna não respondeu. O Wi-Fi caiu?");
    setPin("");
    // o servidor agora vê o cookie e manda a lista de personagens
    router.refresh();
  }

  async function pegar(p: PersonagemEntrada) {
    setOcupado(p.id);
    setErro(null);
    const r = await fetch(`/api/campanhas/${campanha.id}/reivindicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personagemId: p.id, apelido: nomeLimpo, clienteId: identidade.clienteId() }),
    }).catch(() => null);
    const corpo = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setOcupado(null);
      if (r?.status === 403) router.refresh();
      return setErro(corpo.erro ?? "A taverna não respondeu. O Wi-Fi caiu?");
    }
    identidade.salvarPersonagemAtivo(campanha.id, p.id);
    router.push(`/mesa/${campanha.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted">
          {sistema.nome} · {local ? "nesta máquina" : "pela rede local"}
        </p>
        <h1 className="titulo mt-1 text-3xl text-pergaminho">{campanha.nome}</h1>
        {campanha.cenario && <p className="mx-auto mt-2 line-clamp-3 max-w-md text-sm text-muted">{campanha.cenario}</p>}
      </header>

      <Passo n={1} titulo="Quem é você" feito={confirmado}>
        {confirmado ? (
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Na taverna você é <strong className="text-ambar">{nomeLimpo}</strong>.
            </span>
            <button type="button" className="text-xs text-muted hover:text-ambar" onClick={() => setConfirmado(false)}>
              trocar
            </button>
          </p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              confirmarApelido();
            }}
          >
            <input
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={40}
              placeholder="Seu apelido na mesa"
              aria-label="Seu apelido"
              className="campo min-w-0 flex-1"
              autoComplete="nickname"
              autoFocus
            />
            <button className="btn-ambar px-4" disabled={!nomeLimpo}>
              Ok
            </button>
          </form>
        )}
      </Passo>

      {temPin && !liberado && (
        <Passo n={2} titulo="PIN da mesa">
          <p className="mb-3 text-sm text-muted">Esta mesa tem tranca. Peça o PIN a quem está na máquina da taverna.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.trim()) void enviarPin();
            }}
          >
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={12}
              placeholder="PIN"
              aria-label="PIN da mesa"
              className="campo min-w-0 flex-1 tracking-[0.3em]"
              autoComplete="off"
              autoCapitalize="none"
            />
            <button className="btn-ambar px-4" disabled={!pin.trim() || ocupado === "pin"}>
              {ocupado === "pin" ? "…" : "Entrar"}
            </button>
          </form>
        </Passo>
      )}

      {erro && <p className="rounded-md border border-sangue/60 bg-sangue/10 px-4 py-3 text-sm">{erro}</p>}

      {liberado && (
        <Passo n={2} titulo="Seu personagem">
          {!confirmado && <p className="mb-3 text-sm text-muted">Primeiro diga seu apelido, para a mesa saber quem está segurando a ficha.</p>}

          {presenca.length > 0 && (
            <p className="mb-3 text-sm text-muted">
              Na mesa agora:{" "}
              {presenca
                .map((j) => {
                  const como = personagens.find((p) => p.id === j.personagemId)?.nome;
                  return `${j.apelido}${como ? ` (${como})` : ""}`;
                })
                .join(", ")}
            </p>
          )}

          {personagens.length === 0 && <p className="mb-3 text-sm text-muted">Ninguém criou personagem ainda. A mesa está esperando o primeiro herói (ou vítima).</p>}

          <ul className="space-y-2">
            {personagens.map((p) => {
              const meu = Boolean(p.jogador) && confirmado && mesmoNome(p.jogador, nomeLimpo);
              const donoOnline = Boolean(p.jogador) && !meu && presenca.some((j) => mesmoNome(j.apelido, p.jogador));
              const situacao = !p.jogador ? "livre" : meu ? "é seu" : donoOnline ? `com ${p.jogador}, jogando agora` : `de ${p.jogador} (ausente)`;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${meu || meuAtivo === p.id ? "border-ambar/60 bg-ambar/5" : "border-border"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{p.nome}</p>
                    <p className="truncate text-xs text-muted">
                      {p.resumo} · PV {p.pv}/{p.pvMax}
                    </p>
                    <p className={`text-xs ${donoOnline ? "text-sangue" : !p.jogador || meu ? "text-musgo" : "text-muted"}`}>{situacao}</p>
                  </div>
                  <button
                    type="button"
                    className={meu || !p.jogador ? "btn-ambar px-3 py-1.5" : "btn-borda px-3 py-1.5"}
                    disabled={!pronto || donoOnline || ocupado !== null}
                    onClick={() => void pegar(p)}
                  >
                    {ocupado === p.id ? "…" : meu ? "Continuar" : p.jogador ? "Assumir" : "Pegar"}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
            <Link href={`/mesa/${campanha.id}/personagens/novo`} className={`btn-borda py-1.5 ${confirmado ? "" : "pointer-events-none opacity-50"}`}>
              Criar personagem novo
            </Link>
            <Link href={`/mesa/${campanha.id}`} className={`text-muted hover:text-ambar ${confirmado ? "" : "pointer-events-none opacity-50"}`}>
              Só assistir por enquanto →
            </Link>
          </div>
        </Passo>
      )}

      {!liberado && !temPin && <p className="text-center text-sm text-muted">Esta mesa não deixou você entrar. Estranho: ela nem tem tranca.</p>}
    </div>
  );
}
