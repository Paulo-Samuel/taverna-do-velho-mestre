import "server-only";
import { d, somar } from "../dados";
import { clonar, distribuir, fichaBase, limitar, normalizar, rolar3d6, rolar4d6, sinal } from "./comum";
import { CLASSES, KIT_BASICO, classePorId, type ClasseOsr } from "./osr/classes";
import {
  ABREV_INGLES,
  ATRIBUTOS,
  HABILIDADES,
  MAGIAS_ARCANAS,
  MAGIAS_ILUSAO,
  MAGIAS_NECRO,
  OFICIOS,
  RACAS,
  type EfeitosRaca,
  type HabilidadeDef,
} from "./osr/criacao";
import {
  SALVAS,
  ajusteXP,
  bonusAtaqueBase,
  expulsao,
  idiomasExtras,
  magiasPorDia,
  modBX,
  modMenor,
  salvasBase,
  seguidores,
  thac0,
  type Salva,
} from "./osr/tabelas";
import type { BlocoFicha, Ficha, GrauSucesso, PedidoTeste, Recurso, ResultadoTeste, Sistema } from "./tipos";

// Old-School no estilo B/X (OGL 1.0a, nos moldes dos clones abertos): 3d6 em ordem, salvaguardas por classe,
// CA ascendente com THAC0 nos detalhes, habilidades de ladrão em %, portas e ruídos em d6, ouro vira XP.

const SISTEMA = "osr";
const ORDEM_ATRIBUTOS = ATRIBUTOS.map((a) => a.id);
const CIRCULOS = ["1º", "2º", "3º", "4º", "5º", "6º"];

// ——— Leitura da ficha ———

function attr(ficha: Ficha, id: string): number {
  return ficha.atributos[id] ?? 10;
}

function classeDe(ficha: Ficha): ClasseOsr {
  return classePorId(ficha.classe);
}

/** Efeitos mecânicos da raça escolhida — só no modo raça separada; raças-classe já trazem tudo na classe. */
function efeitosRaca(ficha: Ficha, classe: ClasseOsr): EfeitosRaca {
  if (classe.raca) return {};
  return RACAS.find((r) => r.id === ficha.ancestralidade)?.efeitos ?? {};
}

function nomeRaca(id: string): string {
  return RACAS.find((r) => r.id === id)?.nome ?? id;
}

/** Valores de habilidade que a classe/raça/atributos dão neste nível (sem ajustes do mestre). */
function calcularHabilidades(classe: ClasseOsr, efeitos: EfeitosRaca, nivel: number, atributos: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = {
    "abrir-portas": limitar(2 + modBX(atributos.for ?? 10), 1, 5),
    ouvir: 1,
    "portas-secretas": 1,
    "procurar-armadilhas": 1,
    "detectar-construcao": 1,
  };
  for (const [id, x] of Object.entries(efeitos.d6 ?? {})) v[id] = Math.max(v[id] ?? 0, x);
  for (const [id, f] of Object.entries(classe.d6 ?? {})) v[id] = Math.max(v[id] ?? 0, f(nivel));
  for (const [id, f] of Object.entries(classe.pct ?? {})) v[id] = f(nivel);
  return v;
}

function habilidadesAtuais(ficha: Ficha): Record<string, number> {
  const classe = classeDe(ficha);
  const calculado = calcularHabilidades(classe, efeitosRaca(ficha, classe), ficha.nivel, ficha.atributos);
  // abrir portas acompanha a FOR do momento; o resto respeita ajustes que o mestre tenha feito na ficha
  return { ...calculado, ...ficha.pericias, "abrir-portas": calculado["abrir-portas"] };
}

function textoHabilidade(h: HabilidadeDef, valor: number): string {
  return h.tipo === "d6" ? `${h.nome} ${valor} em 6` : `${h.nome} ${valor}%`;
}

type SalvaCalculada = { alvo: number; bonus: number; partes: string[] };

function salvasDe(ficha: Ficha): Record<Salva, SalvaCalculada> {
  const classe = classeDe(ficha);
  const base = salvasBase(classe.salvas, ficha.nivel);
  const raca = efeitosRaca(ficha, classe).salvas ?? {};
  const sab = modBX(attr(ficha, "sab"));
  const res = {} as Record<Salva, SalvaCalculada>;
  for (const s of SALVAS) {
    const partes: string[] = [];
    let bonus = 0;
    const deClasse = classe.bonusSalvas?.[s.id] ?? 0;
    if (deClasse) partes.push(`${sinal(deClasse)} classe`);
    const deRaca = raca[s.id] ?? 0;
    if (deRaca) partes.push(`${sinal(deRaca)} raça`);
    // SAB protege contra efeitos mágicos
    const deSab = s.id === "magias" || s.id === "varinhas" ? sab : 0;
    if (deSab) partes.push(`${sinal(deSab)} SAB`);
    bonus = deClasse + deRaca + deSab;
    res[s.id] = { alvo: base[s.id], bonus, partes };
  }
  return res;
}

function bonusAtaque(ficha: Ficha, distancia: boolean): { base: number; total: number; partes: string[] } {
  const classe = classeDe(ficha);
  const base = bonusAtaqueBase(classe.ataque, ficha.nivel);
  const partes = [`base ${sinal(base)}`];
  let total = base;
  if (distancia) {
    const des = modBX(attr(ficha, "des"));
    const extra = (classe.ataqueDistancia ?? 0) + (efeitosRaca(ficha, classe).ataqueDistancia ?? 0);
    total += des + extra;
    if (des) partes.push(`${sinal(des)} DES`);
    if (extra) partes.push(`${sinal(extra)} raça`);
  } else {
    const forca = modBX(attr(ficha, "for"));
    total += forca;
    if (forca) partes.push(`${sinal(forca)} FOR`);
  }
  return { base, total, partes };
}

function bonusIniciativa(ficha: Ficha): number {
  const classe = classeDe(ficha);
  const extra = classe.id === "halfling" ? 1 : efeitosRaca(ficha, classe).iniciativa ?? 0;
  return modMenor(attr(ficha, "des")) + extra;
}

function magiasDoNivel(classe: ClasseOsr, nivel: number): number[] {
  return classe.magia ? magiasPorDia(classe.magia.perfil, nivel) : [];
}

/** Recursos que a classe tem neste nível (magias por círculo e usos diários). */
function recursosDaClasse(classe: ClasseOsr, nivel: number): Record<string, Recurso> {
  const recursos: Record<string, Recurso> = {};
  magiasDoNivel(classe, nivel).forEach((qtd, i) => {
    if (qtd > 0) recursos[`m${i + 1}`] = { rotulo: `Magias de ${CIRCULOS[i]} círculo`, atual: qtd, max: qtd };
  });
  for (const u of classe.usos ?? []) {
    const max = u.max(nivel);
    if (max > 0) recursos[u.id] = { rotulo: u.rotulo, atual: max, max };
  }
  return recursos;
}

/** Atualiza máximos mantendo o que já foi gasto (ganha só a diferença). */
function aplicarRecursos(ficha: Ficha, novos: Record<string, Recurso>) {
  for (const [id, r] of Object.entries(novos)) {
    const antes = ficha.recursos[id];
    ficha.recursos[id] = antes ? { rotulo: r.rotulo, max: r.max, atual: limitar(antes.atual + (r.max - antes.max), 0, r.max) } : r;
  }
}

