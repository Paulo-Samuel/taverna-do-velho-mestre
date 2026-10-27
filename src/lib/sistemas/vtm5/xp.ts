import "server-only";
import { clonar, limitar, normalizar } from "../comum";
import type { Ficha } from "../tipos";
import { conhecimentosDe, mudancasPotencia, sincronizar } from "../vtm5";
import { ATRIBUTOS, CATEGORIAS_ATRIBUTOS, CATEGORIAS_PERICIAS, CLAS, DISCIPLINAS, DISCIPLINAS_RESTRITAS, IDADES, PERICIAS } from "./dados";
import { disciplinasDe, listaExtra, potenciaDe } from "./testes";

// Gastar XP no Vampiro V5: no V5 não há nível, o XP compra pontos um de cada vez (de ●● para ●●●● são duas compras).
// Tabela do livro básico: atributo novo nível ×5 · perícia novo nível ×3 · especialidade 3 · disciplina do clã ×5, de fora ×7,
// Caitiff ×6 · ritual/fórmula nível ×3 · vantagem 3 por ponto · Potência de Sangue novo nível ×10 (teto pela Geração).
// Tudo aqui é puro (recebe a ficha, devolve cópia); a rota /personagens/[pid]/xp salva e avisa a mesa.
// O histórico fica em extras.gastosXp; só a última compra pode ser desfeita, e só se a ficha ainda bate com ela.

export type TipoCompra = "atributo" | "pericia" | "especialidade" | "disciplina" | "ritual" | "formula" | "vantagem" | "potencia";

/** Pedido de compra. alvo: id do atributo/perícia/disciplina, texto da vantagem ("recursos" = Recursos); nome/foco/nivel para itens novos. */
export type CompraXp = { tipo: TipoCompra; alvo?: string; nome?: string; foco?: string; nivel?: number; /** valor que o jogador viu (evita compra dupla) */ de?: number };

export type GastoXp = {
  data: string;
  tipo: TipoCompra;
  alvo?: string;
  /** texto legível: "Celeridade ●● → ●●●" */
  item: string;
  de: number;
  para: number;
  custo: number;
  xpDepois: number;
  /** listas de texto (vantagens, especialidades): como estava e como ficou */
  textoAntes?: string;
  textoDepois?: string;
};

export type ItemXp = {
  tipo: TipoCompra;
  alvo: string;
  nome: string;
  grupo?: string;
  atual: number;
  max: number;
  /** custo do próximo ponto; null = já está no máximo */
  custo: number | null;
  cabe: boolean;
  /** por que não dá (tooltip do botão desabilitado) */
  motivo?: string;
  /** dá, mas combine com o mestre */
  aviso?: string;
  /** só para listar (especialidade já comprada, ritual conhecido): sem botão */
  soLeitura?: boolean;
};

export type NovoXp =
  | { tipo: "especialidade"; custo: number; pericias: { id: string; nome: string; pode: boolean; motivo?: string }[] }
  | { tipo: "vantagem"; custo: number }
  | { tipo: "ritual" | "formula"; custoPorNivel: number; nivelMax: number };

export type SecaoXp = { id: string; titulo: string; ajuda?: string; itens: ItemXp[]; novo?: NovoXp };

export type OfertaXp = {
  xp: number;
  secoes: SecaoXp[];
  ultima: { item: string; custo: number; podeDesfazer: boolean; motivo?: string } | null;
  historico: GastoXp[];
};

export const CUSTOS = {
  atributo: (novo: number) => novo * 5,
  pericia: (novo: number) => novo * 3,
  especialidade: () => 3,
  disciplinaCla: (novo: number) => novo * 5,
  disciplinaFora: (novo: number) => novo * 7,
  disciplinaCaitiff: (novo: number) => novo * 6,
  ritual: (nivel: number) => nivel * 3,
  formula: (nivel: number) => nivel * 3,
  vantagem: () => 3,
  potencia: (novo: number) => novo * 10,
};

