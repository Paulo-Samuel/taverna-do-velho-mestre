// Anti-muletas (P18): o mestre não vê o que repetiu nos turnos anteriores, então a regra genérica "sem repetição" não basta.
// A cada turno, olhamos as últimas narrações longas do mestre, contamos as expressões de uma lista fixa (os bordões que mais
// apareceram na campanha 43) e os substantivos que voltam em 3 ou mais delas, e o LEMBRETE do turno diz o que NÃO usar.
// Também confere o tamanho da última narração contra o teto do estilo da mesa (estilo.ts).
// Sem "server-only" nem banco: prompt.ts lê as mensagens e chama estas funções puras (tests/muletas.test.ts).

/** Quantas narrações recentes do mestre entram na conta dos substantivos. */
export const NARRACOES_OLHADAS = 5;
/**
 * Quantas entram na conta das expressões fixas: janela maior para a proibição não "vencer" logo. Com 5, no turno real de
 * teste (W20) o "Dentro de você" sumiu por 4 narrações, saiu da lista e voltou na quinta; com 8 ele continua proibido até
 * ficar de fato raro (no máximo 1 em 8).
 */
export const NARRACOES_OLHADAS_EXPRESSOES = 8;
/** Mensagem do mestre abaixo disso não é narração (é "A vez é sua, Samuel." solto, resposta fora do jogo...). */
export const MIN_CARACTERES_NARRACAO = 400;
/** Expressão da lista fixa vira muleta quando aparece em pelo menos tantas das narrações olhadas. */
export const MIN_NARRACOES_EXPRESSAO = 2;
/** Substantivo vira muleta quando aparece em pelo menos tantas das narrações olhadas. */
export const MIN_NARRACOES_SUBSTANTIVO = 3;
/** Substantivos listados no máximo (os mais repetidos primeiro). */
export const MAX_SUBSTANTIVOS = 4;
/** Teto do lembrete de muletas, em caracteres. */
export const MAX_LEMBRETE = 300;

/** Sem acento e em minúsculas, para comparar ("Você" = "voce"). */
export const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Bordões que o mestre repete (contados na campanha 43): cada um com o rótulo que vai no lembrete e o padrão que o acha
 * no texto normalizado. A corrente e o tilintar são itens separados: na campanha 43 o som volta no saco, na chave e na
 * banheira, não só na corrente, e "corrente de ar" não é muleta.
 */
export const EXPRESSOES_FIXAS: { rotulo: string; re: RegExp; palavras: string[] }[] = [
  { rotulo: "a Besta", re: /\ba besta\b/, palavras: ["besta"] },
  { rotulo: "a Crueldade sussurra", re: /\bcrueldade\b/, palavras: ["crueldade"] },
  { rotulo: "Dentro de você", re: /\bdentro de voce\b/, palavras: [] },
  // a corrente de prender, não a de ar, a do rio nem a conta corrente
  {
    rotulo: "a corrente",
    re: /(?<!\bconta )\bcorrentes?\b(?! (de ar|de agua|d[oa] (rio|mar|agua|ar)|eletrica|sanguinea|de pensamento))/,
    palavras: ["corrente", "correntes"],
  },
  // o mesmo som de sempre, venha da corrente, do saco de moedas ou da chave
  { rotulo: "tilinta / tilintar", re: /\btilint/, palavras: ["tilinta", "tilintar", "tilintava", "tilintando"] },
  { rotulo: "o abajur", re: /\babajur/, palavras: ["abajur", "abajures"] },
  { rotulo: "o neon", re: /\bneon\b/, palavras: ["neon"] },
  { rotulo: "Lá fora / Lá embaixo", re: /\bla (fora|embaixo)\b/, palavras: [] },
  { rotulo: "a vez é sua", re: /\b(a vez e sua|e a sua vez|a sua vez|sua vez)\b/, palavras: ["vez"] },
];

// palavra depois de artigo, contração ou possessivo costuma ser substantivo (heurística barata, sem dicionário)
const DETERMINANTES = new Set(
  "o a os as um uma uns umas do da dos das no na nos nas ao aos pelo pela pelos pelas num numa seu sua seus suas meu minha este esta esse essa aquele aquela".split(" "),
);
// o que vem depois de artigo e não é substantivo de cena (ou é genérico demais para ser muleta)
const NAO_SUBSTANTIVOS = new Set(
  (
    "mesmo mesma mesmos mesmas outro outra outros outras primeiro primeira ultimo ultima unico unica proprio propria cada todo toda todos todas " +
    "coisa coisas algo alguem nada tudo qual quais quem onde quando como porque pois mais menos muito muita pouco pouca tanto tanta " +
    "lado frente parte meio forma jeito modo tempo hora noite ainda agora entao sempre nunca voce voces senhor senhora dele dela deles delas " +
    "sua seu suas seus isso isto aquilo maos mao olho olhos rosto boca nome homem homens mulher mulheres moca rapaz menino menina pessoa gente sangue vitae"
  ).split(" "),
);

