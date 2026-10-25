"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { criarCampanha, criarPersonagem, type ConfigCampanha } from "@/lib/db";
import { fichaDoFormulario } from "@/lib/formulario-ficha";

/** Campanha nova + primeiro personagem, tudo do mesmo formulário (contrato em lib/formulario-ficha.ts). */
export async function criarCampanhaAcao(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = fichaDoFormulario(form);
  if (!r.ok) return { erro: r.erro };

  // PIN só com letras e números: vai ser digitado no celular de quem chega pela rede
  const pin = String(form.get("pin") ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 12);
  const config: ConfigCampanha = {
    modo: form.get("modo_mesa") === "rodada" ? "rodada" : "livre",
    ...(pin ? { pin } : {}),
  };
  const id = criarCampanha({
    nome: String(form.get("campanha") ?? "").trim().slice(0, 80) || `A saga de ${r.ficha.nome}`,
    sistema: r.sistema.id,
    cenario: String(form.get("cenario") ?? "").trim().slice(0, 1500),
    tom: String(form.get("tom") ?? "").trim().slice(0, 60) || "sombrio e debochado",
    config,
  });
  criarPersonagem(id, r.ficha, r.jogador);
  revalidatePath("/");
  // quem vai sentar mais gente na mesa começa pela tela da mesa, sem o mestre já abrir a cena
  redirect(form.get("adicionar_mais") === "1" ? `/mesa/${id}` : `/mesa/${id}?inicio=1`);
}