function requisitosFaltando(ficha: Ficha, classe: ClasseOsr): string[] {
  return Object.entries(classe.requisitos ?? {})
    .filter(([id, min]) => attr(ficha, id) < min)
    .map(([id, min]) => `${id.toUpperCase()} ${min}`);
}

function avisoAlinhamento(ficha: Ficha, classe: ClasseOsr): string | null {
  const al = String(ficha.extras.alinhamento ?? "neutro");
  if (classe.id === "paladino" && al !== "lei") return "Paladino que não é Ordeiro: os poderes sagrados estão em período de experiência.";
  if (classe.id === "druida" && al !== "neutro") return "Druida que não é Neutro: a floresta está de olho.";
  if (classe.id === "assassino" && al === "lei") return "Assassino Ordeiro: o sindicato não aceita.";
  return null;
}

function percentualXP(ficha: Ficha, classe: ClasseOsr): number {
  return ajusteXP(Math.min(...classe.primarios.map((p) => attr(ficha, p))));
}

/** XP total para `nivel` na tabela da classe da ficha; null acima do nível máximo dela. */
function xpDaClasse(ficha: Ficha, nivel: number): number | null {
  if (nivel <= 1) return 0;
  return classeDe(ficha).xp[nivel - 1] ?? null;
}

function rotuloAlinhamento(id: unknown): string {
  return OPCOES_ALINHAMENTO.find((o) => o.id === id)?.nome ?? "Neutro";
}

function grimorio(ficha: Ficha): string[] {
  const ids = ["magias", "ilusoes", "necro"].flatMap((k) => (Array.isArray(ficha.extras[k]) ? (ficha.extras[k] as unknown[]).map(String) : []));
  const todas = [...MAGIAS_ARCANAS, ...MAGIAS_ILUSAO, ...MAGIAS_NECRO];
  return [...new Set(ids)].map((id) => todas.find((m) => m.id === id)?.nome ?? id);
}

// ——— Rolagens ———

type Rolado = { dados: number[]; natural: number; expressao: string };

/** Rola 1 dado (ou 2 com vantagem/desvantagem). `menorMelhor` para testes de rolar abaixo. */
function rolarModo(lados: number, modo: PedidoTeste["modo"], menorMelhor: boolean): Rolado {
  if (!modo || modo === "normal") {
    const v = d(lados);
    return { dados: [v], natural: v, expressao: `1d${lados}` };
  }
  const dados = [d(lados), d(lados)];
  const mantemMaior = (modo === "vantagem") !== menorMelhor;
  return {
    dados,
    natural: mantemMaior ? Math.max(...dados) : Math.min(...dados),
    expressao: `2d${lados}${mantemMaior ? "kh1" : "kl1"}`,
  };
}

type Montagem = Omit<ResultadoTeste, "tipo" | "sistema" | "personagem" | "motivo" | "sucesso" | "detalhes"> & { detalhes?: (string | false | undefined)[] };

function montar(ficha: Ficha, pedido: PedidoTeste, m: Montagem): ResultadoTeste {
  const detalhes = (m.detalhes ?? []).filter(Boolean).join(" · ");
  return {
    tipo: "teste",
    sistema: SISTEMA,
    personagem: ficha.nome,
    motivo: pedido.motivo,
    teste: m.teste,
    expressao: m.expressao,
    dados: m.dados,
    natural: m.natural,
    bonus: m.bonus,
    total: m.total,
    alvo: m.alvo,
    grau: m.grau,
    sucesso: m.grau === "sucesso" || m.grau === "sucesso_critico",
    rotuloGrau: m.rotuloGrau,
    detalhes: detalhes || undefined,
    margem: m.margem,
  };
}

function detalheModo(r: Rolado, pedido: PedidoTeste): string | false {
  return r.dados.length > 1 && `${pedido.modo}: ${r.dados.join(" e ")}`;
}

/** d20 ≤ atributo (rolar abaixo). 1 natural é brilhante, 20 natural é desastre. */
function testeAtributo(ficha: Ficha, pedido: PedidoTeste, id: string, extra: { rotulo?: string; penalidade?: number; detalhe?: string } = {}): ResultadoTeste {
  const def = ATRIBUTOS.find((a) => a.id === id) ?? ATRIBUTOS[0];
  const valor = attr(ficha, def.id);
  const bonus = (pedido.modificador ?? 0) + (extra.penalidade ?? 0);
  const alvo = valor + bonus;
  const r = rolarModo(20, pedido.modo, true);
  const grau: GrauSucesso = r.natural === 1 ? "sucesso_critico" : r.natural === 20 ? "falha_critica" : r.natural <= alvo ? "sucesso" : "falha";
  const rotulos: Record<GrauSucesso, string> = {
    sucesso_critico: "Sucesso espetacular!",
    sucesso: "Passou",
    parcial: "Passou",
    falha: "Falhou",
    falha_critica: "Desastre!",
  };
  return montar(ficha, pedido, {
    teste: extra.rotulo ?? def.nome,
    expressao: r.expressao,
    dados: r.dados,
    natural: r.natural,
    bonus,
    total: r.natural,
    alvo,
    grau,
    rotuloGrau: rotulos[grau],
    margem: alvo - r.natural,
    detalhes: [`rolar abaixo: ${def.abrev} ${valor}${bonus ? ` ${sinal(bonus)}` : ""} → precisa de ${alvo} ou menos`, detalheModo(r, pedido), extra.detalhe],
  });
}

function testeSalvaguarda(ficha: Ficha, pedido: PedidoTeste, salva: Salva): ResultadoTeste {
  const def = SALVAS.find((s) => s.id === salva)!;
  const calc = salvasDe(ficha)[salva];
  const bonus = calc.bonus + (pedido.modificador ?? 0);
  const r = rolarModo(20, pedido.modo, false);
  const total = r.natural + bonus;
  // 20 natural sempre salva e 1 natural sempre falha, para ninguém virar estátua por aritmética
  const salvou = r.natural === 20 || (r.natural !== 1 && total >= calc.alvo);
  return montar(ficha, pedido, {
    teste: `Salvaguarda: ${def.nome}`,
    expressao: `${r.expressao}${bonus ? sinal(bonus) : ""}`,
    dados: r.dados,
    natural: r.natural,
    bonus,
    total,
    alvo: calc.alvo,
    grau: salvou ? "sucesso" : "falha",
    rotuloGrau: salvou ? "Salvo!" : "Não salvou",
    margem: total - calc.alvo,
    detalhes: [`precisa de ${calc.alvo}+ no d20`, calc.partes.length ? calc.partes.join(", ") : false, detalheModo(r, pedido)],
  });
}

