import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  avisoDeTamanho,
  contarMuletas,
  contarPalavras,
  contarParagrafos,
  lembreteDeMuletas,
  lembretesDoTurno,
  MAX_LEMBRETE,
  narracoesRecentes,
  ultimaNarracao,
} from "../src/lib/mestre/muletas";
import { TAMANHOS } from "../src/lib/mestre/estilo";

// Anti-muletas (P18, src/lib/mestre/muletas.ts). As cinco narrações abaixo são da campanha 43 (#1879, #1885, #1891, #1899,
// #1902, sessão real de teste): "a Besta", "Dentro de você, a voz de Vera" e o tilintar aparecem em quase todas, e todas
// fecham com "A vez é sua, Samuel." mais um resumo.

const N1879 = `O joelho entra onde Vera mandou, e o crítico faz o resto: um estalo de costela seca, o ar saindo dele num apito sem dignidade. Os grampos brancos se abrem no seu pulso como se alguém tivesse cortado o fio. O homem de luvas dobra sobre a própria faca, e a faca, ainda cravada no ombro, ajuda a ele entender o tamanho do erro.

A poltrona desaba de lado. A sombra no tornozelo não afrouxa, e ele fica meio caído, meio sentado, um terno cinza que perdeu o vinco e a gentileza. A mão boa tateia o tampo da mesa, longe de você, perto do saco de pano que tilinta. O anel de sinete bate na madeira. "Você não faz ideia do que acabou de tocar", chia, com sangue escuro nos dentes. "Ela vai saber antes do amanhecer."

Dentro de você, a voz de Vera diz, pensativa: "Ele ainda tem uma mão livre, senhor. E um anel que não gira à toa." O abajur pisca, e a Besta, de olhos bem abertos, espera que você escolha.

A vez é sua, Samuel. O homem está ferido, preso e à beira de alcançar o saco de pano. Você decide se ele fala, se ele cala ou se o saco chega primeiro.`;

const N1885 = `Sua mão fecha sobre o pulso enluvado e o desce contra o tampo como quem bate uma porta. O anel de sinete estala entre a madeira e o osso, e a luva branca se rasga num risco de sangue escuro. O homem de luvas não grita. Faz um som de dente quebrado, curto e úmido, e a mão que alcançava o saco de pano para a um palmo dele, aberta e trêmula, como pedinte.

O anel, partido ao meio, mostra o que escondia: um vão minúsculo, mais fundo do que um anel tem direito, com uma gota de sangue velho secando no fundo e uma casa gravada no metal, de porta de ferro. Dentro de você, a voz de Vera comenta, quase com ternura: "Eu avisei, senhor. Ninguém gira um anel só por vaidade."

Ele respira em pedaços, a faca ainda no ombro, a sombra no tornozelo, o abajur piscando. Os olhos dele vão do saco de pano para o seu rosto, e algo calcula atrás deles, um homem que pesa a dignidade contra o amanhecer. "Mais um golpe e você nunca saberá o que o Maldonado mandou dizer", chia. "Mais um, e eu já não terei boca." A Besta, de olhos abertos, não se importa com nenhuma das duas hipóteses.

A vez é sua, Samuel. Ele está com um fio de vida, preso e desarmado, o saco de pano ao alcance de qualquer um de vocês dois.`;

const N1891 = `O olhar dele se parte ao meio. Por um instante os dois homens lutam atrás da mesma cara: o que foi treinado para calar e o que tem mais medo da casa de baixo do que de você. Então a boca se afrouxa, e o sangue escuro escorre pelo queixo junto com uma palavra que ele guardou por anos atrás dos dentes.

"Paciência." Sai arrastada, quase um suspiro, e o abajur de pé baixo estremece como se o quarto tivesse ouvido. "Bate duas vezes, diz isso para a frestinha, e a porta de ferro abre. É só isso. Sempre foi só isso." Ele ri sem som, e o riso machuca as costelas quebradas. Dentro de você, Vera murmura: "O preço da paciência, senhor. Eu devia ter lido a cifra pelo avesso."

O olhar vítreo do homem desliza para o saco de pano e volta para você, obediente e vazio. "O Maldonado manda alguém buscar isso antes do amanhecer", acrescenta, sem que você pergunte. "Eu devia entregar e ir embora. Não vai dar tempo, não é?" A sombra no tornozelo dele aperta devagar, esperando você. A faca continua no ombro, o anel partido brilha na madeira, e a Besta saciada observa de olhos entreabertos, curiosa para saber se a cortesia de uma pergunta só vale também para quem responde.

A vez é sua, Samuel. Ele está dominado, quase sem vida, com a palavra entregue; o saco de pano tilinta na mesa e alguém vem buscá-lo antes do sol.`;

