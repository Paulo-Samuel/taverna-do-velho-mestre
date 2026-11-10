// Plural dos rótulos dos sistemas ("Classe", "Clã", "Tipo de Predador", "Ocupação"...) para as contagens de tela:
// "18 tipos de predador", "13 clãs", "9 ocupações". Só a primeira palavra do rótulo composto vai para o plural
// ("tipo de predador" vira "tipos de predador", não "tipos de predadores"), e tudo sai em minúsculas.
// Lógica pura, sem React: quem usa é o passo de sistema da criação (components/ficha/passos.tsx).

const ACENTUADA = /[áéíóúâêôãõ]/;

/** Plural de uma palavra só, já em minúsculas, pelas regras gerais do português. */
function pluralDaPalavra(p: string): string {
  if (!p) return p;
  if (p.endsWith("ão")) return `${p.slice(0, -2)}ões`;
  if (p.endsWith("ã")) return `${p}s`;
  if (p.endsWith("m")) return `${p.slice(0, -1)}ns`;
  if (p.endsWith("l")) {
    const raiz = p.slice(0, -1);
    const temAcento = ACENTUADA.test(raiz);
    // -il: tônico perde o L ("funil" → "funis"); átono troca por -eis ("fóssil" → "fósseis")
    if (raiz.endsWith("i")) return temAcento ? `${raiz.slice(0, -1)}eis` : `${raiz}s`;
    // -el e -ol tônicos ganham acento ("papel" → "papéis", "anzol" → "anzóis"); com acento em outra sílaba, não ("nível" → "níveis")
    if (!temAcento && raiz.endsWith("e")) return `${raiz.slice(0, -1)}éis`;
    if (!temAcento && raiz.endsWith("o")) return `${raiz.slice(0, -1)}óis`;
    return `${raiz}is`;
  }
  if (p.endsWith("r") || p.endsWith("z")) return `${p}es`;
  if (p.endsWith("s")) {
    // tônica no fim ganha -es ("mês" → "meses", "país" → "países"); as outras não mudam ("lápis", "ônibus")
    if (p.endsWith("ês")) return `${p.slice(0, -2)}eses`;
    if (p.endsWith("ás")) return `${p.slice(0, -2)}ases`;
    if (/[íóú]s$/.test(p)) return `${p}es`;
    return p;
  }
  if (p.endsWith("x")) return p;
  return `${p}s`;
}

/**
 * O rótulo no número certo, em minúsculas: `pluralDoRotulo("Tipo de Predador", 18)` → "tipos de predador";
 * com `n === 1` devolve o singular ("clã").
 */
export function pluralDoRotulo(rotulo: string, n: number): string {
  const limpo = rotulo.trim().toLowerCase();
  if (n === 1 || !limpo) return limpo;
  const [primeira, ...resto] = limpo.split(/\s+/);
  return [pluralDaPalavra(primeira), ...resto].join(" ");
}