/** Teto da Potência de Sangue pela Geração (V5): 10ª–11ª → 4, 12ª–13ª → 3, 14ª+ (sangue-ralo) → 0. */
export function potenciaMaxima(geracao: number): number {
  if (geracao >= 14) return 0;
  if (geracao >= 12) return 3;
  if (geracao >= 10) return 4;
  if (geracao <= 4) return 10;
  return 14 - geracao; // 5ª → 9 ... 9ª → 5
}

const HISTORICO_MAX = 50;
const PONTOS_MAX = 5;
const pontos = (n: number) => (n > 0 ? "●".repeat(n) : "—");
const nomeDe = (lista: { id: string; nome: string }[], id: string) => lista.find((x) => x.id === id)?.nome ?? id;
const claDe = (ficha: Ficha) => CLAS.find((c) => c.id === ficha.classe) ?? CLAS[0];
const geracaoDe = (ficha: Ficha) => (typeof ficha.extras.geracao === "number" ? ficha.extras.geracao : (IDADES.find((i) => i.id === ficha.antecedente) ?? IDADES[1]).geracao);

export function gastosDe(ficha: Ficha): GastoXp[] {
  const v = ficha.extras.gastosXp;
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object" && typeof (x as GastoXp).custo === "number") as GastoXp[]) : [];
}

// ---------- vantagens em texto ("Refúgio ●●") ----------

/** Vantagem com exatamente uma fileira de ●: nome sem os pontos e quantos pontos. Outras ("Fama ●●● ou Rebanho ●●●") não dá para somar. */
function lerVantagem(texto: string): { nome: string; pontos: number } | null {
  const fileiras = texto.match(/●+/g);
  if (!fileiras || fileiras.length !== 1) return null;
  return { nome: texto.replace(/\s*●+\s*/, " ").replace(/\s+/g, " ").trim(), pontos: fileiras[0].length };
}
const ehRecursos = (texto: string) => normalizar(texto).startsWith("recursos");

// ---------- disciplinas ----------

type RegraDisciplina = { custo: (novo: number) => number; rotulo: string; bloqueio?: string; aviso?: string };

function regraDisciplina(ficha: Ficha, id: string): RegraDisciplina {
  const cla = claDe(ficha);
  const donos = DISCIPLINAS_RESTRITAS[id];
  if (id === "alquimia" && cla.id !== "sangue_ralo") return { custo: CUSTOS.disciplinaFora, rotulo: "fora do clã", bloqueio: "Alquimia é coisa de Sangue-ralo: seu sangue é grosso demais para isso." };
  if (cla.id === "sangue_ralo") {
    if (id === "alquimia") return { custo: CUSTOS.disciplinaCla, rotulo: "do clã" };
    return { custo: CUSTOS.disciplinaFora, rotulo: "fora do clã", bloqueio: "Sangue-ralo não aprende disciplina de sangue grosso com XP (só com o mérito Afinidade de Disciplina: combine com o mestre)." };
  }
  const aviso = "Fora do clã: pela regra, precisa ter provado o sangue de quem tem a disciplina (ou um mentor). Combine com o mestre.";
  const restrita = donos && !donos.includes(cla.id) ? ` ${nomeDe(DISCIPLINAS, id)} é segredo de ${donos.map((d) => nomeDe(CLAS, d)).join(" e ")}: espere perguntas.` : "";
  if (cla.id === "caitiff") return { custo: CUSTOS.disciplinaCaitiff, rotulo: "Caitiff", ...(restrita ? { aviso: `${aviso}${restrita}` } : {}) };
  if (cla.disciplinas.includes(id)) return { custo: CUSTOS.disciplinaCla, rotulo: "do clã" };
  return { custo: CUSTOS.disciplinaFora, rotulo: "fora do clã", aviso: `${aviso}${restrita}` };
}

// ---------- avaliação de uma compra ----------

type Avaliacao = { nome: string; de: number; para: number; custo: number; aviso?: string; aplicar: (f: Ficha) => Partial<GastoXp> | void };
type Recusa = { erro: string };

const tirarDots = (n: number, max: number, rotulo: string): string | null => (n >= max ? `${rotulo} já está no máximo (${max}).` : null);

