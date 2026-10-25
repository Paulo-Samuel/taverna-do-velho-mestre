"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

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
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={soProntos} onChange={(e) => setSoProntos(e.target.checked)} className="accent-[var(--ambar)]" />
            Só os prontos para jogar
          </label>
        </div>
        <nav aria-label="Sistemas" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {visiveis.map(({ s }) => (
            <a key={s.id} href={`#${s.id}`} className="etiqueta shrink-0 hover:border-ambar hover:text-ambar">
              {s.nomeCurto}
            </a>
          ))}
        </nav>
      </div>

      {visiveis.length === 0 && <p className="cartao mt-6 p-6 text-muted">Nada com esse nome. Nem o bardo inventaria isso.</p>}

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

  return (
    <section id={s.id} className="cartao scroll-mt-36 p-5">
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
        {s.pronto ? (
          <Link href={`/nova?sistema=${encodeURIComponent(s.id)}`} className="btn-ambar w-full sm:w-auto">
            Começar campanha neste sistema
          </Link>
        ) : (
          <span className="btn-borda w-full cursor-not-allowed opacity-50 sm:w-auto" aria-disabled>
            Ainda no forno
          </span>
        )}
      </div>

      <p className="mt-2 text-muted">{s.descricao}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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

      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-ambar">Licença: {s.licenca}</summary>
        {s.atribuicao && <p className="mt-2 break-words leading-relaxed">{s.atribuicao}</p>}
      </details>

      {(s.classes.length > 0 || s.ancestralidades.length > 0) && (
        <div className="mt-4 border-t border-border pt-4">
          {!buscando && (
            <button type="button" className="text-sm text-ambar hover:underline" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
              {aberto ? "Esconder a lista" : `Ver ${s.rotuloClasse.toLowerCase()} e ${s.rotuloAncestralidade.toLowerCase()}`}
            </button>
          )}
          {mostrar && (
            <div className="mt-3 grid gap-6 md:grid-cols-2">
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
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="truncate text-xs uppercase tracking-wider text-muted">{rotulo}</dt>
      <dd className="titulo text-xl text-ambar">{valor}</dd>
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
