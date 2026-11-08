import "server-only";
import type { AcaoPendente, Fato, Mensagem } from "./db";
import { registrar } from "./log";
import type { PersonagemVisivel } from "./visivel";
import type { Cena, EntradaDiario } from "./sistemas/tipos";

// Hub de eventos em memória: cada mesa (campanha) tem seus ouvintes (conexões SSE de todos os aparelhos).
// Tudo que muda na mesa passa por `publicar`, e cada aparelho conectado recebe na hora.

export type Jogador = {
  /** id do aparelho/aba (gerado no navegador) */
  clienteId: string;
  apelido: string;
  /** personagem que está usando agora, se escolheu */
  personagemId: number | null;
  /** true quando a conexão vem desta máquina (mesa local) */
  local: boolean;
  desde: string;
};

export type EventoMesa =
  | { e: "mensagem"; mensagem: Mensagem }
  /** uma mensagem que já existia mudou (ex.: teste pendente que o jogador rolou) */
  | { e: "mensagem_atualizada"; mensagem: Mensagem }
  /** pedaço da narração do mestre enquanto ele escreve */
  | { e: "texto"; texto: string }
  | { e: "personagem"; personagem: PersonagemVisivel }
  | { e: "personagem_removido"; id: number }
  | { e: "cena"; cena: Cena }
  | { e: "diario"; entradas: EntradaDiario[] }
  /** fatos fixados pelo jogador (lista inteira, na ordem) */
  | { e: "fatos"; fatos: Fato[] }
  /** `aguardando`: segundos que a API pediu para esperar (429) antes de o mestre tentar de novo sozinho */
  | { e: "estado"; ocupado: boolean; fila: AcaoPendente[]; aguardando?: number }
  | { e: "presenca"; jogadores: Jogador[] }
  | { e: "limite"; janela: string; uso: number | null; renovaEm: number | null }
  /**
   * Falha do turno (já traduzida para o português). `refazer`: o turno tinha instantâneo, então "Tentar de novo" pode
   * reenfileirar as mesmas ações (desfazer com refazer). `acao`: o que a frase sugere (abrir Configurações ou tentar de
   * novo). `aviso`: não derrubou o turno (ex.: o resumo automático falhou), só merece atenção.
   */
  | { e: "erro"; erro: string; refazer?: boolean; acao?: "config" | "tentar"; aviso?: boolean }
  /** algo mudou demais (ex.: turno desfeito): o cliente deve recarregar o estado inteiro */
  | { e: "recarregar" };

type Ouvinte = (ev: EventoMesa) => void;

type Hub = {
  ouvintes: Map<number, Set<Ouvinte>>;
  presenca: Map<number, Map<string, Jogador>>;
};

const g = globalThis as unknown as { __tavernaHub?: Hub };
const hub: Hub = (g.__tavernaHub ??= { ouvintes: new Map(), presenca: new Map() });

export function publicar(campanhaId: number, ev: EventoMesa) {
  // a faixa vermelha da mesa também vai para o log em disco (o que o amigo manda em /config → Diagnóstico)
  if (ev.e === "erro") {
    registrar(ev.aviso ? "aviso" : "erro", "mesa", { campanhaId, erro: ev.erro, refazer: ev.refazer, acao: ev.acao });
  }
  for (const ouvir of hub.ouvintes.get(campanhaId) ?? []) {
    try {
      ouvir(ev);
    } catch (e) {
      registrar("aviso", "tempo-real", { campanhaId, evento: ev.e, motivo: "ouvinte falhou", erro: e });
    }
  }
}

export function assinar(campanhaId: number, ouvir: Ouvinte): () => void {
  let conjunto = hub.ouvintes.get(campanhaId);
  if (!conjunto) hub.ouvintes.set(campanhaId, (conjunto = new Set()));
  conjunto.add(ouvir);
  return () => {
    conjunto.delete(ouvir);
    if (conjunto.size === 0) hub.ouvintes.delete(campanhaId);
  };
}

export function listarPresenca(campanhaId: number): Jogador[] {
  return [...(hub.presenca.get(campanhaId)?.values() ?? [])];
}

/** Registra um aparelho na mesa; devolve a função que o remove ao desconectar. */
export function entrarNaMesa(campanhaId: number, jogador: Jogador): () => void {
  let mapa = hub.presenca.get(campanhaId);
  if (!mapa) hub.presenca.set(campanhaId, (mapa = new Map()));
  mapa.set(jogador.clienteId, jogador);
  publicar(campanhaId, { e: "presenca", jogadores: listarPresenca(campanhaId) });
  return () => {
    // só remove se ainda for a mesma conexão (o aparelho pode ter reconectado)
    if (mapa.get(jogador.clienteId) === jogador) mapa.delete(jogador.clienteId);
    publicar(campanhaId, { e: "presenca", jogadores: listarPresenca(campanhaId) });
  };
}

export function atualizarPresenca(campanhaId: number, clienteId: string, mudancas: Partial<Pick<Jogador, "apelido" | "personagemId">>) {
  const j = hub.presenca.get(campanhaId)?.get(clienteId);
  if (!j) return;
  Object.assign(j, mudancas);
  publicar(campanhaId, { e: "presenca", jogadores: listarPresenca(campanhaId) });
}
