"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { aventuraDoSistema } from "@/lib/aventuras";
import { criarCampanha, criarPersonagem, type ConfigCampanha } from "@/lib/db";
import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { dificuldadeDe, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, tamanhoDe } from "@/lib/mestre/estilo";
import { tomPadrao } from "@/lib/sistemas/sementes";

/** Campanha nova + primeiro personagem, tudo do mesmo formulário (contrato em lib/formulario-ficha.ts). */
export async function criarCampanhaAcao(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const r = fichaDoFormulario(form);
  if (!r.ok) return { erro: r.erro };

  // PIN só com letras e números: vai ser digitado no celular de quem chega pela rede
  const pin = String(form.get("pin") ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 12);
  // estilo do mestre: mesmas regras de limpeza dos ajustes da mesa (mesa/[id]/ajustes/acoes.ts)
  const foco = [...new Set(form.getAll("foco").map(String))].filter((f) => FOCOS.some((x) => x.id === f));
  const focoLivre = String(form.get("focoLivre") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FOCO_LIVRE);
  if (focoLivre) foco.push(focoLivre);
  // aventura pronta: só vale se existe e é deste sistema (o id veio do navegador)
  const aventura = aventuraDoSistema(String(form.get("aventura") ?? ""), r.sistema.id);
  const config: ConfigCampanha = {
    modoJogo: "avancado",
    modo: form.get("modo_mesa") === "rodada" ? "rodada" : "livre",
    dados: form.get("dados") === "automatico" ? "automatico" : "jogador",
    sugestoes: form.get("sugestoes") === "on",
    dificuldade: dificuldadeDe(form.get("dificuldade")),
    narracao: tamanhoDe(form.get("narracao")),
    foco,
    instrucoes: String(form.get("instrucoes") ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX_INSTRUCOES),
    ...(pin ? { pin } : {}),
    ...(aventura ? { aventura: aventura.id } : {}),
  };
  const id = criarCampanha({
    nome: String(form.get("campanha") ?? "").trim().slice(0, 80) || aventura?.titulo || `A saga de ${r.ficha.nome}`,
    sistema: r.sistema.id,
    cenario: String(form.get("cenario") ?? "").trim().slice(0, 1500) || aventura?.cenario || "",
    tom: String(form.get("tom") ?? "").trim().slice(0, 60) || aventura?.tom || tomPadrao(r.sistema.id),
    config,
  });
  criarPersonagem(id, r.ficha, r.jogador);
  revalidatePath("/");
  // quem vai sentar mais gente na mesa começa pela tela da mesa, sem o mestre já abrir a cena
  redirect(form.get("adicionar_mais") === "1" ? `/mesa/${id}` : `/mesa/${id}?inicio=1`);
}
