import Link from "next/link";
import { Icone } from "@/components/icones";
import { perguntasFrequentes } from "@/lib/inicio/perguntas";

// G16: perguntas de balcão em sanfona nativa (<details>/<summary>), zero JavaScript.
// O atributo name agrupa: onde o navegador entende, abre uma por vez; onde não entende, abrem várias, sem problema.

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar";

export function PerguntasFrequentes({ provedor }: { provedor: string }) {
  const perguntas = perguntasFrequentes(provedor);
  return (
    <section aria-labelledby="faq-titulo" className="mt-14">
      <h2 id="faq-titulo" className="titulo text-2xl text-pergaminho">
        Perguntas de balcão
      </h2>
      <div className="mt-4 space-y-2">
        {perguntas.map((p) => (
          <details key={p.id} name="faq-taverna" className="cartao group">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-semibold text-pergaminho [&::-webkit-details-marker]:hidden ${foco}`}
            >
              {p.pergunta}
              <Icone nome="chevronDown" className="shrink-0 text-ambar transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="px-4 pb-4 text-sm text-muted">
              <p>{p.resposta}</p>
              {p.link && (
                <Link href={p.link.href} className={`inline-flex min-h-11 items-center text-ambar underline underline-offset-2 ${foco}`}>
                  {p.link.rotulo}
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
