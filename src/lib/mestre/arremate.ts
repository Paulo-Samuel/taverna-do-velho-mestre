// Rede de segurança do fim do turno (sem "server-only" para os testes rodarem fora do Next).
// Depois da última ferramenta o modelo às vezes escreve mais uma mensagem curta que só repete a passagem de vez
// ("A vez é sua, Samuel.", "O dado está com você...") ou resume a mecânica que a tela já mostra ("ganhou 1 Mancha
// (agora 1/4)", "anotei no diário"). Esse rabo não é gravado: a narração anterior já entregou a vez.

/** Rabo só de passagem de vez acima disto é mantido (pode ter narração de verdade). */
export const MAX_RABO = 260;
/** Rabo com resumo mecânico fora da ficção pode ser um pouco maior. */
export const MAX_RABO_MECANICO = 420;
/** Só descarta quando o turno já narrou bastante antes (senão o rabo pode ser a resposta inteira). */
export const MIN_NARRACAO = 300;

// as regras rodam sobre o texto sem acento e em minúsculas (o \b do JavaScript não entende "você")
// "a vez é sua", "sua vez", "é a vez de Samuel", "o dado é seu / está com você / na sua mão", "role o teste", "sua jogada"
const PASSA_VEZ =
  /\b(sua|a) vez\b|\bvez (e )?(sua|de)\b|\bo dado (e|esta|fica) (seu|sua|com voce|na sua mao|nas suas maos|em suas maos)\b|\bsua jogada\b|\bo que (voces?|ele|ela) (faz|fazem|fara|vai fazer)\b|\brol(e|ar|em)\b|\bescolha (o proximo|outro)\b|\bvoce decide\b|\bdecida\b|\bo dado decide\b|\bdepende do dado\b|\bdiga (qual|o que|com clareza|como)\b/;

// resumo fora da ficção: números de recurso, ganhos e gastos, diário, testes contados como regra
const MECANICA =
  /\bagora \d+\s*\/\s*\d+|\(\s*\d+\s*\/\s*\d+\s*\)|\b\d+ de \d+ pv\b|\bpv\b|\bxp\b|\b(ganhou|perdeu|gastou|recuperou|sofreu) \d+|\banotei\b|\bregistrei\b|\bmarquei\b|\bno diario\b|\b(a abertura|a cena|o turno|a narracao|o fechamento)\b.{0,12}\b(esta|ficou|foi) (pronta|pronto|aberta|montada|feita|feito|entregue|encerrad[ao]|concluid[ao])\b|\bsugest(ao|oes) (de acoes|na tela)\b|\brerrol|\b(teste|tentativa)\b.{0,40}\b(falhou|passou|deu certo|deu errado)\b/;

// o modelo fechando o próprio trabalho ("Pronto.", "Feito!"): nunca é para o jogador
const CONFIRMACAO = /^(pronto|feito|ok|okay|certo|tudo certo|tudo pronto|concluido|finalizado|turno (encerrado|concluido))[.!…\s]*$/;

const ASPAS =/["\u201c\u201d\u00ab\u00bb]|(^|\n)\s*[\u2014\u2013-]\s/;

const PARADAS = new Set(
  "para pela pelo pelos pelas como mais voce voces isso esse essa este esta isto aquele aquela ainda agora quando onde estao sobre entre depois antes cada tudo nada dele dela deles delas eles elas sua seu suas seus mesmo mesma muito pouco tambem porque quem qual quer foram sera seria tinha tem uma umas numa nos nas dos das com sem ate lado frente".split(" "),
);

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const palavras = (t: string) => (semAcento(t).match(/[a-z]{4,}/g) ?? []).filter((p) => !PARADAS.has(p));

/** Frases do rabo (quebra em . ! ? … e linha em branco). */
export function frases(t: string): string[] {
  return t
    .split(/(?<=[.!?…])\s+|\n{2,}/)
    .map((f) => f.trim())
    .filter(Boolean);
}

export type Classe = "vez" | "mecanica" | "eco" | "nova";

/** Classifica uma frase: passagem de vez, resumo mecânico, eco do que já foi narrado ou informação nova. */
export function classificar(frase: string, conhecidas: Set<string>): Classe {
  const t = semAcento(frase);
  if (MECANICA.test(t)) return "mecanica";
  if (PASSA_VEZ.test(t)) return "vez";
  const ps = palavras(frase);
  if (!ps.length) return "eco";
  const repetidas = ps.filter((p) => conhecidas.has(p) || conhecidas.has(p.replace(/s$/, ""))).length;
  return repetidas / ps.length >= 0.6 ? "eco" : "nova";
}

/**
 * true quando `rabo` (o texto escrito depois da última ferramenta do turno) só repete a vez ou resume a mecânica:
 * curto, depois de uma narração substancial, sem fala entre aspas, sem frase com fato novo e com pelo menos uma frase
 * de passagem de vez ou de resumo mecânico. Fala fora do jogo ("((...))") nunca é descartada. Um rabo sem letras ("—", o "nada
 * a dizer" que o prompt oferece) sempre sai. `conhecidos`: nomes dos personagens e as ações do jogador (o recap costuma ecoá-las).
 */
export function arremateRedundante(rabo: string, narradoAntes: string, conhecidos: string[] = []): boolean {
  const t = rabo.trim();
  if (!t || t.startsWith("((")) return false;
  if (!/[\p{L}\p{N}]/u.test(t) || CONFIRMACAO.test(semAcento(t))) return true;
  if (narradoAntes.trim().length < MIN_NARRACAO) return false;
  if (t.length > MAX_RABO_MECANICO || ASPAS.test(t)) return false;
  const conhecidas = new Set([...palavras(narradoAntes), ...conhecidos.flatMap(palavras)]);
  const classes = frases(t).map((f) => classificar(f, conhecidas));
  if (classes.includes("nova")) return false;
  if (classes.includes("mecanica")) return true;
  return classes.includes("vez") && t.length <= MAX_RABO;
}
