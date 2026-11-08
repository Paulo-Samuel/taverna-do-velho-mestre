import "server-only";
import { testesPendentes, type Personagem } from "../../db";
import { descreverRolagem, rolar } from "../../dados";
import type { PedidoTeste, ResultadoTeste } from "../../sistemas/tipos";
import type { DefFerramenta } from "../tipos";
import { ataquesNoTurno, contarAtaque, sincronizarCombate } from "./combate";
import {
  acharPersonagem,
  cobrarNarracao,
  extensoesDe,
  persistirPersonagem,
  registrarDado,
  type CamposComuns,
  type ContextoFerramentas,
  type Executor,
} from "./contexto";
import { ENTRADAS } from "./esquemas";

// Testes: o servidor rola na hora (teste) ou o jogador rola na tela (pedir_teste); rolar_dados para tudo o que não é teste
// de personagem. Campos e notas a mais vêm das extensões do sistema (ex.: custo de Despertar do Vampiro).

/** Campos e nota que as extensões do sistema acrescentam a teste/pedir_teste. */
function extrasDeTeste(ctx: ContextoFerramentas) {
  const ext = extensoesDe(ctx.sistema);
  return {
    campos: Object.assign({}, ...ext.map((e) => e.camposTeste ?? {})) as Record<string, unknown>,
    nota: ext.map((e) => e.notaTeste ?? "").join(""),
  };
}

export function defTeste(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  const extra = extrasDeTeste(ctx);
  return {
    name: "teste",
    description: `Rola um teste de um personagem do jogador pelas regras de ${ctx.sistema.nomeCurto}. Use sempre que o resultado de uma ação for incerto. O servidor aplica os modificadores da ficha e devolve o grau de sucesso. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}. Não invente o resultado: espere o retorno e narre a partir dele.${extra.nota}`,
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
        teste: { type: "string", description: "Perícia, atributo, salvamento/resistência, 'Ataque', 'Magia', 'Iniciativa'..." },
        alvo: { type: "integer", description: "CD/CA/dificuldade/oposição. Omita em sistemas de rolar abaixo do valor (d100) ou quando não houver." },
        modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
        modificador: { type: "integer", description: "Bônus ou penalidade circunstancial." },
        motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada aos jogadores." },
        ...extra.campos,
      },
      required: ["teste", "motivo"],
      additionalProperties: false,
    },
  };
}

export function defPedirTeste(ctx: ContextoFerramentas, campos: CamposComuns): DefFerramenta {
  const extra = extrasDeTeste(ctx);
  return {
    name: "pedir_teste",
    description: `Pede um teste a um personagem do jogador (${ctx.sistema.nomeCurto}). Quem rola é o JOGADOR, clicando no dado na tela; depois você recebe o resultado como nova mensagem e continua. Use só quando o resultado for incerto e importar. Narre ANTES de pedir, terminando no suspense, sem contar o resultado; depois de pedir não escreva mais nada (no máximo chame sugerir_acoes). No máximo um teste por personagem por turno. Testes comuns: ${ctx.sistema.testesSugeridos.join(", ")}.${extra.nota}`,
    input_schema: {
      type: "object",
      properties: {
        personagem: campos.personagem,
        teste: { type: "string", description: "Perícia ou tipo de teste." },
        alvo: { type: "integer", description: "Dificuldade (CD)." },
        modo: { type: "string", enum: ["normal", "vantagem", "desvantagem"], description: "Vantagem/desvantagem (ou bônus/penalidade equivalente do sistema)." },
        modificador: { type: "integer", description: "Bônus ou penalidade circunstancial (no Vampiro: dados a mais ou a menos na parada)." },
        perigoso: { type: "boolean", description: "true se a falha machuca ou custa caro (o jogador vê o aviso antes de rolar)." },
        motivo: { type: "string", description: "Frase curta do que está sendo tentado, mostrada no cartão do dado." },
        ...extra.campos,
      },
      required: ["teste", "alvo", "motivo"],
      additionalProperties: false,
    },
  };
}

export const DEF_ROLAR_DADOS: DefFerramenta = {
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
};

/** Custo de Despertar e nível do poder vindos do teste/pedir_teste (só sistemas que declaram esses campos); undefined quando nada foi dito. */
function opcoesDoPoder(e: { custo_despertar?: number; nivel_poder?: number; compulsao?: string }): Record<string, unknown> | undefined {
  if (e.custo_despertar === undefined && e.nivel_poder === undefined && e.compulsao === undefined) return undefined;
  return {
    ...(e.custo_despertar !== undefined ? { custoDespertar: e.custo_despertar } : {}),
    ...(e.nivel_poder !== undefined ? { nivelPoder: e.nivel_poder } : {}),
    ...(e.compulsao !== undefined ? { compulsao: e.compulsao } : {}),
  };
}

/**
 * Em sistema que conta ações (PF2e), o pedido leva quantos ataques o personagem já fez no turno: o sistema aplica a penalidade
 * de ataques múltiplos sozinho, sem o mestre escrever "Ataque 2".
 */
function comAtaquesDoTurno(ctx: ContextoFerramentas, p: Personagem, pedido: PedidoTeste): PedidoTeste {
  if (!ctx.sistema.combate?.acoes) return pedido;
  const feitos = ataquesNoTurno(ctx, p.ficha.nome);
  return feitos ? { ...pedido, opcoes: { ...(pedido.opcoes ?? {}), ataquesNoTurno: feitos } } : pedido;
}

