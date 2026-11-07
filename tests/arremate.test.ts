import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arremateRedundante, classificar, frases } from "../src/lib/mestre/arremate";

// Rede de segurança do fim do turno (src/lib/mestre/arremate.ts): o rabo que só repete a vez ou a mecânica não é gravado.
// Casos tirados da transcrição da campanha 43 (pares mestre→mestre com "É a sua vez, Samuel" repetido).

const NARRADO =
  "A chuva bate nas janelas do consultório enquanto Vera folheia o prontuário. Samuel sente o cheiro de sangue velho vindo do corredor, " +
  "e a enfermeira na recepção finge não ver a mancha escura que cresce sob a porta 7. Alguém geme lá dentro, baixo, com um ritmo " +
  "que não parece dor: parece contagem. Vera fecha o prontuário e olha para você.";

describe("frases e classificar", () => {
  it("quebra em frases e classifica vez, mecânica, eco e nova", () => {
    assert.deepEqual(frases("A vez é sua, Samuel. O que você faz?"), ["A vez é sua, Samuel.", "O que você faz?"]);
    const conhecidas = new Set(["chuva", "janelas", "consultorio", "prontuario"]);
    assert.equal(classificar("É a sua vez, Samuel.", conhecidas), "vez");
    assert.equal(classificar("Você ganhou 1 Mancha (agora 1/4).", conhecidas), "mecanica");
    assert.equal(classificar("A chuva bate nas janelas do consultório.", conhecidas), "eco");
    assert.equal(classificar("Um carro preto para em frente ao hospício.", conhecidas), "nova");
  });
});

describe("arremateRedundante", () => {
  it("descarta 'É a sua vez, Samuel…' depois de narração longa", () => {
    assert.equal(arremateRedundante("É a sua vez, Samuel…", NARRADO, ["Samuel", "Vera"]), true);
    assert.equal(arremateRedundante("O dado está com você.", NARRADO), true);
    assert.equal(arremateRedundante("Pronto.", NARRADO), true);
    assert.equal(arremateRedundante("—", NARRADO), true);
  });

  it("descarta resumo mecânico fora da ficção", () => {
    assert.equal(arremateRedundante("Você gastou 1 de Força de Vontade (agora 4/5). Anotei no diário.", NARRADO), true);
  });

  it("mantém parágrafo com informação nova, fala entre aspas e fala fora do jogo", () => {
    assert.equal(arremateRedundante("Um carro preto para em frente ao hospício e dois homens descem. É a sua vez.", NARRADO), false);
    assert.equal(arremateRedundante("\"Sua vez\", diz Vera.", NARRADO), false);
    assert.equal(arremateRedundante("((Fora do jogo: quer pausar aqui?))", NARRADO), false);
  });

  it("sem narração substancial antes, o rabo pode ser a resposta inteira: fica", () => {
    assert.equal(arremateRedundante("É a sua vez, Samuel.", "Curto."), false);
    assert.equal(arremateRedundante("É a sua vez, Samuel: role o ataque.", "Curto.", [], { depoisDeTeste: true }), false);
    assert.equal(arremateRedundante("", NARRADO), false);
  });
});

// Os rabos reais da campanha 43 (sessão de 07/11, 61 falas do mestre com menos de 400 caracteres, uma depois de cada cartão
// de teste e de quase toda narração). Metade trazia "o que está em jogo" ("se acertar... se errar...") e passava pela
// heurística antiga por ter palavras novas; o prompt manda pôr isso ANTES do pedir_teste, e o cartão do dado já é o "role agora".
const CONHECIDOS = ["Samuel", "Vera", "Neuza"];

/** Narração real que antecedeu os rabos (#1565): o rabo recapitula o que ela acabou de dizer (envelope, favores, porta, prisioneiro). */
const NARRADO_43 =
  "Você abre a boca para tentar de novo e Vera ergue um dedo, sem pressa, antes que a primeira palavra saia. \"Se o senhor repetir a mesma frase, " +
  "vou ouvir a mesma frase.\" O olhar dela pousa na faca, depois no seu rosto, e a paciência é a de quem já viu homens pior que você gastarem a " +
  "noite inteira nessa porta. A Besta se enrosca por dentro, ferida, e a Crueldade sopra que há uma saída mais rápida que a lábia.\n\n" +
  "O envelope continua a dois dedos do joelho dela. O preço continua em dois favores. Atrás da porta do banheiro, nem a corrente se atreve a " +
  "tilintar. Insistir no charme só vai render mais desprezo. Aceitar custa caro. E há caminhos que você ainda não tentou, todos com um preço que " +
  "a mulher à sua frente parece esperar que você pague.\n\nÉ a sua vez, Samuel: aceitar os dois favores, barganhar com outra moeda ou escolher um " +
  "caminho novo para o envelope.";

