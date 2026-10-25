"use client";

import type { ReactNode } from "react";
import type { PreviaFicha } from "@/app/acoes-ficha";
import type { OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
import { CartaoFicha } from "./painel-ficha";
import { ajustesTexto, Titulo, type Escolhas } from "./passos";

// Prévia ao lado do assistente (desktop) e o resumo final antes de enviar.
// A prévia lateral é montada só com os dados públicos do sistema; o resumo pede ao servidor a ficha de verdade.

/** Respostas das opções de criação em texto legível ("Escola arcana: Evocação"). */
export function respostasOpcoes(opcoes: OpcaoCriacao[], e: Escolhas): [string, string][] {
  return opcoes
    .map((o): [string, string] => {
      const valores = (e.extras[o.id] ?? []).map((v) => v.trim()).filter(Boolean);
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
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted">{rotulo}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

export function PreviaLateral({ sistema, e, opcoes }: { sistema: SistemaPublico; e: Escolhas; opcoes: OpcaoCriacao[] }) {
  const { anc, classe, antecedente, pericias } = nomes(sistema, e);
  const pv = (classe?.pvBase ?? 0) + (anc?.pv ?? 0);
  const respostas = respostasOpcoes(opcoes, e);
  const temAtributos = sistema.atributos.some((a) => e.atributos[a.id]);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[10px] uppercase tracking-widest text-ambar-forte">Prévia da ficha · {sistema.nomeCurto}</p>
      <div>
        <p className={`titulo break-words text-2xl leading-tight ${e.nome.trim() ? "text-pergaminho" : "text-muted/60"}`}>{e.nome.trim() || "Sem nome ainda"}</p>
        <p className="text-muted">{[anc?.nome, classe?.nome].filter(Boolean).join(" · ") || "—"}</p>
        {antecedente && <p className="text-xs text-muted">{antecedente.nome}</p>}
      </div>
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
};

export function Resumo({ sistema, e, opcoes, modo, passos, irPara, previa, carregando }: PropsResumo) {
  const { anc, classe, antecedente, pericias } = nomes(sistema, e);
  const metodo = sistema.metodosAtributos.find((m) => m.id === e.metodo);
  const respostas = respostasOpcoes(opcoes, e);
  const editar = (passo: string) =>
    passos.includes(passo) ? (
      <button type="button" onClick={() => irPara(passo)} className="ml-2 text-xs text-ambar hover:underline">
        editar
      </button>
    ) : null;

  return (
    <>
      <Titulo ajuda="Confira antes de empurrar a porta. Depois disso, só o mestre (e os dados) mudam a ficha.">Tudo certo?</Titulo>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Linha rotulo="Sistema">
            {sistema.nomeCurto}
            {editar("sistema")}
          </Linha>
          <Linha rotulo="Nome">
            {e.nome.trim() || <span className="text-sangue">sem nome</span>}
            {e.jogador.trim() && <span className="text-muted"> · {e.jogador.trim()}</span>}
            {editar("identidade")}
          </Linha>
          {anc && (
            <Linha rotulo={sistema.rotulos.ancestralidade}>
              {anc.nome}
              {editar("ancestralidade")}
            </Linha>
          )}
          {classe && (
            <Linha rotulo={sistema.rotulos.classe}>
              {classe.nome}
              {editar("classe")}
            </Linha>
          )}
          {antecedente && (
            <Linha rotulo={sistema.rotulos.antecedente ?? "Antecedente"}>
              {antecedente.nome}
              {editar("antecedente")}
            </Linha>
          )}
          {sistema.atributos.length > 0 && (
            <Linha rotulo="Atributos">
              {sistema.atributos.some((a) => e.atributos[a.id])
                ? sistema.atributos.map((a) => `${a.abrev} ${e.atributos[a.id] || "—"}`).join(" · ")
                : `o sistema distribui (${metodo?.nome ?? "padrão"})`}
              {editar("atributos")}
            </Linha>
          )}
          {pericias.length > 0 && (
            <Linha rotulo="Perícias">
              {pericias.join(", ")}
              {editar("pericias")}
            </Linha>
          )}
          {respostas.map(([r, v], i) => (
            <Linha key={r} rotulo={r}>
              {v}
              {i === respostas.length - 1 && editar("opcoes")}
            </Linha>
          ))}
          {modo === "campanha" && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <Linha rotulo="Campanha">
                {e.campanha.trim() || `A saga de ${e.nome.trim() || "alguém"}`}
                {editar("campanha")}
              </Linha>
              <Linha rotulo="Cenário">{e.cenario.trim() ? <span className="line-clamp-3">{e.cenario}</span> : <span className="text-muted">o mestre inventa</span>}</Linha>
              <Linha rotulo="Tom">{e.tom.trim() || "sombrio e debochado"}</Linha>
              <Linha rotulo="Mesa">
                {e.modoMesa === "rodada" ? "por rodada" : "livre"}
                {e.pin ? " · com PIN na rede" : " · sem PIN"}
              </Linha>
              <Linha rotulo="Início">{e.adicionarMais ? "depois de sentar mais gente" : "o mestre abre a cena na hora"}</Linha>
            </div>
          )}
        </div>

        <div className="cartao p-4">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-ambar-forte">Como a ficha vai ficar</p>
          {carregando && <p className="animate-pulse text-sm italic text-muted">O mestre rabisca a ficha…</p>}
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
