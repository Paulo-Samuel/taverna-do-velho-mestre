import "server-only";
import { acharPersonagem, type ExtensaoFerramentas } from "./contexto";
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
  },
  notaTeste: " Vampiro: com disciplina na parada, o Despertar do poder vem junto. Caça, Frenesi, Remorso, Surto e Despertar avulso têm ferramentas próprias.",
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
      const opcoes = { matar: Boolean(e.matar), ...(e.manchas !== undefined ? { manchas: e.manchas } : {}), ...(e.ressonancia ? { ressonancia: e.ressonancia } : {}), ...(e.intensidade ? { intensidade: e.intensidade } : {}) };
      const teste = e.parada?.trim() ? `Caça: ${e.parada.trim()}` : "Caça";
      return comFicha(p, testeNaHora(ctx, p, { teste, alvo: e.dificuldade ?? 3, motivo: e.motivo || "Caçar", opcoes }));
    },
    teste_de_remorso: (ctx, entrada) => {
      const e = ENTRADAS.teste_de_remorso.parse(entrada);
      const p = acharPersonagem(ctx, e.personagem);
      return comFicha(p, testeNaHora(ctx, p, { teste: "Remorso", motivo: "Fim da noite: o peso do que fez" }));
    },
  },
};
