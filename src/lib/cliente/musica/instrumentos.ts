import { karplusStrong, murmurio, ruidoBranco } from "./sintese";
import { midiParaHz, type Instrumento } from "./teoria";

// Instrumentos sintetizados com Web Audio. Só é usado depois que o AudioContext existe (nunca no topo do módulo).
// Notas soltas criam poucos nós e se desconectam sozinhas no fim; buffers (cordas, ruído) ficam em cache.

/** voz contínua de uma camada (pad, drone, conversa) */
export type VozContinua = {
  /** troca as notas (pad) a partir do instante t */
  definir: (midis: number[], t: number) => void;
  /** apaga e desliga tudo no instante t */
  parar: (t: number) => void;
};

const GANHO: Record<Instrumento, number> = {
  alaude: 0.42,
  harpa: 0.4,
  sino: 0.2,
  copo: 0.08,
  flauta: 0.2,
  metal: 0.14,
  baixo: 0.42,
  pulso: 0.3,
  tambor: 0.5,
  bumbo: 0.6,
  chocalho: 0.1,
};

const LIMITE_CACHE_CORDAS = 48;

type Fonte = AudioScheduledSourceNode;

/** desconecta os nós de uma nota quando a fonte termina */
function aoTerminar(fonte: Fonte, nos: AudioNode[]) {
  fonte.onended = () => {
    for (const no of nos) {
      try {
        no.disconnect();
      } catch {
        // já desconectado
      }
    }
    fonte.onended = null;
  };
}

export class Instrumentos {
  private readonly cordas = new Map<string, { buffer: AudioBuffer; taxa: number }>();
  private readonly ruido: AudioBuffer;
  private murmurioBuffer: AudioBuffer | null = null;

  constructor(private readonly ctx: AudioContext) {
    this.ruido = this.buffer(ruidoBranco(ctx.sampleRate, 1.5));
  }

  private buffer(amostras: Float32Array): AudioBuffer {
    const b = this.ctx.createBuffer(1, amostras.length, this.ctx.sampleRate);
    b.copyToChannel(amostras as Float32Array<ArrayBuffer>, 0);
    return b;
  }

  private corda(tipo: "alaude" | "harpa", midi: number) {
    const chave = `${tipo}:${midi}`;
    const pronta = this.cordas.get(chave);
    if (pronta) {
      // LRU simples: reinsere no fim
      this.cordas.delete(chave);
      this.cordas.set(chave, pronta);
      return pronta;
    }
    const harpa = tipo === "harpa";
    const { amostras, taxaReproducao } = karplusStrong(this.ctx.sampleRate, midiParaHz(midi), harpa ? 2.6 : 1.4, {
      brilho: harpa ? 0.32 : 0.55,
      sustentacao: harpa ? 0.997 : 0.994,
    });
    const nova = { buffer: this.buffer(amostras), taxa: taxaReproducao };
    this.cordas.set(chave, nova);
    if (this.cordas.size > LIMITE_CACHE_CORDAS) {
      const maisVelha = this.cordas.keys().next().value;
      if (maisVelha !== undefined) this.cordas.delete(maisVelha);
    }
    return nova;
  }

  /** toca uma nota solta: t e duracao em segundos, intensidade 0..1 */
  tocar(instrumento: Instrumento, midi: number, t: number, duracao: number, intensidade: number, destino: AudioNode) {
    const v = GANHO[instrumento] * intensidade;
    switch (instrumento) {
      case "alaude":
      case "harpa":
        return this.dedilhar(instrumento, midi, t, duracao, v, destino);
      case "sino":
        return this.sino(midi, t, Math.max(2.5, duracao), v, destino);
      case "copo":
        return this.sino(midi, t, 0.35, v, destino);
      case "flauta":
        return this.flauta(midi, t, duracao, v, destino);
      case "metal":
        return this.metal(midi, t, duracao, v, destino);
      case "baixo":
        return this.baixo(midi, t, duracao, v, destino);
      case "pulso":
        return this.pulso(midi, t, duracao, v, destino);
      case "tambor":
        return this.tambor(midi, t, v, destino);
      case "bumbo":
        return this.bumbo(t, v, destino);
      case "chocalho":
        return this.chocalho(t, v, destino);
    }
  }

  private dedilhar(tipo: "alaude" | "harpa", midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const { buffer, taxa } = this.corda(tipo, midi);
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.playbackRate.value = taxa;
    const ganho = this.ctx.createGain();
    // a corda já apaga sozinha; o abafamento no fim da duração evita acúmulo
    const fim = t + Math.min(buffer.duration / taxa, Math.max(0.3, duracao) + (tipo === "harpa" ? 1.2 : 0.4));
    ganho.gain.setValueAtTime(v, t);
    ganho.gain.setTargetAtTime(0, fim - 0.15, 0.05);
    fonte.connect(ganho).connect(destino);
    fonte.start(t);
    fonte.stop(fim + 0.1);
    aoTerminar(fonte, [fonte, ganho]);
  }

