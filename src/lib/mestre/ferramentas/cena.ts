import "server-only";
import { listarMensagens } from "../../db";
import { normalizar } from "../../sistemas/comum";
import type { DefFerramenta } from "../tipos";
import { acharCombatente, atualizarCombate, cenaAtual, darVez, gravarCena, iniciarCombate, passarVez, podeAgir, sincronizarPersonagens } from "./combate";
import { cobrarNarracao, persistirPersonagem, registrarDado, type ContextoFerramentas, type Executor } from "./contexto";
import { ENTRADAS, HUMORES, type EntradaCena } from "./esquemas";

// Cena: o painel que os jogadores veem (lugar, hora, música, rastreador de combate), a narração e as ações sugeridas.

export function defAtualizarCena(ctx: ContextoFerramentas): DefFerramenta {
  const combatente = {
    type: "object",
    properties: {
      nome: { type: "string", description: "Nome único (\"Goblin 1\", \"Capitã Ruiva\"). Nomes repetidos ganham número." },
      pv: { type: "integer" },
      pvMax: { type: "integer" },
      defesa: { type: "integer", description: `${ctx.sistema.rotulos.defesa} do inimigo.` },
      iniciativa: { type: "integer", description: "Valor fixo de iniciativa. Omita para o servidor rolar." },
      bonusIniciativa: { type: "integer", description: "Bônus somado à iniciativa rolada." },
      condicoes: { type: "array", items: { type: "string" } },
      aliado: { type: "boolean", description: "true para NPCs que lutam ao lado do grupo." },
    },
    required: ["nome"],
    additionalProperties: false,
  };
  // combate "leve" (ordem da ficção, sem rodadas): o rastreador é opcional e só guarda o PV dos inimigos
  const quandoCombate =
    ctx.sistema.combate?.modelo === "leve"
      ? "e, se quiser, numa luta com mais de uma troca de golpes (o rastreador aqui é opcional, só para o PV dos inimigos)"
      : "e em TODO combate";
  return {
    name: "atualizar_cena",
    description: `Atualiza o painel de cena que os jogadores veem: local, momento, clima, situação e o rastreador de combate. Chame ao mudar de lugar ou de hora, ${quandoCombate}: 'iniciar' (lista os inimigos; o servidor rola a iniciativa de todos), 'atualizar' (dano/cura e condições dos inimigos, reforços, fugas), 'proximo' (passa a vez) e 'encerrar'. Dano nos personagens dos jogadores continua sendo com alterar_ficha. Campos omitidos ficam como estão; string vazia apaga.`,
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título curto da cena, como capítulo de livro: \"Salão Comum\", \"A Ponte Quebrada\"." },
        musica: {
          type: "object",
          properties: {
            humor: { type: "string", enum: [...HUMORES] },
            energia: { type: "string", enum: ["baixa", "media", "alta"] },
          },
          required: ["humor"],
          additionalProperties: false,
          description: "Trilha sonora que toca para os jogadores. Mude quando o clima da cena mudar.",
        },
        local: { type: "string", description: "Onde o grupo está, curto: \"Porão da Taverna do Javali\"." },
        momento: { type: "string", description: "\"Madrugada\", \"Fim de tarde, 3º dia\"..." },
        clima: { type: "string", description: "\"Garoa fria\", \"Calor de rachar\"..." },
        situacao: { type: "string", description: "Uma frase sobre o que está acontecendo agora." },
        combate: {
          type: "object",
          properties: {
            acao: { type: "string", enum: ["iniciar", "atualizar", "proximo", "encerrar"] },
            inimigos: { type: "array", items: combatente, description: "No 'iniciar': todos os inimigos. No 'atualizar': novos ou alterados (pelo nome)." },
            dano: {
              type: "array",
              items: {
                type: "object",
                properties: { nome: { type: "string" }, pv: { type: "integer", description: "Dano sofrido (positivo). Negativo cura." } },
                required: ["nome", "pv"],
                additionalProperties: false,
              },
              description: "Dano em inimigos/aliados NPC.",
            },
            condicoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  adicionar: { type: "array", items: { type: "string" } },
                  remover: { type: "array", items: { type: "string" } },
                },
                required: ["nome"],
                additionalProperties: false,
              },
            },
            remover: { type: "array", items: { type: "string" }, description: "Nomes que saem do combate (fugiram, renderam-se)." },
            vez: { type: "string", description: "Pula a vez direto para este combatente." },
          },
          required: ["acao"],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  };
}

