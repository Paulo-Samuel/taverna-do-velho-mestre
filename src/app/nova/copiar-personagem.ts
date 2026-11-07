"use server";

import { copiarPersonagem, listarPersonagensCopiaveis, obterCampanha, obterPersonagem } from "@/lib/db";
import { publicarPersonagem } from "@/lib/mesa";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";
import { sistemasPublicos } from "@/lib/sistemas";
import type { PersonagemParaTrazer } from "@/components/ficha/passos";

// Trazer um personagem de outra mesa: a ficha é copiada descansada (db.resetarFichaCopiada) para a campanha de destino.
// Só nesta máquina: quem vem pela rede joga, mas não leva fichas de uma mesa para outra.

export type ResultadoCopia = { ok: true; personagemId: number; nome: string } | { ok: false; erro: string };

/** Copia `origemId` para a campanha `campanhaId` (mesmo sistema) e avisa os aparelhos da mesa de destino. */
export async function copiarPersonagemAcao(origemId: number, campanhaId: number, opcoes: { zerarXp?: boolean } = {}): Promise<ResultadoCopia> {
  if (!(await daMaquinaNaPagina())) return { ok: false, erro: "Só a máquina da taverna traz personagens de outra mesa." };
  const origem = obterPersonagem(Number(origemId));
  if (!origem) return { ok: false, erro: "Esse personagem não existe mais na mesa de origem." };
  const destino = obterCampanha(Number(campanhaId));
  if (!destino) return { ok: false, erro: "Essa mesa não existe mais." };
  if (destino.sistema !== origem.ficha.sistema) return { ok: false, erro: "A ficha é de outro sistema de regras: não cabe nesta mesa." };
  const p = copiarPersonagem(origem.id, destino.id, { zerarXp: Boolean(opcoes?.zerarXp) });
  if (!p) return { ok: false, erro: "Não deu para copiar a ficha." };
  publicarPersonagem(destino.id, p);
  return { ok: true, personagemId: p.id, nome: p.ficha.nome };
}

/**
 * Personagens de outras mesas para o cartão "Trazer um personagem" da criação avançada, com clã/classe já em texto.
 * Vazio quando a página está aberta pela rede (a cópia é coisa da máquina da taverna).
 */
export async function personagensParaTrazer(filtro: { sistema?: string; excetoCampanha?: number } = {}): Promise<PersonagemParaTrazer[]> {
  if (!(await daMaquinaNaPagina())) return [];
  const sistemas = sistemasPublicos();
  return listarPersonagensCopiaveis(filtro)
    .filter((p) => sistemas.some((s) => s.id === p.sistema && s.pronto))
    .map((p) => {
      const s = sistemas.find((x) => x.id === p.sistema)!;
      const linha = [s.ancestralidades.find((a) => a.id === p.ancestralidade)?.nome, s.classes.find((c) => c.id === p.classe)?.nome].filter(Boolean).join(" · ");
      return { id: p.id, nome: p.nome, sistema: p.sistema, linha, campanha: p.campanha, campanhaId: p.campanhaId };
    });
}
