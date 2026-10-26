import "server-only";
import { somar } from "../dados";
import { acharPorNome, clonar, fichaBase, limitar, normalizar, sinal, testeD20 } from "./comum";
import type { BlocoFicha, ClasseDef, Ficha, PedidoTeste, ResultadoTeste, Sistema } from "./tipos";

// Sistema do modo história: regras leves e escondidas do jogador. Perícias com bônus direto, d20 + bônus contra
// uma dificuldade, Vida, Alma (para magia), ouro e reputação. Quem quiser regra de verdade usa o modo avançado.

const PERICIAS = [
  { id: "luta", nome: "Luta", descricao: "espada, machado, punho" },
  { id: "pontaria", nome: "Pontaria", descricao: "arco, besta, faca arremessada" },
  { id: "atletismo", nome: "Atletismo", descricao: "força, escalada, natação" },
  { id: "acrobacia", nome: "Acrobacia", descricao: "equilíbrio, saltos, esquivas" },
  { id: "furtividade", nome: "Furtividade", descricao: "andar sem ser visto" },
  { id: "maos-leves", nome: "Mãos Leves", descricao: "bolsos alheios, fechaduras" },
  { id: "percepcao", nome: "Percepção", descricao: "notar, ouvir, desconfiar" },
  { id: "investigacao", nome: "Investigação", descricao: "pistas, documentos, deduções" },
  { id: "persuasao", nome: "Persuasão", descricao: "convencer com jeito" },
  { id: "enganacao", nome: "Enganação", descricao: "mentir bem" },
  { id: "intimidacao", nome: "Intimidação", descricao: "convencer com medo" },
  { id: "barganha", nome: "Barganha", descricao: "preço, troca, suborno" },
  { id: "sobrevivencia", nome: "Sobrevivência", descricao: "rastros, mato, tempo" },
  { id: "medicina", nome: "Medicina", descricao: "curar, diagnosticar, envenenar" },
  { id: "conhecimento", nome: "Conhecimento", descricao: "história, línguas, monstros" },
  { id: "magia", nome: "Magia", descricao: "lançar e entender feitiços" },
  { id: "atuacao", nome: "Atuação", descricao: "música, disfarce, espetáculo" },
  { id: "vontade", nome: "Vontade", descricao: "resistir a medo, dor e encantos" },
];

type ClasseHistoria = ClasseDef & {
  vida: number;
  /** pontos de Alma no 1º nível (0 = não usa magia) */
  alma: number;
  bonus: Record<string, number>;
  /** emoji usado como ícone nos cartões de classe */
  icone: string;
};

