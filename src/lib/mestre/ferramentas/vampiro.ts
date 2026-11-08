import "server-only";
import { sincronizarCombate } from "./combate";
import { acharPersonagem, persistirPersonagem, registrarDado, type ExtensaoFerramentas } from "./contexto";
import { ENTRADAS } from "./esquemas";
import { comFicha, testeNaHora } from "./testes";

// Extensão "sangue" (Vampiro V5): as regras de sangue que o servidor rola e aplica (o mestre só decide QUANDO).
// Liga nos sistemas que declaram `extensoesMestre: ["sangue"]`; a mecânica de cada uma mora no REGRAS do sistema e as
// descrições aqui dizem só quando chamar.

export const extensaoVampiro: ExtensaoFerramentas = {
  id: "sangue",
  vale: (s) => s.extensoesMestre?.includes("sangue") ?? false,
  camposTeste: {
    custo_despertar: { type: "integer", minimum: 0, maximum: 3, description: "Despertares do poder testado (SANGUE nas regras). Omita para o padrão." },
    nivel_poder: { type: "integer", minimum: 1, maximum: 5, description: "Nível do poder testado (1–5)." },
    compulsao: {
      type: "string",
      enum: ["serve", "contra", "sortear"],
      description: "Com compulsão ativa: serve (a ação a satisfaz, sem −2) ou contra (padrão, −2). sortear: Crítico Sujo também sorteia uma.",
    },
    oposicao_nome: { type: "string", description: "Teste oposto: quem resiste (NPC), mostrado no cartão." },
    oposicao_parada: {
      type: "integer",
      minimum: 1,
      maximum: 20,
      description: "Teste oposto: dados da parada do NPC. O servidor rola (sem Fome); empate fica com o NPC. Com isto, omita alvo.",
    },
    arma: { type: "integer", minimum: 0, maximum: 4, description: "Ataque: dano da arma (soco 0, faca 1, taco ou pistola 2, espingarda 4). O dano sugerido vem no resultado." },
  },
  notaTeste:
    " Vampiro: disciplina na parada já rola o Despertar; poder da ficha pelo nome traz custo e parada. Disputa com NPC: oposicao_parada. Caça, Frenesi, Remorso, Surto e Despertar avulso têm ferramentas próprias.",
  resultadoComFicha: true,
  sincronizarCombateAposTeste: true,

  definicoes: (_ctx, campos) => [
    {
      name: "despertar_sangue",
      description:
        "Despertar avulso: use quando um poder é usado SEM teste (correr com Celeridade, sumir com Ofuscação) ou ao corar ou comer para parecer vivo. Poder dentro de teste ou pedir_teste já desperta sozinho.",
      input_schema: {
        type: "object",
        properties: {
          personagem: campos.personagem,
          motivo: { type: "string", description: "O poder e o uso, ex.: \"Celeridade ●●: correr até a porta\" (cite a disciplina)." },
          vezes: { type: "integer", minimum: 1, maximum: 3, description: "Quantos Despertares o poder custa (padrão 1)." },
          nivel_poder: { type: "integer", minimum: 1, maximum: 5, description: "Nível do poder; omitido, o servidor lê do motivo (●●) ou da ficha." },
          rerrolar: { type: "boolean", description: "Concessão do mestre: força a rerrolagem do Despertar." },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "surto_de_sangue",
      description:
        "Surto de Sangue: use quando o personagem força o sangue para o próximo teste comum dele (arrombar, correr, resistir). O teste seguinte gasta o Surto sozinho.",
      input_schema: {
        type: "object",
        properties: { personagem: campos.personagem, motivo: { type: "string", description: "Para que o sangue é forçado, ex.: \"arrombar a porta de aço\"." } },
        additionalProperties: false,
      },
    },
    {
      name: "testar_frenesi",
      description:
        "Frenesi: use diante de provocação séria (furia), sangue à vista com Fome alta (fome) ou fogo e sol (terror), e quando o Despertar falha com Fome 5. O retorno diz o que narrar.",
      input_schema: {
        type: "object",
        properties: {
          personagem: campos.personagem,
          tipo: { type: "string", enum: ["furia", "fome", "terror"], description: "O gatilho: furia, fome ou terror (Rötschreck)." },
          dificuldade: { type: "integer", minimum: 1, maximum: 6, description: "Dificuldade (FRENESI nas regras). Omita para o padrão do tipo." },
          motivo: { type: "string", description: "O gatilho, mostrado no cartão." },
        },
        required: ["tipo"],
        additionalProperties: false,
      },
    },
    {
      name: "cacar",
      description:
        "Caça: use quando o personagem sai para se alimentar, como cena (onde, quem, como). O retorno diz o que narrar e a complicação da falha.",
      input_schema: {
        type: "object",
        properties: {
          personagem: campos.personagem,
          dificuldade: { type: "integer", minimum: 1, maximum: 6, description: "Dificuldade do lugar (ALIMENTAÇÃO nas regras; padrão 3)." },
          ressonancia: { type: "string", enum: ["colerica", "melancolica", "fleumatica", "sanguinea", "vazia"], description: "Humor da vítima, se a cena já definiu. Omita para sortear." },
          intensidade: { type: "string", enum: ["fugaz", "intensa", "aguda", "discrasia"], description: "Força da Ressonância. Omita para sortear." },
          matar: { type: "boolean", description: "true se o vampiro drena a vítima até a morte." },
          manchas: { type: "integer", minimum: 0, maximum: 5, description: "Manchas por matar (padrão 2; mais para inocentes ou contra as Convicções)." },
          parada: { type: "string", description: "Troca a parada de caça, ex.: \"Destreza + Briga\" (tipos de predador sem teste ou caça fora do costume)." },
          presa: {
            type: "string",
            description: "Quem é a vítima: \"mortal\", \"doador que consente\", \"morador local\", \"animal\", \"vampiro\". Obrigatório com Exclusão de Presa ou Fazendeiro na ficha.",
          },
          motivo: { type: "string", description: "Onde e como caça, mostrado no cartão." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "teste_de_remorso",
      description: "Remorso: use no fim da noite ou do arco, uma vez para cada personagem com Manchas. Sem Manchas não rola nada.",
      input_schema: {
        type: "object",
        properties: { personagem: campos.personagem },
        additionalProperties: false,
      },
    },
    {
      name: "potencia_de_sangue",
      description:
        "Potência de Sangue +1: só por diablerie de alguém mais potente (diga potencia_vitima) ou por décadas passadas na história. Nunca como prêmio de missão: XP é com conceder_xp.",
      input_schema: {
        type: "object",
        properties: {
          personagem: campos.personagem,
          motivo: { type: "string", enum: ["diablerie", "decadas"], description: "diablerie (drenou a alma de outro vampiro) ou decadas (o tempo passou na história)." },
          potencia_vitima: { type: "integer", minimum: 0, maximum: 10, description: "Diablerie: a Potência de Sangue da vítima (precisa ser maior que a do personagem)." },
          detalhe: { type: "string", description: "Quem foi drenado ou quanto tempo passou, mostrado no cartão." },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
  ],

  executores: {
    despertar_sangue: (ctx, entrada) => {
      const e = ENTRADAS.despertar_sangue.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      const opcoes = { vezes: e.vezes ?? 1, ...(e.nivel_poder ? { nivelPoder: e.nivel_poder } : {}), ...(e.rerrolar ? { rerrolar: true } : {}) };
      return comFicha(p, testeNaHora(ctx, p, { teste: "Despertar", motivo: e.motivo || "Despertar o sangue", opcoes }));
    },
    surto_de_sangue: (ctx, entrada) => {
      const e = ENTRADAS.surto_de_sangue.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      return comFicha(p, testeNaHora(ctx, p, { teste: "Surto de Sangue", motivo: e.motivo || "Surto de Sangue" }));
    },
    testar_frenesi: (ctx, entrada) => {
      const e = ENTRADAS.testar_frenesi.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      const motivo = e.motivo || { furia: "a Besta quer sangue de quem provocou", fome: "o cheiro de sangue chama", terror: "fogo! a Besta quer fugir" }[e.tipo];
      return comFicha(p, testeNaHora(ctx, p, { teste: "Frenesi", alvo: e.dificuldade ?? null, motivo, opcoes: { frenesi: e.tipo } }));
    },
    cacar: (ctx, entrada) => {
      const e = ENTRADAS.cacar.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      const opcoes = {
        matar: Boolean(e.matar),
        ...(e.manchas !== undefined ? { manchas: e.manchas } : {}),
        ...(e.ressonancia ? { ressonancia: e.ressonancia } : {}),
        ...(e.intensidade ? { intensidade: e.intensidade } : {}),
        ...(e.presa?.trim() ? { presa: e.presa.trim() } : {}),
      };
      const teste = e.parada?.trim() ? `Caça: ${e.parada.trim()}` : "Caça";
      return comFicha(p, testeNaHora(ctx, p, { teste, alvo: e.dificuldade ?? 3, motivo: e.motivo || "Caçar", opcoes }));
    },
    teste_de_remorso: (ctx, entrada) => {
      const e = ENTRADAS.teste_de_remorso.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      return comFicha(p, testeNaHora(ctx, p, { teste: "Remorso", motivo: "Fim da noite: o peso do que fez" }));
    },
    potencia_de_sangue: (ctx, entrada) => {
      const e = ENTRADAS.potencia_de_sangue.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      const antes = p.ficha.nivel;
      if (antes >= ctx.sistema.nivelMaximo) throw new Error(`${p.ficha.nome} já tem Potência de Sangue ${antes}, o máximo.`);
      if (e.motivo === "diablerie") {
        if (e.potencia_vitima === undefined) throw new Error("Diablerie: diga potencia_vitima, a Potência de Sangue de quem foi drenado.");
        if (e.potencia_vitima <= antes) {
          throw new Error(
            `Diablerie de alguém com Potência ${e.potencia_vitima} não engrossa o sangue de ${p.ficha.nome} (Potência ${antes}): só vítima mais potente sobe a Potência. Narre o gosto e as consequências (aura manchada, Manchas) sem mexer na Potência.`,
          );
        }
      }
      const xp = p.ficha.xp;
      const r = ctx.sistema.subirNivel(p.ficha);
      p.ficha = { ...r.ficha, xp };
      persistirPersonagem(ctx, p);
      sincronizarCombate(ctx);
      const porque = e.motivo === "diablerie" ? `diablerie (vítima com Potência ${e.potencia_vitima})` : "décadas de não-vida";
      const motivo = [porque, e.detalhe.trim()].filter(Boolean).join(": ");
      const dados = { tipo: "xp", personagem: p.ficha.nome, motivo, total: xp, nivel: p.ficha.nivel, subiuPara: p.ficha.nivel, resumo: r.resumo };
      registrarDado(ctx, `${p.ficha.nome}: Potência de Sangue ${antes} → ${p.ficha.nivel} — ${motivo}`, dados, p.id);
      return dados;
    },
  },
};
