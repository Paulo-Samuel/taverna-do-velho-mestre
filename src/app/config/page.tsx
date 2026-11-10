import type { Metadata } from "next";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { chaveDaApi, lerAjustesMestre, mestreIndisponivel, provedorAtual, type IdProvedor } from "@/lib/mestre";
import { finalDaChave, listarModelosApi } from "@/lib/mestre/provedor-api";
import { montarDiagnostico } from "@/lib/diagnostico";
import { portaAtual } from "@/lib/rede/enderecos";
import { ehDestaMaquina } from "@/lib/rede/local";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Icone } from "@/components/icones";
import { PainelPreferencias } from "@/components/config/painel-preferencias";
import { FormularioConfig, SecaoDiagnostico, type PadroesEnv } from "./formulario";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Configurações" };

/** De onde veio a ANTHROPIC_API_KEY: o .env.local da taverna ou o ambiente do sistema (só para mostrar, nunca a chave). */
function origemDaChave(): "env-local" | "ambiente" {
  try {
    const arquivo = path.join(process.cwd(), ".env.local");
    if (existsSync(arquivo) && /^\s*ANTHROPIC_API_KEY\s*=\s*\S/m.test(readFileSync(arquivo, "utf8"))) return "env-local";
  } catch {
    // sem acesso ao arquivo: diz só "ambiente"
  }
  return "ambiente";
}

export default async function PaginaConfig() {
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="cartao p-6 text-muted">As configurações do mestre só abrem na máquina da taverna. Daqui, só as mesas.</p>
        <PainelPreferencias />
      </main>
    );
  }
  const ajustes = lerAjustesMestre();
  const envProvedor = process.env.TAVERNA_PROVEDOR?.trim();
  const chave = chaveDaApi();
  // O que vale quando o campo fica vazio. Da chave de API só saem "tem", a origem e os 4 últimos caracteres.
  const padroes: PadroesEnv = {
    provedor: envProvedor === "api" || envProvedor === "falso" || envProvedor === "cli" ? (envProvedor as IdProvedor) : "cli",
    modeloCli: process.env.CLAUDE_CLI_MODELO?.trim() || "",
    binCli: process.env.CLAUDE_BIN?.trim() || "",
    modeloApi: process.env.TAVERNA_MODELO_API?.trim() || "claude-sonnet-5-5",
    temChaveApi: Boolean(chave),
    finalChaveApi: finalDaChave(chave),
    origemChaveApi: chave ? origemDaChave() : null,
    // só pergunta à API quem já escolheu ou está seguindo a API (a lista fica guardada por 10 min)
    modelosApi: chave && (ajustes.provedor === "api" || (!ajustes.provedor && envProvedor === "api")) ? await listarModelosApi(chave) : null,
  };
  // provedorAtual() nunca lança (sem chave ele devolve um mestre "parado"); a frase do problema vem de mestreIndisponivel()
  const problema = mestreIndisponivel();
  const mestrando = problema ? "Ninguém (o mestre configurado não consegue começar)" : provedorAtual().nome;
  // seção Diagnóstico: a porta é a do endereço que a pessoa abriu (3300 no atalho)
  const portaDoHost = Number(/\]?:(\d+)$/.exec(h.get("host") ?? "")?.[1] ?? 0);
  const diagnostico = await montarDiagnostico(portaDoHost || portaAtual(), { esperarFirewallMs: 0 });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <CabecalhoPagina
        className="max-w-4xl"
        titulo="Configurações"
        subtitulo={
          <>
            Quem senta na cadeira do mestre e quanto isso custa. Nada aqui sai desta máquina: fica gravado no banco local, e campo
            vazio volta a valer o <code className="text-ambar">.env.local</code>.
          </>
        }
      />
      <div className="max-w-4xl">
        {/* estado do mestre: ícone, nome e etiqueta dizem a mesma coisa que a cor */}
        <div className={`cartao cartao-matiz ${problema ? "matiz-4" : "matiz-2"} p-4`} role="status">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Icone nome={problema ? "close" : "candle"} className="texto-matiz shrink-0 text-xl" />
            <p className="min-w-0 flex-1 text-sm text-muted">
              <span className="block text-xs uppercase tracking-wider">Mestrando agora</span>
              <span className="block text-base text-pergaminho">{mestrando}</span>
            </p>
            <span className="etiqueta-matiz">{problema ? "parado" : "no ar"}</span>
          </div>
          {problema && <p className="mt-3 text-sm text-foreground">{problema}</p>}
        </div>

        <nav aria-label="Seções das configurações" className="mt-4 flex flex-wrap gap-2">
          {[
            { href: "#mestre", rotulo: "Mestre" },
            { href: "#preferencias", rotulo: "Preferências" },
            { href: "#diagnostico", rotulo: "Diagnóstico" },
          ].map((a) => (
            <a key={a.href} href={a.href} className="etiqueta-matiz min-h-10 px-4 text-sm hover:border-[var(--ambar)]">
              {a.rotulo}
            </a>
          ))}
        </nav>

        <FormularioConfig ajustes={ajustes} padroes={padroes} />
        <PainelPreferencias />
        <SecaoDiagnostico inicial={diagnostico} />
      </div>
    </main>
  );
}
