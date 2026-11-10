import Link from "next/link";
import { Icone } from "./icones";

// Rodapé da casa (src/app/layout.tsx): só aparece para quem está no computador da taverna, como a navegação.
// As mesas são fixed e passam por cima dele; na impressão (livro da campanha) ele some.

const LINKS = [
  { href: "/aventuras", rotulo: "Aventuras" },
  { href: "/sistemas", rotulo: "Sistemas" },
  { href: "/backup", rotulo: "Cópias e lixeira" },
  { href: "/config", rotulo: "Configurações" },
];

export function RodapeCasa() {
  return (
    <footer className="border-t border-border/60 bg-background/60 print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        <p className="text-ambar-forte" aria-hidden>
          <span className="ornamento-trio" />
        </p>
        <p className="mt-1 text-sm text-muted">Roda na sua máquina. O mestre é de IA; a ressaca é sua.</p>
        <nav aria-label="Rodapé" className="mt-2 flex flex-wrap items-center justify-center gap-x-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center px-2 text-xs text-muted hover:text-ambar">
              {l.rotulo}
            </Link>
          ))}
        </nav>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted">
          <Link href="/sistemas#creditos" className="inline-flex min-h-10 items-center gap-1 px-2 hover:text-ambar">
            Licenças e créditos
          </Link>
          <a
            href="https://github.com/Paulo-Samuel/taverna-do-velho-mestre"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1 px-2 hover:text-ambar"
          >
            Código no GitHub
            <Icone nome="external" />
            <span className="sr-only">(abre em outra aba)</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
