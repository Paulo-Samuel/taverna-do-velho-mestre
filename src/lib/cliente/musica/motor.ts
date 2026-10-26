import type { HumorMusical } from "@/lib/sistemas/tipos";
import { criarReverb, Instrumentos, type VozContinua } from "./instrumentos";
import { criarAleatorio, impulsoReverb } from "./sintese";
import { criarCompositor, notasDoDrone, VOLUME_ENERGIA, type Compositor, type Energia, type Nota } from "./teoria";

// Motor da trilha: um AudioContext por página (singleton), criado só depois de um gesto do usuário.
// Cada humor toca numa "camada" com ganho próprio; trocar de humor é um crossfade entre camadas.
// O agendador acorda a cada 100 ms e agenda as notas que caem nos próximos 300 ms pelo relógio do áudio.

const ANTECEDENCIA = 0.3;
const INTERVALO_MS = 100;
const CROSSFADE = 3;
/** volume do controle (0..1) para ganho do mestre: curva quadrática, teto baixo (é música de fundo) */
const GANHO_MAXIMO = 2.4;

type Agendada = { t: number; nota: Nota; segundosPorBatida: number };

type Camada = {
  humor: HumorMusical;
  energia: Energia;
  compositor: Compositor;
  saida: GainNode;
  envio: GainNode;
  pad: VozContinua | null;
  continuas: VozContinua[];
  proximoCompasso: number;
  fila: Agendada[];
  /** quando o fade de saída termina (camada sendo encerrada) */
  fimEm: number | null;
  /** peça curta acabando: troca de humor neste instante */
  trocarEm: number | null;
  trocarPara: HumorMusical | null;
};

export type EstadoMusica = {
  /** humor que está soando (pode diferir do pedido: a vitória volta sozinha para a calmaria) */
  tocando: HumorMusical | null;
  /** ligado, mas esperando o primeiro clique/tecla para o navegador liberar o áudio */
  aguardandoGesto: boolean;
};

export const ESTADO_INICIAL: EstadoMusica = { tocando: null, aguardandoGesto: true };

let estado: EstadoMusica = ESTADO_INICIAL;
const ouvintes = new Set<() => void>();

function publicar(novo: Partial<EstadoMusica>) {
  const proximo = { ...estado, ...novo };
  if (proximo.tocando === estado.tocando && proximo.aguardandoGesto === estado.aguardandoGesto) return;
  estado = proximo;
  for (const f of ouvintes) f();
}

