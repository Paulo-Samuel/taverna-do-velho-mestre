"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cenarioDeAventura, comecoDe, montarCenario, tomDe } from "@/components/historia/criacao/comecos";
import { fichaHistoriaDoFormulario, textoDoFormulario as texto } from "@/components/historia/criacao/ficha-formulario";
import { aventuraDoSistema } from "@/lib/aventuras";
import { criarCampanha, criarPersonagem, type ConfigCampanha } from "@/lib/db";
import { dificuldadeDe, tamanhoDe } from "@/lib/mestre/estilo";

// Criação rápida do modo história: campanha + personagem de uma vez, e a mesa já abre numa cena (a do começo escolhido).
// A leitura da ficha (nome, sexo, origem, ofício, aparência, história, retrato) fica em ficha-formulario.ts, que a ação de
// "mais um personagem" numa mesa do modo história (mesa/[id]/personagens/acoes.ts) também usa.

export type EstadoHistoria = { erro: string | null };

export async function criarHistoriaAcao(_anterior: EstadoHistoria, form: FormData): Promise<EstadoHistoria> {
  const r = fichaHistoriaDoFormulario(form);
  if (!r.ok) return { erro: r.erro };
  const { ficha, jogador } = r;
  const passado = ficha.historia ?? "";

  // aventura pronta (opcional): troca o começo pelo cenário dela; o tom "aventura" usa o tom que veio com ela
  const aventura = aventuraDoSistema(texto(form, "aventura", 60), "historia");
  const tomEscolhido = texto(form, "tom", 20);
  // começo, tom e estilo do mestre: ids desconhecidos caem no padrão (taverna, sombrio, justa, média)
  const config: ConfigCampanha = {
    modoJogo: "historia",
    dados: "jogador",
    modo: "livre",
    dificuldade: dificuldadeDe(texto(form, "dificuldade", 20)),
    narracao: tamanhoDe(texto(form, "narracao", 20)),
    ...(aventura ? { aventura: aventura.id } : {}),
  };
  let id: number;
  try {
    id = criarCampanha({
      nome: texto(form, "campanha", 80) || aventura?.titulo || `A saga de ${ficha.nome}`,
      sistema: "historia",
      cenario: aventura ? cenarioDeAventura(aventura.cenario, passado) : montarCenario(comecoDe(texto(form, "comeco", 20)), passado),
      tom: aventura && tomEscolhido === "aventura" ? aventura.tom : tomDe(tomEscolhido).prompt,
      config,
    });
    criarPersonagem(id, ficha, jogador);
  } catch (e) {
    console.error("[taverna] falha ao criar a história:", e);
    return { erro: "A taverna tropeçou ao abrir sua mesa (o banco não colaborou). Nada do que você escolheu se perdeu; tente de novo." };
  }

  revalidatePath("/");
  redirect(`/mesa/${id}?inicio=1`);
}
