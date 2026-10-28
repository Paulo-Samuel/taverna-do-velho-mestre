import "server-only";
import { d } from "../dados";
import { clonar, distribuir, fichaBase, limitar, normalizar } from "./comum";
import {
  ATRIBUTOS,
  CATEGORIAS_ATRIBUTOS,
  CATEGORIAS_PERICIAS,
  CLAS,
  DISCIPLINAS,
  DISCIPLINAS_RESTRITAS,
  ESTILOS_PERICIAS,
  IDADES,
  PERICIAS,
  PERICIAS_COMUNS,
  POTENCIA,
  PREDADORES,
  SEITAS,
  type ClaVtm,
  type PredadorVtm,
} from "./vtm5/dados";
import {
  disciplinasDe,
  efeitosPotencia,
  fomeDe,
  humanidadeDe,
  ID,
  listaExtra,
  manchaDe,
  NOME_FRENESI,
  potenciaDe,
  ressonanciaDe,
  resolver,
  surtoPendenteDe,
  textoRessonancia,
  type ResultadoVtm,
} from "./vtm5/testes";
import { CONDICAO_FAMINTO, INTENSIDADES, RESSONANCIAS } from "./vtm5/sangue";
import type { BlocoFicha, Ficha, OpcaoCriacao, Sistema } from "./tipos";

// Vampiro: A Máscara 5ª edição — fã-conteúdo gratuito e não oficial sob a política Dark Pack da Paradox.
// Tabelas em vtm5/dados.ts e testes (parada de d10, Fome, críticos) em vtm5/testes.ts.
//
// Mapeamento para o contrato genérico:
//   classe = Clã · ancestralidade = Tipo de Predador · antecedente = Idade (Cria, Neófito, Ancila)
//   nivel = Potência de Sangue (0 a 10) · pv/pvMax = Saúde (Vigor + 3) · dinheiro = vantagem Recursos (0 a 5) · defesa 0
//   recursos: vontade (Força de Vontade), humanidade, fome (0 a 5) e mancha (Manchas; máx = caixas vazias de Humanidade).
//   A Mancha também fica espelhada em extras.mancha. Disciplinas em extras.disciplinas ({ id: pontos }).
// XP: V5 gasta XP em características, não em níveis. xpParaNivel devolve null; o jogador gasta o XP na própria ficha
// (vtm5/xp.ts, rota /personagens/[pid]/xp) e o histórico fica em extras.gastosXp. Rituais e fórmulas em extras.rituais / extras.formulas
// ([{nome, nivel}]). subirNivel aumenta a Potência de Sangue sem cobrar (o que no livro vem com a idade e a diablerie).

const MATRIZ_ATRIBUTOS = [4, 3, 3, 3, 2, 2, 2, 2, 1];

const claPorId = (id: string): ClaVtm => CLAS.find((c) => c.id === id) ?? CLAS[0];
const claDe = (ficha: Ficha) => claPorId(ficha.classe);
const predadorDe = (ficha: Ficha): PredadorVtm => PREDADORES.find((p) => p.id === ficha.ancestralidade) ?? PREDADORES[0];
const idadeDe = (ficha: Ficha) => IDADES.find((i) => i.id === ficha.antecedente) ?? IDADES[1];
const nomeDisciplina = (id: string) => DISCIPLINAS.find((x) => x.id === id)?.nome ?? id;
const nomePericia = (id: string) => PERICIAS.find((x) => x.id === id)?.nome ?? id;
const nomeAtributo = (id: string) => ATRIBUTOS.find((x) => x.id === id)?.nome ?? id;
const pontos = (n: number) => "●".repeat(Math.max(0, n));
const pontosDe5 = (n: number) => `${"●".repeat(limitar(n, 0, 5))}${"○".repeat(5 - limitar(n, 0, 5))}`;
const textoExtra = (ficha: Ficha, id: string) => (typeof ficha.extras[id] === "string" ? String(ficha.extras[id]).trim() : "");

/** Disciplinas que o clã pode escolher na criação. */
function disciplinasDoCla(cla: ClaVtm): string[] {
  if (cla.id === "caitiff") return DISCIPLINAS.filter((x) => !DISCIPLINAS_RESTRITAS[x.id]).map((x) => x.id);
  return cla.disciplinas;
}

/** O clã pode receber esta disciplina (ponto do tipo de predador)? Sangue-ralo não; restritas só para os clãs donos. */
function claPermite(cla: ClaVtm, disciplina: string): boolean {
  if (cla.id === "sangue_ralo") return false;
  const donos = DISCIPLINAS_RESTRITAS[disciplina];
  return !donos || donos.includes(cla.id);
}

/** Rituais (Feitiçaria de Sangue) ou fórmulas (Alquimia de Sangue-ralo) comprados: extras.rituais / extras.formulas. */
export function conhecimentosDe(ficha: Ficha, id: "rituais" | "formulas"): { nome: string; nivel: number }[] {
  const v = ficha.extras[id];
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === "object" ? (x as { nome?: unknown; nivel?: unknown }) : null))
    .filter((x): x is { nome: string; nivel: number } => Boolean(x && typeof x.nome === "string" && x.nome.trim() && typeof x.nivel === "number"))
    .map((x) => ({ nome: x.nome.trim(), nivel: limitar(Math.round(x.nivel), 1, 5) }));
}

const textoConhecimentos = (ficha: Ficha, id: "rituais" | "formulas") => conhecimentosDe(ficha, id).map((r) => `${r.nome} ${pontos(r.nivel)}`);

/** O que muda nos efeitos quando a Potência de Sangue vai de `antes` para `depois` (texto curto por efeito). */
export function mudancasPotencia(antes: number, depois: number): string[] {
  const ef0 = POTENCIA[limitar(antes, 0, 10)];
  const ef = POTENCIA[limitar(depois, 0, 10)];
  return [
    ef.surto !== ef0.surto ? `Surto +${ef.surto}` : "",
    ef.cura !== ef0.cura ? `cura ${ef.cura} por Despertar` : "",
    ef.bonusPoder !== ef0.bonusPoder ? `+${ef.bonusPoder} dados em disciplinas` : "",
    ef.rerrolagem !== ef0.rerrolagem ? `rerrola Despertar de disciplinas até nível ${ef.rerrolagem}` : "",
    ef.gravidade !== ef0.gravidade ? `perdição ${depois > antes ? "mais forte" : "mais fraca"} (gravidade ${ef.gravidade})` : "",
    ef.alimento !== ef0.alimento ? `alimentação: ${ef.alimento}` : "",
  ].filter(Boolean);
}

