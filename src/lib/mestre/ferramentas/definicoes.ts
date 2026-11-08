import "server-only";
import type { DefFerramenta } from "../tipos";
import { DEF_NARRAR, DEF_SUGERIR_ACOES, defAtualizarCena } from "./cena";
import { extensoesDe, jogadorRolaOsDados, semTabelaDeXp, type CamposComuns, type ContextoFerramentas } from "./contexto";
import { DEF_ANOTAR_DIARIO } from "./diario";
import { defAjustarReputacao, defAlterarFicha, defConcederXp, defDescansar, defSubirNivel } from "./ficha";
import { DEF_ROLAR_DADOS, defPedirTeste, defTeste } from "./testes";

// A lista de ferramentas que o modelo recebe neste turno. A ORDEM é parte do contrato (os testes golden a fixam):
// teste|pedir_teste, rolar_dados, alterar_ficha, conceder_xp, descansar, atualizar_cena, anotar_diario, narrar,
// sugerir_acoes (se ligado), ajustar_reputacao (modo história), as das extensões do sistema e, por último, subir_nivel.

export function camposComuns(ctx: ContextoFerramentas): CamposComuns {
  const nomes = ctx.personagens.map((p) => p.ficha.nome);
  const opcoes = nomes.join(", ") || "(nenhum)";
  return {
    personagem: {
      type: "string",
      description: `Nome do personagem do jogador. Opções: ${opcoes}.${nomes.length === 1 ? " Pode omitir." : ""}`,
    },
    varios: {
      anyOf: [
        { type: "array", items: { type: "string" } },
        { type: "string", enum: ["todos"] },
      ],
      description: `Lista de nomes (${opcoes}) ou "todos".`,
    },
  };
}

export function definirFerramentas(ctx: ContextoFerramentas): DefFerramenta[] {
  const campos = camposComuns(ctx);
  const lista: DefFerramenta[] = [
    // modo em que o jogador rola: o mestre pede o teste e espera; o servidor só sorteia quando o jogador clica
    jogadorRolaOsDados(ctx.campanha) ? defPedirTeste(ctx, campos) : defTeste(ctx, campos),
    DEF_ROLAR_DADOS,
    defAlterarFicha(ctx, campos),
    defConcederXp(ctx, campos),
    defDescansar(ctx, campos),
    defAtualizarCena(ctx),
    DEF_ANOTAR_DIARIO,
    DEF_NARRAR,
  ];
  // ações sugeridas valem nos dois modos (botões acima do campo de ação), a menos que a mesa desligue
  if (ctx.campanha.config.sugestoes !== false) lista.push(DEF_SUGERIR_ACOES);
  if (ctx.sistema.id === "historia") lista.push(defAjustarReputacao(campos));
  for (const ext of extensoesDe(ctx.sistema)) lista.push(...(ext.definicoes?.(ctx, campos) ?? []));
  if (semTabelaDeXp(ctx.sistema)) lista.push(defSubirNivel(ctx, campos));
  return lista;
}
