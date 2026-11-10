"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BotaoFixar } from "@/components/fatos/fixar-selecao";
import { PainelFatos } from "@/components/fatos/painel-fatos";
import { resumoDaEntrada, type ControleFatos } from "@/components/fatos/use-fatos";
import { Convite } from "@/components/presenca/convite";
import { MenuLeitura } from "@/components/leitor/menu-leitura";
import type { AcoesMesa, Mesa } from "@/lib/cliente/use-mesa";
import type { PersonagemVisivel } from "@/lib/mesa";
import { rotuloDaAtitude } from "@/lib/atitude-npc";
import type { BlocoFicha, EntradaDiario } from "@/lib/sistemas/tipos";
import { AvisoAjuste, BotaoRemorso, BotoesMarcador, NotasJogador, useAjusteFicha, type AjusteFicha } from "@/components/ficha/ajuste-ficha";
import { corDoNome } from "./cores";
import { fonteGotica } from "./fonte-gotica";
import { Retrato, RetratoSVG } from "./retrato";
import { retratoDaEntrada } from "./retrato/dados";
import { EstadoVazio } from "@/components/estado-vazio";
import { useFocoPreso } from "@/lib/cliente/use-foco-preso";
import { Icone, type NomeIcone } from "@/components/icones";

// Códex do modo história: gaveta recolhível à esquerda (tela cheia no celular) com o personagem, as missões,
// as pessoas e os lugares que o mestre anotou no diário, o grupo e os fatos fixados. Tecla C abre e fecha; Esc fecha.

export type AbaCodex = "personagem" | "missoes" | "pessoas" | "lugares" | "grupo" | "fatos";

const ABAS: [AbaCodex, string][] = [
  ["personagem", "Ficha"],
  ["missoes", "Missões"],
  ["pessoas", "Pessoas"],
  ["lugares", "Lugares"],
  ["grupo", "Grupo"],
];

/** O jogador deste aparelho pode assumir este personagem? (mesmo critério da mesa avançada) */
export function podeAssumir(mesa: Mesa, p: PersonagemVisivel): boolean {
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? false;
  return euLocal || !p.jogador || p.jogador === mesa.eu.apelido;
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{titulo}</h4>
      {children}
    </section>
  );
}

