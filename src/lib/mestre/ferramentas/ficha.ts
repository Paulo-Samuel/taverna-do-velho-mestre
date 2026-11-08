import "server-only";
import type { Personagem } from "../../db";
import { normalizar } from "../../sistemas/comum";
import { ajustarReputacao } from "../../sistemas/historia";
import type { Ficha, Sistema } from "../../sistemas/tipos";
import type { DefFerramenta } from "../tipos";
import { sincronizarCombate } from "./combate";
import {
  acharPersonagem,
  acharVarios,
  persistirPersonagem,
  registrarDado,
  semTabelaDeXp,
  type CamposComuns,
  type ContextoFerramentas,
  type Executor,
} from "./contexto";
import { ENTRADAS, type EntradaAlterarFicha } from "./esquemas";

// Ficha: dano, cura, recursos, itens e condições; XP e nível; descanso; reputação (modo história).

export function defAlterarFicha(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  const recursos = [...new Set(ctx.personagens.flatMap((p) => Object.entries(p.ficha.recursos).map(([id, r]) => `${id} (${r.rotulo})`)))];
  return {
    name: "alterar_ficha",
    description: `Aplica mudanças na ficha de um personagem do jogador: dano ou cura (pv negativo/positivo), dinheiro, recursos (${recursos.join(", ") || "nenhum"}), itens e condições. Chame SEMPRE que a narração disser que alguém se feriu, curou, gastou magia, ganhou ou perdeu algo.`,
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
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
  };
}

export function defConcederXp(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  return {
    name: "conceder_xp",
    description: semTabelaDeXp(ctx.sistema)
      ? `${ctx.sistema.nomeCurto} sobe de nível por marcos: XP aqui é só registro. Para subir de nível use subir_nivel.`
      : `Concede XP a personagens ao fim de um encontro, missão ou marco da história. O servidor soma, sobe de nível sozinho quando passar do limite (${ctx.sistema.nomeCurto}) e avisa a mesa.`,
    input_schema: {
      type: "object",
      properties: {
        personagens: campos.varios,
        quantidade: { type: "integer", minimum: 0, description: "XP para CADA personagem listado." },
        motivo: { type: "string", description: "O que foi conquistado, mostrado aos jogadores." },
      },
      required: ["personagens", "quantidade", "motivo"],
      additionalProperties: false,
    },
  };
}

export function defDescansar(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  return {
    name: "descansar",
    description: `Aplica um descanso pelas regras de ${ctx.sistema.nomeCurto}: recupera PV e recursos conforme o tipo. Use quando o grupo realmente parar para descansar em segurança.`,
    input_schema: {
      type: "object",
      properties: {
        personagens: campos.varios,
        tipo: { type: "string", enum: ["curto", "longo"], description: "curto (uma pausa) ou longo (uma noite de sono)." },
      },
      required: ["personagens", "tipo"],
      additionalProperties: false,
    },
  };
}

export function defAjustarReputacao(campos: CamposComuns): DefFerramenta {
  return {
    name: "ajustar_reputacao",
    description: "Muda a reputação de um personagem quando uma escolha moral pesa: bravura, honra, misericordia, generosidade, justica, lealdade (−10 a +10).",
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
        eixo: { type: "string", enum: ["bravura", "honra", "misericordia", "generosidade", "justica", "lealdade"] },
        variacao: { type: "integer", description: "+1 a +3 para atos marcantes; negativo para o contrário." },
        motivo: { type: "string" },
      },
      required: ["eixo", "variacao", "motivo"],
      additionalProperties: false,
    },
  };
}

export function defSubirNivel(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  return {
    name: "subir_nivel",
    description: `Sobe um personagem um nível (${ctx.sistema.nomeCurto} usa marcos). Use ao fim de um arco, de uma missão importante ou de uma vitória marcante.`,
    input_schema: {
      type: "object",
      properties: { personagem: campos.personagem, motivo: { type: "string" } },
      required: ["motivo"],
      additionalProperties: false,
    },
  };
}

/** Aplica a mudança pedida na ficha; o gancho aposMudancaDePv do sistema cuida do que a regra dele diz sobre PV (moribundo...). */
export function aplicarMudancas(sistema: Sistema, ficha: Ficha, e: EntradaAlterarFicha) {
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
  } else {
    if (ficha.pv === 0 && !ficha.condicoes.includes("inconsciente")) ficha.condicoes.push("inconsciente");
    if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => c !== "inconsciente");
  }
  sistema.aposMudancaDePv?.(ficha, pvAntes, "alterar_ficha");
  return { pvAntes, recursosMudados };
}

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

export const executoresFicha: Record<string, Executor> = {
  alterar_ficha: (ctx, entrada) => {
    const e = ENTRADAS.alterar_ficha.parse(entrada);
    const p = acharPersonagem(ctx, e.personagem);
    const { pvAntes, recursosMudados } = aplicarMudancas(ctx.sistema, p.ficha, e);
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
  },

  conceder_xp: (ctx, entrada) => {
    const e = ENTRADAS.conceder_xp.parse(entrada);
    const alvos = acharVarios(ctx, e.personagens);
    const marcos = semTabelaDeXp(ctx.sistema);
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
  },

  subir_nivel: (ctx, entrada) => {
    const e = ENTRADAS.subir_nivel.parse(entrada);
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
  },

  descansar: (ctx, entrada) => {
    const e = ENTRADAS.descansar.parse(entrada);
    const alvos = acharVarios(ctx, e.personagens);
    const resultados = [];
    for (const p of alvos) {
      const pvAntes = p.ficha.pv;
      const r = ctx.sistema.descansar(p.ficha, e.tipo);
      p.ficha = r.ficha;
      ctx.sistema.aposMudancaDePv?.(p.ficha, pvAntes, e.tipo === "curto" ? "descanso_curto" : "descanso_longo");
      persistirPersonagem(ctx, p);
      const f = p.ficha;
      const dados = { tipo: "descanso", descanso: e.tipo, personagem: f.nome, pvAntes, pv: f.pv, pvMax: f.pvMax, resumo: r.resumo };
      registrarDado(ctx, r.resumo, dados, p.id);
      resultados.push(dados);
    }
    sincronizarCombate(ctx);
    return { resultados };
  },

  ajustar_reputacao: (ctx, entrada) => {
    const e = ENTRADAS.ajustar_reputacao.parse(entrada);
    const p = acharPersonagem(ctx, e.personagem);
    const r = ajustarReputacao(p.ficha, e.eixo, e.variacao);
    p.ficha = r.ficha;
    persistirPersonagem(ctx, p);
    const dados = { tipo: "reputacao", personagem: p.ficha.nome, eixo: r.eixo, variacao: e.variacao, valor: r.valor, motivo: e.motivo };
    registrarDado(ctx, `${p.ficha.nome}: ${r.eixo} ${e.variacao > 0 ? "+" : ""}${e.variacao} — ${e.motivo}`, dados, p.id);
    return dados;
  },
};