const N1899 = `A alma dele bate contra a sua como uma mão contra vidro, e o vidro cede primeiro. Algo velho e paciente se rende sem barulho, e a vitae desce fria, rançosa, cheia de invernos que não foram seus. Então a Besta, de olhos bem abertos, bebe o resto com a boa educação de quem aprendeu a ser servida.

O corpo dele seca sob o terno cinza, o colarinho afrouxa, e a luva branca se esvazia sobre o tampo da mesa. Fica um monte de cinza fina e uma faca cravada no tampo, onde antes havia um ombro. O abajur de pé baixo para de piscar. Dentro de você, a voz de Vera diz, sem ironia pela primeira vez: "Dois em uma noite, senhor. O gosto não passa, eu avisei. Só muda de dono." Uma segunda voz, mais rouca, mais antiga e que não pede nada, se acomoda atrás dos dentes e repete uma palavra: paciência. Suas mãos tremem. Você deixa tremerem.

O saco de pano continua sobre a mesa, tilintando baixo quando você o toca, e o cofre escancarado mostra a gaveta de baixo, que Vera mandou olhar. Lá fora, a chuva fina muda de ritmo. Um carro passa devagar demais na rua dos fundos, e os faróis lambem a janela cega sem parar. O homem de luvas disse que o Maldonado manda alguém buscar isso antes do amanhecer, e a noite já não é grande.

Samuel, a vez é sua. A Besta está saciada, a aura está pesada e o saco de pano está ao seu alcance. Você pode revistar o cofre, abrir o saco ou sair antes que alguém bata na porta verde.`;

const N1902 = `Você desata o cordão com os dedos ainda sujos de cinza. O pano é grosso, de lavanderia, e cheira a naftalina e a alguma coisa cobreada por baixo. Dentro, o que tilintava era um molho de três chaves de latão presas por um fio de arame, numeradas a punção: 1, 2, 3. A primeira é nova, quase vaidosa. As outras duas têm os dentes gastos de quem abre portas toda noite.

No fundo, enrolada num lenço de seda, repousa uma ampola de vidro grosso, lacrada com cera preta. O líquido dentro é escuro e parado, mas quando você a inclina contra o abajur ele escorre devagar demais, como sangue que ainda tem opinião. Na etiqueta, a letra de Vera, bem-educada: "H.P." A Besta, de olhos abertos, vira o rosto na direção da ampola como um cão que reconhece o dono da casa. Sua boca se enche de um gosto que você já provou, numa foto, numa boca igual à sua.

Dentro de você, Vera fala baixo, sem ironia: "Ela vendeu o sangue além da pessoa, senhor. Eu cobrava as duas pontas, mas isso eu nunca soube que existia." Lá fora, o carro que rondava desliga o motor. A chuva fica mais nítida sem ele. Uma porta de carro se fecha, uma só, sem pressa, e passos de sapato bom começam a contar as casas.

Samuel, a vez é sua. Você tem o saco, a ampola e as chaves na mão, o cofre ainda com a gaveta de baixo por revistar, e alguém na rua que sabe exatamente onde fica a porta verde.`;

const NARRACOES = [N1879, N1885, N1891, N1899, N1902];

/** A transcrição como o banco devolve: ações, dados e os "A vez é sua" soltos entre as narrações. */
const MENSAGENS = [
  { tipo: "jogador", texto: "Torcer a faca e meter o joelho nele, forçando-o a soltar o pulso" },
  { tipo: "dado", texto: "Samuel · Força + Briga: 8d10 vs 3 → 7 vs 3 · Crítico" },
  { tipo: "mestre", texto: N1879 },
  { tipo: "mestre", texto: "O homem de luvas está com 3 de 8 PV, preso pela sombra e com a faca no ombro. É a sua vez, Samuel." },
  { tipo: "jogador", texto: "Cravar a mão no pulso dele e esmagar o anel contra a mesa antes que ele alcance o saco" },
  { tipo: "mestre", texto: N1885 },
  { tipo: "mestre", texto: "O homem de luvas está com 2 de 8 PV, preso e desarmado. É a sua vez, Samuel." },
  { tipo: "jogador", texto: "Dominá-lo com o olhar e ordenar que conte a palavra da porta de ferro" },
  { tipo: "mestre", texto: N1891 },
  { tipo: "mestre", texto: "Escolha o próximo passo, Samuel." },
  { tipo: "jogador", texto: "Cravar a faca até o fim e beber o homem de luvas antes que alguém chegue" },
  { tipo: "mestre", texto: N1899 },
  { tipo: "mestre", texto: "Samuel, a vez é sua. O saco de pano está na mesa." },
  { tipo: "jogador", texto: "Abrir o saco de pano e ver o que tilinta lá dentro" },
  { tipo: "mestre", texto: N1902 },
  { tipo: "mestre", texto: "A vez é sua, Samuel." },
  { tipo: "jogador", texto: "Esperar atrás da porta verde e agarrar quem entrar" },
];