const CLASSES: ClasseHistoria[] = [
  {
    id: "guerreiro", nome: "Guerreiro", icone: "⚔️", papel: "combatente", vida: 14, alma: 0,
    descricao: "Resolve na lâmina o que os outros resolvem na conversa. E costuma sobrar mais gente de pé.",
    bonus: { luta: 4, atletismo: 3, intimidacao: 2, vontade: 1, percepcao: 1 },
    equipamento: ["espada longa", "escudo amassado", "cota de malha", "cantil de cerveja choca"],
  },
  {
    id: "ladino", nome: "Ladino", icone: "🗝️", papel: "especialista", vida: 10, alma: 0,
    descricao: "Entra onde não foi chamado e sai com o que não era dele.",
    bonus: { furtividade: 4, "maos-leves": 4, enganacao: 2, acrobacia: 2, percepcao: 1 },
    equipamento: ["duas adagas", "gazuas", "capa escura", "dado viciado"],
  },
  {
    id: "mago", nome: "Mago", icone: "📜", papel: "conjurador", vida: 7, alma: 8,
    descricao: "Passou a juventude lendo grimórios e a vida adulta explicando por que a torre pegou fogo.",
    bonus: { magia: 4, conhecimento: 4, investigacao: 2, vontade: 2 },
    equipamento: ["cajado", "grimório com páginas chamuscadas", "bolsa de componentes"],
  },
  {
    id: "cacador", nome: "Caçador", icone: "🏹", papel: "combatente", vida: 11, alma: 0,
    descricao: "Lê rastro como quem lê jornal. Conversa melhor com lobo do que com gente.",
    bonus: { pontaria: 4, sobrevivencia: 4, percepcao: 3, furtividade: 1 },
    equipamento: ["arco longo", "aljava", "faca de esfolar", "armadilha de urso"],
  },
  {
    id: "bardo", nome: "Bardo", icone: "🎻", papel: "suporte", vida: 9, alma: 4,
    descricao: "Abre portas com uma canção e fecha bocas com uma rima. Deve dinheiro em três reinos.",
    bonus: { atuacao: 4, persuasao: 4, enganacao: 2, barganha: 2, magia: 1 },
    equipamento: ["alaúde", "rapieira", "roupas chamativas", "cartas de amor alheias"],
  },
  {
    id: "clerigo", nome: "Clérigo", icone: "✨", papel: "suporte", vida: 11, alma: 6,
    descricao: "Fala com um deus. Às vezes o deus responde, o que é bem pior.",
    bonus: { medicina: 4, vontade: 3, magia: 3, persuasao: 1, luta: 1 },
    equipamento: ["maça", "símbolo sagrado", "ataduras", "vela benta"],
  },
  {
    id: "barbaro", nome: "Bárbaro", icone: "🪓", papel: "combatente", vida: 16, alma: 0,
    descricao: "Não sabe ler, não sabe esperar e não sabe perder. A última parte é a que importa.",
    bonus: { luta: 4, atletismo: 4, intimidacao: 3, sobrevivencia: 1 },
    equipamento: ["machado grande", "pele de urso", "colar de dentes"],
  },
  {
    id: "necromante", nome: "Necromante", icone: "💀", papel: "conjurador", vida: 8, alma: 8,
    descricao: "Acha os mortos melhores ouvintes que os vivos. Os vizinhos discordam.",
    bonus: { magia: 4, conhecimento: 3, intimidacao: 2, medicina: 2, vontade: 1 },
    equipamento: ["foice curta", "crânio de estimação", "tomo de capa de couro duvidoso"],
  },
  {
    id: "paladino", nome: "Paladino", icone: "🛡️", papel: "combatente", vida: 13, alma: 3,
    descricao: "Fez um juramento solene. Agora precisa cumprir, o que é a parte chata.",
    bonus: { luta: 3, vontade: 3, persuasao: 2, medicina: 2, atletismo: 1 },
    equipamento: ["martelo de guerra", "escudo com brasão", "armadura de placas meio enferrujada"],
  },
  {
    id: "mercenario", nome: "Mercenário", icone: "💰", papel: "especialista", vida: 12, alma: 0,
    descricao: "Leal até o último centavo. Depois do último centavo, a gente conversa.",
    bonus: { luta: 3, barganha: 3, intimidacao: 2, pontaria: 2, percepcao: 1 },
    equipamento: ["besta de mão", "espada curta", "contrato rasgado", "bolsa de moedas furada"],
  },
];

const ORIGENS = [
  { id: "humano", nome: "Humano", descricao: "Teimoso, curioso e em todo lugar." },
  { id: "elfo", nome: "Elfo", descricao: "Orelhas pontudas, paciência infinita, arrogância idem." },
  { id: "anao", nome: "Anão", descricao: "Baixo, barbudo e mais duro que pedra." },
  { id: "meio-orc", nome: "Meio-orc", descricao: "Presas pequenas, coração grande, punho maior ainda." },
  { id: "halfling", nome: "Halfling", descricao: "Pequeno, sortudo e sempre com fome." },
  { id: "tiefling", nome: "Tiefling", descricao: "Chifres, rabo e um bisavô que ninguém comenta." },
];

const BONUS_ORIGEM: Record<string, Record<string, number>> = {
  humano: { persuasao: 1, barganha: 1 },
  elfo: { percepcao: 1, magia: 1 },
  anao: { vontade: 1, atletismo: 1 },
  "meio-orc": { intimidacao: 1, luta: 1 },
  halfling: { furtividade: 1, acrobacia: 1 },
  tiefling: { enganacao: 1, magia: 1 },
};

export const EIXOS_REPUTACAO = ["bravura", "honra", "misericordia", "generosidade", "justica", "lealdade"] as const;
const NOMES_EIXOS: Record<string, string> = {
  bravura: "Bravura",
  honra: "Honra",
  misericordia: "Misericórdia",
  generosidade: "Generosidade",
  justica: "Justiça",
  lealdade: "Lealdade",
};