/** Recalcula máximos derivados (Saúde, Força de Vontade, caixas de Mancha) sem mexer no que foi gasto. */
export function sincronizar(ficha: Ficha) {
  const aut = ficha.atributos.autocontrole ?? 1;
  const det = ficha.atributos.determinacao ?? 1;
  ficha.pvMax = (ficha.atributos.vigor ?? 1) + 3;
  ficha.pv = limitar(ficha.pv, 0, ficha.pvMax);
  const r = ficha.recursos;
  const vontadeMax = aut + det;
  r.vontade = { rotulo: "Força de Vontade", atual: limitar(r.vontade?.atual ?? vontadeMax, 0, vontadeMax), max: vontadeMax };
  r.humanidade = { rotulo: "Humanidade", atual: limitar(r.humanidade?.atual ?? 7, 0, 10), max: 10 };
  r.fome = { rotulo: "Fome", atual: limitar(r.fome?.atual ?? 1, 0, 5), max: 5 };
  const caixas = 10 - r.humanidade.atual;
  const mancha = limitar(r.mancha?.atual ?? (typeof ficha.extras.mancha === "number" ? ficha.extras.mancha : 0), 0, caixas);
  r.mancha = { rotulo: "Manchas", atual: mancha, max: caixas };
  ficha.extras.mancha = mancha;
  ficha.nivel = limitar(ficha.nivel, 0, 10);
  ficha.defesa = 0;
}

/** Perícia a que uma especialidade "Medicina (anestésicos)" pertence. */
function periciaDaEspecialidade(esp: string): string | undefined {
  const nome = normalizar(esp.split("(")[0]);
  return PERICIAS.find((p) => normalizar(p.nome) === nome)?.id;
}

/** Distribui as perícias pelo estilo: o que passar da cota desce para o valor seguinte; o que faltar vem das sugestões. */
function distribuirPericias(ficha: Ficha, estiloId: string, cla: ClaVtm, predador: PredadorVtm): string[] {
  const estilo = ESTILOS_PERICIAS.find((e) => e.id === estiloId) ?? ESTILOS_PERICIAS[1];
  const validas = new Set(PERICIAS.map((p) => p.id));
  const escolhidasTodas = new Set([4, 3, 2, 1].flatMap((n) => listaExtra(ficha, `pericias_${n}`)).filter((p) => validas.has(p)));
  const sugestoes = [...cla.pericias, ...(predador.parada ? [predador.parada[1]] : []), ...PERICIAS_COMUNS].filter((p) => !escolhidasTodas.has(p));
  const reserva = PERICIAS.map((p) => p.id);
  const pericias: Record<string, number> = {};
  const completadas: string[] = [];
  let sobra: string[] = [];
  for (const valor of [4, 3, 2, 1]) {
    const cota = estilo.cotas[valor] ?? 0;
    const candidatas = [...new Set([...sobra, ...listaExtra(ficha, `pericias_${valor}`)])].filter((p) => validas.has(p) && !(p in pericias));
    const pegas = candidatas.slice(0, cota);
    sobra = candidatas.slice(cota);
    for (const p of pegas) pericias[p] = valor;
    for (const p of [...sugestoes, ...reserva]) {
      if (pegas.length >= cota) break;
      if (p in pericias || sobra.includes(p)) continue;
      pericias[p] = valor;
      pegas.push(p);
      completadas.push(`${nomePericia(p)} ${valor}`);
    }
  }
  ficha.pericias = pericias;
  return completadas;
}

/** Disciplinas iniciais: principal ●●, secundária ●, +1 da Ancila na secundária e +1 do tipo de predador quando o clã permite. */
function distribuirDisciplinas(ficha: Ficha, cla: ClaVtm, predador: PredadorVtm, extraIdade: number): string {
  const disc: Record<string, number> = {};
  const opcoes = disciplinasDoCla(cla);
  if (cla.id === "sangue_ralo") {
    disc.alquimia = 1;
    ficha.extras.disciplinas = disc;
    return "Sangue-ralo não recebe o ponto de disciplina do tipo de predador (só fórmulas de Alquimia).";
  }
  const pedida1 = textoExtra(ficha, `disciplinaPrincipal_${cla.id}`);
  const principal = opcoes.includes(pedida1) ? pedida1 : opcoes[0];
  const pedida2 = textoExtra(ficha, `disciplinaSecundaria_${cla.id}`);
  const secundaria = opcoes.includes(pedida2) && pedida2 !== principal ? pedida2 : opcoes.find((x) => x !== principal)!;
  disc[principal] = 2;
  disc[secundaria] = 1 + extraIdade;

  const pedidaPred = textoExtra(ficha, "disciplinaPredador").split(":");
  const permitidas = predador.disciplinas.filter((x) => claPermite(cla, x));
  const daPred =
    pedidaPred[0] === predador.id && permitidas.includes(pedidaPred[1])
      ? pedidaPred[1]
      : (permitidas.find((x) => cla.disciplinas.includes(x)) ?? permitidas[0]);
  let nota = "";
  if (daPred) {
    disc[daPred] = Math.min(5, (disc[daPred] ?? 0) + 1);
    ficha.extras.disciplinaPredador = daPred;
    nota = `+1 em ${nomeDisciplina(daPred)} pelo tipo de predador`;
  } else {
    nota = `o clã não aprende ${predador.disciplinas.map(nomeDisciplina).join(" nem ")}: sem ponto do tipo de predador`;
  }
  ficha.extras.disciplinas = disc;
  return nota;
}

function paradaCaca(ficha: Ficha): string {
  const pred = predadorDe(ficha);
  if (!pred.parada) return pred.paradaTexto;
  const [a, p] = pred.parada;
  const valor = (ficha.atributos[a] ?? 1) + (ficha.pericias[p] ?? 0);
  return `${pred.paradaTexto} = ${valor} dado(s)`;
}

function textoPotencia(ficha: Ficha): string {
  const ef = efeitosPotencia(ficha);
  return `Surto +${ef.surto} dados · cura ${ef.cura} superficial por Despertar · +${ef.bonusPoder} em disciplinas · rerrola Despertar de disciplinas nível ≤${ef.rerrolagem} · gravidade da perdição ${ef.gravidade} · ${ef.alimento}`;
}

/** Ressonância da última caça e Surto guardado, para o mestre (vazio quando não há nenhum). */
function textoSangue(ficha: Ficha): string {
  const res = ressonanciaDe(ficha);
  const partes = [
    res
      ? `Ressonância ${textoRessonancia(res)} (${INTENSIDADES[res.intensidade].bonus ? `+1 dado em ${res.disciplinas.map(nomeDisciplina).join(" e ")}, automático` : "sem efeito nos dados"})`
      : "",
    surtoPendenteDe(ficha) ? `Surto de Sangue guardado: +${surtoPendenteDe(ficha)} dados no próximo teste (automático)` : "",
  ].filter(Boolean);
  return partes.join(" · ");
}

// ---------- opções de criação ----------

const OPCOES_PERICIAS = PERICIAS.map((p) => ({ id: p.id, nome: p.nome, descricao: p.descricao }));

