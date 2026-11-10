"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// G15: botão de enviar dos formulários de "Jogar agora". Fica desabilitado enquanto a action roda, para o duplo clique
// não abrir duas campanhas. `espera` é o que aparece no lugar do conteúdo durante o envio (null = mantém o conteúdo,
// para botões só de ícone). Com `nome`/`valor` o botão leva um campo no envio e vários dividem o mesmo formulário:
// todos travam juntos, mas só o clicado mostra a espera.
export function BotaoJogarAgora({
  children,
  className,
  espera,
  rotulo,
  nome,
  valor,
}: {
  children: ReactNode;
  className?: string;
  espera?: ReactNode | null;
  rotulo?: string;
  nome?: string;
  valor?: string;
}) {
  const { pending, data } = useFormStatus();
  const meu = pending && (!nome || data?.get(nome) === valor);
  const naEspera = espera === undefined ? "Arrastando um banco…" : espera;
  return (
    <button type="submit" className={className ?? "btn-palco"} name={nome} value={valor} disabled={pending} aria-busy={meu} aria-label={rotulo}>
      {meu && naEspera !== null ? naEspera : children}
    </button>
  );
}
