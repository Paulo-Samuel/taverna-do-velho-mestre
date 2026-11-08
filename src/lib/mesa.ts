import "server-only";
import {
  listarDiario,
  listarFila,
  listarMensagens,
  listarPersonagens,
  noitesDaCampanha,
  obterCampanha,
  type AcaoPendente,
  type Campanha,
  type Mensagem,
  type Personagem,
} from "./db";
import { msDaData, PAUSA_NOITE_MS } from "./constantes";
import { mesaOcupada, provedorAtual, sessaoAtual } from "./mestre";
import { jogadorRolaOsDados } from "./mestre/ferramentas";
import { obterSistema } from "./sistemas";
import { publico } from "./sistemas/comum";
import type { Cena, EntradaDiario, SistemaPublico } from "./sistemas/tipos";
import { listarPresenca, publicar, type Jogador } from "./tempo-real";
import { visivel, type PersonagemVisivel } from "./visivel";

export type { PersonagemVisivel };

// Estado completo de uma mesa, como o cliente recebe ao abrir a página (e de novo em cada evento "recarregar").

export type EstadoMesa = {
  campanha: Pick<Campanha, "id" | "nome" | "sistema" | "cenario" | "tom"> & {
    modo: "livre" | "rodada";
    temPin: boolean;
    /** "historia": mesa em estilo de livro; "avancado": mesa com painéis */
    modoJogo: "historia" | "avancado";
    /** o jogador rola os próprios testes (dado 3D) */
    jogadorRola: boolean;
  };
  sistema: SistemaPublico;
  personagens: PersonagemVisivel[];
  mensagens: Mensagem[];
  cena: Cena;
  diario: EntradaDiario[];
  fila: AcaoPendente[];
  ocupado: boolean;
  presenca: Jogador[];
  provedor: string;
  /**
   * A página foi aberta na máquina da taverna (mesa local, hot-seat). Pela rede, quem não reivindicou personagem entra
   * só assistindo. O estado reenviado pelo fluxo de eventos não precisa disso (o cliente já sabe) e vem com false.
   */
  local: boolean;
  /** número da noite (sessão) em andamento: noites fechadas pelo marcador ou pelo intervalo de 5 h, + 1 */
  sessao: number;
  /** resumo das noites de jogo: quantas houve, quando foi a última mensagem e se a última ainda está aberta */
  noites: ResumoNoites;
};

export type ResumoNoites = {
  /** noites com alguma mensagem (a aberta conta) */
  quantas: number;
  /** a última noite: número, começo e fim (datas do SQLite, UTC) e se terminou (marcador ou intervalo) */
  ultima: { numero: number; inicio: string; fim: string; fechada: boolean; fechadaPeloBotao: boolean } | null;
  /** a última noite ainda pode receber jogadas (não foi encerrada pelo botão nem passou 5 h parada) */
  aberta: boolean;
};

/** As noites da campanha em poucos números, para a mesa e a página inicial. */
export function resumoDasNoites(campanhaId: number): ResumoNoites {
  const noites = noitesDaCampanha(campanhaId);
  const u = noites[noites.length - 1];
  if (!u) return { quantas: 0, ultima: null, aberta: false };
  const parada = Date.now() - msDaData(u.fim) >= PAUSA_NOITE_MS;
  return {
    quantas: noites.length,
    ultima: { numero: u.numero, inicio: u.inicio, fim: u.fim, fechada: u.fechada || parada, fechadaPeloBotao: u.fechadaPeloBotao },
    aberta: !u.fechada && !parada,
  };
}

/** Quantas mensagens antigas vão no estado inicial. */
const MENSAGENS_INICIAIS = 300;

export function estadoMesa(campanhaId: number, opcoes: { local?: boolean } = {}): EstadoMesa | null {
  const c = obterCampanha(campanhaId);
  if (!c) return null;
  const sistema = obterSistema(c.sistema);
  return {
    local: opcoes.local ?? false,
    campanha: { id: c.id, nome: c.nome, sistema: c.sistema, cenario: c.cenario, tom: c.tom, modo: c.config.modo ?? "livre",
      temPin: Boolean(c.config.pin),
      modoJogo: c.config.modoJogo ?? "avancado",
      jogadorRola: jogadorRolaOsDados(c),
    },
    sistema: publico(sistema),
    personagens: listarPersonagens(c.id).map((p) => visivel(sistema, p)),
    mensagens: listarMensagens(c.id, MENSAGENS_INICIAIS),
    cena: c.cena ?? {},
    diario: listarDiario(c.id),
    fila: listarFila(c.id),
    ocupado: mesaOcupada(c.id),
    presenca: listarPresenca(c.id),
    provedor: provedorAtual().nome,
    sessao: sessaoAtual(c.id),
    noites: resumoDasNoites(c.id),
  };
}

/** Publica um personagem (novo ou alterado) para todos os aparelhos, com os blocos de ficha recalculados. */
export function publicarPersonagem(campanhaId: number, p: Personagem) {
  const c = obterCampanha(campanhaId);
  const sistema = obterSistema(c?.sistema ?? p.ficha.sistema);
  publicar(campanhaId, { e: "personagem", personagem: visivel(sistema, p) });
}