/** Mensagens com o mínimo que muletas.ts precisa (o tipo Mensagem do banco serve). */
export type MensagemLida = { tipo: string; texto: string };

/** As últimas `n` narrações do mestre (mensagens tipo "mestre" com MIN_CARACTERES_NARRACAO ou mais), em ordem. */
export function narracoesRecentes(mensagens: MensagemLida[], n = NARRACOES_OLHADAS, minimo = MIN_CARACTERES_NARRACAO): string[] {
  return mensagens
    .filter((m) => m.tipo === "mestre" && m.texto.trim().length >= minimo)
    .slice(-n)
    .map((m) => m.texto);
}

export type Muletas = {
  /** rótulos da lista fixa, do mais repetido ao menos */
  expressoes: string[];
  /** substantivos repetidos em MIN_NARRACOES_SUBSTANTIVO+ narrações, do mais repetido ao menos */
  substantivos: string[];
};

const SEM_MULETAS: Muletas = { expressoes: [], substantivos: [] };

/** Chave de contagem de um substantivo: sem acento, sem o plural simples ("chaves" = "chave"). */
const raiz = (p: string) => (p.length > 4 && p.endsWith("s") ? p.slice(0, -1) : p);

/** Palavras normalizadas de um texto (para a lista de ignoradas: o que o jogador citou não é muleta, é o assunto). */
function palavrasDe(texto: string): Set<string> {
  return new Set((normalizar(texto).match(/[a-z]+/g) ?? []).map(raiz));
}

/**
 * Substantivos de uma narração: a palavra que vem depois de um determinante, em minúscula no original (nome próprio não
 * conta: Vera, Maldonado são personagens, não muleta), com 4+ letras. Devolve raiz → forma vista.
 */
function substantivosDe(texto: string): Map<string, string> {
  const achados = new Map<string, string>();
  const tokens = texto.match(/[\p{L}]+/gu) ?? [];
  for (let i = 1; i < tokens.length; i++) {
    const antes = normalizar(tokens[i - 1]);
    if (!DETERMINANTES.has(antes)) continue;
    const original = tokens[i];
    if (original[0] !== original[0].toLowerCase()) continue;
    const p = normalizar(original);
    if (p.length < 4 || NAO_SUBSTANTIVOS.has(p)) continue;
    // "a abrir", "ao sair": infinitivo depois da preposição a/ao
    if ((antes === "a" || antes === "ao") && /(ar|er|ir)$/.test(p)) continue;
    const r = raiz(p);
    if (!achados.has(r)) achados.set(r, original.toLowerCase());
  }
  return achados;
}

/**
 * Conta as muletas das narrações: expressões da lista fixa em MIN_NARRACOES_EXPRESSAO+ delas e substantivos em
 * MIN_NARRACOES_SUBSTANTIVO+. `ignorar`: textos cujas palavras não contam como muleta (a ação do jogador, a cena).
 * As expressões contam em todas as narrações recebidas (até NARRACOES_OLHADAS_EXPRESSOES); os substantivos, só nas
 * NARRACOES_OLHADAS últimas.
 */
export function contarMuletas(todas: string[], ignorar: string[] = []): Muletas {
  if (!todas.length) return SEM_MULETAS;
  const normalizadas = todas.map(normalizar);
  const narracoes = todas.slice(-NARRACOES_OLHADAS);
  const fora = new Set<string>();
  for (const t of ignorar) for (const p of palavrasDe(t)) fora.add(p);
  // o jogador falou do abajur ou da corrente: é o assunto do turno, não dá para proibir
  const expressoes = EXPRESSOES_FIXAS.map((e, ordem) => ({ e, ordem, vezes: normalizadas.filter((t) => e.re.test(t)).length }))
    .filter((x) => x.vezes >= MIN_NARRACOES_EXPRESSAO && !x.e.palavras.some((p) => p !== "vez" && fora.has(raiz(p))))
    .sort((a, b) => b.vezes - a.vezes || a.ordem - b.ordem)
    .map((x) => x.e.rotulo);

  for (const e of EXPRESSOES_FIXAS) for (const p of e.palavras) fora.add(raiz(p));

  const contagem = new Map<string, { forma: string; vezes: number; primeira: number }>();
  narracoes.forEach((texto, i) => {
    for (const [r, forma] of substantivosDe(texto)) {
      if (fora.has(r)) continue;
      const atual = contagem.get(r);
      if (atual) atual.vezes++;
      else contagem.set(r, { forma, vezes: 1, primeira: i });
    }
  });
  const substantivos = [...contagem.values()]
    .filter((x) => x.vezes >= MIN_NARRACOES_SUBSTANTIVO)
    .sort((a, b) => b.vezes - a.vezes || a.primeira - b.primeira)
    .slice(0, MAX_SUBSTANTIVOS)
    .map((x) => x.forma);
  return { expressoes, substantivos };
}

