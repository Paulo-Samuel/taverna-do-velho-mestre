// Hooks de resolução para rodar o código do projeto direto no Node (sem Next, sem bundler, sem dependência de teste):
//   - "server-only" vira um módulo vazio (o pacote real lança erro fora de um Server Component);
//   - "@/x" (alias do tsconfig) vira "src/x";
//   - imports relativos sem extensão ("../dados", "./pf2e/pericias") ganham .ts/.tsx ou /index.ts, como o bundler faz.
// O TypeScript em si é lido pelo type stripping nativo do Node 24 (só tipos apagáveis: nada de enum, namespace nem JSX).
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../../", import.meta.url);
const SRC = new URL("src/", RAIZ);
const SERVER_ONLY = new URL("./server-only.mjs", import.meta.url).href;

const EXTENSOES = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function arquivo(url) {
  try {
    const caminho = fileURLToPath(url);
    return existsSync(caminho) && statSync(caminho).isFile() ? url : null;
  } catch {
    return null;
  }
}

/** Completa um caminho sem extensão: x.ts, x.tsx, x/index.ts... Devolve null quando nada existe. */
function completar(url) {
  if (/\.[a-z]+$/i.test(url.pathname) && arquivo(url)) return url;
  for (const ext of EXTENSOES) {
    const u = new URL(url.href + ext);
    if (arquivo(u)) return u;
  }
  for (const ext of EXTENSOES) {
    const u = new URL(`${url.href.replace(/\/$/, "")}/index${ext}`);
    if (arquivo(u)) return u;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: SERVER_ONLY, shortCircuit: true };

  if (specifier.startsWith("@/")) {
    const alvo = completar(new URL(specifier.slice(2), SRC));
    if (alvo) return { url: alvo.href, shortCircuit: true };
  }

  const relativo = specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
  if (relativo && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    // caminho absoluto do Windows ("/C:/...") ou URL de arquivo: só completa a extensão
    const alvo = completar(base);
    if (alvo) return { url: alvo.href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

/** O package.json do projeto não declara "type": todo .ts/.mts é ESM com tipos apagáveis (evita o aviso de redetecção do Node). */
export async function load(url, context, nextLoad) {
  if (/\.m?ts$/.test(url) && !url.includes("/node_modules/")) {
    const source = await readFile(fileURLToPath(url));
    return { format: "module-typescript", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
