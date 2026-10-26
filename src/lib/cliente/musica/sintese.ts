// Síntese pura (sem Web Audio): gera as amostras que o motor põe em AudioBuffers.
// Nada aqui toca em window ou AudioContext, então roda no Node para teste e não quebra no SSR.

export type Aleatorio = () => number;

/** Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma música. */
export function criarAleatorio(semente: number): Aleatorio {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CordaPincada = {
  amostras: Float32Array;
  /** correção de afinação: o laço de Karplus-Strong só tem atraso inteiro, então o buffer toca um tiquinho mais rápido ou lento */
  taxaReproducao: number;
};

/**
 * Corda dedilhada por Karplus-Strong: um pulso de ruído recircula numa linha de atraso com média de duas amostras
 * (filtro passa-baixa), e o som apaga sozinho como alaúde ou harpa.
 * brilho (0..1) suaviza o ruído inicial (menos = mais abafado); sustentacao (<1) é a perda por volta do laço.
 */
export function karplusStrong(
  taxa: number,
  frequencia: number,
  segundos: number,
  opcoes: { brilho?: number; sustentacao?: number } = {},
  rng: Aleatorio = Math.random,
): CordaPincada {
  const brilho = opcoes.brilho ?? 0.5;
  const sustentacao = opcoes.sustentacao ?? 0.995;
  const atraso = Math.max(2, Math.floor(taxa / frequencia - 0.5));
  const total = Math.max(atraso + 2, Math.floor(taxa * segundos));
  const y = new Float32Array(total);

  // excitação: ruído passado num passa-baixa de um polo, sem componente contínua
  let anterior = 0;
  let soma = 0;
  for (let i = 0; i < atraso; i++) {
    anterior += brilho * (rng() * 2 - 1 - anterior);
    y[i] = anterior;
    soma += anterior;
  }
  const media = soma / atraso;
  for (let i = 0; i < atraso; i++) y[i] -= media;

  // o laço: cada amostra é a média das duas de uma volta atrás, um pouco atenuada
  for (let i = atraso; i < total; i++) {
    const a = y[i - atraso];
    const b = i - atraso - 1 >= 0 ? y[i - atraso - 1] : 0;
    y[i] = sustentacao * 0.5 * (a + b);
  }

  // normaliza pelo pico e apaga os últimos 30 ms (sem estalo no fim do buffer)
  let pico = 0;
  for (let i = 0; i < total; i++) pico = Math.max(pico, Math.abs(y[i]));
  const k = pico > 0 ? 1 / pico : 1;
  const cauda = Math.min(total, Math.floor(taxa * 0.03));
  for (let i = 0; i < total; i++) {
    const resto = total - i;
    y[i] *= k * (resto < cauda ? resto / cauda : 1);
  }

  // o atraso efetivo do laço é atraso + 0,5 amostra (a média de duas amostras atrasa meia amostra)
  const frequenciaReal = taxa / (atraso + 0.5);
  return { amostras: y, taxaReproducao: frequencia / frequenciaReal };
}

/** Resposta ao impulso de um salão de pedra: ruído estéreo com queda exponencial (-60 dB no fim) e cauda escurecendo. */
export function impulsoReverb(taxa: number, segundos: number, rng: Aleatorio = Math.random): [Float32Array, Float32Array] {
  const total = Math.max(1, Math.floor(taxa * segundos));
  const preAtraso = Math.floor(taxa * 0.018);
  const canais: [Float32Array, Float32Array] = [new Float32Array(total), new Float32Array(total)];
  for (const canal of canais) {
    let filtrado = 0;
    for (let i = preAtraso; i < total; i++) {
      const t = (i - preAtraso) / (total - preAtraso);
      const envelope = Math.exp(-6.9 * t);
      // o coeficiente do passa-baixa cai com o tempo: os agudos morrem antes dos graves
      const coef = 0.85 - 0.75 * t;
      filtrado += coef * (rng() * 2 - 1 - filtrado);
      canal[i] = filtrado * envelope;
    }
  }
  // normaliza para o reverb não estourar o volume
  let energia = 0;
  for (const canal of canais) for (let i = 0; i < total; i++) energia += canal[i] * canal[i];
  const k = energia > 0 ? 1 / Math.sqrt(energia / 2) : 1;
  for (const canal of canais) for (let i = 0; i < total; i++) canal[i] *= k * 0.5;
  return canais;
}

/** Ruído branco simples (base de chocalho, ataque de tambor). */
export function ruidoBranco(taxa: number, segundos: number, rng: Aleatorio = Math.random): Float32Array {
  const y = new Float32Array(Math.max(1, Math.floor(taxa * segundos)));
  for (let i = 0; i < y.length; i++) y[i] = rng() * 2 - 1;
  return y;
}

/**
 * Murmúrio de conversa: várias "vozes" de ruído picotadas em sílabas (80 a 260 ms) com pausas, em laço sem emenda.
 * O motor ainda passa isso num passa-faixa na região da voz, e toca bem baixinho.
 */
export function murmurio(taxa: number, segundos: number, vozes = 6, rng: Aleatorio = Math.random): Float32Array {
  const total = Math.max(1, Math.floor(taxa * segundos));
  const envelope = new Float32Array(total);
  for (let v = 0; v < vozes; v++) {
    let i = Math.floor(rng() * taxa * 0.5);
    const forca = 0.5 + rng() * 0.5;
    while (i < total) {
      const silaba = Math.floor(taxa * (0.08 + rng() * 0.18));
      for (let j = 0; j < silaba; j++) {
        // seno elevado: sobe e desce suave, como uma sílaba
        envelope[(i + j) % total] += forca * Math.sin((Math.PI * j) / silaba) ** 2;
      }
      i += silaba;
      // pausa curta entre sílabas, às vezes uma pausa de respiração
      i += Math.floor(taxa * (rng() < 0.15 ? 0.4 + rng() * 0.8 : 0.02 + rng() * 0.08));
    }
  }
  const y = new Float32Array(total);
  let pico = 0;
  for (let i = 0; i < total; i++) {
    y[i] = (rng() * 2 - 1) * envelope[i];
    pico = Math.max(pico, Math.abs(y[i]));
  }
  if (pico > 0) for (let i = 0; i < total; i++) y[i] /= pico;
  return y;
}

/** Chuva: chiado suave (ruído num passa-baixa) com gotas soltas em cima, em laço. */
export function chuva(taxa: number, segundos: number, rng: Aleatorio = Math.random): Float32Array {
  const total = Math.max(1, Math.floor(taxa * segundos));
  const y = new Float32Array(total);
  let filtrado = 0;
  for (let i = 0; i < total; i++) {
    filtrado += 0.35 * (rng() * 2 - 1 - filtrado);
    y[i] = filtrado * 0.6;
  }
  // gotas: estalinhos curtos de ruído com queda rápida
  const gotas = Math.floor(segundos * 40);
  for (let g = 0; g < gotas; g++) {
    const inicio = Math.floor(rng() * total);
    const tamanho = Math.floor(taxa * (0.004 + rng() * 0.01));
    const forca = 0.2 + rng() * 0.5;
    for (let j = 0; j < tamanho; j++) y[(inicio + j) % total] += forca * (rng() * 2 - 1) * Math.exp((-5 * j) / tamanho);
  }
  let pico = 0;
  for (let i = 0; i < total; i++) pico = Math.max(pico, Math.abs(y[i]));
  if (pico > 0) for (let i = 0; i < total; i++) y[i] /= pico;
  return y;
}

/** Chiado de disco: estalos esparsos de agulha e um sopro baixinho, em laço. */
export function chiado(taxa: number, segundos: number, rng: Aleatorio = Math.random): Float32Array {
  const total = Math.max(1, Math.floor(taxa * segundos));
  const y = new Float32Array(total);
  for (let i = 0; i < total; i++) y[i] = (rng() * 2 - 1) * 0.06;
  const estalos = Math.floor(segundos * 14);
  for (let e = 0; e < estalos; e++) {
    const i = Math.floor(rng() * total);
    const forca = (rng() < 0.15 ? 0.9 : 0.35) * (rng() < 0.5 ? -1 : 1);
    for (let j = 0; j < 6; j++) y[(i + j) % total] += forca * Math.exp(-j);
  }
  let pico = 0;
  for (let i = 0; i < total; i++) pico = Math.max(pico, Math.abs(y[i]));
  if (pico > 0) for (let i = 0; i < total; i++) y[i] /= pico;
  return y;
}

/** Ruído marrom (integrado): ronco grave de cidade ao longe. */
export function ruidoMarrom(taxa: number, segundos: number, rng: Aleatorio = Math.random): Float32Array {
  const total = Math.max(1, Math.floor(taxa * segundos));
  const y = new Float32Array(total);
  let v = 0;
  let pico = 0;
  for (let i = 0; i < total; i++) {
    v = (v + 0.02 * (rng() * 2 - 1)) * 0.998;
    y[i] = v;
    pico = Math.max(pico, Math.abs(v));
  }
  // emenda do laço: apaga início e fim em 50 ms
  const borda = Math.min(total >> 1, Math.floor(taxa * 0.05));
  for (let i = 0; i < borda; i++) {
    y[i] *= i / borda;
    y[total - 1 - i] *= i / borda;
  }
  if (pico > 0) for (let i = 0; i < total; i++) y[i] /= pico;
  return y;
}
