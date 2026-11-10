"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import { Avatar, outroAparelhoCom, quemAgiu } from "./avatar";
import { Icone } from "@/components/icones";

// "Agindo como": chips com as iniciais de cada personagem para passar o teclado na mesa local (hot-seat).
// Alt+1..9 troca direto. Pela rede dá para trocar também, mas avisa quando o personagem tem outro dono.
// Quem entrou só assistindo (pela rede, sem reivindicar) vê o convite para escolher um personagem; o chip de um personagem
// em uso em outro aparelho (marca de celular) ou cujo dono está na mesa (marca de cadeado) pede confirmação antes de ser assumido.

export function SeletorAtivo({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const { personagens } = mesa;
  const ativo = personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const agiram = mesa.campanha.modo === "rodada" ? quemAgiu(mesa) : null;
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? true;
  const dono = ativo?.jogador && ativo.jogador !== mesa.eu.apelido ? ativo.jogador : null;
  // o objeto `acoes` muda a cada render; a função em si é estável
  const escolher = acoes.escolherPersonagem;
  // personagens já confirmados ("assumir mesmo assim?"): a pergunta é feita uma vez só
  const confirmados = useRef(new Set<number>());

  /** Troca o personagem ativo; se outro aparelho está com ele agora, confirma antes (uma vez). */
  function assumir(pid: number) {
    const outro = outroAparelhoCom(mesa, pid);
    if (outro && !confirmados.current.has(pid)) {
      const nome = personagens.find((p) => p.id === pid)?.ficha.nome ?? "esse personagem";
      if (!window.confirm(`${outro.apelido} já está jogando com ${nome} agora. Assumir mesmo assim?`)) return;
      confirmados.current.add(pid);
    }
    escolher(pid);
  }
  // o atalho de teclado chama sempre a versão mais recente (com a presença de agora) sem religar o ouvinte a cada render
  const assumirRef = useRef(assumir);
  useEffect(() => {
    assumirRef.current = assumir;
  });

  // Alt+número: usa e.code porque no Mac o Alt transforma a tecla em outro caractere
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (!m) return;
      const alvo = personagens[Number(m[1]) - 1];
      if (!alvo) return;
      e.preventDefault();
      assumirRef.current(alvo.id);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [personagens]);

  if (!personagens.length) return <span className="text-muted">Sem personagens: só dá para falar com o mestre ((assim)).</span>;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {ativo ? (
        <span className="text-muted">Agindo como</span>
      ) : (
        // espectador (pela rede, sem reivindicar): nenhum chip marcado e o caminho para a porta da mesa
        <span className="text-muted" data-so-assistindo>
          Você está só assistindo ·{" "}
          <Link href={`/mesa/${mesa.campanha.id}/entrar`} className="text-ambar underline-offset-2 hover:underline">
            escolher personagem →
          </Link>
        </span>
      )}
      <div role="radiogroup" aria-label="Agindo como" className="flex flex-wrap items-center gap-1">
        {personagens.map((p, i) => {
          const eh = p.id === ativo?.id;
          const jaAgiu = agiram?.has(p.id);
          const outro = outroAparelhoCom(mesa, p.id);
          // celular: alguém está agindo com ele em outro aparelho; cadeado: o dono está na mesa (em outro aparelho), mesmo que com outro personagem
          const emUso = outro?.personagemId === p.id;
          // o nome só aparece no ativo (ou quando é o único), para caber em 375px
          const comNome = eh || personagens.length === 1;
          const marca = emUso ? <Icone nome="phone" /> : outro ? <Icone nome="lock" /> : null;
          const detalhe = emUso ? ` · em uso no aparelho de ${outro.apelido}` : outro ? ` · personagem de ${p.jogador}, que está na mesa` : "";
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={eh}
              data-em-uso={emUso || undefined}
              onClick={() => assumir(p.id)}
              title={`${p.ficha.nome}${i < 9 ? ` (Alt+${i + 1})` : ""}${jaAgiu ? " · já agiu nesta rodada" : ""}${detalhe}`}
              className={`relative flex min-h-10 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 transition focus-visible:outline-2 focus-visible:outline-ambar sm:min-h-0 ${
                eh ? "border-ambar bg-ambar/10 text-foreground" : "border-transparent hover:border-border"
              } ${comNome ? "pr-2.5" : "pr-0.5"}`}
            >
              <Avatar mesa={mesa} personagem={p} tamanho="sm" />
              {comNome && <span className="max-w-[9rem] truncate text-sm font-semibold text-pergaminho">{p.ficha.nome}</span>}
              {jaAgiu && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-musgo text-[11px] text-foreground" aria-hidden>
                  <Icone nome="check" />
                </span>
              )}
              {marca && (
                <span className="absolute -bottom-0.5 left-4 grid size-4 place-items-center rounded-full bg-surface text-[11px] leading-none" aria-hidden>
                  {marca}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {dono && !euLocal && <span className="text-xs text-ambar-forte">personagem de {dono}</span>}
    </div>
  );
}
