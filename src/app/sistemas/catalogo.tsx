"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

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
      <div className="sticky top-0 z-10 -mx-4 mt-6 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar classe, ancestralidade, papel… (ex.: anão, conjurador)"
            className="campo sm:max-w-md"
            aria-label="Procurar no catálogo"
          />
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-muted hover:text-foreground">
            <input type="checkbox" checked={soProntos} onChange={(e) => setSoProntos(e.target.checked)} className="size-4 accent-[var(--ambar)]" />
            Só os prontos para jogar
          </label>
          {termo && (
            <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
              {visiveis.length} {visiveis.length === 1 ? "sistema" : "sistemas"} com “{busca.trim()}”
            </p>
          )}
        </div>
        {/* atalhos: pulam para o cartão e acendem o sistema que está na tela */}
        <nav aria-label="Ir para o sistema" className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1">
          {visiveis.map(({ s }) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={naTela === s.id ? "location" : undefined}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs transition ${
                naTela === s.id ? "border-ambar bg-ambar/10 text-ambar" : "border-border bg-surface-2 text-muted hover:border-ambar hover:text-ambar"
              }`}
            >
              {s.nomeCurto}
            </a>
          ))}
        </nav>
      </div>

      {visiveis.length === 0 && (
        <div className="cartao mt-6 p-6 text-muted">
          <p>Nada com esse nome. Nem o bardo inventaria isso.</p>
          <button type="button" className="btn-borda mt-4 min-h-10" 
            onClick={() => {
              setBusca("");
              setSoProntos(false);
            }}
          >
            Limpar a busca
          </button>
        </div>
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
      <Link href={`/nova/avancada?sistema=${encodeURIComponent(s.id)}`} className={`btn-ambar min-h-10 ${classe}`}>
        Começar campanha neste sistema
      </Link>
    ) : (
      <span className={`btn-borda min-h-10 cursor-not-allowed opacity-50 ${classe}`} aria-disabled>
        Ainda no forno
      </span>
    );

  return (
    <section id={s.id} className="cartao scroll-mt-52 p-5 sm:scroll-mt-40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`etiqueta ${s.pronto ? "border-musgo/60 text-musgo" : "border-ambar-forte/60 text-ambar-forte"}`}>
              {s.pronto ? "pronto" : "em construção"}
            </span>
            <span className="etiqueta font-mono">{s.dadoPrincipal}</span>
          </div>
          <h2 className="titulo mt-2 text-2xl text-pergaminho">{s.nome}</h2>
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
      </dl>
      {s.mecanica && (
        <p className="mt-3 text-sm text-muted">
          <span className="text-foreground">Mecânica:</span> {s.mecanica}.
        </p>
      )}

      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer select-none py-1.5 hover:text-ambar">Licença: {s.licenca}</summary>
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
              <span aria-hidden className={`inline-block transition-transform ${aberto ? "rotate-90" : ""}`}>
                ▸
              </span>
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
      <dd className="titulo text-lg leading-none text-ambar">{valor}</dd>
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
        <p className="text-sm italic text-muted">Nada aqui com essa busca.</p>
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
