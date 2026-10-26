import "server-only";
import { z } from "zod";
import {
  adicionarMensagem,
  listarDiario,
  obterCampanha,
  salvarCena,
  salvarEntradaDiario,
  salvarFicha,
  testesPendentes,
  type Campanha,
  type Personagem,
} from "../db";
import { ajustarReputacao } from "../sistemas/historia";
import { descreverRolagem, rolar } from "../dados";
import { acharPorNome, normalizar, sinal } from "../sistemas/comum";
import type { Cena, Combatente, Ficha, Sistema, TipoDiario } from "../sistemas/tipos";
import { publicar } from "../tempo-real";
import { visivel } from "../visivel";
import type { DefFerramenta } from "./tipos";

// Ferramentas do mestre. Valem para todos os sistemas e para os dois provedores:
// a API chama `executarFerramenta` direto; o Claude Code chega aqui pela ponte MCP (rota /api/interno/ferramentas).
// Cada ferramenta grava o resultado no banco e publica para todos os aparelhos da mesa.
// Os nomes teste, rolar_dados e alterar_ficha são usados pelos provedores e pela ponte: não renomeie.

export type ContextoFerramentas = {
  campanha: Campanha;
  sistema: Sistema;
  /** fichas do grupo; as ferramentas alteram e salvam aqui */
  personagens: Personagem[];
  /** fecha o trecho de narração em andamento antes de registrar um resultado (mantém a ordem no chat) */
  antes: () => void;
  /** quantos caracteres de narração o mestre já escreveu neste turno */
  narrado?: () => number;
  /** grava um trecho de narração vindo da ferramenta `narrar` (na ordem certa do chat) */
  narrar?: (texto: string) => void;
  /** mínimo de narração antes de sugerir ações ou pedir teste (0 = sem cobrança, ex.: conversa fora do jogo) */
  exigirNarracao?: number;
  /** a cobrança acontece uma vez por turno, para nunca travar o mestre num laço */
  cobrado?: boolean;
};

/** O mestre às vezes registra cena e diário e pula direto para as sugestões, sem narrar. A ferramenta recusa uma vez e pede o texto. */
function cobrarNarracao(ctx: ContextoFerramentas, oQue: string) {
  const minimo = ctx.exigirNarracao ?? 0;
  if (!minimo || ctx.cobrado || !ctx.narrado || ctx.narrado() >= minimo) return;
  ctx.cobrado = true;
  throw new Error(
    `Falta a narração deste turno: o jogador ainda não leu NADA da cena. O que você escreveu no raciocínio interno não aparece para ele. Chame AGORA a ferramenta narrar com a narração completa no tamanho combinado (onde estão, o que acontece, quem fala, o gancho), e só depois ${oQue} de novo.`,
  );
}

/** Sistema sem tabela de XP: o mestre sobe de nível por marcos. */
const porMarcos = (s: Sistema) => {
  try {
    return s.xpParaNivel(2) === null;
  } catch {
    return true;
  }
};

