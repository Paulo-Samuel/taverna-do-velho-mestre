"use client";

import { useEffect, useRef, useState } from "react";
import { ESCALAS_FONTE, salvarPreferenciasLeitor, useMenosMovimento, usePreferenciasLeitor, type ModoLeitura } from "./preferencias";
import { suportaRevelar } from "./use-revelar";

// Botão do cabeçalho das mesas: escolhe como ler a história ("📖 Cena a cena" ou "📜 Rolagem") e liga/desliga o texto se
// revelando aos poucos e o tamanho da letra (A− / A+). Preferência deste navegador (localStorage).
// Embaixo, o "🌙 Encerrar a noite" (com confirmação): o mestre fecha a cena, distribui XP e, no Vampiro, faz o teste de Remorso
// (POST /api/campanhas/[id]/encerrar; 409 quando ele está narrando ou há teste esperando o dado).

function Icone({ modo }: { modo: ModoLeitura }) {
  return modo === "cenas" ? (
    // páginas de livro
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" fill="currentColor" fillOpacity={0.15} />
      <path d="M12 6.5v13M15 10.5l2 1.5-2 1.5" />
    </svg>
  ) : (
    // pergaminho correndo
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 0-4H7" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 11h6M9 13.5h4" />
    </svg>
  );
}

const OPCOES: [ModoLeitura, string, string, string][] = [
  ["cenas", "📖", "Cena a cena", "Só a cena atual, em páginas. Nada de rolar."],
  ["rolagem", "📜", "Rolagem", "A história inteira numa coluna só, para reler o que passou."],
];

const DICAS_FONTE = ["Miúda, para quem tem olho de águia.", "A de sempre.", "Mais folgada.", "Grande, para ler de longe da tela."];

type EstadoEncerrar = { fase: "quieto" | "confirmar" | "enviando"; erro: string | null };

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Pede ao servidor para encerrar a noite. Devolve null quando deu certo, ou o recado para mostrar. */
async function pedirEncerrar(campanhaId: number): Promise<string | null> {
  try {
    const r = await fetch(`/api/campanhas/${campanhaId}/encerrar`, { method: "POST" });
    const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
    if (r.ok) return null;
    // a rota ainda não existe (404 sem o JSON da taverna)
    if (r.status === 404 && !corpo?.erro) return "Ainda não disponível: o mestre ainda está aprendendo a fechar a noite.";
    if (r.status === 409) return `Agora não: ${minuscula(corpo?.erro ?? "o mestre está narrando ou há um teste esperando o dado.")}`;
    return corpo?.erro ?? `O mestre tropeçou no tapete (erro ${r.status}). Tente de novo.`;
  } catch {
    return "Sem conexão com a taverna. Tente de novo.";
  }
}

/**
 * acima: o menu abre para cima (botão no pé de um painel); esquerda: alinhado pela esquerda do botão (botão no canto esquerdo).
 * campanhaId: mostra o "Encerrar a noite"; aoEncerrar avisa a mesa que deu certo.
 */
