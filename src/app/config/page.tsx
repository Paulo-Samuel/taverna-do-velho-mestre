import type { Metadata } from "next";
import { headers } from "next/headers";
import { lerAjustesMestre, provedorAtual, type IdProvedor } from "@/lib/mestre";
import { ehDestaMaquina } from "@/lib/rede/local";
import { FormularioConfig, type PadroesEnv } from "./formulario";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Configurações · Taverna do Velho Mestre" };

export default async function PaginaConfig() {
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="cartao p-6 text-muted">As configurações do mestre só abrem no computador da taverna. Daqui, só as mesas.</p>
      </main>
    );
  }
  const ajustes = lerAjustesMestre();
  const envProvedor = process.env.TAVERNA_PROVEDOR?.trim();
  // O que vale quando o campo fica vazio. Da chave de API só sai "tem" ou "não tem".
  const padroes: PadroesEnv = {
    provedor: envProvedor === "api" || envProvedor === "falso" || envProvedor === "cli" ? (envProvedor as IdProvedor) : "cli",
    modeloCli: process.env.CLAUDE_CLI_MODELO?.trim() || "",
    binCli: process.env.CLAUDE_BIN?.trim() || "",
    modeloApi: process.env.TAVERNA_MODELO_API?.trim() || "claude-sonnet-5-5",
    temChaveApi: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="titulo text-3xl text-pergaminho sm:text-4xl">Configurações</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Quem senta na cadeira do mestre e quanto isso custa. Nada aqui sai desta máquina: fica gravado no banco local, e campo vazio
        volta a valer o <code className="text-ambar">.env.local</code>.
      </p>
      <p className="mt-4 text-sm text-muted">
        Mestrando agora: <span className="text-ambar">{provedorAtual().nome}</span>
      </p>
      <FormularioConfig ajustes={ajustes} padroes={padroes} />
    </main>
  );
}