export function definirFerramentas(ctx: ContextoFerramentas): DefFerramenta[] {
  const nomes = ctx.personagens.map((p) => p.ficha.nome);
  const opcoes = nomes.join(", ") || "(nenhum)";
  const campoPersonagem = {
    type: "string",
    description: `Nome do personagem do jogador. Opções: ${opcoes}.${nomes.length === 1 ? " Pode omitir." : ""}`,
  };
  const campoVarios = {
    anyOf: [
      { type: "array", items: { type: "string" } },
      { type: "string", enum: ["todos"] },
    ],
    description: `Lista de nomes (${opcoes}) ou "todos".`,
  };
  const recursos = [...new Set(ctx.personagens.flatMap((p) => Object.entries(p.ficha.recursos).map(([id, r]) => `${id} (${r.rotulo})`)))];
  const marcos = porMarcos(ctx.sistema);
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

  // ações sugeridas valem nos dois modos (botões acima do campo de ação), a menos que a mesa desligue
  const mostraSugestoes = ctx.campanha.config.sugestoes !== false;
  const jogadorRola = jogadorRolaOsDados(ctx.campanha);

  const lista: DefFerramenta[] = [
    {
      name: "teste",
      description: `Rola um teste de um personagem do jogador pelas regras de ${ctx.sistema.nomeCurto}. Use sempre que o resultado de uma ação for incerto. O servidor aplica os modificadores da ficha e devolve o grau de sucesso. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}. Não invente o resultado: espere o retorno e narre a partir dele.`,
      input_schema: {
        type: "object",
        properties: {
          personagem: campoPersonagem,
          teste: { type: "string", description: "Perícia, atributo, salvamento/resistência, 'Ataque', 'Magia', 'Iniciativa'..." },
          alvo: { type: "integer", description: "CD/CA/dificuldade/oposição. Omita em sistemas de rolar abaixo do valor (d100) ou quando não houver." },
          modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
          modificador: { type: "integer", description: "Bônus ou penalidade circunstancial." },
          motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada aos jogadores." },
        },
        required: ["teste", "motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "rolar_dados",
      description:
        "Rola dados livres: dano, ataques e testes de inimigos, tabelas aleatórias, tesouro, reação de NPCs. Notação: 2d6+3, 1d20, 4d6kh3, 2d20kl1, 4dF, d%, 1d6! (explosivo).",
      input_schema: {
        type: "object",
        properties: {
          expressao: { type: "string", description: "Expressão de dados." },
          motivo: { type: "string", description: "Para que é a rolagem, mostrada aos jogadores." },
          secreta: { type: "boolean", description: "true para rolagens que os jogadores não devem ver o resultado (ex.: furtividade de um inimigo)." },
        },
        required: ["expressao", "motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "alterar_ficha",
      description: `Aplica mudanças na ficha de um personagem do jogador: dano ou cura (pv negativo/positivo), dinheiro, recursos (${recursos.join(", ") || "nenhum"}), itens e condições. Chame SEMPRE que a narração disser que alguém se feriu, curou, gastou magia, ganhou ou perdeu algo.`,
      input_schema: {
        type: "object",
        properties: {
          personagem: campoPersonagem,
          pv: { type: "integer", description: "Variação de PV: -7 para dano, +4 para cura." },
          dinheiro: { type: "integer", description: "Variação de dinheiro na moeda principal." },
          recursos: { type: "object", additionalProperties: { type: "integer" }, description: "Variação por id de recurso, ex.: {\"magia\": -1}." },
          ganhar_itens: { type: "array", items: { type: "string" } },
          perder_itens: { type: "array", items: { type: "string" } },
          adicionar_condicoes: { type: "array", items: { type: "string" } },
          remover_condicoes: { type: "array", items: { type: "string" } },
          motivo: { type: "string" },
        },
        required: ["motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "conceder_xp",
      description: marcos
        ? `${ctx.sistema.nomeCurto} sobe de nível por marcos: XP aqui é só registro. Para subir de nível use subir_nivel.`
        : `Concede XP a personagens ao fim de um encontro, missão ou marco da história. O servidor soma, sobe de nível sozinho quando passar do limite (${ctx.sistema.nomeCurto}) e avisa a mesa.`,
      input_schema: {
        type: "object",
        properties: {
          personagens: campoVarios,
          quantidade: { type: "integer", minimum: 0, description: "XP para CADA personagem listado." },
          motivo: { type: "string", description: "O que foi conquistado, mostrado aos jogadores." },
        },
        required: ["personagens", "quantidade", "motivo"],
        additionalProperties: false,
      },
    },
    {
      name: "descansar",
      description: `Aplica um descanso pelas regras de ${ctx.sistema.nomeCurto}: recupera PV e recursos conforme o tipo. Use quando o grupo realmente parar para descansar em segurança.`,
      input_schema: {
        type: "object",
        properties: {
          personagens: campoVarios,
          tipo: { type: "string", enum: ["curto", "longo"], description: "curto (uma pausa) ou longo (uma noite de sono)." },
        },
        required: ["personagens", "tipo"],
        additionalProperties: false,
      },
    },
    {
      name: "atualizar_cena",
      description:
        "Atualiza o painel de cena que os jogadores veem: local, momento, clima, situação e o rastreador de combate. Chame ao mudar de lugar ou de hora, e em TODO combate: 'iniciar' (lista os inimigos; o servidor rola a iniciativa de todos), 'atualizar' (dano/cura e condições dos inimigos, reforços, fugas), 'proximo' (passa a vez) e 'encerrar'. Dano nos personagens dos jogadores continua sendo com alterar_ficha. Campos omitidos ficam como estão; string vazia apaga.",
      input_schema: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título curto da cena, como capítulo de livro: \"Salão Comum\", \"A Ponte Quebrada\"." },
          musica: {
            type: "object",
            properties: {
              humor: { type: "string", enum: ["taverna", "calmo", "exploracao", "misterio", "tensao", "combate", "triste", "vitoria", "sombrio"] },
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
    },
    {
      name: "anotar_diario",
      description:
        "Anota no diário da campanha que os jogadores consultam: missões (com status), NPCs com nome, lugares, itens importantes e pistas. Mesmo tipo + mesmo título atualiza a entrada existente (use para mudar status). Anote assim que algo novo e nomeado aparecer.",
      input_schema: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["missao", "npc", "local", "item", "nota"] },
          titulo: { type: "string", description: "Nome da missão, do NPC, do lugar ou do item." },
          texto: { type: "string", description: "Uma ou duas frases: o que o grupo sabe. Omita para manter o texto anterior." },
          status: {
            type: "string",
            description: "missao: aberta | concluida | falhou. npc: aliado | neutro | hostil | morto. Outros tipos: livre ou vazio.",
          },
          aparencia: { type: "string", description: "npc: aparência marcante em poucas palavras." },
          voz: { type: "string", description: "npc: como soa (rouca, cantada, sussurrada, sotaque...)." },
          jeito: { type: "string", description: "npc: tiques, gestos, jeito de falar e de se mover." },
          desejo: { type: "string", description: "npc: o que ele quer de verdade." },
          temperamento: { type: "string", description: "npc: calmo, explosivo, desconfiado, bajulador..." },
          relacao: { type: "string", description: "npc: o que pensa do grupo agora." },
          objetivo: { type: "string", description: "missao: o que precisa ser feito." },
          recompensa: { type: "string", description: "missao: o que foi prometido." },
          pistas: { type: "array", items: { type: "string" }, description: "missao: pistas novas descobertas (acumulam)." },
        },
        required: ["tipo", "titulo"],
        additionalProperties: false,
      },
    },
  ];

  if (jogadorRola) {
    // modo em que o jogador rola: o mestre pede o teste e espera; o servidor só sorteia quando o jogador clica
    const i = lista.findIndex((f) => f.name === "teste");
    lista.splice(i, 1, {
      name: "pedir_teste",
      description: `Pede um teste a um personagem do jogador (${ctx.sistema.nomeCurto}). Quem rola é o JOGADOR, clicando no dado na tela; depois você recebe o resultado como nova mensagem e continua. Use só quando o resultado for incerto e importar. Depois de pedir, TERMINE a narração do turno com suspense, sem contar o resultado e sem narrar o que vem depois. No máximo um teste por personagem por turno. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}.`,
      input_schema: {
        type: "object",
        properties: {
          personagem: campoPersonagem,
          teste: { type: "string", description: "Perícia ou tipo de teste." },
          alvo: { type: "integer", description: "Dificuldade (CD)." },
          modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
          modificador: { type: "integer", description: "Bônus ou penalidade circunstancial (no Vampiro: dados a mais ou a menos na parada)." },
          perigoso: { type: "boolean", description: "true se a falha machuca ou custa caro (o jogador vê o aviso antes de rolar)." },
          motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada no cartão do dado." },
        },
        required: ["teste", "alvo", "motivo"],
        additionalProperties: false,
      },
    });
  }

  // texto pensado no raciocínio não chega ao jogador; esta ferramenta garante que a narração apareça
  lista.push({
    name: "narrar",
    description:
      "Mostra a narração ao jogador, como um trecho do livro da aventura. Use SEMPRE na abertura e sempre que a narração vier entre ferramentas. O que você só pensa no raciocínio NÃO aparece para o jogador. Prosa no tamanho combinado, falas entre aspas. Não repita o mesmo texto fora da ferramenta.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string", description: "A narração completa deste momento (parágrafos separados por linha em branco)." } },
      required: ["texto"],
      additionalProperties: false,
    },
  });

  if (mostraSugestoes) {
    lista.push({
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
    });
  }

  if (ctx.sistema.id === "historia") {
    lista.push({
      name: "ajustar_reputacao",
      description: "Muda a reputação de um personagem quando uma escolha moral pesa: bravura, honra, misericordia, generosidade, justica, lealdade (−10 a +10).",
      input_schema: {
        type: "object",
        properties: {
          personagem: campoPersonagem,
          eixo: { type: "string", enum: ["bravura", "honra", "misericordia", "generosidade", "justica", "lealdade"] },
          variacao: { type: "integer", description: "+1 a +3 para atos marcantes; negativo para o contrário." },
          motivo: { type: "string" },
        },
        required: ["eixo", "variacao", "motivo"],
        additionalProperties: false,
      },
    });
  }

  if (marcos) {
    lista.push({
      name: "subir_nivel",
      description: `Sobe um personagem um nível (${ctx.sistema.nomeCurto} usa marcos). Use ao fim de um arco, de uma missão importante ou de uma vitória marcante.`,
      input_schema: {
        type: "object",
        properties: { personagem: campoPersonagem, motivo: { type: "string" } },
        required: ["motivo"],
        additionalProperties: false,
      },
    });
  }
  return lista;
}

const varios = z.union([z.literal("todos"), z.array(z.string()), z.string().transform((s) => [s])]);

const combatenteEntrada = z.object({
  nome: z.string().min(1),
  pv: z.number().int().nullable().optional(),
  pvMax: z.number().int().nullable().optional(),
  defesa: z.number().int().nullable().optional(),
  iniciativa: z.number().int().nullable().optional(),
  bonusIniciativa: z.number().int().optional(),
  condicoes: z.array(z.string()).optional(),
  aliado: z.boolean().optional(),
});

const ENTRADAS = {
  teste: z.object({
    personagem: z.string().optional(),
    teste: z.string().min(1),
    alvo: z.number().int().nullable().optional(),
    modo: z.enum(["normal", "vantagem", "desvantagem"]).optional(),
    modificador: z.number().int().optional(),
    motivo: z.string().default(""),
  }),
  rolar_dados: z.object({ expressao: z.string().min(1), motivo: z.string().default(""), secreta: z.boolean().optional() }),
  alterar_ficha: z.object({
    personagem: z.string().optional(),
    pv: z.number().int().optional(),
    dinheiro: z.number().int().optional(),
    recursos: z.record(z.string(), z.number().int()).optional(),
    ganhar_itens: z.array(z.string()).optional(),
    perder_itens: z.array(z.string()).optional(),
    adicionar_condicoes: z.array(z.string()).optional(),
    remover_condicoes: z.array(z.string()).optional(),
    motivo: z.string().default(""),
  }),
  conceder_xp: z.object({ personagens: varios, quantidade: z.number().int().min(0).max(1_000_000), motivo: z.string().default("") }),
  subir_nivel: z.object({ personagem: z.string().optional(), motivo: z.string().default("") }),
  descansar: z.object({ personagens: varios, tipo: z.enum(["curto", "longo"]) }),
  pedir_teste: z.object({
    personagem: z.string().optional(),
    teste: z.string().min(1),
    alvo: z.number().int(),
    modo: z.enum(["normal", "vantagem", "desvantagem"]).optional(),
    modificador: z.number().int().optional(),
    perigoso: z.boolean().optional(),
    motivo: z.string().default(""),
  }),
  narrar: z.object({ texto: z.string().min(1) }),
  sugerir_acoes: z.object({
    acoes: z.array(z.object({ texto: z.string().trim().min(1).max(200), pericia: z.string().max(40).optional() })).max(6),
  }),
  ajustar_reputacao: z.object({
    personagem: z.string().optional(),
    eixo: z.string().min(1),
    variacao: z.number().int().min(-10).max(10),
    motivo: z.string().default(""),
  }),
  atualizar_cena: z.object({
    titulo: z.string().optional(),
    musica: z
      .object({
        humor: z.enum(["taverna", "calmo", "exploracao", "misterio", "tensao", "combate", "triste", "vitoria", "sombrio"]),
        energia: z.enum(["baixa", "media", "alta"]).default("media"),
      })
      .optional(),
    local: z.string().optional(),
    momento: z.string().optional(),
    clima: z.string().optional(),
    situacao: z.string().optional(),
    combate: z
      .object({
        acao: z.enum(["iniciar", "atualizar", "proximo", "encerrar"]),
        inimigos: z.array(combatenteEntrada).optional(),
        dano: z.array(z.object({ nome: z.string().min(1), pv: z.number().int() })).optional(),
        condicoes: z
          .array(z.object({ nome: z.string().min(1), adicionar: z.array(z.string()).optional(), remover: z.array(z.string()).optional() }))
          .optional(),
        remover: z.array(z.string()).optional(),
        vez: z.string().optional(),
      })
      .optional(),
  }),
  anotar_diario: z.object({
    tipo: z.enum(["missao", "npc", "local", "item", "nota"]),
    titulo: z.string().trim().min(1).max(120),
    texto: z.string().max(1000).optional(),
    status: z.string().max(40).optional(),
    aparencia: z.string().max(300).optional(),
    voz: z.string().max(200).optional(),
    jeito: z.string().max(300).optional(),
    desejo: z.string().max(300).optional(),
    temperamento: z.string().max(100).optional(),
    relacao: z.string().max(200).optional(),
    objetivo: z.string().max(300).optional(),
    recompensa: z.string().max(200).optional(),
    pistas: z.array(z.string().max(300)).optional(),
  }),
};

/** Quem rola os testes nesta campanha: por padrão o próprio jogador, na tela; "automatico" deixa o servidor rolar na hora. */
export function jogadorRolaOsDados(c: Campanha): boolean {
  return (c.config.dados ?? "jogador") === "jogador";
}

export function acharPersonagem(ctx: ContextoFerramentas, nome?: string): Personagem {
  if (!ctx.personagens.length) throw new Error("A mesa não tem personagens.");
  if (!nome) {
    if (ctx.personagens.length === 1) return ctx.personagens[0];
    throw new Error(`Diga qual personagem: ${ctx.personagens.map((p) => p.ficha.nome).join(", ")}.`);
  }
  const achado =
    acharPorNome(
      ctx.personagens.map((p) => ({ id: String(p.id), nome: p.ficha.nome, p })),
      nome,
    )?.p ?? ctx.personagens.find((p) => normalizar(p.ficha.nome).split(" ")[0] === normalizar(nome).split(" ")[0]);
  if (!achado) throw new Error(`Personagem "${nome}" não está na mesa. Opções: ${ctx.personagens.map((p) => p.ficha.nome).join(", ")}.`);
  return achado;
}

/** "todos" ou lista de nomes → personagens (sem repetir). */
function acharVarios(ctx: ContextoFerramentas, quem: z.infer<typeof varios>): Personagem[] {
  if (quem === "todos" || (quem.length === 1 && normalizar(quem[0]) === "todos")) {
    if (!ctx.personagens.length) throw new Error("A mesa não tem personagens.");
    return ctx.personagens;
  }
  if (!quem.length) throw new Error(`Diga quais personagens: ${ctx.personagens.map((p) => p.ficha.nome).join(", ")} ou "todos".`);
  return [...new Set(quem.map((n) => acharPersonagem(ctx, n)))];
}

/** Grava a ficha e avisa todos os aparelhos. */
export function persistirPersonagem(ctx: ContextoFerramentas, p: Personagem) {
  salvarFicha(p.id, p.ficha);
  publicar(ctx.campanha.id, { e: "personagem", personagem: visivel(ctx.sistema, p) });
}

/** Registra um resultado como mensagem de dado no chat e publica. */
export function registrarDado(ctx: ContextoFerramentas, texto: string, dados: Record<string, unknown>, personagemId: number | null = null) {
  ctx.antes();
  const mensagem = adicionarMensagem(ctx.campanha.id, "dado", texto, { dados, personagemId });
  publicar(ctx.campanha.id, { e: "mensagem", mensagem });
  return mensagem;
}

function aplicarMudancas(ficha: Ficha, e: z.infer<typeof ENTRADAS.alterar_ficha>) {
  const pvAntes = ficha.pv;
  if (e.pv) ficha.pv = Math.max(0, Math.min(ficha.pvMax, ficha.pv + e.pv));
  if (e.dinheiro) ficha.dinheiro = Math.max(0, ficha.dinheiro + e.dinheiro);
  const recursosMudados: string[] = [];
  for (const [id, delta] of Object.entries(e.recursos ?? {})) {
    const chave = ficha.recursos[id] ? id : Object.keys(ficha.recursos).find((k) => normalizar(ficha.recursos[k].rotulo).includes(normalizar(id)));
    if (!chave) continue;
    const r = ficha.recursos[chave];
    r.atual = Math.max(0, Math.min(r.max, r.atual + delta));
    recursosMudados.push(`${r.rotulo} ${r.atual}/${r.max}`);
  }
  for (const item of e.ganhar_itens ?? []) ficha.inventario.push(item);
  for (const item of e.perder_itens ?? []) {
    const i = ficha.inventario.findIndex((x) => normalizar(x) === normalizar(item));
    const j = i >= 0 ? i : ficha.inventario.findIndex((x) => normalizar(x).includes(normalizar(item)));
    if (j >= 0) ficha.inventario.splice(j, 1);
  }
  for (const c of e.adicionar_condicoes ?? []) if (!ficha.condicoes.some((x) => normalizar(x) === normalizar(c))) ficha.condicoes.push(c);
  const remover = (e.remover_condicoes ?? []).map(normalizar);
  ficha.condicoes = ficha.condicoes.filter((c) => !remover.includes(normalizar(c)));

  if (ficha.sistema === "fate") {
    // Fate: pv e o recurso "estresse" são o mesmo marcador; quem o mestre mexeu manda.
    // pv 0 é só "sem caixas": ainda há consequências, então nada de inconsciente automático.
    const estresse = ficha.recursos.estresse;
    if (estresse) {
      if (e.pv) estresse.atual = ficha.pv;
      else if (e.recursos && Object.keys(e.recursos).some((k) => normalizar(k).includes("estresse"))) ficha.pv = Math.min(ficha.pvMax, estresse.atual);
    }
    return { pvAntes, recursosMudados };
  }

  if (ficha.pv === 0 && !ficha.condicoes.includes("inconsciente")) ficha.condicoes.push("inconsciente");
  if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => c !== "inconsciente");
  if (ficha.sistema === "pf2e") condicoesMoribundoPf2(ficha, pvAntes);
  return { pvAntes, recursosMudados };
}