function testeAtaque(ficha: Ficha, pedido: PedidoTeste, opcoes: { distancia: boolean; costas: boolean; assassinar: boolean }): ResultadoTeste {
  const classe = classeDe(ficha);
  // só o assassino assassina; os outros ganham um ataque pelas costas comum
  if (opcoes.assassinar && classe.id !== "assassino") opcoes = { ...opcoes, assassinar: false, costas: true };
  const atk = bonusAtaque(ficha, opcoes.distancia);
  const furtivo = opcoes.costas || opcoes.assassinar;
  const bonus = atk.total + (furtivo ? 4 : 0) + (pedido.modificador ?? 0);
  const r = rolarModo(20, pedido.modo, false);
  const total = r.natural + bonus;
  const alvo = pedido.alvo ?? null;
  let grau: GrauSucesso;
  if (r.natural === 20) grau = "sucesso_critico";
  else if (r.natural === 1) grau = "falha_critica";
  else grau = alvo === null || total >= alvo ? "sucesso" : "falha";
  const rotulos: Record<GrauSucesso, string> = {
    sucesso_critico: "Acerto em cheio!",
    sucesso: alvo === null ? `Acerta CA ${total}` : "Acertou!",
    parcial: "Acertou",
    falha: "Errou",
    falha_critica: "Errou feio!",
  };
  const arma = opcoes.distancia ? classe.distancia : classe.arma;
  const danoFor = opcoes.distancia ? 0 : modBX(attr(ficha, "for"));
  const dano = `${arma.dano}${danoFor ? sinal(danoFor) : ""}${furtivo && (classe.costas || opcoes.assassinar) ? " ×2" : ""}`;
  const rotulo = opcoes.assassinar ? `Assassinar (${arma.nome})` : `${opcoes.costas ? "Ataque pelas costas" : opcoes.distancia ? "Ataque à distância" : "Ataque"} (${arma.nome})`;
  return montar(ficha, pedido, {
    teste: rotulo,
    expressao: `${r.expressao}${bonus ? sinal(bonus) : ""}`,
    dados: r.dados,
    natural: r.natural,
    bonus,
    total,
    alvo,
    grau,
    rotuloGrau: rotulos[grau],
    margem: alvo === null ? null : total - alvo,
    detalhes: [
      `THAC0 ${thac0(bonus)}: acerta CA descendente ${19 - total} ou pior`,
      atk.partes.join(", ") + (furtivo ? ", +4 surpresa" : ""),
      `dano ${dano}`,
      opcoes.assassinar && grau !== "falha" && grau !== "falha_critica" && "acertou: o alvo salva contra Morte ou morre",
      opcoes.costas && !classe.costas && "sem a habilidade de classe: só o +4, dano normal",
      detalheModo(r, pedido),
    ],
  });
}

function testeIniciativa(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const bonus = bonusIniciativa(ficha) + (pedido.modificador ?? 0);
  const r = rolarModo(6, pedido.modo, false);
  const total = r.natural + bonus;
  const alvo = pedido.alvo ?? null;
  const ganhou = alvo === null || total >= alvo;
  return montar(ficha, pedido, {
    teste: "Iniciativa",
    expressao: `${r.expressao}${bonus ? sinal(bonus) : ""}`,
    dados: r.dados,
    natural: r.natural,
    bonus,
    total,
    alvo,
    grau: ganhou ? "sucesso" : "falha",
    rotuloGrau: alvo === null ? `Iniciativa ${total}` : ganhou ? "Age primeiro" : "Age depois",
    margem: alvo === null ? null : total - alvo,
    detalhes: ["d6 individual; no combate em grupo, o lado com maior d6 age primeiro", detalheModo(r, pedido)],
  });
}

function teste2d6(bonus: number) {
  const { valores, total } = somar(2, 6);
  return { dados: valores, natural: total, total: total + bonus, expressao: `2d6${bonus ? sinal(bonus) : ""}` };
}

function testeReacao(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const classe = classeDe(ficha);
  const assusta = !classe.raca && ficha.ancestralidade === "meio-orc" ? -1 : 0;
  const bonus = modMenor(attr(ficha, "car")) + assusta + (pedido.modificador ?? 0);
  const r = teste2d6(bonus);
  const [grau, rotulo]: [GrauSucesso, string] =
    r.total <= 2 ? ["falha_critica", "Hostil: ataca!"]
    : r.total <= 5 ? ["falha", "Desfavorável"]
    : r.total <= 8 ? ["parcial", "Incerto"]
    : r.total <= 11 ? ["sucesso", "Indiferente, aceita conversa"]
    : ["sucesso_critico", "Amigável!"];
  return montar(ficha, pedido, {
    teste: "Reação",
    expressao: r.expressao,
    dados: r.dados,
    natural: null,
    bonus,
    total: r.total,
    alvo: null,
    grau,
    rotuloGrau: rotulo,
    margem: null,
    detalhes: ["2d6 + CAR de quem fala: 2 ataca, 3-5 hostil, 6-8 incerto, 9-11 negocia, 12 amigável"],
  });
}

function testeMoral(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const { lealdade } = seguidores(attr(ficha, "car"));
  const alvo = (pedido.alvo ?? lealdade) + (pedido.modificador ?? 0);
  const r = teste2d6(0);
  const firme = r.total <= alvo;
  return montar(ficha, pedido, {
    teste: "Moral",
    expressao: r.expressao,
    dados: r.dados,
    natural: null,
    bonus: pedido.modificador ?? 0,
    total: r.total,
    alvo,
    grau: firme ? "sucesso" : "falha",
    rotuloGrau: firme ? "Mantém a moral" : "Foge ou se rende",
    margem: alvo - r.total,
    detalhes: [`2d6 ≤ moral ${alvo}${pedido.alvo == null ? " (lealdade dos seguidores pelo CAR)" : ""}`],
  });
}

function testeExpulsar(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const classe = classeDe(ficha);
  const dv = Math.max(1, Math.round(pedido.alvo ?? 1));
  const nivelEfetivo = classe.expulsar === undefined ? 0 : ficha.nivel + classe.expulsar;
  const precisa = expulsao(nivelEfetivo, dv);
  const r = teste2d6(pedido.modificador ?? 0);
  let grau: GrauSucesso;
  let rotulo: string;
  if (classe.expulsar === undefined || nivelEfetivo < 1) {
    grau = "falha";
    rotulo = "Não sabe expulsar mortos-vivos";
  } else if (precisa === null) {
    grau = "falha";
    rotulo = "Poderosos demais: nem tremem";
  } else if (precisa === "D") {
    grau = "sucesso_critico";
    rotulo = "Destruídos!";
  } else if (precisa === "T" || r.total >= precisa) {
    grau = "sucesso";
    rotulo = "Expulsos!";
  } else {
    grau = "falha";
    rotulo = "Os mortos não ligaram";
  }
  const efetivo = grau === "sucesso" || grau === "sucesso_critico";
  const afetados = somar(2, 6);
  return montar(ficha, pedido, {
    teste: "Expulsar mortos-vivos",
    expressao: r.expressao,
    dados: r.dados,
    natural: null,
    bonus: pedido.modificador ?? 0,
    total: r.total,
    alvo: typeof precisa === "number" ? precisa : null,
    grau,
    rotuloGrau: rotulo,
    margem: typeof precisa === "number" ? r.total - precisa : null,
    detalhes: [
      nivelEfetivo >= 1 ? `mortos-vivos de ${dv} DV contra clérigo de nível ${nivelEfetivo}` : "só clérigos (e paladinos a partir do 3º nível) expulsam mortos-vivos",
      precisa === "T" ? "expulsão automática" : precisa === "D" ? "destruição automática" : typeof precisa === "number" ? `precisa de ${precisa}+ em 2d6` : false,
      efetivo && `${afetados.total} DV de mortos-vivos afetados (2d6: ${afetados.valores.join(" e ")})`,
    ],
  });
}

