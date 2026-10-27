"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { comecoDe, montarCenario, tomDe } from "@/components/historia/criacao/comecos";
import { gerarRetrato, normalizarRetrato } from "@/components/historia/retrato/dados";
import { criarCampanha, criarPersonagem, type ConfigCampanha } from "@/lib/db";
import { dificuldadeDe, tamanhoDe } from "@/lib/mestre/estilo";
import { historia } from "@/lib/sistemas/historia";

// Criação rápida do modo história: campanha + personagem de uma vez, e a mesa já abre numa cena (a do começo escolhido).

export type EstadoHistoria = { erro: string | null };

const SEXOS = ["homem", "mulher", "outro"];

function texto(form: FormData, campo: string, max: number): string {
  return String(form.get(campo) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function criarHistoriaAcao(_anterior: EstadoHistoria, form: FormData): Promise<EstadoHistoria> {
  const nome = texto(form, "nome", 40);
  if (nome.length < 2) return { erro: "Todo herói tem nome. Até os que morrem na primeira cena." };

  const ancestralidade = texto(form, "origem", 30);
  if (!historia.ancestralidades.some((a) => a.id === ancestralidade)) return { erro: "Escolha de onde vem seu sangue (a origem)." };

  const classe = texto(form, "classe", 30);
  if (!historia.classes.some((c) => c.id === classe)) return { erro: "Escolha um ofício. Desocupado a taverna já tem demais." };

  const sexo = texto(form, "sexo", 10);
  if (!SEXOS.includes(sexo)) return { erro: "Diga como você é (homem, mulher ou outro)." };

  const aparencia = texto(form, "aparencia", 200);
  // a história guarda as quebras de linha; o resto dos campos não precisa
  const passado = String(form.get("historia") ?? "")
    .trim()
    .slice(0, 1500);

  let retrato = null;
  try {
    retrato = normalizarRetrato(JSON.parse(String(form.get("retrato") ?? "null")));
  } catch {
    retrato = null;
  }
  // o rosto escolhido veste o ofício escolhido; sem rosto, a taverna pinta um pelo nome
  retrato = retrato ? { ...retrato, sexo: sexo as "homem" | "mulher" | "outro", origem: ancestralidade } : gerarRetrato(nome, { sexo, origem: ancestralidade, classe });

  // começo, tom e estilo do mestre: ids desconhecidos caem no padrão (taverna, sombrio, justa, média)
  const config: ConfigCampanha = {
    modoJogo: "historia",
    dados: "jogador",
    modo: "livre",
    dificuldade: dificuldadeDe(texto(form, "dificuldade", 20)),
    narracao: tamanhoDe(texto(form, "narracao", 20)),
  };
  let id: number;
  try {
    id = criarCampanha({
      nome: texto(form, "campanha", 80) || `A saga de ${nome}`,
      sistema: "historia",
      cenario: montarCenario(comecoDe(texto(form, "comeco", 20)), passado),
      tom: tomDe(texto(form, "tom", 20)).prompt,
      config,
    });
    const ficha = historia.criarFicha({
      nome,
      ancestralidade,
      classe,
      historia: passado,
      extras: { sexo, ...(aparencia ? { aparencia } : {}), retrato },
    });
    criarPersonagem(id, ficha, texto(form, "jogador", 40));
  } catch (e) {
    console.error("[taverna] falha ao criar a história:", e);
    return { erro: "A taverna tropeçou ao abrir sua mesa (o banco não colaborou). Nada do que você escolheu se perdeu; tente de novo." };
  }

  revalidatePath("/");
  redirect(`/mesa/${id}?inicio=1`);
}