/** Valor N de uma condição "nome N" ("ferido 2" → 2); 0 quando ausente, 1 quando sem número. */
function valorCondicao(condicoes: string[], prefixo: string): number {
  const c = condicoes.find((x) => normalizar(x).startsWith(prefixo));
  return c ? Number(c.match(/(\d+)/)?.[1] ?? 1) : 0;
}

/** PF2e: caiu a 0 PV → moribundo 1 + ferido; voltou a ter PV → sai do moribundo e ganha (ou sobe) ferido. */
function condicoesMoribundoPf2(ficha: Ficha, pvAntes: number) {
  const ferido = valorCondicao(ficha.condicoes, "ferid");
  const moribundo = valorCondicao(ficha.condicoes, "moribund");
  const sem = (prefixo: string) => ficha.condicoes.filter((x) => !normalizar(x).startsWith(prefixo));
  if (ficha.pv === 0 && pvAntes > 0 && !moribundo) {
    ficha.condicoes = [...ficha.condicoes, `moribundo ${Math.min(4, 1 + ferido)}`];
  } else if (ficha.pv > 0 && moribundo) {
    ficha.condicoes = [...sem("moribund").filter((x) => !normalizar(x).startsWith("ferid")), `ferido ${ferido + 1}`];
  }
}

// ---------- cena e combate ----------