function classeDe(f: Ficha): ClasseHistoria {
  return CLASSES.find((c) => c.id === f.classe) ?? CLASSES[0];
}

/** Bônus de proficiência por nível (sobe devagar: a história importa mais que os números). */
function bonusNivel(nivel: number) {
  return Math.floor((Math.max(1, nivel) - 1) / 4);
}

function bonusPericia(f: Ficha, id: string) {
  return (f.pericias[id] ?? 0) + bonusNivel(f.nivel);
}

function reputacao(f: Ficha): Record<string, number> {
  return (f.extras.reputacao as Record<string, number> | undefined) ?? Object.fromEntries(EIXOS_REPUTACAO.map((e) => [e, 0]));
}

function interpretar(f: Ficha, teste: string): { rotulo: string; bonus: number } {
  const nome = normalizar(teste);
  if (/^(ataque|atacar|golpe)/.test(nome)) {
    const melhor = bonusPericia(f, "luta") >= bonusPericia(f, "pontaria") ? "luta" : "pontaria";
    return { rotulo: melhor === "luta" ? "Luta" : "Pontaria", bonus: bonusPericia(f, melhor) };
  }
  if (/^(feiti|conjur|magia)/.test(nome)) return { rotulo: "Magia", bonus: bonusPericia(f, "magia") };
  if (/^iniciativa/.test(nome)) return { rotulo: "Iniciativa", bonus: Math.max(bonusPericia(f, "acrobacia"), bonusPericia(f, "percepcao")) };
  if (/^(resist|salva)/.test(nome)) return { rotulo: "Vontade", bonus: bonusPericia(f, "vontade") };
  const p = acharPorNome(PERICIAS, teste);
  if (p) return { rotulo: p.nome, bonus: bonusPericia(f, p.id) };
  return { rotulo: teste, bonus: bonusNivel(f.nivel) };
}

const XP_NIVEL = (n: number) => (n <= 1 ? 0 : 100 * ((n - 1) * n) / 2);

