import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CeuEstrelado } from "@/components/historia/ceu-estrelado";
import { fonteGotica } from "@/components/historia/fonte-gotica";
import { Retrato } from "@/components/historia/retrato";
import { TemaPagina } from "@/components/tema-pagina";
import { obterCampanha } from "@/lib/db";
import { acessoNaPagina } from "@/lib/rede/acesso";
import { dadosDoTema, temaDoSistema } from "@/lib/temas";
import type { EntradaDiario } from "@/lib/sistemas/tipos";
import { BotaoImprimir } from "./botao-imprimir";
import { dataPorExtenso, montarLivro, romano, statusDaMissao, tituloDoCapitulo, type Bloco, type FichaResumo } from "./montar";
import { Prosa } from "./prosa";
import "./livro.css";

// Livro da campanha: a história inteira como um livro, da capa às fichas e ao diário. Mesmo controle de acesso da mesa.
// Tema do sistema (modo história: céu estrelado e letra gótica). Imprime limpo (livro.css) e baixa em Markdown.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/livro">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Livro · ${c.nome}` : "Taverna do Velho Mestre" };
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return (partes[0] ?? nome).slice(0, 2).toUpperCase() || "?";
}

function Rosto({ f, historia, tamanho }: { f: FichaResumo; historia: boolean; tamanho: number }) {
  if (historia || f.ficha.extras?.retrato) return <Retrato ficha={f.ficha} tamanho={tamanho} />;
  return (
    <span
      aria-hidden
      className="livro-iniciais grid shrink-0 place-items-center rounded-full border border-ambar/50 bg-ambar/15 font-semibold text-ambar"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.34 }}
    >
      {iniciais(f.nome)}
    </span>
  );
}

function DesenharBloco({ b, ornamento, capitular }: { b: Bloco; ornamento: string; capitular: boolean }) {
  if (b.tipo === "narracao") return <Prosa texto={b.texto} ornamento={ornamento} capitular={capitular} />;
  if (b.tipo === "acao")
    return (
      <p className="livro-acao">
        <span className="livro-acao-nome">{b.nome}</span>
        {b.autor && b.autor !== b.nome && <span className="livro-acao-autor"> ({b.autor})</span>} — <em>{b.texto}</em>
      </p>
    );
  if (b.tipo === "fim")
    return (
      <div className="livro-fim-noite" role="separator" aria-label={`Fim da noite${b.sessao ? ` ${b.sessao}` : ""}`}>
        <p className="livro-separador" aria-hidden>
          {ornamento} {ornamento} {ornamento}
        </p>
        <p className="livro-fim-noite-titulo">— Fim da noite{b.sessao ? ` ${b.sessao}` : ""} —</p>
      </div>
    );
  if (b.tipo === "nota")
    return (
      <p className="livro-nota">
        <span aria-hidden>🎲 </span>
        {b.texto}
      </p>
    );
  return (
    <p className="livro-sistema">
      {ornamento} {b.texto} {ornamento}
    </p>
  );
}

