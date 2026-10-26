import "server-only";
import { d, rolar, type TermoDados } from "../dados";
import { clonar, fichaBase, limitar, normalizar, sinal } from "./comum";
import { ARQUETIPOS, type AbordagemId, type Arquetipo } from "./fate/arquetipos";
import { GENEROS, type Genero } from "./fate/generos";
import type { AtributoDef, BlocoFicha, Ficha, GrauSucesso, OpcaoCriacao, PedidoTeste, ResultadoTeste, Sistema } from "./tipos";

// Fate Acelerado (FAE), Fate Core e Fate Condensado — Creative Commons BY 3.0 (Evil Hat Productions).
// Abordagens no lugar de atributos, gêneros de cenário no lugar de ancestralidades, arquétipos no lugar de classes.
// Estresse: 3 caixas de 1 tensão cada (como no Fate Condensado), guardadas em pv/pvMax e espelhadas no recurso "estresse".

const ABORDAGENS: (AtributoDef & { id: AbordagemId })[] = [
  { id: "cuidadoso", nome: "Cuidadoso", abrev: "CUI", descricao: "Atenção aos detalhes, paciência e precisão." },
  { id: "esperto", nome: "Esperto", abrev: "ESP", descricao: "Raciocínio rápido, conhecimento e solução de problemas." },
  { id: "estiloso", nome: "Estiloso", abrev: "EST", descricao: "Chamar atenção, charme, bravata e espetáculo." },
  { id: "poderoso", nome: "Poderoso", abrev: "POD", descricao: "Força bruta, presença e intimidação." },
  { id: "agil", nome: "Ágil", abrev: "ÁGI", descricao: "Velocidade, reflexos e destreza." },
  { id: "sorrateiro", nome: "Sorrateiro", abrev: "SOR", descricao: "Furtividade, engano e fazer sem ser notado." },
];

// variações que o mestre (ou o jogador no rolador) costuma escrever, já normalizadas
const SINONIMOS: Record<AbordagemId, string> = {
  cuidadoso: "cuidados[oa]|cuidadosamente|cautelos[oa]|careful|cui",
  esperto: "espert[oa]|espertamente|astut[oa]|clever|esp",
  estiloso: "estilos[oa]|estilosamente|chamativ[oa]|flashy|est",
  poderoso: "poderos[oa]|poderosamente|forceful|pod",
  agil: "agil|agilmente|rapid[oa]|quick|agi",
  sorrateiro: "sorrateir[oa]|sorrateiramente|sneaky|sor",
};

// perícias e atributos de outros sistemas mapeados para a abordagem mais natural
const PALAVRAS_CHAVE: [RegExp, AbordagemId][] = [
  [/furt|escond|esgueir|carteira|prestidigit|roub|infiltr|emboscad|dissimul|disfarc/, "sorrateiro"],
  [/acrobac|reflex|\bdes\b|destreza|esquiv|corr(er|ida)|fug|pilot|dirig|pul[ao]|salt|equilibr|velocid/, "agil"],
  [/atlet|\bfor\b|forca|vigor|fortitude|\bcon\b|constitui|intimid|quebr|arromb|empurr|levant|escal|nadar|natac|agarr/, "poderoso"],
  [/percep|investig|medicin|curar|intui|\bsab\b|sabedoria|vontade|sobreviv|rastre|observ|procur|vigi|atenc|socorr|concentr/, "cuidadoso"],
  [/arcan|conhec|histori|natureza|religi|\bint\b|intelig|hack|cienc|engenh|tecnolog|enigma|decifr|computad|lembr|deduz|calcul|estrateg|tatic/, "esperto"],
  [/persuas|atuac|engan|\bcar\b|carisma|diplom|seduz|charm|lider|inspir|blef|ment(ir|ira)|negoci|convenc|espetac/, "estiloso"],
];

type Acao = "superar" | "vantagem" | "atacar" | "defender";

const NOMES_ACAO: Record<Acao, string> = { superar: "Superar", vantagem: "Criar vantagem", atacar: "Atacar", defender: "Defender" };

// a escada do Fate; fora dela, nomeia pelo extremo mais próximo
const ESCADA: Record<number, string> = {
  8: "Lendário", 7: "Épico", 6: "Fantástico", 5: "Excepcional", 4: "Ótimo", 3: "Bom", 2: "Razoável", 1: "Regular", 0: "Medíocre", [-1]: "Ruim", [-2]: "Terrível",
};

export function nomeEscada(n: number): string {
  if (n > 8) return "além de Lendário";
  if (n < -2) return "abaixo de Terrível";
  return ESCADA[n];
}