const OPCOES: OpcaoCriacao[] = [
  {
    id: "estilo",
    rotulo: "Distribuição de perícias",
    ajuda: "Escolha o estilo e depois as perícias de cada valor. O que passar da cota desce um valor; o que faltar o clã completa.",
    tipo: "escolha",
    opcoes: ESTILOS_PERICIAS.map(({ id, nome, descricao }) => ({ id, nome, descricao })),
  },
  ...[4, 3, 2, 1].map((n): OpcaoCriacao => {
    const rotulos: Record<number, [string, string | undefined]> = {
      4: ["Perícia em ●●●● (só Especialista)", undefined],
      3: ["Perícias em ●●●", "Faz-tudo 1, Equilibrado 3, Especialista 3."],
      2: ["Perícias em ●●", "Faz-tudo 8, Equilibrado 5, Especialista 3."],
      1: ["Perícias em ●", "Faz-tudo 10, Equilibrado 7, Especialista 3."],
    };
    // a cota de cada valor segue o estilo (em branco, Equilibrado); a mesma perícia não entra em dois valores
    const cotas = Object.fromEntries(ESTILOS_PERICIAS.map((e) => [e.id, e.cotas[n] ?? 0]));
    const outras = [4, 3, 2, 1].filter((x) => x !== n).map((x) => `pericias_${x}`);
    const [rotulo, ajuda] = rotulos[n];
    return { id: `pericias_${n}`, rotulo, ajuda, tipo: "multipla", max: Math.max(...Object.values(cotas)), opcoes: OPCOES_PERICIAS, maxPor: { opcao: "estilo", valores: cotas, padrao: "equilibrado" }, exclusivaCom: outras };
  }),
  {
    id: "especialidades",
    rotulo: "Especialidades",
    ajuda: "No formato “Perícia (foco)”, ex.: “Lábia (sedução)”. Dão +1 dado quando o teste cita o foco. A do tipo de predador já vem.",
    tipo: "lista-texto",
    max: 4,
  },
  ...CLAS.filter((c) => c.id !== "sangue_ralo").flatMap((cla): OpcaoCriacao[] => {
    const opcoes = disciplinasDoCla(cla).map((id) => {
      const x = DISCIPLINAS.find((y) => y.id === id)!;
      return { id, nome: x.nome, descricao: x.descricao };
    });
    return [
      { id: `disciplinaPrincipal_${cla.id}`, rotulo: "Disciplina principal (●●)", tipo: "escolha", opcoes, classes: [cla.id], exclusivaCom: [`disciplinaSecundaria_${cla.id}`] },
      { id: `disciplinaSecundaria_${cla.id}`, rotulo: "Disciplina secundária (●)", ajuda: "Diferente da principal.", tipo: "escolha", opcoes, classes: [cla.id], exclusivaCom: [`disciplinaPrincipal_${cla.id}`] },
    ];
  }),
  {
    id: "disciplinaPredador",
    rotulo: "Disciplina do tipo de predador (+1)",
    ajuda: "Uma das duas do seu tipo de predador. Feitiçaria de Sangue e Oblívio só para os clãs donos; Sangue-ralo não ganha.",
    tipo: "escolha",
    opcoes: PREDADORES.flatMap((p) => p.disciplinas.map((x) => ({ id: `${p.id}:${x}`, nome: nomeDisciplina(x), ancestralidades: [p.id] }))),
  },
  {
    id: "recursos",
    rotulo: "Recursos (vantagem)",
    ajuda: "Dinheiro e bens, de 0 a 5. Em branco, 1.",
    tipo: "escolha",
    opcoes: [
      { id: "0", nome: "0 — sem nada", descricao: "Dorme onde dá e bebe de graça." },
      { id: "1", nome: "● — bicos", descricao: "Um quarto alugado e um celular rachado." },
      { id: "2", nome: "●● — classe média", descricao: "Apartamento, carro usado, contas em dia." },
      { id: "3", nome: "●●● — confortável", descricao: "Casa boa, carro bom, ninguém pergunta de onde vem." },
      { id: "4", nome: "●●●● — rico", descricao: "Imóveis, motorista, advogado de plantão." },
      { id: "5", nome: "●●●●● — fortuna", descricao: "Compra o prédio se o vizinho incomodar." },
    ],
  },
  { id: "conceito", rotulo: "Conceito", ajuda: "Quem você é em poucas palavras: “ex-policial afogado em culpa”.", tipo: "texto" },
  { id: "ambicao", rotulo: "Ambição", ajuda: "O objetivo de longo prazo que faz a eternidade valer a pena.", tipo: "texto" },
  { id: "desejo", rotulo: "Desejo", ajuda: "O que você quer agora, nesta noite.", tipo: "texto" },
  { id: "senhor", rotulo: "Senhor (quem te Abraçou)", tipo: "texto" },
  { id: "seita", rotulo: "Seita", tipo: "escolha", opcoes: SEITAS },
  { id: "conviccoes", rotulo: "Convicções", ajuda: "Regras morais que você não quebra (até quebrar).", tipo: "lista-texto", max: 3 },
  { id: "pedrasToque", rotulo: "Pedras de Toque", ajuda: "Mortais que te ancoram, um por convicção: “Ana, minha irmã (nunca matar inocentes)”.", tipo: "lista-texto", max: 3 },
  { id: "vantagens", rotulo: "Vantagens", ajuda: "Antecedentes e méritos com pontos: “Refúgio ●●”, “Contatos ●”. As do tipo de predador já vêm.", tipo: "lista-texto", max: 10 },
  { id: "defeitos", rotulo: "Defeitos", ajuda: "“Inimigo ●”, “Presa Exclusiva ●”... Os do tipo de predador já vêm.", tipo: "lista-texto", max: 10 },
];

// ---------- regras para o mestre ----------

