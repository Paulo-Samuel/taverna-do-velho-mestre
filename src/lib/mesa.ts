import "server-only";
import {
  listarDiario,
  listarFila,
  listarMensagens,
  listarPersonagens,
  obterCampanha,
  type AcaoPendente,
  type Campanha,
  type Mensagem,
  type Personagem,
} from "./db";
import { mesaOcupada, provedorAtual } from "./mestre";
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
};

/** Quantas mensagens antigas vão no estado inicial. */
const MENSAGENS_INICIAIS = 300;

export function estadoMesa(campanhaId: number): EstadoMesa | null {
  const c = obterCampanha(campanhaId);
  if (!c) return null;
  const sistema = obterSistema(c.sistema);
  return {
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
  };
}

/** Publica um personagem (novo ou alterado) para todos os aparelhos, com os blocos de ficha recalculados. */
export function publicarPersonagem(campanhaId: number, p: Personagem) {
  const c = obterCampanha(campanhaId);
  const sistema = obterSistema(c?.sistema ?? p.ficha.sistema);
  publicar(campanhaId, { e: "personagem", personagem: visivel(sistema, p) });
}