function ListaDiario({ titulo, itens, rotulo }: { titulo: string; itens: EntradaDiario[]; rotulo?: (e: EntradaDiario) => string | null }) {
  if (!itens.length) return null;
  return (
    <div className="livro-diario-secao">
      <h3 className="titulo text-lg text-ambar">{titulo}</h3>
      <ul className="mt-2 space-y-2">
        {itens.map((e) => {
          const r = rotulo?.(e);
          return (
            <li key={e.id} className="text-[0.98rem] leading-relaxed">
              <span className="font-semibold text-pergaminho">{e.titulo}</span>
              {r && <span className="livro-etiqueta"> {r}</span>}
              {e.texto && <span className="text-foreground/85"> — {e.texto}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function PaginaLivro(props: PageProps<"/mesa/[id]/livro">) {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  // o livro traz a campanha inteira: sem o PIN, nada disso sai do servidor (como a mesa)
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);
  const livro = montarLivro(campanha.id);
  if (!livro) notFound();

  const { historia } = livro;
  const tema = dadosDoTema(livro.sistema.id);
  const ornamento = historia ? "✦" : tema.ornamento;
  const fonteTitulo = historia ? fonteGotica.className : "titulo";
  const temNarracao = livro.capitulos.some((c) => c.blocos.some((b) => b.tipo === "narracao"));
  const diarioVazio = !livro.missoes.length && !livro.pessoas.length && !livro.lugares.length && !livro.outros.length && !livro.fatos.length;
  const periodo =
    dataPorExtenso(livro.campanha.criadaEm) === dataPorExtenso(livro.campanha.atualizadaEm)
      ? dataPorExtenso(livro.campanha.criadaEm)
      : `de ${dataPorExtenso(livro.campanha.criadaEm)} a ${dataPorExtenso(livro.campanha.atualizadaEm)}`;

  return (
    <div data-tema={historia ? "historia" : temaDoSistema(livro.sistema.id)} className={`livro ${historia ? "livro-historia" : "fundo-tema"} relative min-h-dvh`}>
      {historia ? <CeuEstrelado /> : <TemaPagina tema={temaDoSistema(livro.sistema.id)} />}

      {/* barra de ferramentas (some na impressão) */}
      <div className="nao-imprimir sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-2">
          <Link href={`/mesa/${livro.campanha.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm text-muted hover:bg-surface-2/60 hover:text-ambar">
            ← Voltar à mesa
          </Link>
          <span className="flex-1" />
          <a
            href={`/api/campanhas/${livro.campanha.id}/livro?formato=md`}
            download
            className="btn-borda min-h-10 px-3 py-2"
            title="Baixar a campanha em Markdown (.md): abre em qualquer editor de texto"
          >
            <span aria-hidden>⬇</span> Markdown
          </a>
          <BotaoImprimir />
        </div>
      </div>

      <article className="relative z-10 mx-auto max-w-[44rem] px-5 pb-24 sm:px-8">
        {/* capa */}
        <header className="livro-capa flex min-h-[78dvh] flex-col items-center justify-center py-16 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">{historia ? "Uma história da Taverna do Velho Mestre" : livro.sistema.nome}</p>
          <div className="mx-auto mt-6 h-px w-48 bg-linear-to-r from-transparent via-ambar/60 to-transparent" />
          <h1 className={`${fonteTitulo} mt-6 text-5xl leading-tight text-pergaminho sm:text-6xl`}>{livro.campanha.nome}</h1>
          <p className="mt-4 text-sm text-muted">{periodo}</p>
          {livro.campanha.cenario && <p className="mx-auto mt-8 max-w-xl text-[1.05rem] italic leading-relaxed text-foreground/85">{livro.campanha.cenario}</p>}
          {livro.fichas.length > 0 && (
            <div className="mt-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">Estrelando</p>
              <ul className="mt-4 flex flex-wrap justify-center gap-6">
                {livro.fichas.map((f) => (
                  <li key={f.id} className="flex w-28 flex-col items-center gap-2">
                    <Rosto f={f} historia={historia} tamanho={72} />
                    <span className="w-full text-sm font-semibold leading-tight text-pergaminho">{f.nome}</span>
                    {f.linha && <span className="-mt-1 w-full text-[11px] leading-tight text-muted">{f.linha}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-12 text-2xl text-ambar/70" aria-hidden>
            {ornamento}
          </p>
        </header>

        {/* sumário */}
        {temNarracao && livro.capitulos.length > 1 && (
          <nav className="livro-sumario mx-auto mb-16 max-w-md" aria-label="Sumário">
            <h2 className={`${fonteTitulo} text-center text-2xl text-pergaminho`}>Sumário</h2>
            <ol className="mt-4 space-y-1.5">
              {livro.capitulos.map((c) => (
                <li key={c.numero}>
                  {c.noite && <p className="mb-1 mt-3 text-center text-[10.5px] font-semibold uppercase tracking-[0.3em] text-ambar/80">Noite {c.noite}</p>}
                  <a href={`#capitulo-${c.numero}`} className="flex items-baseline gap-2 text-foreground/90 hover:text-ambar">
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">{romano(c.numero)}</span>
                    <span className="min-w-0 flex-1 truncate">{tituloDoCapitulo(c)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {!temNarracao && (
          <p className="livro-capitulo py-16 text-center italic text-muted">As páginas ainda estão em branco. O mestre só escreve quando alguém se senta à mesa.</p>
        )}

        {/* capítulos */}
        {temNarracao &&
          livro.capitulos.map((c) => (
            <section key={c.numero} id={`capitulo-${c.numero}`} className="livro-capitulo scroll-mt-16 pt-14" aria-labelledby={`capitulo-${c.numero}-titulo`}>
              <header className="mb-8 text-center">
                {c.noite && (c.titulo || c.local) && (
                  <p className={`${fonteTitulo} livro-noite mb-3 text-lg text-ambar`}>
                    <span aria-hidden>☾ </span>Noite {c.noite}
                  </p>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Capítulo {romano(c.numero)}</p>
                <h2 id={`capitulo-${c.numero}-titulo`} className={`${fonteTitulo} mt-2 text-3xl leading-tight text-pergaminho sm:text-4xl`}>
                  {tituloDoCapitulo(c)}
                </h2>
                {(c.titulo ? [c.local, c.momento] : [c.momento]).filter(Boolean).length > 0 && (
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted">{(c.titulo ? [c.local, c.momento] : [c.momento]).filter(Boolean).join(" · ")}</p>
                )}
                <p className="mt-4 text-ambar/60" aria-hidden>
                  {ornamento}
                </p>
              </header>
              <div className="livro-texto">
                {c.blocos.map((b) => (
                  <DesenharBloco key={`${b.tipo}-${b.id}`} b={b} ornamento={ornamento} capitular={b === c.blocos.find((x) => x.tipo === "narracao")} />
                ))}
              </div>
            </section>
          ))}

        {/* apêndices: fichas e diário */}
        {livro.fichas.length > 0 && (
          <section className="livro-capitulo pt-20" aria-labelledby="fichas-titulo">
            <h2 id="fichas-titulo" className={`${fonteTitulo} text-center text-3xl text-pergaminho`}>
              Os personagens
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {livro.fichas.map((f) => (
                <div key={f.id} className="livro-ficha cartao cartao-tema p-4">
                  <div className="flex items-center gap-3">
                    <Rosto f={f} historia={historia} tamanho={48} />
                    <div className="min-w-0">
                      <p className="titulo truncate text-lg text-pergaminho">{f.nome}</p>
                      {f.linha && <p className="text-xs text-muted">{f.linha}</p>}
                    </div>
                  </div>
                  {(f.vida || f.atributos) && <p className="mt-3 text-sm tabular-nums text-foreground/90">{[f.vida, f.atributos].filter(Boolean).join(" · ")}</p>}
                  {f.condicoes.length > 0 && <p className="mt-2 text-sm text-sangue">Condições: {f.condicoes.join(", ")}</p>}
                  {f.inventario.length > 0 && (
                    <p className="mt-2 text-sm text-muted">
                      <span className="text-foreground/80">Na mochila:</span> {f.inventario.join(", ")}
                    </p>
                  )}
                  {f.historia && <p className="mt-2 line-clamp-6 text-sm italic leading-relaxed text-foreground/80">{f.historia}</p>}
                  {f.jogador && <p className="mt-2 text-[11px] text-muted">Jogado por {f.jogador}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {!diarioVazio && (
          <section className="livro-capitulo pt-20" aria-labelledby="diario-titulo">
            <h2 id="diario-titulo" className={`${fonteTitulo} text-center text-3xl text-pergaminho`}>
              Diário da campanha
            </h2>
            <div className="mt-8 space-y-8">
              <ListaDiario titulo="Missões" itens={livro.missoes} rotulo={(e) => `(${statusDaMissao(e.status)})`} />
              <ListaDiario titulo="Pessoas" itens={livro.pessoas} rotulo={(e) => (e.status ? `(${e.status})` : null)} />
              <ListaDiario titulo="Lugares" itens={livro.lugares} />
              <ListaDiario titulo="Notas e itens" itens={livro.outros} />
              {livro.fatos.length > 0 && (
                <div className="livro-diario-secao">
                  <h3 className="titulo text-lg text-ambar">Fatos fixados</h3>
                  <ul className="mt-2 space-y-1.5">
                    {livro.fatos.map((f, i) => (
                      <li key={i} className="flex gap-2 text-[0.98rem] leading-relaxed text-foreground/90">
                        <span className="text-ambar/70" aria-hidden>
                          📌
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="mt-24 text-center text-xs text-muted">
          <p className="text-xl text-ambar/60" aria-hidden>
            {ornamento}
          </p>
          <p className="mt-3">Escrito na Taverna do Velho Mestre. Os personagens são IA; as desculpas pelas rolagens ruins são de vocês.</p>
        </footer>
      </article>
    </div>
  );
}
