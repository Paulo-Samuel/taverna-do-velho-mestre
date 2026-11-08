import "server-only";
import { listarDiario, salvarEntradaDiario } from "../../db";
import { normalizar } from "../../sistemas/comum";
import type { TipoDiario } from "../../sistemas/tipos";
import { publicar } from "../../tempo-real";
import type { DefFerramenta } from "../tipos";
import { registrarDado, type Executor } from "./contexto";
import { ENTRADAS } from "./esquemas";

// Diário da campanha: missões, NPCs, lugares, itens e pistas que os jogadores consultam.

export const DEF_ANOTAR_DIARIO: DefFerramenta = {
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
};

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

export const executoresDiario: Record<string, Executor> = {
  anotar_diario: (ctx, entrada) => {
    const e = ENTRADAS.anotar_diario.parse(entrada);
    const antes = listarDiario(ctx.campanha.id).find((x) => x.tipo === e.tipo && x.titulo.toLowerCase() === e.titulo.toLowerCase());
    // detalhes estruturados (personalidade do NPC, objetivo e pistas da missão) vão em `dados`
    const campos = ["aparencia", "voz", "jeito", "desejo", "temperamento", "relacao", "objetivo", "recompensa", "pistas"] as const;
    const dados = Object.fromEntries(campos.filter((c) => e[c] !== undefined && e[c] !== "").map((c) => [c, e[c]]));
    const nova = salvarEntradaDiario(ctx.campanha.id, {
      tipo: e.tipo,
      titulo: e.titulo,
      texto: e.texto?.trim(),
      status: normalizarStatus(e.tipo, e.status) ?? (antes ? undefined : e.tipo === "missao" ? "aberta" : undefined),
      ...(Object.keys(dados).length ? { dados } : {}),
    });
    publicar(ctx.campanha.id, { e: "diario", entradas: listarDiario(ctx.campanha.id) });
    // missão nova ou com status novo merece aviso no chat; o resto fica só no diário
    if (e.tipo === "missao" && (!antes || antes.status !== nova.status)) {
      const rotulo = { aberta: "Nova missão", concluida: "Missão concluída", falhou: "Missão fracassada" }[nova.status] ?? "Missão atualizada";
      registrarDado(ctx, `${rotulo}: ${nova.titulo}`, { tipo: "diario", entrada: nova, rotulo, resumo: `${rotulo}: ${nova.titulo}` });
    }
    return { entrada: nova, novo: !antes };
  },
};
