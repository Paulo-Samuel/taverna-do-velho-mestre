"use client";

import { useState, type ReactNode } from "react";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { BlocoFicha, Ficha, SistemaPublico } from "@/lib/sistemas/tipos";
import {
  AdicionarNaLista,
  AvisoAjuste,
  BotaoRemover,
  BotoesMarcador,
  LinhaMarcador,
  NotasJogador,
  blocoVazio,
  useAjusteFicha,
  type AjusteFicha,
} from "./ajuste-ficha";

// Ficha de um personagem, desenhada a partir dos blocos que o sistema calcula no servidor.
// Nada aqui conhece regra de sistema: só sabe desenhar barras, grades, etiquetas, listas e textos.
// Com `ajuste` (só na mesa), os marcadores ganham −/+ discretos e condições/inventário podem ser mexidos à mão.

/** Progresso de XP, quando o servidor manda (null = sistema por marcos ou nível máximo). */
export type ProgressoXp = { xpNivelAtual: number | null; xpProximoNivel: number | null };

const CORES: Record<string, string> = { vida: "bg-musgo", magia: "bg-sky-500", sanidade: "bg-violet-400", outro: "bg-ambar" };

function corDaBarra(cor: string | undefined, pct: number) {
  if (cor === "vida") return pct > 50 ? "bg-musgo" : pct > 20 ? "bg-ambar" : "bg-sangue";
  return CORES[cor ?? "outro"] ?? CORES.outro;
}