const REGRAS = `Sistema: Vampiro: A Máscara 5ª edição (V5). Fã-conteúdo; mecânica resumida.
TESTES — parada de d10 = atributo + perícia (ou atributo + atributo, ou atributo + disciplina). Cada dado 6+ é um sucesso; cada PAR de 10 vale 4 sucessos no total. Ao testar (teste ou pedir_teste):
- teste: "Destreza + Furtividade", "Raciocínio + Percepção", "Carisma + Persuasão"; só a perícia ("Furtividade") usa o atributo usual; só o atributo ("Força") faz par com outro atributo; disciplina ("Dominação", "Presença", "Auspícios", "Celeridade"...) soma o atributo usual (pode dizer "Carisma + Dominação"). Especialidade: escreva o foco entre parênteses ("Lábia (sedução)") e, se a ficha tiver, ganha +1 dado.
- PODERES: disciplina na parada ("Destreza + Celeridade", "Raciocínio + Auspícios") já rola o Despertar do poder junto (1 por padrão) e sobe a Fome sozinho. Poder que não custa sangue (vários de nível 1, passivos): custo_despertar 0; poder que custa 2: custo_despertar 2; nivel_poder ajuda a Potência de Sangue a rerrolar. Poder usado SEM teste (Celeridade para correr, Fortitude para aguentar, Ofuscação para sumir): despertar_sangue com o motivo. Nunca faça a conta da Fome de cabeça.
- Especiais: "Ataque" (escolhe Briga, Armas Brancas ou Armas de Fogo pela arma citada), "Iniciativa" (Raciocínio + Percepção, sem dificuldade), "Força de Vontade". Caça, Despertar, Surto, Frenesi e Remorso têm ferramentas próprias (abaixo).
- alvo = DIFICULDADE em sucessos (padrão 1): 1 rotineiro, 2 direto, 3 moderado, 4 desafiador, 5 muito difícil, 6+ quase impossível. Em disputa, role o NPC com rolar_dados (Nd10, conte 6+) e use os sucessos dele como alvo.
- Ajuda ou atrapalho = ±2 dados (modificador ±2 no teste ou no pedir_teste, mínimo 1 dado).
- Resultado: total ≥ alvo = Sucesso; com par de 10 = Crítico. Se faltar pouco (0 < sucessos < alvo), ofereça VITÓRIA A UM CUSTO (dano, Mancha, barulho, testemunha, Fome).
FOME (0 a 5, recurso "fome") — cada ponto troca um dado da parada por um dado de Fome (o servidor faz isso; não vale em Despertar, Frenesi, Remorso e Força de Vontade). Crítico Sujo (um 10 de Fome no par): consegue, e além da conta, do jeito da Besta — brutal, exagerado, à vista de alguém. Falha Bestial (falhou com um 1 de Fome): a Besta escapa — compulsão, violência ou vexame. Nunca narre os dois como sucesso ou falha comuns.
- DESPERTAR (1d10: 6+ nada; 1–5 = +1 de Fome; o servidor rola e aplica): poder em teste já vem junto; fora de teste use despertar_sangue (poder sem teste, corar e comer para parecer vivo). descansar já faz o da cura e o do acordar. Com Fome 5 a falha não sobe: o sangue não responde, o poder não sai e a Besta cobra — chame testar_frenesi tipo "fome".
- SURTO DE SANGUE: surto_de_sangue rola o Despertar e guarda +dados (Potência) para o PRÓXIMO teste do personagem, que os gasta sozinho (não vale em disciplina).
- Fome 4–5: descreva a Besta arranhando por dentro; o personagem fica irritadiço, distraído pelo pulso alheio.
ALIMENTAÇÃO — cacar (dificuldade 2–4 conforme o lugar; parada do Tipo de Predador). O servidor baixa a Fome (1, ou 2 com folga; sem matar não desce de 1), aplica a Potência, grava a Ressonância (sorteada ou a que você der: colérica, melancólica, fleumática, sanguínea, vazia) e marca compulsão na Falha Bestial. matar: true zera a Fome e dá Manchas (manchas: N; padrão 2). Ressonância intensa ou aguda = +1 dado nas disciplinas ligadas até a próxima caça (automático). Falha: complicação (vítima foge, testemunha, briga, Máscara em risco).
MASCARADA — esconder a existência dos vampiros é a lei de todas as seitas. Quebras chamam caçadores, a Segunda Inquisição e a ira do Príncipe ou do Barão. Câmeras, celulares e testemunhas importam.
HUMANIDADE (recurso "humanidade", 0–10) e MANCHAS (recurso "mancha") — atos monstruosos ou contra as Convicções dão Manchas: alterar_ficha recursos {"mancha": 1 a 3} (matar inocente vale 3+). Manchas que preenchem todas as caixas vazias deixam o personagem atormentado (−2 dados, o servidor aplica). Ao fechar a noite ou o capítulo (amanhecer, fim de arco), quem tem Manchas faz teste_de_remorso (10 − Humanidade − Manchas dados, mínimo 1): sucesso limpa as Manchas; falha tira 1 de Humanidade e limpa as Manchas (o servidor aplica). Humanidade baixa = mais monstro: menos parece humano, dorme mais, frenesis mais fáceis. Humanidade 0 = perdido para a Besta (vira NPC). Pedras de Toque feridas ou mortas doem: Manchas e perda de Convicção.
FRENESI E COMPULSÕES — provocação, fogo, sol ou fome extrema pedem testar_frenesi (Força de Vontade + Humanidade/3; tipo fúria, fome ou terror; dificuldade 2 leve a 4–5 fogo na cara ou Fome 5 diante de sangue). Falha = a Besta age até o fim da cena (o servidor marca "Frenesi (tipo)"; tire com alterar_ficha quando a cena acabar). Gastar 1 de Força de Vontade (alterar_ficha recursos {"vontade": -1}) pode adiar um turno. Compulsão ativa: −2 dados em tudo que não a sirva.
FORÇA DE VONTADE (recurso "vontade") — rerrolar até 3 dados normais (−1 FV) é do JOGADOR: no teste que ele rola (pedir_teste), se falhou e há FV, o cartão oferece rerrolar antes de o resultado chegar a você, e o servidor já aplica o gasto. Não faça a conta nem simule com rolar_dados; se ele pedir rerrolagem num teste que você rolou, diga que vale só nos testes que ele mesmo rola. Dano mental/social também tira Força de Vontade.
DANO — Saúde = Vigor + 3 (pv). Superficial: vampiros dividem por 2 (arredonde para cima) ANTES de aplicar com alterar_ficha pv −N. Agravado (fogo, sol, garras e presas de lobisomem, alguns poderes) entra inteiro: aplique e anote a condição "agravado N" (só cura com noites de descanso e muito sangue). Armas somam dano à margem de sucesso do ataque (soco +0, faca +1, espada/taco +2, pistola +2, espingarda +4). Mortais e lacaios caem rápido (Saúde 3–7).
TORPOR E MORTE FINAL — Saúde 0 por dano superficial = torpor (o servidor marca "inconsciente": trate como torpor, dias a anos). Saúde 0 por dano agravado, estaca no coração + fogo/sol, decapitação = Morte Final. Estaca no coração paralisa, não mata.
CONFLITO — sem rodadas rígidas: descreva a situação, cada um declara, resolva por ordem lógica (atirador antes do soco, Celeridade antes de todos). "Iniciativa" só se a mesa pedir ordem. Ataque: atacante vs. defesa do alvo (Destreza + Atletismo para esquivar, Força + Briga para bloquear); margem = dano.
POTÊNCIA DE SANGUE (nível da ficha) — dá dados de Surto, cura por Despertar, bônus em disciplinas e gravidade da perdição (veja a ficha). Sobe com o tempo e a diablerie (subir_nivel, sem custo) ou com XP que o jogador gasta.
XP — você só CONCEDE (conceder_xp): 1 a 3 por sessão (o máximo quando o personagem perseguiu a Ambição, pôs as Convicções à prova ou fez uma cena memorável), um pouco mais no fim de um arco. O jogador GASTA sozinho na ficha (botão "Gastar XP"), pela tabela do livro: atributo novo nível ×5, perícia ×3, especialidade 3, disciplina do clã ×5, de fora ×7 (Caitiff ×6), ritual/fórmula nível ×3, vantagem 3 por ponto, Potência ×10. Cada compra vira uma linha no chat e a ficha nova chega no próximo turno; não altere a ficha para "aplicar" XP. Pode lembrar o jogador de gastar, e disciplina de fora do clã pede justificativa na história (beber o sangue de quem a tem, um mentor): cobre isso em cena.
VITAE E LAÇOS — beber sangue de vampiro três vezes, em noites diferentes, cria Laço de Sangue: devoção artificial ao doador. Vitae dada a mortais cria carniçais. Diablerie (beber a alma de outro vampiro) é crime capital e mancha a aura.
COMO MESTRAR V5
- Horror pessoal: o monstro é o personagem. Cada noite traz uma tentação e um preço; deixe-o escolher e cobre depois. O caminho humano custa caro; o fácil é monstruoso.
- Convicções e Pedras de Toque no centro: ponha as Pedras em risco (doença, polícia, um Membro curioso) e confronte as Convicções com dilemas sem saída limpa. Pedra ferida ou morta por culpa dele = Manchas, e a Convicção perde o freio. A Ambição move o arco; o Desejo da noite gera cenas.
- A Besta tem voz: Fome alta aparece na narração (o pulso alheio, o cheiro, a mordida imaginada). Depois de Crítico Sujo ou Falha Bestial, imponha a compulsão do clã (ou uma genérica: Fome, Dominação, Agressão, Arrogância) como condição e tire quando satisfeita ou a cena mudar. A Perdição do clã também entra em cena.
- Caça é cena, não teste solto: o Tipo de Predador diz onde e como (boate, rua, rebanho, bolsa comprada); a Ressonância do sangue (alegria, medo, raiva, melancolia) colore o momento. A vítima tem rosto.
- Máscara: câmeras, celulares e testemunhas importam. Quebra tem efeito em cadeia: o Xerife cobra, o Príncipe (ou o Barão) pede favor ou cabeça, as Harpias espalham, a Segunda Inquisição aparece (vigilância, batida de dia, fogo). Registre no diário.
- Política: Camarilla (Príncipe, Xerife, Harpias, tradição), Anarquistas (Barões, liberdade cara), Sabá e caçadores à margem. Favor é moeda: anote cada dívida com anotar_diario e cobre na pior hora. Anciões mentem, aliados cobram, ninguém é só vilão.
- Relógio: o sol nasce. Marque a hora com atualizar_cena e aperte quando a noite acaba; o refúgio é a única segurança e pode cair.
- Tom: íntimo, urbano, sensual e sujo; violência rápida e feia; o horror vem do que o personagem faz e do que perde, não de sustos. Anote todo NPC relevante (Príncipe, Xerife, Barão, senhor, Pedras de Toque, rivais).`;