function avaliar(ficha: Ficha, c: CompraXp): Avaliacao | Recusa {
  switch (c.tipo) {
    case "atributo": {
      const id = c.alvo ?? "";
      if (!ATRIBUTOS.some((a) => a.id === id)) return { erro: "Atributo desconhecido." };
      const de = ficha.atributos[id] ?? 1;
      const nome = nomeDe(ATRIBUTOS, id);
      const cheio = tirarDots(de, PONTOS_MAX, nome);
      if (cheio) return { erro: cheio };
      return { nome, de, para: de + 1, custo: CUSTOS.atributo(de + 1), aplicar: (f) => void (f.atributos[id] = de + 1) };
    }
    case "pericia": {
      const id = c.alvo ?? "";
      if (!PERICIAS.some((p) => p.id === id)) return { erro: "Perícia desconhecida." };
      const de = ficha.pericias[id] ?? 0;
      const nome = nomeDe(PERICIAS, id);
      const cheio = tirarDots(de, PONTOS_MAX, nome);
      if (cheio) return { erro: cheio };
      return { nome, de, para: de + 1, custo: CUSTOS.pericia(de + 1), aplicar: (f) => void (f.pericias[id] = de + 1) };
    }
    case "disciplina": {
      const id = c.alvo ?? "";
      if (!DISCIPLINAS.some((x) => x.id === id)) return { erro: "Disciplina desconhecida." };
      const de = disciplinasDe(ficha)[id] ?? 0;
      const nome = nomeDe(DISCIPLINAS, id);
      const regra = regraDisciplina(ficha, id);
      if (regra.bloqueio) return { erro: regra.bloqueio };
      const cheio = tirarDots(de, PONTOS_MAX, nome);
      if (cheio) return { erro: cheio };
      return {
        nome,
        de,
        para: de + 1,
        custo: regra.custo(de + 1),
        aviso: de === 0 ? regra.aviso : undefined,
        aplicar: (f) => void (f.extras.disciplinas = { ...disciplinasDe(f), [id]: de + 1 }),
      };
    }
    case "potencia": {
      const de = potenciaDe(ficha);
      if (claDe(ficha).id === "sangue_ralo") return { erro: "Sangue-ralo não compra Potência de Sangue: o sangue é ralo justamente por isso." };
      const teto = potenciaMaxima(geracaoDe(ficha));
      if (de >= teto) return { erro: `Na ${geracaoDe(ficha)}ª geração a Potência de Sangue para em ${teto}. Só diablerie (ou séculos de torpor) mudam isso.` };
      return { nome: "Potência de Sangue", de, para: de + 1, custo: CUSTOS.potencia(de + 1), aplicar: (f) => void (f.nivel = de + 1) };
    }
    case "vantagem": {
      // Recursos mora em ficha.dinheiro (0 a 5)
      if (c.alvo === "recursos") {
        const de = limitar(ficha.dinheiro, 0, 5);
        const cheio = tirarDots(de, PONTOS_MAX, "Recursos");
        if (cheio) return { erro: cheio };
        return { nome: "Recursos", de, para: de + 1, custo: CUSTOS.vantagem(), aplicar: (f) => void (f.dinheiro = de + 1) };
      }
      const vantagens = listaExtra(ficha, "vantagens");
      if (c.alvo) {
        const i = vantagens.indexOf(c.alvo);
        if (i < 0) return { erro: "Essa vantagem não está na ficha." };
        const v = lerVantagem(c.alvo);
        if (!v) return { erro: "Essa vantagem tem pontos divididos: peça ao mestre para separar antes." };
        const cheio = tirarDots(v.pontos, PONTOS_MAX, v.nome);
        if (cheio) return { erro: cheio };
        const depois = c.alvo.replace(/●+/, "●".repeat(v.pontos + 1));
        return {
          nome: v.nome,
          de: v.pontos,
          para: v.pontos + 1,
          custo: CUSTOS.vantagem(),
          aplicar: (f) => {
            const lista = listaExtra(f, "vantagens");
            lista[lista.indexOf(c.alvo!)] = depois;
            f.extras.vantagens = lista;
            return { alvo: depois, textoAntes: c.alvo, textoDepois: depois };
          },
        };
      }
      const nome = (c.nome ?? "").replace(/●/g, "").replace(/\s+/g, " ").trim();
      if (nome.length < 2 || nome.length > 60) return { erro: "Dê um nome à vantagem (2 a 60 letras): “Refúgio”, “Contatos (polícia)”." };
      if (ehRecursos(nome)) return { erro: "Recursos já está na lista: use o + dela." };
      if (vantagens.some((x) => normalizar(lerVantagem(x)?.nome ?? x) === normalizar(nome))) return { erro: "Você já tem essa vantagem: use o + dela." };
      const texto = `${nome} ●`;
      return {
        nome,
        de: 0,
        para: 1,
        custo: CUSTOS.vantagem(),
        aviso: "Vantagem nova pede motivo na história (quem é o contato, onde fica o refúgio). Combine com o mestre.",
        aplicar: (f) => {
          f.extras.vantagens = [...listaExtra(f, "vantagens"), texto];
          return { alvo: texto, textoDepois: texto };
        },
      };
    }
    case "especialidade": {
      const id = c.alvo ?? "";
      if (!PERICIAS.some((p) => p.id === id)) return { erro: "Escolha a perícia da especialidade." };
      const foco = (c.foco ?? "").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
      if (foco.length < 2 || foco.length > 40) return { erro: "Diga o foco da especialidade (2 a 40 letras): “sedução”, “fechaduras”." };
      const pericia = nomeDe(PERICIAS, id);
      const motivo = motivoEspecialidade(ficha, id);
      if (motivo) return { erro: motivo };
      const texto = `${pericia} (${foco})`;
      if (listaExtra(ficha, "especialidades").some((e) => normalizar(e) === normalizar(texto))) return { erro: "Você já tem essa especialidade." };
      return {
        nome: texto,
        de: 0,
        para: 1,
        custo: CUSTOS.especialidade(),
        aplicar: (f) => {
          f.extras.especialidades = [...listaExtra(f, "especialidades"), texto];
          return { alvo: texto, textoDepois: texto };
        },
      };
    }
    case "ritual":
    case "formula": {
      const disciplina = c.tipo === "ritual" ? "feiticaria" : "alquimia";
      const campo = c.tipo === "ritual" ? "rituais" : "formulas";
      const rotulo = c.tipo === "ritual" ? "ritual" : "fórmula";
      const nivelDisc = disciplinasDe(ficha)[disciplina] ?? 0;
      if (nivelDisc < 1) return { erro: `Sem ${nomeDe(DISCIPLINAS, disciplina)}, nada de ${rotulo}.` };
      const nivel = Math.round(Number(c.nivel));
      if (!Number.isFinite(nivel) || nivel < 1 || nivel > 5) return { erro: `Nível do ${rotulo} de 1 a 5.` };
      if (nivel > nivelDisc) return { erro: `${rotulo[0].toUpperCase()}${rotulo.slice(1)} de nível ${nivel} pede ${nomeDe(DISCIPLINAS, disciplina)} ${pontos(nivel)}.` };
      const nome = (c.nome ?? "").replace(/\s+/g, " ").trim();
      if (nome.length < 2 || nome.length > 60) return { erro: `Dê um nome ao ${rotulo} (2 a 60 letras).` };
      if (conhecimentosDe(ficha, campo).some((r) => normalizar(r.nome) === normalizar(nome))) return { erro: `Você já conhece esse ${rotulo}.` };
      return {
        nome: `${nome} (${c.tipo === "ritual" ? "ritual" : "fórmula"})`,
        de: 0,
        para: nivel,
        custo: c.tipo === "ritual" ? CUSTOS.ritual(nivel) : CUSTOS.formula(nivel),
        aplicar: (f) => {
          f.extras[campo] = [...conhecimentosDe(f, campo), { nome, nivel }];
          return { alvo: nome };
        },
      };
    }
  }
  return { erro: "Compra desconhecida." };
}

