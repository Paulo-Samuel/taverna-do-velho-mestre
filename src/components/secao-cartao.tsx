import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

// Seção em cartão das páginas de ajustes (Ajustes da mesa, Cópias e lixeira): título com ícone na cor do matiz.
// Quem chama passa o matiz como texto literal ("matiz-1"...), para o Tailwind enxergar a classe; `perigo` usa o matiz de sangue.

export function SecaoCartao({
  titulo,
  icone,
  matiz,
  perigo,
  id,
  children,
}: {
  titulo: string;
  icone?: NomeIcone;
  matiz?: string;
  perigo?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`cartao cartao-matiz relative scroll-mt-20 p-5 ${perigo ? "matiz-4" : (matiz ?? "")}`}>
      <h2 className="titulo mb-4 flex items-center gap-2 text-xl text-pergaminho">
        {icone && <Icone nome={icone} className="texto-matiz" />}
        {titulo}
      </h2>
      {children}
    </section>
  );
}
