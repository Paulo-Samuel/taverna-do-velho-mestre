"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compactarSePreciso, copiarBanco, lerDaLixeira, removerDaLixeira } from "@/lib/backup";
import { ErroImportacao, importarCampanha } from "@/lib/db";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";

// Ações da página Cópias e lixeira. Só a máquina da taverna (o porteiro já barra a rede; aqui é a segunda tranca).
// O resultado volta pela URL (?copia=, ?restaurada=, ?erro=): a página é do servidor e mostra o aviso no topo.

const aviso = (chave: string, valor: string | number) => `/backup?${chave}=${encodeURIComponent(String(valor))}`;

export async function fazerCopiaAcao() {
  if (!(await daMaquinaNaPagina())) redirect(aviso("erro", "Só a máquina da taverna faz cópias."));
  let destino: string;
  try {
    const copia = await copiarBanco("manual");
    // cópia boa na mão: hora segura para compactar, se o arquivo estiver cheio de buracos
    compactarSePreciso();
    destino = aviso("copia", copia.arquivo);
  } catch (erro) {
    destino = aviso("erro", `Não deu para copiar o banco: ${(erro as Error).message}`);
  }
  revalidatePath("/backup");
  redirect(destino);
}

/** Recria a campanha da lixeira (ids novos, mesmo nome) e tira o arquivo da lixeira. */
export async function restaurarAcao(form: FormData) {
  if (!(await daMaquinaNaPagina())) redirect(aviso("erro", "Só a máquina da taverna restaura campanhas."));
  const arquivo = String(form.get("arquivo") ?? "");
  const dados = lerDaLixeira(arquivo);
  if (!dados) redirect(aviso("erro", "Esse arquivo não está mais na lixeira."));
  let destino: string;
  try {
    const id = importarCampanha(dados);
    removerDaLixeira(arquivo);
    destino = aviso("restaurada", id);
  } catch (erro) {
    destino = aviso("erro", erro instanceof ErroImportacao ? erro.message : "A restauração falhou no meio; nada foi gravado.");
    if (!(erro instanceof ErroImportacao)) console.error("[taverna] restaurar da lixeira:", erro);
  }
  revalidatePath("/");
  revalidatePath("/backup");
  redirect(destino);
}

/** Apaga de vez um arquivo da lixeira (a página pede confirmação antes). */
export async function apagarDaLixeiraAcao(form: FormData) {
  if (!(await daMaquinaNaPagina())) redirect(aviso("erro", "Só a máquina da taverna mexe na lixeira."));
  const ok = removerDaLixeira(String(form.get("arquivo") ?? ""));
  revalidatePath("/backup");
  redirect(ok ? aviso("apagada", 1) : aviso("erro", "Esse arquivo não está mais na lixeira."));
}