/** Por que não dá para comprar especialidade nesta perícia (null = dá). Pela regra, especialidades ≤ pontos na perícia. */
function motivoEspecialidade(ficha: Ficha, id: string): string | null {
  const pontosPericia = ficha.pericias[id] ?? 0;
  const nome = nomeDe(PERICIAS, id);
  if (pontosPericia < 1) return `Especialidade pede pelo menos ● em ${nome}.`;
  const ja = listaExtra(ficha, "especialidades").filter((e) => normalizar(e.split("(")[0]) === normalizar(nome)).length;
  if (ja >= pontosPericia) return `${nome} ${pontos(pontosPericia)} só comporta ${pontosPericia} especialidade(s): suba a perícia antes.`;
  return null;
}

/** Texto do gasto: "Celeridade ●● → ●●●", "Especialidade nova: Lábia (sedução)", "Ritual nível ●●: Sangue Ardente". */
function textoGasto(c: CompraXp, a: Avaliacao): string {
  if (c.tipo === "especialidade") return `especialidade nova: ${a.nome}`;
  if (c.tipo === "ritual" || c.tipo === "formula") return `${c.tipo === "ritual" ? "ritual" : "fórmula"} ${pontos(a.para)}: ${a.nome.replace(/ \((ritual|fórmula)\)$/, "")}`;
  if (c.tipo === "potencia") return `Potência de Sangue ${a.de} → ${a.para}`;
  if (c.tipo === "vantagem" && a.de === 0) return `vantagem nova: ${a.nome} ●`;
  return `${a.nome} ${pontos(a.de)} → ${pontos(a.para)}`;
}

