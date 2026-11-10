import type { Metadata } from "next";
import Link from "next/link";
import { aventurasPublicas } from "@/lib/aventuras";
import { linkDaAventura } from "@/lib/aventuras/link";
import { agruparPorSistema, contarNativas, separarPorFiltro } from "@/lib/aventuras/ordem-vitrine";
import { SISTEMAS } from "@/lib/sistemas";
import { dadosDoTema, temaDoSistema } from "@/lib/temas";
import { CapaAventura } from "@/components/aventuras/capa-aventura";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Icone } from "@/components/icones";
import { BotaoJogarAgora } from "@/components/inicio/botao-jogar-agora";
import { jogarAgoraAcao } from "@/app/nova/jogar-agora-acoes";

export const metadata: Metadata = { title: "Aventuras prontas" };

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar";

// strings literais (o Tailwind e o globals.css precisam enxergar cada nome inteiro)
const MATIZES = ["matiz-1", "matiz-2", "matiz-3", "matiz-4", "matiz-5", "matiz-6", "matiz-7", "matiz-8"] as const;

const GRADE = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

type AventuraDaVitrine = ReturnType<typeof aventurasPublicas>[number];

function CartaoDaAventura({
  a,
  indice,
  nomeDoSistema,
  tambemRodaEm,
}: {
  a: AventuraDaVitrine;
  /** posição dentro do grupo: no modo história, escolhe o matiz do cartão */
  indice: number;
  nomeDoSistema: string;
  /** nome do sistema filtrado, quando a aventura nasceu em outro */
  tambemRodaEm?: string;
}) {
  const sistema = a.sistemas[0];
  const tema = dadosDoTema(sistema);
  const matiz = sistema === "historia" ? MATIZES[indice % MATIZES.length] : "";
  return (
    <li className="min-w-0">
      <article data-tema={temaDoSistema(sistema)} className={`cartao cartao-tema cartao-matiz relative flex h-full flex-col overflow-hidden ${matiz}`}>
        {/* no celular a capa é uma faixa de proporção fixa (corta só o céu); altura fixa em px decepava a silhueta nos cartões largos */}
        <CapaAventura id={a.id} sistema={sistema} className="aspect-[320/104] sm:aspect-auto" />
        {a.tutorial && <span className="fita-destaque">Comece por aqui</span>}
        <div className="flex flex-1 flex-col p-4">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="etiqueta-matiz">
              <span aria-hidden>{sistema === "historia" ? <Icone nome="scroll" /> : tema.ornamento}</span> {nomeDoSistema}
            </span>
            {tambemRodaEm && <span className="etiqueta">também roda em {tambemRodaEm}</span>}
          </p>
          <h3 className="titulo mt-2 text-xl leading-tight text-pergaminho">{a.titulo}</h3>
          <p className="mt-1 text-sm leading-snug text-muted">{a.chamada}</p>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="etiqueta">
              <Icone nome="candle" /> {a.duracao}
            </span>
            {a.soloOk && (
              <span className="etiqueta-matiz matiz-2" title="Roda com um personagem só: um aliado do mestre divide as cenas">
                solo ok
              </span>
            )}
            {a.recomendado && !a.tutorial && (
              <span className="etiqueta max-w-full rounded-2xl">
                <Icone nome="shield" /> <span className="min-w-0">{a.recomendado}</span>
              </span>
            )}
          </p>
          <div className="mt-auto pt-3">
            <Link
              href={linkDaAventura(a)}
              title="Leva à criação do herói: você monta o personagem antes de sentar à mesa"
              className={`btn-ambar min-h-11 w-full ${foco}`}
            >
              Começar esta aventura<span className="sr-only">: {a.titulo}</span>
            </Link>
            {sistema === "historia" && (
              <form action={jogarAgoraAcao} className="mt-2" title="Atalho: senta um herói pronto e já abre a mesa">
                <input type="hidden" name="aventura" value={a.id} />
                <BotaoJogarAgora className={`btn-borda min-h-11 w-full ${foco}`} rotulo={`Jogar já com herói pronto: ${a.titulo}`}>
                  Jogar já com herói pronto
                </BotaoJogarAgora>
              </form>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

export default async function Aventuras({ searchParams }: { searchParams: Promise<{ sistema?: string | string[] }> }) {
  const { sistema: bruto } = await searchParams;
  const pedido = Array.isArray(bruto) ? bruto[0] : bruto;
  // só a parte pública vai para a página (nunca o roteiro secreto)
  const todas = aventurasPublicas();
  const nativas = contarNativas(todas);
  // modo história primeiro; depois os sistemas na ordem do registro, só os que têm aventura nativa
  const filtros = [
    ...SISTEMAS.filter((s) => s.id === "historia" && nativas[s.id]),
    ...SISTEMAS.filter((s) => s.id !== "historia" && nativas[s.id]),
  ].map((s) => ({ id: s.id, nome: s.id === "historia" ? "Modo história" : s.nomeCurto, quantas: nativas[s.id] }));
  const ativo = filtros.some((f) => f.id === pedido) ? pedido : undefined;
  const nomeDe = (id: string) => filtros.find((f) => f.id === id)?.nome ?? id;
  const botoes: { id: string | undefined; nome: string; quantas: number }[] = [
    { id: undefined, nome: "Todas", quantas: todas.length },
    ...filtros,
  ];
  const doFiltro = ativo ? separarPorFiltro(todas, ativo) : null;
  const grupos = ativo
    ? []
    : agruparPorSistema(
        todas,
        filtros.map((f) => f.id),
      );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <CabecalhoPagina
        sobrelinha="O mural de contratos"
        titulo="Aventuras prontas"
        subtitulo={`${todas.length} aventuras em ${filtros.length} sistemas. O mestre já chega com o roteiro decorado (e com os segredos que você não vai ler).`}
      />

      <nav aria-label="Filtrar por sistema" className="mb-6">
        {/* a folga de 4px (p-1 com -m-1) existe para a rolagem lateral não cortar o contorno de foco das pílulas */}
        <ul className="relative -m-1 flex snap-x flex-nowrap gap-2 overflow-x-auto p-1 sm:m-0 sm:flex-wrap sm:overflow-visible sm:p-0">
          {botoes.map((f) => {
            const marcado = f.id === ativo;
            return (
              <li key={f.id ?? "todas"} className="shrink-0 snap-start">
                <Link
                  href={f.id ? `/aventuras?sistema=${f.id}` : "/aventuras"}
                  aria-current={marcado ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border px-4 text-sm transition ${foco} ${
                    marcado ? "border-ambar bg-surface-2 text-ambar" : "border-border text-muted hover:border-ambar hover:text-ambar"
                  }`}
                >
                  {f.nome}
                  <span>
                    ({f.quantas})<span className="sr-only"> {f.quantas === 1 ? "aventura" : "aventuras"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {ativo && doFiltro && (
        <>
          <section aria-labelledby="grupo-nativas">
            <h2 id="grupo-nativas" className="titulo text-xl text-pergaminho">
              Feitas para {nomeDe(ativo)}
            </h2>
            <ul className={`mt-3 ${GRADE}`}>
              {doFiltro.nativas.map((a, i) => (
                <CartaoDaAventura key={a.id} a={a} indice={i} nomeDoSistema={nomeDe(a.sistemas[0])} />
              ))}
            </ul>
          </section>
          {doFiltro.outras.length > 0 && (
            <section aria-labelledby="grupo-outras" className="mt-10">
              <h2 id="grupo-outras" className="titulo text-xl text-pergaminho">
                De outros sistemas, mas servem
              </h2>
              <ul className={`mt-3 ${GRADE}`}>
                {doFiltro.outras.map((a, i) => (
                  <CartaoDaAventura key={a.id} a={a} indice={i} nomeDoSistema={nomeDe(a.sistemas[0])} tambemRodaEm={nomeDe(ativo)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {grupos.map((g, n) => (
        <section key={g.sistema} aria-labelledby={`grupo-${g.sistema}`} className={n > 0 ? "mt-10" : undefined}>
          <h2 id={`grupo-${g.sistema}`} className="titulo flex flex-wrap items-baseline gap-x-2 text-xl text-pergaminho">
            <span aria-hidden className="text-ambar-forte">
              {g.sistema === "historia" ? <Icone nome="scroll" /> : dadosDoTema(g.sistema).ornamento}
            </span>
            {nomeDe(g.sistema)}
            <span className="text-sm text-muted">
              {g.aventuras.length} {g.aventuras.length === 1 ? "aventura" : "aventuras"}
            </span>
          </h2>
          <ul className={`mt-3 ${GRADE}`}>
            {g.aventuras.map((a, i) => (
              <CartaoDaAventura key={a.id} a={a} indice={i} nomeDoSistema={nomeDe(a.sistemas[0])} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
