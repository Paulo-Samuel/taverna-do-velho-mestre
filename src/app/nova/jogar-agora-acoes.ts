"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cenarioDeAventura, comecoDe, montarCenario, tomDe } from "@/components/historia/criacao/comecos";
import { aventuraDoSistema, aventurasPublicas } from "@/lib/aventuras";
import { criarCampanha, criarPersonagem, listarCampanhas, type ConfigCampanha } from "@/lib/db";
import { escolherAventuraRapida, montarHeroiPronto } from "@/lib/inicio/heroi-pronto";
import { registrar } from "@/lib/log";
import { dificuldadeDe, tamanhoDe } from "@/lib/mestre/estilo";
import { ehDestaMaquina } from "@/lib/rede/local";
import { historia } from "@/lib/sistemas/historia";

// G15: "Jogar agora". Um clique cria campanha solo do modo história com herói de arquétipo e uma aventura curta, e a
// mesa já abre na primeira cena. Campos opcionais do formulário: "arquetipo" (id de ARQUETIPOS) e "aventura" (id de uma
// aventura do modo história); o que faltar ou não existir é sorteado.

const campo = (form: FormData, nome: string, max: number) => String(form.get(nome) ?? "").trim().slice(0, max);

export async function jogarAgoraAcao(form: FormData): Promise<void> {
  // abrir campanha é coisa do dono da máquina, nunca de um celular na rede (mesmo se o porteiro falhar)
  const h = await headers();
  if (!ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"))) return;

  let id = 0;
  let falhou = false;
  // a preparação (que já lê o banco) também fica no try: qualquer tropeço vira o aviso da home, não a tela de erro
  try {
    const semente = crypto.randomUUID().slice(0, 8);
    const heroi = montarHeroiPronto(semente, campo(form, "arquetipo", 40));

    const aventuraId = escolherAventuraRapida(aventurasPublicas("historia"), listarCampanhas().length > 0, semente, campo(form, "aventura", 60));
    const aventura = aventuraDoSistema(aventuraId, "historia");
    const ficha = historia.criarFicha({
      nome: heroi.nome,
      ancestralidade: heroi.origem,
      classe: heroi.classe,
      historia: heroi.historia,
      extras: { sexo: heroi.sexo, retrato: heroi.retrato },
    });
    const config: ConfigCampanha = {
      modoJogo: "historia",
      dados: "jogador",
      modo: "livre",
      dificuldade: dificuldadeDe(""),
      narracao: tamanhoDe(""),
      ...(aventura ? { aventura: aventura.id } : {}),
    };
    id = criarCampanha({
      nome: aventura?.titulo || `A saga de ${heroi.nome}`,
      sistema: "historia",
      cenario: aventura ? cenarioDeAventura(aventura.cenario, heroi.historia) : montarCenario(comecoDe(""), heroi.historia),
      tom: aventura ? aventura.tom : tomDe("").prompt,
      config,
    });
    criarPersonagem(id, ficha, "");
  } catch (e) {
    // só a mensagem do erro: nada de cenário, prompt ou narração no log
    registrar("erro", "jogar-agora", { mensagem: String(e) });
    falhou = true;
  }

  // redirect lança: fica fora do try
  if (falhou) redirect("/?falhou=jogar-agora");
  revalidatePath("/");
  redirect(`/mesa/${id}?inicio=1`);
}
