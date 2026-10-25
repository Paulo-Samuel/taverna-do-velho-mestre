"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { salvarAjuste } from "@/lib/db";
import { criarProvedor, type AjustesMestre, type IdProvedor } from "@/lib/mestre";
import { ehDestaMaquina } from "@/lib/rede/local";
import { statusClaude, type StatusClaude } from "./claude-local";

// Ações da página de configurações. Só valem na máquina da taverna: aqui se escolhe um executável para rodar,
// então, além do porteiro, cada ação confere de novo de onde veio a requisição (cinto e suspensório).

const TEMPO_TESTE_MS = 90_000;

const esquema = z.object({
  // "" = deixa o .env decidir
  provedor: z.enum(["", "cli", "api", "falso"]),
  modeloCli: z.string().trim().max(80).regex(/^[\w.\-[\]]*$/, "Modelo do Claude Code com caracteres estranhos."),
  binCli: z.string().trim().max(400),
  modeloApi: z.string().trim().max(80).regex(/^[\w.-]*$/, "Modelo da API com caracteres estranhos."),
});

function lerFormulario(form: FormData) {
  return esquema.safeParse({
    provedor: String(form.get("provedor") ?? ""),
    modeloCli: String(form.get("modeloCli") ?? ""),
    binCli: String(form.get("binCli") ?? ""),
    modeloApi: String(form.get("modeloApi") ?? ""),
  });
}

/** Só grava o que foi preenchido; campo vazio volta a valer o .env. */
function paraAjustes(d: z.infer<typeof esquema>): AjustesMestre {
  const a: AjustesMestre = {};
  if (d.provedor) a.provedor = d.provedor as IdProvedor;
  if (d.modeloCli) a.modeloCli = d.modeloCli;
  if (d.binCli) a.binCli = d.binCli;
  if (d.modeloApi) a.modeloApi = d.modeloApi;
  return a;
}

async function exigirMaquina() {
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) throw new Error("As configurações só mudam na máquina da taverna.");
}

export type EstadoSalvar = { ok: boolean; mensagem: string } | null;

export async function salvarAjustesAcao(_anterior: EstadoSalvar, form: FormData): Promise<EstadoSalvar> {
  await exigirMaquina();
  const r = lerFormulario(form);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Formulário inválido." };
  salvarAjuste("mestre", paraAjustes(r.data));
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Anotado no livro da taverna. O próximo turno já usa isto." };
}

export type ResultadoTeste = { ok: boolean; provedor: string; resposta: string; ms: number };

/**
 * Faz uma pergunta boba ao mestre com os valores do formulário (salvos ou não), para conferir antes de jogar.
 * Usa criarProvedor(), o mesmo de provedorAtual(): ajuste → TAVERNA_PROVEDOR → cli.
 */
export async function testarConexaoAcao(form: FormData): Promise<ResultadoTeste> {
  await exigirMaquina();
  const r = lerFormulario(form);
  if (!r.success) return { ok: false, provedor: "?", resposta: r.error.issues[0]?.message ?? "Formulário inválido.", ms: 0 };
  const a = paraAjustes(r.data);
  const provedor = criarProvedor(a);

  const inicio = performance.now();
  const sinal = AbortSignal.timeout(TEMPO_TESTE_MS);
  try {
    const resposta = await provedor.texto({ sistema: "Responda só OK.", prompt: "ping", sinal });
    return { ok: true, provedor: provedor.nome, resposta: resposta.trim().slice(0, 300) || "(resposta vazia)", ms: Math.round(performance.now() - inicio) };
  } catch (e) {
    const msg = sinal.aborted ? `Sem resposta em ${TEMPO_TESTE_MS / 1000} s.` : e instanceof Error ? e.message : String(e);
    return { ok: false, provedor: provedor.nome, resposta: msg.slice(0, 600), ms: Math.round(performance.now() - inicio) };
  }
}

export async function statusLoginAcao(binCli: string): Promise<StatusClaude> {
  await exigirMaquina();
  return statusClaude(String(binCli ?? "").trim().slice(0, 400) || undefined);
}
