import type { Metadata } from "next";
import Link from "next/link";
import { aventurasPublicas } from "@/lib/aventuras";
import { linkDaAventura } from "@/lib/aventuras/link";
import { SISTEMAS } from "@/lib/sistemas";
import { dadosDoTema, temaDoSistema } from "@/lib/temas";
import { CapaAventura } from "@/components/aventuras/capa-aventura";
import { Icone } from "@/components/icones";
import { BotaoJogarAgora } from "@/components/inicio/botao-jogar-agora";
import { jogarAgoraAcao } from "@/app/nova/jogar-agora-acoes";

export const metadata: Metadata = { title: "Aventuras prontas · Taverna do Velho Mestre" };

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar";

// strings literais (o Tailwind e o globals.css precisam enxergar cada nome inteiro)
const MATIZES = ["matiz-1", "matiz-2", "matiz-3", "matiz-4", "matiz-5", "matiz-6", "matiz-7", "matiz-8"] as const;

export default async function Aventuras({ searchParams }: { searchParams: Promise<{ sistema?: string | string[] }> }) {
  const { sistema: bruto } = await searchParams;
  const pedido = Array.isArray(bruto) ? bruto[0] : bruto;
  // só a parte pública vai para a página (nunca o roteiro secreto)
  const todas = aventurasPublicas();
  const comAventura = new Set(todas.map((a) => a.sistemas[0]));
  // modo história primeiro; depois os sistemas na ordem do registro, só os que têm aventura
  const filtros = [
    ...SISTEMAS.filter((s) => s.id === "historia" && comAventura.has(s.id)),
    ...SISTEMAS.filter((s) => s.id !== "historia" && comAventura.has(s.id)),
  ].map((s) => ({ id: s.id, nome: s.id === "historia" ? "Modo história" : s.nomeCurto }));
  const ativo = filtros.some((f) => f.id === pedido) ? pedido : undefined;
  const lista = todas
    .filter((a) => !ativo || a.sistemas.includes(ativo))
    .sort((a, b) => Number(b.sistemas[0] === "historia") - Number(a.sistemas[0] === "historia"));
  const nomeDe = (id: string) => filtros.find((f) => f.id === id)?.nome ?? id;
  const botoes: { id: string | undefined; nome: string }[] = [{ id: undefined, nome: "Todas" }, ...filtros];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="titulo titulo-brilho text-3xl text-pergaminho sm:text-4xl">Aventuras prontas</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Escolha uma: o mestre já chega com o roteiro decorado (e com os segredos que você não vai ler). O botão principal leva à criação do herói; o atalho senta um herói pronto e já abre a mesa.
        </p>
      </header>

      <nav aria-label="Filtrar por sistema" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {botoes.map((f) => {
            const marcado = f.id === ativo;
            return (
              <li key={f.id ?? "todas"}>
                <Link
                  href={f.id ? `/aventuras?sistema=${f.id}` : "/aventuras"}
                  aria-current={marcado ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition ${foco} ${
                    marcado ? "border-ambar bg-surface-2 text-ambar" : "border-border text-muted hover:border-ambar hover:text-ambar"
                  }`}
                >
                  {f.nome}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Aventuras">
        {lista.map((a, i) => {
          const sistema = a.sistemas[0];
          const tema = dadosDoTema(sistema);
          const matiz = sistema === "historia" ? MATIZES[i % MATIZES.length] : "";
          return (
            <li key={a.id} className="min-w-0">
              <article data-tema={temaDoSistema(sistema)} className={`cartao cartao-tema cartao-matiz relative flex h-full flex-col overflow-hidden ${matiz}`}>
                <CapaAventura id={a.id} sistema={sistema} />
                {a.tutorial && <span className="fita-destaque">Comece por aqui</span>}
                <div className="flex flex-1 flex-col p-4">
                  <span className="etiqueta w-fit text-ambar-forte">
                    <span aria-hidden>{sistema === "historia" ? <Icone nome="scroll" /> : tema.ornamento}</span> {nomeDe(sistema)}
                  </span>
                  <h2 className="titulo mt-2 text-xl leading-tight text-pergaminho">{a.titulo}</h2>
                  <p className="mt-1 text-sm leading-snug text-muted">{a.chamada}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span>{a.duracao}</span>
                    {a.soloOk && (
                      <span className="etiqueta-matiz matiz-2" title="Roda com um personagem só: um aliado do mestre divide as cenas">
                        solo ok
                      </span>
                    )}
                    {a.recomendado && <span className="basis-full text-muted">{a.recomendado}</span>}
                  </p>
                  <div className="mt-auto pt-3">
                    <Link href={linkDaAventura(a)} className={`btn-ambar min-h-11 w-full ${foco}`}>
                      Começar esta aventura<span className="sr-only">: {a.titulo}</span>
                    </Link>
                    {sistema === "historia" && (
                      <form action={jogarAgoraAcao} className="mt-2">
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
        })}
      </ul>
    </main>
  );
}