type Combate = NonNullable<Cena["combate"]>;

/** Cena mais recente (outro aparelho ou ferramenta pode ter mexido depois do início do turno). */
function cenaAtual(ctx: ContextoFerramentas): Cena {
  return structuredClone(obterCampanha(ctx.campanha.id)?.cena ?? ctx.campanha.cena ?? {});
}

function gravarCena(ctx: ContextoFerramentas, cena: Cena) {
  salvarCena(ctx.campanha.id, cena);
  ctx.campanha.cena = cena;
  publicar(ctx.campanha.id, { e: "cena", cena });
}

const ehPersonagem = (ctx: ContextoFerramentas, c: Combatente) => c.aliado && ctx.personagens.some((p) => p.ficha.nome === c.nome);

/** Copia PV, defesa e condições das fichas para as linhas dos personagens no rastreador. */
function sincronizarPersonagens(ctx: ContextoFerramentas, combate: Combate) {
  for (const c of combate.ordem) {
    const p = ehPersonagem(ctx, c) ? ctx.personagens.find((x) => x.ficha.nome === c.nome) : undefined;
    if (!p) continue;
    c.pv = p.ficha.pv;
    c.pvMax = p.ficha.pvMax;
    c.defesa = p.ficha.defesa || null;
    c.condicoes = [...p.ficha.condicoes];
  }
}

