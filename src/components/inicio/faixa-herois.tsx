import Link from "next/link";
import { jogarAgoraAcao } from "@/app/nova/jogar-agora-acoes";
import { Retrato } from "@/components/historia/retrato";
import { ARQUETIPOS, retratoDoArquetipo } from "@/components/historia/retrato/arquetipos-retrato";
import { matizDaPosicao } from "@/lib/inicio/matiz-campanha";
import { BotaoJogarAgora } from "./botao-jogar-agora";

// G15: os oito heróis prontos. Cada retrato é um botão de enviar: um toque abre a mesa com aquele arquétipo.
// A cor da borda é só enfeite; quem é quem está escrito embaixo (e no aria-label).
export function FaixaHerois({ compacta = false }: { compacta?: boolean }) {
  return (
    <section className={compacta ? "mt-12" : "mb-12"} aria-labelledby="herois-titulo">
      <h2 id="herois-titulo" className="titulo text-2xl text-pergaminho">
        {compacta ? "Mesa nova com herói pronto" : "Escolha um rosto e jogue"}
      </h2>
      {!compacta && <p className="mt-1 text-sm text-muted">Oito heróis já vestidos e armados. O nome o mestre inventa; a culpa é sua.</p>}
      <ul
        aria-label="Heróis prontos"
        // celular: a borda direita some em degradê para avisar que a fila continua (igual à faixa de aventuras)
        className="-mx-4 mt-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 max-sm:pr-10 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8"
      >
        {ARQUETIPOS.map((a, i) => (
          <li key={a.id} className={`shrink-0 snap-start sm:shrink ${matizDaPosicao(i)}`}>
            <form action={jogarAgoraAcao}>
              <input type="hidden" name="arquetipo" value={a.id} />
              <BotaoJogarAgora
                className="group flex w-24 shrink-0 snap-start flex-col items-center gap-1 rounded-xl p-1 text-center disabled:cursor-wait sm:w-full"
                espera={null}
                rotulo={`Jogar agora com ${a.nome}: ${a.resumo}`}
              >
                {/* durante o envio o botão fica com aria-busy: o retrato clicado ganha anel e o aviso "Sentando…" */}
                <span className="block overflow-hidden rounded-xl border border-[color:var(--matiz)] cartao-clicavel group-aria-busy:ring-2 group-aria-busy:ring-ambar motion-safe:group-aria-busy:animate-pulse">
                  <Retrato ficha={{ nome: a.nome, classe: a.classe, extras: { retrato: retratoDoArquetipo(a) } }} tamanho={compacta ? 56 : 80} />
                </span>
                <span className="hidden text-xs font-semibold text-ambar group-aria-busy:block">Sentando…</span>
                <span className="text-xs font-semibold texto-matiz group-aria-busy:hidden">{a.nome}</span>
                {!compacta && <span className="text-[11px] leading-tight text-muted">{a.resumo}</span>}
              </BotaoJogarAgora>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted">
        <Link href="/nova" className="inline-flex min-h-11 items-center text-ambar underline-offset-4 hover:underline">
          ou monte o seu do zero
        </Link>
      </p>
    </section>
  );
}
