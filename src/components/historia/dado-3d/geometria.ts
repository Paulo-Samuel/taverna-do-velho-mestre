import { Matrix4, Quaternion, Vector3 } from "three";

// Geometria do d20: icosaedro regular com 20 faces numeradas (faces opostas somam 21, como num dado de verdade)
// e a conta da rotação que deixa uma face escolhida virada para a câmera.

const PHI = (1 + Math.sqrt(5)) / 2;

/** câmera fica no eixo +Z olhando para a origem: "virada para a câmera" = normal apontando para +Z */
export const DIRECAO_CAMERA = new Vector3(0, 0, 1);

export type FaceD20 = {
  /** número impresso na face (1–20) */
  numero: number;
  /** vértices em ordem anti-horária vista de fora; `a` é o "topo" do número */
  a: Vector3;
  b: Vector3;
  c: Vector3;
  /** normal unitária para fora */
  normal: Vector3;
  /** direção unitária, no plano da face, do centro até o vértice `a` (o "para cima" do número) */
  cima: Vector3;
};

function verticesIcosaedro(): Vector3[] {
  const v: Vector3[] = [];
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      v.push(new Vector3(0, s1, s2 * PHI));
      v.push(new Vector3(s1, s2 * PHI, 0));
      v.push(new Vector3(s2 * PHI, 0, s1));
    }
  }
  // raio circunscrito = 1
  return v.map((p) => p.normalize());
}

/** as 20 faces do d20, cada uma com seu número; cacheado porque a geometria nunca muda */
let cache: FaceD20[] | null = null;

export function facesD20(): FaceD20[] {
  if (cache) return cache;
  const v = verticesIcosaedro();
  // aresta do icosaedro com raio 1: menor distância entre vértices
  const aresta = v[0].distanceTo(v.slice(1).reduce((m, p) => (v[0].distanceTo(p) < v[0].distanceTo(m) ? p : m)));
  const vizinhos = (i: number, j: number) => Math.abs(v[i].distanceTo(v[j]) - aresta) < 1e-6;

  const triangulos: [number, number, number][] = [];
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++)
      for (let k = j + 1; k < v.length; k++)
        if (vizinhos(i, j) && vizinhos(j, k) && vizinhos(i, k)) triangulos.push([i, j, k]);

  // ordem estável: de cima para baixo, depois pelo ângulo em volta do eixo Y
  const centro = (t: [number, number, number]) => new Vector3().add(v[t[0]]).add(v[t[1]]).add(v[t[2]]).divideScalar(3);
  triangulos.sort((t1, t2) => {
    const c1 = centro(t1);
    const c2 = centro(t2);
    if (Math.abs(c1.y - c2.y) > 1e-6) return c2.y - c1.y;
    return Math.atan2(c1.z, c1.x) - Math.atan2(c2.z, c2.x);
  });

  // numeração: cada face sem número recebe o próximo da lista e a oposta recebe 21 - n
  // (a lista tem um número de cada par e espalha altos e baixos, como num d20 de verdade)
  const numeros = new Array<number>(triangulos.length).fill(0);
  const centros = triangulos.map(centro);
  const ordem = [20, 2, 8, 14, 17, 12, 6, 11, 3, 5];
  let proximo = 0;
  for (let i = 0; i < triangulos.length; i++) {
    if (numeros[i]) continue;
    const oposta = centros.findIndex((c) => c.clone().add(centros[i]).lengthSq() < 1e-9);
    numeros[i] = ordem[proximo];
    numeros[oposta] = 21 - ordem[proximo];
    proximo++;
  }

  cache = triangulos.map((t, i) => {
    const a = v[t[0]].clone();
    let b = v[t[1]].clone();
    let c = v[t[2]].clone();
    const c0 = centros[i];
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
    if (normal.dot(c0) < 0) {
      [b, c] = [c, b];
      normal.negate();
    }
    const cima = a.clone().sub(c0).normalize();
    return { numero: numeros[i], a, b, c, normal, cima };
  });
  return cache;
}

export function faceDoNumero(numero: number): FaceD20 {
  const face = facesD20().find((f) => f.numero === numero);
  if (!face) throw new Error(`d20 não tem a face ${numero}`);
  return face;
}

/**
 * Rotação que leva a face `numero` a ficar de frente para a câmera (normal → +Z), com o número em pé (+Y)
 * e depois girada `giro` radianos em volta do eixo da câmera.
 */
export function rotacaoParaFace(numero: number, giro = 0): Quaternion {
  const face = faceDoNumero(numero);
  const direita = new Vector3().crossVectors(face.cima, face.normal).normalize();
  // base da face (direita, cima, normal) → base do mundo (X, Y, Z): é a inversa da matriz com essas colunas
  const base = new Matrix4().makeBasis(direita, face.cima, face.normal);
  const alinhar = new Quaternion().setFromRotationMatrix(base).invert();
  const girar = new Quaternion().setFromAxisAngle(DIRECAO_CAMERA, giro);
  return girar.multiply(alinhar);
}

/** número da face cuja normal, depois da rotação `q`, aponta mais para a câmera */
export function faceVoltadaParaCamera(q: Quaternion): number {
  let melhor = 0;
  let melhorDot = -Infinity;
  for (const f of facesD20()) {
    const d = f.normal.clone().applyQuaternion(q).dot(DIRECAO_CAMERA);
    if (d > melhorDot) {
      melhorDot = d;
      melhor = f.numero;
    }
  }
  return melhor;
}
