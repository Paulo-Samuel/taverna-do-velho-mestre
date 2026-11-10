"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EstadoVazio } from "@/components/estado-vazio";
import { FaixaAviso } from "@/components/faixa-aviso";
import { Icone } from "@/components/icones";
import * as identidade from "@/lib/cliente/identidade";

// Tela de chegada: 1) apelido, 2) PIN (se a mesa tiver e este aparelho ainda não entrou), 3) personagem.

export type PersonagemEntrada = { id: number; nome: string; jogador: string; resumo: string; pv: number; pvMax: number };
type Presente = { apelido: string; personagemId: number | null; local: boolean };

type Props = {
  campanha: { id: number; nome: string; cenario: string };
  /** `id` é opcional: a página ainda manda só os nomes, então o modo história também é reconhecido pelo nome */
  sistema: { id?: string; nome: string; nomeCurto: string };
  temPin: boolean;
  liberado: boolean;
  local: boolean;
  personagens: PersonagemEntrada[];
  presenca: Presente[];
};

/** Duas letras para o círculo do personagem (primeiro e último nome). */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return (partes[0] ?? "?").slice(0, 2).toUpperCase();
}

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

function Passo({ n, titulo, feito, children }: { n: number; titulo: string; feito?: boolean; children: React.ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-muted">
        <span className={`grid size-6 place-items-center rounded-full border text-xs ${feito ? "border-musgo text-musgo" : "border-ambar text-ambar"}`}>
          {feito ? (
            <>
              <Icone nome="check" />
              <span className="sr-only">feito</span>
            </>
          ) : (
            n
          )}
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
  // só depois de ler o apelido guardado dá para cobrar um: sem isto o aviso piscava para quem já tinha apelido
  const [lido, setLido] = useState(false);

  // localStorage só existe depois da hidratação
  useEffect(() => {
    const salvo = identidade.apelido();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApelido(salvo);
    setConfirmado(Boolean(salvo));
    setMeuAtivo(identidade.personagemAtivo(campanha.id));
    setLido(true);
  }, [campanha.id]);

  // a lista de quem está jogando muda enquanto a pessoa decide: atualiza de tempos em tempos
  useEffect(() => {
    if (!liberado) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [liberado, router]);

  const nomeLimpo = apelido.trim();
  const pronto = confirmado && liberado;
  // na tela é frase comum ("Modo história"); o nome próprio do sistema fica para o mestre
  const nomeDoSistema = sistema.id === "historia" || sistema.nome === "Modo História" ? "Modo história" : sistema.nome;

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
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-xl flex-col justify-center space-y-4 px-4 py-6 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ambar">
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted">
          {nomeDoSistema} · {local ? "nesta máquina" : "pela rede local"}
        </p>
        <h1 className="titulo titulo-brilho mt-1 text-3xl text-pergaminho sm:text-4xl">{campanha.nome}</h1>
        {campanha.cenario && <p className="mx-auto mt-2 line-clamp-3 max-w-md text-sm text-muted">{campanha.cenario}</p>}
      </header>

      <Passo n={1} titulo="Quem é você" feito={confirmado}>
        {confirmado ? (
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Na taverna você é <strong className="text-ambar">{nomeLimpo}</strong>.
            </span>
            <button type="button" className="-my-2 inline-flex min-h-10 items-center rounded px-2 text-xs text-muted hover:text-ambar" onClick={() => setConfirmado(false)}>
              trocar
            </button>
          </p>
        ) : (
          <form
            className="flex flex-wrap gap-2"
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
            <button className="btn-ambar min-h-10 px-4" disabled={!nomeLimpo}>
              Entrar na taverna
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
            <button className="btn-ambar min-h-10 px-4" disabled={!pin.trim() || ocupado === "pin"}>
              {ocupado === "pin" ? "Conferindo…" : "Entrar"}
            </button>
          </form>
        </Passo>
      )}

      {erro && (
        <FaixaAviso tom="erro">{erro}</FaixaAviso>
      )}

      {liberado && (
        <Passo n={2} titulo="Seu personagem">
          {lido && !confirmado && (
            <FaixaAviso tom="info" className="mb-3">
              Diga seu apelido primeiro.
            </FaixaAviso>
          )}

          {/* sem apelido o bloco inteiro fica apagado de uma vez (os botões já vêm desabilitados) */}
          <div className={confirmado || !lido ? "" : "opacity-75"}>

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

          {personagens.length === 0 && <EstadoVazio icone="person">Ninguém criou personagem ainda. A mesa está esperando o primeiro herói (ou vítima).</EstadoVazio>}

          {/* lista vazia não vira <ul> sem itens (o leitor de tela anunciaria "lista, 0 itens") */}
          {personagens.length > 0 && <ul className="space-y-2">
            {personagens.map((p) => {
              const meu = Boolean(p.jogador) && confirmado && mesmoNome(p.jogador, nomeLimpo);
              const donoOnline = Boolean(p.jogador) && !meu && presenca.some((j) => mesmoNome(j.apelido, p.jogador));
              const ativo = meu || meuAtivo === p.id;
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${ativo ? "border-ambar/60 bg-ambar/5" : "border-border"}`}
                >
                  <span
                    aria-hidden
                    className={`grid size-10 shrink-0 place-items-center rounded-full border text-sm font-semibold ${
                      ativo ? "border-ambar/60 bg-ambar/15 text-ambar" : "border-border bg-surface-2 text-muted"
                    }`}
                  >
                    {iniciais(p.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{p.nome}</p>
                    <p className="truncate text-xs tabular-nums text-muted">
                      {p.resumo} · PV {p.pv}/{p.pvMax}
                    </p>
                    <p className="mt-1">
                      {!p.jogador ? (
                        <span className="etiqueta-matiz matiz-2">livre</span>
                      ) : meu ? (
                        <span className="etiqueta-matiz">é seu</span>
                      ) : donoOnline ? (
                        <span className="etiqueta-matiz matiz-7 max-w-full rounded-lg [overflow-wrap:anywhere]">com {p.jogador}, jogando agora</span>
                      ) : (
                        <span className="etiqueta max-w-full rounded-lg [overflow-wrap:anywhere]">de {p.jogador} (ausente)</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={meu || !p.jogador ? "btn-ambar min-h-10 px-4 py-1.5" : "btn-borda min-h-10 px-4 py-1.5"}
                    disabled={!pronto || donoOnline || ocupado !== null}
                    aria-busy={ocupado === p.id}
                    onClick={() => void pegar(p)}
                  >
                    {ocupado === p.id ? "Sentando…" : meu ? "Continuar" : p.jogador ? "Assumir" : "Pegar"}
                  </button>
                </li>
              );
            })}
          </ul>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
            {/* pointer-events-none esconde o title do mouse: a dica e o cursor ficam no invólucro */}
            <span className={confirmado ? "inline-flex" : "inline-flex cursor-not-allowed"} title={confirmado ? undefined : "Diga seu apelido primeiro"}>
              <Link
                href={`/mesa/${campanha.id}/personagens/novo`}
                aria-disabled={!confirmado || undefined}
                tabIndex={confirmado ? undefined : -1}
                className={`${personagens.length === 0 ? "btn-ambar" : "btn-borda"} min-h-10 py-1.5 ${confirmado ? "" : "pointer-events-none opacity-70"}`}
              >
                Criar personagem novo
              </Link>
            </span>
            <span className={confirmado ? "inline-flex" : "inline-flex cursor-not-allowed"} title={confirmado ? undefined : "Diga seu apelido primeiro"}>
              <Link
                href={`/mesa/${campanha.id}`}
                aria-disabled={!confirmado || undefined}
                tabIndex={confirmado ? undefined : -1}
                className={`inline-flex min-h-10 items-center gap-1 text-muted hover:text-ambar ${confirmado ? "" : "pointer-events-none opacity-70"}`}
              >
                Só assistir por enquanto <Icone nome="arrowRight" />
              </Link>
            </span>
          </div>
          </div>
        </Passo>
      )}

      {!liberado && !temPin && <p className="text-center text-sm text-muted">Esta mesa não deixou você entrar. Estranho: ela nem tem tranca.</p>}
    </main>
  );
}
