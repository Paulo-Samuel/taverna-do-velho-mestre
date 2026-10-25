"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { excluirCampanha } from "@/lib/db";
import { ehDestaMaquina } from "@/lib/rede/local";

export async function excluirCampanhaAcao(form: FormData) {
  // apagar campanha é coisa do dono da máquina, nunca de um celular na rede (mesmo se o porteiro falhar)
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) return;
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) excluirCampanha(id);
  revalidatePath("/");
}