const MEDIA = TAMANHOS.find((t) => t.id === "media")!;
const TETO_MEDIA = { paragrafos: MEDIA.paragrafos, palavras: MEDIA.palavras };

describe("narracoesRecentes", () => {
  it("pega só as mensagens do mestre com 400+ caracteres, as 5 últimas", () => {
    const n = narracoesRecentes(MENSAGENS);
    assert.deepEqual(n, NARRACOES);
    assert.equal(narracoesRecentes([...MENSAGENS, { tipo: "mestre", texto: N1885 }]).length, 5);
    assert.equal(narracoesRecentes([...MENSAGENS, { tipo: "mestre", texto: N1885 }])[0], N1885);
  });
});

describe("contarMuletas com 5 narrações reais da campanha 43", () => {
  const m = contarMuletas(NARRACOES);
  it("lista a Besta, a corrente (o tilintar) e Dentro de você", () => {
    for (const e of ["a Besta", "tilinta / tilintar", "Dentro de você", "a vez é sua", "o abajur"]) assert.ok(m.expressoes.includes(e), `${e} em ${m.expressoes}`);
    // nestas cinco o tilintar vem do saco de pano, não da corrente: a corrente não é citada à toa
    assert.ok(!m.expressoes.includes("a corrente"), String(m.expressoes));
    assert.ok(!m.expressoes.includes("o neon"), "neon não aparece nestas cinco");
  });
  it("acha substantivos repetidos em 3+ narrações, sem nomes próprios e sem os da lista fixa", () => {
    assert.ok(m.substantivos.length > 0 && m.substantivos.length <= 4, String(m.substantivos));
    for (const s of m.substantivos) {
      assert.equal(s, s.toLowerCase());
      assert.ok(!["vera", "samuel", "maldonado", "besta", "abajur", "vez"].includes(s), s);
    }
  });
  it("o lembrete cabe em 300 caracteres e cita as muletas", () => {
    const l = lembreteDeMuletas(m);
    assert.ok(l.length <= MAX_LEMBRETE, `${l.length}: ${l}`);
    assert.match(l, /^\(Nesta resposta NÃO use: /);
    assert.match(l, /varie a imagem de abertura e o fecho\.\)$/);
    for (const e of ["a Besta", "Dentro de você", "tilinta / tilintar"]) assert.ok(l.includes(`"${e}"`), l);
  });
  it("a corrente do prisioneiro é muleta; corrente de ar, do rio e conta corrente não", () => {
    // trechos reais da campanha 43 (a corrente do prisioneiro, antes da diablerie)
    const prisao = [
      "A corrente tilinta uma vez quando ele levanta a cabeça. ".repeat(10),
      "O prisioneiro puxa o braço e a corrente do prisioneiro tilinta baixo. ".repeat(8),
      "As correntes estalam quando ele ajeita os ombros contra a parede. ".repeat(8),
    ];
    const cp = contarMuletas(prisao);
    assert.ok(cp.expressoes.includes("a corrente") && cp.expressoes.includes("tilinta / tilintar"), String(cp.expressoes));
    const ar = [
      "A corrente de ar entra pela janela e apaga a vela do altar. ".repeat(8),
      "Lá na ponte, a corrente do rio arrasta galhos para o escuro. ".repeat(8),
      "O gerente promete abrir uma conta corrente amanhã cedo. ".repeat(8),
    ];
    assert.ok(!contarMuletas(ar).expressoes.includes("a corrente"), String(contarMuletas(ar).expressoes));
  });
  it("o que o jogador acabou de citar não vira muleta (é o assunto do turno)", () => {
    const sem = contarMuletas(NARRACOES, ["Abrir o saco de pano e mexer no abajur"]);
    assert.ok(!sem.expressoes.includes("o abajur"));
    assert.ok(!sem.substantivos.includes("saco") && !sem.substantivos.includes("pano"));
    assert.ok(sem.expressoes.includes("a Besta"));
  });
});