function testeHabilidade(ficha: Ficha, pedido: PedidoTeste, hab: HabilidadeDef): ResultadoTeste {
  const valores = habilidadesAtuais(ficha);
  // ladrões procuram armadilhas pela porcentagem de classe, não pelo 1 em 6 de todo mundo
  if (hab.id === "procurar-armadilhas" && (valores.armadilhas ?? 0) > 0) {
    hab = HABILIDADES.find((h) => h.id === "armadilhas")!;
  }
  const valor = valores[hab.id] ?? 0;

  if (hab.tipo === "d6") {
    const alvo = limitar(Math.max(1, valor) + (pedido.modificador ?? 0), 0, 6);
    const r = rolarModo(6, pedido.modo, true);
    const ok = r.natural <= alvo;
    return montar(ficha, pedido, {
      teste: hab.nome,
      expressao: r.expressao,
      dados: r.dados,
      natural: r.natural,
      bonus: pedido.modificador ?? 0,
      total: r.natural,
      alvo,
      grau: ok ? "sucesso" : "falha",
      rotuloGrau: ok ? `Conseguiu (${alvo} em 6)` : "Nada feito",
      margem: alvo - r.natural,
      detalhes: [alvo <= 1 ? "sucesso só no 1 do d6" : `sucesso em 1-${alvo} no d6`, detalheModo(r, pedido)],
    });
  }

  if (valor <= 0) {
    return testeAtributo(ficha, pedido, hab.semTreino ?? "des", {
      rotulo: `${hab.nome} (sem treino)`,
      penalidade: -4,
      detalhe: "sem a habilidade de classe: teste de atributo com −4 (o mestre pode simplesmente dizer não)",
    });
  }

  const alvo = limitar(valor + (pedido.modificador ?? 0), 1, 99);
  const r = rolarModo(100, pedido.modo, true);
  const grau: GrauSucesso = r.natural === 100 ? "falha_critica" : r.natural <= alvo ? "sucesso" : "falha";
  return montar(ficha, pedido, {
    teste: hab.nome,
    expressao: r.expressao,
    dados: r.dados,
    natural: r.natural,
    bonus: pedido.modificador ?? 0,
    total: r.natural,
    alvo,
    grau,
    rotuloGrau: grau === "falha_critica" ? "Fiasco!" : grau === "sucesso" ? "Conseguiu" : "Falhou",
    margem: alvo - r.natural,
    detalhes: [`d100 ≤ ${alvo}%`, detalheModo(r, pedido)],
  });
}

/** Tarefa que não cabe em nada: com alvo, d20 + modificador ≥ alvo; sem alvo, a velha chance de 2 em 6. */
function testeGenerico(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const bonus = pedido.modificador ?? 0;
  if (pedido.alvo != null) {
    const r = rolarModo(20, pedido.modo, false);
    const total = r.natural + bonus;
    const ok = total >= pedido.alvo;
    return montar(ficha, pedido, {
      teste: pedido.teste,
      expressao: `${r.expressao}${bonus ? sinal(bonus) : ""}`,
      dados: r.dados,
      natural: r.natural,
      bonus,
      total,
      alvo: pedido.alvo,
      grau: ok ? "sucesso" : "falha",
      rotuloGrau: ok ? "Conseguiu" : "Falhou",
      margem: total - pedido.alvo,
      detalhes: ["teste genérico: d20 + modificador contra o alvo", detalheModo(r, pedido)],
    });
  }
  const alvo = limitar(2 + bonus, 0, 6);
  const r = rolarModo(6, pedido.modo, true);
  const ok = r.natural <= alvo;
  return montar(ficha, pedido, {
    teste: pedido.teste,
    expressao: r.expressao,
    dados: r.dados,
    natural: r.natural,
    bonus,
    total: r.natural,
    alvo,
    grau: ok ? "sucesso" : "falha",
    rotuloGrau: ok ? `Conseguiu (${alvo} em 6)` : "Nada feito",
    margem: alvo - r.natural,
    detalhes: [`chance padrão: ${alvo} em 6`, detalheModo(r, pedido)],
  });
}

// ——— Interpretação do pedido ———

function qualSalva(n: string): Salva {
  if (/morte|veneno|death|poison/.test(n)) return "morte";
  if (/varinha|wand/.test(n)) return "varinhas";
  if (/paralis|petrific|pedra|paraly|stone/.test(n)) return "paralisia";
  if (/sopro|bafo|breath|dragao/.test(n)) return "sopro";
  return "magias";
}

function acharAtributo(n: string): string | undefined {
  const palavra = n.split(/[^a-z]+/).filter(Boolean)[0] ?? "";
  const exato = ATRIBUTOS.find((a) => a.id === palavra || normalizar(a.abrev) === palavra || normalizar(a.nome) === palavra);
  if (exato) return exato.id;
  if (ABREV_INGLES[palavra]) return ABREV_INGLES[palavra];
  return ATRIBUTOS.find((a) => n.includes(normalizar(a.nome)))?.id;
}

function acharHabilidade(n: string): HabilidadeDef | undefined {
  return (
    HABILIDADES.find((h) => normalizar(h.id) === n || normalizar(h.nome) === n) ??
    HABILIDADES.find((h) => n.includes(normalizar(h.nome))) ??
    HABILIDADES.find((h) => h.apelidos.some((a) => n.includes(a)))
  );
}

function resolver(ficha: Ficha, pedido: PedidoTeste): ResultadoTeste {
  const n = normalizar(pedido.teste).replace(/^(teste|testar|rolagem|jogada|rolar)( de| do| da| em)? /, "");

  if (/^(salva|resist|jogada de protecao|protecao contra|jp\b|tr\b|save)/.test(n) || /^(morte|veneno|varinhas?|paralisia|petrificacao|sopro|magias\/bastoes|bastoes)\b/.test(n)) {
    return testeSalvaguarda(ficha, pedido, qualSalva(n));
  }
  if (/^assassin(ar|ato)/.test(n)) {
    return testeAtaque(ficha, pedido, { distancia: false, costas: false, assassinar: true });
  }
  if (/^(ataque|atacar|golpe|golpear|disparo|disparar|tiro|atirar|arremess|backstab|apunhal)/.test(n)) {
    const distancia = /distancia|arco|besta|funda|arremess|projetil|disparo|disparar|tiro|atirar|dardo/.test(n);
    const costas = /costas|apunhal|backstab|furtiv|surpresa/.test(n);
    return testeAtaque(ficha, pedido, { distancia, costas, assassinar: false });
  }
  if (/^iniciativa/.test(n)) return testeIniciativa(ficha, pedido);
  if (/expuls|afastar mortos|turn undead|esconjur/.test(n)) return testeExpulsar(ficha, pedido);
  if (/^reac/.test(n)) return testeReacao(ficha, pedido);
  if (/^(moral|lealdade)/.test(n)) return testeMoral(ficha, pedido);
  if (/^(magia|conjur|feiti|lancar|ler pergaminho|ler magia|identificar)/.test(n)) {
    const classe = classeDe(ficha);
    const id = classe.magia?.atributo ?? "int";
    return testeAtributo(ficha, pedido, id, {
      rotulo: `Magia (${id.toUpperCase()})`,
      detalhe: "magias funcionam sem teste; isto é para pergaminhos, concentração e coisas estranhas",
    });
  }
  const hab = acharHabilidade(n);
  if (hab) return testeHabilidade(ficha, pedido, hab);
  const atributo = acharAtributo(n);
  if (atributo) return testeAtributo(ficha, pedido, atributo);
  return testeGenerico(ficha, pedido);
}