/** Muda a ficha e acerta os derivados: subir Vigor dá uma caixa de Saúde limpa, Autocontrole/Determinação dão Força de Vontade cheia. */
function comDerivados(ficha: Ficha, mexer: () => void) {
  sincronizar(ficha);
  const pv0 = ficha.pv;
  const pvMax0 = ficha.pvMax;
  const vontade0 = ficha.recursos.vontade.atual;
  const vontadeMax0 = ficha.recursos.vontade.max;
  mexer();
  sincronizar(ficha);
  ficha.pv = limitar(pv0 + (ficha.pvMax - pvMax0), 0, ficha.pvMax);
  const v = ficha.recursos.vontade;
  v.atual = limitar(vontade0 + (v.max - vontadeMax0), 0, v.max);
}

export type ResultadoCompra = { ok: true; ficha: Ficha; gasto: GastoXp; resumo: string; aviso?: string } | { ok: false; erro: string; status: number };

/** Aplica uma compra (cópia da ficha). Confere XP, nível e máximos; `de` diferente do atual = a ficha mudou em outro aparelho. */
export function comprar(original: Ficha, compra: CompraXp, agora = new Date()): ResultadoCompra {
  const ficha = clonar(original);
  sincronizar(ficha);
  const a = avaliar(ficha, compra);
  if ("erro" in a) return { ok: false, erro: a.erro, status: 400 };
  if (typeof compra.de === "number" && compra.de !== a.de && compra.tipo !== "ritual" && compra.tipo !== "formula") {
    return { ok: false, erro: "A ficha mudou enquanto você olhava (outro aparelho comprou?). Confira e tente de novo.", status: 409 };
  }
  if (a.custo > ficha.xp) return { ok: false, erro: `${textoGasto(compra, a)} custa ${a.custo} XP e você tem ${ficha.xp}. Faltam ${a.custo - ficha.xp}.`, status: 400 };

  let extra: Partial<GastoXp> = {};
  const potAntes = potenciaDe(ficha);
  comDerivados(ficha, () => {
    extra = a.aplicar(ficha) || {};
  });
  ficha.xp -= a.custo;
  const gasto: GastoXp = {
    data: agora.toISOString(),
    tipo: compra.tipo,
    alvo: compra.alvo,
    item: textoGasto(compra, a),
    de: a.de,
    para: a.para,
    custo: a.custo,
    xpDepois: ficha.xp,
    ...extra,
  };
  ficha.extras.gastosXp = [...gastosDe(ficha), gasto].slice(-HISTORICO_MAX);

  const efeitos: string[] = [];
  if (compra.tipo === "atributo" && compra.alvo === "vigor") efeitos.push(`Saúde ${ficha.pvMax}`);
  if (compra.tipo === "atributo" && (compra.alvo === "autocontrole" || compra.alvo === "determinacao")) efeitos.push(`Força de Vontade ${ficha.recursos.vontade.max}`);
  if (compra.tipo === "potencia") efeitos.push(...mudancasPotencia(potAntes, ficha.nivel));
  const resumo = `${ficha.nome} gastou ${a.custo} XP: ${gasto.item}${efeitos.length ? ` (${efeitos.join(" · ")})` : ""}. Sobram ${ficha.xp} XP.${a.aviso ? ` ${a.aviso}` : ""}`;
  return { ok: true, ficha, gasto, resumo, ...(a.aviso ? { aviso: a.aviso } : {}) };
}