// texto pensado no raciocínio não chega ao jogador; esta ferramenta garante que a narração apareça
export const DEF_NARRAR: DefFerramenta = {
  name: "narrar",
  description:
    "Mostra a narração ao jogador, como um trecho do livro da aventura. Use SEMPRE na abertura e sempre que a narração vier entre ferramentas. O que você só pensa no raciocínio NÃO aparece para o jogador. Prosa no tamanho combinado, falas entre aspas. Não repita o mesmo texto fora da ferramenta.",
  input_schema: {
    type: "object",
    properties: { texto: { type: "string", description: "A narração completa deste momento (parágrafos separados por linha em branco)." } },
    required: ["texto"],
    additionalProperties: false,
  },
};

export const DEF_SUGERIR_ACOES: DefFerramenta = {
  name: "sugerir_acoes",
  description:
    "Mostra ao jogador 3 ações sugeridas como botões (ele também pode escrever a própria). Chame ao FIM de todo turno: uma ousada/arriscada, uma cautelosa ou social e uma curiosa/investigativa, escritas como o personagem faria (\"Agarrar o pano do Greg e exigir saber quem deixou a carta\"). Indique a perícia provável quando houver.",
  input_schema: {
    type: "object",
    properties: {
      acoes: {
        type: "array",
        items: {
          type: "object",
          properties: { texto: { type: "string" }, pericia: { type: "string" } },
          required: ["texto"],
          additionalProperties: false,
        },
        description: "2 a 4 ações curtas (até ~15 palavras cada).",
      },
    },
    required: ["acoes"],
    additionalProperties: false,
  },
};