// ---------- o sistema ----------

export const vtm5: Sistema = {
  id: ID,
  nome: "Vampiro: A Máscara 5ª Edição",
  nomeCurto: "Vampiro V5",
  descricao: "Horror pessoal e intriga sob a Mascarada: parada de d10, sucessos em 6+, Fome que vira dados da Besta, Humanidade em risco. 16 clãs, 18 tipos de predador.",
  licenca: "Fã-conteúdo não oficial sob a política Dark Pack — Vampire: The Masquerade © Paradox Interactive AB",
  dadoPrincipal: "d10",
  pronto: true,
  rotulos: { ancestralidade: "Tipo de Predador", classe: "Clã", antecedente: "Idade", nivel: "Potência de Sangue", defesa: "Defesa", dinheiro: "Recursos", pv: "Saúde" },
  atributos: ATRIBUTOS,
  pericias: PERICIAS.map(({ id, nome, atributo, descricao }) => ({ id, nome, atributo, descricao })),
  classes: CLAS.map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: `${c.descricao} Disciplinas: ${c.id === "caitiff" ? "quaisquer" : c.disciplinas.map(nomeDisciplina).join(", ")}. Perdição: ${c.perdicao}${c.compulsao ? ` Compulsão: ${c.compulsao.nome}.` : ""}`,
    atributoChave: c.atributoChave,
    pericias: c.pericias.slice(0, 4),
    papel: c.papel,
    fonte: c.id === "salubri" || c.id === "tzimisce" || c.id === "lasombra" || c.id === "hecata" || c.id === "ravnos" ? "Expansões V5" : "Livro básico V5",
  })),
  ancestralidades: PREDADORES.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: `${p.descricao} Caça: ${p.paradaTexto}.`,
    tracos: [
      `Especialidade: ${p.especialidades.join(" ou ")}`,
      `+1 em ${p.disciplinas.map(nomeDisciplina).join(" ou ")}`,
      ...(p.humanidade ? [`Humanidade ${p.humanidade > 0 ? "+" : ""}${p.humanidade}`] : []),
      ...(p.potencia ? [`Potência de Sangue +${p.potencia}`] : []),
      ...p.vantagens,
      ...p.defeitos,
    ],
  })),
  antecedentes: IDADES.map(({ id, nome, descricao }) => ({ id, nome, descricao })),
  opcoesCriacao: OPCOES,
  metodosAtributos: [
    { id: "padrao", nome: "Distribuição do livro", descricao: "Um atributo em 4, três em 3, quatro em 2 e um em 1, pela prioridade do clã." },
    { id: "livre", nome: "Livre", descricao: "Digite cada atributo de 1 a 5. O livro sugere 4/3/3/3/2/2/2/2/1." },
  ],
  limitesAtributos: { min: 1, max: 5 },
  periciasEscolhiveis: 0,
  nivelMaximo: 10,
  testesSugeridos: [
    "Destreza + Furtividade", "Raciocínio + Percepção", "Carisma + Persuasão", "Manipulação + Lábia", "Força + Briga",
    "Inteligência + Investigação", "Ataque", "Caça", "Dominação", "Presença", "Despertar", "Frenesi", "Remorso", "Força de Vontade", "Iniciativa",
  ],
  regrasParaMestre: REGRAS,

  atributosIniciais(classeId) {
    return distribuir(MATRIZ_ATRIBUTOS, claPorId(classeId).ordem);
  },

  criarFicha(entrada) {
    const cla = claPorId(entrada.classe);
    const predador = PREDADORES.find((p) => p.id === entrada.ancestralidade) ?? PREDADORES[0];
    const idade = IDADES.find((i) => i.id === entrada.antecedente) ?? IDADES[1];
    const ficha = fichaBase(ID, entrada.nome);
    ficha.classe = cla.id;
    ficha.ancestralidade = predador.id;
    ficha.antecedente = idade.id;
    ficha.historia = entrada.historia ?? "";
    ficha.extras = { ...(entrada.extras ?? {}) };

    const atributos = { ...(entrada.atributos ?? vtm5.atributosIniciais(cla.id, "padrao")) };
    for (const a of ATRIBUTOS) atributos[a.id] = limitar(Math.round(Number(atributos[a.id]) || 1), 1, 5);
    ficha.atributos = atributos;

    const estilo = ESTILOS_PERICIAS.some((e) => e.id === ficha.extras.estilo) ? String(ficha.extras.estilo) : "equilibrado";
    ficha.extras.estilo = estilo;
    const completadas = distribuirPericias(ficha, estilo, cla, predador);

    // especialidade do tipo de predador (dá 1 ponto se a perícia estava zerada) + as do jogador
    const espPredador = predador.especialidades[0];
    const periciaEsp = periciaDaEspecialidade(espPredador);
    if (periciaEsp && !ficha.pericias[periciaEsp]) ficha.pericias[periciaEsp] = 1;
    const doJogador = listaExtra(ficha, "especialidades");
    ficha.extras.especialidades = [espPredador, ...doJogador.filter((e) => normalizar(e) !== normalizar(espPredador))];

    const notaDisciplina = distribuirDisciplinas(ficha, cla, predador, idade.disciplinaExtra);

    ficha.nivel = cla.id === "sangue_ralo" ? 0 : limitar(idade.potencia + (predador.potencia ?? 0), 0, 10);
    ficha.extras.geracao = cla.id === "sangue_ralo" ? 14 : idade.geracao;
    ficha.xp = idade.xp;

    const humanidade = limitar(7 + predador.humanidade + idade.humanidade, 0, 10);
    ficha.recursos = { vontade: { rotulo: "Força de Vontade", atual: 99, max: 99 }, humanidade: { rotulo: "Humanidade", atual: humanidade, max: 10 }, fome: { rotulo: "Fome", atual: 1, max: 5 }, mancha: { rotulo: "Manchas", atual: 0, max: 10 - humanidade } };
    ficha.pv = 99;
    sincronizar(ficha);
    ficha.pv = ficha.pvMax;
    ficha.recursos.vontade.atual = ficha.recursos.vontade.max;

    const recursosEscolhidos = Number(textoExtra(ficha, "recursos") || 1);
    ficha.dinheiro = limitar((Number.isFinite(recursosEscolhidos) ? recursosEscolhidos : 1) + (predador.recursos ?? 0), 0, 5);
    ficha.extras.vantagens = [...predador.vantagens, ...listaExtra(ficha, "vantagens")];
    ficha.extras.defeitos = [...predador.defeitos, ...listaExtra(ficha, "defeitos")];
    ficha.extras.notasCriacao = [notaDisciplina, completadas.length ? `perícias completadas: ${completadas.join(", ")}` : ""].filter(Boolean);
    ficha.inventario = ["celular", "chaves do refúgio", "documentos (talvez falsos)", "roupas escuras", ...predador.equipamento];
    return ficha;
  },

  resolverTeste(ficha, pedido) {
    const copia = clonar(ficha);
    sincronizar(copia);
    return resolver(copia, pedido);
  },

  descreverParaMestre(original) {
    const ficha = clonar(original);
    sincronizar(ficha);
    const cla = claDe(ficha);
    const pred = predadorDe(ficha);
    const idade = idadeDe(ficha);
    const ef = efeitosPotencia(ficha);
    const r = ficha.recursos;
    const seita = SEITAS.find((s) => s.id === textoExtra(ficha, "seita"))?.nome;
    const atributos = CATEGORIAS_ATRIBUTOS.map((c) => `${c.titulo}: ${c.ids.map((id) => `${nomeAtributo(id)} ${ficha.atributos[id] ?? 1}`).join(", ")}`).join(" · ");
    const pericias = PERICIAS.filter((p) => ficha.pericias[p.id]).map((p) => `${p.nome} ${ficha.pericias[p.id]}`).join(", ");
    const disciplinas = Object.entries(disciplinasDe(ficha))
      .filter(([, v]) => v > 0)
      .map(([id, v]) => `${nomeDisciplina(id)} ${v} (${nomeAtributo(DISCIPLINAS.find((x) => x.id === id)?.atributo ?? "")} + ${nomeDisciplina(id)})`)
      .join(", ");
    const lista = (id: string) => listaExtra(ficha, id).join("; ");
    const mancha = manchaDe(ficha);
    const linhas = [
      `${ficha.nome} — ${cla.nome}, ${pred.nome}, ${idade.nome} · ${ficha.extras.geracao ?? idade.geracao}ª geração · Potência de Sangue ${potenciaDe(ficha)}${seita ? ` · ${seita}` : ""}${textoExtra(ficha, "senhor") ? ` · Senhor: ${textoExtra(ficha, "senhor")}` : ""}`,
      textoExtra(ficha, "conceito") ? `Conceito: ${textoExtra(ficha, "conceito")}` : "",
      `Saúde ${ficha.pv}/${ficha.pvMax} · Força de Vontade [vontade] ${r.vontade.atual}/${r.vontade.max} · Humanidade [humanidade] ${humanidadeDe(ficha)} · Manchas [mancha] ${mancha}/${r.mancha.max}${mancha && mancha >= r.mancha.max ? " (ATORMENTADO: −2 dados)" : ""} · Fome [fome] ${fomeDe(ficha)}/5 · Recursos ${ficha.dinheiro} · XP ${ficha.xp}`,
      `Atributos: ${atributos}`,
      `Perícias: ${pericias || "nenhuma"}`,
      lista("especialidades") ? `Especialidades: ${lista("especialidades")}` : "",
      `Disciplinas: ${disciplinas || "nenhuma"}`,
      textoConhecimentos(ficha, "rituais").length ? `Rituais de Feitiçaria de Sangue: ${textoConhecimentos(ficha, "rituais").join(", ")}` : "",
      textoConhecimentos(ficha, "formulas").length ? `Fórmulas de Alquimia: ${textoConhecimentos(ficha, "formulas").join(", ")}` : "",
      `Potência de Sangue ${potenciaDe(ficha)}: ${textoPotencia(ficha)}`,
      `Perdição (gravidade ${ef.gravidade}): ${cla.perdicao}`,
      `Compulsão do clã: ${cla.compulsao ? `${cla.compulsao.nome} — ${cla.compulsao.efeito}` : "nenhuma (use as genéricas)"}`,
      `Caça: ${paradaCaca(ficha)}`,
      textoSangue(ficha),
      textoExtra(ficha, "ambicao") || textoExtra(ficha, "desejo") ? `Ambição: ${textoExtra(ficha, "ambicao") || "—"} · Desejo: ${textoExtra(ficha, "desejo") || "—"}` : "",
      lista("conviccoes") ? `Convicções: ${lista("conviccoes")}` : "",
      lista("pedrasToque") ? `Pedras de Toque: ${lista("pedrasToque")}` : "",
      lista("vantagens") ? `Vantagens: ${lista("vantagens")}` : "",
      lista("defeitos") ? `Defeitos: ${lista("defeitos")}` : "",
      `Inventário: ${ficha.inventario.join(", ") || "nada"}`,
      `Condições: ${ficha.condicoes.join(", ") || "nenhuma"}${ficha.pv === 0 ? " (Saúde 0: torpor ou Morte Final, conforme o dano)" : ""}`,
      ficha.historia ? `História: ${ficha.historia}` : "",
    ];
    return linhas.filter(Boolean).join("\n");
  },

  blocosFicha(original): BlocoFicha[] {
    const ficha = clonar(original);
    sincronizar(ficha);
    const cla = claDe(ficha);
    const pred = predadorDe(ficha);
    const idade = idadeDe(ficha);
    const ef = efeitosPotencia(ficha);
    const r = ficha.recursos;
    const blocos: BlocoFicha[] = [
      {
        tipo: "barras",
        itens: [
          { rotulo: "Saúde", atual: ficha.pv, max: ficha.pvMax, cor: "vida" },
          { rotulo: "Força de Vontade", atual: r.vontade.atual, max: r.vontade.max, cor: "magia" },
          { rotulo: "Humanidade", atual: r.humanidade.atual, max: 10, cor: "sanidade" },
          { rotulo: "Fome", atual: r.fome.atual, max: 5, cor: "outro" },
        ],
      },
      {
        tipo: "grade",
        itens: [
          { rotulo: "Potência de Sangue", valor: String(potenciaDe(ficha)), detalhe: `Surto +${ef.surto} · cura ${ef.cura}` },
          { rotulo: "Geração", valor: `${ficha.extras.geracao ?? idade.geracao}ª`, detalhe: idade.nome },
          { rotulo: "Manchas", valor: `${manchaDe(ficha)}/${r.mancha.max}`, detalhe: manchaDe(ficha) && manchaDe(ficha) >= r.mancha.max ? "atormentado" : undefined },
          { rotulo: "Recursos", valor: pontos(ficha.dinheiro) || "0" },
          { rotulo: "Perdição", valor: `gravidade ${ef.gravidade}` },
          { rotulo: "Caça", valor: pred.parada ? `${nomeAtributo(pred.parada[0])} + ${nomePericia(pred.parada[1])}` : "especial" },
          ...(ressonanciaDe(ficha) ? [{ rotulo: "Ressonância", valor: RESSONANCIAS[ressonanciaDe(ficha)!.tipo].nome, detalhe: INTENSIDADES[ressonanciaDe(ficha)!.intensidade].nome }] : []),
          ...(surtoPendenteDe(ficha) ? [{ rotulo: "Surto guardado", valor: `+${surtoPendenteDe(ficha)}`, detalhe: "no próximo teste" }] : []),
        ],
      },
      ...CATEGORIAS_ATRIBUTOS.map(
        (c): BlocoFicha => ({
          tipo: "grade",
          titulo: `Atributos ${c.titulo.toLowerCase()}`,
          itens: c.ids.map((id) => ({ rotulo: nomeAtributo(id), valor: String(ficha.atributos[id] ?? 1), detalhe: pontosDe5(ficha.atributos[id] ?? 1) })),
        }),
      ),
      ...CATEGORIAS_PERICIAS.map(
        (c): BlocoFicha => ({
          tipo: "etiquetas",
          titulo: `Perícias ${c.titulo.toLowerCase()}`,
          itens: c.ids.filter((id) => (ficha.pericias[id] ?? 0) > 0).map((id) => `${nomePericia(id)} ${pontos(ficha.pericias[id])}`),
        }),
      ).filter((b) => b.tipo === "etiquetas" && b.itens.length),
    ];
    const esp = listaExtra(ficha, "especialidades");
    if (esp.length) blocos.push({ tipo: "etiquetas", titulo: "Especialidades", itens: esp });
    const disc = Object.entries(disciplinasDe(ficha)).filter(([, v]) => v > 0);
    blocos.push({ tipo: "etiquetas", titulo: "Disciplinas", itens: disc.length ? disc.map(([id, v]) => `${nomeDisciplina(id)} ${pontos(v)}`) : ["nenhuma"] });
    if (textoConhecimentos(ficha, "rituais").length) blocos.push({ tipo: "etiquetas", titulo: "Rituais", itens: textoConhecimentos(ficha, "rituais") });
    if (textoConhecimentos(ficha, "formulas").length) blocos.push({ tipo: "etiquetas", titulo: "Fórmulas", itens: textoConhecimentos(ficha, "formulas") });
    blocos.push({
      tipo: "texto",
      titulo: `Clã: ${cla.nome}`,
      texto: [cla.descricao, `Perdição (gravidade ${ef.gravidade}): ${cla.perdicao}`, cla.compulsao ? `Compulsão — ${cla.compulsao.nome}: ${cla.compulsao.efeito}` : "Sem compulsão de clã."].join("\n"),
    });
    blocos.push({ tipo: "texto", titulo: `Tipo de Predador: ${pred.nome}`, texto: `${pred.descricao}\nCaça: ${paradaCaca(ficha)}` });
    const pessoal = [
      textoExtra(ficha, "conceito") ? `Conceito: ${textoExtra(ficha, "conceito")}` : "",
      textoExtra(ficha, "ambicao") ? `Ambição: ${textoExtra(ficha, "ambicao")}` : "",
      textoExtra(ficha, "desejo") ? `Desejo: ${textoExtra(ficha, "desejo")}` : "",
      textoExtra(ficha, "senhor") ? `Senhor: ${textoExtra(ficha, "senhor")}` : "",
      SEITAS.find((s) => s.id === textoExtra(ficha, "seita"))?.nome ? `Seita: ${SEITAS.find((s) => s.id === textoExtra(ficha, "seita"))?.nome}` : "",
    ].filter(Boolean);
    if (pessoal.length) blocos.push({ tipo: "texto", titulo: "Ambição e desejo", texto: pessoal.join("\n") });
    const conv = listaExtra(ficha, "conviccoes");
    if (conv.length) blocos.push({ tipo: "lista", titulo: "Convicções", itens: conv });
    const pedras = listaExtra(ficha, "pedrasToque");
    if (pedras.length) blocos.push({ tipo: "lista", titulo: "Pedras de Toque", itens: pedras });
    const vant = listaExtra(ficha, "vantagens");
    if (vant.length) blocos.push({ tipo: "etiquetas", titulo: "Vantagens", itens: vant });
    const def = listaExtra(ficha, "defeitos");
    if (def.length) blocos.push({ tipo: "etiquetas", titulo: "Defeitos", itens: def });
    blocos.push({ tipo: "lista", titulo: "Inventário", itens: ficha.inventario });
    if (ficha.condicoes.length) blocos.splice(1, 0, { tipo: "etiquetas", titulo: "Condições", itens: ficha.condicoes });
    return blocos;
  },

  xpParaNivel() {
    return null;
  },

  subirNivel(original) {
    const ficha = clonar(original);
    sincronizar(ficha);
    const antes = potenciaDe(ficha);
    if (antes >= 10) return { ficha, resumo: `${ficha.nome} já tem Potência de Sangue 10. Mais grosso que isso, só o sangue dos Antediluvianos.` };
    ficha.nivel = antes + 1;
    const mudou = mudancasPotencia(antes, ficha.nivel);
    const ralo = claDe(ficha).id === "sangue_ralo" && antes === 0 ? " O sangue ralo engrossou: converse com o mestre (pela regra, deixaria de ser Sangue-ralo)." : "";
    return {
      ficha,
      resumo: `${ficha.nome}: Potência de Sangue ${antes} → ${ficha.nivel}. ${mudou.length ? `${mudou.join(" · ")}.` : "O sangue pesa mais, mas nada muda nas contas desta vez."}${ralo} (Isto veio de graça, pela idade ou diablerie. O XP o próprio jogador gasta na ficha, no botão "Gastar XP".)`,
    };
  },

  descansar(original, tipo) {
    const ficha = clonar(original);
    sincronizar(ficha);
    const r = ficha.recursos;

    if (tipo === "longo") {
      const dado = d(10);
      const fomeAntes = r.fome.atual;
      const partes: string[] = [];
      if (dado >= 6) partes.push(`Despertar ao acordar: ${dado}, a Fome fica em ${fomeAntes}`);
      else if (fomeAntes >= 5) {
        if (!ficha.condicoes.some((c) => normalizar(c).startsWith("faminto"))) ficha.condicoes.push(CONDICAO_FAMINTO);
        partes.push(`Despertar ao acordar: ${dado} com Fome já em 5 — acorda faminto e precisa resistir ao frenesi`);
      } else {
        r.fome.atual = fomeAntes + 1;
        partes.push(`Despertar ao acordar: ${dado}, Fome ${fomeAntes} → ${r.fome.atual}`);
      }
      const ganho = Math.max(ficha.atributos.autocontrole ?? 1, ficha.atributos.determinacao ?? 1);
      const vontadeAntes = r.vontade.atual;
      r.vontade.atual = Math.min(r.vontade.max, vontadeAntes + ganho);
      partes.push(`Força de Vontade ${vontadeAntes} → ${r.vontade.atual}`);
      return { ficha, resumo: `${ficha.nome} dormiu o dia na escuridão do refúgio. ${partes.join("; ")}. Ferimentos não fecham sozinhos: curar custa sangue.` };
    }

    // curto: recuperar o fôlego curando Saúde com um Despertar (dano agravado anotado como condição "agravado N" não sara assim)
    const agravado = ficha.condicoes.reduce((m, c) => {
      const x = normalizar(c).match(/agravad\w*\s*(\d+)/);
      return x ? Math.max(m, Number(x[1])) : m;
    }, 0);
    const teto = Math.max(0, ficha.pvMax - agravado);
    if (ficha.pv >= teto) {
      return { ficha, resumo: `${ficha.nome} recupera o fôlego, mas não há ferimento superficial para fechar${agravado ? ` (os ${agravado} de dano agravado pedem noites e sangue)` : ""}.` };
    }
    if (r.fome.atual >= 5) {
      return { ficha, resumo: `${ficha.nome} tenta fechar as feridas, mas a Fome está em 5: não há sangue para Despertar. Precisa se alimentar antes.` };
    }
    const dado = d(10);
    const cura = Math.min(efeitosPotencia(ficha).cura, teto - ficha.pv);
    const pvAntes = ficha.pv;
    ficha.pv += cura;
    if (ficha.pv > 0) ficha.condicoes = ficha.condicoes.filter((c) => c !== "inconsciente");
    const fomeAntes = r.fome.atual;
    if (dado < 6) r.fome.atual = Math.min(5, fomeAntes + 1);
    return {
      ficha,
      resumo: `${ficha.nome} força o sangue a fechar as feridas: Saúde ${pvAntes} → ${ficha.pv}. Despertar: ${dado}, ${dado >= 6 ? `a Fome fica em ${fomeAntes}` : `Fome ${fomeAntes} → ${r.fome.atual}`}.`,
    };
  },

  aposTeste(original, resultado) {
    if (original.sistema !== ID || resultado.sistema !== ID) return null;
    const res = resultado as ResultadoVtm;
    const ficha = clonar(original);
    sincronizar(ficha);
    const r = ficha.recursos;
    let mudou = false;
    const condicao = (texto: string) => {
      if (!ficha.condicoes.some((c) => normalizar(c) === normalizar(texto))) ficha.condicoes.push(texto);
    };

    // Despertares que falharam (avulso, Surto, poder da disciplina): +1 de Fome cada; passou de 5 = a Besta cobra
    const falhas = res.falhasDespertar ?? 0;
    if (falhas > 0) {
      const fome = r.fome.atual;
      if (fome + falhas > 5 && !ficha.condicoes.some((c) => normalizar(c).startsWith("faminto"))) ficha.condicoes.push(CONDICAO_FAMINTO);
      r.fome.atual = Math.min(5, fome + falhas);
      mudou = true;
    }

    // Surto de Sangue: o avulso guarda dados para o próximo teste; a parada que os usou apaga
    if (res.vtm === "surto") {
      if (res.surtoGanho) ficha.extras.surtoPendente = res.surtoGanho;
      else delete ficha.extras.surtoPendente;
      mudou = true;
    } else if (res.surtoConsumido) {
      delete ficha.extras.surtoPendente;
      mudou = true;
    }

    if (res.vtm === "frenesi" && res.frenesi) {
      // teste de frenesi de fome resolve o aviso de faminto (a Fome continua onde está)
      if (res.frenesi.tipo === "fome") ficha.condicoes = ficha.condicoes.filter((c) => !normalizar(c).startsWith("faminto"));
      if (!res.frenesi.resistiu) condicao(`Frenesi (${NOME_FRENESI[res.frenesi.tipo]})`);
      mudou = true;
    }

    if (res.vtm === "caca" && res.caca) {
      const c = res.caca;
      if (c.passou) {
        r.fome.atual = Math.min(r.fome.atual, c.fomeDepois);
        if (c.ressonancia) ficha.extras.ressonancia = { tipo: c.ressonancia.tipo, intensidade: c.ressonancia.intensidade, disciplinas: c.ressonancia.disciplinas };
        if (r.fome.atual < 5) ficha.condicoes = ficha.condicoes.filter((x) => !normalizar(x).startsWith("faminto"));
        if (c.manchas) {
          r.mancha.atual = Math.min(r.mancha.max, r.mancha.atual + c.manchas);
          ficha.extras.mancha = r.mancha.atual;
        }
      }
      if (c.compulsao) condicao(`Compulsão (${c.compulsao})`);
      sincronizar(ficha);
      mudou = true;
    }

    if (res.vtm === "remorso" && manchaDe(original) > 0) {
      if (!res.sucesso) r.humanidade.atual = Math.max(0, r.humanidade.atual - 1);
      r.mancha.atual = 0;
      ficha.extras.mancha = 0;
      sincronizar(ficha);
      mudou = true;
    }

    return mudou ? ficha : null;
  },
};