/** Confere se a última compra ainda está na ficha do jeito que ficou (nada mexeu depois). */
function motivoNaoDesfaz(ficha: Ficha, g: GastoXp): string | null {
  if (ficha.xp !== g.xpDepois) return "O XP mudou depois da compra (o mestre deu mais?): não dá mais para desfazer.";
  const mudou = "Esse ponto já mudou depois da compra: não dá mais para desfazer.";
  switch (g.tipo) {
    case "atributo":
      return (ficha.atributos[g.alvo ?? ""] ?? 1) === g.para ? null : mudou;
    case "pericia":
      return (ficha.pericias[g.alvo ?? ""] ?? 0) === g.para ? null : mudou;
    case "disciplina":
      return (disciplinasDe(ficha)[g.alvo ?? ""] ?? 0) === g.para ? null : mudou;
    case "potencia":
      return potenciaDe(ficha) === g.para ? null : mudou;
    case "vantagem":
      if (g.alvo === "recursos") return ficha.dinheiro === g.para ? null : mudou;
      return listaExtra(ficha, "vantagens").includes(g.textoDepois ?? "") ? null : mudou;
    case "especialidade":
      return listaExtra(ficha, "especialidades").includes(g.textoDepois ?? "") ? null : mudou;
    case "ritual":
    case "formula":
      return conhecimentosDe(ficha, g.tipo === "ritual" ? "rituais" : "formulas").some((r) => r.nome === g.alvo && r.nivel === g.para) ? null : mudou;
  }
  return mudou;
}

/** Desfaz a última compra: devolve o XP e volta o ponto. */
export function desfazer(original: Ficha): ResultadoCompra {
  const ficha = clonar(original);
  sincronizar(ficha);
  const gastos = gastosDe(ficha);
  const g = gastos.at(-1);
  if (!g) return { ok: false, erro: "Nada para desfazer: você ainda não gastou XP.", status: 400 };
  const motivo = motivoNaoDesfaz(ficha, g);
  if (motivo) return { ok: false, erro: motivo, status: 409 };

  comDerivados(ficha, () => {
    const alvo = g.alvo ?? "";
    switch (g.tipo) {
      case "atributo":
        ficha.atributos[alvo] = g.de;
        break;
      case "pericia":
        if (g.de > 0) ficha.pericias[alvo] = g.de;
        else delete ficha.pericias[alvo];
        break;
      case "disciplina": {
        const disc = { ...disciplinasDe(ficha) };
        if (g.de > 0) disc[alvo] = g.de;
        else delete disc[alvo];
        ficha.extras.disciplinas = disc;
        break;
      }
      case "potencia":
        ficha.nivel = g.de;
        break;
      case "vantagem": {
        if (alvo === "recursos") {
          ficha.dinheiro = g.de;
          break;
        }
        const lista = listaExtra(ficha, "vantagens");
        const i = lista.indexOf(g.textoDepois ?? "");
        if (g.textoAntes) lista[i] = g.textoAntes;
        else lista.splice(i, 1);
        ficha.extras.vantagens = lista;
        break;
      }
      case "especialidade": {
        const lista = listaExtra(ficha, "especialidades");
        lista.splice(lista.indexOf(g.textoDepois ?? ""), 1);
        ficha.extras.especialidades = lista;
        break;
      }
      case "ritual":
      case "formula": {
        const campo = g.tipo === "ritual" ? "rituais" : "formulas";
        const lista = conhecimentosDe(ficha, campo);
        lista.splice(lista.findIndex((r) => r.nome === g.alvo && r.nivel === g.para), 1);
        ficha.extras[campo] = lista;
        break;
      }
    }
  });
  ficha.xp += g.custo;
  ficha.extras.gastosXp = gastos.slice(0, -1);
  return { ok: true, ficha, gasto: g, resumo: `${ficha.nome} desfez a compra (${g.item}) e recebeu ${g.custo} XP de volta. Total: ${ficha.xp} XP.` };
}