// ——— Opções de criação ———

const OPCOES_ALINHAMENTO = [
  { id: "lei", nome: "Ordeiro", descricao: "Promessas, regras e uma fila organizada até para morrer." },
  { id: "neutro", nome: "Neutro", descricao: "Cuida da própria vida e do próprio ouro." },
  { id: "caos", nome: "Caótico", descricao: "Regras são sugestões, e sugestões são piadas." },
];

export const osr: Sistema = {
  id: SISTEMA,
  nome: "Old-School (B/X)",
  nomeCurto: "Old-School",
  descricao: "Masmorra à moda antiga: 3d6 em ordem, salvaguardas, habilidades de ladrão em %, ouro vira XP e a morte mora no corredor ao lado.",
  licenca: "OGL 1.0a — conteúdo old-school aberto (clones B/X); textos próprios",
  dadoPrincipal: "d20",
  pronto: true,
  rotulos: { ancestralidade: "Raça", classe: "Classe", antecedente: "Ofício anterior", nivel: "Nível", defesa: "CA", dinheiro: "po", pv: "PV" },
  atributos: ATRIBUTOS,
  pericias: HABILIDADES.map((h) => ({
    id: h.id,
    nome: h.nome,
    atributo: h.atributo,
    descricao: h.descricao ?? (h.tipo === "pct" ? "Habilidade de classe em porcentagem (d100)." : "Chance em d6."),
  })),
  classes: CLASSES.map((c) => ({
    id: c.id, nome: c.nome, descricao: c.descricao, atributoChave: c.atributoChave, pvBase: c.dv,
    pericias: [...Object.keys(c.pct ?? {}), ...Object.keys(c.d6 ?? {})], equipamento: c.equipamento, papel: c.papel, fonte: c.fonte,
  })),
  ancestralidades: RACAS.map((r) => ({ id: r.id, nome: r.nome, descricao: r.descricao, ajustes: r.ajustes, deslocamento: r.deslocamento, tracos: r.tracos })),
  antecedentes: OFICIOS.map(({ id, nome, descricao }) => ({ id, nome, descricao })),
  opcoesCriacao: [
    { id: "alinhamento", rotulo: "Alinhamento", tipo: "escolha", opcoes: OPCOES_ALINHAMENTO, ajuda: "Lei, Neutralidade ou Caos. Paladinos são Ordeiros, druidas são Neutros, assassinos nunca são Ordeiros." },
    {
      id: "pvInicial", rotulo: "PV no 1º nível", tipo: "escolha",
      opcoes: [
        { id: "rolado", nome: "Rolado (à moda antiga)", descricao: "Rola o dado de vida. Um mago com 1 PV é tradição, não bug." },
        { id: "piedade", nome: "Máximo (piedade do mestre)", descricao: "Dado de vida no máximo no 1º nível." },
      ],
    },
    { id: "divindade", rotulo: "Divindade ou ordem", tipo: "texto", classes: ["clerigo", "paladino", "druida", "drow"], ajuda: "Invente: o Deus das Estradas Esburacadas, a Ordem da Lanterna Fraca..." },
    { id: "juramento", rotulo: "Juramento", tipo: "texto", classes: ["cavaleiro", "paladino"], ajuda: "O código que você jurou e vai quebrar até a terceira sessão." },
    {
      id: "inimigo", rotulo: "Inimigo jurado", tipo: "escolha", classes: ["patrulheiro"],
      opcoes: [
        { id: "gigantes", nome: "Gigantes e ogros" },
        { id: "orcs", nome: "Orcs e goblinoides" },
        { id: "mortos", nome: "Mortos-vivos" },
        { id: "feras", nome: "Feras monstruosas" },
        { id: "dragoes", nome: "Dragões (otimista)" },
      ],
    },
    { id: "magias", rotulo: "Magias no grimório", tipo: "multipla", max: 2, opcoes: MAGIAS_ARCANAS, classes: ["mago", "elfo", "meio-elfo"], ajuda: "Começa com duas. Ler magias é chato, mas sem ela não se copia pergaminho." },
    { id: "ilusoes", rotulo: "Ilusões no grimório", tipo: "multipla", max: 2, opcoes: MAGIAS_ILUSAO, classes: ["ilusionista", "gnomo"] },
    { id: "necro", rotulo: "Feitiços sombrios no grimório", tipo: "multipla", max: 2, opcoes: MAGIAS_NECRO, classes: ["necromante"] },
  ],
  metodosAtributos: [
    { id: "classico", nome: "3d6 em ordem (à moda antiga)", descricao: "FOR, INT, SAB, DES, CON, CAR, nessa ordem. Você não escolhe a classe; a classe escolhe você." },
    { id: "3d6-livre", nome: "3d6 distribuídos", descricao: "Rola 3d6 seis vezes e encaixa os melhores onde a classe precisa." },
    { id: "4d6", nome: "4d6 descartando o menor", descricao: "Para heróis de verdade (ou mestres com pena)." },
  ],
  limitesAtributos: { min: 3, max: 18 },
  periciasEscolhiveis: 0,
  nivelMaximo: 14,
  testesSugeridos: [
    "Ataque", "Ataque à distância", "Salvaguarda contra Morte", "Salvaguarda contra Magias", "Salvaguarda contra Sopro",
    "Abrir portas", "Ouvir ruídos", "Procurar portas secretas", "Procurar armadilhas", "FOR", "DES", "SAB",
    "Iniciativa", "Reação", "Moral", "Expulsar mortos-vivos", "Mover-se em silêncio", "Esconder-se nas sombras",
  ],
  regrasParaMestre: `Sistema: Old-School (B/X, conteúdo aberto). Estilo: masmorra perigosa, jogador esperto vale mais que ficha boa.
FILOSOFIA
- Letalidade: personagens de 1º nível têm 1-8 PV e morrem fácil. Avise o perigo pela descrição (ossos, cheiro, marcas de garra), não esconda armadilhas injustas, mas não salve ninguém da própria burrice. 0 PV = morto (ou, se a mesa pedir piedade, inconsciente e à beira da morte).
- Criatividade acima do teste: se o jogador descreve um plano que resolveria a situação (cutucar o piso com a vara de 3 m, jogar óleo, molhar a corda), ele consegue SEM rolar. Role só quando há risco real e o resultado é incerto.
- Ouro = XP: 1 po trazida de volta para a cidade vale 1 XP; monstros derrotados valem pouco (DV×10 a DV×100). Incentive esperteza, fuga e negociação, não matança. Ajuste de XP por requisito primário está na ficha.
- Recursos contam: tochas (1 h), rações, flechas, peso. Na masmorra o tempo passa em turnos de 10 minutos.
- Encontros aleatórios: na masmorra role 1d6 a cada 2 turnos (1 = encontro); ao ar livre, uma vez por período do dia. Use rolar_dados.
- Reação de monstros: quando um encontro não é óbvio, role 2d6 com rolar_dados (ou teste "Reação" do personagem que fala, que soma o CAR): 2 ataca, 3-5 hostil, 6-8 incerto, 9-11 aceita conversa, 12 amigável. Monstro não é saco de XP; muitos negociam, fogem ou cobram pedágio.
- Moral: monstros rolam 2d6 contra a moral (2-12) quando o primeiro deles morre e quando metade cai; se passar da moral, fogem ou se rendem. Seguidores dos jogadores usam teste "Moral" (alvo = lealdade).
COMO PEDIR O TESTE (teste ou pedir_teste)
- Atributo: teste = "FOR", "DES", "Inteligência"... É ROLAR ABAIXO: d20 ≤ atributo. alvo é ignorado; dificuldade vai em modificador (+2 fácil, −2 difícil, −4 muito difícil). 1 natural é espetacular, 20 natural é desastre.
- Salvaguarda: teste = "Salvaguarda contra Morte" (veneno também), "contra Varinhas", "contra Paralisia" (petrificação), "contra Sopro", "contra Magias" (bastões, cajados). d20 ≥ valor da ficha → "Salvo!". Não passe alvo; modificador para circunstâncias.
- Ataque: teste = "Ataque" (corpo a corpo, soma FOR) ou "Ataque à distância" (arco/funda/besta, soma DES), alvo = CA ASCENDENTE do inimigo (sem armadura 10-12, couro 12, cota 14, placas 16, +1 escudo; CA descendente d vira 19 − d). 20 natural sempre acerta, 1 sempre erra. "Ataque pelas costas" dá +4 (ladrão/assassino/acrobata/meio-orc dobram o dano). "Assassinar" (assassino): +4 e, se acertar, o alvo salva contra Morte ou morre. Os detalhes mostram o THAC0 equivalente. Dano: arma da classe (d4 adaga, d6 espada curta/maça/arco, d8 espada, d10 duas mãos) + FOR no corpo a corpo; monstros causam o dano da ficha deles.
- Iniciativa: teste "Iniciativa" (d6 + DES). Em grupo, role 1d6 por lado com rolar_dados a cada rodada; o maior age primeiro.
- Habilidades de ladrão (porcentagem, d100 ≤ valor): "Escalar paredes", "Esconder-se nas sombras", "Mover-se em silêncio", "Abrir fechaduras", "Encontrar/desarmar armadilhas", "Bater carteiras"; e "Andar na corda bamba", "Cair com estilo" (acrobata), "Saber de lendas" (bardo), "Rastrear" (patrulheiro, bárbaro). Aqui modificador é em PONTOS PERCENTUAIS (−20 para uma parede lisa e molhada). O ladrão não sabe se falhou em esconder-se ou mover-se em silêncio: narre a dúvida.
- Chances em d6 (sucesso em 1..X): "Abrir portas" (portas emperradas, depende da FOR), "Ouvir ruídos", "Procurar portas secretas" (1 turno), "Procurar armadilhas", "Detectar construções" (anões, gnomos). modificador soma ao X.
- "Expulsar mortos-vivos" (clérigo; paladino a partir do 3º): alvo = DV dos mortos-vivos; o resultado diz se foram expulsos/destruídos e quantos DV afetou.
- "Reação" e "Moral" como acima. "Magia" só para ler pergaminhos e situações estranhas: magias FUNCIONAM sem teste; os alvos é que fazem salvaguarda.
- Qualquer outra coisa: com alvo, d20 + modificador ≥ alvo; sem alvo, chance de 2 em 6.
COMBATE
- Rodada de 10 segundos: iniciativa por lado, movimento, projéteis, magias, corpo a corpo. Conjurador que leva dano antes de agir perde a magia.
- Monstros típicos: goblin CA 13, 1d8 PV, dano 1d6; orc CA 13, 1 DV; esqueleto CA 12, 1 DV; ogro CA 14, 4 DV, 1d10; dragão jovem CA 18+, 6-9 DV e sopro (salvaguarda contra Sopro para metade).
- Bônus de ataque dos monstros ≈ seus DV (máx. +10).
RECURSOS E DESCANSO
- Magias por dia são recursos "m1".."m6" (Magias de 1º a 6º círculo): ao lançar, gaste 1 do círculo da magia com alterar_ficha. Magos e elfos só lançam o que está no grimório; clérigos começam a orar no 2º nível; druidas desde o 1º.
- Outros recursos: "maos" (imposição de mãos do paladino, em PV), "cancao" (canções do bardo), "inato" (poderes de drow, svirfneblin e duergar).
- Descanso curto = 1 turno parado (obrigatório a cada hora na masmorra): não recupera PV. Descanso longo = noite inteira: magias e usos voltam e cura 1d3 PV. Ferida grave cura com dias de repouso ou com clérigo.
NÍVEIS
- Cada classe tem sua tabela de XP e nível máximo (humanos até 14; anão 12, elfo e drow 10, halfling, gnomo, meio-orc e svirfneblin 8). PV: dado de vida + CON até o 9º nível; depois +1 a +3 fixos. Salvaguardas e ataque melhoram em faixas; habilidades de ladrão sobem todo nível; magias novas aparecem nas tabelas.
- No 9º nível, guerreiros, clérigos, ladrões e afins ganham fortaleza, templo ou guilda e seguidores. Seguidores máximos e lealdade vêm do CAR.
RAÇA
- Modo raça separada: Humano, Anão, Elfo, Halfling, Gnomo, Meio-elfo, Meio-orc, Drow, Svirfneblin ou Duergar com qualquer classe humana (ajustes de atributo e traços aplicados). Raças-classe (Anão, Elfo, Halfling, Gnomo, Meio-orc, Drow, Svirfneblin, Duergar, Meio-elfo como CLASSE) ignoram a raça escolhida: a raça da ficha vira a da classe.
COMO MESTRAR OSR
- Decisão do jogador acima da ficha: descreva o lugar com coisas para mexer (alavanca, poça, estátua de olhos de vidro) e pergunte "como, exatamente?". O que está à vista não pede rolagem; procurar pede dizer onde e como, e gasta tempo.
- Informação antes do perigo: barulho atrás da porta, rastro, ossos roídos. Armadilha justa deixa pista; o resto é escolha do grupo.
- Tempo de masmorra: conte os turnos de 10 minutos no momento da cena (atualizar_cena, ex.: "turno 4 · tocha 2/6"). Cada turno custa: tocha acaba, encontro aleatório a cada 2 turnos, pausa obrigatória a cada hora. Barulho e demora atraem monstros.
- Reação e moral antes da espada: deixe o monstro negociar, cobrar pedágio, fugir ou mentir. Inimigo em fuga é informação e perigo futuro, não XP fácil.
- XP por ouro: o tesouro é guardado, escondido e pesado; tirá-lo da masmorra é o desafio (carga, carregadores, mulas).
- Contratados são gente: têm preço, medo e lealdade; maltratados, fogem ou traem.
- Salvaguarda é a última chance contra o desastre (veneno, sopro, petrificação): o perigo é anunciado antes, pela descrição.
- Morte é real e rápida: não amacie dados nem salve ninguém de uma má decisão; personagem novo entra logo (contratado promovido, prisioneiro libertado).
- Mundo vivo: a masmorra tem facções e ecologia, e o que o grupo faz muda o que vem depois. Anote facções e rumores no diário.`,

  atributosIniciais(classeId, metodo) {
    const classe = classePorId(classeId);
    if (metodo === "3d6-livre") {
      const valores = Object.values(rolar3d6(classe.ordem)).sort((a, b) => b - a);
      return distribuir(valores, classe.ordem);
    }
    if (metodo === "4d6") {
      const valores = Object.values(rolar4d6(classe.ordem)).sort((a, b) => b - a);
      return distribuir(valores, classe.ordem);
    }
    return rolar3d6(ORDEM_ATRIBUTOS);
  },

  criarFicha(entrada) {
    const classe = classePorId(entrada.classe);
    const raca = classe.raca ?? (RACAS.some((r) => r.id === entrada.ancestralidade) ? entrada.ancestralidade : "humano");
    const ficha = fichaBase(SISTEMA, entrada.nome);
    ficha.classe = classe.id;
    ficha.ancestralidade = raca;
    if (entrada.antecedente && OFICIOS.some((o) => o.id === entrada.antecedente)) ficha.antecedente = entrada.antecedente;

    const brutos = entrada.atributos ?? osr.atributosIniciais(classe.id, "classico");
    const ajustes = classe.raca ? {} : (RACAS.find((r) => r.id === raca)?.ajustes ?? {});
    ficha.atributos = Object.fromEntries(ORDEM_ATRIBUTOS.map((id) => [id, limitar((brutos[id] ?? 10) + (ajustes[id] ?? 0), 3, 18)]));

    ficha.extras = { ...(entrada.extras ?? {}) };
    if (!OPCOES_ALINHAMENTO.some((o) => o.id === ficha.extras.alinhamento)) ficha.extras.alinhamento = "neutro";
    if (ficha.extras.pvInicial !== "piedade") ficha.extras.pvInicial = "rolado";

    const dado = ficha.extras.pvInicial === "piedade" ? classe.dv : d(classe.dv);
    ficha.pvMax = Math.max(1, dado + modBX(ficha.atributos.con));
    ficha.pv = ficha.pvMax;
    ficha.defesa = classe.armadura.ca + modBX(ficha.atributos.des);
    ficha.pericias = calcularHabilidades(classe, efeitosRaca(ficha, classe), 1, ficha.atributos);
    ficha.recursos = recursosDaClasse(classe, 1);

    const oficio = OFICIOS.find((o) => o.id === ficha.antecedente);
    ficha.inventario = [...(classe.equipamento ?? []), ...KIT_BASICO, ...(oficio ? [oficio.item] : [])];
    // o equipamento já foi comprado; isto é o troco
    ficha.dinheiro = somar(3, 6).total;
    ficha.historia = entrada.historia ?? "";
    return ficha;
  },

  resolverTeste(ficha, pedido) {
    return resolver(ficha, pedido);
  },

  descreverParaMestre(ficha) {
    const classe = classeDe(ficha);
    const raca = classe.raca ? `${classe.nome} (raça-classe)` : `${nomeRaca(ficha.ancestralidade)} ${classe.nome}`;
    const atributos = ATRIBUTOS.map((a) => `${a.abrev} ${attr(ficha, a.id)} (${sinal(modBX(attr(ficha, a.id)))})`).join(", ");
    const corpo = bonusAtaque(ficha, false);
    const dist = bonusAtaque(ficha, true);
    const salvas = salvasDe(ficha);
    const textoSalvas = SALVAS.map((s) => `${s.curto} ${salvas[s.id].alvo}${salvas[s.id].bonus ? ` (${sinal(salvas[s.id].bonus)})` : ""}`).join(", ");
    const valores = habilidadesAtuais(ficha);
    const habs = HABILIDADES.filter((h) => (h.tipo === "pct" ? (valores[h.id] ?? 0) > 0 : (valores[h.id] ?? 1) > 1 || h.id === "abrir-portas"))
      .map((h) => textoHabilidade(h, valores[h.id]))
      .join(", ");
    const recursos = Object.values(ficha.recursos).map((r) => `${r.rotulo} ${r.atual}/${r.max}`).join(", ");
    const proximo = xpDaClasse(ficha, ficha.nivel + 1);
    const pctXP = percentualXP(ficha, classe);
    const { max, lealdade } = seguidores(attr(ficha, "car"));
    const faltando = requisitosFaltando(ficha, classe);
    const aviso = avisoAlinhamento(ficha, classe);
    const livro = grimorio(ficha);
    const oficio = OFICIOS.find((o) => o.id === ficha.antecedente);
    const extras = [
      ficha.extras.divindade ? `Divindade: ${String(ficha.extras.divindade)}` : "",
      ficha.extras.juramento ? `Juramento: ${String(ficha.extras.juramento)}` : "",
      ficha.extras.inimigo ? `Inimigo jurado: ${String(ficha.extras.inimigo)}` : "",
    ].filter(Boolean);
    return `${ficha.nome} — ${raca} nível ${ficha.nivel}/${classe.nivelMax} · ${rotuloAlinhamento(ficha.extras.alinhamento)}${oficio ? ` · ex-${oficio.nome.toLowerCase()}` : ""}
XP ${ficha.xp}${proximo !== null ? ` (próximo nível: ${proximo})` : " (nível máximo)"} · ajuste de XP ${sinal(pctXP)}%
PV ${ficha.pv}/${ficha.pvMax} · CA ${ficha.defesa} (descendente ${19 - ficha.defesa}) · ${ficha.dinheiro} po
Atributos: ${atributos}
Ataque ${sinal(corpo.total)} (${classe.arma.nome}, ${classe.arma.dano}${modBX(attr(ficha, "for")) ? sinal(modBX(attr(ficha, "for"))) : ""}; THAC0 ${thac0(corpo.total)}) · à distância ${sinal(dist.total)} (${classe.distancia.nome}, ${classe.distancia.dano}) · iniciativa ${sinal(bonusIniciativa(ficha))}
Salvaguardas (d20 ≥): ${textoSalvas}
Habilidades: ${habs || "nenhuma"}
Classe: ${classe.habilidades.join("; ")}
Recursos: ${recursos || "nenhum"}${livro.length ? `\nGrimório: ${livro.join(", ")}` : ""}${extras.length ? `\n${extras.join(" · ")}` : ""}
Seguidores: até ${max}, lealdade ${lealdade} · Idiomas: ${idiomasExtras(attr(ficha, "int"))}
Inventário: ${ficha.inventario.join(", ") || "nada"}
Condições: ${ficha.condicoes.join(", ") || "nenhuma"}${faltando.length ? `\nRequisitos não atendidos: ${faltando.join(", ")}` : ""}${aviso ? `\nAviso: ${aviso}` : ""}${ficha.historia ? `\nHistória: ${ficha.historia}` : ""}`;
  },

  blocosFicha(ficha): BlocoFicha[] {
    const classe = classeDe(ficha);
    const corpo = bonusAtaque(ficha, false);
    const dist = bonusAtaque(ficha, true);
    const salvas = salvasDe(ficha);
    const valores = habilidadesAtuais(ficha);
    const proximo = xpDaClasse(ficha, ficha.nivel + 1);
    const racaObj = RACAS.find((r) => r.id === ficha.ancestralidade);
    const faltando = requisitosFaltando(ficha, classe);
    const aviso = avisoAlinhamento(ficha, classe);
    const livro = grimorio(ficha);

    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "PV", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
          ...Object.entries(ficha.recursos).map(([id, r]) => ({ rotulo: r.rotulo, atual: r.atual, max: r.max, cor: /^m\d$/.test(id) ? ("magia" as const) : ("outro" as const) })),
        ],
      },
      {
        tipo: "grade",
        itens: [
          { rotulo: "CA", valor: String(ficha.defesa), detalhe: `desc. ${19 - ficha.defesa}` },
          { rotulo: "Ataque", valor: sinal(corpo.total), detalhe: `THAC0 ${thac0(corpo.total)}` },
          { rotulo: "Distância", valor: sinal(dist.total), detalhe: classe.distancia.nome },
          { rotulo: "Iniciativa", valor: sinal(bonusIniciativa(ficha)), detalhe: "d6" },
          { rotulo: "XP", valor: String(ficha.xp), detalhe: proximo !== null ? `próx. ${proximo}` : "nível máximo" },
          { rotulo: "po", valor: String(ficha.dinheiro), detalhe: `XP ${sinal(percentualXP(ficha, classe))}%` },
        ],
      },
      {
        tipo: "grade",
        titulo: "Atributos",
        itens: ATRIBUTOS.map((a) => ({ rotulo: a.abrev, valor: String(attr(ficha, a.id)), detalhe: sinal(modBX(attr(ficha, a.id))) })),
      },
      {
        tipo: "grade",
        titulo: "Salvaguardas (d20 ≥)",
        itens: SALVAS.map((s) => ({ rotulo: s.curto, valor: String(salvas[s.id].alvo), detalhe: salvas[s.id].bonus ? `${sinal(salvas[s.id].bonus)} no dado` : undefined })),
      },
      {
        tipo: "etiquetas",
        titulo: "Habilidades",
        itens: HABILIDADES.filter((h) => (h.tipo === "pct" ? (valores[h.id] ?? 0) > 0 : true)).map((h) => textoHabilidade(h, valores[h.id] ?? 1)),
      },
      { tipo: "etiquetas", titulo: `Habilidades de ${classe.nome}`, itens: classe.habilidades },
    ];
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });
    if (!classe.raca && racaObj?.tracos?.length) blocos.push({ tipo: "etiquetas", titulo: `Traços de ${racaObj.nome}`, itens: racaObj.tracos });
    if (livro.length) blocos.push({ tipo: "lista", titulo: "Grimório", itens: livro });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    if (faltando.length || aviso) {
      blocos.push({
        tipo: "texto",
        titulo: "Pendências com as regras",
        texto: [faltando.length ? `Requisitos não atendidos (${faltando.join(", ")}): o mestre fez vista grossa.` : "", aviso ?? ""].filter(Boolean).join(" "),
      });
    }
    return blocos;
  },

  // a tabela depende da classe; sem ficha, usa a do guerreiro como referência
  xpParaNivel(nivel: number, ficha?: Ficha) {
    return ficha ? xpDaClasse(ficha, nivel) : nivel <= 1 ? 0 : (CLASSES[0].xp[nivel - 1] ?? null);
  },

  subirNivel(original) {
    const ficha = clonar(original);
    const classe = classeDe(ficha);
    if (ficha.nivel >= classe.nivelMax) {
      return { ficha, resumo: `${ficha.nome} já está no nível máximo de ${classe.nome} (${classe.nivelMax}). Agora é acumular ouro e fama.` };
    }
    const anterior = ficha.nivel;
    const novo = anterior + 1;
    ficha.nivel = novo;
    const partes: string[] = [];

    const ganho = novo <= classe.dvAte ? Math.max(1, d(classe.dv) + modBX(attr(ficha, "con"))) : classe.pvDepois;
    ficha.pvMax += ganho;
    ficha.pv += ganho;
    partes.push(`+${ganho} PV (agora ${ficha.pvMax})`);

    const atkAntes = bonusAtaqueBase(classe.ataque, anterior);
    const atkDepois = bonusAtaqueBase(classe.ataque, novo);
    if (atkDepois > atkAntes) partes.push(`ataque base ${sinal(atkDepois)} (THAC0 ${thac0(atkDepois)})`);

    const sAntes = salvasBase(classe.salvas, anterior);
    const sDepois = salvasBase(classe.salvas, novo);
    if (SALVAS.some((s) => sDepois[s.id] < sAntes[s.id])) partes.push(`salvaguardas melhores (${SALVAS.map((s) => `${s.curto} ${sDepois[s.id]}`).join(", ")})`);

    // habilidades: recalcula e preserva bônus que o mestre tenha dado
    const efeitos = efeitosRaca(ficha, classe);
    const habAntes = calcularHabilidades(classe, efeitos, anterior, ficha.atributos);
    const habDepois = calcularHabilidades(classe, efeitos, novo, ficha.atributos);
    const subiram: string[] = [];
    for (const [id, v] of Object.entries(habDepois)) {
      const ajuste = (ficha.pericias[id] ?? habAntes[id] ?? v) - (habAntes[id] ?? v);
      ficha.pericias[id] = v + ajuste;
      if (v > (habAntes[id] ?? 0)) {
        const h = HABILIDADES.find((x) => x.id === id);
        if (h) subiram.push(textoHabilidade(h, v + ajuste));
      }
    }
    if (subiram.length) partes.push(subiram.join(", "));

    const magiasAntes = magiasDoNivel(classe, anterior);
    const magiasDepois = magiasDoNivel(classe, novo);
    if (magiasDepois.join() !== magiasAntes.join()) partes.push(`magias por dia: ${magiasDepois.map((q, i) => `${q}×${CIRCULOS[i]}`).join(", ")}`);
    aplicarRecursos(ficha, recursosDaClasse(classe, novo));

    if (novo === 9 && ["guerreiro", "clerigo", "ladrao", "barbaro", "cavaleiro", "paladino", "anao"].includes(classe.id)) {
      partes.push("nível de nome: pode erguer fortaleza, templo ou guilda e atrair seguidores");
    }
    return { ficha, resumo: `${ficha.nome} chegou ao nível ${novo} de ${classe.nome}: ${partes.join("; ")}.` };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    if (tipo === "curto") {
      ficha.condicoes = ficha.condicoes.filter((c) => !/ofegante|cansad/.test(normalizar(c)));
      return { ficha, resumo: `${ficha.nome} descansou um turno e recuperou o fôlego. PV, nenhum: ferida aqui só fecha com tempo ou milagre.` };
    }
    const cura = d(3);
    const antes = ficha.pv;
    ficha.pv = Math.min(ficha.pvMax, ficha.pv + cura);
    for (const r of Object.values(ficha.recursos)) r.atual = r.max;
    ficha.condicoes = ficha.condicoes.filter((c) => !/ofegante|cansad|exaust|fadiga/.test(normalizar(c)));
    const temMagia = Object.keys(ficha.recursos).some((id) => /^m\d$/.test(id));
    return {
      ficha,
      resumo: `${ficha.nome} dormiu a noite toda: +${ficha.pv - antes} PV (1d3 = ${cura})${temMagia ? ", magias memorizadas de novo" : ""}${Object.keys(ficha.recursos).length ? ", recursos restaurados" : ""}.`,
    };
  },
};