function Barra({ rotulo, atual: lido, max: maxLido, cor, ajuste }: { rotulo: string; atual: number; max: number; cor?: string; ajuste?: AjusteFicha }) {
  // com ajuste (ficha do jogador), −/+ discretos ao lado do número; o valor já mostra os cliques a caminho do servidor
  const alvo = ajuste?.alvoDaBarra(rotulo, cor) ?? null;
  const v = alvo && ajuste ? ajuste.valor(alvo) : null;
  const atual = v?.atual ?? lido;
  const max = v?.max ?? maxLido;
  const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0;
  // magia e sanidade nos matizes do tema (os mesmos valores da ficha da mesa avançada)
  const fundo =
    cor === "magia"
      ? "bg-[var(--matiz-1)]"
      : cor === "sanidade"
        ? "bg-[var(--matiz-5)]"
        : cor === "vida"
          ? pct > 50
            ? "bg-musgo"
            : pct > 20
              ? "bg-ambar"
              : "bg-sangue"
          : "bg-ambar";
  return (
    <div className="group/marcador" role="group" aria-label={`${rotulo}: ${atual} de ${max}`}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{rotulo}</span>
        {alvo && ajuste ? (
          <BotoesMarcador ajuste={ajuste} alvo={alvo}>
            <span className="tabular-nums">
              <span className={v?.pendente ? "text-ambar" : "text-pergaminho"}>{atual}</span>
              <span className="text-muted">/{max}</span>
            </span>
          </BotoesMarcador>
        ) : (
          <span className="tabular-nums">
            <span className="text-pergaminho">{atual}</span>
            <span className="text-muted">/{max}</span>
          </span>
        )}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-background/70 ring-1 ring-border">
        <div className={`h-full rounded-full transition-[width] duration-[var(--mov-barra)] ease-out motion-reduce:transition-none ${fundo}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bloco({ b, ajuste }: { b: BlocoFicha; ajuste?: AjusteFicha }) {
  switch (b.tipo) {
    case "barras":
      return (
        <div className="mt-4 space-y-3">
          {b.itens.map((x, i) => (
            <Barra key={`${x.rotulo}-${i}`} {...x} ajuste={ajuste} />
          ))}
        </div>
      );
    case "grade": {
      const grade = (
        <div className="grid grid-cols-3 gap-1.5">
          {b.itens.map((x, i) => (
            <div key={`${x.rotulo}-${i}`} className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5 text-center" title={x.detalhe}>
              <p className="text-[11px] uppercase tracking-wider text-muted">{x.rotulo}</p>
              <p className="tabular-nums text-pergaminho">{x.valor}</p>
            </div>
          ))}
        </div>
      );
      return b.titulo ? <Secao titulo={b.titulo}>{grade}</Secao> : <div className="mt-4">{grade}</div>;
    }
    case "etiquetas":
      return (
        <Secao titulo={b.titulo}>
          {b.itens.length ? (
            <div className="flex flex-wrap gap-1.5">
              {b.itens.map((x, i) => (
                <span key={`${x}-${i}`} className="etiqueta px-2.5 text-sm text-foreground/90">
                  {x}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted">Nada por aqui.</p>
          )}
        </Secao>
      );
    case "lista":
      return (
        <Secao titulo={b.titulo}>
          {b.itens.length ? (
            <ul className="space-y-1 text-sm">
              {b.itens.map((x, i) => (
                <li key={`${x}-${i}`} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ambar/70" aria-hidden />
                  <span className="text-foreground/90">{x}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-muted">Nada por aqui.</p>
          )}
        </Secao>
      );
    case "texto":
      return (
        <Secao titulo={b.titulo}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{b.texto}</p>
        </Secao>
      );
  }
}

function AbaPersonagem({ mesa, p, aoRemorso }: { mesa: Mesa; p: PersonagemVisivel | null; aoRemorso?: (mensagemId: number | null) => void }) {
  if (!p) return <p className="text-sm italic text-muted">Nenhum personagem nesta mesa ainda.</p>;
  // key: trocar de personagem zera os cliques pendentes e reabre as anotações do outro
  return <FichaCodex key={p.id} mesa={mesa} p={p} aoRemorso={aoRemorso} />;
}

function FichaCodex({ mesa, p, aoRemorso }: { mesa: Mesa; p: PersonagemVisivel; aoRemorso?: (mensagemId: number | null) => void }) {
  const ajuste = useAjusteFicha(p, mesa.sistema.rotulos, mesa.ocupado);
  const s = mesa.sistema;
  const origem = s.ancestralidades.find((a) => a.id === p.ficha.ancestralidade)?.nome ?? p.ficha.ancestralidade;
  const classe = s.classes.find((c) => c.id === p.ficha.classe)?.nome ?? p.ficha.classe;
  const temBarras = p.blocos.some((b) => b.tipo === "barras");
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Retrato ficha={p.ficha} tamanho={128} />
        <h3 className={`${fonteGotica.className} mt-3 text-3xl leading-tight`} style={{ color: corDoNome(p.ficha.nome) }}>
          {p.ficha.nome}
        </h3>
        <p className="text-sm text-muted">
          {[origem, classe].filter(Boolean).join(" ")} · {s.rotulos.nivel} {p.ficha.nivel}
        </p>
      </div>
      {/* ajuste manual (o mestre esqueceu o dano?): −/+ aparecem ao passar o mouse; no celular, este botão liga */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={ajuste.alternarEdicao}
          aria-pressed={ajuste.editando}
          title="Corrigir à mão a vida e os recursos"
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs transition sm:min-h-8 ${ajuste.editando ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-muted hover:border-ambar hover:text-ambar"}`}
        >
          <Icone nome={ajuste.editando ? "check" : "pencil"} />
          {ajuste.editando ? "pronto" : "ajustar"}
        </button>
      </div>
      {/* Vampiro: as Manchas só sobem à mão; quem as limpa é o teste de Remorso, rolado aqui */}
      {podeAssumir(mesa, p) && <BotaoRemorso personagem={p} bloqueado={mesa.ocupado} aoPedir={aoRemorso} className="mt-2" />}
      <AvisoAjuste ajuste={ajuste} />
      {!temBarras && <Barra rotulo={s.rotulos.pv} atual={p.ficha.pv} max={p.ficha.pvMax} cor="vida" ajuste={ajuste} />}
      {p.blocos.length ? (
        p.blocos.map((b, i) => <Bloco key={i} b={b} ajuste={ajuste} />)
      ) : (
        <Secao titulo="Bolsa">
          <p className="text-sm">
            {p.ficha.dinheiro} {s.rotulos.dinheiro}
          </p>
        </Secao>
      )}
      <Secao titulo="Minhas anotações">
        <NotasJogador campanhaId={p.campanhaId} personagemId={p.id} linhas={4} />
      </Secao>
    </div>
  );
}