/** Depois de mexer em ficha durante um combate, o rastreador acompanha. */
function sincronizarCombate(ctx: ContextoFerramentas) {
  const cena = cenaAtual(ctx);
  if (!cena.combate?.ativo) return;
  sincronizarPersonagens(ctx, cena.combate);
  gravarCena(ctx, cena);
}

function acharCombatente(ordem: Combatente[], nome: string): number {
  const alvo = normalizar(nome);
  const exato = ordem.findIndex((c) => normalizar(c.nome) === alvo);
  if (exato >= 0) return exato;
  const comeco = ordem.findIndex((c) => normalizar(c.nome).startsWith(alvo));
  return comeco >= 0 ? comeco : ordem.findIndex((c) => alvo.includes(normalizar(c.nome)));
}

/** Dado de iniciativa para quem não tem ficha, conforme a mecânica do sistema. */
function dadoIniciativa(sistema: Sistema): string {
  const principal = sistema.dadoPrincipal.toLowerCase();
  if (principal.includes("df")) return "4dF";
  if (principal.includes("2d6")) return "2d6";
  if (principal.includes("100")) return "1d100";
  return "1d20";
}

type Rolado = Combatente & { bonus: number; detalhe: string };

function rolarInimigo(ctx: ContextoFerramentas, e: z.infer<typeof combatenteEntrada>, nome: string): Rolado {
  const pvMax = e.pvMax ?? e.pv ?? null;
  const pv = e.pv ?? pvMax;
  const bonus = e.bonusIniciativa ?? 0;
  let iniciativa: number;
  let detalhe: string;
  if (e.iniciativa !== undefined && e.iniciativa !== null) {
    iniciativa = e.iniciativa;
    detalhe = "fixa";
  } else {
    const r = rolar(`${dadoIniciativa(ctx.sistema)}${bonus ? sinal(bonus) : ""}`);
    iniciativa = r.total;
    detalhe = descreverRolagem(r);
  }
  return {
    nome,
    iniciativa,
    pv,
    pvMax,
    defesa: e.defesa ?? null,
    condicoes: e.condicoes ?? (pv === 0 ? ["caído"] : []),
    aliado: Boolean(e.aliado),
    bonus,
    detalhe,
  };
}

function rolarPersonagem(ctx: ContextoFerramentas, p: Personagem): Rolado {
  const f = p.ficha;
  let iniciativa: number;
  let bonus = 0;
  let detalhe: string;
  try {
    const r = ctx.sistema.resolverTeste(f, { teste: "Iniciativa", motivo: "Iniciativa" });
    iniciativa = r.total;
    bonus = r.bonus;
    detalhe = `${r.expressao} = ${r.total}`;
  } catch {
    // sistema sem teste de iniciativa: rola o dado da mecânica, sem bônus
    const r = rolar(dadoIniciativa(ctx.sistema));
    iniciativa = r.total;
    detalhe = descreverRolagem(r);
  }
  return { nome: f.nome, iniciativa, pv: f.pv, pvMax: f.pvMax, defesa: f.defesa || null, condicoes: [...f.condicoes], aliado: true, bonus, detalhe };
}

/** Nome sem repetir: "Goblin", "Goblin 2", "Goblin 3"... */
function nomeLivre(usados: string[], nome: string): string {
  const ocupado = (n: string) => usados.some((u) => normalizar(u) === normalizar(n));
  if (!ocupado(nome)) return nome;
  let i = 2;
  while (ocupado(`${nome} ${i}`)) i++;
  return `${nome} ${i}`;
}

/** Maior iniciativa primeiro; empate decide o bônus e, depois, o grupo age antes. */
function ordenar(lista: Rolado[]): Rolado[] {
  return [...lista].sort((a, b) => (b.iniciativa ?? 0) - (a.iniciativa ?? 0) || b.bonus - a.bonus || Number(Boolean(b.aliado)) - Number(Boolean(a.aliado)));
}

const semBonus = ({ nome, iniciativa, pv, pvMax, defesa, condicoes, aliado }: Rolado): Combatente => ({ nome, iniciativa, pv, pvMax, defesa, condicoes, aliado });

/** Inimigo caído não age; personagem caído age (testes contra a morte, ou o equivalente do sistema). */
const podeAgir = (c: Combatente) => c.aliado || c.pv === null || c.pv === undefined || c.pv > 0;

function passarVez(combate: Combate) {
  const n = combate.ordem.length;
  if (!n) return;
  for (let passo = 0; passo < n; passo++) {
    combate.vez += 1;
    if (combate.vez >= n) {
      combate.vez = 0;
      combate.rodada += 1;
    }
    if (podeAgir(combate.ordem[combate.vez])) return;
  }
}

function marcarCaido(c: Combatente) {
  const condicoes = (c.condicoes ?? []).filter((x) => normalizar(x) !== "caido");
  c.condicoes = c.pv === 0 ? [...condicoes, "caído"] : condicoes;
}

function iniciarCombate(ctx: ContextoFerramentas, cena: Cena, inimigos: z.infer<typeof combatenteEntrada>[]): Combate {
  const rolados: Rolado[] = ctx.personagens.map((p) => rolarPersonagem(ctx, p));
  for (const e of inimigos) rolados.push(rolarInimigo(ctx, e, nomeLivre(rolados.map((r) => r.nome), e.nome.trim())));
  const ordem = ordenar(rolados);
  const combate: Combate = { ativo: true, rodada: 1, vez: 0, ordem: ordem.map(semBonus) };
  if (!podeAgir(combate.ordem[0] ?? { nome: "", iniciativa: null })) passarVez(combate);
  cena.combate = combate;
  registrarDado(ctx, `Iniciativa: ${ordem.map((r) => `${r.nome} (${r.iniciativa})`).join(", ")}`, {
    tipo: "iniciativa",
    rodada: 1,
    ordem: ordem.map((r) => ({ nome: r.nome, iniciativa: r.iniciativa, aliado: r.aliado, detalhe: r.detalhe })),
    resumo: `Combate! Começa ${combate.ordem[combate.vez]?.nome ?? "ninguém"}.`,
  });
  return combate;
}