export const historia: Sistema = {
  id: "historia",
  nome: "Modo História",
  nomeCurto: "História",
  descricao: "Regras leves e escondidas: você descreve o que faz, o mestre pede um teste quando importa e você rola o d20.",
  licenca: "Regras próprias da Taverna do Velho Mestre",
  dadoPrincipal: "d20",
  pronto: true,
  rotulos: { ancestralidade: "Origem", classe: "Classe", nivel: "Nível", defesa: "Defesa", dinheiro: "moedas", pv: "Vida" },
  atributos: [],
  pericias: PERICIAS,
  classes: CLASSES.map(({ vida, alma, bonus, ...c }) => ({
    ...c,
    pvBase: vida,
    pericias: Object.keys(bonus),
    atributoChave: alma ? "magia" : undefined,
  })),
  ancestralidades: ORIGENS,
  metodosAtributos: [],
  limitesAtributos: { min: 0, max: 0 },
  periciasEscolhiveis: 0,
  nivelMaximo: 20,
  testesSugeridos: ["Luta", "Pontaria", "Furtividade", "Percepção", "Persuasão", "Intimidação", "Barganha", "Investigação", "Magia", "Vontade"],
  regrasParaMestre: `Sistema: Modo História (regras leves; o jogador não vê números a não ser no dado).
- Teste = d20 + bônus da perícia contra uma Dificuldade (CD): 8 fácil, 12 médio, 15 difícil, 18 muito difícil, 22 heroico.
- Perícias: ${PERICIAS.map((p) => p.nome).join(", ")}. "Ataque" usa a melhor entre Luta e Pontaria; "Magia" para feitiços (gasta Alma com alterar_ficha recursos {"alma": -1 a -3}).
- 20 natural é um sucesso brilhante (algo extra de bom acontece); 1 natural é um desastre com consequência.
- Perigo: em teste marcado como perigoso, a falha custa Vida (aplique com alterar_ficha: 1d4 leve, 1d6 sério, 2d6 grave).
- Inimigos comuns causam 1d4 a 1d8 de dano; Vida 0 = caído e morrendo, não morto (dê uma chance dramática).
- Reputação (bravura, honra, misericórdia, generosidade, justiça, lealdade) muda com ajustar_reputacao quando uma escolha moral pesa.
- XP: 25 a 100 por cena importante, missão ou vitória (conceder_xp). Subir de nível dá mais Vida e Alma.
COMO MESTRAR O MODO HISTÓRIA
- Números ficam fora do texto (o jogador vê só o dado): a CD vira "a parede é lisa e molhada", Vida baixa vira "a respiração curta e o sangue na manga", Alma gasta vira "a magia arranha a garganta".
- Sem números não quer dizer sem perigo: deixe claro o que está em jogo ANTES do dado (perigoso quando a falha machuca) e cumpra depois. Falha muda a história: a porta fecha, o aliado se fere, o vilão foge com a carta.
- Escolhas valem tanto quanto testes: quem salvar, em quem confiar, o que sacrificar. Dilemas com custo dos dois lados; a reputação registra quem o personagem está virando, e os NPCs reagem a ela.
- Capítulos: cada cena tem um objetivo claro e termina num gancho; corte o tédio e abra o próximo capítulo com atualizar_cena (titulo).
- Combate curto e cinematográfico: dois ou três golpes decisivos, inimigos que fogem, se rendem ou mudam de lado; nada de contabilidade de rodadas na narração.
- Vida 0 é virada (resgate, preço, cicatriz, captura), não fim automático.`,

  atributosIniciais: () => ({}),

  criarFicha(entrada) {
    const classe = CLASSES.find((c) => c.id === entrada.classe) ?? CLASSES[0];
    const origem = ORIGENS.find((o) => o.id === entrada.ancestralidade) ?? ORIGENS[0];
    const f = fichaBase("historia", entrada.nome);
    f.classe = classe.id;
    f.ancestralidade = origem.id;
    for (const p of PERICIAS) f.pericias[p.id] = 0;
    for (const [id, v] of Object.entries(classe.bonus)) f.pericias[id] = v;
    for (const [id, v] of Object.entries(BONUS_ORIGEM[origem.id] ?? {})) f.pericias[id] = (f.pericias[id] ?? 0) + v;
    f.pvMax = classe.vida;
    f.pv = classe.vida;
    f.defesa = 0;
    if (classe.alma) f.recursos.alma = { rotulo: "Alma", atual: classe.alma, max: classe.alma };
    f.inventario = [...(classe.equipamento ?? []), "pão duro", "pederneira"];
    f.dinheiro = 15;
    f.historia = entrada.historia ?? "";
    f.extras = { ...(entrada.extras ?? {}), reputacao: Object.fromEntries(EIXOS_REPUTACAO.map((e) => [e, 0])) };
    return f;
  },

  resolverTeste(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
    const { rotulo, bonus } = interpretar(ficha, pedido.teste);
    return testeD20({ sistema: "historia", ficha, pedido, rotulo, bonus, criticos: "dnd" });
  },

  descreverParaMestre(f) {
    const classe = classeDe(f);
    const origem = ORIGENS.find((o) => o.id === f.ancestralidade);
    const pericias = PERICIAS.filter((p) => (f.pericias[p.id] ?? 0) > 0)
      .map((p) => `${p.nome} ${sinal(bonusPericia(f, p.id))}`)
      .join(", ");
    const rep = Object.entries(reputacao(f))
      .filter(([, v]) => v)
      .map(([k, v]) => `${NOMES_EIXOS[k] ?? k} ${sinal(v)}`)
      .join(", ");
    const extras = f.extras as { sexo?: string; aparencia?: string };
    return `${f.nome} — ${origem?.nome ?? f.ancestralidade} ${classe.nome}, nível ${f.nivel} (XP ${f.xp})${extras.sexo ? `, ${extras.sexo}` : ""}
Vida ${f.pv}/${f.pvMax}${f.recursos.alma ? ` · Alma ${f.recursos.alma.atual}/${f.recursos.alma.max}` : ""} · ${f.dinheiro} moedas
Perícias: ${pericias}
Inventário: ${f.inventario.join(", ") || "nada"}
Condições: ${f.condicoes.join(", ") || "nenhuma"}${rep ? `\nReputação: ${rep}` : ""}${extras.aparencia ? `\nAparência: ${extras.aparencia}` : ""}${f.historia ? `\nHistória: ${f.historia}` : ""}`;
  },

  blocosFicha(f): BlocoFicha[] {
    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "Vida", atual: f.pv, max: f.pvMax, cor: "vida" },
          ...(f.recursos.alma ? [{ rotulo: "Alma", atual: f.recursos.alma.atual, max: f.recursos.alma.max, cor: "magia" as const }] : []),
        ],
      },
      { tipo: "grade", itens: [{ rotulo: "Moedas", valor: String(f.dinheiro) }, { rotulo: "Nível", valor: String(f.nivel) }, { rotulo: "XP", valor: String(f.xp) }] },
      {
        tipo: "etiquetas",
        titulo: "Perícias",
        itens: PERICIAS.filter((p) => (f.pericias[p.id] ?? 0) > 0).map((p) => `${p.nome} ${sinal(bonusPericia(f, p.id))}`),
      },
      { tipo: "lista", titulo: "Inventário", itens: f.inventario },
      {
        tipo: "grade",
        titulo: "Reputação",
        itens: Object.entries(reputacao(f)).map(([k, v]) => ({ rotulo: NOMES_EIXOS[k] ?? k, valor: sinal(v) })),
      },
    ];
    if (f.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: f.condicoes });
    if (f.historia) blocos.push({ tipo: "texto", titulo: "História", texto: f.historia });
    return blocos;
  },

  xpParaNivel(nivel) {
    return nivel > 20 ? null : XP_NIVEL(nivel);
  },

  subirNivel(original) {
    const f = clonar(original);
    const classe = classeDe(f);
    f.nivel = limitar(f.nivel + 1, 1, 20);
    const ganho = Math.max(2, Math.round(classe.vida / 3));
    f.pvMax += ganho;
    f.pv += ganho;
    let extra = "";
    if (f.recursos.alma) {
      f.recursos.alma.max += 2;
      f.recursos.alma.atual += 2;
      extra = " e +2 de Alma";
    }
    // a cada 2 níveis, a perícia principal da classe melhora
    if (f.nivel % 2 === 0) {
      const principal = Object.entries(classe.bonus).sort((a, b) => b[1] - a[1])[(f.nivel / 2) % Object.keys(classe.bonus).length]?.[0];
      if (principal) {
        f.pericias[principal] = (f.pericias[principal] ?? 0) + 1;
        extra += `, e ${PERICIAS.find((p) => p.id === principal)?.nome ?? principal} melhorou`;
      }
    }
    return { ficha: f, resumo: `${f.nome} chegou ao nível ${f.nivel}: +${ganho} de Vida${extra}.` };
  },

  descansar(original, tipo) {
    const f = clonar(original);
    if (tipo === "longo") {
      f.pv = f.pvMax;
      for (const r of Object.values(f.recursos)) r.atual = r.max;
      f.condicoes = f.condicoes.filter((c) => !/inconsciente|exaust|cansad/.test(normalizar(c)));
      return { ficha: f, resumo: `${f.nome} dormiu de verdade: Vida e Alma cheias.` };
    }
    const cura = somar(1, 6).total + 1;
    f.pv = Math.min(f.pvMax, f.pv + cura);
    if (f.recursos.alma) f.recursos.alma.atual = Math.min(f.recursos.alma.max, f.recursos.alma.atual + 1);
    return { ficha: f, resumo: `${f.nome} recuperou o fôlego: +${cura} de Vida.` };
  },
};

/** Muda um eixo de reputação (−10 a +10). Usado pela ferramenta ajustar_reputacao. */
export function ajustarReputacao(original: Ficha, eixo: string, delta: number): { ficha: Ficha; eixo: string; valor: number } {
  const f = clonar(original);
  const chave = EIXOS_REPUTACAO.find((e) => normalizar(e) === normalizar(eixo) || normalizar(NOMES_EIXOS[e]) === normalizar(eixo));
  if (!chave) throw new Error(`Eixo de reputação desconhecido: ${eixo}. Use: ${EIXOS_REPUTACAO.join(", ")}.`);
  const rep = { ...reputacao(f) };
  rep[chave] = limitar((rep[chave] ?? 0) + delta, -10, 10);
  f.extras = { ...f.extras, reputacao: rep };
  return { ficha: f, eixo: NOMES_EIXOS[chave], valor: rep[chave] };
}