function Barras({ itens, ajuste }: Extract<BlocoFicha, { tipo: "barras" }> & { ajuste?: AjusteFicha }) {
  return (
    <div className="space-y-2.5">
      {itens.map((original, i) => {
        // com ajuste, o número já mostra os cliques que ainda vão para o servidor
        const alvo = ajuste?.alvoDaBarra(original.rotulo, original.cor) ?? null;
        const v = alvo && ajuste ? ajuste.valor(alvo) : null;
        const b = v ? { ...original, atual: v.atual, max: v.max } : original;
        const pct = b.max > 0 ? Math.max(0, Math.min(100, Math.round((b.atual / b.max) * 100))) : 0;
        const cor = corDaBarra(b.cor, pct);
        // recursos pequenos (espaços, pontos de destino, estresse) leem melhor como caixinhas
        const caixas = b.cor !== "vida" && b.max >= 1 && b.max <= 10 && Number.isInteger(b.max);
        const numero = (
          <span className="shrink-0 tabular-nums">
            <span className={v?.pendente ? "text-ambar" : b.cor === "vida" && pct <= 20 ? "text-sangue" : "text-pergaminho"}>{b.atual}</span>
            <span className="text-muted">/{b.max}</span>
          </span>
        );
        return (
          <div key={`${b.rotulo}-${i}`} className="group/marcador" aria-label={`${b.rotulo}: ${b.atual} de ${b.max}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-muted" title={b.rotulo}>
                {b.rotulo}
              </span>
              {alvo && ajuste ? (
                <BotoesMarcador ajuste={ajuste} alvo={alvo}>
                  {numero}
                </BotoesMarcador>
              ) : (
                numero
              )}
            </div>
            {caixas ? (
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: b.max }, (_, n) => (
                  <span
                    key={n}
                    className={`h-3 w-5 rounded-sm border transition-colors duration-500 ${n < b.atual ? `${cor} border-transparent` : "border-border bg-surface-2"}`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const maiorPalavra = (t: string) => Math.max(0, ...t.split(/\s+/).map((p) => p.length));

// A fonte de título de alguns temas (Vampiro: Cormorant bem espaçada) não cabe numa caixinha de ~90px:
// o tamanho desce conforme a maior palavra e o comprimento, e a quebra fica entre palavras (nunca "GRAVIDAD/E").
function classeValor(valor: string) {
  const palavra = maiorPalavra(valor);
  if (palavra <= 6 && valor.length <= 9) return "text-base";
  if (palavra <= 9 && valor.length <= 18) return "text-sm";
  return "text-xs";
}

// Rótulo em versalete ocupa até duas linhas; palavras longas ("Manipulação", "Inteligência") perdem o espaçamento largo
function classeRotulo(rotulo: string) {
  const palavra = maiorPalavra(rotulo);
  if (palavra <= 8) return "text-[10px] tracking-wider";
  if (palavra <= 11) return "text-[10px] tracking-normal";
  return "text-[9px] tracking-normal";
}

/** Valor comprido ("Força + Briga", "13ª Cria (recém-abraçado)") ganha duas colunas em vez de espremer. */
const largo = (i: { valor: string; detalhe?: string }) => i.valor.length > 13 || maiorPalavra(i.valor) > 10 || (i.detalhe?.length ?? 0) > 20;

function Grade({ itens, ajuste }: Extract<BlocoFicha, { tipo: "grade" }> & { ajuste?: AjusteFicha }) {
  return (
    <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] gap-1.5">
      {itens.map((i, n) => {
        const alvo = ajuste?.alvoDaGrade(i.rotulo) ?? null;
        const v = alvo && ajuste ? ajuste.valor(alvo) : null;
        // enquanto o clique viaja, o valor imita o formato do servidor ("2/4", "●●" ou o número puro)
        const valor = !v?.pendente ? i.valor : /^\d+\/\d+$/.test(i.valor) ? `${v.atual}/${v.max}` : /^[●○]+$/.test(i.valor) ? "●".repeat(v.atual) || "0" : String(v.atual);
        return (
          <div
            key={`${i.rotulo}-${n}`}
            className={`group/marcador relative flex min-w-0 flex-col justify-center rounded-md border border-border bg-surface-2/70 px-1 py-1.5 text-center ${largo(i) ? "col-span-2" : ""}`}
            title={[i.rotulo, i.detalhe].filter(Boolean).join(" · ")}
          >
            <p className={`line-clamp-2 break-words uppercase leading-tight text-muted ${classeRotulo(i.rotulo)}`}>{i.rotulo}</p>
            <p className={`titulo break-words leading-tight tracking-normal! ${classeValor(valor)} ${v?.pendente ? "text-ambar" : "text-pergaminho"}`}>{valor}</p>
            {i.detalhe && <p className="line-clamp-2 break-words text-[11px] leading-tight text-ambar">{i.detalhe}</p>}
            {alvo && ajuste && (
              <BotoesMarcador ajuste={ajuste} alvo={alvo} compacto classe="pointer-events-none absolute inset-x-0.5 bottom-1 flex justify-between">
                <span aria-hidden />
              </BotoesMarcador>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Lista({ itens, ajuste }: { itens: string[]; ajuste?: AjusteFicha }) {
  const [tudo, setTudo] = useState(false);
  const LIMITE = 10;
  const visiveis = tudo || ajuste?.editando ? itens : itens.slice(0, LIMITE);
  return (
    <>
      <ul className="space-y-1 text-sm">
        {visiveis.map((i, n) => (
          <li key={`${i}-${n}`} className="group/item flex gap-2">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-ambar-forte" aria-hidden />
            <span className="min-w-0 flex-1 break-words">{i}</span>
            {ajuste && <BotaoRemover ajuste={ajuste} lista="itens" texto={i} />}
          </li>
        ))}
      </ul>
      {itens.length > LIMITE && !ajuste?.editando && (
        <button type="button" className="mt-1 text-xs text-ambar hover:underline" onClick={() => setTudo((v) => !v)}>
          {tudo ? "mostrar menos" : `mais ${itens.length - LIMITE}…`}
        </button>
      )}
    </>
  );
}

function Etiquetas({ itens, ajuste }: { itens: string[]; ajuste?: AjusteFicha }) {
  return (
    <div className="flex flex-wrap gap-1">
      {itens.map((i, n) => (
        <span key={`${i}-${n}`} className="group/item inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-xs">
          {i}
          {ajuste && <BotaoRemover ajuste={ajuste} lista="condicoes" texto={i} />}
        </span>
      ))}
    </div>
  );
}

const ehCondicoes = (b: BlocoFicha) => b.tipo === "etiquetas" && /^condi[çc][õo]es$/i.test(b.titulo.trim());
const ehInventario = (b: BlocoFicha) => b.tipo === "lista" && /^invent[áa]rio$/i.test(b.titulo.trim());

/** Conteúdo de um bloco, sem o título (quem desenha o título é a seção). */
export function BlocoVisual({ bloco, ajuste }: { bloco: BlocoFicha; ajuste?: AjusteFicha }) {
  switch (bloco.tipo) {
    case "barras":
      return <Barras {...bloco} ajuste={ajuste} />;
    case "grade":
      return <Grade {...bloco} ajuste={ajuste} />;
    case "etiquetas":
      if (ajuste && ehCondicoes(bloco)) {
        return (
          <div>
            <Etiquetas itens={ajuste.condicoes} ajuste={ajuste} />
            <AdicionarNaLista ajuste={ajuste} lista="condicoes" dica="ex.: faminto, ferido 2, agravado 1" />
          </div>
        );
      }
      return <Etiquetas itens={bloco.itens} />;
    case "lista":
      if (ajuste && ehInventario(bloco)) {
        return (
          <div>
            <Lista itens={ajuste.itens} ajuste={ajuste} />
            <AdicionarNaLista ajuste={ajuste} lista="itens" dica="ex.: lanterna, bolsa de sangue" />
          </div>
        );
      }
      return <Lista itens={bloco.itens} />;
    case "texto":
      return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{bloco.texto}</p>;
  }
}

function Secao({ titulo, contagem, aberta, children }: { titulo: string; contagem?: number; aberta: boolean; children: ReactNode }) {
  return (
    <details open={aberta} className="group border-t border-border/70 pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs uppercase tracking-wider text-muted hover:text-ambar [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] transition-transform group-open:rotate-90" aria-hidden>
          ▶
        </span>
        <span className="flex-1">{titulo}</span>
        {contagem !== undefined && <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums">{contagem}</span>}
      </summary>
      <div className="pb-2 pt-1.5">{children}</div>
    </details>
  );
}

function tituloDe(b: BlocoFicha): string | undefined {
  return b.tipo === "barras" ? undefined : b.titulo;
}

/** Blocos vazios não ocupam espaço. */
function vazio(b: BlocoFicha): boolean {
  if (b.tipo === "texto") return !b.texto.trim();
  return b.itens.length === 0;
}

/** Com ajuste, condições e inventário vêm da lista otimista; no modo de edição as seções aparecem mesmo vazias. */
function blocosComAjuste(blocos: BlocoFicha[], ajuste: AjusteFicha | undefined): BlocoFicha[] {
  if (!ajuste) return blocos.filter((b) => !vazio(b));
  const lista = blocos.map((b): BlocoFicha => {
    if (ehCondicoes(b)) return { tipo: "etiquetas", titulo: (b as { titulo: string }).titulo, itens: ajuste.condicoes };
    if (ehInventario(b)) return { tipo: "lista", titulo: (b as { titulo: string }).titulo, itens: ajuste.itens };
    return b;
  });
  if (!lista.some(ehCondicoes) && (ajuste.condicoes.length || ajuste.editando)) {
    const i = lista.findIndex((b) => b.tipo === "barras");
    lista.splice(i + 1, 0, { ...blocoVazio("Condições"), itens: ajuste.condicoes } as BlocoFicha);
  }
  if (!lista.some(ehInventario) && (ajuste.itens.length || ajuste.editando)) lista.push({ ...blocoVazio("Inventário"), itens: ajuste.itens } as BlocoFicha);
  return lista.filter((b) => !vazio(b) || (ajuste.editando && (ehCondicoes(b) || ehInventario(b))));
}

type PropsCartao = {
  ficha: Ficha;
  blocos: BlocoFicha[];
  sistema: SistemaPublico;
  jogador?: string;
  progresso?: ProgressoXp | null;
  /** ajuste manual (só na mesa); sem ele a ficha é só leitura, como na prévia da criação */
  ajuste?: AjusteFicha;
  /** conteúdo extra no fim (anotações do jogador) */
  rodape?: ReactNode;
};

/** Cabeçalho + blocos. Usado na mesa (PainelFicha) e na prévia do formulário de criação. */
export function CartaoFicha({ ficha, blocos, sistema, jogador, progresso, ajuste, rodape }: PropsCartao) {
  const classe = sistema.classes.find((c) => c.id === ficha.classe)?.nome ?? ficha.classe;
  const anc = sistema.ancestralidades.find((a) => a.id === ficha.ancestralidade)?.nome ?? ficha.ancestralidade;
  const antecedente = sistema.antecedentes?.find((a) => a.id === ficha.antecedente)?.nome;

  const proximo = progresso?.xpProximoNivel ?? null;
  const base = progresso?.xpNivelAtual ?? 0;
  const mostrarXp = proximo !== null || ficha.xp > 0;
  const pctXp = proximo !== null && proximo > base ? Math.max(0, Math.min(100, ((ficha.xp - base) / (proximo - base)) * 100)) : 0;

  const visiveis = blocosComAjuste(blocos, ajuste);
  const temHistoria = visiveis.some((b) => /hist[óo]ria/i.test(tituloDe(b) ?? ""));
  const vistos = new Map<string, number>();

  return (
    <div className="space-y-3 text-sm">
      <header>
        <p className="titulo break-words text-2xl leading-tight text-pergaminho">{ficha.nome}</p>
        <p className="text-muted">
          {[anc, classe].filter(Boolean).join(" · ")}
          {antecedente && <span className="text-muted/80"> · {antecedente}</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full border border-ambar/40 bg-ambar/10 px-2 py-0.5 text-ambar">
            {sistema.rotulos.nivel} {ficha.nivel}
          </span>
          {jogador && <span className="rounded-full border border-border px-2 py-0.5 text-muted">jogado por {jogador}</span>}
          {ajuste && (
            <button
              type="button"
              onClick={ajuste.alternarEdicao}
              aria-pressed={ajuste.editando}
              title="Corrigir à mão o que o mestre esqueceu: vida, recursos, dinheiro, condições, inventário"
              className={`ml-auto rounded-full border px-2 py-0.5 transition ${ajuste.editando ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-muted hover:border-ambar hover:text-ambar"}`}
            >
              {ajuste.editando ? "✓ pronto" : "✎ ajustar"}
            </button>
          )}
        </div>
        {mostrarXp && (
          <div className="mt-2">
            <div className="mb-0.5 flex justify-between text-[11px] text-muted">
              <span>XP {ficha.xp.toLocaleString("pt-BR")}</span>
              {proximo !== null &&
                (ficha.xp >= proximo ? (
                  <span className="text-ambar">pronto para subir!</span>
                ) : (
                  <span>faltam {(proximo - ficha.xp).toLocaleString("pt-BR")}</span>
                ))}
            </div>
            {proximo !== null && (
              <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-ambar-forte transition-all duration-700" style={{ width: `${pctXp}%` }} />
              </div>
            )}
          </div>
        )}
      </header>

      {ajuste && <AvisoAjuste ajuste={ajuste} />}
      {ajuste?.editando && (
        <p className="text-[11px] leading-snug text-muted">
          Modo de ajuste: o mestre esqueceu alguma coisa? Corrija aqui. Cada mudança vira uma linha no chat, para ninguém dizer que foi milagre.
        </p>
      )}
      {ajuste?.editando && ajuste.soltos.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-dashed border-border px-2 py-1.5">
          {ajuste.soltos.map((a) => (
            <LinhaMarcador key={a.tipo === "recurso" ? `r:${a.id}` : a.tipo} ajuste={ajuste} alvo={a} />
          ))}
        </div>
      )}

      {visiveis.map((b, i) => {
        const titulo = tituloDe(b);
        // chave por tipo+título: assim uma seção recolhida continua recolhida quando outro bloco aparece antes dela
        const raiz = `${b.tipo}:${titulo ?? ""}`;
        const n = vistos.get(raiz) ?? 0;
        vistos.set(raiz, n + 1);
        const chave = `${raiz}:${n}`;
        if (!titulo) {
          return (
            <div key={chave} className={i > 0 ? "pt-1" : ""}>
              <BlocoVisual bloco={b} ajuste={ajuste} />
            </div>
          );
        }
        const contagem = b.tipo === "lista" || b.tipo === "etiquetas" ? b.itens.length : undefined;
        // texto comprido começa fechado para não empurrar o resto da ficha
        const aberta = !(b.tipo === "texto" && b.texto.length > 360);
        return (
          <Secao key={chave} titulo={titulo} contagem={contagem} aberta={aberta}>
            <BlocoVisual bloco={b} ajuste={ajuste} />
          </Secao>
        );
      })}

      {ficha.historia && !temHistoria && (
        <Secao titulo="História" aberta={false}>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{ficha.historia}</p>
        </Secao>
      )}
      {rodape}
    </div>
  );
}

type PropsPainel = { personagem: PersonagemVisivel; sistema: SistemaPublico; editavel?: boolean; ocupado?: boolean };

/** Ficha na mesa. `editavel` liga o ajuste manual e as anotações; `ocupado` (mestre narrando) desliga os botões. */
export function PainelFicha(props: PropsPainel) {
  // key: trocar de personagem zera os cliques pendentes e as anotações abertas (nada vaza de um para o outro)
  return <FichaDaMesa key={props.personagem.id} {...props} />;
}

function FichaDaMesa({ personagem, sistema, editavel = true, ocupado = false }: PropsPainel) {
  // o servidor manda o progresso de XP junto (visivel.ts); null = por marcos, e a ficha mostra só o XP acumulado
  const progresso = personagem.progresso ?? null;
  const ajuste = useAjusteFicha(personagem, sistema.rotulos, ocupado);
  return (
    <CartaoFicha
      ficha={personagem.ficha}
      blocos={personagem.blocos}
      sistema={sistema}
      jogador={personagem.jogador}
      progresso={progresso}
      ajuste={editavel ? ajuste : undefined}
      rodape={
        editavel ? (
          <Secao titulo="Minhas anotações" aberta={false}>
            <NotasJogador campanhaId={personagem.campanhaId} personagemId={personagem.id} />
          </Secao>
        ) : null
      }
    />
  );
}