describe("sem muletas, nada no lembrete", () => {
  it("narrações variadas ou nenhuma narração não acrescentam nada", () => {
    assert.equal(lembreteDeMuletas({ expressoes: [], substantivos: [] }), "");
    assert.equal(lembreteDeMuletas(contarMuletas([])), "");
    const variadas = [
      "O mercado de peixe fede a sal e a gelo derretido. Um menino corre entre as bancas com um embrulho debaixo do braço. ".repeat(4),
      "No alto do morro, o vento empurra a fumaça das chaminés para o mar. Uma igreja toca três badaladas fora de hora. ".repeat(4),
      "O escritório do advogado tem cheiro de papel úmido e café requentado. Ele assina sem ler e empurra a pasta. ".repeat(4),
    ];
    assert.deepEqual(contarMuletas(variadas), { expressoes: [], substantivos: [] });
    assert.deepEqual(lembretesDoTurno([{ tipo: "jogador", texto: "olho em volta" }, ...variadas.map((texto) => ({ tipo: "mestre", texto }))], null), []);
  });
});

describe("tamanho", () => {
  it("conta parágrafos e palavras", () => {
    assert.equal(contarParagrafos(N1899), 4);
    assert.equal(contarParagrafos("Um.\n\n\n\nDois.\n  \nTrês."), 3);
    assert.equal(contarPalavras("A vez é sua, Samuel."), 5);
    assert.ok(contarPalavras(N1899) > 180);
  });
  it("cada tamanho tem teto em palavras (90/180/280)", () => {
    assert.deepEqual(TAMANHOS.map((t) => t.palavras), [90, 180, 280]);
    for (const t of TAMANHOS) assert.ok(t.prompt.includes(`${t.palavras} palavras`), t.id);
  });
  it("avisa quando a última narração passou do teto da mesa", () => {
    const aviso = avisoDeTamanho(N1902, TETO_MEDIA);
    assert.match(aviso, /^\(A última narração teve 4 parágrafos e \d+ palavras; a mesa pediu 2 a 3, até 180 palavras/);
    assert.equal(avisoDeTamanho("Um parágrafo curto.\n\nOutro curto.", TETO_MEDIA), "");
    assert.equal(avisoDeTamanho("", TETO_MEDIA), "");
  });
  it("a cena de abertura não conta como última narração", () => {
    assert.equal(ultimaNarracao([{ tipo: "sistema", texto: "A aventura começa." }, { tipo: "mestre", texto: N1899 }]), null);
    assert.equal(ultimaNarracao(MENSAGENS), N1902);
  });
});

describe("janela das expressões (turnos reais do W20)", () => {
  // Nos turnos reais, o mestre obedeceu a lista por 4 narrações; na quinta o "Dentro de você" já tinha saído da janela de 5
  // e voltou. Com 8 narrações ele segue proibido enquanto ainda aparece em 2 delas.
  const limpa = (i: number) => ({ tipo: "mestre", texto: `Narração limpa ${i}: o visitante ajeita o guarda-chuva e olha o reboco descascado da parede, sem pressa. `.repeat(5) });
  const depois = [...MENSAGENS, ...[1, 2, 3, 4].flatMap((i) => [{ tipo: "jogador", texto: `ação ${i}` }, limpa(i)])];
  it("4 narrações limpas depois da sequência real ainda mantêm Dentro de você e a Besta na lista", () => {
    const [linha] = lembretesDoTurno(depois, null);
    assert.ok(linha.includes('"Dentro de você"') && linha.includes('"a Besta"'), linha);
  });
  it("8 narrações limpas tiram as expressões da lista", () => {
    const limpas = [...MENSAGENS, ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((i) => [{ tipo: "jogador", texto: `ação ${i}` }, limpa(i)])];
    const linhas = lembretesDoTurno(limpas, null);
    assert.ok(!linhas.some((l) => l.includes("Dentro de você") || l.includes("a Besta")), String(linhas));
  });
  it("com teto e narração no tamanho, entra o lembrete curto do tamanho", () => {
    const linhas = lembretesDoTurno(depois, TETO_MEDIA);
    assert.equal(linhas.at(-1), "(Tamanho: 2 a 3 parágrafos, até 180 palavras.)");
  });
});

describe("lembretesDoTurno", () => {
  it("junta muletas e aviso de tamanho a partir das mensagens do banco", () => {
    const linhas = lembretesDoTurno(MENSAGENS, TETO_MEDIA, ["Esperar atrás da porta verde e agarrar quem entrar"]);
    assert.equal(linhas.length, 2);
    assert.ok(linhas[0].startsWith("(Nesta resposta NÃO use:") && linhas[0].length <= MAX_LEMBRETE);
    assert.ok(linhas[1].startsWith("(A última narração teve"));
    // palavras das últimas ações do jogador ficam de fora
    assert.ok(!/\bporta\b/.test(linhas[0]) && !/\bsaco\b/.test(linhas[0]), linhas[0]);
  });
});
