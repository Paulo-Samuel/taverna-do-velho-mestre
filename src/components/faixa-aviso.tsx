import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

export type TomAviso = "sucesso" | "erro" | "alerta" | "info";

/** Matiz (temas.css) e ícone padrão de cada tom; `info` fica sem matiz e acompanha o âmbar do tema. */
const TONS: Record<TomAviso, { matiz: string; icone: NomeIcone }> = {
  sucesso: { matiz: "matiz-2", icone: "check" },
  erro: { matiz: "matiz-4", icone: "close" },
  alerta: { matiz: "matiz-7", icone: "warning" },
  info: { matiz: "", icone: "candle" },
};

/**
 * Faixa de aviso da casa: deu certo, deu errado, atenção ou recado. Só a borda, o fundo e o ícone levam a cor do tom;
 * o texto fica na cor normal para se ler em qualquer tema. Sem estado nem hooks: serve em página de servidor e em
 * componente cliente.
 */
export function FaixaAviso({
  tom = "info",
  icone,
  acoes,
  className,
  children,
}: {
  tom?: TomAviso;
  icone?: NomeIcone;
  acoes?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { matiz, icone: iconePadrao } = TONS[tom];
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={`flex flex-wrap items-start gap-x-3 gap-y-2 rounded-md border px-4 py-3 text-sm text-foreground ${matiz} border-[color-mix(in_srgb,var(--matiz,var(--ambar))_55%,transparent)] bg-[color-mix(in_srgb,var(--matiz,var(--ambar))_10%,var(--surface))] ${className ?? ""}`}
    >
      <Icone nome={icone ?? iconePadrao} className="texto-matiz mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {acoes ? <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  );
}