/** [id da mensagem, texto] escrito depois do cartão de pedir_teste (a última ferramenta do turno fora sugerir_acoes). */
const DEPOIS_DE_TESTE: [number, string][] = [
  [1267, "Samuel, o dado é seu. Dona Neuza espera com a brasa do cigarro quase no filtro, e a vantagem na conversa ainda está em aberto."],
  [1535, "Você se debruça sobre a banheira, e o sorriso do prisioneiro hesita por um instante. Samuel, o dado é seu. Lá embaixo, a mulher de capa de chuva continua esperando."],
  [1550, "Vera sustenta o olhar, e o dado está na sua mão, Samuel. Role para ver se a frieza dela racha."],
  [1556, "O dado está com você, Samuel. Vera espera de olhos fixos em você, e o envelope ainda repousa no joelho dela."],
  [1570, "O olhar de Samuel está preso ao de Vera, e o ar do quarto parou. Samuel, o dado é seu."],
  [1577, "Samuel, o dado é seu. Vera está imóvel diante da faca, e o que está em jogo é se ela entrega o envelope ou lhe mostra a diferença entre vocês."],
  [1592, "O dado está na sua mão, Samuel. Vera espera de olhos abertos, Neuza escuta atrás da porta, e a ordem está na ponta da sua língua."],
  [1599, "A garra de sombra aperta mais um grau, e o dado está na sua mão, Samuel. Se você vencer, Vera vai falar. Se perder, Neuza vai abrir a porta."],
  [1611, "Neuza respira fundo para gritar, e o corredor está a um fôlego de ouvir. É a vez de Samuel: o dado decide se ela cala antes de o rapaz da portaria ouvir."],
  [1618, "A ordem está na sua boca e Neuza espera, de olhos fixos nos seus. Samuel, é a sua vez de rolar. Se a Dominação pegar, a noite some da memória dela. Se não pegar, ela guarda tudo."],
  [1629, "A estaca já está a meio caminho do coração de Vera, e o sorriso dela ainda não caiu. Samuel, a vez é sua: role o ataque. Se acertar, ela fica paralisada. Se errar, uma vampira velha vai ter um motivo de verdade para cobrar."],
  [1636, "Você se inclina sobre a banheira, e o prisioneiro sustenta o seu olhar. É a vez de Samuel: o dado decide se ele fala tudo ou só o que lhe convém."],
  [1645, "Samuel, a vez é sua: role a Força de Vontade. Vera está presa à estaca, mas a alma dela não vai se entregar sem briga."],
  [1852, "A gaveta cede um dedo e o cadeado range. Samuel, role a Força de Vontade. Se você sustentar, vê o rosto do homem do espelho. Se não sustentar, a memória cobra o preço."],
  [1864, "A chave está na fechadura, a poça ainda treme, e Samuel precisa rolar a percepção para saber o que o espera do outro lado da porta verde."],
  [1872, "A lâmina desce. Falta saber se ele ainda estará sentado quando ela chegar. A vez é sua, Samuel: role o ataque."],
  [1878, "A vez é sua, Samuel: role Força + Briga. Se acertar, o joelho vai fazer o homem de luvas largar o seu pulso. Se errar, ele continua agarrado a você."],
  [1884, "Sua mão está a um palmo do pulso dele, e o anel de sinete espera na mesa. Role o teste, Samuel."],
  [1890, "A resposta dele depende do dado. Samuel, role Manipulação + Dominação."],
  [1896, "A alma do homem de luvas se debate contra a sua, e o abajur treme. É a vez de Samuel: role Força de Vontade. Se perder, a Besta pode tomar o volante."],
  [1907, "A porta se abre contra o seu ombro, e o escuro decide se vai guardar você. É a sua vez, Samuel: role Destreza + Furtividade."],
  [1913, "A faca está no pescoço dele e o recado decorado treme atrás dos dentes. Samuel, a vez é sua: role Manipulação + Intimidação para ver se o carniçal entrega o recado do Maldonado antes que o carro lá fora volte a dar partida."],
  [1919, "O olhar do carniçal ainda está preso ao seu. Samuel, role Manipulação + Dominação. Se a ordem pegar, ele volta ao Maldonado com a mentira. Se não pegar, ele pode levar a verdade."],
];