function atualizarCombate(ctx: ContextoFerramentas, combate: Combate, e: NonNullable<z.infer<typeof ENTRADAS.atualizar_cena>["combate"]>, avisos: string[]) {
  const atual = combate.ordem[combate.vez]?.nome;
  const fichaDe = (nome: string) => ctx.personagens.find((p) => normalizar(p.ficha.nome) === normalizar(nome));

  // inimigos novos entram na ordem pela iniciativa; os existentes são atualizados pelo nome
  const novos: Rolado[] = [];
  for (const ent of e.inimigos ?? []) {
    const i = acharCombatente(combate.ordem, ent.nome);
    if (i >= 0 && !ehPersonagem(ctx, combate.ordem[i])) {
      const c = combate.ordem[i];
      if (ent.pvMax !== undefined) c.pvMax = ent.pvMax;
      if (ent.pv !== undefined) c.pv = ent.pv;
      if (ent.defesa !== undefined) c.defesa = ent.defesa;
      if (ent.condicoes) c.condicoes = ent.condicoes;
      if (ent.aliado !== undefined) c.aliado = ent.aliado;
      if (ent.iniciativa !== undefined && ent.iniciativa !== null) c.iniciativa = ent.iniciativa;
      marcarCaido(c);
    } else if (i >= 0) {
      avisos.push(`${ent.nome} é personagem de jogador: use alterar_ficha.`);
    } else {
      novos.push(rolarInimigo(ctx, ent, nomeLivre([...combate.ordem, ...novos].map((c) => c.nome), ent.nome.trim())));
    }
  }
  if (novos.length) {
    const comBonus = combate.ordem.map((c) => ({ ...c, bonus: 0, detalhe: "" }));
    combate.ordem = ordenar([...comBonus, ...novos]).map(semBonus);
    registrarDado(ctx, `Reforços na iniciativa: ${novos.map((r) => `${r.nome} ${r.iniciativa}`).join(", ")}`, {
      tipo: "iniciativa",
      rodada: combate.rodada,
      ordem: novos.map((r) => ({ nome: r.nome, iniciativa: r.iniciativa, aliado: r.aliado, detalhe: r.detalhe })),
      resumo: `${novos.length === 1 ? "Entra" : "Entram"} no combate: ${novos.map((r) => r.nome).join(", ")}.`,
    });
  }

  for (const { nome, pv } of e.dano ?? []) {
    const i = acharCombatente(combate.ordem, nome);
    if (i < 0) {
      avisos.push(`"${nome}" não está no combate.`);
      continue;
    }
    const c = combate.ordem[i];
    if (ehPersonagem(ctx, c) || fichaDe(c.nome)) {
      avisos.push(`${c.nome} é personagem de jogador: o dano dele vai por alterar_ficha.`);
      continue;
    }
    if (c.pv === null || c.pv === undefined) {
      c.pv = Math.max(0, (c.pvMax ?? 0) - pv);
    } else {
      c.pv = Math.max(0, c.pv - pv);
      if (c.pvMax !== null && c.pvMax !== undefined) c.pv = Math.min(c.pv, c.pvMax);
    }
    marcarCaido(c);
  }

  for (const mud of e.condicoes ?? []) {
    const i = acharCombatente(combate.ordem, mud.nome);
    if (i < 0) {
      avisos.push(`"${mud.nome}" não está no combate.`);
      continue;
    }
    const c = combate.ordem[i];
    if (ehPersonagem(ctx, c)) {
      avisos.push(`${c.nome} é personagem de jogador: condições dele vão por alterar_ficha.`);
      continue;
    }
    const remover = (mud.remover ?? []).map(normalizar);
    const lista = (c.condicoes ?? []).filter((x) => !remover.includes(normalizar(x)));
    for (const nova of mud.adicionar ?? []) if (!lista.some((x) => normalizar(x) === normalizar(nova))) lista.push(nova);
    c.condicoes = lista;
  }

  for (const nome of e.remover ?? []) {
    const i = acharCombatente(combate.ordem, nome);
    if (i < 0) avisos.push(`"${nome}" não está no combate.`);
    else combate.ordem.splice(i, 1);
  }

  // a vez continua com quem estava agindo, mesmo que a ordem tenha mudado
  const j = atual ? combate.ordem.findIndex((c) => c.nome === atual) : -1;
  combate.vez = j >= 0 ? j : Math.min(combate.vez, Math.max(0, combate.ordem.length - 1));
}

