import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// G14: matizes, graus, botão e fita têm contraste WCAG >= 4,5:1 em todos os temas (lê src/app/temas.css como texto).

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS = fs.readFileSync(path.join(RAIZ, "src/app/temas.css"), "utf8");

const TEMAS = ["padrao", "historia", "dnd5e", "pf2e", "pf1e", "osr", "d100", "fate", "pbta", "vtm5"];
const MINIMO = 4.5;
const HEX = /^#[0-9a-f]{6}$/i;

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  assert.match(hex, HEX, `hex inválido: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

/** Luminância relativa do WCAG 2.x (canal sRGB linearizado). */
function luminancia(cor: Rgb): number {
  const [r, g, b] = cor.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: Rgb, b: Rgb): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Aproximação do color-mix(in srgb, a p%, b): mistura linear canal a canal. */
function misturar(a: Rgb, b: Rgb, parteDeA: number): Rgb {
  return a.map((c, i) => Math.round(c * parteDeA + b[i] * (1 - parteDeA))) as Rgb;
}

function declaracoes(corpo: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const m of corpo.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) saida[m[1]] = m[2];
  return saida;
}

/** Tokens de cor do bloco [data-tema="<id>"] (os blocos não têm chaves aninhadas). */
function blocoDoTema(id: string): Record<string, string> {
  const m = new RegExp(`\\[data-tema="${id}"\\]\\s*\\{([^}]*)\\}`).exec(CSS);
  assert.ok(m, `bloco do tema ${id} não encontrado`);
  return declaracoes(m[1]);
}

// o bloco só `:root { }` com os matizes e os graus (o do tema padrão é `:root, [data-tema="padrao"]`)
const blocoRaiz = /(?:^|\n):root\s*\{([^}]*)\}/.exec(CSS);
assert.ok(blocoRaiz, "bloco :root dos matizes não encontrado");
const CORPO_RAIZ: string = blocoRaiz[1];
const TOKENS_RAIZ = declaracoes(CORPO_RAIZ);
const MATIZES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ nome: `--matiz-${n}`, hex: TOKENS_RAIZ[`--matiz-${n}`] ?? "" }));
const GRAUS = ["--grau-sucesso", "--grau-parcial", "--grau-falha"].map((nome) => ({ nome, hex: TOKENS_RAIZ[nome] ?? "" }));

function exigir(texto: Rgb, fundo: Rgb, rotulo: string) {
  const c = contraste(texto, fundo);
  assert.ok(c >= MINIMO, `${rotulo}: ${c.toFixed(2)}:1 (mínimo ${MINIMO}:1)`);
}

describe("matizes e graus", () => {
  it("a conta de contraste é a do WCAG", () => {
    assert.equal(Math.round(contraste(rgb("#000000"), rgb("#ffffff")) * 100) / 100, 21);
    assert.ok(Math.abs(contraste(rgb("#777777"), rgb("#ffffff")) - 4.48) < 0.01);
  });

  it("os 8 matizes e os 3 graus existem, são hex válidos e os matizes são distintos", () => {
    for (const m of MATIZES) assert.match(m.hex, HEX, m.nome);
    assert.equal(new Set(MATIZES.map((m) => m.hex.toLowerCase())).size, 8);
    for (const g of GRAUS) assert.match(g.hex, HEX, g.nome);
  });

  it("--matiz não é definido na raiz e as classes .matiz-N existem", () => {
    assert.ok(!/--matiz\s*:/.test(CORPO_RAIZ), "--matiz na raiz prenderia o padrão no âmbar da raiz");
    for (let n = 1; n <= 8; n++) {
      assert.ok(new RegExp(`\\.matiz-${n}\\s*\\{\\s*--matiz:\\s*var\\(--matiz-${n}\\);\\s*\\}`).test(CSS), `.matiz-${n}`);
    }
  });

  it("--estrelas é uma imagem só e os temas de papel a desligam", () => {
    const m = /--estrelas:\s*([^;]+);/.exec(CORPO_RAIZ);
    assert.ok(m, "--estrelas");
    assert.equal(m[1].match(/url\(/g)?.length, 1);
    assert.ok(m[1].includes("width='420' height='420'"));
    for (const id of ["pf2e", "osr", "d100"]) {
      assert.ok(new RegExp(`\\[data-tema="${id}"\\]\\s*\\{[^}]*--estrelas:\\s*none;`).test(CSS), id);
    }
  });

  it("--estrelas-2 é a segunda camada (613px, mais rala) e os temas de papel a desligam", () => {
    const m = /--estrelas-2:\s*([^;]+);/.exec(CORPO_RAIZ);
    assert.ok(m, "--estrelas-2");
    assert.equal(m[1].match(/url\(/g)?.length, 1);
    assert.ok(m[1].includes("width='613' height='613'"));
    const pontos = [...m[1].matchAll(/fill-opacity='([.\d]+)'/g)].map((p) => Number(p[1]));
    assert.ok(pontos.length >= 8 && pontos.length <= 9, `${pontos.length} pontos`);
    assert.ok(Math.max(...pontos) <= 0.35, "opacidade máxima .35");
    for (const id of ["pf2e", "osr", "d100"]) {
      assert.ok(new RegExp(`\\[data-tema="${id}"\\]\\s*\\{[^}]*--estrelas-2:\\s*none;`).test(CSS), id);
    }
  });

  it("os pontos de --estrelas não passam de .45 de opacidade", () => {
    const m = /--estrelas:\s*([^;]+);/.exec(CORPO_RAIZ);
    assert.ok(m, "--estrelas");
    const pontos = [...m[1].matchAll(/fill-opacity='([.\d]+)'/g)].map((p) => Number(p[1]));
    assert.ok(pontos.length > 0 && Math.max(...pontos) <= 0.45);
  });

  it("o valor inicial do @property --sangue é o do tema padrão", () => {
    const inicial = /@property --sangue \{[^}]*initial-value:\s*(#[0-9a-fA-F]{6})/.exec(CSS);
    assert.ok(inicial, "@property --sangue");
    assert.equal(inicial[1].toLowerCase(), blocoDoTema("padrao")["--sangue"].toLowerCase());
  });
});

for (const id of TEMAS) {
  describe(`contraste no tema ${id}`, () => {
    const t = blocoDoTema(id);
    const cor = (nome: string) => {
      assert.ok(t[nome], `${id}: falta ${nome}`);
      return rgb(t[nome]);
    };

    it("cada matiz se lê sobre as superfícies e sobre o cartão e a etiqueta tingidos", () => {
      const surface = cor("--surface");
      const surface2 = cor("--surface-2");
      for (const m of MATIZES) {
        const c = rgb(m.hex);
        exigir(c, surface, `${id} ${m.nome} sobre --surface`);
        exigir(c, surface2, `${id} ${m.nome} sobre --surface-2`);
        exigir(c, misturar(c, surface, 0.07), `${id} ${m.nome} sobre cartao-matiz`);
        exigir(c, misturar(c, surface2, 0.12), `${id} ${m.nome} sobre etiqueta-matiz`);
      }
    });

    it("os graus se leem sobre a superfície e o fundo", () => {
      for (const g of GRAUS) {
        exigir(rgb(g.hex), cor("--surface"), `${id} ${g.nome} sobre --surface`);
        exigir(rgb(g.hex), cor("--background"), `${id} ${g.nome} sobre --background`);
      }
    });

    it("o texto do botão se lê sobre o botão em repouso (o degradê mistura --botao e --botao-hover)", () => {
      exigir(cor("--botao-texto"), cor("--botao"), `${id} --botao-texto sobre --botao`);
      exigir(cor("--botao-texto"), misturar(cor("--botao-hover"), cor("--botao"), 0.85), `${id} --botao-texto sobre o topo do degradê`);
    });

    it("o texto do botão se lê sobre o botão aceso", () => {
      exigir(cor("--botao-texto"), cor("--botao-hover"), `${id} --botao-texto sobre --botao-hover`);
    });

    it("texto, muted, âmbar, âmbar-forte, sangue e musgo se leem sobre o fundo e as duas superfícies", () => {
      for (const nome of ["--foreground", "--muted", "--ambar", "--ambar-forte", "--sangue", "--musgo"]) {
        for (const fundo of ["--background", "--surface", "--surface-2"]) {
          exigir(cor(nome), cor(fundo), `${id} ${nome} sobre ${fundo}`);
        }
      }
    });

    it("o texto do botão de perigo cheio (cor do fundo) se lê sobre o sangue", () => {
      exigir(cor("--background"), cor("--sangue"), `${id} --background sobre --sangue`);
    });

    it("o texto do botão de perigo aceso (70% sangue + pergaminho) se lê sobre o fundo tingido de 12% de sangue", () => {
      const sangue = cor("--sangue");
      const texto = misturar(sangue, cor("--pergaminho"), 0.7);
      for (const fundo of ["--background", "--surface", "--surface-2"]) {
        exigir(texto, misturar(sangue, cor(fundo), 0.12), `${id} btn-perigo aceso sobre ${fundo}`);
      }
    });

    it("o âmbar se lê sobre a própria etiqueta tingida (12% de âmbar sobre --surface-2)", () => {
      const ambar = cor("--ambar");
      exigir(ambar, misturar(ambar, cor("--surface-2"), 0.12), `${id} --ambar sobre etiqueta-matiz`);
    });

    it("o texto da fita (cor do fundo) se lê sobre o âmbar e sobre cada matiz", () => {
      const fundo = cor("--background");
      exigir(fundo, cor("--ambar"), `${id} --background sobre --ambar`);
      for (const m of MATIZES) exigir(fundo, rgb(m.hex), `${id} --background sobre ${m.nome}`);
    });
  });
}
