"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { adicionarMensagem, criarPersonagem, listarMensagens, obterCampanha } from "@/lib/db";
import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { publicarPersonagem } from "@/lib/mesa";
import { acessoNaPagina } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

/** Mais um personagem no grupo (o id da campanha vem amarrado com .bind na página). */
export async function criarPersonagemAcao(campanhaId: number, _anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return { erro: "Essa mesa não existe mais." };
  if (!(await acessoNaPagina(campanha))) return { erro: "Esta mesa pede PIN. Entre pela porta da frente primeiro." };

  // o sistema é o da mesa, não o que vier no formulário
  const r = fichaDoFormulario(form, campanha.sistema);
  if (!r.ok) return { erro: r.erro };

  const p = criarPersonagem(campanha.id, r.ficha, r.jogador);
  publicarPersonagem(campanha.id, p);

  // com a aventura em andamento, avisa no chat (e no histórico que o mestre lê) que tem gente nova
  if (listarMensagens(campanha.id, 1).length) {
    const m = adicionarMensagem(campanha.id, "sistema", `${p.ficha.nome} se junta ao grupo`, { personagemId: p.id });
    publicar(campanha.id, { e: "mensagem", mensagem: m });
  }
  revalidatePath("/");
  redirect(`/mesa/${campanha.id}?personagem=${p.id}`);
}