  /** sino: parciais inarmônicos com decaimentos diferentes */
  private sino(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const parciais: [number, number, number][] = [
      [1, 1, 1],
      [2.76, 0.45, 0.6],
      [5.4, 0.2, 0.35],
    ];
    const nos: AudioNode[] = [];
    let ultima: OscillatorNode | null = null;
    for (const [razao, amp, queda] of parciais) {
      if (f * razao > 16000) continue;
      const osc = this.ctx.createOscillator();
      osc.frequency.value = f * razao;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v * amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duracao * queda);
      osc.connect(g).connect(destino);
      osc.start(t);
      osc.stop(t + duracao + 0.05);
      nos.push(osc, g);
      ultima = osc;
    }
    if (ultima) aoTerminar(ultima, nos);
  }

  private flauta(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    // vibrato que chega devagar
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 4.8 + Math.random() * 0.6;
    const profundidade = this.ctx.createGain();
    profundidade.gain.setValueAtTime(0, t);
    profundidade.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.6, duracao * 0.6));
    lfo.connect(profundidade).connect(osc.frequency);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = Math.min(12000, f * 3);
    const g = this.ctx.createGain();
    const ataque = Math.min(0.12, duracao * 0.3);
    const soltura = 0.25;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + ataque);
    g.gain.setValueAtTime(v * 0.85, t + Math.max(ataque, duracao - 0.05));
    g.gain.setTargetAtTime(0, t + duracao, soltura / 3);
    osc.connect(filtro).connect(g).connect(destino);
    const fim = t + duracao + soltura + 0.1;
    osc.start(t);
    lfo.start(t);
    osc.stop(fim);
    lfo.stop(fim);
    aoTerminar(osc, [osc, lfo, profundidade, filtro, g]);
  }

  /** metal de fanfarra: duas serras levemente desafinadas com filtro que abre no ataque */
  private metal(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 1.5;
    filtro.frequency.setValueAtTime(f * 1.5, t);
    filtro.frequency.linearRampToValueAtTime(Math.min(9000, f * 6), t + 0.06);
    filtro.frequency.setTargetAtTime(Math.min(6000, f * 3), t + 0.08, 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.04);
    g.gain.setValueAtTime(v * 0.8, t + Math.max(0.05, duracao - 0.05));
    g.gain.setTargetAtTime(0, t + duracao, 0.06);
    const oscs = [-8, 8].map((desafino) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = desafino;
      o.connect(filtro);
      o.start(t);
      o.stop(t + duracao + 0.4);
      return o;
    });
    filtro.connect(g).connect(destino);
    aoTerminar(oscs[1], [...oscs, filtro, g]);
  }

  private baixo(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = f;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = Math.min(2000, f * 4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.015);
    g.gain.setTargetAtTime(v * 0.55, t + 0.02, 0.15);
    g.gain.setTargetAtTime(0, t + duracao, 0.1);
    osc.connect(filtro).connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + duracao + 0.6);
    aoTerminar(osc, [osc, filtro, g]);
  }

  /** grave que incha e some (o "pulso" da tensão) */
  private pulso(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 4;
    filtro.frequency.setValueAtTime(f * 1.2, t);
    filtro.frequency.linearRampToValueAtTime(f * 5, t + duracao * 0.25);
    filtro.frequency.linearRampToValueAtTime(f * 1.2, t + duracao);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + duracao * 0.2);
    g.gain.linearRampToValueAtTime(0, t + duracao);
    osc.connect(filtro).connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + duracao + 0.05);
    aoTerminar(osc, [osc, filtro, g]);
  }

  /** tambor de mão: seno com queda de afinação + um toque de ruído na pele */
  private tambor(midi: number, t: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(f * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + 0.4);
    aoTerminar(osc, [osc, g]);

    const ruido = this.ctx.createBufferSource();
    ruido.buffer = this.ruido;
    const faixa = this.ctx.createBiquadFilter();
    faixa.type = "bandpass";
    faixa.frequency.value = 1400;
    const gr = this.ctx.createGain();
    gr.gain.setValueAtTime(v * 0.35, t);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    ruido.connect(faixa).connect(gr).connect(destino);
    ruido.start(t, Math.random() * 1.2, 0.07);
    aoTerminar(ruido, [ruido, faixa, gr]);
  }

  private bumbo(t: number, v: number, destino: AudioNode) {
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(destino);
    osc.start(t);
    osc.stop(t + 0.55);
    aoTerminar(osc, [osc, g]);
  }

  private chocalho(t: number, v: number, destino: AudioNode) {
    const ruido = this.ctx.createBufferSource();
    ruido.buffer = this.ruido;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "highpass";
    filtro.frequency.value = 5500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    ruido.connect(filtro).connect(g).connect(destino);
    ruido.start(t, Math.random() * 1.3, 0.09);
    aoTerminar(ruido, [ruido, filtro, g]);
  }

  /** pad: 4 vozes de duas serras desafinadas num passa-baixa que respira devagar */
  criarPad(destino: AudioNode, volume: number, brilho: number, inicio: number): VozContinua {
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = brilho;
    filtro.Q.value = 0.6;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.06 + Math.random() * 0.05;
    const lfoGanho = this.ctx.createGain();
    lfoGanho.gain.value = brilho * 0.35;
    lfo.connect(lfoGanho).connect(filtro.frequency);
    const g = this.ctx.createGain();
    g.gain.value = volume * 0.045;
    filtro.connect(g).connect(destino);
    const vozes: OscillatorNode[][] = [];
    for (let i = 0; i < 4; i++) {
      vozes.push(
        [-7, 7].map((d) => {
          const o = this.ctx.createOscillator();
          o.type = "sawtooth";
          o.detune.value = d;
          o.frequency.value = 110;
          o.connect(filtro);
          o.start(inicio);
          return o;
        }),
      );
    }
    lfo.start(inicio);
    let primeiro = true;
    const todos = vozes.flat();
    return {
      definir(midis, t) {
        if (!midis.length) return;
        vozes.forEach((par, i) => {
          // a 4ª voz dobra a fundamental uma oitava abaixo
          const m = i < midis.length ? midis[i] : midis[0] - 12;
          for (const o of par) {
            if (primeiro) o.frequency.setValueAtTime(midiParaHz(m), t);
            else o.frequency.setTargetAtTime(midiParaHz(m), t, 0.35);
          }
        });
        primeiro = false;
      },
      parar(t) {
        g.gain.setTargetAtTime(0, t, 0.1);
        for (const o of todos) o.stop(t + 0.6);
        lfo.stop(t + 0.6);
        aoTerminar(lfo, [...todos, lfo, lfoGanho, filtro, g]);
      },
    };
  }

  /** drone fixo: seno + serra baixinha por nota, com o volume ondulando devagar */
  criarDrone(destino: AudioNode, midis: number[], volume: number, inicio: number): VozContinua {
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = volume * 0.16;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGanho = this.ctx.createGain();
    lfoGanho.gain.value = volume * 0.05;
    lfo.connect(lfoGanho).connect(g.gain);
    filtro.connect(g).connect(destino);
    const oscs: OscillatorNode[] = [];
    for (const m of midis) {
      for (const tipo of ["sine", "sawtooth"] as const) {
        const o = this.ctx.createOscillator();
        o.type = tipo;
        o.frequency.value = midiParaHz(m);
        if (tipo === "sawtooth") o.detune.value = 4;
        const og = this.ctx.createGain();
        og.gain.value = tipo === "sine" ? 1 : 0.18;
        o.connect(og).connect(filtro);
        o.start(inicio);
        oscs.push(o);
        aoTerminar(o, [o, og]);
      }
    }
    lfo.start(inicio);
    return {
      definir() {},
      parar(t) {
        g.gain.setTargetAtTime(0, t, 0.1);
        for (const o of oscs) o.stop(t + 0.6);
        lfo.stop(t + 0.6);
        aoTerminar(lfo, [lfo, lfoGanho, filtro, g]);
      },
    };
  }

  /** murmúrio de conversa da taverna, em laço, bem baixinho */
  criarConversa(destino: AudioNode, volume: number, inicio: number): VozContinua {
    if (!this.murmurioBuffer) this.murmurioBuffer = this.buffer(murmurio(this.ctx.sampleRate, 7));
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = this.murmurioBuffer;
    fonte.loop = true;
    const graves = this.ctx.createBiquadFilter();
    graves.type = "highpass";
    graves.frequency.value = 250;
    const voz = this.ctx.createBiquadFilter();
    voz.type = "lowpass";
    voz.frequency.value = 1300;
    const g = this.ctx.createGain();
    g.gain.value = volume * 0.035;
    fonte.connect(graves).connect(voz).connect(g).connect(destino);
    fonte.start(inicio, Math.random() * 6);
    return {
      definir() {},
      parar(t) {
        g.gain.setTargetAtTime(0, t, 0.1);
        fonte.stop(t + 0.6);
        aoTerminar(fonte, [fonte, graves, voz, g]);
      },
    };
  }

  liberar() {
    this.cordas.clear();
    this.murmurioBuffer = null;
  }
}

/** reverb de salão com impulso gerado na hora */
export function criarReverb(ctx: AudioContext, impulso: [Float32Array, Float32Array]): ConvolverNode {
  const b = ctx.createBuffer(2, impulso[0].length, ctx.sampleRate);
  b.copyToChannel(impulso[0] as Float32Array<ArrayBuffer>, 0);
  b.copyToChannel(impulso[1] as Float32Array<ArrayBuffer>, 1);
  const conv = ctx.createConvolver();
  conv.normalize = false;
  conv.buffer = b;
  return conv;
}
