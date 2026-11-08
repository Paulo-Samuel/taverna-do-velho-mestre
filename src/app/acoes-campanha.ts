"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { excluirCampanha } from "@/lib/db";
import { ehDestaMaquina } from "@/lib/rede/local";

export async function excluirCampanhaAcao(form: FormData) {
  // apagar campanha é coisa do dono da máquina, nunca de um celular na rede (mesmo se o porteiro falhar)
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) return;
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  // a campanha vai para a lixeira (data/lixeira) antes de sumir; sem conseguir gravar lá, nada é apagado
  let arquivo: string | null;
  try {
    arquivo = excluirCampanha(id);
  } catch (erro) {
    console.error("[taverna] excluir campanha:", erro);
    redirect("/backup?falhou=1");
  }
  revalidatePath("/");
  // a página da lixeira mostra o "desfazer" logo de cara
  if (arquivo) redirect(`/backup?excluida=${encodeURIComponent(arquivo)}`);
}
