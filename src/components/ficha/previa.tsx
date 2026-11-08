"use client";

import type { ReactNode } from "react";
import type { PreviaFicha } from "@/app/acoes-ficha";
import type { AventuraPublica } from "@/lib/aventuras/tipos";
import { tomPadrao } from "@/lib/sistemas/sementes";
import type { OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
import { CartaoFicha } from "./painel-ficha";
import { ajustesTexto, resumoEstilo, Titulo, type Escolhas, type PersonagemParaTrazer } from "./passos";
import { grupoDaOpcao } from "./sugestoes";

// Prévia ao lado do assistente (desktop) e o resumo final antes de enviar.
// A prévia lateral é montada só com os dados públicos do sistema; o resumo pede ao servidor a ficha de verdade.

/** Respostas das opções de criação em texto legível ("Escola arcana: Evocação"). */
export function respostasOpcoes(opcoes: OpcaoCriacao[], e: Escolhas): [string, string][] {
  return opcoes
    .map((o): [string, string] => {
      // poder do Vampiro vem codificado da tela ("dominacao|1|0|Nublar Memória|"): mostra "Nublar Memória ●"; linha sem nome some
      const poder = (v: string) => {
        const m = v.match(/^[a-z_]+\|(\d)\|\d\|([^|]*)/);
        return m ? (m[2].trim() ? `${m[2].trim()} ${"●".repeat(Number(m[1]))}` : "") : v;
      };
      const valores = (e.extras[o.id] ?? []).map((v) => poder(v.trim())).filter(Boolean);
      const nomes = valores.map((v) => o.opcoes?.find((x) => x.id === v)?.nome ?? v);
      return [o.rotulo, nomes.join(", ")];
    })
    .filter(([, v]) => v);
}

function nomes(sistema: SistemaPublico, e: Escolhas) {
  const anc = sistema.ancestralidades.find((a) => a.id === e.ancestralidade);
  const classe = sistema.classes.find((c) => c.id === e.classe);
  const antecedente = sistema.antecedentes?.find((a) => a.id === e.antecedente);
  const daClasse = classe?.pericias ?? [];
  const pericias = [...new Set([...daClasse, ...e.pericias])].map((id) => sistema.pericias.find((p) => p.id === id)?.nome ?? id);
  return { anc, classe, antecedente, pericias };
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border/50 py-1.5 text-sm last:border-0">
      <span className="w-28 shrink-0 pt-px text-xs text-muted">{rotulo}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

export function PreviaLateral({ sistema, e, opcoes, copia }: { sistema: SistemaPublico; e: Escolhas; opcoes: OpcaoCriacao[]; copia?: PersonagemParaTrazer }) {
  const { anc, classe, antecedente, pericias } = nomes(sistema, e);
  // personagem trazido de outra mesa: a ficha já existe lá; aqui só o lembrete do que vem
  if (copia) {
    return (
      <div className="space-y-3 text-sm">
        <p className="hidden text-[11px] uppercase tracking-widest text-ambar-forte lg:block">Prévia da ficha · {sistema.nomeCurto}</p>
        <p className="titulo break-words text-2xl leading-tight text-pergaminho">{copia.nome}</p>
        {copia.linha && <p className="text-[13px] text-foreground/90">{copia.linha}</p>}
        <p className="text-xs text-muted">Trazido de {copia.campanha}: a ficha vem como está lá, descansada ({sistema.rotulos.pv.toLowerCase()} e recursos cheios, sem condições).</p>
      </div>
    );
  }
  const pv = (classe?.pvBase ?? 0) + (anc?.pv ?? 0);
  const respostas = respostasOpcoes(opcoes, e);
  const temAtributos = sistema.atributos.some((a) => e.atributos[a.id]);
  // as escolhas de regra aparecem sempre, com "a escolher" no que falta: a prévia vazia vira uma lista do que vem pela frente
  const regras: [string, string | undefined][] = [];
  if (sistema.ancestralidades.length) regras.push([sistema.rotulos.ancestralidade, anc?.nome]);
  if (sistema.classes.length) regras.push([sistema.rotulos.classe, classe?.nome]);
  if (sistema.antecedentes?.length) regras.push([sistema.rotulos.antecedente ?? "Antecedente", antecedente?.nome]);
  return (
    <div className="space-y-3 text-sm">
      <p className="hidden text-[11px] uppercase tracking-widest text-ambar-forte lg:block">Prévia da ficha · {sistema.nomeCurto}</p>
      <div>
        <p className={`titulo break-words text-2xl leading-tight ${e.nome.trim() ? "text-pergaminho" : "text-muted"}`}>{e.nome.trim() || "Sem nome ainda"}</p>
        {e.jogador.trim() && <p className="text-xs text-muted">de {e.jogador.trim()}</p>}
      </div>
      {regras.length > 0 && (
        <dl className="space-y-1 text-[13px]">
          {regras.map(([rotulo, valor]) => (
            <div key={rotulo} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted">{rotulo}</dt>
              <dd className={`min-w-0 truncate pr-0.5 text-right ${valor ? "text-foreground" : "italic text-muted"}`}>{valor ?? "a escolher"}</dd>
            </div>
          ))}
        </dl>
      )}
      {anc?.tracos?.length ? (
        <ul className="space-y-0.5 border-t border-border pt-2 text-xs leading-snug text-foreground/80">
          {anc.tracos.map((t) => (
            <li key={t} className="flex gap-1.5">
              <span className="text-ambar-forte" aria-hidden>
                •
              </span>
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      {(pv > 0 || (anc && ajustesTexto(sistema, anc).length > 0)) && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {pv > 0 && (
            <span className="rounded-full border border-border px-2 py-0.5">
              {sistema.rotulos.pv} base <span className="text-ambar">{pv}</span>
            </span>
          )}
          {anc && ajustesTexto(sistema, anc).length > 0 && <span className="rounded-full border border-border px-2 py-0.5 text-ambar">{ajustesTexto(sistema, anc).join(", ")}</span>}
        </div>
      )}
      {temAtributos && (
        <div className="grid grid-cols-3 gap-1">
          {sistema.atributos.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-surface-2/70 py-1 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">{a.abrev}</p>
              <p className="titulo text-base text-pergaminho">{e.atributos[a.id] || "—"}</p>
            </div>
          ))}
        </div>
      )}
      {pericias.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pericias.map((p) => (
            <span key={p} className="rounded-full border border-border px-2 py-0.5 text-xs">
              {p}
            </span>
          ))}
        </div>
      )}
      {respostas.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2 text-xs">
          {respostas.map(([r, v]) => (
            <p key={r}>
              <span className="text-muted">{r}:</span> {v}
            </p>
          ))}
        </div>
      )}
      {classe?.equipamento?.length ? <p className="border-t border-border pt-2 text-xs text-muted">Leva: {classe.equipamento.join(", ")}</p> : null}
      {e.historia.trim() && <p className="line-clamp-4 border-t border-border pt-2 text-xs italic text-muted">{e.historia}</p>}
    </div>
  );
}

type PropsResumo = {
  sistema: SistemaPublico;
  e: Escolhas;
  opcoes: OpcaoCriacao[];
  modo: "campanha" | "personagem";
  /** passos disponíveis, para os links de "editar" */
  passos: string[];
  irPara: (passo: string) => void;
  previa: PreviaFicha | null;
  carregando: boolean;
  /** aventura pronta marcada no passo da campanha */
  aventura?: AventuraPublica;
  /** personagem trazido de outra mesa: a ficha vem copiada dele (não há prévia nem passos de regra) */
  copia?: PersonagemParaTrazer;
};

export function Resumo({ sistema, e, opcoes, modo, passos, irPara, previa, carregando, aventura, copia }: PropsResumo) {
  const { anc, classe, antecedente, pericias } = nomes(sistema, e);
  const metodo = sistema.metodosAtributos.find((m) => m.id === e.metodo);
  const respostas = respostasOpcoes(opcoes, e);
  const editar = (passo: string) =>
    passos.includes(passo) ? (
      <button type="button" onClick={() => irPara(passo)} className="-my-1 ml-1.5 rounded px-1.5 py-1 text-xs text-ambar hover:bg-ambar/10 hover:underline">
        editar
      </button>
    ) : null;
  // Escolhas divididas em subpassos (Vampiro): cada resposta leva ao subpasso dela; o link sai na última resposta de cada um
  const passoDaResposta = (rotulo: string) => {
    const o = opcoes.find((x) => x.rotulo === rotulo);
    const grupo = o ? grupoDaOpcao(sistema.id, o) : null;
    return grupo && passos.includes(`opcoes:${grupo}`) ? `opcoes:${grupo}` : "opcoes";
  };
  const ultimaDoPasso = (i: number) => {
    const p = passoDaResposta(respostas[i][0]);
    return !respostas.slice(i + 1).some(([r]) => passoDaResposta(r) === p);
  };

  return (
    <>
      <Titulo ajuda="Confira antes de empurrar a porta. Depois disso, só o mestre (e os dados) mudam a ficha.">Tudo certo?</Titulo>
      {/* fora das regras de criação do livro: avisa, não bloqueia; marcar "de propósito" vira nota para o mestre */}
      {!copia && !carregando && previa?.ok && previa.avisos.length > 0 && (
        <div className="mb-5 rounded-lg border border-ambar/50 bg-ambar/10 px-4 py-3 text-sm" role="note">
          <p className="font-semibold text-ambar">Esta ficha está fora do livro</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground/90">
            {previa.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="fora_do_livro" value="1" className="accent-[var(--color-ambar,currentColor)]" />
              É de propósito (regra da casa): o mestre respeita os números
            </label>
            {passos.includes("atributos") && (
              <button type="button" onClick={() => irPara("atributos")} className="rounded px-1.5 py-1 text-xs text-ambar hover:bg-ambar/10 hover:underline">
                ajustar atributos
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted">Dá para criar assim mesmo.</p>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="cartao self-start px-4 py-2">
          <p className="pb-1 pt-2 text-[11px] uppercase tracking-widest text-ambar-forte">O personagem</p>
          <Linha rotulo="Sistema">
            {sistema.nomeCurto}
            {editar("sistema")}
          </Linha>
          {copia && (
            <>
              <Linha rotulo="Trazido de">
                {copia.campanha}
              </Linha>
              <Linha rotulo="Nome">{copia.nome}</Linha>
              {copia.linha && <Linha rotulo="Ficha">{copia.linha}</Linha>}
              <Linha rotulo="Ao chegar">
                vida e recursos cheios{sistema.id === "vtm5" ? ", Fome 1" : ""}, sem condições · inventário mantido · XP {e.zerarXp ? "zerado" : "mantido"}
              </Linha>
            </>
          )}
          {!copia && (
            <Linha rotulo="Nome">
              {e.nome.trim() || <span className="text-sangue">sem nome</span>}
              {e.jogador.trim() && <span className="text-muted"> · {e.jogador.trim()}</span>}
              {editar("identidade")}
            </Linha>
          )}
          {!copia && anc && (
            <Linha rotulo={sistema.rotulos.ancestralidade}>
              {anc.nome}
              {editar("ancestralidade")}
            </Linha>
          )}
          {!copia && classe && (
            <Linha rotulo={sistema.rotulos.classe}>
              {classe.nome}
              {editar("classe")}
            </Linha>
          )}
          {!copia && antecedente && (
            <Linha rotulo={sistema.rotulos.antecedente ?? "Antecedente"}>
              {antecedente.nome}
              {editar("antecedente")}
            </Linha>
          )}
          {!copia && sistema.atributos.length > 0 && (
            <Linha rotulo="Atributos">
              {sistema.atributos.some((a) => e.atributos[a.id])
                ? sistema.atributos.map((a) => `${a.abrev} ${e.atributos[a.id] || "—"}`).join(" · ")
                : `o sistema distribui (${metodo?.nome ?? "padrão"})`}
              {editar("atributos")}
            </Linha>
          )}
          {!copia && pericias.length > 0 && (
            <Linha rotulo="Perícias">
              {pericias.join(", ")}
              {editar("pericias")}
            </Linha>
          )}
          {(copia ? [] : respostas).map(([r, v], i) => (
            <Linha key={r} rotulo={r}>
              {v}
              {ultimaDoPasso(i) && editar(passoDaResposta(r))}
            </Linha>
          ))}
          {modo === "campanha" && (
            <div className="-mx-4 mt-2 border-t border-border px-4 pt-2">
              <p className="pb-1 pt-1 text-[11px] uppercase tracking-widest text-ambar-forte">A mesa</p>
              <Linha rotulo="Campanha">
                {e.campanha.trim() || `A saga de ${e.nome.trim() || "alguém"}`}
                {editar("campanha")}
              </Linha>
              {aventura && (
                <Linha rotulo="Aventura">
                  📜 {aventura.titulo} <span className="text-muted">· {aventura.duracao} · o mestre tem o roteiro</span>
                </Linha>
              )}
              <Linha rotulo="Cenário">{e.cenario.trim() ? <span className="line-clamp-3">{e.cenario}</span> : <span className="text-muted">o mestre inventa</span>}</Linha>
              <Linha rotulo="Tom">{e.tom.trim() || tomPadrao(e.sistemaId)}</Linha>
              <Linha rotulo="Mesa">
                {e.modoMesa === "rodada" ? "por rodada" : "livre"}
                {e.pin ? " · com PIN na rede" : " · sem PIN"}
              </Linha>
              <Linha rotulo="Mestre">{resumoEstilo(e)}</Linha>
              {e.instrucoes.trim() && (
                <Linha rotulo="Regras da casa">
                  <span className="line-clamp-3">{e.instrucoes}</span>
                </Linha>
              )}
              <Linha rotulo="Início">{e.adicionarMais ? "depois de sentar mais gente" : "o mestre abre a cena na hora"}</Linha>
            </div>
          )}
        </div>

        <div className="cartao p-4">
          <p className="mb-3 text-[11px] uppercase tracking-widest text-ambar-forte">Como a ficha vai ficar</p>
          {copia && (
            <p className="text-sm text-foreground/90">
              A ficha de <span className="font-semibold text-pergaminho">{copia.nome}</span> vem copiada de {copia.campanha}, do jeito que está lá: atributos, perícias,
              inventário{e.zerarXp ? " e nível" : ", nível e XP"}. O que muda é o fôlego: {sistema.rotulos.pv.toLowerCase()} e recursos cheios
              {sistema.id === "vtm5" ? ", Fome 1, sem Manchas" : ""}, nenhuma condição. A mesa de origem continua com o original.
            </p>
          )}
          {!copia && carregando && <p className="animate-pulse text-sm italic text-muted">O mestre rabisca a ficha…</p>}
          {!carregando && previa?.ok && (
            <>
              <CartaoFicha ficha={previa.ficha} blocos={previa.blocos} sistema={sistema} jogador={e.jogador.trim() || undefined} />
              <p className="mt-3 text-[11px] text-muted">Valores que o sistema rola na criação podem mudar quando você entrar.</p>
            </>
          )}
          {!carregando && previa && !previa.ok && <p className="text-sm text-sangue">{previa.erro}</p>}
        </div>
      </div>
    </>
  );
}