function executarCena(ctx: ContextoFerramentas, e: z.infer<typeof ENTRADAS.atualizar_cena>) {
  const cena = cenaAtual(ctx);
  const tituloAntes = `${cena.titulo ?? ""}|${cena.local ?? ""}`;
  if (e.musica) cena.musica = e.musica;
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
        if (i >= 0) ativo.vez = i;
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

// ---------- progressão ----------

/** Soma XP e sobe quantos níveis couberem. Devolve os resumos de cada nível. */
function aplicarXp(ctx: ContextoFerramentas, p: Personagem, ganho: number) {
  p.ficha.xp = Math.max(0, (p.ficha.xp ?? 0) + ganho);
  const resumos: string[] = [];
  const nivelAntes = p.ficha.nivel;
  for (let guarda = 0; guarda < 40 && p.ficha.nivel < ctx.sistema.nivelMaximo; guarda++) {
    // a ficha vai junto: no B/X a tabela de XP (e o teto de nível) é da classe
    const limite = ctx.sistema.xpParaNivel(p.ficha.nivel + 1, p.ficha);
    if (limite === null || p.ficha.xp < limite) break;
    const xp = p.ficha.xp;
    const nivel = p.ficha.nivel;
    const r = ctx.sistema.subirNivel(p.ficha);
    p.ficha = { ...r.ficha, xp };
    resumos.push(r.resumo);
    // sistema que recusou subir (teto da classe): para o laço em vez de repetir o mesmo resumo
    if (p.ficha.nivel <= nivel) break;
  }
  const proximo = p.ficha.nivel < ctx.sistema.nivelMaximo ? ctx.sistema.xpParaNivel(p.ficha.nivel + 1, p.ficha) : null;
  return { resumos, subiu: p.ficha.nivel > nivelAntes, proximo };
}

const NORMAL_STATUS: Partial<Record<TipoDiario, Record<string, string>>> = {
  missao: { aberta: "aberta", ativa: "aberta", andamento: "aberta", concluida: "concluida", completa: "concluida", feita: "concluida", falhou: "falhou", falha: "falhou", fracassada: "falhou" },
  npc: { aliado: "aliado", aliada: "aliado", amigo: "aliado", neutro: "neutro", neutra: "neutro", hostil: "hostil", inimigo: "hostil", inimiga: "hostil", morto: "morto", morta: "morto" },
};

/** Normaliza o status conhecido do tipo ("Concluída" → "concluida"); o resto passa como veio. */
function normalizarStatus(tipo: TipoDiario, status: string | undefined): string | undefined {
  if (status === undefined) return undefined;
  const chave = normalizar(status);
  return NORMAL_STATUS[tipo]?.[chave] ?? (chave ? status.trim() : "");
}

/** Executa uma ferramenta pelo nome. Devolve o que volta para o modelo; lança Error com mensagem amigável em entrada inválida. */
export async function executarFerramenta(ctx: ContextoFerramentas, nome: string, entradaBruta: unknown): Promise<unknown> {
  if (nome === "teste") {
    const e = ENTRADAS.teste.parse(entradaBruta);
    const p = acharPersonagem(ctx, e.personagem);
    const r = ctx.sistema.resolverTeste(p.ficha, { teste: e.teste, alvo: e.alvo ?? null, modo: e.modo, modificador: e.modificador, motivo: e.motivo });
    // d100 rola abaixo do valor: "43 ≤ 52" diz mais que "43 vs 52"
    const comparacao = r.alvo === null ? "" : ctx.sistema.dadoPrincipal.includes("100") ? ` (alvo ${r.alvo})` : ` vs ${r.alvo}`;
    const texto = `${p.ficha.nome} · ${r.teste} — ${r.motivo}: ${r.expressao} → ${r.total}${comparacao} · ${r.rotuloGrau}`;
    registrarDado(ctx, texto, r, p.id);
    // ganchos do sistema depois do teste (d100 marca a perícia usada para a fase de desenvolvimento)
    try {
      const nova = ctx.sistema.aposTeste?.(p.ficha, r);
      if (nova) {
        p.ficha = nova;
        persistirPersonagem(ctx, p);
      }
    } catch (erro) {
      console.warn(`[taverna] aposTeste falhou (${ctx.sistema.id}):`, erro);
    }
    return r;
  }

  if (nome === "rolar_dados") {
    const e = ENTRADAS.rolar_dados.parse(entradaBruta);
    const r = rolar(e.expressao);
    const descricao = descreverRolagem(r);
    registrarDado(ctx, `${e.motivo}: ${e.secreta ? "rolagem secreta do mestre" : descricao}`, {
      tipo: "rolagem",
      origem: "mestre",
      motivo: e.motivo,
      secreta: Boolean(e.secreta),
      ...(e.secreta ? { expressao: r.expressao } : r),
      descricao: e.secreta ? null : descricao,
    });
    return { motivo: e.motivo, ...r, descricao };
  }

  if (nome === "alterar_ficha") {
    const e = ENTRADAS.alterar_ficha.parse(entradaBruta);
    const p = acharPersonagem(ctx, e.personagem);
    const { pvAntes, recursosMudados } = aplicarMudancas(p.ficha, e);
    persistirPersonagem(ctx, p);
    sincronizarCombate(ctx);
    const f = p.ficha;
    const resumo = {
      tipo: "ficha",
      personagem: f.nome,
      motivo: e.motivo,
      pvAntes,
      pv: f.pv,
      pvMax: f.pvMax,
      dinheiro: f.dinheiro,
      recursos: recursosMudados,
      ganhou: e.ganhar_itens ?? [],
      perdeu: e.perder_itens ?? [],
      condicoes: f.condicoes,
    };
    const delta = f.pv - pvAntes;
    registrarDado(ctx, `${f.nome}: ${e.motivo}${delta ? ` (PV ${delta > 0 ? "+" : ""}${delta} → ${f.pv}/${f.pvMax})` : ""}`, resumo, p.id);
    return resumo;
  }

  if (nome === "conceder_xp") {
    const e = ENTRADAS.conceder_xp.parse(entradaBruta);
    const alvos = acharVarios(ctx, e.personagens);
    const marcos = porMarcos(ctx.sistema);
    const resultados = [];
    for (const p of alvos) {
      let r: ReturnType<typeof aplicarXp>;
      try {
        r = aplicarXp(ctx, p, e.quantidade);
      } catch (erro) {
        // sistema que não sabe subir de nível (em construção): guarda o XP e segue
        r = { resumos: [`(não subiu de nível: ${erro instanceof Error ? erro.message : erro})`], subiu: false, proximo: null };
      }
      persistirPersonagem(ctx, p);
      const f = p.ficha;
      const resumo = r.subiu
        ? r.resumos.join(" ")
        : marcos
          ? `${f.nome} anotou ${e.quantidade} XP (total ${f.xp}). Nível por marcos: o mestre decide quando subir.`
          : `${f.nome} ganhou ${e.quantidade} XP (total ${f.xp}${r.proximo !== null ? `; próximo nível em ${r.proximo}` : ""}).`;
      const dados = {
        tipo: "xp",
        personagem: f.nome,
        motivo: e.motivo,
        ganho: e.quantidade,
        total: f.xp,
        nivel: f.nivel,
        proximo: r.proximo,
        ...(r.subiu ? { subiuPara: f.nivel } : {}),
        resumo,
      };
      registrarDado(ctx, `${f.nome}: +${e.quantidade} XP — ${e.motivo}${r.subiu ? ` · subiu para o nível ${f.nivel}!` : ""}`, dados, p.id);
      resultados.push(dados);
    }
    if (resultados.some((x) => "subiuPara" in x)) sincronizarCombate(ctx);
    return { resultados, ...(marcos ? { dica: "Sistema por marcos: use subir_nivel para subir de nível." } : {}) };
  }

  if (nome === "subir_nivel") {
    const e = ENTRADAS.subir_nivel.parse(entradaBruta);
    const p = acharPersonagem(ctx, e.personagem);
    if (p.ficha.nivel >= ctx.sistema.nivelMaximo) throw new Error(`${p.ficha.nome} já está no nível máximo (${ctx.sistema.nivelMaximo}).`);
    const xp = p.ficha.xp;
    const r = ctx.sistema.subirNivel(p.ficha);
    p.ficha = { ...r.ficha, xp };
    persistirPersonagem(ctx, p);
    sincronizarCombate(ctx);
    const dados = { tipo: "xp", personagem: p.ficha.nome, motivo: e.motivo, total: xp, nivel: p.ficha.nivel, subiuPara: p.ficha.nivel, resumo: r.resumo };
    registrarDado(ctx, `${p.ficha.nome} subiu para o nível ${p.ficha.nivel} — ${e.motivo}`, dados, p.id);
    return dados;
  }

  if (nome === "descansar") {
    const e = ENTRADAS.descansar.parse(entradaBruta);
    const alvos = acharVarios(ctx, e.personagens);
    const resultados = [];
    for (const p of alvos) {
      const pvAntes = p.ficha.pv;
      const r = ctx.sistema.descansar(p.ficha, e.tipo);
      p.ficha = r.ficha;
      persistirPersonagem(ctx, p);
      const f = p.ficha;
      const dados = { tipo: "descanso", descanso: e.tipo, personagem: f.nome, pvAntes, pv: f.pv, pvMax: f.pvMax, resumo: r.resumo };
      registrarDado(ctx, r.resumo, dados, p.id);
      resultados.push(dados);
    }
    sincronizarCombate(ctx);
    return { resultados };
  }

  if (nome === "atualizar_cena") {
    return executarCena(ctx, ENTRADAS.atualizar_cena.parse(entradaBruta));
  }

  if (nome === "anotar_diario") {
    const e = ENTRADAS.anotar_diario.parse(entradaBruta);
    const antes = listarDiario(ctx.campanha.id).find((x) => x.tipo === e.tipo && x.titulo.toLowerCase() === e.titulo.toLowerCase());
    // detalhes estruturados (personalidade do NPC, objetivo e pistas da missão) vão em `dados`
    const campos = ["aparencia", "voz", "jeito", "desejo", "temperamento", "relacao", "objetivo", "recompensa", "pistas"] as const;
    const dados = Object.fromEntries(campos.filter((c) => e[c] !== undefined && e[c] !== "").map((c) => [c, e[c]]));
    const entrada = salvarEntradaDiario(ctx.campanha.id, {
      tipo: e.tipo,
      titulo: e.titulo,
      texto: e.texto?.trim(),
      status: normalizarStatus(e.tipo, e.status) ?? (antes ? undefined : e.tipo === "missao" ? "aberta" : undefined),
      ...(Object.keys(dados).length ? { dados } : {}),
    });
    publicar(ctx.campanha.id, { e: "diario", entradas: listarDiario(ctx.campanha.id) });
    // missão nova ou com status novo merece aviso no chat; o resto fica só no diário
    if (e.tipo === "missao" && (!antes || antes.status !== entrada.status)) {
      const rotulo = { aberta: "Nova missão", concluida: "Missão concluída", falhou: "Missão fracassada" }[entrada.status] ?? "Missão atualizada";
      registrarDado(ctx, `${rotulo}: ${entrada.titulo}`, { tipo: "diario", entrada, rotulo, resumo: `${rotulo}: ${entrada.titulo}` });
    }
    return { entrada, novo: !antes };
  }

  if (nome === "pedir_teste") {
    const e = ENTRADAS.pedir_teste.parse(entradaBruta);
    cobrarNarracao(ctx, "peça o teste");
    const p = acharPersonagem(ctx, e.personagem);
    if (testesPendentes(ctx.campanha.id).some((m) => m.personagemId === p.id)) {
      throw new Error(`${p.ficha.nome} já tem um teste esperando o jogador rolar. Termine o turno.`);
    }
    // prévia só para mostrar o bônus no cartão; o dado de verdade é sorteado quando o jogador clica
    const previa = ctx.sistema.resolverTeste(p.ficha, { teste: e.teste, alvo: e.alvo, modo: e.modo, modificador: e.modificador, motivo: e.motivo });
    const dados = {
      tipo: "pedido_teste",
      status: "pendente",
      personagem: p.ficha.nome,
      personagemId: p.id,
      teste: previa.teste,
      testePedido: e.teste,
      // como a parada é rolada ("1d20+4", "7d10 (2 de Fome)"), para o cartão mostrar o dado certo antes do clique
      expressao: previa.expressao.replace(/\s+vs\s+.*$/, ""),
      dadoPrincipal: ctx.sistema.dadoPrincipal,
      alvo: e.alvo,
      bonus: previa.bonus,
      ...(e.modo && e.modo !== "normal" ? { modo: e.modo } : {}),
      ...(e.modificador ? { modificador: e.modificador } : {}),
      perigoso: Boolean(e.perigoso),
      motivo: e.motivo,
      sistema: ctx.sistema.id,
    };
    registrarDado(ctx, `${p.ficha.nome} precisa rolar ${previa.teste} (CD ${e.alvo}) — ${e.motivo}`, dados, p.id);
    return {
      pendente: true,
      personagem: p.ficha.nome,
      teste: previa.teste,
      alvo: e.alvo,
      instrucao:
        "O jogador vai rolar o dado agora. Termine a narração deste turno com suspense, sem revelar o resultado nem narrar o que acontece depois. O resultado chega no próximo turno.",
    };
  }

  if (nome === "narrar") {
    const e = ENTRADAS.narrar.parse(entradaBruta);
    if (!ctx.narrar) throw new Error("Narração indisponível neste turno: escreva o texto na resposta.");
    ctx.narrar(e.texto);
    return { ok: true, mostrado: "O jogador já está lendo esta narração." };
  }

  if (nome === "sugerir_acoes") {
    const e = ENTRADAS.sugerir_acoes.parse(entradaBruta);
    cobrarNarracao(ctx, "chame sugerir_acoes");
    const cena = cenaAtual(ctx);
    cena.sugestoes = e.acoes.slice(0, 4).map((a) => ({ texto: a.texto, ...(a.pericia ? { pericia: a.pericia } : {}) }));
    gravarCena(ctx, cena);
    return { ok: true, sugestoes: cena.sugestoes.length };
  }

  if (nome === "ajustar_reputacao") {
    const e = ENTRADAS.ajustar_reputacao.parse(entradaBruta);
    const p = acharPersonagem(ctx, e.personagem);
    const r = ajustarReputacao(p.ficha, e.eixo, e.variacao);
    p.ficha = r.ficha;
    persistirPersonagem(ctx, p);
    const dados = { tipo: "reputacao", personagem: p.ficha.nome, eixo: r.eixo, variacao: e.variacao, valor: r.valor, motivo: e.motivo };
    registrarDado(ctx, `${p.ficha.nome}: ${r.eixo} ${e.variacao > 0 ? "+" : ""}${e.variacao} — ${e.motivo}`, dados, p.id);
    return dados;
  }

  throw new Error(`Ferramenta desconhecida: ${nome}`);
}
