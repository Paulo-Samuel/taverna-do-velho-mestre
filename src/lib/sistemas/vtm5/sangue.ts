import "server-only";
import { d } from "../../dados";

// O sangue no V5: Teste de Despertar (Rouse), Ressonância e quanto uma caça sacia. Funções puras (números entram, números saem);
// testes.ts junta isso com a ficha. Resumo das regras, com palavras próprias:
//   Despertar     1d10 por vez: 6+ nada acontece; 1–5 a Fome sobe 1 (máx. 5). Com Fome 5 e falha, não sobe: o sangue não responde
//                 e a Besta cobra (teste de frenesi de fome). Potência de Sangue deixa rerrolar o Despertar de poderes de nível baixo.
//   Ressonância   o humor de quem doou o sangue: colérica, melancólica, fleumática, sanguínea (ou animal, ou vazia). Intensa ou aguda
//                 dá +1 dado nas disciplinas ligadas até a próxima alimentação; aguda pode vir com discrasia (efeito especial).
//   Saciar        bebida sem matar não baixa a Fome de 1; só matando chega a 0. Potência alta sacia menos (tabela de Potência).

export const FOME_MAX = 5;

/** Condição da Besta cobrando com a Fome já em 5. Começa com "faminto": descansar e aposTeste procuram esse prefixo. */
export const CONDICAO_FAMINTO = "faminto: risco de Frenesi de fome (Fome 5)";

export type Despertar = {
  /** cada Despertar: [face] ou [face que falhou, rerrolagem] */
  rolagens: number[][];
  vezes: number;
  falhas: number;
  /** podia rerrolar (Potência de Sangue ou concessão do mestre) */
  rerrolagem: boolean;
  fomeAntes: number;
  fomeDepois: number;
  /** falhou com a Fome já no limite: não sobe, a Besta cobra */
  estourou: boolean;
  /** "Celeridade", "Surto de Sangue", "corar para parecer vivo" */
  motivo: string;
  /** prévia do pedido de teste: ainda não rolado */
  previsto?: boolean;
};

export function rolarDespertar(fomeAntes: number, vezes: number, rerrolar: boolean, motivo: string): Despertar {
  const rolagens: number[][] = [];
  let falhas = 0;
  for (let i = 0; i < vezes; i++) {
    const a = d(10);
    if (a >= 6) {
      rolagens.push([a]);
      continue;
    }
    if (rerrolar) {
      const b = d(10);
      rolagens.push([a, b]);
      if (b >= 6) continue;
    } else rolagens.push([a]);
    falhas++;
  }
  return { rolagens, vezes, falhas, rerrolagem: rerrolar, fomeAntes, fomeDepois: Math.min(FOME_MAX, fomeAntes + falhas), estourou: fomeAntes + falhas > FOME_MAX, motivo };
}

/** Despertar ainda não rolado (cartão do pedido de teste). */
export function despertarPrevisto(fome: number, vezes: number, rerrolar: boolean, motivo: string): Despertar {
  return { rolagens: [], vezes, falhas: 0, rerrolagem: rerrolar, fomeAntes: fome, fomeDepois: fome, estourou: false, motivo, previsto: true };
}

/** "Celeridade — 4 → Fome 2" / "3, 7 (rerrolou) · Fome 2 → 3". */
export function textoDespertar(x: Despertar): string {
  const faces = x.rolagens.map((r) => (r.length > 1 ? `${r[0]}↻${r[1]}` : String(r[0]))).join(", ");
  const fome = x.estourou
    ? x.fomeAntes < FOME_MAX
      ? `Fome ${x.fomeAntes} → ${FOME_MAX} e passou do limite: a Besta cobra`
      : `Fome ${FOME_MAX}: o sangue não responde, a Besta cobra`
    : x.falhas ? `Fome ${x.fomeAntes} → ${x.fomeDepois}` : `Fome segue ${x.fomeAntes}`;
  return `Despertar${x.vezes > 1 ? ` ×${x.vezes}` : ""} · ${x.motivo}: ${faces} → ${fome}`;
}

// ---------- Ressonância ----------

export type TipoRessonancia = "colerica" | "melancolica" | "fleumatica" | "sanguinea" | "animal" | "vazia";
export type IntensidadeRessonancia = "fugaz" | "intensa" | "aguda" | "discrasia";

export const RESSONANCIAS: Record<TipoRessonancia, { nome: string; humor: string; disciplinas: string[] }> = {
  colerica: { nome: "Colérica", humor: "raiva, ambição, adrenalina", disciplinas: ["celeridade", "potencia"] },
  melancolica: { nome: "Melancólica", humor: "tristeza, luto, saudade", disciplinas: ["fortitude", "ofuscacao"] },
  fleumatica: { nome: "Fleumática", humor: "calma, apatia, preguiça", disciplinas: ["auspicios", "dominacao"] },
  sanguinea: { nome: "Sanguínea", humor: "alegria, desejo, euforia", disciplinas: ["feiticaria", "presenca"] },
  animal: { nome: "Animal", humor: "instinto de bicho", disciplinas: ["animalismo", "metamorfose"] },
  vazia: { nome: "Vazia", humor: "nada: gente oca, desligada do mundo", disciplinas: ["oblivio"] },
};

