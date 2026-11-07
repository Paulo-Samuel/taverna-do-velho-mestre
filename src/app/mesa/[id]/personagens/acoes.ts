"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoHistoria } from "@/app/nova/historia-acoes";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { fichaHistoriaDoFormulario } from "@/components/historia/criacao/ficha-formulario";
import { adicionarMensagem, copiarPersonagem, criarPersonagem, listarMensagens, obterCampanha, obterPersonagem, type Campanha, type Personagem } from "@/lib/db";
import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { publicarPersonagem } from "@/lib/mesa";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

/** A mesa existe e quem chegou pode entrar nela (a porta do PIN é a mesma da página). */
async function mesaAberta(campanhaId: number): Promise<{ campanha: Campanha } | { erro: string }> {
  const campanha = obterCampanha(campanhaId);
  if (!campanha) return { erro: "Essa mesa não existe mais." };
  if (!(await acessoNaPagina(campanha))) return { erro: "Esta mesa pede PIN. Entre pela porta da frente primeiro." };
  return { campanha };
}

/** Senta o personagem: salva, avisa os aparelhos ligados e, com a aventura em andamento, registra no chat (e no histórico que o mestre lê). */
function sentarNaMesa(campanha: Campanha, p: Personagem): never {
  publicarPersonagem(campanha.id, p);
  if (listarMensagens(campanha.id, 1).length) {
    const m = adicionarMensagem(campanha.id, "sistema", `${p.ficha.nome} se junta ao grupo`, { personagemId: p.id });
    publicar(campanha.id, { e: "mensagem", mensagem: m });
  }
  revalidatePath("/");
  redirect(`/mesa/${campanha.id}?personagem=${p.id}`);
}

/** Mais um personagem no grupo (o id da campanha vem amarrado com .bind na página). */
export async function criarPersonagemAcao(campanhaId: number, _anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const mesa = await mesaAberta(campanhaId);
  if ("erro" in mesa) return { erro: mesa.erro };

  // personagem trazido de outra mesa (cartão "Trazer um personagem", só nesta máquina): a ficha vem copiada e descansada
  // (db.resetarFichaCopiada) em vez de lida dos campos
  const copiaDe = Number(form.get("copia_de") ?? NaN);
  if (Number.isInteger(copiaDe) && copiaDe > 0) {
    if (!(await daMaquinaNaPagina())) return { erro: "Só a máquina da taverna traz personagens de outra mesa." };
    const origem = obterPersonagem(copiaDe);
    if (!origem) return { erro: "Esse personagem não existe mais na mesa de origem. Monte a ficha do zero." };
    if (origem.ficha.sistema !== mesa.campanha.sistema) return { erro: "A ficha trazida é de outro sistema de regras: não cabe nesta mesa." };
    const p = copiarPersonagem(origem.id, mesa.campanha.id, { zerarXp: form.get("zerar_xp") === "1" });
    if (!p) return { erro: "Não deu para copiar a ficha. Monte-a do zero." };
    return sentarNaMesa(mesa.campanha, p);
  }

  // o sistema é o da mesa, não o que vier no formulário
  const r = fichaDoFormulario(form, mesa.campanha.sistema);
  if (!r.ok) return { erro: r.erro };

  const p = criarPersonagem(mesa.campanha.id, r.ficha, r.jogador);
  return sentarNaMesa(mesa.campanha, p);
}

/**
 * Mais um herói numa mesa do modo história: o formulário é o da criação do modo história (CriacaoHistoria modo="personagem"),
 * sem o passo da campanha; a ficha é lida pela mesma função que abre uma mesa nova.
 */
export async function criarPersonagemHistoriaAcao(campanhaId: number, _anterior: EstadoHistoria, form: FormData): Promise<EstadoHistoria> {
  const mesa = await mesaAberta(campanhaId);
  if ("erro" in mesa) return { erro: mesa.erro };
  if (mesa.campanha.sistema !== "historia") return { erro: "Esta mesa não é do modo história: crie o personagem pela ficha do sistema dela." };

  const r = fichaHistoriaDoFormulario(form);
  if (!r.ok) return { erro: r.erro };

  let p: Personagem;
  try {
    p = criarPersonagem(mesa.campanha.id, r.ficha, r.jogador);
  } catch (e) {
    console.error("[taverna] falha ao sentar o personagem na mesa:", e);
    return { erro: "A taverna tropeçou ao puxar o banco (o banco de dados não colaborou). Nada do que você escolheu se perdeu; tente de novo." };
  }
  return sentarNaMesa(mesa.campanha, p);
}
