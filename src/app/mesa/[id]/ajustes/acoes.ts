"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { atualizarCampanha, excluirCampanha, listarFila, obterCampanha } from "@/lib/db";
import { cancelarTurno, forcarRodada } from "@/lib/mestre";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

// Ajustes da mesa. Só a máquina da taverna mexe aqui: quem está pela rede joga, mas não reforma o salão.

export type EstadoAjustes = { erro: string | null; ok?: string };

const NEGADO = "Só a máquina da taverna mexe nos ajustes da mesa.";

export async function salvarAjustesAcao(campanhaId: number, _anterior: EstadoAjustes, form: FormData): Promise<EstadoAjustes> {
  if (!(await daMaquinaNaPagina())) return { erro: NEGADO };
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return { erro: "Essa mesa não existe mais." };

  const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
  if (!nome) return { erro: "Toda campanha merece um nome, nem que seja \"Sem Nome\"." };
  const cenario = String(form.get("cenario") ?? "").trim().slice(0, 1500);
  const tom = String(form.get("tom") ?? "").trim().slice(0, 60) || "sombrio e debochado";
  const modo = form.get("modo") === "rodada" ? "rodada" : "livre";
  const modoAntes = campanha.config.modo ?? "livre";

  const dados = form.get("dados") === "automatico" ? "automatico" : "jogador";
  const sugestoes = form.get("sugestoes") === "on";

  atualizarCampanha(campanha.id, { nome, cenario, tom, config: { ...campanha.config, modo, dados, sugestoes } });
  // nome, tom e modo aparecem nos aparelhos: todo mundo recarrega o estado
  publicar(campanha.id, { e: "recarregar" });
  // saindo da rodada, as ações que esperavam os atrasados já podem ir para o mestre
  if (modoAntes === "rodada" && modo === "livre" && listarFila(campanha.id).length) forcarRodada(campanha.id);

  revalidatePath("/");
  revalidatePath(`/mesa/${campanha.id}`);
  return { erro: null, ok: modo !== modoAntes ? `Salvo. A mesa agora joga no modo ${modo}.` : "Salvo." };
}

export async function excluirCampanhaAcao(campanhaId: number, _anterior: EstadoAjustes, form: FormData): Promise<EstadoAjustes> {
  if (!(await daMaquinaNaPagina())) return { erro: NEGADO };
  const campanha = obterCampanha(campanhaId);
  if (!campanha) redirect("/");
  if (String(form.get("confirmacao") ?? "").trim().toLowerCase() !== campanha.nome.trim().toLowerCase()) {
    return { erro: "Digite o nome da campanha exatamente como está, para provar que não foi um esbarrão." };
  }
  // para o mestre no meio da frase e avisa quem está conectado antes de sumir com tudo
  cancelarTurno(campanha.id);
  publicar(campanha.id, { e: "erro", erro: "Esta campanha foi apagada na máquina da taverna. Hora de procurar outra mesa." });
  excluirCampanha(campanha.id);
  revalidatePath("/");
  redirect("/");
}