export function MenuLeitura({
  className = "",
  acima = false,
  esquerda = false,
  campanhaId,
  aoEncerrar,
}: {
  className?: string;
  acima?: boolean;
  esquerda?: boolean;
  campanhaId?: number;
  aoEncerrar?: () => void;
}) {
  const { modo, animar, fonte } = usePreferenciasLeitor();
  const menos = useMenosMovimento();
  const [aberto, setAberto] = useState(false);
  const [encerrar, setEncerrar] = useState<EstadoEncerrar>({ fase: "quieto", erro: null });
  const caixa = useRef<HTMLDivElement>(null);

  async function confirmarEncerrar() {
    if (!campanhaId) return;
    setEncerrar({ fase: "enviando", erro: null });
    const erro = await pedirEncerrar(campanhaId);
    if (erro) {
      setEncerrar({ fase: "quieto", erro });
      return;
    }
    setEncerrar({ fase: "quieto", erro: null });
    setAberto(false);
    aoEncerrar?.();
  }

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

  const atual = OPCOES.find((o) => o[0] === modo) ?? OPCOES[0];
  return (
    <div ref={caixa} className={`relative shrink-0 ${className}`} data-menu-leitura>
      <button
        type="button"
        onClick={() => {
          setAberto((v) => !v);
          setEncerrar({ fase: "quieto", erro: null });
        }}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={`Modo de leitura: ${atual[2]}`}
        title={`Modo de leitura: ${atual[2]}`}
        className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-2 hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar ${aberto ? "text-ambar" : "text-muted"}`}
      >
        <Icone modo={modo} />
      </button>
      {aberto && (
        <div role="dialog" aria-label="Modo de leitura" className={`cartao surgir bg-surface! absolute z-50 max-h-[calc(100dvh-5rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain p-3 text-foreground ${acima ? "bottom-full mb-2" : "top-full mt-2"} ${esquerda ? "left-0" : "right-0"}`}>
          <p className="titulo mb-2 text-sm text-ambar">Como ler a história</p>
          <div role="radiogroup" aria-label="Modo de leitura" className="space-y-1.5">
            {OPCOES.map(([id, emoji, nome, dica]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={modo === id}
                data-modo={id}
                onClick={() => {
                  salvarPreferenciasLeitor({ modo: id });
                  setAberto(false);
                }}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                  modo === id ? "border-ambar/70 bg-ambar/10" : "border-border hover:border-ambar/50"
                }`}
              >
                <span aria-hidden className="text-lg leading-6">
                  {emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{nome}</span>
                  <span className="block text-[11px] leading-snug text-muted">{dica}</span>
                </span>
              </button>
            ))}
          </div>
          {/* tamanho da letra da narração: vale para os dois modos */}
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs" data-tamanho-letra>
            <span className="min-w-0 flex-1">
              Tamanho da letra
              <span className="block text-[11px] leading-snug text-muted">{DICAS_FONTE[fonte]}</span>
            </span>
            <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Tamanho da letra">
              <button
                type="button"
                onClick={() => salvarPreferenciasLeitor({ fonte: fonte - 1 })}
                disabled={fonte <= 0}
                aria-label="Diminuir a letra"
                title="Diminuir a letra"
                className="grid size-9 place-items-center rounded-md border border-border text-xs hover:border-ambar/60 hover:text-ambar disabled:opacity-35"
                data-letra="menor"
              >
                A−
              </button>
              <span className="flex items-center gap-1 px-0.5" aria-hidden>
                {ESCALAS_FONTE.map((_, i) => (
                  <span key={i} className={`size-1.5 rounded-full ${i === fonte ? "bg-ambar" : i < fonte ? "bg-ambar/45" : "bg-muted/35"}`} />
                ))}
              </span>
              <button
                type="button"
                onClick={() => salvarPreferenciasLeitor({ fonte: fonte + 1 })}
                disabled={fonte >= ESCALAS_FONTE.length - 1}
                aria-label="Aumentar a letra"
                title="Aumentar a letra"
                className="grid size-9 place-items-center rounded-md border border-border text-base hover:border-ambar/60 hover:text-ambar disabled:opacity-35"
                data-letra="maior"
              >
                A+
              </button>
            </div>
          </div>
          <label className={`mt-3 flex items-start gap-2 border-t border-border pt-2.5 text-xs ${modo !== "cenas" ? "opacity-50" : ""}`}>
            <input
              type="checkbox"
              checked={animar && !menos}
              disabled={menos || modo !== "cenas"}
              onChange={(e) => salvarPreferenciasLeitor({ animar: e.target.checked })}
              className="mt-0.5 accent-ambar"
              data-animar
            />
            <span>
              Texto se revelando aos poucos
              <span className="block text-[11px] leading-snug text-muted">
                {menos
                  ? "Desligado: seu sistema pediu menos movimento."
                  : !suportaRevelar()
                    ? "Este navegador não sabe fazer o truque; o texto aparece inteiro."
                    : "Clique no texto, Espaço ou Enter mostram tudo de uma vez. O mestre finge que não se ofende."}
              </span>
            </span>
          </label>
          {campanhaId !== undefined && (
            <div className="mt-3 border-t border-border pt-2.5 text-xs" data-encerrar>
              {encerrar.fase === "quieto" ? (
                <button
                  type="button"
                  onClick={() => setEncerrar({ fase: "confirmar", erro: null })}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-border px-3 py-1.5 text-left transition hover:border-ambar/60 hover:text-ambar"
                  data-encerrar-noite
                >
                  <span aria-hidden className="text-base">
                    🌙
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Encerrar a noite</span>
                    <span className="block text-[11px] leading-snug text-muted">Fecha a sessão; o livro ganha um fim de capítulo.</span>
                  </span>
                </button>
              ) : (
                <div className="rounded-lg border border-ambar/50 bg-ambar/5 p-2.5" role="alertdialog" aria-label="Encerrar a noite?">
                  <p className="leading-snug text-foreground/90">O mestre fecha a cena, distribui XP e, no Vampiro, faz o teste de Remorso. Encerrar?</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEncerrar({ fase: "quieto", erro: null })}
                      disabled={encerrar.fase === "enviando"}
                      className="min-h-9 rounded-md px-3 text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Ainda não
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmarEncerrar()}
                      disabled={encerrar.fase === "enviando"}
                      className="btn-ambar min-h-9 px-3 py-1.5 text-xs"
                      data-confirmar-encerrar
                    >
                      {encerrar.fase === "enviando" ? "Encerrando…" : "🌙 Encerrar"}
                    </button>
                  </div>
                </div>
              )}
              {encerrar.erro && (
                <p className="mt-2 rounded-md border border-sangue/50 bg-sangue/10 px-2.5 py-1.5 leading-snug text-foreground/90" role="alert" data-erro-encerrar>
                  {encerrar.erro}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
