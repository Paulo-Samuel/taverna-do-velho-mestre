"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

// Pedaços com estado da página Cópias e lixeira: botões que mostram "trabalhando…" e o importador de arquivo.

/** Botão de envio de um <form action={…}> do servidor, com texto de espera e confirmação opcional. */
export function BotaoEnviar({ texto, esperando, confirmar, perigo }: { texto: string; esperando: string; confirmar?: string; perigo?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={perigo ? "btn-borda hover:border-sangue hover:text-sangue" : "btn-borda"}
      disabled={pending}
      onClick={(e) => {
        if (confirmar && !confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? esperando : texto}
    </button>
  );
}

/** Importar um arquivo "taverna-campanha" (.json) pela rota /api/campanhas/importar. */
export function ImportarCampanha() {
  const [estado, setEstado] = useState<{ erro?: string; id?: number; nome?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(form: HTMLFormElement) {
    const arquivo = (form.elements.namedItem("arquivo") as HTMLInputElement | null)?.files?.[0];
    if (!arquivo) {
      setEstado({ erro: "Escolha o arquivo da campanha (.json)." });
      return;
    }
    setEnviando(true);
    setEstado(null);
    try {
      const dados = new FormData();
      dados.append("arquivo", arquivo);
      const r = await fetch("/api/campanhas/importar", { method: "POST", body: dados });
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string; id?: number };
      if (!r.ok || !corpo.id) setEstado({ erro: corpo.erro ?? `Erro ${r.status}` });
      else {
        setEstado({ id: corpo.id, nome: arquivo.name });
        form.reset();
      }
    } catch {
      setEstado({ erro: "A taverna não respondeu. O servidor está de pé?" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar(e.currentTarget);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="arquivo"
          accept=".json,application/json"
          aria-label="Arquivo da campanha"
          className="min-w-0 flex-1 text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-foreground"
        />
        <button className="btn-borda" disabled={enviando}>
          {enviando ? "Importando…" : "Importar"}
        </button>
      </div>
      {estado?.erro && (
        <p role="alert" className="text-sm text-sangue">
          {estado.erro}
        </p>
      )}
      {estado?.id && (
        <p role="status" className="text-sm text-musgo">
          ✓ Campanha importada.{" "}
          <Link href={`/mesa/${estado.id}`} className="underline hover:text-ambar">
            Abrir a mesa
          </Link>
        </p>
      )}
    </form>
  );
}