const ESCADA_INICIAL = [3, 2, 2, 1, 1, 0];
const RECARGA_BASE = 3;
const FACANHAS_GRATIS = 3;
const MAX_FACANHAS = 5; // cada façanha além de 3 custa 1 de recarga, e a recarga não pode cair abaixo de 1
const CAIXAS_ESTRESSE = 3;
// pontos de destino podem passar da recarga (forçar aspectos dá pontos); o teto do recurso deixa essa folga
const FOLGA_DESTINO = 3;
const LIMITE_ABORDAGEM = 4;
const NIVEL_MAXIMO = 16; // 15 marcos significativos levam as seis abordagens a +4

function arquetipoDe(ficha: Ficha): Arquetipo {
  return ARQUETIPOS.find((a) => a.id === ficha.classe) ?? ARQUETIPOS[0];
}

function generoDe(ficha: Ficha): Genero {
  return GENEROS.find((g) => g.id === ficha.ancestralidade) ?? GENEROS[0];
}

function nomeAbordagem(id: AbordagemId): string {
  return ABORDAGENS.find((a) => a.id === id)!.nome;
}

function textos(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map((v) => String(v).trim()).filter(Boolean);
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

function recarga(ficha: Ficha): number {
  const r = Number(ficha.extras.recarga);
  return Number.isFinite(r) && r > 0 ? r : RECARGA_BASE;
}

/** Caixas de estresse livres. pv e recurso "estresse" podem divergir (o mestre altera um ou outro): vale o menor. */
function estresseLivre(ficha: Ficha): number {
  return limitar(Math.min(ficha.pv, ficha.recursos.estresse?.atual ?? ficha.pv), 0, ficha.pvMax);
}

type Severidade = "suave" | "moderada" | "severa";
const VALOR_CONSEQUENCIA: Record<Severidade, number> = { suave: 2, moderada: 4, severa: 6 };
const PREFIXO_CONSEQUENCIA = /^(?:consequ[eê]ncia\s+)?(suave|moderada|severa)\b\s*[:\-–—]?\s*/i;

/** Consequências ficam em ficha.condicoes como "Consequência suave: Olho Roxo". */
function consequencias(ficha: Ficha): { severidade: Severidade; texto: string; original: string }[] {
  return ficha.condicoes.flatMap((c) => {
    const m = c.match(PREFIXO_CONSEQUENCIA);
    if (!m) return [];
    return [{ severidade: normalizar(m[1]) as Severidade, texto: c.slice(m[0].length).trim() || "(sem nome)", original: c }];
  });
}

function removerConsequencias(ficha: Ficha, severidade: Severidade): string[] {
  const removidas = consequencias(ficha).filter((c) => c.severidade === severidade).map((c) => c.original);
  ficha.condicoes = ficha.condicoes.filter((c) => !removidas.includes(c));
  return removidas;
}

function acharAbordagemExplicita(nome: string): AbordagemId | null {
  let melhor: { id: AbordagemId; pos: number } | null = null;
  for (const a of ABORDAGENS) {
    const m = new RegExp(`\\b(?:${SINONIMOS[a.id]})\\b`).exec(nome);
    if (m && (!melhor || m.index < melhor.pos)) melhor = { id: a.id, pos: m.index };
  }
  return melhor?.id ?? null;
}

function acharAcao(nome: string): Acao | null {
  if (/criar vantagem|vantagem|prepar/.test(nome)) return "vantagem";
  if (/defend|defesa|esquiv|resist|bloque|apar[ao]|salvamento|salvaguarda/.test(nome)) return "defender";
  if (/atac|ataque|golpe|tiro|\bdano\b|combate/.test(nome)) return "atacar";
  if (/super/.test(nome)) return "superar";
  return null;
}

type Interpretacao = { abordagem: AbordagemId | null; acao: Acao | null; rotulo: string; nota?: string };

/** Lê o pedido do mestre de forma tolerante: abordagem explícita > palavra-chave > padrão da ação/arquétipo. */
function interpretar(ficha: Ficha, teste: string): Interpretacao {
  const arquetipo = arquetipoDe(ficha);
  const nome = normalizar(teste);
  const original = teste.trim().slice(0, 40) || "Teste";
  const acao = acharAcao(nome);
  const sufixo = acao ? ` · ${NOMES_ACAO[acao]}` : "";

  const explicita = acharAbordagemExplicita(nome);
  if (explicita) return { abordagem: explicita, acao, rotulo: `${nomeAbordagem(explicita)}${sufixo}` };

  if (/iniciativa/.test(nome)) {
    // FAE: conflito físico usa Ágil; mental ou social usa Cuidadoso
    const abordagem: AbordagemId = /mental|social|debate|intriga/.test(nome) ? "cuidadoso" : "agil";
    return { abordagem, acao: null, rotulo: `Iniciativa (${nomeAbordagem(abordagem)})` };
  }
  if (/magi|feiti|conjur|ritual|poder|psiq/.test(nome)) {
    const abordagem = arquetipo.magia ?? "esperto";
    return { abordagem, acao, rotulo: `${original} (${nomeAbordagem(abordagem)})` };
  }

  const chave = PALAVRAS_CHAVE.find(([re]) => re.test(nome));
  if (chave) return { abordagem: chave[1], acao, rotulo: `${original} (${nomeAbordagem(chave[1])})` };

  if (acao === "atacar") return { abordagem: arquetipo.ataque, acao, rotulo: `${NOMES_ACAO.atacar} (${nomeAbordagem(arquetipo.ataque)})` };
  if (acao === "defender") return { abordagem: arquetipo.defesa, acao, rotulo: `${NOMES_ACAO.defender} (${nomeAbordagem(arquetipo.defesa)})` };

  return { abordagem: null, acao, rotulo: original, nota: "abordagem não reconhecida: rolado com +0 (diga a abordagem, ex.: \"Esperto\")" };
}

function tensoes(n: number): string {
  return `${n} ${n === 1 ? "tensão" : "tensões"}`;
}

/** Rótulo do grau no vocabulário do Fate, conforme a ação. */
function rotuloDoGrau(grau: GrauSucesso, acao: Acao | null, margem: number): string {
  if (acao === "atacar") {
    if (grau === "falha") return "Errou: o golpe não passa";
    if (grau === "parcial") return "Empate: sem dano, mas você ganha um impulso";
    if (grau === "sucesso") return `Acerto: ${tensoes(margem)} de dano`;
    return `Acerto com estilo: ${tensoes(margem)} (ou ${margem - 1} e um impulso)`;
  }
  if (acao === "defender") {
    if (grau === "falha") return "Falhou na defesa: o ataque passa";
    if (grau === "parcial") return "Empate: o ataque não passa, mas o atacante ganha um impulso";
    if (grau === "sucesso") return "Defendeu";
    return "Defendeu com estilo: você ganha um impulso";
  }
  if (acao === "vantagem") {
    if (grau === "falha") return "Falha: o aspecto não surge (ou surge com a invocação grátis para o outro lado)";
    if (grau === "parcial") return "Empate: em vez do aspecto, você ganha um impulso";
    if (grau === "sucesso") return "Sucesso: aspecto criado com 1 invocação grátis";
    return "Sucesso com estilo: aspecto criado com 2 invocações grátis";
  }
  if (grau === "falha") return "Falha (ou sucesso a um custo sério)";
  if (grau === "parcial") return "Empate (sucesso a um custo menor)";
  if (grau === "sucesso") return "Sucesso";
  return "Sucesso com estilo!";
}

function face(v: number): string {
  return v > 0 ? "+" : v < 0 ? "−" : "0";
}

/** Valida abordagens informadas: na criação seguem a escada +3, +2, +2, +1, +1, +0. Sem todas, devolve null. */
function abordagensInformadas(atributos: Record<string, number> | undefined): Record<string, number> | null {
  if (!atributos || !ABORDAGENS.every((a) => Number.isFinite(Number(atributos[a.id])))) return null;
  const valores = Object.fromEntries(ABORDAGENS.map((a) => [a.id, limitar(Math.round(Number(atributos[a.id])), 0, LIMITE_ABORDAGEM)]));
  const ordenados = Object.values(valores).sort((x, y) => y - x).join(",");
  if (ordenados !== ESCADA_INICIAL.join(",")) {
    throw new Error("No Fate Acelerado as abordagens começam na escada: uma +3, duas +2, duas +1 e uma +0.");
  }
  return valores;
}

function nomeFacanha(texto: string): string {
  const base = texto.replace(/^porque\s+(eu\s+)?/i, "").split(",")[0].trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const OPCOES: OpcaoCriacao[] = [
  {
    id: "conceito", rotulo: "Conceito", tipo: "texto", obrigatoria: true,
    ajuda: "O aspecto principal: quem você é numa frase de efeito. Ex.: Mago Desastrado da Torre Sem Teto.",
  },
  {
    id: "dificuldade", rotulo: "Dificuldade", tipo: "texto", obrigatoria: true,
    ajuda: "O problema que sempre volta para morder. Ex.: Devo Dinheiro à Pessoa Errada, Não Recuso um Desafio.",
  },
  {
    id: "aspectos", rotulo: "Outros aspectos", tipo: "lista-texto", max: 3,
    ajuda: "Até 3: uma relação com outro personagem, uma crença, um bordão, um objeto marcante.",
  },
  ...ARQUETIPOS.map<OpcaoCriacao>((a) => ({
    id: `fac_${a.id}`, rotulo: "Façanhas sugeridas", tipo: "multipla", max: FACANHAS_GRATIS, classes: [a.id],
    ajuda: `Exemplos para ${a.nome}. Pode misturar com façanhas próprias.`,
    opcoes: a.facanhas.map((f, i) => ({ id: `${a.id}_${i + 1}`, nome: nomeFacanha(f), descricao: f })),
  })),
  {
    id: "facanhas", rotulo: "Façanhas próprias", tipo: "lista-texto", max: FACANHAS_GRATIS,
    ajuda: "Formato: \"Porque eu..., recebo +2 quando [abordagem] [ação] quando...\" ou \"uma vez por sessão posso...\". Três são grátis; cada extra custa 1 de recarga (até 5).",
  },
];

/** Junta as façanhas sugeridas (ids) e as próprias (texto), sem repetir, até o limite. */
function juntarFacanhas(arquetipo: Arquetipo, extras: Record<string, unknown>): string[] {
  const sugeridas = textos(extras[`fac_${arquetipo.id}`]).map((id) => {
    const i = Number(id.split("_").pop()) - 1;
    return id.startsWith(`${arquetipo.id}_`) && arquetipo.facanhas[i] ? arquetipo.facanhas[i] : id;
  });
  const todas = [...sugeridas, ...textos(extras.facanhas)].map((f) => f.slice(0, 240));
  return [...new Set(todas)].slice(0, MAX_FACANHAS);
}

export const fate: Sistema = {
  id: "fate",
  nome: "Fate Acelerado (FAE)",
  nomeCurto: "Fate Acelerado",
  descricao: "Narrativo e veloz: seis abordagens, aspectos que se invocam com pontos de destino e 4dF na escada. Qualquer gênero.",
  licenca: "Fate Core/Fate Acelerado/Fate Condensado — Creative Commons BY 3.0 (Evil Hat Productions)",
  dadoPrincipal: "4dF",
  pronto: true,
  rotulos: { ancestralidade: "Gênero", classe: "Arquétipo", nivel: "Marco", defesa: "Defesa", dinheiro: "moedas", pv: "Estresse" },
  atributos: ABORDAGENS.map(({ id, nome, abrev, descricao }) => ({ id, nome, abrev, descricao })),
  // FAE não tem perícias: tudo passa pelas abordagens
  pericias: [],
  classes: ARQUETIPOS.map((c) => ({
    id: c.id, nome: c.nome, descricao: c.descricao, atributoChave: c.atributoChave, pvBase: c.pvBase,
    pericias: c.pericias, equipamento: c.equipamento, papel: c.papel, fonte: c.fonte,
  })),
  ancestralidades: GENEROS.map(({ id, nome, descricao, tracos }) => ({ id, nome, descricao, tracos })),
  opcoesCriacao: OPCOES,
  metodosAtributos: [
    { id: "padrao", nome: "Sugestão do arquétipo", descricao: "+3, +2, +2, +1, +1, +0 na ordem que combina com o arquétipo." },
    { id: "livre", nome: "Distribuição livre", descricao: "Você mesmo põe +3, +2, +2, +1, +1, +0 onde quiser (a sugestão do arquétipo é só o ponto de partida)." },
    { id: "aleatorio", nome: "Embaralhar", descricao: "Os dados embaralham a escada +3, +2, +2, +1, +1, +0 entre as abordagens. Boa sorte." },
  ],
  limitesAtributos: { min: 0, max: LIMITE_ABORDAGEM },
  periciasEscolhiveis: 0,
  nivelMaximo: NIVEL_MAXIMO,
  testesSugeridos: [
    "Cuidadoso", "Esperto", "Estiloso", "Poderoso", "Ágil", "Sorrateiro",
    "Atacar (Poderoso)", "Defender (Ágil)", "Criar vantagem (Esperto)", "Superar (Sorrateiro)", "Iniciativa",
  ],
  regrasParaMestre: `Sistema: Fate Acelerado (FAE, CC-BY Evil Hat). Narrativo: a ficção manda, os números servem a ela.
- Abordagens (no lugar de atributos): Cuidadoso, Esperto, Estiloso, Poderoso, Ágil, Sorrateiro, de +0 a +4. Começam em +3, +2, +2, +1, +1, +0. O JOGADOR descreve COMO age e isso escolhe a abordagem (arrombar a porta no chute = Poderoso; achar a dobradiça frouxa = Esperto).
- Teste = 4dF (cada dado −1, 0 ou +1) + abordagem + modificadores, contra uma oposição na escada: +8 Lendário, +7 Épico, +6 Fantástico, +5 Excepcional, +4 Ótimo, +3 Bom, +2 Razoável, +1 Regular, 0 Medíocre, −1 Ruim, −2 Terrível. Tarefa simples: nem role. Oposição típica: 0 fácil, +2 razoável, +4 difícil, +6 heroica. Oposição ativa (alguém resistindo): role 4dF + o nível do NPC com rolar_dados e use o total como alvo.
- Teste (teste ou pedir_teste): teste = abordagem e, se quiser, a ação. Ex.: "Esperto", "Poderoso: atacar", "Criar vantagem (Sorrateiro)", "Defender (Ágil)", "Iniciativa". alvo = oposição (número da escada; omitido = 0). modificador = +2 por aspecto invocado ou façanha que se aplica. modo vantagem/desvantagem vira +2/−2 (prefira modificador).
- Resultado: abaixo da oposição = falha (ou ofereça sucesso a custo sério); igual = empate (sucesso a custo menor); 1-2 acima = sucesso; 3+ acima = sucesso com estilo (sucesso_critico). A diferença são as TENSÕES.
- As quatro ações: SUPERAR (passar um obstáculo); CRIAR VANTAGEM (criar ou descobrir um aspecto: sucesso dá 1 invocação grátis, com estilo 2, empate dá um impulso — aspecto passageiro de 1 uso); ATACAR (tensões do sucesso viram dano; com estilo pode trocar 1 tensão por um impulso); DEFENDER (contra ataque ou criação de vantagem; com estilo ganha um impulso).
- Aspectos: frases verdadeiras sobre personagens, cenas e coisas (Conceito, Dificuldade, outros 3 aspectos; aspectos de cena que você cria). INVOCAR: o jogador gasta 1 Ponto de Destino (recurso "destino", alterar_ficha recursos {"destino": -1}) para +2 ou rolar de novo; invocações grátis não custam ponto. FORÇAR: você oferece 1 Ponto de Destino para um aspecto complicar a vida do personagem (dê com {"destino": +1}); recusar custa 1 ponto ao jogador. Força a Dificuldade com frequência: é para isso que ela existe.
- Conflito: ordem por Ágil (físico) ou Cuidadoso (mental/social) — teste "Iniciativa". Cada turno uma ação. Dano em tensões: cada caixa de estresse absorve 1 tensão (3 caixas = pv 3; marque com alterar_ficha pv negativo). Consequências absorvem mais: suave 2, moderada 4, severa 6 — anote como condição "Consequência suave: Olho Roxo" (é um aspecto que o inimigo invoca grátis uma vez). Sem caixas nem consequências para absorver, o personagem é TIRADO DE AÇÃO (o vencedor decide o destino dele). Antes disso o jogador pode CONCEDER: sai de cena nos próprios termos e ganha 1 Ponto de Destino (+1 por consequência sofrida no conflito). Quando pv chega a 0 o sistema marca "inconsciente": se o jogador absorveu o golpe com consequência, remova essa condição.
- Capangas e NPCs: capanga típico tem +1 ou +2 em tudo que faz bem e 0-1 caixa de estresse; vilão tem +3/+4, caixas e consequências próprias.
- Façanhas: regras especiais escritas na ficha (geralmente +2 numa situação, ou um efeito uma vez por sessão); aplique o +2 em modificador quando a situação descrita acontecer.
- Recuperação: depois do conflito o estresse limpa (descanso curto). Entre sessões (descanso longo): consequências suaves somem e Pontos de Destino voltam à recarga se estiverem abaixo dela. Moderada some num marco (fim de cenário); severa exige um arco inteiro.
- Marcos (não há XP): ao fim de um arco, conceda um marco significativo (subir de nível): +1 numa abordagem (máx. +4), limpa consequências moderadas e, a cada 3 marcos, +1 de recarga. Marcos menores (trocar duas abordagens, renomear um aspecto, trocar uma façanha) você só narra e ajusta.
COMO MESTRAR FATE
- Pergunte COMO antes de rolar: a descrição escolhe a abordagem e a ação. Sem oposição interessante, não role.
- Aspectos são verdades: "Chão Coberto de Óleo" vale para todos. Dê 2–3 aspectos a cada cena nova (na narração e resumidos na situacao do atualizar_cena) e deixe os jogadores descobrirem ou criarem mais com Criar Vantagem.
- Forçar é o seu motor: quando um aspecto do personagem deixaria a vida dele mais interessante, ofereça dentro da ficção ("Sendo quem você é, não vai deixar isso passar, vai? Um Ponto de Destino se topar.") e pague com alterar_ficha {"destino": +1}. Force a Dificuldade sempre que couber; o jogador também pode propor.
- Invocar vem depois do dado: com o resultado na mão, o jogador gasta ponto (ou invocação grátis) para +2 ou rolar de novo. No pedir_teste, invocação combinada antes do dado vai em modificador; a decidida depois entra no turno do resultado: some +2, reavalie e aplique destino −1.
- Quatro resultados, quatro narrações: falha pode virar sucesso a custo sério; empate é sucesso a custo menor; sucesso com estilo traz algo a mais (um impulso). Nunca "não acontece nada".
- Oposição pela escada, dita em palavras ("um guarda Bom"), e NPCs coerentes com ela.
- Conflito é escolha: ofereça conceder antes de tirar de ação; consequências viram aspectos que o inimigo invoca e a história lembra.
- Narre cinematográfico: Fate gosta de heróis competentes, proativos e dramáticos.`,

  atributosIniciais(classeId, metodo) {
    const arquetipo = ARQUETIPOS.find((a) => a.id === classeId) ?? ARQUETIPOS[0];
    if (metodo === "aleatorio") {
      // Fisher-Yates com o dado do motor (crypto), nunca Math.random
      const ordem = [...arquetipo.ordem];
      for (let i = ordem.length - 1; i > 0; i--) {
        const j = d(i + 1) - 1;
        [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
      }
      return Object.fromEntries(ordem.map((id, i) => [id, ESCADA_INICIAL[i]]));
    }
    return Object.fromEntries(arquetipo.ordem.map((id, i) => [id, ESCADA_INICIAL[i]]));
  },

  criarFicha(entrada) {
    const arquetipo = ARQUETIPOS.find((a) => a.id === entrada.classe) ?? ARQUETIPOS[0];
    const genero = GENEROS.find((g) => g.id === entrada.ancestralidade) ?? GENEROS[0];
    const ficha = fichaBase("fate", entrada.nome);
    ficha.classe = arquetipo.id;
    ficha.ancestralidade = genero.id;
    ficha.atributos = abordagensInformadas(entrada.atributos) ?? fate.atributosIniciais(arquetipo.id, "padrao");

    const extras = { ...(entrada.extras ?? {}) };
    const facanhas = juntarFacanhas(arquetipo, extras);
    for (const a of ARQUETIPOS) delete extras[`fac_${a.id}`];
    const recargaInicial = Math.max(1, RECARGA_BASE - Math.max(0, facanhas.length - FACANHAS_GRATIS));
    ficha.extras = {
      ...extras,
      conceito: textos(extras.conceito)[0]?.slice(0, 120) || `${arquetipo.nome} de ${genero.nome}`,
      dificuldade: textos(extras.dificuldade)[0]?.slice(0, 120) || "Problemas Têm Meu Endereço",
      aspectos: textos(extras.aspectos).map((x) => x.slice(0, 120)).slice(0, 3),
      facanhas,
      recarga: recargaInicial,
    };

    ficha.pvMax = CAIXAS_ESTRESSE;
    ficha.pv = CAIXAS_ESTRESSE;
    ficha.defesa = 0;
    ficha.recursos = {
      destino: { rotulo: "Pontos de Destino", atual: recargaInicial, max: recargaInicial + FOLGA_DESTINO },
      estresse: { rotulo: "Estresse", atual: CAIXAS_ESTRESSE, max: CAIXAS_ESTRESSE },
    };
    ficha.inventario = [...(arquetipo.equipamento ?? []), ...genero.itens];
    ficha.dinheiro = 0;
    ficha.historia = entrada.historia ?? "";
    return ficha;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    const { abordagem, acao, rotulo, nota } = interpretar(ficha, pedido.teste);
    const rolagem = rolar("4dF");
    const dados = (rolagem.partes[0] as TermoDados).valores;
    const valorAbordagem = abordagem ? (ficha.atributos[abordagem] ?? 0) : 0;
    const modo = pedido.modo ?? "normal";
    const bonusModo = modo === "vantagem" ? 2 : modo === "desvantagem" ? -2 : 0;
    const bonus = valorAbordagem + (pedido.modificador ?? 0) + bonusModo;
    const total = rolagem.total + bonus;
    const alvo = pedido.alvo ?? 0;
    const margem = total - alvo;
    const grau: GrauSucesso = margem < 0 ? "falha" : margem === 0 ? "parcial" : margem >= 3 ? "sucesso_critico" : "sucesso";

    const detalhes = [
      `dados [${dados.map(face).join(" ")}] = ${sinal(rolagem.total)}`,
      abordagem ? `${nomeAbordagem(abordagem)} ${sinal(valorAbordagem)} (${nomeEscada(valorAbordagem)})` : "",
      pedido.modificador ? `modificador ${sinal(pedido.modificador)}` : "",
      bonusModo ? `${modo} tratada como invocação (${sinal(bonusModo)})` : "",
      `total ${sinal(total)} (${nomeEscada(total)}) contra ${sinal(alvo)} (${nomeEscada(alvo)})`,
      margem > 0 ? tensoes(margem) : "",
      nota ?? "",
    ].filter(Boolean);

    return {
      tipo: "teste",
      sistema: "fate",
      personagem: ficha.nome,
      motivo: pedido.motivo,
      teste: rotulo,
      expressao: `4dF${sinal(bonus)}`,
      dados,
      natural: null,
      bonus,
      total,
      alvo,
      grau,
      sucesso: grau === "sucesso" || grau === "sucesso_critico",
      rotuloGrau: rotuloDoGrau(grau, acao, margem),
      detalhes: detalhes.join(" · "),
      margem,
    };
  },

  descreverParaMestre(ficha) {
    const arquetipo = arquetipoDe(ficha);
    const genero = generoDe(ficha);
    const abordagens = ABORDAGENS.map((a) => `${a.nome} ${sinal(ficha.atributos[a.id] ?? 0)}`).join(", ");
    const aspectos = textos(ficha.extras.aspectos);
    const facanhas = textos(ficha.extras.facanhas);
    const conseq = consequencias(ficha);
    const outrasCondicoes = ficha.condicoes.filter((c) => !PREFIXO_CONSEQUENCIA.test(c));
    const destino = ficha.recursos.destino;
    const extrasRecursos = Object.entries(ficha.recursos).filter(([id]) => id !== "destino" && id !== "estresse");
    return `${ficha.nome} — ${arquetipo.nome} (${genero.nome}), marco ${ficha.nivel}
Conceito: ${String(ficha.extras.conceito ?? "—")} · Dificuldade: ${String(ficha.extras.dificuldade ?? "—")}
Aspectos: ${aspectos.join("; ") || "nenhum"}
Abordagens: ${abordagens}
Estresse: ${estresseLivre(ficha)}/${ficha.pvMax} caixas livres (1 tensão cada) · Pontos de Destino ${destino?.atual ?? 0} (recarga ${recarga(ficha)})
Consequências: ${conseq.map((c) => `${c.severidade} (${VALOR_CONSEQUENCIA[c.severidade]}): ${c.texto}`).join("; ") || "nenhuma"}
Façanhas: ${facanhas.join(" | ") || "nenhuma"}${extrasRecursos.length ? `\nOutros recursos: ${extrasRecursos.map(([, r]) => `${r.rotulo} ${r.atual}/${r.max}`).join(", ")}` : ""}
Inventário: ${ficha.inventario.join(", ") || "nada"}
Condições: ${outrasCondicoes.join(", ") || "nenhuma"}${ficha.historia ? `\nHistória: ${ficha.historia}` : ""}`;
  },

  blocosFicha(ficha): BlocoFicha[] {
    const genero = generoDe(ficha);
    const livres = estresseLivre(ficha);
    const conseq = consequencias(ficha);
    const destino = ficha.recursos.destino;
    const aspectos = textos(ficha.extras.aspectos);
    const facanhas = textos(ficha.extras.facanhas);
    const outrasCondicoes = ficha.condicoes.filter((c) => !PREFIXO_CONSEQUENCIA.test(c));
    const caixas = Array.from({ length: ficha.pvMax }, (_, i) => (i < ficha.pvMax - livres ? "■" : "□")).join(" ");

    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "Estresse (caixas livres)", atual: livres, max: ficha.pvMax, cor: "vida" },
          ...(destino ? [{ rotulo: "Pontos de Destino", atual: destino.atual, max: destino.max, cor: "magia" as const }] : []),
          ...Object.entries(ficha.recursos)
            .filter(([id]) => id !== "destino" && id !== "estresse")
            .map(([, r]) => ({ rotulo: r.rotulo, atual: r.atual, max: r.max, cor: "outro" as const })),
        ],
      },
      {
        tipo: "lista",
        titulo: "Aspectos",
        itens: [`Conceito: ${String(ficha.extras.conceito ?? "—")}`, `Dificuldade: ${String(ficha.extras.dificuldade ?? "—")}`, ...aspectos],
      },
      {
        tipo: "grade",
        titulo: "Abordagens",
        itens: ABORDAGENS.map((a) => {
          const v = ficha.atributos[a.id] ?? 0;
          return { rotulo: a.nome, valor: sinal(v), detalhe: nomeEscada(v) };
        }),
      },
      {
        tipo: "grade",
        itens: [
          { rotulo: "Estresse", valor: caixas, detalhe: "■ marcada" },
          { rotulo: "Recarga", valor: String(recarga(ficha)) },
          { rotulo: "Marco", valor: String(ficha.nivel) },
        ],
      },
      {
        tipo: "grade",
        titulo: "Consequências",
        itens: (["suave", "moderada", "severa"] as Severidade[]).map((s) => ({
          rotulo: `${s.charAt(0).toUpperCase()}${s.slice(1)} (${VALOR_CONSEQUENCIA[s]})`,
          valor: conseq.filter((c) => c.severidade === s).map((c) => c.texto).join("; ") || "—",
        })),
      },
      { tipo: "lista", titulo: "Façanhas", itens: facanhas.length ? facanhas : ["nenhuma ainda"] },
      { tipo: "lista", titulo: "Inventário", itens: ficha.inventario },
      { tipo: "etiquetas", titulo: `Gênero: ${genero.nome}`, itens: genero.tracos ?? [] },
    ];
    if (outrasCondicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: outrasCondicoes });
    return blocos;
  },

  xpParaNivel() {
    // Fate avança por marcos que o mestre concede; não existe XP
    return null;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    const arquetipo = arquetipoDe(ficha);
    if (ficha.nivel >= NIVEL_MAXIMO) return { ficha, resumo: `${ficha.nome} já está no marco máximo (${NIVEL_MAXIMO}). Marcos menores ainda podem trocar abordagens e façanhas.` };
    ficha.nivel += 1;

    // sobe a maior abordagem ainda abaixo do limite (desempate pela ordem do arquétipo): especializa antes de espalhar
    const candidatas = arquetipo.ordem.filter((id) => (ficha.atributos[id] ?? 0) < LIMITE_ABORDAGEM);
    const escolhida = candidatas.reduce<AbordagemId | null>(
      (melhor, id) => (melhor === null || (ficha.atributos[id] ?? 0) > (ficha.atributos[melhor] ?? 0) ? id : melhor),
      null,
    );
    const partes: string[] = [];
    if (escolhida) {
      ficha.atributos[escolhida] = (ficha.atributos[escolhida] ?? 0) + 1;
      partes.push(`${nomeAbordagem(escolhida)} sobe para ${sinal(ficha.atributos[escolhida])} (${nomeEscada(ficha.atributos[escolhida])})`);
    }

    // a cada 3 marcos significativos, +1 de recarga (pode virar uma façanha nova, combinando com o mestre)
    if ((ficha.nivel - 1) % 3 === 0) {
      const nova = recarga(ficha) + 1;
      ficha.extras.recarga = nova;
      const destino = ficha.recursos.destino ?? { rotulo: "Pontos de Destino", atual: 0, max: 0 };
      ficha.recursos.destino = { ...destino, atual: destino.atual + 1, max: nova + FOLGA_DESTINO };
      partes.push(`recarga sobe para ${nova}`);
    }

    const curadas = removerConsequencias(ficha, "moderada");
    if (curadas.length) partes.push(`consequência moderada curada (${curadas.join("; ")})`);
    return {
      ficha,
      resumo: `${ficha.nome} alcançou um marco significativo (marco ${ficha.nivel}): ${partes.join(", ") || "nada a melhorar, já é lendário"}. Também pode trocar duas abordagens de lugar, renomear um aspecto ou trocar uma façanha.`,
    };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    ficha.pv = ficha.pvMax;
    ficha.recursos.estresse = { rotulo: "Estresse", atual: ficha.pvMax, max: ficha.pvMax };
    ficha.condicoes = ficha.condicoes.filter((c) => !/^(inconsciente|tirad[oa] de acao)$/.test(normalizar(c)));
    if (tipo === "curto") return { ficha, resumo: `${ficha.nome} respirou fundo depois da cena: caixas de estresse limpas.` };

    const curadas = removerConsequencias(ficha, "suave");
    const destino = ficha.recursos.destino;
    const r = recarga(ficha);
    let recarregou = "";
    if (destino && destino.atual < r) {
      destino.atual = r;
      recarregou = ` Pontos de Destino recarregados para ${r}.`;
    }
    return {
      ficha,
      resumo: `${ficha.nome} descansou entre sessões: estresse limpo${curadas.length ? `, consequência suave curada (${curadas.join("; ")})` : ""}.${recarregou}`,
    };
  },
};