/**
 * Linha do LEMBRETE com as muletas: "(Nesta resposta NÃO use: a Besta, Dentro de você, …; varie a imagem de abertura e o
 * fecho.)". Vazia quando não há muleta. Itens entram enquanto a linha couber em `max` caracteres.
 */
export function lembreteDeMuletas(m: Muletas, max = MAX_LEMBRETE): string {
  const itens = [...m.expressoes.map((e) => `"${e}"`), ...m.substantivos];
  if (!itens.length) return "";
  const montar = (lista: string[]) => `(Nesta resposta NÃO use: ${lista.join(", ")}; varie a imagem de abertura e o fecho.)`;
  const cabem: string[] = [];
  for (const item of itens) {
    if (montar([...cabem, item]).length > max) break;
    cabem.push(item);
  }
  return cabem.length ? montar(cabem) : "";
}

/** Parágrafos de um texto (blocos separados por linha em branco). */
export function contarParagrafos(texto: string): number {
  return texto.split(/\n\s*\n/).filter((p) => p.trim()).length;
}

/** Palavras de um texto. */
export function contarPalavras(texto: string): number {
  return (texto.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

/** O teto do tamanho escolhido pela mesa (estilo.ts): parágrafos (mínimo e máximo) e palavras. */
export type TetoTamanho = { paragrafos: [number, number]; palavras: number };

/**
 * Aviso de tamanho para o LEMBRETE quando a última narração passou do teto da mesa (em parágrafos ou em palavras):
 * "(A última narração teve 4 parágrafos e 260 palavras; a mesa pediu 2 a 3, até 180 palavras.)". Vazio quando coube.
 */
export function avisoDeTamanho(ultima: string | null | undefined, teto: TetoTamanho): string {
  if (!ultima?.trim()) return "";
  const paragrafos = contarParagrafos(ultima);
  const palavras = contarPalavras(ultima);
  const [min, max] = teto.paragrafos;
  if (paragrafos <= max && palavras <= teto.palavras) return "";
  const pediu = min === max ? `${min}` : `${min} a ${max}`;
  return `(A última narração teve ${paragrafos} parágrafo${paragrafos === 1 ? "" : "s"} e ${palavras} palavras; a mesa pediu ${pediu}, até ${teto.palavras} palavras. Corte para caber.)`;
}

/**
 * Lembrete curto do teto quando a última narração coube: no turno real de teste (W20) o mestre passou para 4 parágrafos
 * logo depois de três narrações no tamanho, sem aviso nenhum; o teto só no prompt fixo não segura.
 */
export function lembreteDeTamanho(teto: TetoTamanho): string {
  const [min, max] = teto.paragrafos;
  return `(Tamanho: ${min === max ? min : `${min} a ${max}`} parágrafo${max === 1 ? "" : "s"}, até ${teto.palavras} palavras.)`;
}

/**
 * A última narração longa do mestre, menos a cena de abertura (que pode ser maior): null quando ainda não houve
 * nenhuma narração depois de uma ação de jogador na janela lida.
 */
export function ultimaNarracao(mensagens: MensagemLida[], minimo = MIN_CARACTERES_NARRACAO): string | null {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const m = mensagens[i];
    if (m.tipo !== "mestre" || m.texto.trim().length < minimo) continue;
    return mensagens.slice(0, i).some((x) => x.tipo === "jogador") ? m.texto : null;
  }
  return null;
}

/**
 * Tudo o que o LEMBRETE do turno ganha com as mensagens recentes: a linha das muletas e o aviso de tamanho (cada um vazio
 * quando não se aplica). `ignorar`: textos do turno (ações do jogador) cujas palavras não contam como muleta.
 * Com teto e já com narração anterior, o tamanho sempre entra: o aviso de que passou, ou o lembrete curto do teto.
 */
export function lembretesDoTurno(mensagens: MensagemLida[], teto: TetoTamanho | null, ignorar: string[] = []): string[] {
  const jogador = mensagens.filter((m) => m.tipo === "jogador").slice(-3).map((m) => m.texto);
  const muletas = lembreteDeMuletas(contarMuletas(narracoesRecentes(mensagens, NARRACOES_OLHADAS_EXPRESSOES), [...ignorar, ...jogador]));
  const ultima = teto ? ultimaNarracao(mensagens) : null;
  const tamanho = teto && ultima ? avisoDeTamanho(ultima, teto) || lembreteDeTamanho(teto) : "";
  return [muletas, tamanho].filter(Boolean);
}
