"use client";

import { useEffect, useState } from "react";

// "↶ Desfazer" e "↻ Outra resposta" embaixo da última narração do mestre (as duas mesas).
// Apagam coisa, então pedem um segundo clique ("Tem certeza? Clique de novo") antes de chamar /api/campanhas/[id]/desfazer.
// O servidor publica "recarregar" para todos; aqui só devolvemos a resposta para a mesa pôr a ação de volta no campo.

export type Desfeito = { acoes: { personagemId: number | null; autor: string; acao: string }[]; abertura: boolean; restantes: number };

type Qual = "desfazer" | "refazer";

/** Quanto tempo o "Tem certeza?" espera o segundo clique. */
const ESPERA_MS = 4000;

export function AcoesTurno({
  campanhaId,
  aoConcluir,
  aoErro,
  className = "",
  compacto = false,
}: {
  campanhaId: number;
  aoConcluir: (r: Desfeito, refazer: boolean) => void;
  aoErro: (erro: string) => void;
  className?: string;
  /** barra do leitor cena a cena: no celular só os ícones (o "tem certeza?" encurta para caber) */
  compacto?: boolean;
}) {
  const [armado, setArmado] = useState<Qual | null>(null);
  const [indo, setIndo] = useState<Qual | null>(null);

  // o "tem certeza?" desarma sozinho
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(null), ESPERA_MS);
    return () => clearTimeout(t);
  }, [armado]);

  async function clicar(qual: Qual) {
    if (indo) return;
    if (armado !== qual) {
      setArmado(qual);
      return;
    }
    setArmado(null);
    setIndo(qual);
    try {
      const resp = await fetch(`/api/campanhas/${campanhaId}/desfazer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qual === "refazer" ? { refazer: true } : {}),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) aoErro(corpo.erro ?? `Erro ${resp.status}`);
      else aoConcluir(corpo as Desfeito, qual === "refazer");
    } catch {
      aoErro("Não deu para falar com o servidor. A taverna ainda está ligada?");
    } finally {
      setIndo(null);
    }
  }

  const botao = (qual: Qual, icone: string, rotulo: string, dica: string) => {
    const conf = armado === qual;
    return (
      <button
        type="button"
        onClick={() => void clicar(qual)}
        disabled={indo !== null}
        title={conf ? "Clique de novo para confirmar" : dica}
        aria-label={conf ? `${rotulo}: tem certeza? Clique de novo` : `${rotulo}. ${dica}`}
        data-turno={qual}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition disabled:opacity-50 sm:min-h-8 ${
          conf ? "border-sangue/70 bg-sangue/10 text-foreground" : "border-transparent text-muted hover:border-border hover:text-ambar"
        }`}
      >
        <span aria-hidden className="text-sm leading-none">
          {indo === qual ? "…" : icone}
        </span>
        {compacto ? (
          conf ? (
            <span>
              <span className="max-sm:hidden">Tem certeza? </span>Clique de novo
            </span>
          ) : (
            <span className="max-sm:sr-only">{rotulo}</span>
          )
        ) : (
          <span>{conf ? "Tem certeza? Clique de novo" : rotulo}</span>
        )}
      </button>
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} role="group" aria-label="Voltar o último turno do mestre">
      {botao("desfazer", "↶", "Desfazer", "Apaga a última resposta do mestre e devolve a sua ação ao campo, para reescrever")}
      {botao("refazer", "↻", "Outra resposta", "O mestre responde de novo às mesmas ações (a resposta atual some)")}
    </div>
  );
}

/** A ação que volta ao campo depois de desfazer: a do personagem ativo; sem ela, uma fala sem personagem. */
export function acaoParaCampo(r: Desfeito, personagemId: number | null): string | null {
  return (r.acoes.find((a) => a.personagemId === personagemId) ?? r.acoes.find((a) => a.personagemId === null))?.acao ?? null;
}

/** Aviso curto depois de desfazer/refazer. */
export function avisoDoDesfeito(r: Desfeito, refazer: boolean, voltouAoCampo: boolean): string {
  if (refazer) return "O mestre vai tentar de novo. Tomara que melhore.";
  if (r.abertura) return "Abertura desfeita. A mesa voltou ao começo.";
  return voltouAoCampo ? "Turno desfeito. Pode reescrever." : "Turno desfeito.";
}
