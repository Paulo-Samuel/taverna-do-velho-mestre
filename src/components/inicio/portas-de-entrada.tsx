import type { ReactNode } from "react";
import Link from "next/link";
import { Icone } from "@/components/icones";

// G16: três jeitos de começar, lado a lado. O do meio (um clique) é o destaque, dito em texto pela fita, e vem primeiro no celular.
// Componente de servidor, sem estado: o botão de "jogar agora" chega pronto pelo slot.

const CARTAO = "cartao cartao-matiz relative flex flex-col overflow-hidden p-5";
const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar";

function Linhas({ itens }: { itens: [string, string][] }) {
  return (
    <ul className="mt-3 mb-4 space-y-2 text-sm text-muted">
      {itens.map(([rotulo, texto]) => (
        <li key={rotulo} className="flex gap-2">
          <Icone nome="check" className="mt-0.5 shrink-0 texto-matiz" />
          <span>
            <span className="font-semibold text-foreground">{rotulo}</span> {texto}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PortasDeEntrada({ jogarAgora, tutorial }: { jogarAgora: ReactNode; tutorial?: { titulo: string; href: string } | null }) {
  return (
    <section aria-label="Jeitos de começar" className="mt-4 grid gap-4 md:grid-cols-3">
      <div className={`${CARTAO} matiz-1`}>
        <h3 className="titulo text-xl texto-matiz">Montar meu herói</h3>
        <Linhas
          itens={[
            ["Você escolhe:", "nome, rosto, ofício, passado e onde começa."],
            ["Demora:", "um minuto, cinco perguntas."],
            ["Para quem:", "já sabe quem quer ser."],
          ]}
        />
        <div className="mt-auto">
          <Link href="/nova" className={`btn-borda min-h-11 w-full ${foco}`}>
            Montar meu herói
          </Link>
        </div>
      </div>

      <div className={`${CARTAO} matiz-7 order-first border-2 md:order-none md:-translate-y-1`}>
        <span className="fita-destaque">O mais pedido</span>
        {tutorial && <p className="mb-1 text-xs uppercase tracking-[0.18em] text-ambar-forte">Primeira vez? Aventura de 10 minutos</p>}
        <h3 className="titulo text-xl texto-matiz">Jogar agora</h3>
        <Linhas
          itens={[
            ["Você escolhe:", "nada. O mestre entrega um herói e uma encrenca."],
            ["Demora:", "o tempo de puxar um banco."],
            ["Para quem:", "quer ver como é antes de ler qualquer coisa."],
          ]}
        />
        <div className="mt-auto">
          {jogarAgora}
          {tutorial && (
            <div className="mt-2 text-xs text-muted">
              <p>Começa por {tutorial.titulo}.</p>
              <Link href={tutorial.href} className={`inline-flex min-h-11 items-center underline underline-offset-2 hover:text-ambar ${foco}`}>
                ou jogue o tutorial com um herói seu
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={`${CARTAO} matiz-5`}>
        <h3 className="titulo text-xl texto-matiz">Ficha completa</h3>
        <Linhas
          itens={[
            ["Você escolhe:", "o sistema (D&D, Pathfinder, Vampiro e companhia) e cada número da ficha."],
            ["Demora:", "o tempo de uma caneca."],
            ["Para quem:", "gosta de planilha e não tem vergonha disso."],
          ]}
        />
        <div className="mt-auto">
          <Link href="/nova/avancada" className={`btn-borda min-h-11 w-full ${foco}`}>
            Abrir o modo avançado
          </Link>
        </div>
      </div>
    </section>
  );
}