/** Escritos depois de sugerir_acoes/registros: abrem passando a vez e recapitulam a cena que acabou de ser narrada. */
const DEPOIS_DE_SUGESTOES: [number, string][] = [
  [1386, "Sua vez, Samuel. A visita espera lá embaixo, o prisioneiro sussurra seu nome, e Neuza já não quer saber de nada."],
  [1537, "É a sua vez, Samuel. A mulher sobe a escada e o prisioneiro sabe mais do que contou. Você decide se recebe a visita na porta ou antes dela."],
  [1540, "É a sua vez, Samuel: a mulher espera do outro lado da porta. Você decide como ela entra, ou se entra."],
  [1543, "É a sua vez, Samuel. Vera Lund está sentada à sua frente com o envelope no joelho. O prisioneiro tilinta a corrente atrás da porta, e a noite está correndo."],
  [1552, "É a sua vez, Samuel. Vera espera sua resposta sobre o favor, e o envelope continua ao alcance da mão dela."],
  [1558, "É a sua vez, Samuel. Vera Lund sustenta o envelope no ar e quer uma resposta. Dois favores é o preço agora, e o prisioneiro na banheira também está em jogo."],
  [1566, "Vera aguarda com o envelope no ar. A vez é sua, Samuel."],
  [1582, "É a sua vez, Samuel. Você está com o envelope na mão e Vera espera que você saia da porta. O prisioneiro está na banheira, e o endereço e a data estão à sua frente."],
  [1585, "É a sua vez, Samuel. Vera está de frente para você, com Neuza escutando atrás da porta. Diga com clareza o que você quer dela e até onde vai para conseguir."],
  [1588, "A vez é sua, Samuel. Diga qual ordem exata você daria a Vera, ou escolha outro caminho."],
  [1595, "É a sua vez, Samuel. Vera pende na sua sombra, Neuza bate à porta e a Crueldade exige uma decisão agora."],
  [1603, "A vez é sua, Samuel. Neuza está quase abrindo a porta, e Vera pende na sua sombra com o nome do comprador ainda guardado."],
  [1607, "Sua vez, Samuel. Neuza espera na fresta da porta, Vera está atrás de você e o prisioneiro quer falar. O que está em jogo é quem sai dessa noite com o seu segredo."],
  [1614, "A vez é de Samuel. Neuza está viva e atordoada no seu braço, Vera espera com o recibo e o prisioneiro escuta calado. Se Neuza acordar lembrando de tudo, ela vira uma testemunha da Máscara."],
  [1620, "A vez é sua, Samuel. Neuza voltou à recepção sem lembrar de nada. Vera espera com o recibo, e o prisioneiro continua calado na banheira."],
  [1623, "É a sua vez, Samuel. Vera espera com o recibo, o prisioneiro escuta calado na banheira e você decide se isso vira conversa, interrogatório ou briga."],
  [1631, "A vez é sua, Samuel. Vera está paralisada pela estaca, e o recibo está com ela. O prisioneiro escuta calado na banheira."],
  [1638, "Samuel, a vez é sua. Vera está paralisada com o recibo na capa, e o prisioneiro entregou só metade do que sabe. O tempo da estaca corre contra você."],
  [1641, "Sua vez, Samuel. O prisioneiro oferece a outra metade em troca da chave, Vera está presa pela estaca com o recibo na capa, e o tempo dela corre."],
  [1648, "A vez é sua, Samuel. Vera virou cinza, o recibo está nas suas mãos e o prisioneiro oferece a outra metade em troca da chave. Suas Manchas estão cheias (4/4)."],
  [1848, "A vez é sua, Samuel. Você tem o recibo, a chave do cofre na lembrança de Vera e um prisioneiro que espera. A terceira gaveta ainda está trancada."],
  [1854, "Samuel, a vez é sua. O prisioneiro espera a chave, o recibo está com você, e algo do outro lado do espelho já sabe que você o procurou."],
  [1857, "É a sua vez, Samuel. O prisioneiro reconheceu o nome e ainda espera a chave. Você decide se ele vale mais vivo ou como informação a arrancar agora."],
  [1866, "A vez é de Samuel."],
  [1874, "Sua vez, Samuel."],
  [1880, "O homem de luvas está com 3 de 8 PV, preso pela sombra e com a faca no ombro. É a sua vez, Samuel."],
  [1886, "O homem de luvas está com 2 de 8 PV, preso e desarmado. É a sua vez, Samuel."],
  [1892, "Escolha o próximo passo, Samuel."],
  [1900, "Samuel, a vez é sua. O saco de pano está na mesa, a gaveta de baixo do cofre ainda não foi aberta, e um carro rondando lá fora pode ser a pessoa que o Maldonado mandou."],
  [1903, "A vez é sua, Samuel."],
  [1909, "A vez é sua, Samuel. O mensageiro está preso nos seus braços, e você decide o que fazer com ele antes que o amanhecer chegue."],
  [1915, "A vez é sua, Samuel."],
  [1921, "A vez é sua, Samuel."],
  [1924, "A vez é sua, Samuel. O espelho está na sua mão, e o homem do outro lado espera o que você vai fazer."],
];

