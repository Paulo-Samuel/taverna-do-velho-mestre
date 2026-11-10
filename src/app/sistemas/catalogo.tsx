"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { EstadoVazio } from "@/components/estado-vazio";
import { Icone } from "@/components/icones";
import { dadosDoTema, temaDoSistema } from "@/lib/temas";

export type Verbete = { id: string; nome: string; descricao: string; detalhe: string };

export type ItemCatalogo = {
  id: string;
  nome: string;
  nomeCurto: string;
  descricao: string;
  licenca: string;
  atribuicao: string | null;
  dadoPrincipal: string;
  mecanica: string | null;
  pronto: boolean;
  rotuloClasse: string;
  rotuloAncestralidade: string;
  nivelMaximo: number;
  atributos: number;
  pericias: number;
  antecedentes: number;
  /** quantas aventuras prontas o sistema tem (lib/aventuras) */
  aventuras: number;
  classes: Verbete[];
  ancestralidades: Verbete[];
};

/** sem acento e minúsculo: "Anão" acha "anao" */
function chave(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function filtrar(lista: Verbete[], termo: string) {
  if (!termo) return lista;
  return lista.filter((v) => chave(`${v.nome} ${v.descricao} ${v.detalhe}`).includes(termo));
}

export function Catalogo({ itens }: { itens: ItemCatalogo[] }) {
  const [busca, setBusca] = useState("");
  const [soProntos, setSoProntos] = useState(false);
  const termo = chave(useDeferredValue(busca).trim());

  const visiveis = itens
    .filter((s) => !soProntos || s.pronto)
    .map((s) => ({ s, classes: filtrar(s.classes, termo), ancestralidades: filtrar(s.ancestralidades, termo) }))
    // com busca, some o sistema que não tem nada a ver (a não ser que o próprio nome bata)
    .filter((x) => !termo || x.classes.length || x.ancestralidades.length || chave(`${x.s.nome} ${x.s.descricao}`).includes(termo));

  // qual cartão está na faixa do meio da tela, para acender o atalho dele
  const [naTela, setNaTela] = useState<string | null>(null);
  const idsVisiveis = visiveis.map((x) => x.s.id).join(",");
  useEffect(() => {
    const secoes = idsVisiveis
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    const obs = new IntersectionObserver(
      (entradas) => {
        const vista = entradas.find((e) => e.isIntersecting);
        if (vista) setNaTela(vista.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    secoes.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [idsVisiveis]);

  return (
    <>
      {/* No celular este invólucro é `contents`: busca e caixa ficam no fluxo e só a faixa de atalhos gruda no topo.
          De sm para cima a barra inteira é uma laje grudada, alinhada aos cartões. */}
      <div className="contents sm:sticky sm:top-0 sm:z-10 sm:block sm:rounded-xl sm:border sm:border-border sm:bg-surface/90 sm:px-4 sm:py-3 sm:backdrop-blur">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar classe, raça, papel…"
            className="campo sm:max-w-lg"
            aria-label="Buscar no catálogo"
          />
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
            <input type="checkbox" checked={soProntos} onChange={(e) => setSoProntos(e.target.checked)} className="size-5 shrink-0 accent-[var(--ambar)]" />
            Só os prontos para jogar
          </label>
          {termo && (
            <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
              {visiveis.length} {visiveis.length === 1 ? "sistema" : "sistemas"} com “{busca.trim()}”
            </p>
          )}
        </div>
        {/* atalhos: pulam para o cartão e acendem o sistema que está na tela */}
        <nav
          aria-label="Ir para o sistema"
          className="sticky top-0 z-10 mt-2 flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-surface/90 px-2 py-2 backdrop-blur sm:static sm:z-auto sm:-mx-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-1 sm:backdrop-blur-none"
        >
          {visiveis.map(({ s }) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-tema={temaDoSistema(s.id)}
              aria-current={naTela === s.id ? "location" : undefined}
              className={`etiqueta-matiz min-h-10 shrink-0 px-3 transition ${
                naTela === s.id ? "border-[var(--ambar)] text-pergaminho" : "hover:border-[var(--ambar)]"
              }`}
            >
              {s.nomeCurto}
            </a>
          ))}
        </nav>
      </div>

      {visiveis.length === 0 && (
        <EstadoVazio
          icone="search"
          className="mt-6"
          acao={
            <button
              type="button"
              className="btn-borda min-h-10"
              onClick={() => {
                setBusca("");
                setSoProntos(false);
              }}
            >
              Limpar a busca
            </button>
          }
        >
          Nada com esse nome. Nem o bardo inventaria isso.
        </EstadoVazio>
      )}

      <div className="mt-6 space-y-6">
        {visiveis.map(({ s, classes, ancestralidades }) => (
          <CartaoSistema key={s.id} s={s} classes={classes} ancestralidades={ancestralidades} buscando={Boolean(termo)} />
        ))}
      </div>
    </>
  );
}

function CartaoSistema({ s, classes, ancestralidades, buscando }: { s: ItemCatalogo; classes: Verbete[]; ancestralidades: Verbete[]; buscando: boolean }) {
  const [aberto, setAberto] = useState(false);
  const mostrar = aberto || buscando;
  // no celular o botão desce para depois da descrição (no topo ele separava o nome do texto)
  const comecar = (classe: string) =>
    s.pronto ? (
      <Link href={`/nova/avancada?sistema=${encodeURIComponent(s.id)}`} className={`btn-borda min-h-11 gap-2 ${classe}`}>
        <Icone nome="dice" />
        Jogar neste sistema
      </Link>
    ) : (
      <span className={`btn-borda min-h-11 cursor-not-allowed opacity-50 ${classe}`} aria-disabled>
        Ainda no forno
      </span>
    );

  const tema = dadosDoTema(s.id);
  return (
    <section id={s.id} data-tema={tema.id} className="cartao cartao-tema cartao-matiz scroll-mt-24 p-5 sm:scroll-mt-40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`etiqueta-matiz ${s.pronto ? "matiz-2" : "matiz-7"}`}>
              {s.pronto && <Icone nome="check" />}
              {s.pronto ? "pronto" : "em construção"}
            </span>
            <span className="etiqueta-matiz font-mono">{s.dadoPrincipal}</span>
          </div>
          <h2 className="titulo mt-2 text-2xl text-pergaminho">{s.nome}</h2>
          {/* o clima do tema: a mesa, a criação e o cartão no início ganham estas cores */}
          <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-ambar-forte">
            <span aria-hidden>{tema.ornamento}</span> {tema.nome} <span aria-hidden>{tema.ornamento}</span>
          </p>
        </div>
        <div className="hidden sm:block">{comecar("")}</div>
      </div>

      <p className="mt-2 text-muted">{s.descricao}</p>

      {/* números numa faixa só: dá para comparar sistemas rolando a página sem ler cada cartão inteiro */}
      <dl className="mt-3 flex flex-wrap gap-2 text-sm">
        <Numero rotulo={s.rotuloClasse} valor={s.classes.length} />
        <Numero rotulo={s.rotuloAncestralidade} valor={s.ancestralidades.length} />
        <Numero rotulo="Perícias" valor={s.pericias} />
        <Numero rotulo="Nível máximo" valor={s.nivelMaximo} />
        <Numero rotulo="Aventuras prontas" valor={s.aventuras} />
      </dl>
      {s.mecanica && (
        <p className="mt-3 text-sm text-muted">
          <span className="text-foreground">Mecânica:</span> {s.mecanica}.
        </p>
      )}

      <details className="group mt-2 text-xs text-muted">
        <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 select-none hover:text-ambar [&::-webkit-details-marker]:hidden">
          <Icone nome="chevronDown" className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          Licença: {s.licenca}
        </summary>
        {s.atribuicao && <p className="mt-1 break-words leading-relaxed">{s.atribuicao}</p>}
      </details>
      <div className="mt-3 sm:hidden">{comecar("w-full")}</div>

      {(s.classes.length > 0 || s.ancestralidades.length > 0) && (
        <div className="mt-3 border-t border-border pt-2">
          {!buscando && (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 text-sm text-ambar hover:underline"
              onClick={() => setAberto((a) => !a)}
              aria-expanded={aberto}
              aria-controls={`lista-${s.id}`}
            >
              <Icone nome="chevronDown" className={`shrink-0 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} />
              {aberto ? "Esconder a lista" : `Ver ${s.rotuloClasse.toLowerCase()} e ${s.rotuloAncestralidade.toLowerCase()}`}
            </button>
          )}
          {mostrar && (
            <div id={`lista-${s.id}`} className="mt-3 grid gap-6 md:grid-cols-2">
              <Lista titulo={s.rotuloClasse} itens={classes} />
              <Lista titulo={s.rotuloAncestralidade} itens={ancestralidades} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  // "Perícias 0" (Fate) só ocupa espaço
  if (!valor) return null;
  return (
    <div className="flex items-baseline gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{rotulo}</dt>
      <dd className="titulo texto-matiz text-lg leading-none">{valor}</dd>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: Verbete[] }) {
  return (
    <div className="min-w-0">
      <h3 className="titulo mb-2 text-lg text-pergaminho">
        {titulo} <span className="text-sm text-muted">({itens.length})</span>
      </h3>
      {itens.length === 0 ? (
        <EstadoVazio compacto icone="search">
          Nada aqui com essa busca.
        </EstadoVazio>
      ) : (
        <ul className="space-y-3">
          {itens.map((v) => (
            <li key={v.id} className="text-sm">
              <p className="font-semibold text-foreground">{v.nome}</p>
              {v.detalhe && <p className="text-xs text-ambar-forte">{v.detalhe}</p>}
              <p className="text-muted">{v.descricao}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