export const INTENSIDADES: Record<IntensidadeRessonancia, { nome: string; bonus: number; efeito: string }> = {
  fugaz: { nome: "fugaz", bonus: 0, efeito: "só um gosto na boca, sem efeito nos dados" },
  intensa: { nome: "intensa", bonus: 1, efeito: "+1 dado nas disciplinas ligadas até a próxima alimentação" },
  aguda: { nome: "aguda", bonus: 1, efeito: "+1 dado nas disciplinas ligadas até a próxima alimentação; sangue raro" },
  discrasia: { nome: "aguda, com discrasia", bonus: 1, efeito: "+1 dado nas disciplinas ligadas e um efeito especial da discrasia (o mestre escolhe e narra)" },
};

/** Lê "colérica", "Melancolica", "sanguine"... */
export function lerRessonancia(v: unknown): TipoRessonancia | null {
  const t = String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!t) return null;
  if (/coler|choler|raiva/.test(t)) return "colerica";
  if (/melanc|triste/.test(t)) return "melancolica";
  if (/fleum|phleg|calm/.test(t)) return "fleumatica";
  if (/sangui|alegr/.test(t)) return "sanguinea";
  if (/anim|bicho/.test(t)) return "animal";
  if (/vazi|empty|nenhum/.test(t)) return "vazia";
  return null;
}

export function lerIntensidade(v: unknown): IntensidadeRessonancia | null {
  const t = String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!t) return null;
  if (/discras|dyscras/.test(t)) return "discrasia";
  if (/agud|acut/.test(t)) return "aguda";
  if (/intens/.test(t)) return "intensa";
  if (/fugaz|fleet|neglig|fraca/.test(t)) return "fugaz";
  return null;
}

/**
 * Sorteio de Ressonância de uma pessoa: humor por 1d10 (1–3 fleumática, 4–6 melancólica, 7–8 colérica, 9–10 sanguínea) e
 * intensidade por 1d10 (1–8 fugaz ou quase nada; 9–10 rola de novo: 1–8 intensa, 9–10 aguda; aguda tem 50% de discrasia).
 * Chances: fugaz 80%, intensa 16%, aguda 2%, aguda com discrasia 2%.
 */
export function sortearRessonancia(): { tipo: TipoRessonancia; intensidade: IntensidadeRessonancia; dados: number[] } {
  const t = d(10);
  const tipo: TipoRessonancia = t <= 3 ? "fleumatica" : t <= 6 ? "melancolica" : t <= 8 ? "colerica" : "sanguinea";
  const dados = [t];
  const i = d(10);
  dados.push(i);
  if (i <= 8) return { tipo, intensidade: "fugaz", dados };
  const j = d(10);
  dados.push(j);
  if (j <= 8) return { tipo, intensidade: "intensa", dados };
  const k = d(10);
  dados.push(k);
  return { tipo, intensidade: k >= 6 ? "discrasia" : "aguda", dados };
}

/** Intensidade só quando o mestre deu o humor mas não a força: 1d10 como no sorteio. */
export function sortearIntensidade(): IntensidadeRessonancia {
  if (d(10) <= 8) return "fugaz";
  if (d(10) <= 8) return "intensa";
  return d(10) >= 6 ? "discrasia" : "aguda";
}

// ---------- saciar ----------

/**
 * Quanto uma bebida sacia de fato pela Potência de Sangue: sangue humano sacia 1 a menos com Potência 4–5, 2 a menos com 6–9 e
 * nada com 10 (só sangue de vampiro); sangue animal sacia metade com Potência 2 e nada a partir de 3.
 */
export function saciadoPelaPotencia(base: number, potencia: number, animal: boolean): { valor: number; nota: string | null } {
  if (animal) {
    if (potencia >= 3) return { valor: 0, nota: `Potência ${potencia}: sangue animal não sacia mais` };
    if (potencia === 2) return { valor: Math.max(0, base - 1), nota: "Potência 2: sangue animal sacia só metade" };
    return { valor: base, nota: null };
  }
  if (potencia >= 10) return { valor: 0, nota: "Potência 10: só sangue de vampiro sacia de verdade" };
  const pen = potencia >= 6 ? 2 : potencia >= 4 ? 1 : 0;
  return pen ? { valor: Math.max(0, base - pen), nota: `Potência ${potencia}: sangue humano sacia ${pen} a menos` } : { valor: base, nota: null };
}

/** Fome mínima depois de matar (Potência 8+ não desce de 2). Sem matar, o mínimo é 1. */
export const fomeMinimaAoMatar = (potencia: number) => (potencia >= 8 ? 2 : 0);