/** Rótulo e matiz de cada status: "" é o âmbar do tema, null é a plaquinha neutra (`etiqueta`). */
const STATUS: Record<string, [string, string | null]> = {
  aberta: ["em andamento", ""],
  concluida: ["concluída", "matiz-2"],
  falhou: ["fracassou", "matiz-4"],
  aliado: ["aliado", "matiz-2"],
  amigo: ["amigo", "matiz-2"],
  neutro: ["neutro", null],
  hostil: ["hostil", "matiz-4"],
  inimigo: ["inimigo", "matiz-4"],
  morto: ["morto", null],
};

function Selo({ status }: { status: string }) {
  if (!status) return null;
  const [rotulo, matiz] = STATUS[status] ?? [status, null];
  const base = matiz === null ? `etiqueta ${status === "morto" ? "line-through" : ""}` : `etiqueta-matiz ${matiz}`;
  return <span className={`${base} shrink-0 text-[11px] uppercase tracking-wider`}>{rotulo}</span>;
}

/** Matiz da borda do cartão de uma pessoa conforme a atitude (aliado verde, hostil vermelho); o resto fica na borda comum. */
function matizDaPessoa(status: string): string | null {
  const matiz = STATUS[status]?.[1];
  return status !== "aberta" && matiz ? matiz : null;
}

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function Campo({ rotulo, valor }: { rotulo: string; valor: unknown }) {
  const t = texto(valor);
  if (!t) return null;
  return (
    <p className="text-sm leading-snug">
      <span className="text-muted">{rotulo}: </span>
      <span className="text-foreground/90">{t}</span>
    </p>
  );
}

