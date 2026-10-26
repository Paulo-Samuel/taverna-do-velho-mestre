import { chiado, chuva, karplusStrong, murmurio, ruidoBranco, ruidoMarrom } from "./sintese";
import { midiParaHz, type Efeitos, type Instrumento, type TimbreDrone, type TimbrePad } from "./teoria";

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
  orgao: 0.22,
  sinte: 0.11,
  baixoSinte: 0.3,
  quadrada: 0.075,
  piano: 0.4,
  caixinha: 0.26,
  teremim: 0.11,
  rabeca: 0.13,
  trompa: 0.15,
  cordas: 0.085,
  caixa: 0.3,
  clang: 0.16,
  coracao: 0.55,
};

type TipoAmbiente = NonNullable<Efeitos["ambiente"]>[number]["tipo"];

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
  private readonly ambientes = new Map<TipoAmbiente, AudioBuffer>();

  constructor(private readonly ctx: BaseAudioContext) {
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
      case "orgao":
        return this.orgao(midi, t, duracao, v, destino);
      case "sinte":
        return this.sinte(midi, t, duracao, v, destino);
      case "baixoSinte":
        return this.baixoSinte(midi, t, duracao, v, destino);
      case "quadrada":
        return this.quadrada(midi, t, duracao, v, destino);
      case "piano":
        return this.piano(midi, t, duracao, v, destino);
      case "caixinha":
        return this.caixinha(midi, t, v, destino);
      case "teremim":
        return this.teremim(midi, t, duracao, v, destino);
      case "rabeca":
        return this.rabeca(midi, t, duracao, v, destino);
      case "trompa":
        return this.trompa(midi, t, duracao, v, destino);
      case "cordas":
        return this.naipe(midi, t, duracao, v, destino);
      case "caixa":
        return this.caixa(t, v, destino);
      case "clang":
        return this.clang(midi, t, v, destino);
      case "coracao":
        return this.coracao(t, v, destino);
    }
  }

  /** envelope ADSR simples num ganho novo: ataque linear, cai para sustentacao, solta no fim */
  private envelope(t: number, duracao: number, v: number, ataque: number, sustentacao: number, soltura: number, queda = 0.2): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + ataque);
    g.gain.setTargetAtTime(v * sustentacao, t + ataque, queda);
    g.gain.setTargetAtTime(0, t + Math.max(ataque, duracao), soltura / 3);
    return g;
  }

  /** órgão de tubos: parciais em seno (registros 8', 4', 2 2/3', 2'), ataque de sopro e leve coro */
  private orgao(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const g = this.envelope(t, duracao, v, 0.09, 0.92, 0.5, 0.4);
    const parciais: [number, number][] = [
      [1, 1],
      [2, 0.55],
      [3, 0.3],
      [4, 0.22],
      [6, 0.1],
    ];
    const soma = parciais.reduce((s, [, a]) => s + a, 0);
    const nos: AudioNode[] = [g];
    let ultima: OscillatorNode | null = null;
    for (const [razao, amp] of parciais) {
      if (f * razao > 9000) continue;
      const o = this.ctx.createOscillator();
      o.frequency.value = f * razao;
      o.detune.value = (Math.random() - 0.5) * 6;
      const og = this.ctx.createGain();
      og.gain.value = amp / soma;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + duracao + 0.7);
      nos.push(o, og);
      ultima = o;
    }
    g.connect(destino);
    if (ultima) aoTerminar(ultima, nos);
  }

  /** sintetizador de darkwave: duas serras desafinadas num passa-baixa ressonante que fecha depois do ataque */
  private sinte(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 3;
    filtro.frequency.setValueAtTime(Math.min(8000, f * 7), t);
    filtro.frequency.setTargetAtTime(Math.min(4000, f * 2), t + 0.01, 0.25);
    const g = this.envelope(t, duracao, v, 0.012, 0.6, 0.45, 0.3);
    const oscs = [-10, 10].map((d) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(filtro);
      o.start(t);
      o.stop(t + duracao + 0.6);
      return o;
    });
    filtro.connect(g).connect(destino);
    aoTerminar(oscs[1], [...oscs, filtro, g]);
  }

  /** baixo de sintetizador: serra + quadrada uma oitava abaixo, filtro curto (o "pulso" do trip-hop/darkwave) */
  private baixoSinte(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 2;
    filtro.frequency.setValueAtTime(Math.min(2400, f * 9), t);
    filtro.frequency.setTargetAtTime(Math.max(120, f * 2), t + 0.005, 0.08);
    const g = this.envelope(t, duracao, v, 0.006, 0.55, 0.12, 0.15);
    const serra = this.ctx.createOscillator();
    serra.type = "sawtooth";
    serra.frequency.value = f;
    const sub = this.ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = f / 2;
    const subG = this.ctx.createGain();
    subG.gain.value = 0.35;
    serra.connect(filtro);
    sub.connect(subG).connect(filtro);
    filtro.connect(g).connect(destino);
    for (const o of [serra, sub]) {
      o.start(t);
      o.stop(t + duracao + 0.3);
    }
    aoTerminar(serra, [serra, sub, subG, filtro, g]);
  }

  /** onda quadrada crua com um passa-baixa fixo: o timbre do dungeon synth e dos teclados baratos dos anos 90 */
  private quadrada(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = Math.min(5000, f * 4);
    const g = this.envelope(t, duracao, v, 0.025, 0.7, 0.3, 0.5);
    o.connect(filtro).connect(g).connect(destino);
    o.start(t);
    o.stop(t + duracao + 0.4);
    aoTerminar(o, [o, filtro, g]);
  }

  /** piano: parciais levemente inarmônicos que apagam mais rápido nos agudos, com o toque do martelo */
  private piano(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const queda = Math.max(0.5, Math.min(3, 2.6 - (midi - 48) * 0.04));
    const fim = Math.min(queda * 1.6, duracao + 0.6);
    const nos: AudioNode[] = [];
    let ultima: OscillatorNode | null = null;
    const parciais: [number, number][] = [
      [1, 1],
      [2, 0.45],
      [3, 0.22],
      [4, 0.12],
      [5, 0.06],
    ];
    for (const [n, amp] of parciais) {
      const fn = f * n * Math.sqrt(1 + 0.0004 * n * n);
      if (fn > 12000) continue;
      const o = this.ctx.createOscillator();
      o.frequency.value = fn;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((v * amp) / 1.85, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(fim, queda / (1 + 0.5 * (n - 1))));
      o.connect(g).connect(destino);
      o.start(t);
      o.stop(t + fim + 0.05);
      nos.push(o, g);
      ultima = o;
    }
    if (ultima) aoTerminar(ultima, nos);
    // martelo: ruído curtinho e abafado
    const ruido = this.ctx.createBufferSource();
    ruido.buffer = this.ruido;
    const faixa = this.ctx.createBiquadFilter();
    faixa.type = "bandpass";
    faixa.frequency.value = Math.min(4000, f * 4);
    const gr = this.ctx.createGain();
    gr.gain.setValueAtTime(v * 0.12, t);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    ruido.connect(faixa).connect(gr).connect(destino);
    ruido.start(t, Math.random() * 1.2, 0.04);
    aoTerminar(ruido, [ruido, faixa, gr]);
  }

  /** caixinha de música: lâmina de metal (fundamental + parcial alto), desafinada ao acaso, cai devagar */
  private caixinha(midi: number, t: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi) * 2 ** (((Math.random() - 0.5) * 50) / 1200);
    const nos: AudioNode[] = [];
    let ultima: OscillatorNode | null = null;
    for (const [razao, amp, queda] of [
      [1, 1, 1.4],
      [5.95, 0.18, 0.25],
      [3.01, 0.08, 0.5],
    ] as const) {
      if (f * razao > 15000) continue;
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(f * razao * 1.004, t);
      o.frequency.exponentialRampToValueAtTime(f * razao, t + 0.08);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v * amp, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + queda);
      o.connect(g).connect(destino);
      o.start(t);
      o.stop(t + queda + 0.05);
      nos.push(o, g);
      ultima = o;
    }
    if (ultima) aoTerminar(ultima, nos);
  }

  /** teremim: senoide que desliza até a nota (glissando) e treme com vibrato largo */
  private teremim(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const partida = f * 2 ** ((Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5) / 12);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(partida, t);
    o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.6, duracao * 0.45));
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5.2 + Math.random() * 1.2;
    const prof = this.ctx.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(f * 0.018, t + Math.min(0.8, duracao * 0.5));
    lfo.connect(prof).connect(o.frequency);
    const g = this.envelope(t, duracao, v, Math.min(0.2, duracao * 0.3), 0.85, 0.6, 0.5);
    o.connect(g).connect(destino);
    const fim = t + duracao + 0.8;
    o.start(t);
    lfo.start(t);
    o.stop(fim);
    lfo.stop(fim);
    aoTerminar(o, [o, lfo, prof, g]);
  }

  /** rabeca: serra de arco com ressonâncias de caixa (picos), vibrato que chega devagar e um chiado de crina */
  private rabeca(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5.6 + Math.random() * 0.5;
    const prof = this.ctx.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.5, duracao * 0.7));
    lfo.connect(prof).connect(o.frequency);
    const corpo1 = this.ctx.createBiquadFilter();
    corpo1.type = "peaking";
    corpo1.frequency.value = 650;
    corpo1.Q.value = 2;
    corpo1.gain.value = 6;
    const corpo2 = this.ctx.createBiquadFilter();
    corpo2.type = "peaking";
    corpo2.frequency.value = 2600;
    corpo2.Q.value = 1.5;
    corpo2.gain.value = 4;
    const topo = this.ctx.createBiquadFilter();
    topo.type = "lowpass";
    topo.frequency.value = 4200;
    const g = this.envelope(t, duracao, v, Math.min(0.07, duracao * 0.3), 0.8, 0.18, 0.3);
    o.connect(corpo1).connect(corpo2).connect(topo).connect(g).connect(destino);
    const fim = t + duracao + 0.3;
    o.start(t);
    lfo.start(t);
    o.stop(fim);
    lfo.stop(fim);
    aoTerminar(o, [o, lfo, prof, corpo1, corpo2, topo, g]);
  }

  /** trompa: serras escuras num passa-baixa que abre devagar (sopro redondo, sem o brilho da fanfarra) */
  private trompa(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 0.7;
    filtro.frequency.setValueAtTime(f * 1.2, t);
    filtro.frequency.linearRampToValueAtTime(Math.min(3000, f * 3), t + 0.15);
    const g = this.envelope(t, duracao, v, 0.09, 0.85, 0.3, 0.4);
    const oscs = [-5, 5].map((d) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = d;
      o.connect(filtro);
      o.start(t);
      o.stop(t + duracao + 0.4);
      return o;
    });
    filtro.connect(g).connect(destino);
    aoTerminar(oscs[1], [...oscs, filtro, g]);
  }

  /** naipe de cordas: três serras desafinadas, ataque lento (arco), vibrato leve */
  private naipe(midi: number, t: number, duracao: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = Math.min(5000, f * 5);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5;
    const prof = this.ctx.createGain();
    prof.gain.value = 7;
    lfo.connect(prof);
    const g = this.envelope(t, duracao, v, Math.min(0.35, duracao * 0.4), 0.9, 0.7, 0.6);
    const oscs = [-12, 0, 12].map((d) => {
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = d;
      prof.connect(o.detune);
      o.connect(filtro);
      o.start(t);
      o.stop(t + duracao + 0.8);
      return o;
    });
    lfo.start(t);
    lfo.stop(t + duracao + 0.8);
    filtro.connect(g).connect(destino);
    aoTerminar(oscs[2], [...oscs, lfo, prof, filtro, g]);
  }

  /** caixa clara: esteira (ruído em faixa) + corpo (triângulo que cai) */
  private caixa(t: number, v: number, destino: AudioNode) {
    const ruido = this.ctx.createBufferSource();
    ruido.buffer = this.ruido;
    const faixa = this.ctx.createBiquadFilter();
    faixa.type = "bandpass";
    faixa.frequency.value = 2200;
    faixa.Q.value = 0.7;
    const gr = this.ctx.createGain();
    gr.gain.setValueAtTime(0.0001, t);
    gr.gain.exponentialRampToValueAtTime(v, t + 0.002);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    ruido.connect(faixa).connect(gr).connect(destino);
    ruido.start(t, Math.random() * 1.2, 0.2);
    aoTerminar(ruido, [ruido, faixa, gr]);

    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.7, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + 0.12);
    aoTerminar(o, [o, g]);
  }

  /** pancada metálica industrial: quadradas inarmônicas num passa-faixa estreito + estalo de ruído */
  private clang(midi: number, t: number, v: number, destino: AudioNode) {
    const f = midiParaHz(midi);
    const faixa = this.ctx.createBiquadFilter();
    faixa.type = "bandpass";
    faixa.frequency.value = Math.min(6000, f * 3);
    faixa.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const oscs = [1, 1.47, 2.09, 2.71].map((r) => {
      const o = this.ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f * r;
      o.connect(faixa);
      o.start(t);
      o.stop(t + 0.35);
      return o;
    });
    faixa.connect(g).connect(destino);
    aoTerminar(oscs[0], [...oscs, faixa, g]);
    this.caixa(t, v * 0.6, destino);
  }

  /** batida de coração: seno grave que cai, abafado */
  private coracao(t: number, v: number, destino: AudioNode) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 160;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(filtro).connect(g).connect(destino);
    o.start(t);
    o.stop(t + 0.3);
    aoTerminar(o, [o, filtro, g]);
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

  /** pad: 4 vozes de dois osciladores desafinados num passa-baixa que respira devagar; o timbre muda a onda */
  criarPad(destino: AudioNode, volume: number, brilho: number, inicio: number, timbre: TimbrePad = "serra"): VozContinua {
    const forma = TIMBRES_PAD[timbre];
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
    g.gain.value = volume * 0.045 * forma.ganho;
    filtro.connect(g).connect(destino);
    // vibrato das cordas: um LFO só mexendo no detune de todas as vozes
    let vibrato: OscillatorNode | null = null;
    let vibratoGanho: GainNode | null = null;
    if (forma.vibrato) {
      vibrato = this.ctx.createOscillator();
      vibrato.frequency.value = 4.6;
      vibratoGanho = this.ctx.createGain();
      vibratoGanho.gain.value = forma.vibrato;
      vibrato.connect(vibratoGanho);
      vibrato.start(inicio);
    }
    const vozes: OscillatorNode[][] = [];
    for (let i = 0; i < 4; i++) {
      vozes.push(
        forma.ondas.map(([tipo, d]) => {
          const o = this.ctx.createOscillator();
          o.type = tipo;
          o.detune.value = d;
          o.frequency.value = 110;
          if (vibratoGanho) vibratoGanho.connect(o.detune);
          o.connect(filtro);
          o.start(inicio);
          return o;
        }),
      );
    }
    lfo.start(inicio);
    let primeiro = true;
    const todos = vibrato ? [...vozes.flat(), vibrato] : vozes.flat();
    const soltos: AudioNode[] = vibratoGanho ? [vibratoGanho] : [];
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
        aoTerminar(lfo, [...todos, ...soltos, lfo, lfoGanho, filtro, g]);
      },
    };
  }

  /** drone fixo: seno + serra baixinha por nota, com o volume ondulando devagar.
   * "gaita" abre o filtro e realça a serra (bordão de gaita de foles); "cru" é quadrada sem seno (dungeon synth). */
  criarDrone(destino: AudioNode, midis: number[], volume: number, inicio: number, timbre: TimbreDrone = "padrao"): VozContinua {
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = timbre === "gaita" ? 1100 : timbre === "cru" ? 700 : 420;
    const g = this.ctx.createGain();
    g.gain.value = volume * 0.16;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGanho = this.ctx.createGain();
    lfoGanho.gain.value = volume * 0.05;
    lfo.connect(lfoGanho).connect(g.gain);
    filtro.connect(g).connect(destino);
    const oscs: OscillatorNode[] = [];
    const camadas: [OscillatorType, number][] =
      timbre === "gaita"
        ? [
            ["sine", 0.7],
            ["sawtooth", 0.32],
          ]
        : timbre === "cru"
          ? [["square", 0.45]]
          : [
              ["sine", 1],
              ["sawtooth", 0.18],
            ];
    for (const m of midis) {
      for (const [tipo, nivel] of camadas) {
        const o = this.ctx.createOscillator();
        o.type = tipo;
        o.frequency.value = midiParaHz(m);
        if (tipo !== "sine") o.detune.value = 4;
        const og = this.ctx.createGain();
        og.gain.value = nivel;
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

  /** ambiente em laço (chuva, chiado de disco, sopro de fita, ronco de cidade), bem baixinho por baixo da música */
  criarAmbiente(destino: AudioNode, tipo: TipoAmbiente, volume: number, inicio: number): VozContinua {
    let buffer = this.ambientes.get(tipo);
    if (!buffer) {
      const taxa = this.ctx.sampleRate;
      buffer = this.buffer(
        tipo === "chuva" ? chuva(taxa, 6) : tipo === "chiado" ? chiado(taxa, 5) : tipo === "cidade" ? ruidoMarrom(taxa, 8) : ruidoBranco(taxa, 4),
      );
      this.ambientes.set(tipo, buffer);
    }
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = true;
    const [passaAlta, passaBaixa, nivel] = AMBIENTE[tipo];
    const alta = this.ctx.createBiquadFilter();
    alta.type = "highpass";
    alta.frequency.value = passaAlta;
    const baixa = this.ctx.createBiquadFilter();
    baixa.type = "lowpass";
    baixa.frequency.value = passaBaixa;
    const g = this.ctx.createGain();
    g.gain.value = volume * nivel;
    fonte.connect(alta).connect(baixa).connect(g).connect(destino);
    fonte.start(inicio, Math.random() * (buffer.duration - 0.5));
    return {
      definir() {},
      parar(t) {
        g.gain.setTargetAtTime(0, t, 0.1);
        fonte.stop(t + 0.6);
        aoTerminar(fonte, [fonte, alta, baixa, g]);
      },
    };
  }

  liberar() {
    this.cordas.clear();
    this.ambientes.clear();
    this.murmurioBuffer = null;
  }
}

/** formas do pad: ondas [tipo, desafinação em cents], ganho relativo e vibrato (cents) */
const TIMBRES_PAD: Record<TimbrePad, { ondas: [OscillatorType, number][]; ganho: number; vibrato?: number }> = {
  serra: {
    ondas: [
      ["sawtooth", -7],
      ["sawtooth", 7],
    ],
    ganho: 1,
  },
  // órgão: triângulo + seno uma oitava acima (registro de flauta), bem mais limpo que a serra
  orgao: {
    ondas: [
      ["triangle", 0],
      ["sine", 1200],
    ],
    ganho: 1.9,
  },
  cordas: {
    ondas: [
      ["sawtooth", -12],
      ["sawtooth", 10],
    ],
    ganho: 0.9,
    vibrato: 6,
  },
  quadrada: {
    ondas: [
      ["square", -5],
      ["square", 5],
    ],
    ganho: 0.42,
  },
};

/** ambiente: passa-alta, passa-baixa (Hz) e nível base */
const AMBIENTE: Record<TipoAmbiente, [number, number, number]> = {
  chuva: [450, 5200, 0.05],
  chiado: [700, 7000, 0.035],
  fita: [3500, 11000, 0.012],
  cidade: [30, 260, 0.11],
};

/**
 * Cadeia de efeitos de uma camada (o "sotaque" do estilo): gramofone (passa-faixa), fita (wow/flutter num atraso
 * modulado) e saturação. Devolve a entrada onde as notas entram e os nós a desligar no fim.
 */
export function criarCadeia(ctx: BaseAudioContext, efeitos: Efeitos | undefined, destino: AudioNode, inicio: number) {
  const nos: AudioNode[] = [];
  const fontes: AudioScheduledSourceNode[] = [];
  const entrada = ctx.createGain();
  let ultimo: AudioNode = entrada;
  const ligar = (no: AudioNode) => {
    ultimo.connect(no);
    ultimo = no;
    nos.push(no);
  };
  if (efeitos?.saturacao) {
    const k = 1 + efeitos.saturacao * 6;
    const curva = new Float32Array(1024);
    for (let i = 0; i < curva.length; i++) {
      const x = (i / (curva.length - 1)) * 2 - 1;
      curva[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    const pre = ctx.createGain();
    pre.gain.value = 0.8;
    ligar(pre);
    const formador = ctx.createWaveShaper();
    formador.curve = curva;
    formador.oversample = "2x";
    ligar(formador);
    // a saturação sobe o nível médio: compensa
    const pos = ctx.createGain();
    pos.gain.value = 1 / (1 + efeitos.saturacao * 0.9);
    ligar(pos);
  }
  if (efeitos?.gramofone) {
    const alta = ctx.createBiquadFilter();
    alta.type = "highpass";
    alta.frequency.value = 320;
    alta.Q.value = 0.9;
    ligar(alta);
    const baixa = ctx.createBiquadFilter();
    baixa.type = "lowpass";
    baixa.frequency.value = 3400;
    baixa.Q.value = 1.1;
    ligar(baixa);
    // corneta: um pico largo nos médios
    const corneta = ctx.createBiquadFilter();
    corneta.type = "peaking";
    corneta.frequency.value = 1300;
    corneta.Q.value = 0.8;
    corneta.gain.value = 5;
    ligar(corneta);
    const compensa = ctx.createGain();
    compensa.gain.value = 1.25;
    ligar(compensa);
  }
  if (efeitos?.fita) {
    const atraso = ctx.createDelay(0.1);
    atraso.delayTime.value = 0.012;
    ligar(atraso);
    for (const [freq, prof] of [
      [0.42, 0.0016],
      [6.3, 0.00012],
    ] as const) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = freq * (0.9 + Math.random() * 0.2);
      const g = ctx.createGain();
      g.gain.value = prof;
      lfo.connect(g).connect(atraso.delayTime);
      lfo.start(inicio);
      fontes.push(lfo);
      nos.push(g);
    }
    // fita gasta: um pouco abafada
    const abafa = ctx.createBiquadFilter();
    abafa.type = "lowpass";
    abafa.frequency.value = 7000;
    ligar(abafa);
  }
  ultimo.connect(destino);
  return {
    entrada,
    parar(t: number) {
      for (const f of fontes) {
        try {
          f.stop(t);
        } catch {
          // já parado
        }
      }
    },
    desligar() {
      for (const no of [entrada, ...nos, ...fontes]) {
        try {
          no.disconnect();
        } catch {
          // já desconectado
        }
      }
    },
  };
}

/** reverb de salão com impulso gerado na hora */
export function criarReverb(ctx: BaseAudioContext, impulso: [Float32Array, Float32Array]): ConvolverNode {
  const b = ctx.createBuffer(2, impulso[0].length, ctx.sampleRate);
  b.copyToChannel(impulso[0] as Float32Array<ArrayBuffer>, 0);
  b.copyToChannel(impulso[1] as Float32Array<ArrayBuffer>, 1);
  const conv = ctx.createConvolver();
  conv.normalize = false;
  conv.buffer = b;
  return conv;
}