/** Resumo mecânico fora da ficção (a tela já mostra Força de Vontade, Manchas e diário). */
const MECANICOS: [number, string][] = [
  [1563, "Você gastou 1 de Força de Vontade (agora 9/10) e rerrolou três dados, mas nenhum deu sucesso. O flerte continua falho e o preço de Vera segue em dois favores. A vez é sua, Samuel."],
  [
    1573,
    "A tentativa de Dominação falhou. Vera guardou o envelope e não vende mais, a menos que Samuel traga algo que ela queira. Ela ficou parada à porta, de costas. Samuel ganhou 1 Mancha (agora 1/4) por tentar forçá-la a passar a noite com ele. Também anotei no diário que Vera está hostil. É a vez de Samuel.",
  ],
];

/** Resposta inteira a uma pergunta fora do jogo (#1546): não é rabo, nunca pode sair. */
const RESPOSTA_FORA_DO_JOGO =
  "Para seduzir Vera, a melhor aposta é Manipulação + Lábia, que é a sua perícia mais forte. Também servem Carisma + Lábia (charme aberto), Manipulação + Manha (negociar no escuro) e Carisma + Liderança (impor-se como igual). Vera é velha e vai resistir, então a dificuldade será alta. É a sua vez, Samuel.";

describe("rabos reais da campanha 43", () => {
  it("depois de pedir_teste, todos os rabos de passagem de vez saem, mesmo com 'se acertar / se errar'", () => {
    for (const [id, texto] of DEPOIS_DE_TESTE) {
      assert.equal(arremateRedundante(texto, NARRADO, CONHECIDOS, { depoisDeTeste: true }), true, `#${id} deveria ser descartado: ${texto}`);
    }
  });

  it("depois de sugerir_acoes, o rabo que abre passando a vez e só recapitula a cena sai", () => {
    for (const [id, texto] of DEPOIS_DE_SUGESTOES) {
      assert.equal(arremateRedundante(texto, NARRADO_43, CONHECIDOS), true, `#${id} deveria ser descartado: ${texto}`);
    }
  });

  it("resumo mecânico sai nos dois casos", () => {
    for (const [id, texto] of MECANICOS) {
      assert.equal(arremateRedundante(texto, NARRADO_43, CONHECIDOS), true, `#${id} deveria ser descartado`);
      assert.equal(arremateRedundante(texto, NARRADO_43, CONHECIDOS, { depoisDeTeste: true }), true, `#${id} deveria ser descartado depois de teste`);
    }
  });

  it("narração com informação nova nunca é descartada", () => {
    // resposta fora do jogo (#1546): começa explicando, não passando a vez
    assert.equal(arremateRedundante(RESPOSTA_FORA_DO_JOGO, NARRADO, CONHECIDOS), false);
    // acontecimento novo que termina passando a vez: fica (depois de sugestões)
    const novo = "Um carro preto para em frente ao hospício e dois homens descem com lanternas apagadas. A recepcionista some pela porta dos fundos. É a sua vez, Samuel.";
    assert.equal(arremateRedundante(novo, NARRADO, CONHECIDOS), false);
    // fala entre aspas é sempre narração, até depois do cartão do dado
    assert.equal(arremateRedundante("\"Role logo\", Vera sussurra, e a estaca treme na sua mão.", NARRADO, CONHECIDOS, { depoisDeTeste: true }), false);
    // parágrafo longo de verdade depois do teste não é rabo
    const longo = `${novo} ${novo} ${novo}`;
    assert.ok(longo.length > 420);
    assert.equal(arremateRedundante(longo, NARRADO, CONHECIDOS, { depoisDeTeste: true }), false);
    // fala fora do jogo
    assert.equal(arremateRedundante("((Quer parar por hoje? Role quando quiser.))", NARRADO, CONHECIDOS, { depoisDeTeste: true }), false);
  });
});
