"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoHistoria } from "@/app/nova/historia-acoes";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { fichaHistoriaDoFormulario } from "@/components/historia/criacao/ficha-formulario";
import {
  adicionarMensagem,
  copiarPersonagem,
  criarPersonagem,
  definirJogador,
  listarMensagens,
  obterCampanha,
  obterPersonagem,
  salvarCena,
  salvarFicha,
  type Campanha,
  type Personagem,
} from "@/lib/db";
import { aplicarEdicao, aplicarEdicaoHistoria, linhaDaEdicao, opcoesEditaveis } from "@/lib/editar-ficha";
import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { registrar } from "@/lib/log";
import { publicarPersonagem } from "@/lib/mesa";
import { mesaOcupada } from "@/lib/mestre";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
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

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

/**
 * Editar um personagem que já está na mesa (página /mesa/[id]/personagens/[pid]/editar; campanha e personagem vêm com .bind).
 * Só a parte narrativa (lib/editar-ficha.ts): nome, jogador, história e as opções de criação sem número; no modo história,
 * nome, aparência, história e rosto. Atributos, perícias, disciplinas e o que o mestre grava em extras ficam intactos.
 * Mesmas portas das outras mexidas na ficha: PIN da mesa, nada com o mestre narrando (o turno grava a ficha que leu por
 * cima) e, pela rede, só o dono do personagem (pelo apelido, como no reivindicar) ou um personagem sem dono.
 */
export async function editarPersonagemAcao(campanhaId: number, personagemId: number, _anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const mesa = await mesaAberta(campanhaId);
  if ("erro" in mesa) return { erro: mesa.erro };
  const { campanha } = mesa;
  const p = obterPersonagem(personagemId);
  if (!p || p.campanhaId !== campanha.id) return { erro: "Esse personagem não está nesta mesa." };
  if (mesaOcupada(campanha.id)) return { erro: "O mestre está narrando. Salve a ficha quando ele terminar (nada do que você escreveu se perdeu)." };

  const editor = String(form.get("editor") ?? "").trim();
  if (p.jogador && !mesmoNome(editor, p.jogador) && !(await daMaquinaNaPagina())) {
    return { erro: `${p.ficha.nome} é de ${p.jogador}. Pela rede, só o dono edita a ficha (ou a máquina da taverna).` };
  }

  const r =
    campanha.sistema === "historia"
      ? aplicarEdicaoHistoria(p.ficha, form, p.jogador)
      : aplicarEdicao(p.ficha, opcoesEditaveis(obterSistema(campanha.sistema).opcoesCriacao, p.ficha), form, p.jogador);
  if (!r.ok) return { erro: r.erro };

  if (r.mudancas.length) {
    try {
      salvarFicha(p.id, r.ficha);
      if (r.jogador !== p.jogador) definirJogador(p.id, r.jogador);
    } catch (e) {
      registrar("erro", "editar-personagem", { campanha: campanha.id, personagem: p.id, erro: e instanceof Error ? e.message : String(e) });
      return { erro: "A taverna tropeçou ao guardar a ficha (o banco de dados não colaborou). Tente de novo." };
    }

    // nome novo: a linha do personagem no rastreador de combate acompanha (ela é achada pelo nome)
    const combate = campanha.cena?.combate;
    const linha = r.ficha.nome !== p.ficha.nome ? combate?.ordem.find((c) => c.aliado && c.nome === p.ficha.nome) : undefined;
    if (combate && linha) {
      linha.nome = r.ficha.nome;
      salvarCena(campanha.id, campanha.cena);
      publicar(campanha.id, { e: "cena", cena: campanha.cena });
    }

    const atualizado = obterPersonagem(p.id)!;
    publicarPersonagem(campanha.id, atualizado);
    // linha curta no chat (e no histórico que o mestre lê): ele fica sabendo que a ficha mudou e o que mudou
    if (listarMensagens(campanha.id, 1).length) {
      const m = adicionarMensagem(campanha.id, "sistema", linhaDaEdicao(p.ficha.nome, r.ficha.nome, r.mudancas), { personagemId: p.id });
      publicar(campanha.id, { e: "mensagem", mensagem: m });
    }
    revalidatePath("/");
  }
  redirect(`/mesa/${campanha.id}?personagem=${p.id}`);
}
