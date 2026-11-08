import { revalidatePath } from "next/cache";
import { ErroImportacao, importarCampanha } from "@/lib/db";
import { ehLocal } from "@/lib/rede/local";
import { SISTEMAS } from "@/lib/sistemas";

// Recebe um arquivo "taverna-campanha" (exportado aqui ou noutra taverna) e cria uma campanha nova com ele.
// Aceita o JSON no corpo ou um formulário com o campo "arquivo". Só a máquina da taverna importa.
// Arquivo de versão mais nova que esta taverna é recusado; de versão antiga, atualizado antes (db/migracoes.ts).

/** Uma campanha de meses passa de poucos MB; isto é só para não engolir qualquer coisa. */
const LIMITE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  if (!ehLocal(request)) return Response.json({ erro: "Só a máquina da taverna importa campanhas." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > LIMITE) return Response.json({ erro: "Arquivo grande demais para uma campanha." }, { status: 413 });

  let texto: string;
  try {
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const arquivo = (await request.formData()).get("arquivo");
      if (!arquivo || typeof arquivo === "string") return Response.json({ erro: "Escolha o arquivo da campanha (.json)." }, { status: 400 });
      if (arquivo.size > LIMITE) return Response.json({ erro: "Arquivo grande demais para uma campanha." }, { status: 413 });
      texto = await arquivo.text();
    } else {
      texto = await request.text();
    }
  } catch {
    return Response.json({ erro: "Não deu para ler o arquivo enviado." }, { status: 400 });
  }

  let dados: unknown;
  try {
    dados = JSON.parse(texto.replace(/^﻿/, ""));
  } catch {
    return Response.json({ erro: "Esse arquivo não é um JSON de campanha da taverna." }, { status: 400 });
  }
  const sistema = (dados as { campanha?: { sistema?: unknown } } | null)?.campanha?.sistema;
  if (typeof sistema === "string" && !SISTEMAS.some((s) => s.id === sistema)) {
    return Response.json({ erro: `Esta taverna não conhece o sistema "${sistema}". Atualize a taverna e tente de novo.` }, { status: 400 });
  }

  try {
    const id = importarCampanha(dados);
    revalidatePath("/");
    return Response.json({ id, url: `/mesa/${id}` }, { status: 201 });
  } catch (erro) {
    if (erro instanceof ErroImportacao) return Response.json({ erro: erro.message }, { status: 400 });
    console.error("[taverna] importar campanha:", erro);
    return Response.json({ erro: "A importação falhou no meio; nada foi gravado." }, { status: 500 });
  }
}