/** Teste rolado na hora pelo servidor: grava o cartão, aplica o gancho do sistema (Fome, Manchas, condições...) e devolve o resultado. */
export function testeNaHora(ctx: ContextoFerramentas, p: Personagem, pedido: PedidoTeste): ResultadoTeste {
  const r = ctx.sistema.resolverTeste(p.ficha, comAtaquesDoTurno(ctx, p, pedido));
  // ataque contado no turno (PF2e): o rastreador guarda qual foi e gasta 1 ação, e o próximo já vem com a penalidade
  if (r.ataque) contarAtaque(ctx, p.ficha.nome, r.ataque.numero);
  // d100 rola abaixo do valor: "43 ≤ 52" diz mais que "43 vs 52"
  const comparacao = r.alvo === null ? "" : ctx.sistema.dadoPrincipal.includes("100") ? ` (alvo ${r.alvo})` : ` vs ${r.alvo}`;
  const texto = `${p.ficha.nome} · ${r.teste} — ${r.motivo}: ${r.expressao} → ${r.total}${comparacao} · ${r.rotuloGrau}`;
  registrarDado(ctx, texto, r, p.id);
  // ganchos do sistema depois do teste (d100 marca a perícia usada; Vampiro sobe a Fome, grava Ressonância, marca frenesi...)
  try {
    const nova = ctx.sistema.aposTeste?.(p.ficha, r);
    if (nova) {
      p.ficha = nova;
      persistirPersonagem(ctx, p);
      if (extensoesDe(ctx.sistema).some((e) => e.sincronizarCombateAposTeste)) sincronizarCombate(ctx);
    }
  } catch (erro) {
    console.warn(`[taverna] aposTeste falhou (${ctx.sistema.id}):`, erro);
  }
  return r;
}

/** Resultado + como a ficha ficou (recursos e condições), para o mestre não fazer conta. */
export function comFicha(p: Personagem, r: ResultadoTeste) {
  const f = p.ficha;
  const rec = Object.fromEntries(Object.entries(f.recursos).map(([id, x]) => [id, `${x.atual}/${x.max}`]));
  return { ...r, fichaAgora: { personagem: f.nome, recursos: rec, condicoes: f.condicoes }, ...(r.avisoMestre ? { narrar: r.avisoMestre } : {}) };
}

export const executoresTestes: Record<string, Executor> = {
  teste: (ctx, entrada) => {
    const e = ENTRADAS.teste.parse(entrada);
    const p = acharPersonagem(ctx, e.personagem);
    const opcoes = opcoesDoPoder(e);
    const r = testeNaHora(ctx, p, { teste: e.teste, alvo: e.alvo ?? null, modo: e.modo, modificador: e.modificador, motivo: e.motivo, ...(opcoes ? { opcoes } : {}) });
    return extensoesDe(ctx.sistema).some((x) => x.resultadoComFicha) ? comFicha(p, r) : r;
  },

  rolar_dados: (ctx, entrada) => {
    const e = ENTRADAS.rolar_dados.parse(entrada);
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
  },

  pedir_teste: (ctx, entrada) => {
    const e = ENTRADAS.pedir_teste.parse(entrada);
    cobrarNarracao(ctx, "peça o teste");
    const p = acharPersonagem(ctx, e.personagem);
    if (testesPendentes(ctx.campanha.id).some((m) => m.personagemId === p.id)) {
      throw new Error(`${p.ficha.nome} já tem um teste esperando o jogador rolar. Termine o turno.`);
    }
    // prévia só para mostrar o bônus no cartão; o dado de verdade é sorteado quando o jogador clica (custos como o Despertar também)
    const doPoder = opcoesDoPoder(e);
    const previa = ctx.sistema.resolverTeste(
      p.ficha,
      comAtaquesDoTurno(ctx, p, { teste: e.teste, alvo: e.alvo, modo: e.modo, modificador: e.modificador, motivo: e.motivo, previa: true, ...(doPoder ? { opcoes: doPoder } : {}) }),
    );
    // ataque contado no turno (PF2e): o número fica fixo no pedido (o jogador rola depois, quando a conta já andou) e o
    // rastreador já conta este ataque, para o próximo pedido vir com a penalidade
    const opcoes = previa.ataque ? { ...(doPoder ?? {}), numeroAtaque: previa.ataque.numero } : doPoder;
    if (previa.ataque) contarAtaque(ctx, p.ficha.nome, previa.ataque.numero);
    // custos que o sistema anuncia antes do clique (Vampiro: "Despertar · Celeridade ●●", "Surto +2")
    const efeitos = (previa as { efeitos?: { texto?: unknown }[] }).efeitos;
    const custos = Array.isArray(efeitos) ? efeitos.map((x) => String(x.texto ?? "")).filter(Boolean) : [];
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
      ...(opcoes ? { opcoes } : {}),
      ...(custos.length ? { custos } : {}),
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
        "O cartão do dado já está na tela e o jogador vai rolar. A narração já terminou no suspense: NÃO escreva mais nada (nem \"o dado é seu\", nem resumo do teste); se ainda faltar, chame sugerir_acoes e encerre respondendo só \"—\". O resultado chega no próximo turno.",
    };
  },
};