function executarCena(ctx: ContextoFerramentas, e: EntradaCena) {
  const cena = cenaAtual(ctx);
  const tituloAntes = `${cena.titulo ?? ""}|${cena.local ?? ""}`;
  const soTituloAntes = cena.titulo ?? "";
  if (e.musica) {
    // marca desde quando este humor toca (o prompt diz ao mestre "há N turnos"); só a energia mudar não reinicia a contagem
    if (e.musica.humor !== cena.musica?.humor || cena.musicaDesde === undefined) {
      cena.musicaDesde = listarMensagens(ctx.campanha.id, 1)[0]?.id ?? 0;
    }
    cena.musica = e.musica;
  }
  // string vazia apaga o campo; omitido mantém
  for (const campo of ["titulo", "local", "momento", "clima", "situacao"] as const) {
    const v = e[campo];
    if (v === undefined) continue;
    if (v.trim()) cena[campo] = v.trim();
    else delete cena[campo];
  }

  const avisos: string[] = [];
  const c = e.combate;
  if (c) {
    const ativo = cena.combate?.ativo ? cena.combate : null;
    if (c.acao === "iniciar" && !ativo) {
      iniciarCombate(ctx, cena, c.inimigos ?? []);
      if (c.dano || c.condicoes || c.remover) atualizarCombate(ctx, cena.combate!, { ...c, inimigos: undefined }, avisos);
    } else if (c.acao === "encerrar") {
      if (ativo) {
        const caidos = ativo.ordem.filter((x) => !x.aliado && x.pv === 0).map((x) => x.nome);
        registrarDado(ctx, `Fim do combate após ${ativo.rodada} rodada${ativo.rodada === 1 ? "" : "s"}.`, {
          tipo: "combate",
          acao: "encerrar",
          rodadas: ativo.rodada,
          caidos,
          resumo: `Fim do combate após ${ativo.rodada} rodada${ativo.rodada === 1 ? "" : "s"}.${caidos.length ? ` Caídos: ${caidos.join(", ")}.` : ""}`,
        });
      }
      cena.combate = null;
    } else if (!ativo) {
      avisos.push("Não há combate em andamento: use acao 'iniciar' primeiro.");
    } else {
      if (c.acao === "iniciar") avisos.push("Já havia um combate: os inimigos novos entraram nele.");
      atualizarCombate(ctx, ativo, c, avisos);
      if (c.vez) {
        const i = acharCombatente(ativo.ordem, c.vez);
        if (i >= 0) darVez(ativo, i);
        else avisos.push(`"${c.vez}" não está no combate.`);
      } else if (c.acao === "proximo") {
        passarVez(ativo);
      }
    }
    if (cena.combate && !cena.combate.ordem.length) {
      cena.combate = null;
      avisos.push("Ninguém sobrou no combate: ele foi encerrado.");
    }
    if (cena.combate?.ativo) sincronizarPersonagens(ctx, cena.combate);
  }

  // mudou de lugar ou de título: vira um cabeçalho de capítulo no meio da história
  if ((e.titulo !== undefined || e.local !== undefined) && `${cena.titulo ?? ""}|${cena.local ?? ""}` !== tituloAntes && (cena.titulo || cena.local)) {
    registrarDado(ctx, [cena.local, cena.momento, cena.titulo].filter(Boolean).join(" · "), {
      tipo: "cena_titulo",
      titulo: cena.titulo ?? null,
      local: cena.local ?? null,
      momento: cena.momento ?? null,
    });
  }
  // cena nova (título novo, não só outro local): compulsões ("Compulsão: Crueldade") duram até o fim da cena
  if (e.titulo !== undefined && cena.titulo && (cena.titulo ?? "") !== soTituloAntes) {
    for (const p of ctx.personagens) {
      const sairam = p.ficha.condicoes.filter((c) => normalizar(c).startsWith("compuls"));
      if (!sairam.length) continue;
      p.ficha.condicoes = p.ficha.condicoes.filter((c) => !sairam.includes(c));
      persistirPersonagem(ctx, p);
      avisos.push(`Cena nova: ${p.ficha.nome} saiu da ${sairam.join(", ")}.`);
    }
  }
  gravarCena(ctx, cena);
  const combate = cena.combate?.ativo ? cena.combate : null;
  const deEmPe = combate?.ordem.filter((x) => !x.aliado && podeAgir(x)).map((x) => x.nome) ?? [];
  return {
    cena,
    ...(combate
      ? {
          rodada: combate.rodada,
          vezDe: combate.ordem[combate.vez]?.nome ?? null,
          inimigosDePe: deEmPe,
          ...(deEmPe.length === 0 ? { dica: "Nenhum inimigo de pé: encerre o combate e conceda XP." } : {}),
        }
      : {}),
    ...(avisos.length ? { avisos } : {}),
  };
}

export const executoresCena: Record<string, Executor> = {
  atualizar_cena: (ctx, entrada) => executarCena(ctx, ENTRADAS.atualizar_cena.parse(entrada)),
  narrar: (ctx, entrada) => {
    const e = ENTRADAS.narrar.parse(entrada);
    if (!ctx.narrar) throw new Error("Narração indisponível neste turno: escreva o texto na resposta.");
    ctx.narrar(e.texto);
    return { ok: true, mostrado: "O jogador já está lendo esta narração." };
  },
  sugerir_acoes: (ctx, entrada) => {
    const e = ENTRADAS.sugerir_acoes.parse(entrada);
    cobrarNarracao(ctx, "chame sugerir_acoes");
    const cena = cenaAtual(ctx);
    cena.sugestoes = e.acoes.slice(0, 4).map((a) => ({ texto: a.texto, ...(a.pericia ? { pericia: a.pericia } : {}) }));
    gravarCena(ctx, cena);
    return { ok: true, sugestoes: cena.sugestoes.length };
  },
};