export function assinarEstadoMusica(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function estadoMusica(): EstadoMusica {
  return estado;
}

function ganhoDoVolume(volume: number): number {
  const v = Math.max(0, Math.min(1, volume));
  return GANHO_MAXIMO * v * v;
}

class Motor {
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private saidaFinal: AudioNode[] = [];
  private instrumentos: Instrumentos | null = null;
  private camadas: Camada[] = [];
  private relogio: ReturnType<typeof setInterval> | null = null;
  private desligarTimer: ReturnType<typeof setTimeout> | null = null;

  private pedido: { humor: HumorMusical; energia: Energia } = { humor: "taverna", energia: "baixa" };
  private ligado = true;
  private volume = 0.35;
  private desbloqueado = false;

  private readonly aoMudarVisibilidade = () => this.sincronizar();

  /** humor e energia da cena (pode vir antes do áudio existir: vale quando começar) */
  definirCena(humor: HumorMusical, energia: Energia) {
    if (humor === this.pedido.humor && energia === this.pedido.energia) return;
    this.pedido = { humor, energia };
    if (this.ctx) this.aplicarCena(humor, energia);
  }

  definirPreferencias(ligado: boolean, volume: number) {
    this.ligado = ligado;
    this.volume = volume;
    if (this.ctx && this.mestre && this.ctx.state !== "closed") {
      this.mestre.gain.setTargetAtTime(ligado ? ganhoDoVolume(volume) : 0, this.ctx.currentTime, 0.12);
    }
    this.sincronizar();
  }

  /** chame dentro de um gesto (clique/tecla): só então o navegador deixa o áudio começar */
  desbloquear() {
    this.desbloqueado = true;
    this.sincronizar();
  }

  /** liga, retoma ou suspende o áudio conforme preferência, gesto e visibilidade da aba */
  private sincronizar() {
    const oculto = typeof document !== "undefined" && document.visibilityState === "hidden";
    const querTocar = this.ligado && this.desbloqueado;
    publicar({ aguardandoGesto: this.ligado && !this.desbloqueado });
    if (this.desligarTimer) {
      clearTimeout(this.desligarTimer);
      this.desligarTimer = null;
    }

    if (querTocar && !oculto) {
      if (!this.ctx) this.criar();
      const ctx = this.ctx;
      if (!ctx || ctx.state === "closed") return;
      if (ctx.state !== "running") void ctx.resume().catch(() => {});
      this.iniciarRelogio();
      return;
    }

    if (!this.ctx || this.ctx.state === "closed") return;
    this.pararRelogio();
    const ctx = this.ctx;
    if (oculto) {
      void ctx.suspend().catch(() => {});
    } else {
      // desligado pelo botão: deixa o fade do mestre terminar antes de suspender
      this.desligarTimer = setTimeout(() => {
        this.desligarTimer = null;
        if (!this.ligado && ctx.state === "running") void ctx.suspend().catch(() => {});
      }, 500);
    }
  }

  private criar() {
    const Construtor =
      typeof window !== "undefined"
        ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!Construtor) return;
    let ctx: AudioContext;
    try {
      ctx = new Construtor({ latencyHint: "playback" });
    } catch {
      return;
    }
    this.ctx = ctx;

    // mestre -> compressor suave -> limitador -> saída
    const mestre = ctx.createGain();
    mestre.gain.value = 0;
    mestre.gain.setTargetAtTime(this.ligado ? ganhoDoVolume(this.volume) : 0, ctx.currentTime, 0.4);
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.3;
    const limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -3;
    limitador.knee.value = 0;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.002;
    limitador.release.value = 0.1;
    mestre.connect(compressor).connect(limitador).connect(ctx.destination);

    const reverb = criarReverb(ctx, impulsoReverb(ctx.sampleRate, 3.4));
    const retorno = ctx.createGain();
    retorno.gain.value = 0.9;
    reverb.connect(retorno).connect(mestre);

    this.mestre = mestre;
    this.reverb = reverb;
    this.saidaFinal = [mestre, compressor, limitador, reverb, retorno];
    this.instrumentos = new Instrumentos(ctx);
    document.addEventListener("visibilitychange", this.aoMudarVisibilidade);

    this.camadas.push(this.criarCamada(this.pedido.humor, this.pedido.energia, ctx.currentTime + 0.05, 2));
  }

  private criarCamada(humor: HumorMusical, energia: Energia, inicio: number, fade: number): Camada {
    const ctx = this.ctx!;
    const instrumentos = this.instrumentos!;
    const compositor = criarCompositor(humor, criarAleatorio((Math.random() * 2 ** 32) >>> 0));
    const receita = compositor.receita;

    const saida = ctx.createGain();
    saida.gain.setValueAtTime(0.0001, inicio);
    saida.gain.linearRampToValueAtTime(receita.volume * VOLUME_ENERGIA[energia], inicio + fade);
    const envio = ctx.createGain();
    envio.gain.value = receita.reverb;
    saida.connect(this.mestre!);
    saida.connect(envio).connect(this.reverb!);

    const continuas: VozContinua[] = [];
    const pad = receita.pad ? instrumentos.criarPad(saida, receita.pad.volume, receita.pad.brilho, inicio) : null;
    if (pad) continuas.push(pad);
    if (receita.drone) continuas.push(instrumentos.criarDrone(saida, notasDoDrone(receita, compositor.tonica), receita.drone.volume, inicio));
    if (receita.conversa > 0) continuas.push(instrumentos.criarConversa(saida, receita.conversa, inicio));

    publicar({ tocando: humor });
    return { humor, energia, compositor, saida, envio, pad, continuas, proximoCompasso: inicio, fila: [], fimEm: null, trocarEm: null, trocarPara: null };
  }

  private aplicarCena(humor: HumorMusical, energia: Energia) {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return;
    const agora = ctx.currentTime;
    const atual = this.camadas.find((c) => c.fimEm === null);
    if (atual && atual.humor === humor) {
      // mesma trilha, só muda a energia: andamento/densidade valem no próximo compasso, volume desliza
      atual.energia = energia;
      atual.saida.gain.cancelScheduledValues(agora);
      atual.saida.gain.setValueAtTime(Math.max(0.0001, atual.saida.gain.value), agora);
      atual.saida.gain.linearRampToValueAtTime(atual.compositor.receita.volume * VOLUME_ENERGIA[energia], agora + 2);
      return;
    }
    if (ctx.state !== "running") {
      // áudio parado (desligado ou aba oculta): nada de crossfade, só troca a camada
      for (const c of [...this.camadas]) {
        if (c.fimEm === null) for (const voz of c.continuas) voz.parar(agora);
        this.liberarCamada(c);
      }
    } else if (atual) this.encerrar(atual, agora);
    this.camadas.push(this.criarCamada(humor, energia, agora + 0.05, CROSSFADE));
  }

  private encerrar(camada: Camada, t: number) {
    camada.fimEm = t + CROSSFADE;
    const g = camada.saida.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(0.0001, camada.fimEm);
    for (const voz of camada.continuas) voz.parar(camada.fimEm);
  }

  private liberarCamada(camada: Camada) {
    camada.fila = [];
    try {
      camada.saida.disconnect();
      camada.envio.disconnect();
    } catch {
      // já desconectada
    }
    this.camadas = this.camadas.filter((c) => c !== camada);
  }

  private iniciarRelogio() {
    if (this.relogio) return;
    this.tique();
    this.relogio = setInterval(() => this.tique(), INTERVALO_MS);
  }

  private pararRelogio() {
    if (this.relogio) clearInterval(this.relogio);
    this.relogio = null;
  }

  /** o agendador: compõe compassos que começam dentro da janela e despacha as notas que caem nela */
  private tique() {
    const ctx = this.ctx;
    const instrumentos = this.instrumentos;
    if (!ctx || !instrumentos || ctx.state !== "running") return;
    const agora = ctx.currentTime;
    const limite = agora + ANTECEDENCIA;

    for (const camada of [...this.camadas]) {
      if (camada.fimEm !== null && agora > camada.fimEm + 0.7) {
        this.liberarCamada(camada);
        continue;
      }
      if (camada.trocarEm !== null && camada.fimEm === null && agora >= camada.trocarEm && camada.trocarPara) {
        const para = camada.trocarPara;
        camada.trocarEm = null;
        this.encerrar(camada, agora);
        this.camadas.push(this.criarCamada(para, camada.energia, agora + 0.05, CROSSFADE));
        continue;
      }

      // aba voltou depois de um engasgo do timer: não tenta "recuperar" compassos perdidos
      if (camada.proximoCompasso < agora - 0.05) camada.proximoCompasso = agora + 0.05;

      while (camada.proximoCompasso < limite && (camada.fimEm === null || camada.proximoCompasso < camada.fimEm)) {
        const spb = camada.compositor.segundosPorBatida(camada.energia);
        const inicio = camada.proximoCompasso;
        const compasso = camada.compositor.proximo(camada.energia);
        for (const nota of compasso.notas) camada.fila.push({ t: inicio + nota.quando * spb, nota, segundosPorBatida: spb });
        if (camada.pad && compasso.acorde) camada.pad.definir(compasso.acorde, inicio);
        const duracao = camada.compositor.receita.batidas * spb;
        if (compasso.trocarPara) {
          camada.trocarEm = inicio + duracao - 0.5;
          camada.trocarPara = compasso.trocarPara;
        }
        camada.proximoCompasso = inicio + duracao;
      }

      while (camada.fila.length && camada.fila[0].t < limite) {
        const { t, nota, segundosPorBatida } = camada.fila.shift()!;
        if (t < agora - 0.02) continue; // atrasada demais: pula em vez de embolar
        if (camada.fimEm !== null && t > camada.fimEm) continue;
        instrumentos.tocar(nota.instrumento, nota.midi, t, nota.duracao * segundosPorBatida, nota.intensidade, camada.saida);
      }
    }
  }

  /** desliga tudo e solta o AudioContext */
  destruir() {
    this.pararRelogio();
    if (this.desligarTimer) clearTimeout(this.desligarTimer);
    this.desligarTimer = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.aoMudarVisibilidade);
    for (const camada of [...this.camadas]) this.liberarCamada(camada);
    for (const no of this.saidaFinal) {
      try {
        no.disconnect();
      } catch {
        // já desconectado
      }
    }
    this.saidaFinal = [];
    this.instrumentos?.liberar();
    this.instrumentos = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.mestre = null;
    this.reverb = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    publicar({ tocando: null });
  }
}

// uma instância por página, criada sob demanda (nada de AudioContext no carregamento do módulo)
let instancia: Motor | null = null;
let usuarios = 0;
let destruirTimer: ReturnType<typeof setTimeout> | null = null;

/** pega o motor e marca um usuário (componente montado); devolva com soltarMotor */
export function reterMotor(): Motor {
  if (destruirTimer) {
    clearTimeout(destruirTimer);
    destruirTimer = null;
  }
  usuarios++;
  if (!instancia) instancia = new Motor();
  return instancia;
}

/** último usuário saiu: libera o áudio (com folga para o remontar do StrictMode não recriar tudo) */
export function soltarMotor() {
  usuarios = Math.max(0, usuarios - 1);
  if (usuarios > 0 || destruirTimer) return;
  destruirTimer = setTimeout(() => {
    destruirTimer = null;
    if (usuarios === 0 && instancia) {
      instancia.destruir();
      instancia = null;
      publicar({ aguardandoGesto: true });
    }
  }, 50);
}

export type { Motor };
