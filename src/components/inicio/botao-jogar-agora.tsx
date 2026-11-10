"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// G15: botão de enviar dos formulários de "Jogar agora". Fica desabilitado enquanto a action roda, para o duplo clique
// não abrir duas campanhas. `espera` é o que aparece no lugar do conteúdo durante o envio (null = mantém o conteúdo,
// para botões só de ícone).
export function BotaoJogarAgora({
  children,
  className,
  espera,
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  espera?: ReactNode | null;
  rotulo?: string;
}) {
  const { pending } = useFormStatus();
  const naEspera = espera === undefined ? "Arrastando um banco…" : espera;
  return (
    <button type="submit" className={className ?? "btn-palco"} disabled={pending} aria-busy={pending} aria-label={rotulo}>
      {pending && naEspera !== null ? naEspera : children}
    </button>
  );
}
