"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/ficha/formulario-personagem";
import { sugestaoDeCenario } from "@/components/ficha/sugestoes";
import { aventuraDoSistema } from "@/lib/aventuras";
import { copiarPersonagem, criarCampanha, criarPersonagem, obterPersonagem, type ConfigCampanha } from "@/lib/db";
import { fichaDoFormulario } from "@/lib/formulario-ficha";
import { dificuldadeDe, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, tamanhoDe } from "@/lib/mestre/estilo";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema, SISTEMAS } from "@/lib/sistemas";
import { tomPadrao } from "@/lib/sistemas/sementes";

/**
 * Campanha nova + primeiro personagem, tudo do mesmo formulário (contrato em lib/formulario-ficha.ts).
 * Com `copia_de` (personagem de outra mesa, só nesta máquina), a ficha vem copiada dele em vez de montada pelos campos.
 */
export async function criarCampanhaAcao(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const copiaDe = Number(form.get("copia_de") ?? NaN);
  // personagem de origem (lido uma vez: valida a cópia e dá nome à campanha); null = ficha montada pelos campos
  const origem = Number.isInteger(copiaDe) && copiaDe > 0 ? obterPersonagem(copiaDe) : null;
  let r: ReturnType<typeof fichaDoFormulario> | { ok: true; sistema: ReturnType<typeof obterSistema>; ficha: null; jogador: string };
  if (Number.isInteger(copiaDe) && copiaDe > 0) {
    if (!(await daMaquinaNaPagina())) return { erro: "Só a máquina da taverna traz personagens de outra mesa." };
    if (!origem) return { erro: "Esse personagem não existe mais na mesa de origem. Monte a ficha do zero." };
    const sistemaId = String(form.get("sistema") ?? "");
    // SISTEMAS.some garante que obterSistema devolve o sistema pedido (para id desconhecido ele cairia no padrão)
    if (!SISTEMAS.some((s) => s.id === sistemaId) || origem.ficha.sistema !== sistemaId) return { erro: "A ficha trazida é de outro sistema de regras." };
    r = { ok: true, sistema: obterSistema(sistemaId), ficha: null, jogador: origem.jogador };
  } else {
    r = fichaDoFormulario(form);
  }
  if (!r.ok) return { erro: r.erro };
  const nomePersonagem = r.ficha?.nome ?? origem?.ficha.nome ?? "alguém";

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
  // cenário em branco no Vampiro: sem cidade, corte e Elysium o mestre cai num noir de motel genérico; uma semente sorteada
  // vira "Sugestão da taverna: …", que o jogador vê e edita nos ajustes da mesa
  const cenarioDigitado = String(form.get("cenario") ?? "").trim().slice(0, 1500);
  const cenario = cenarioDigitado || aventura?.cenario || (r.sistema.id === "vtm5" ? sugestaoDeCenario(r.sistema.id) : "");
  const id = criarCampanha({
    nome: String(form.get("campanha") ?? "").trim().slice(0, 80) || aventura?.titulo || `A saga de ${nomePersonagem}`,
    sistema: r.sistema.id,
    cenario,
    tom: String(form.get("tom") ?? "").trim().slice(0, 60) || aventura?.tom || tomPadrao(r.sistema.id),
    config,
  });
  if (r.ficha) criarPersonagem(id, r.ficha, r.jogador);
  else copiarPersonagem(copiaDe, id, { zerarXp: form.get("zerar_xp") === "1" });
  revalidatePath("/");
  // quem vai sentar mais gente na mesa começa pela tela da mesa, sem o mestre já abrir a cena
  redirect(form.get("adicionar_mais") === "1" ? `/mesa/${id}` : `/mesa/${id}?inicio=1`);
}
