import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

/**
 * Lugar sem nada para mostrar: ícone (opcional), a frase, uma dica de como aquilo se enche e, se couber, uma ação.
 * Serve em componente de servidor e de cliente. Sem ícone, dica e ação é só a moldura tracejada com a frase em itálico.
 */
export function EstadoVazio({
  icone,
  children,
  dica,
  acao,
  compacto = false,
  className = "",
}: {
  icone?: NomeIcone;
  children: ReactNode;
  dica?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-border text-center text-sm text-muted ${compacto ? "px-3 py-4" : "px-4 py-6"} ${className}`}
    >
      {icone && (
        <p className={`${compacto ? "mb-1.5 text-xl" : "mb-2 text-2xl"} leading-none text-ambar/70`} aria-hidden>
          <Icone nome={icone} />
        </p>
      )}
      <p className="italic">{children}</p>
      {dica && <p className="mt-1 text-xs">{dica}</p>}
      {acao && <div className="mt-3 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}
