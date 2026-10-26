import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ehDestaMaquina } from "@/lib/rede/local";

export const metadata: Metadata = { title: "Porta errada · Taverna do Velho Mestre" };

// 404 da casa: vale para rota que não existe e para notFound() (ex.: mesa de campanha excluída).
export default async function NaoEncontrado() {
  // quem vem pela rede só entra nas mesas: mandar para o início seria mandar para outra porta trancada
  const h = await headers();
  const daMaquina = ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"));

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="titulo text-7xl text-ambar/80 sm:text-8xl" aria-hidden>
        404
      </p>
      <h1 className="titulo mt-2 text-3xl text-pergaminho sm:text-4xl">Essa porta dá na parede</h1>
      <p className="mt-3 text-muted">
        O taverneiro jura que aqui já teve um quarto. Ou a página nunca existiu, ou a campanha foi apagada, ou alguém pintou uma porta
        na parede de novo.
      </p>
      {daMaquina ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-ambar min-h-11">
            Voltar às campanhas
          </Link>
          <Link href="/nova" className="btn-borda min-h-11">
            Nova história
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Peça o link da mesa de novo para quem está no computador da taverna.</p>
      )}
    </main>
  );
}