// ---------- vitrine: o que dá para comprar agora ----------

function item(ficha: Ficha, compra: CompraXp, base: Omit<ItemXp, "custo" | "cabe" | "motivo" | "aviso" | "max">, max = PONTOS_MAX): ItemXp {
  const a = avaliar(ficha, compra);
  if ("erro" in a) return { ...base, max, custo: null, cabe: false, motivo: a.erro };
  const falta = a.custo - ficha.xp;
  return { ...base, max, custo: a.custo, cabe: falta <= 0, motivo: falta > 0 ? `Faltam ${falta} XP (custa ${a.custo}).` : undefined, aviso: a.aviso };
}

/** Tudo o que a ficha pode comprar, por seção, com custo do próximo ponto e se cabe no XP de agora. */
export function ofertaXp(original: Ficha): OfertaXp {
  const ficha = clonar(original);
  sincronizar(ficha);
  const cla = claDe(ficha);
  const disc = disciplinasDe(ficha);
  const secoes: SecaoXp[] = [];

  secoes.push({
    id: "atributos",
    titulo: "Atributos",
    ajuda: "Novo nível ×5. Vigor sobe a Saúde; Autocontrole e Determinação, a Força de Vontade.",
    itens: CATEGORIAS_ATRIBUTOS.flatMap((cat) =>
      cat.ids.map((id) => item(ficha, { tipo: "atributo", alvo: id }, { tipo: "atributo", alvo: id, nome: nomeDe(ATRIBUTOS, id), grupo: cat.titulo, atual: ficha.atributos[id] ?? 1 })),
    ),
  });

  secoes.push({
    id: "pericias",
    titulo: "Perícias",
    ajuda: "Novo nível ×3 (perícia nova, de — para ●, custa 3).",
    itens: CATEGORIAS_PERICIAS.flatMap((cat) =>
      cat.ids.map((id) => item(ficha, { tipo: "pericia", alvo: id }, { tipo: "pericia", alvo: id, nome: nomeDe(PERICIAS, id), grupo: cat.titulo, atual: ficha.pericias[id] ?? 0 })),
    ),
  });

  secoes.push({
    id: "especialidades",
    titulo: "Especialidades",
    ajuda: "3 XP cada. +1 dado quando o teste cita o foco. Uma por ponto na perícia.",
    itens: listaExtra(ficha, "especialidades").map((e) => ({ tipo: "especialidade", alvo: e, nome: e, atual: 1, max: 1, custo: null, cabe: false, soLeitura: true })),
    novo: {
      tipo: "especialidade",
      custo: CUSTOS.especialidade(),
      pericias: PERICIAS.map((p) => {
        const motivo = motivoEspecialidade(ficha, p.id);
        return { id: p.id, nome: p.nome, pode: !motivo, ...(motivo ? { motivo } : {}) };
      }),
    },
  });

  // disciplinas: as do clã primeiro, depois as que já tem, depois o resto (Sangue-ralo só vê Alquimia)
  const ordem = DISCIPLINAS.filter((x) => (cla.id === "sangue_ralo" ? x.id === "alquimia" : x.id !== "alquimia" || disc.alquimia)).sort((x, y) => {
    const peso = (id: string) => (cla.disciplinas.includes(id) ? 0 : (disc[id] ?? 0) > 0 ? 1 : 2);
    return peso(x.id) - peso(y.id);
  });
  secoes.push({
    id: "disciplinas",
    titulo: "Disciplinas",
    ajuda:
      cla.id === "caitiff"
        ? "Caitiff: qualquer disciplina a novo nível ×6."
        : cla.id === "sangue_ralo"
          ? "Sangue-ralo: Alquimia a novo nível ×5. Disciplinas de sangue grosso só com mérito (combine com o mestre)."
          : "Do clã: novo nível ×5. De fora: novo nível ×7, e precisa de motivo na história.",
    itens: ordem.map((x) => {
      const regra = regraDisciplina(ficha, x.id);
      return item(ficha, { tipo: "disciplina", alvo: x.id }, { tipo: "disciplina", alvo: x.id, nome: x.nome, grupo: regra.rotulo === "do clã" ? "Do clã" : regra.rotulo === "Caitiff" ? "Qualquer uma" : "De fora do clã", atual: disc[x.id] ?? 0 });
    }),
  });

  if ((disc.feiticaria ?? 0) > 0) {
    secoes.push({
      id: "rituais",
      titulo: "Rituais",
      ajuda: "Nível do ritual ×3, até o seu nível de Feitiçaria de Sangue. O nome é com você e o mestre (o ritual grátis de cada nível também).",
      itens: conhecimentosDe(ficha, "rituais").map((r) => ({ tipo: "ritual", alvo: r.nome, nome: r.nome, atual: r.nivel, max: r.nivel, custo: null, cabe: false, soLeitura: true })),
      novo: { tipo: "ritual", custoPorNivel: 3, nivelMax: disc.feiticaria },
    });
  }
  if ((disc.alquimia ?? 0) > 0) {
    secoes.push({
      id: "formulas",
      titulo: "Fórmulas",
      ajuda: "Nível da fórmula ×3, até o seu nível de Alquimia de Sangue-ralo.",
      itens: conhecimentosDe(ficha, "formulas").map((r) => ({ tipo: "formula", alvo: r.nome, nome: r.nome, atual: r.nivel, max: r.nivel, custo: null, cabe: false, soLeitura: true })),
      novo: { tipo: "formula", custoPorNivel: 3, nivelMax: disc.alquimia },
    });
  }

  const vantagens = listaExtra(ficha, "vantagens").filter((v) => !ehRecursos(v));
  secoes.push({
    id: "vantagens",
    titulo: "Vantagens",
    ajuda: "3 XP por ponto. Defeitos não se compram fora: se resolvem na história.",
    itens: [
      item(ficha, { tipo: "vantagem", alvo: "recursos" }, { tipo: "vantagem", alvo: "recursos", nome: "Recursos", atual: limitar(ficha.dinheiro, 0, 5) }),
      ...vantagens.map((v) => {
        const lida = lerVantagem(v);
        return item(ficha, { tipo: "vantagem", alvo: v }, { tipo: "vantagem", alvo: v, nome: lida?.nome ?? v, atual: lida?.pontos ?? 0 });
      }),
    ],
    novo: { tipo: "vantagem", custo: CUSTOS.vantagem() },
  });

  const teto = cla.id === "sangue_ralo" ? 0 : potenciaMaxima(geracaoDe(ficha));
  secoes.push({
    id: "potencia",
    titulo: "Potência de Sangue",
    ajuda: `Novo nível ×10. Na ${geracaoDe(ficha)}ª geração o teto é ${teto}. Sangue mais grosso: mais Surto e cura, perdição mais forte, paladar mais chato.`,
    itens: [item(ficha, { tipo: "potencia" }, { tipo: "potencia", alvo: "potencia", nome: "Potência de Sangue", atual: potenciaDe(ficha) }, Math.max(teto, potenciaDe(ficha)))],
  });

  const gastos = gastosDe(ficha);
  const g = gastos.at(-1);
  const motivo = g ? motivoNaoDesfaz(ficha, g) : null;
  return {
    xp: ficha.xp,
    secoes,
    ultima: g ? { item: g.item, custo: g.custo, podeDesfazer: !motivo, ...(motivo ? { motivo } : {}) } : null,
    historico: gastos.slice(-5).reverse(),
  };
}
