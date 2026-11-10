"use client";

import { useEffect, useState } from "react";
import { anuncioDaNarracao } from "@/lib/anuncio-narracao";

type MensagemAnunciavel = { id: number; tipo: string; texto: string };

const maiorId = (mensagens: MensagemAnunciavel[]) => mensagens.reduce((maior, m) => Math.max(maior, m.id), 0);

/**
 * Região viva e invisível: avisa o leitor de tela quando o mestre responde, com um trecho curto da narração.
 * O histórico que já estava na tela ao montar não é anunciado.
 */
export function AnunciadorNarracao({ mensagens }: { mensagens: MensagemAnunciavel[] }) {
  const [ultimoAnunciado, setUltimoAnunciado] = useState(() => maiorId(mensagens));
  const [texto, setTexto] = useState("");

  useEffect(() => {
    for (let i = mensagens.length - 1; i >= 0; i--) {
      const m = mensagens[i];
      if (m.tipo !== "mestre" || m.id <= ultimoAnunciado) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a região viva só fala quando o texto muda depois de montada
      setTexto(anuncioDaNarracao(m.texto));
      setUltimoAnunciado(m.id);
      return;
    }
  }, [mensagens, ultimoAnunciado]);

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {texto}
    </p>
  );
}
