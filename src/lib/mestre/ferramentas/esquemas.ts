import "server-only";
import { z } from "zod";

// Validação das entradas das ferramentas (o que o modelo manda). As definições que o modelo lê ficam em cada arquivo da
// área (testes.ts, ficha.ts, cena.ts, diario.ts, vampiro.ts); estes esquemas são a porta: entrada inválida vira erro amigável.

export const varios = z.union([z.literal("todos"), z.array(z.string()), z.string().transform((s) => [s])]);

export const combatenteEntrada = z.object({
  nome: z.string().min(1),
  pv: z.number().int().nullable().optional(),
  pvMax: z.number().int().nullable().optional(),
  defesa: z.number().int().nullable().optional(),
  iniciativa: z.number().int().nullable().optional(),
  bonusIniciativa: z.number().int().optional(),
  condicoes: z.array(z.string()).optional(),
  aliado: z.boolean().optional(),
});

export const HUMORES = ["taverna", "calmo", "exploracao", "misterio", "tensao", "combate", "triste", "vitoria", "sombrio"] as const;

export const ENTRADAS = {
  teste: z.object({
    personagem: z.string().optional(),
    teste: z.string().min(1),
    alvo: z.number().int().nullable().optional(),
    modo: z.enum(["normal", "vantagem", "desvantagem"]).optional(),
    modificador: z.number().int().optional(),
    motivo: z.string().default(""),
    custo_despertar: z.number().int().min(0).max(3).optional(),
    nivel_poder: z.number().int().min(1).max(5).optional(),
    compulsao: z.enum(["serve", "contra", "sortear"]).optional(),
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
    custo_despertar: z.number().int().min(0).max(3).optional(),
    nivel_poder: z.number().int().min(1).max(5).optional(),
    compulsao: z.enum(["serve", "contra", "sortear"]).optional(),
  }),
  despertar_sangue: z.object({
    personagem: z.string().optional(),
    motivo: z.string().default(""),
    vezes: z.number().int().min(1).max(3).optional(),
    nivel_poder: z.number().int().min(1).max(5).optional(),
    rerrolar: z.boolean().optional(),
  }),
  surto_de_sangue: z.object({ personagem: z.string().optional(), motivo: z.string().default("") }),
  testar_frenesi: z.object({
    personagem: z.string().optional(),
    tipo: z.enum(["furia", "fome", "terror"]),
    dificuldade: z.number().int().min(1).max(6).optional(),
    motivo: z.string().default(""),
  }),
  cacar: z.object({
    personagem: z.string().optional(),
    dificuldade: z.number().int().min(1).max(6).optional(),
    ressonancia: z.enum(["colerica", "melancolica", "fleumatica", "sanguinea", "vazia"]).optional(),
    intensidade: z.enum(["fugaz", "intensa", "aguda", "discrasia"]).optional(),
    matar: z.boolean().optional(),
    manchas: z.number().int().min(0).max(5).optional(),
    parada: z.string().max(80).optional(),
    presa: z.string().max(80).optional(),
    motivo: z.string().default(""),
  }),
  teste_de_remorso: z.object({ personagem: z.string().optional() }),
  potencia_de_sangue: z.object({
    personagem: z.string().optional(),
    motivo: z.enum(["diablerie", "decadas"]),
    potencia_vitima: z.number().int().min(0).max(10).optional(),
    detalhe: z.string().max(200).default(""),
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
        humor: z.enum(HUMORES),
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
    sexo: z.string().max(20).optional(),
    oficio: z.string().max(80).optional(),
    objetivo: z.string().max(300).optional(),
    recompensa: z.string().max(200).optional(),
    pistas: z.array(z.string().max(300)).optional(),
  }),
};

export type EntradaCombatente = z.infer<typeof combatenteEntrada>;
export type EntradaCena = z.infer<typeof ENTRADAS.atualizar_cena>;
export type EntradaCombate = NonNullable<EntradaCena["combate"]>;
export type EntradaAlterarFicha = z.infer<typeof ENTRADAS.alterar_ficha>;