function AbaMissoes({ entradas, fatos }: { entradas: EntradaDiario[]; fatos: ControleFatos }) {
  const missoes = entradas.filter((e) => e.tipo === "missao").sort((a, b) => Number(a.status !== "aberta") - Number(b.status !== "aberta"));
  if (!missoes.length)
    return (
      <EstadoVazio icone="scroll" dica="O mestre anota aqui quando alguém pedir um favor.">
        Nenhuma missão ainda. O mundo está esperando.
      </EstadoVazio>
    );
  return (
    <ul className="space-y-3">
      {missoes.map((m) => {
        // missão encerrada: o corpo recua para o tom apagado, o título e o selo seguem legíveis (sem opacidade no cartão)
        const encerrada = m.status !== "aberta";
        const pistas = Array.isArray(m.dados?.pistas) ? (m.dados.pistas as unknown[]).filter((x): x is string => typeof x === "string") : [];
        return (
          <li key={m.id} className="rounded-lg border border-border/80 bg-surface-2/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-pergaminho">{m.titulo}</p>
              <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-1">
                <Selo status={m.status} />
                <BotaoFixar texto={resumoDaEntrada(m)} controle={fatos} rotulo={m.titulo} />
              </div>
            </div>
            {m.texto && <p className={`mt-1 text-sm leading-relaxed ${encerrada ? "text-muted" : "text-foreground/85"}`}>{m.texto}</p>}
            <div className="mt-2 space-y-0.5">
              <Campo rotulo="Objetivo" valor={m.dados?.objetivo} />
              <Campo rotulo="Recompensa" valor={m.dados?.recompensa} />
            </div>
            {pistas.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider text-muted">Pistas</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {pistas.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ambar/70" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AbaPessoas({ entradas, fatos, foco }: { entradas: EntradaDiario[]; fatos: ControleFatos; foco?: number | null }) {
  // vindo da faixa "Pessoas por aqui": leva a pessoa à vista (a lista remonta ao trocar de aba)
  useEffect(() => {
    if (foco != null) document.getElementById(`codex-pessoa-${foco}`)?.scrollIntoView({ block: "center" });
  }, [foco]);
  const npcs = entradas.filter((e) => e.tipo === "npc").sort((a, b) => Number(a.status === "morto") - Number(b.status === "morto"));
  if (!npcs.length)
    return (
      <EstadoVazio icone="person" dica="O mestre anota aqui quem vocês conhecerem, com o humor de cada um.">
        Ninguém conhecido por enquanto.
      </EstadoVazio>
    );
  return (
    <ul className="space-y-3">
      {npcs.map((n) => {
        // a borda conta a atitude (aliado, hostil); o fundo é o mesmo de todos e o foco vindo da faixa vence
        const matiz = foco === n.id ? null : matizDaPessoa(n.status);
        return (
        <li
          key={n.id}
          id={`codex-pessoa-${n.id}`}
          className={`flex gap-3 rounded-lg border bg-surface-2/60! p-3 ${foco === n.id ? "border-ambar ring-1 ring-ambar" : matiz ? `cartao-matiz ${matiz}` : "border-border/80"} ${n.status === "morto" ? "opacity-60" : ""}`}
        >
          {/* rosto do NPC (salvo ao anotar; NPC antigo ganha o mesmo, gerado aqui pelo nome); morto fica em tons de cinza */}
          <RetratoSVG
            dados={retratoDaEntrada(n)}
            tamanho={56}
            className={`shrink-0 self-start ${n.status === "morto" ? "grayscale" : ""}`}
            titulo={`Retrato de ${n.titulo}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: corDoNome(n.titulo) }}>
                  {n.titulo}
                </p>
                {texto(n.dados?.oficio) && <p className="text-xs text-muted">{texto(n.dados?.oficio)}</p>}
              </div>
              <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-1">
                <Selo status={n.status} />
                <BotaoFixar texto={resumoDaEntrada(n)} controle={fatos} rotulo={n.titulo} />
              </div>
            </div>
            {n.texto && <p className="mt-1 text-sm leading-relaxed text-foreground/85">{n.texto}</p>}
            <div className="mt-2 space-y-0.5">
              <Campo rotulo="Aparência" valor={n.dados?.aparencia} />
              <Campo rotulo="Voz" valor={n.dados?.voz} />
              <Campo rotulo="Jeito" valor={n.dados?.jeito} />
              <Campo rotulo="Desejo" valor={n.dados?.desejo} />
              <Campo rotulo="Temperamento" valor={n.dados?.temperamento} />
              <Campo rotulo="Humor" valor={rotuloDaAtitude(n.dados?.atitude) ?? undefined} />
              <Campo rotulo="Relação" valor={n.dados?.relacao} />
            </div>
          </div>
        </li>
        );
      })}
    </ul>
  );
}

function ListaSimples({ entradas, icone, fatos }: { entradas: EntradaDiario[]; icone: NomeIcone; fatos: ControleFatos }) {
  return (
    <ul className="space-y-2">
      {entradas.map((e) => (
        <li key={e.id} className="rounded-lg border border-border/80 bg-surface-2/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-pergaminho">
              <span className="mr-1.5 text-ambar/70" aria-hidden>
                <Icone nome={icone} />
              </span>
              {e.titulo}
            </p>
            <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-1">
              <Selo status={e.status} />
              <BotaoFixar texto={resumoDaEntrada(e)} controle={fatos} rotulo={e.titulo} />
            </div>
          </div>
          {e.texto && <p className="mt-1 text-sm leading-relaxed text-foreground/85">{e.texto}</p>}
        </li>
      ))}
    </ul>
  );
}

function AbaLugares({ mesa, fatos }: { mesa: Mesa; fatos: ControleFatos }) {
  const lugares = mesa.diario.filter((e) => e.tipo === "local");
  const itens = mesa.diario.filter((e) => e.tipo === "item");
  const notas = mesa.diario.filter((e) => e.tipo === "nota");
  return (
    <div>
      {mesa.cena.local && (
        <div className="cartao cartao-matiz mb-4 rounded-lg p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Agora</p>
          <p className="font-semibold text-pergaminho">{mesa.cena.local}</p>
          {[mesa.cena.momento, mesa.cena.clima].filter(Boolean).length > 0 && (
            <p className="text-sm text-muted">{[mesa.cena.momento, mesa.cena.clima].filter(Boolean).join(" · ")}</p>
          )}
          {mesa.cena.situacao && <p className="mt-1 text-sm text-foreground/85">{mesa.cena.situacao}</p>}
        </div>
      )}
      {lugares.length ? <ListaSimples entradas={lugares} icone="place" fatos={fatos} /> : !mesa.cena.local && <EstadoVazio icone="place" dica="Cada lugar visitado entra na lista.">Nenhum lugar anotado ainda.</EstadoVazio>}
      {itens.length > 0 && (
        <Secao titulo="Objetos notáveis">
          <ListaSimples entradas={itens} icone="key" fatos={fatos} />
        </Secao>
      )}
      {notas.length > 0 && (
        <Secao titulo="Anotações">
          <ListaSimples entradas={notas} icone="scroll" fatos={fatos} />
        </Secao>
      )}
    </div>
  );
}

function AbaGrupo({ mesa, acoes }: { mesa: Mesa; acoes: AcoesMesa }) {
  const link = `/mesa/${mesa.campanha.id}/personagens/novo`;
  return (
    <div>
      <ul className="space-y-2">
        {mesa.personagens.map((p) => {
          const ativo = p.id === mesa.eu.personagemId;
          const s = mesa.sistema;
          const classe = s.classes.find((c) => c.id === p.ficha.classe)?.nome ?? p.ficha.classe;
          const pct = p.ficha.pvMax > 0 ? Math.max(0, Math.min(100, (p.ficha.pv / p.ficha.pvMax) * 100)) : 0;
          const presente = mesa.presenca.some((j) => j.personagemId === p.id && j.clienteId !== mesa.eu.clienteId);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-lg p-2.5 ${ativo ? "cartao cartao-matiz" : "border border-border/80 bg-surface-2/60"}`}
            >
              <Retrato ficha={p.ficha} tamanho={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" style={{ color: corDoNome(p.ficha.nome) }}>
                  {p.ficha.nome}
                </p>
                <p className="truncate text-xs text-muted">
                  {classe} · {s.rotulos.nivel} {p.ficha.nivel}
                  {p.jogador && ` · ${p.jogador}`}
                  {presente && " · na mesa"}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/70">
                  <div className={`h-full transition-[width] duration-[var(--mov-barra)] motion-reduce:transition-none ${pct > 50 ? "bg-musgo" : pct > 20 ? "bg-ambar" : "bg-sangue"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              {ativo ? (
                <span className="shrink-0 text-xs text-ambar">você</span>
              ) : podeAssumir(mesa, p) ? (
                <button type="button" className="btn-borda min-h-10 shrink-0 px-3 py-1.5 text-xs" onClick={() => acoes.escolherPersonagem(p.id)}>
                  Jogar com
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {mesa.personagens.length === 0 && (
        <EstadoVazio icone="person" dica="Crie um personagem para começar.">
          Ninguém sentado à mesa.
        </EstadoVazio>
      )}
      {mesa.personagens.length === 1 && (
        <p className="mt-3 text-center text-xs text-muted">
          Aventura solo por enquanto. Dá para sentar mais gente neste computador ou chamar pela rede com o convite, no menu do cabeçalho.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={link} className="btn-borda min-h-10 px-3 py-1.5 text-sm">
          + Adicionar personagem
        </Link>
        {/* no desktop o convite fica no cabeçalho; aqui só no celular (a gaveta ocupa a tela, o modal cabe nela) */}
        <div className="sm:hidden">
          <Convite campanhaId={mesa.campanha.id} temPin={mesa.campanha.temPin} />
        </div>
      </div>
    </div>
  );
}

export function Codex({
  mesa,
  acoes,
  aberto,
  aoFechar,
  aba,
  aoMudarAba,
  fatos,
  aoEncerrar,
  aoRemorso,
  novidades,
  pessoaFoco,
}: {
  /** Encerrar a noite: abre o diálogo do ritual (no celular o botão mora no pé do códex) */
  aoEncerrar?: () => void;
  /** pediu o teste de Remorso na ficha: a mesa fecha o códex e leva até o dado */
  aoRemorso?: (mensagemId: number | null) => void;
  /** abas com anotações novas do mestre desde a última vez que o códex foi aberto */
  novidades?: Partial<Record<AbaCodex, number>>;
  /** pessoa (id da entrada do diário) a destacar na aba Pessoas: o clique na faixa "Pessoas por aqui" */
  pessoaFoco?: number | null;
  mesa: Mesa;
  acoes: AcoesMesa;
  /** fatos fixados (a aba Fatos e o alfinete de cada entrada) */
  fatos: ControleFatos;
  aberto: boolean;
  aoFechar: () => void;
  aba: AbaCodex;
  aoMudarAba: (aba: AbaCodex) => void;
}) {
  const painel = useRef<HTMLElement>(null);
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? mesa.personagens[0] ?? null;
  const missoesAbertas = mesa.diario.filter((e) => e.tipo === "missao" && e.status === "aberta").length;

  // abrir uma aba zera a novidade dela: guarda quantas novidades havia quando foi vista (o ponto só volta se chegar outra);
  // ao fechar o códex a mesa zera tudo e isto recomeça
  // (ajustado durante a renderização, quando aberto/aba/novidades mudam, em vez de num efeito: sem renderização em cascata)
  const novasDaAba = novidades?.[aba] ?? 0;
  const [vistas, setVistas] = useState<Partial<Record<AbaCodex, number>>>(() => (aberto ? { [aba]: novasDaAba } : {}));
  const [visto, setVisto] = useState({ aberto, aba, novasDaAba });
  if (visto.aberto !== aberto || visto.aba !== aba || visto.novasDaAba !== novasDaAba) {
    setVisto({ aberto, aba, novasDaAba });
    setVistas((v) => (!aberto ? (Object.keys(v).length ? {} : v) : v[aba] === novasDaAba ? v : { ...v, [aba]: novasDaAba }));
  }
  const temNovidade = (id: AbaCodex) => (novidades?.[id] ?? 0) > (vistas[id] ?? 0) && !(aberto && aba === id);

  // Tab fica preso na gaveta enquanto ela está aberta; ao fechar, o foco volta para quem abriu (ou para o botão do códex)
  useFocoPreso(painel, aberto, { reserva: () => document.querySelector<HTMLElement>('[data-ordem="codex"]') });

  // abas pelo teclado: setas andam (com volta), Home e End vão às pontas; a aba escolhida recebe o foco
  function teclaNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const ids = ABAS.map(([id]) => id);
    const onde = Math.max(0, ids.indexOf(aba));
    let novo: AbaCodex;
    if (e.key === "ArrowRight") novo = ids[(onde + 1) % ids.length];
    else if (e.key === "ArrowLeft") novo = ids[(onde - 1 + ids.length) % ids.length];
    else if (e.key === "Home") novo = ids[0];
    else if (e.key === "End") novo = ids[ids.length - 1];
    else return;
    e.preventDefault();
    aoMudarAba(novo);
    document.getElementById(`codex-aba-${novo}`)?.focus();
  }

  // Esc fecha; o foco vai para dentro da gaveta ao abrir (teclado e leitor de tela)
  useEffect(() => {
    if (!aberto) return;
    painel.current?.focus();
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // um diálogo ou popover aberto aqui dentro (convite, modo de leitura) fecha primeiro; o códex só no Esc seguinte
      if (painel.current?.querySelector('[role="dialog"]')) return;
      aoFechar();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);

  return (
    <>
      {/* fundo escurecido (só no desktop; no celular a gaveta ocupa a tela toda) */}
      <div
        className={`fixed inset-0 z-40 hidden bg-black/50 transition-opacity duration-150 motion-reduce:transition-none sm:block ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={aoFechar}
        aria-hidden
      />
      <aside
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal={aberto}
        aria-label="Códex"
        aria-hidden={!aberto}
        inert={!aberto}
        className={`fixed inset-0 z-50 flex flex-col bg-background shadow-[20px_0_60px_-30px_black] outline-none transition-transform duration-200 ease-[cubic-bezier(.2,.8,.3,1)] motion-reduce:transition-none sm:right-auto sm:w-[400px] sm:border-r sm:border-border ${aberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <h2 className={`${fonteGotica.className} text-2xl text-ambar`}>Códex</h2>
          {/* fatos fixados: fora da fila de abas (as cinco já ocupam a largura toda), mas com o ícone e a contagem sempre à vista */}
          <button
            id="codex-aba-fatos"
            type="button"
            onClick={() => aoMudarAba("fatos")}
            aria-pressed={aba === "fatos"}
            aria-controls="codex-painel"
            aria-label={`Fatos fixados (${fatos.fatos.length})`}
            title="Fatos fixados: o que o mestre nunca pode esquecer"
            className={`ml-auto flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition ${
              aba === "fatos" ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-muted hover:border-ambar/60 hover:text-ambar"
            }`}
          >
            <Icone nome="pin" /> Fatos
            {fatos.fatos.length > 0 && (
              <span className="grid min-w-4 place-items-center rounded-full bg-ambar/20 px-1 text-[11px] leading-4 text-ambar">{fatos.fatos.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={aoFechar}
            className="botao-cabecalho"
            aria-label="Fechar o códex"
            title="Fechar (C ou Esc)"
          >
            <Icone nome="close" />
          </button>
        </div>
        {/* as cinco abas cabem na largura (celular e gaveta de 400px) sem rolar de lado */}
        <div className="flex border-b border-border/70 px-1 text-sm" role="tablist" aria-label="Seções do códex" onKeyDown={teclaNasAbas}>
          {ABAS.map(([id, rotulo]) => (
            <button
              key={id}
              id={`codex-aba-${id}`}
              type="button"
              role="tab"
              aria-selected={aba === id}
              aria-controls="codex-painel"
              tabIndex={aba === id || (aba === "fatos" && id === ABAS[0][0]) ? 0 : -1}
              onClick={() => aoMudarAba(id)}
              className={`relative -mb-px flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-1 transition-colors ${
                aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span className="truncate">{rotulo}</span>
              {id === "missoes" && missoesAbertas > 0 && (
                <span className="grid min-w-4 shrink-0 place-items-center rounded-full bg-ambar/20 px-1 text-[11px] leading-4 text-ambar">
                  {missoesAbertas}
                  <span className="sr-only"> em andamento</span>
                </span>
              )}
              {id === "grupo" && mesa.personagens.length > 1 && <span className="shrink-0 text-[11px] text-muted">{mesa.personagens.length}</span>}
              {temNovidade(id) && (
                <>
                  <span className="size-1.5 shrink-0 rounded-full bg-ambar" data-novidade-aba={id} title="Anotação nova do mestre" aria-hidden />
                  <span className="sr-only">, novidade</span>
                </>
              )}
            </button>
          ))}
        </div>
        {/* animationFillMode backwards: sem transform depois da entrada; senão o diálogo do convite (position: fixed) fica preso a este painel em vez da tela */}
        <div
          key={aba}
          id="codex-painel"
          className="surgir flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ animationFillMode: "backwards" }}
          role="tabpanel"
          aria-labelledby={`codex-aba-${aba}`}
        >
          {aba === "personagem" && <AbaPersonagem mesa={mesa} p={ativo} aoRemorso={aoRemorso} />}
          {aba === "missoes" && <AbaMissoes entradas={mesa.diario} fatos={fatos} />}
          {aba === "pessoas" && <AbaPessoas entradas={mesa.diario} fatos={fatos} foco={pessoaFoco} />}
          {aba === "lugares" && <AbaLugares mesa={mesa} fatos={fatos} />}
          {aba === "grupo" && <AbaGrupo mesa={mesa} acoes={acoes} />}
          {aba === "fatos" && <PainelFatos controle={fatos} />}
        </div>
        <div className="flex items-center gap-3 border-t border-border/70 py-1 pl-4 pr-2 text-[11px] text-muted">
          <p className="min-w-0 flex-1 truncate" title={`${mesa.sistema.nomeCurto} · Mestre: ${mesa.provedor}`}>
            {mesa.sistema.nomeCurto} · Mestre: {mesa.provedor}
            {mesa.limite?.uso != null && ` · plano ${Math.round(mesa.limite.uso * 100)}%`}
          </p>
          <Link
            href={`/mesa/${mesa.campanha.id}/livro`}
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 hover:bg-surface-2 hover:text-ambar"
            title="Livro da campanha: a história inteira, para reler, imprimir ou baixar"
          >
            <Icone nome="scroll" /> Livro
          </Link>
          <Link href={`/mesa/${mesa.campanha.id}/ajustes`} className="flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 hover:bg-surface-2 hover:text-ambar">
            <Icone nome="gear" /> Ajustes da mesa
          </Link>
          {/* no celular o cabeçalho não tem espaço: o modo de leitura (cena a cena / rolagem) mora aqui */}
          <MenuLeitura acima className="sm:hidden" />
        </div>
        {/* no celular o Encerrar a noite sai do cabeçalho e mora no pé do códex, em destaque */}
        {aoEncerrar && (
          <div className="border-t border-border/70 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 sm:hidden">
            <button
              type="button"
              onClick={aoEncerrar}
              className="flex min-h-11 w-full items-center gap-2 rounded-md border border-ambar/50 bg-ambar/10 px-3 text-left text-sm text-ambar hover:bg-ambar/20 focus-visible:outline-2 focus-visible:outline-ambar"
              data-encerrar-painel
            >
              <Icone nome="moon" />
              <span className="font-semibold">Encerrar a noite</span>
              <span className="min-w-0 truncate text-xs text-muted">· XP, Remorso e marcador no livro</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
