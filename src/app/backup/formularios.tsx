"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FaixaAviso } from "@/components/faixa-aviso";
import { Icone } from "@/components/icones";

// Pedaços com estado da página Cópias e lixeira: botões que mostram "trabalhando…" e o importador de arquivo.

/** Botão de envio de um <form action={…}> do servidor, com texto de espera e confirmação opcional. */
export function BotaoEnviar({ texto, esperando, confirmar, perigo }: { texto: string; esperando: string; confirmar?: string; perigo?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={perigo ? "btn-perigo" : "btn-borda"}
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
  // só para mostrar na tela: o arquivo em si continua indo pelo <input> do formulário
  const [escolhido, setEscolhido] = useState<string | null>(null);

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
        setEscolhido(null);
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
        <label
          className={`flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm transition hover:border-ambar/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ambar ${
            escolhido ? "border-ambar text-foreground" : "border-ambar/40 text-muted"
          }`}
        >
          <Icone nome="scroll" className="text-ambar" />
          <span className="min-w-0 break-all">{escolhido ?? "Escolha o arquivo da campanha (.json)"}</span>
          <input
            type="file"
            name="arquivo"
            accept=".json,application/json"
            aria-label="Arquivo da campanha"
            className="sr-only"
            onChange={(e) => setEscolhido(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <button className="btn-ambar min-h-12" disabled={enviando || !escolhido}>
          {enviando ? "Importando…" : "Importar"}
        </button>
      </div>
      {estado?.erro && <FaixaAviso tom="erro">{estado.erro}</FaixaAviso>}
      {estado?.id && (
        <FaixaAviso tom="sucesso">
          Campanha importada.{" "}
          <Link href={`/mesa/${estado.id}`} className="underline hover:text-ambar">
            Abrir a mesa
          </Link>
        </FaixaAviso>
      )}
    </form>
  );
}
