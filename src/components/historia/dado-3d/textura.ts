// Atlas de texturas do d20: uma célula por face (5 colunas × 4 linhas), cada uma com o triângulo da face,
// borda dourada e o número em osso. A geometria usa `uvDaCelula` para mapear cada face na sua célula.

export const CELULA = 256;
export const COLUNAS = 5;
export const LINHAS = 4;

const LADO = 236; // lado do triângulo na célula (px)
const ALTURA = (LADO * Math.sqrt(3)) / 2;
const TOPO = (CELULA - ALTURA) / 2;

export const CORES = {
  resina: "#5a3517",
  resinaClara: "#8a5524",
  resinaEscura: "#2a170a",
  ouro: "#e3b25a",
  ouroEscuro: "#8f6122",
  osso: "#f3e6c8",
  contorno: "#1d1007",
};

/** cantos do triângulo da face na célula, em px (apex, base esquerda, base direita) */
function cantos(coluna: number, linha: number): [number, number][] {
  const x0 = coluna * CELULA;
  const y0 = linha * CELULA;
  return [
    [x0 + CELULA / 2, y0 + TOPO],
    [x0 + CELULA / 2 - LADO / 2, y0 + TOPO + ALTURA],
    [x0 + CELULA / 2 + LADO / 2, y0 + TOPO + ALTURA],
  ];
}

/** UVs (apex, base esquerda, base direita) da célula `indice`; v cresce para cima (flipY da textura) */
export function uvDaCelula(indice: number): [number, number][] {
  const largura = CELULA * COLUNAS;
  const altura = CELULA * LINHAS;
  return cantos(indice % COLUNAS, Math.floor(indice / COLUNAS)).map(([x, y]) => [x / largura, 1 - y / altura]);
}

/** desenha o atlas; `numeros[i]` é o número da face que usa a célula i */
export function desenharAtlas(numeros: number[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CELULA * COLUNAS;
  canvas.height = CELULA * LINHAS;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // fundo dourado: o que vazar das bordas no mipmap continua parecendo aresta de ouro
  ctx.fillStyle = CORES.ouroEscuro;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  numeros.forEach((numero, i) => {
    const [[ax, ay], [bx, by], [cx, cy]] = cantos(i % COLUNAS, Math.floor(i / COLUNAS));
    const centroX = (ax + bx + cx) / 3;
    const centroY = (ay + by + cy) / 3;

    const triangulo = () => {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
    };

    // resina âmbar escura com luz por dentro (mais clara no centro, escura nos cantos)
    const brilho = ctx.createRadialGradient(centroX, centroY - 10, 6, centroX, centroY, ALTURA * 0.75);
    brilho.addColorStop(0, CORES.resinaClara);
    brilho.addColorStop(0.55, CORES.resina);
    brilho.addColorStop(1, CORES.resinaEscura);
    triangulo();
    ctx.fillStyle = brilho;
    ctx.fill();

    // veios da resina: manchas suaves e determinísticas (mesmo número, mesmo desenho)
    ctx.save();
    triangulo();
    ctx.clip();
    let semente = numero * 9301 + 49297;
    const aleatorio = () => {
      semente = (semente * 9301 + 49297) % 233280;
      return semente / 233280;
    };
    for (let k = 0; k < 7; k++) {
      const x = centroX + (aleatorio() - 0.5) * LADO * 0.8;
      const y = centroY + (aleatorio() - 0.5) * ALTURA * 0.8;
      const r = 14 + aleatorio() * 34;
      const mancha = ctx.createRadialGradient(x, y, 0, x, y, r);
      mancha.addColorStop(0, aleatorio() > 0.5 ? "rgba(255, 210, 140, 0.10)" : "rgba(20, 8, 0, 0.18)");
      mancha.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = mancha;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();

    // borda dourada: traço grosso centrado na aresta (metade fica dentro da face) + filete claro
    triangulo();
    ctx.lineJoin = "round";
    ctx.strokeStyle = CORES.ouro;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 236, 190, 0.55)";
    ctx.lineWidth = 3;
    ctx.save();
    triangulo();
    ctx.clip();
    ctx.translate(centroX, centroY);
    ctx.scale(0.9, 0.9);
    ctx.translate(-centroX, -centroY);
    triangulo();
    ctx.stroke();
    ctx.restore();

    // número em osso com contorno escuro; 2 dígitos ficam um pouco mais estreitos
    const texto = String(numero);
    const fonte = texto.length > 1 ? 74 : 84;
    ctx.font = `bold ${fonte}px "Palatino Linotype", "Book Antiqua", Palatino, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const y = centroY + 4;
    ctx.lineWidth = 8;
    ctx.strokeStyle = CORES.contorno;
    ctx.strokeText(texto, centroX, y);
    ctx.fillStyle = numero === 20 ? CORES.ouro : numero === 1 ? "#d9583f" : CORES.osso;
    ctx.fillText(texto, centroX, y);

    // ponto sob o 6 e o 9 para não confundir os dois
    if (numero === 6 || numero === 9) {
      ctx.beginPath();
      ctx.arc(centroX, y + fonte * 0.52, 6, 0, Math.PI * 2);
      ctx.fillStyle = CORES.osso;
      ctx.strokeStyle = CORES.contorno;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fill();
    }
  });

  return canvas;
}
