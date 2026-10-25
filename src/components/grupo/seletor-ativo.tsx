"use client";

import { useEffect } from "react";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import { Avatar, quemAgiu } from "./avatar";

// "Agindo como": chips com as iniciais de cada personagem para passar o teclado na mesa local (hot-seat).
// Alt+1..9 troca direto. Pela rede dá para trocar também, mas avisa quando o personagem tem outro dono.

export function SeletorAtivo({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const { personagens } = mesa;
  const ativo = personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const agiram = mesa.campanha.modo === "rodada" ? quemAgiu(mesa) : null;
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? true;
  const dono = ativo?.jogador && ativo.jogador !== mesa.eu.apelido ? ativo.jogador : null;
  // o objeto `acoes` muda a cada render; a função em si é estável
  const escolher = acoes.escolherPersonagem;

  // Alt+número: usa e.code porque no Mac o Alt transforma a tecla em outro caractere
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (!m) return;
      const alvo = personagens[Number(m[1]) - 1];
      if (!alvo) return;
      e.preventDefault();
      escolher(alvo.id);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [personagens, escolher]);

  if (!personagens.length) return <span className="text-muted">Sem personagens: só dá para falar com o mestre ((assim)).</span>;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-muted">Agindo como</span>
      <div role="radiogroup" aria-label="Agindo como" className="flex flex-wrap items-center gap-1">
        {personagens.map((p, i) => {
          const eh = p.id === ativo?.id;
          const jaAgiu = agiram?.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={eh}
              onClick={() => acoes.escolherPersonagem(p.id)}
              title={`${p.ficha.nome}${i < 9 ? ` (Alt+${i + 1})` : ""}${jaAgiu ? " · já agiu nesta rodada" : ""}`}
              className={`relative flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 transition ${
                eh ? "border-ambar bg-ambar/10 pr-2.5 text-foreground" : "border-transparent pr-0.5 hover:border-border"
              }`}
            >
              <Avatar mesa={mesa} personagem={p} tamanho="sm" />
              {/* o nome só aparece no ativo (ou quando é o único), para caber em 375px */}
              {(eh || personagens.length === 1) && <span className="max-w-[9rem] truncate text-sm font-semibold text-pergaminho">{p.ficha.nome}</span>}
              {jaAgiu && (
                <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-musgo text-[8px] text-foreground" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {dono && !euLocal && <span className="text-[11px] text-ambar-forte">personagem de {dono}</span>}
    </div>
  );
}
