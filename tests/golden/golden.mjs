// Golden tests do mestre: uma foto do que cada sistema entrega ao modelo, para provar que um refactor NÃO mudou nada.
//
//   npm run golden:update   grava tests/golden/<sistema>.json (ferramentas de definirFerramentas + prompt de promptDoSistema)
//   npm run golden:check    recalcula e compara com os arquivos gravados; sai com código 1 e mostra onde divergiu
//
// Para cada sistema de regras, monta uma campanha-fixture (sem banco: o processo troca de pasta para um diretório temporário,
// então o SQLite que o prompt tenta ler é um banco vazio descartável, nunca o data/ do jogador) e um personagem criado com
// `criarFicha` sob um gerador de dados com semente fixa (as rolagens da criação saem sempre iguais).
// Quando uma mudança de prompt ou de ferramenta é INTENCIONAL, rode `golden:update` e comissione os JSONs junto.
// Linhas que mudam sozinhas (datas, versões) não entram: os fixtures têm datas fixas e o prompt não lê o relógio.

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modo = process.argv[2];
if (modo !== "update" && modo !== "check") {
  console.error("Uso: node --import ./tests/_suporte/registrar.mjs tests/golden/golden.mjs <update|check>");
  process.exit(2);
}

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(PASTA, "../..");

// o banco (src/lib/db.ts) abre em process.cwd()/data: numa pasta temporária, nunca no data/ de verdade
const temporario = mkdtempSync(path.join(tmpdir(), "taverna-golden-"));
process.chdir(temporario);

const { definirGerador } = await import(pathToFileURL(path.join(RAIZ, "src/lib/dados.ts")).href);
const { SISTEMAS } = await import(pathToFileURL(path.join(RAIZ, "src/lib/sistemas/index.ts")).href);
const { definirFerramentas } = await import(pathToFileURL(path.join(RAIZ, "src/lib/mestre/ferramentas.ts")).href);
const { promptDoSistema } = await import(pathToFileURL(path.join(RAIZ, "src/lib/mestre/prompt.ts")).href);
const { semente } = await import(pathToFileURL(path.join(RAIZ, "tests/_suporte/dados-fixos.ts")).href);

/** Campanha-fixture: a mesma para todo sistema, só muda o id do sistema e o modo de jogo. */
function campanhaFixture(sistema) {
  const historia = sistema.id === "historia";
  return {
    id: 1,
    nome: "Campanha-fixture dos golden tests",
    sistema: sistema.id,
    cenario: "Uma cidade portuária afundando aos poucos, onde o farol apaga toda vez que alguém mente.",
    tom: "sombrio e debochado",
    resumo: "",
    resumoAte: 0,
    cena: { titulo: "Cais Velho", local: "Cais Velho, debaixo do farol", momento: "Noite", clima: "garoa", situacao: "O faroleiro sumiu.", combate: null, musica: { humor: "misterio", energia: "baixa" } },
    config: { modoJogo: historia ? "historia" : "avancado", dados: "jogador", modo: "livre", dificuldade: "justa", narracao: "media", sugestoes: true },
    criadaEm: "2026-01-01 20:00:00",
    atualizadaEm: "2026-01-01 20:00:00",
  };
}

/** Personagem-fixture: primeira classe, primeira ancestralidade e primeiro antecedente do sistema, dados com semente. */
function personagemFixture(sistema) {
  definirGerador(semente(20261101));
  try {
    const ficha = sistema.criarFicha({
      nome: "Teodora Fixture",
      ancestralidade: sistema.ancestralidades[0]?.id ?? "",
      classe: sistema.classes[0]?.id ?? "",
      antecedente: sistema.antecedentes?.[0]?.id,
      historia: "Chegou na cidade com um baú lacrado e nenhuma explicação.",
      extras: sistema.id === "historia" ? { sexo: "mulher" } : {},
    });
    return { id: 1, campanhaId: 1, ficha, jogador: "Paulo", ordem: 0 };
  } finally {
    definirGerador(null);
  }
}

function fotografar(sistema) {
  const campanha = campanhaFixture(sistema);
  const personagens = [personagemFixture(sistema)];
  const ferramentas = definirFerramentas({ campanha, sistema, personagens, antes: () => {} });
  const prompt = promptDoSistema(campanha, sistema, personagens);
  return { sistema: sistema.id, ferramentas, prompt };
}

/** JSON estável e legível: o prompt vai como lista de linhas para o diff mostrar a linha certa. */
function serializar(foto) {
  return JSON.stringify({ sistema: foto.sistema, ferramentas: foto.ferramentas, prompt: foto.prompt.split("\n") }, null, 2) + "\n";
}

function primeiraDiferenca(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return { linha: i + 1, gravado: la[i] ?? "(fim)", atual: lb[i] ?? "(fim)" };
  }
  return null;
}

let falhas = 0;
try {
  mkdirSync(PASTA, { recursive: true });
  const vistos = new Set();
  for (const sistema of SISTEMAS) {
    if (!sistema.pronto) continue;
    const arquivo = path.join(PASTA, `${sistema.id}.json`);
    vistos.add(path.basename(arquivo));
    let foto;
    try {
      foto = serializar(fotografar(sistema));
    } catch (e) {
      console.error(`✖ ${sistema.id}: não deu para fotografar (${e instanceof Error ? e.message : e})`);
      falhas++;
      continue;
    }
    if (modo === "update") {
      writeFileSync(arquivo, foto, "utf8");
      console.log(`✓ ${sistema.id}: gravado em ${path.relative(RAIZ, arquivo)}`);
      continue;
    }
    if (!existsSync(arquivo)) {
      console.error(`✖ ${sistema.id}: sem golden gravado (rode npm run golden:update)`);
      falhas++;
      continue;
    }
    const gravado = readFileSync(arquivo, "utf8");
    if (gravado === foto) {
      console.log(`✓ ${sistema.id}: igual ao gravado`);
      continue;
    }
    const dif = primeiraDiferenca(gravado, foto);
    console.error(`✖ ${sistema.id}: diverge do gravado na linha ${dif?.linha}\n    gravado: ${dif?.gravado}\n    atual:   ${dif?.atual}`);
    falhas++;
  }
  if (modo === "check") {
    for (const nome of readdirSync(PASTA).filter((n) => n.endsWith(".json") && !vistos.has(n))) {
      console.error(`✖ ${nome}: golden de um sistema que não existe mais (apague ou rode golden:update)`);
      falhas++;
    }
  }
} finally {
  process.chdir(RAIZ);
  // o banco vazio que o prompt abriu (db.ts guarda a conexão em globalThis.__tavernaDb) precisa fechar antes de apagar a pasta
  try {
    globalThis.__tavernaDb?.close();
  } catch {
    /* já fechado */
  }
  try {
    rmSync(temporario, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (e) {
    console.warn(`(não deu para apagar a pasta temporária ${temporario}: ${e instanceof Error ? e.message : e})`);
  }
}

if (falhas) {
  console.error(`\n${falhas} ${falhas === 1 ? "divergência" : "divergências"}. Se a mudança foi intencional: npm run golden:update`);
  process.exit(1);
}
console.log(modo === "update" ? "\nGolden atualizado." : "\nGolden confere: nada mudou no que o mestre recebe.");
