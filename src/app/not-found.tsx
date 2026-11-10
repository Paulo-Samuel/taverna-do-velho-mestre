import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Icone } from "@/components/icones";
import { ehDestaMaquina } from "@/lib/rede/local";

// absolute: o template do layout não vale para o próprio segmento raiz
export const metadata: Metadata = { title: { absolute: "Porta errada · Taverna do Velho Mestre" } };

// 404 da casa: vale para rota que não existe e para notFound() (ex.: mesa de campanha excluída).
export default async function NaoEncontrado() {
  // quem vem pela rede só entra nas mesas: mandar para o início seria mandar para outra porta trancada
  const h = await headers();
  const daMaquina = ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"));

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="cartao cartao-matiz w-full max-w-xl p-6 sm:p-10">
        <p className="text-ambar-forte" aria-hidden>
          <span className="ornamento-trio" />
        </p>
        <p className="mt-4 text-5xl text-ambar" aria-hidden>
          <Icone nome="door" />
        </p>
        <p className="titulo titulo-brilho mt-2 text-7xl text-ambar lining-nums sm:text-8xl" aria-hidden>
          404
        </p>
        <h1 className="titulo titulo-brilho mt-2 text-balance text-3xl text-pergaminho sm:text-4xl">Essa porta dá na parede</h1>
        <p className="mt-3 text-pretty text-muted">
          O taverneiro jura que aqui já teve um quarto. Ou a página nunca existiu, ou a campanha foi apagada, ou alguém pintou uma
          porta na parede de novo.
        </p>
        {daMaquina ? (
          <>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className="btn-ambar min-h-11">
                Voltar às campanhas
              </Link>
              <Link href="/nova" className="btn-borda min-h-11">
                Nova campanha
              </Link>
            </div>
            <p className="mt-2">
              <Link
                href="/aventuras"
                className="inline-flex min-h-10 items-center text-sm text-muted underline-offset-2 hover:text-ambar hover:underline"
              >
                Ver aventuras prontas
              </Link>
            </p>
          </>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Icone nome="phone" className="text-base text-ambar" />
            <span>Peça o link da mesa de novo para quem está na máquina da taverna.</span>
          </p>
        )}
      </div>
    </main>
  );
}
