import "server-only";
import { normalizarSexo, retratoDoNpc } from "../../../components/historia/retrato/dados";
// subtipo do aviso de diário: decide o ícone do chip em "o que mudou" (leitor/cena.ts)
import type { SubtipoDiario } from "../../../components/leitor/cena";
import { listarDiario, salvarEntradaDiario } from "../../db";
import { ATITUDES, normalizarAtitude } from "../../atitude-npc";
import { normalizar } from "../../sistemas/comum";
import type { EntradaDiario, TipoDiario } from "../../sistemas/tipos";
import { publicar } from "../../tempo-real";
import type { DefFerramenta } from "../tipos";
import { registrarDado, type Executor } from "./contexto";
import { ENTRADAS } from "./esquemas";

// Diário da campanha: missões, NPCs, lugares, itens e pistas que os jogadores consultam.

export const DEF_ANOTAR_DIARIO: DefFerramenta = {
  name: "anotar_diario",
  description:
    "Anota no diário da campanha que os jogadores consultam: missões (com status), NPCs com nome, lugares, itens importantes e pistas. Mesmo tipo + mesmo título atualiza a entrada existente (use para mudar status). Anote assim que algo novo e nomeado aparecer. NPC novo: mande também sexo e oficio.",
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
      atitude: {
        type: "string",
        enum: [...ATITUDES],
        description: "npc: humor diante do grupo AGORA (uma palavra da lista). Mande ao anotar alguém novo e atualize quando o humor mudar.",
      },
      sexo: { type: "string", enum: ["homem", "mulher", "outro"], description: "npc: mande sempre ao anotar alguém novo (o retrato do códex sai daqui)." },
      oficio: { type: "string", description: "npc: ofício ou papel em poucas palavras (taverneira, guarda, padre, mercenário...); mande sempre ao anotar alguém novo." },
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

const NOVO: Record<Exclude<TipoDiario, "missao">, [SubtipoDiario, string]> = {
  npc: ["pessoa", "Nova pessoa"],
  local: ["lugar", "Novo lugar"],
  item: ["item", "Novo item"],
  // o prompt junta "notas e pistas": uma nota nova é, quase sempre, algo que o grupo descobriu
  nota: ["pista", "Pista"],
};

const pistasDe = (dados: Record<string, unknown> | undefined): string[] =>
  Array.isArray(dados?.pistas) ? (dados.pistas as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

/**
 * O que a anotação trouxe de novo para o jogador ver na cena: missão nova ou com status novo, pessoa, lugar, item ou nota novos,
 * NPC que mudou de lado (ou morreu) e cada pista acrescentada. Atualização sem novidade (texto, voz, relação) fica muda.
 */
export function novidadesDoDiario(antes: EntradaDiario | undefined, nova: EntradaDiario): { rotulo: string; subtipo: SubtipoDiario; pista?: string; status?: string }[] {
  const saida: { rotulo: string; subtipo: SubtipoDiario; pista?: string; status?: string }[] = [];
  if (nova.tipo === "missao") {
    if (!antes || antes.status !== nova.status)
      saida.push({ rotulo: { aberta: "Nova missão", concluida: "Missão concluída", falhou: "Missão fracassada" }[nova.status] ?? "Missão atualizada", subtipo: "missao" });
  } else if (!antes) {
    const [subtipo, rotulo] = NOVO[nova.tipo];
    saida.push({ rotulo, subtipo });
  } else if (nova.tipo === "npc" && nova.status && antes.status !== nova.status) {
    saida.push({ rotulo: "Pessoa", subtipo: "pessoa", status: nova.status });
  }
  const ja = new Set(pistasDe(antes?.dados).map((p) => normalizar(p)));
  for (const p of pistasDe(nova.dados)) {
    const k = normalizar(p);
    if (ja.has(k)) continue;
    ja.add(k);
    saida.push({ rotulo: "Pista", subtipo: "pista", pista: p.trim() });
  }
  return saida;
}

export const executoresDiario: Record<string, Executor> = {
  anotar_diario: (ctx, entrada) => {
    const e = ENTRADAS.anotar_diario.parse(entrada);
    const antes = listarDiario(ctx.campanha.id).find((x) => x.tipo === e.tipo && x.titulo.toLowerCase() === e.titulo.toLowerCase());
    // detalhes estruturados (personalidade do NPC, objetivo e pistas da missão) vão em `dados`
    const campos = ["aparencia", "voz", "jeito", "desejo", "temperamento", "relacao", "atitude", "sexo", "oficio", "objetivo", "recompensa", "pistas"] as const;
    const dados: Record<string, unknown> = Object.fromEntries(campos.filter((c) => e[c] !== undefined && e[c] !== "").map((c) => [c, e[c]]));
    if (dados.atitude !== undefined) {
      const a = normalizarAtitude(dados.atitude);
      if (!a) throw new Error(`atitude "${String(dados.atitude)}" não existe. Use uma destas: ${ATITUDES.join(", ")}.`);
      dados.atitude = a;
    }
    if (typeof dados.sexo === "string") dados.sexo = normalizarSexo(dados.sexo) ?? undefined;
    if (e.tipo === "npc") {
      // rosto do NPC: gerado uma vez (a semente é o nome); refeito só se o mestre mandar sexo ou ofício diferentes dos de antes
      const velhos = antes?.dados ?? {};
      const sexo = dados.sexo ?? velhos.sexo;
      const oficio = dados.oficio ?? velhos.oficio;
      const mudou = (dados.sexo !== undefined && dados.sexo !== velhos.sexo) || (dados.oficio !== undefined && dados.oficio !== velhos.oficio);
      if (!velhos.retrato || mudou)
        dados.retrato = retratoDoNpc(e.titulo, { sexo, oficio, texto: e.texto ?? antes?.texto, aparencia: dados.aparencia ?? velhos.aparencia });
    }
    for (const k of Object.keys(dados)) if (dados[k] === undefined) delete dados[k];
    const nova = salvarEntradaDiario(ctx.campanha.id, {
      tipo: e.tipo,
      titulo: e.titulo,
      texto: e.texto?.trim(),
      status: normalizarStatus(e.tipo, e.status) ?? (antes ? undefined : e.tipo === "missao" ? "aberta" : undefined),
      ...(Object.keys(dados).length ? { dados } : {}),
    });
    publicar(ctx.campanha.id, { e: "diario", entradas: listarDiario(ctx.campanha.id) });
    // novidades viram aviso no chat (chips de "o que mudou" no leitor); atualização sem novidade fica só no diário
    for (const n of novidadesDoDiario(antes, nova)) {
      const resumo = n.pista ? `Pista: ${n.pista}` : n.status ? `${nova.titulo}: ${n.status}` : `${n.rotulo}: ${nova.titulo}`;
      registrarDado(ctx, resumo, { tipo: "diario", subtipo: n.subtipo, entrada: nova, rotulo: n.rotulo, resumo, ...(n.pista ? { pista: n.pista } : {}) });
    }
    // o retrato fica no banco e na tela; não volta ao modelo (gasta tokens e traz detalhes sorteados que poderiam contradizer o texto)
    const { retrato: _retrato, ...dadosParaModelo } = (nova.dados ?? {}) as Record<string, unknown>;
    void _retrato;
    return { entrada: { ...nova, ...(nova.dados ? { dados: dadosParaModelo } : {}) }, novo: !antes };
  },
};
