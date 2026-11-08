import "server-only";
import { adicionarMensagem, salvarFicha, type Campanha, type Personagem } from "../../db";
import { acharPorNome, normalizar } from "../../sistemas/comum";
import type { Sistema } from "../../sistemas/tipos";
import { publicar } from "../../tempo-real";
import { visivel } from "../../visivel";
import type { DefFerramenta } from "../tipos";

// O que todas as ferramentas do mestre compartilham: o contexto do turno, achar personagem, gravar ficha e registrar o
// cartão no chat, e o registro de extensões (ferramentas próprias de um sistema, como as de sangue do Vampiro).

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

/** Executa uma ferramenta já validada pelo nome; devolve o que volta para o modelo. */
export type Executor = (ctx: ContextoFerramentas, entradaBruta: unknown) => unknown;

/** Campos de esquema que várias ferramentas repetem (montados uma vez por turno, com os nomes do grupo). */
export type CamposComuns = {
  /** "personagem": nome de um personagem do jogador */
  personagem: Record<string, unknown>;
  /** "personagens": lista de nomes ou "todos" */
  varios: Record<string, unknown>;
};

/**
 * Ferramentas próprias de um sistema. Uma extensão nova = um arquivo nesta pasta + uma linha `registrarExtensao` no index.
 * O núcleo (definicoes.ts, executar.ts, testes.ts) só fala com estes campos; não sabe que sistema é.
 */
export type ExtensaoFerramentas = {
  /** nome curto da extensão ("sangue"), o mesmo que o sistema lista em `extensoesMestre` */
  id: string;
  /** vale para este sistema? */
  vale: (sistema: Sistema) => boolean;
  /** campos a mais nos esquemas de teste/pedir_teste (ex.: custo de Despertar do poder) */
  camposTeste?: Record<string, unknown>;
  /** frase anexada à descrição de teste/pedir_teste (QUANDO usar os campos e as ferramentas próprias) */
  notaTeste?: string;
  /** definições das ferramentas próprias, na ordem em que entram na lista */
  definicoes?: (ctx: ContextoFerramentas, campos: CamposComuns) => DefFerramenta[];
  /** executores das ferramentas próprias, pelo nome */
  executores?: Record<string, Executor>;
  /** o retorno de `teste` vem com a ficha (recursos e condições), para o mestre não fazer conta */
  resultadoComFicha?: boolean;
  /** o gancho aposTeste mexe em recursos que o rastreador mostra: sincroniza o combate depois */
  sincronizarCombateAposTeste?: boolean;
};

const ge = globalThis as unknown as { __tavernaExtensoesFerramentas?: ExtensaoFerramentas[] };
const extensoes = (ge.__tavernaExtensoesFerramentas ??= []);

/** Registra (ou substitui, pelo id: o recarregamento do servidor de desenvolvimento roda o index de novo) uma extensão. */
export function registrarExtensao(e: ExtensaoFerramentas) {
  const i = extensoes.findIndex((x) => x.id === e.id);
  if (i >= 0) extensoes[i] = e;
  else extensoes.push(e);
}

/** As extensões que valem para o sistema da mesa, na ordem de registro. */
export function extensoesDe(sistema: Sistema): ExtensaoFerramentas[] {
  return extensoes.filter((e) => e.vale(sistema));
}

/** O mestre às vezes registra cena e diário e pula direto para as sugestões, sem narrar. A ferramenta recusa uma vez e pede o texto. */
export function cobrarNarracao(ctx: ContextoFerramentas, oQue: string) {
  const minimo = ctx.exigirNarracao ?? 0;
  if (!minimo || ctx.cobrado || !ctx.narrado || ctx.narrado() >= minimo) return;
  ctx.cobrado = true;
  throw new Error(
    `Falta a narração deste turno: o jogador ainda não leu NADA da cena. O que você escreveu no raciocínio interno não aparece para ele. Chame AGORA a ferramenta narrar com a narração completa no tamanho combinado (onde estão, o que acontece, quem fala, o gancho), e só depois ${oQue} de novo.`,
  );
}

/** Quem rola os testes nesta campanha: por padrão o próprio jogador, na tela; "automatico" deixa o servidor rolar na hora. */
export function jogadorRolaOsDados(c: Campanha): boolean {
  return (c.config.dados ?? "jogador") === "jogador";
}

/** Sistema em que o mestre sobe de nível por decisão (marcos) ou em que o XP é moeda do jogador: XP do mestre é só registro. */
export function semTabelaDeXp(s: Sistema): boolean {
  return s.progressao !== "xp";
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
export function acharVarios(ctx: ContextoFerramentas, quem: "todos" | string[]): Personagem[] {
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
