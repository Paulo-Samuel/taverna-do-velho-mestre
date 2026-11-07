import type { HumorMusical } from "@/lib/sistemas/tipos";
import { receitaDoEstilo, type EstiloMusical } from "./estilos";
import { criarCadeia, criarReverb, Instrumentos, type VozContinua } from "./instrumentos";
import type { FaixaLocal, FaixasLocais } from "./locais";
import { criarAleatorio, impulsoReverb } from "./sintese";
import { criarCompositor, notasDoDrone, VOLUME_ENERGIA, type Compositor, type Energia, type Nota } from "./teoria";

// Motor da trilha: um AudioContext por página (singleton), criado só depois de um gesto do usuário.
// Cada humor toca numa "camada" com ganho próprio; trocar de humor é um crossfade (de potência igual) entre camadas.
// A camada é "gerada" (compositor do estilo do sistema) ou "arquivo" (músicas da pessoa em musica/, via <audio>).
// O agendador acorda a cada 100 ms e agenda as notas que caem nos próximos 300 ms pelo relógio do áudio.
// O motor sobrevive à navegação dentro da mesa (Ajustes, Livro, ficha): quando o último <Musica> sai, a trilha continua por
// PRAZO_SOLTAR_MS; se outro componente a retém nesse prazo, segue do ponto em que estava. Só depois fecha, com fade.
// Fora de uma mesa (página inicial) fecha logo, também com fade.

const ANTECEDENCIA = 0.3;
const INTERVALO_MS = 100;
const CROSSFADE = 3;
/** volume do controle (0..1) para ganho do mestre: curva quadrática, teto baixo (é música de fundo) */
const GANHO_MAXIMO = 2.4;
/** o mesmo para as músicas locais: uma faixa masterizada (~-14 dBFS RMS) no volume padrão sai perto dos ~-28 dB da síntese */
const GANHO_MAXIMO_ARQUIVO = 1.4;
/** quanto a trilha continua depois que o último componente saiu (ir a Ajustes/Livro e voltar não recomeça do zero) */
export const PRAZO_SOLTAR_MS = 90_000;
/** fora da mesa (página inicial, nova campanha) não há volta a esperar: confere a URL logo depois de soltar e fecha */
export const PRAZO_FORA_DA_MESA_MS = 1000;
const ROTA_MESA = /^\/mesa\/\d+/;
/** ao fechar de verdade: constante de tempo do fade no mestre e quanto esperar antes do close() */
const FADE_FIM = 0.15;
const FECHAR_APOS_MS = 500;
/** quanto esperar o resume() virar running antes de concluir que o gesto não valeu (toque sem ativação) */
const PRAZO_GESTO_MS = 1000;
/** piso dos ganhos (nunca zero: dá para continuar com rampas exponenciais) */
const PISO = 0.0001;
const PONTOS_CURVA = 65;
/** sem cancelAndHoldAtTime (Firefox) a curva vira rampas lineares por trechos: estas podem ser cortadas depois */
const TRECHOS_RAMPA = 8;

/**
 * A ativação do usuário é pegajosa no documento: depois do primeiro clique/toque da visita, um AudioContext novo pode
 * começar sem outro gesto. Por isso a flag vive no módulo, não na instância: um Motor novo (depois do prazo) já nasce
 * desbloqueado. Volta a false quando um resume() não vinga (ver retomar), para o próximo gesto tentar de novo, e volta a
 * true assim que o contexto reporta "running" (mesmo um resume atrasado prova que a ativação valeu).
 */
let desbloqueado = false;

/**
 * Curva de potência igual para o crossfade: quem entra sobe em seno, quem sai desce em cosseno. Como sin² + cos² = 1,
 * a potência somada das duas camadas fica constante e o volume não afunda no meio, como acontece no cruzamento linear.
 * `alvo` é a ponta que não é silêncio (o fim da entrada ou o começo da saída).
 */
export function curvaPotenciaIgual(alvo: number, forma: "entrada" | "saida", pontos = PONTOS_CURVA): Float32Array {
  const curva = new Float32Array(pontos);
  for (let i = 0; i < pontos; i++) {
    const x = (i / (pontos - 1)) * (Math.PI / 2);
    curva[i] = Math.max(PISO, alvo * (forma === "entrada" ? Math.sin(x) : Math.cos(x)));
  }
  return curva;
}

const temSegurar = (g: AudioParam) => typeof g.cancelAndHoldAtTime === "function";

/** corta a automação pendente segurando o valor atual (cancelAndHoldAtTime onde existe; Firefox só tem o cancelar) */
function cancelarAutomacao(g: AudioParam, t: number) {
  try {
    if (temSegurar(g)) g.cancelAndHoldAtTime(t);
    else g.cancelScheduledValues(t);
  } catch {
    // parâmetro de um contexto já fechado
  }
}

/**
 * agenda a curva de potência igual. Com cancelAndHoldAtTime, setValueCurveAtTime (o navegador sabe truncá-la depois).
 * Sem ele (Firefox), cancelScheduledValues não corta uma curva em curso e qualquer automação seguinte sobre ela lança;
 * então a curva vai em rampas lineares por trechos, que o cancelar remove sem lançar.
 */
function agendarCurva(g: AudioParam, curva: Float32Array, inicio: number, duracao: number) {
  if (temSegurar(g)) {
    g.setValueCurveAtTime(curva, inicio, duracao);
    return;
  }
  const ultimo = curva.length - 1;
  g.setValueAtTime(curva[0], inicio);
  for (let s = 1; s <= TRECHOS_RAMPA; s++) {
    const i = Math.round((s * ultimo) / TRECHOS_RAMPA);
    g.linearRampToValueAtTime(curva[i], inicio + (duracao * i) / ultimo);
  }
}

/** fade-in de uma camada nova (sem automação anterior no parâmetro) */
function fadeEntrada(g: AudioParam, inicio: number, alvo: number, duracao: number) {
  g.value = PISO;
  try {
    agendarCurva(g, curvaPotenciaIgual(alvo, "entrada"), inicio, duracao);
  } catch {
    g.setValueAtTime(PISO, inicio);
    g.linearRampToValueAtTime(alvo, inicio + duracao);
  }
}

/** fade-out da camada que sai, a partir do valor em que está (mesmo no meio de um fade-in) */
function fadeSaida(g: AudioParam, agora: number, duracao: number) {
  const valor = Math.max(PISO, g.value);
  cancelarAutomacao(g, agora);
  try {
    agendarCurva(g, curvaPotenciaIgual(valor, "saida"), agora, duracao);
  } catch {
    try {
      g.setValueAtTime(valor, agora);
      g.linearRampToValueAtTime(PISO, agora + duracao);
    } catch {
      // automação sobreposta que o navegador não deixou cortar: a camada some no liberar
    }
  }
}

type Agendada = { t: number; nota: Nota; segundosPorBatida: number };

type CamadaBase = {
  humor: HumorMusical;
  energia: Energia;
  saida: GainNode;
  /** quando o fade de saída termina (camada sendo encerrada) */
  fimEm: number | null;
  /** peça curta acabando: troca de humor neste instante */
  trocarEm: number | null;
  trocarPara: HumorMusical | null;
};

type CamadaGerada = CamadaBase & {
  tipo: "gerada";
  estilo: EstiloMusical;
  compositor: Compositor;
  entrada: AudioNode;
  cadeia: ReturnType<typeof criarCadeia>;
  envio: GainNode;
  pad: VozContinua | null;
  continuas: VozContinua[];
  proximoCompasso: number;
  fila: Agendada[];
};

type CamadaArquivo = CamadaBase & {
  tipo: "arquivo";
  audio: HTMLAudioElement;
  fonte: MediaElementAudioSourceNode;
  faixas: FaixaLocal[];
  /** ordem embaralhada e posição nela */
  ordem: FaixaLocal[];
  pos: number;
  falhas: number;
  atual: FaixaLocal | null;
};

type Camada = CamadaGerada | CamadaArquivo;

export type EstadoMusica = {
  /** humor que está soando (pode diferir do pedido: a vitória volta sozinha para a calmaria) */
  tocando: HumorMusical | null;
  /** ligado, mas esperando o primeiro clique/tecla para o navegador liberar o áudio */
  aguardandoGesto: boolean;
  /** estilo da trilha gerada que está soando */
  estilo: EstiloMusical | null;
  /** nome da música local tocando (null = trilha gerada) */
  faixa: string | null;
};

export const ESTADO_INICIAL: EstadoMusica = { tocando: null, aguardandoGesto: true, estilo: null, faixa: null };

let estado: EstadoMusica = ESTADO_INICIAL;
const ouvintes = new Set<() => void>();

function publicar(novo: Partial<EstadoMusica>) {
  const proximo = { ...estado, ...novo };
  if ((Object.keys(proximo) as (keyof EstadoMusica)[]).every((k) => proximo[k] === estado[k])) return;
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

function ganhoDoVolume(volume: number, maximo = GANHO_MAXIMO): number {
  const v = Math.max(0, Math.min(1, volume));
  return maximo * v * v;
}

function embaralhar<T>(lista: T[], evitarPrimeiro?: T): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // não repete a última faixa logo na volta da lista
  if (a.length > 1 && evitarPrimeiro !== undefined && a[0] === evitarPrimeiro) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

const chaveDasFaixas = (lista: FaixaLocal[] | undefined) => (lista ?? []).map((f) => f.url).join("|");

class Motor {
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private mestreArquivos: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private saidaFinal: AudioNode[] = [];
  private instrumentos: Instrumentos | null = null;
  private camadas: Camada[] = [];
  private relogio: ReturnType<typeof setInterval> | null = null;
  private desligarTimer: ReturnType<typeof setTimeout> | null = null;
  private gestoTimer: ReturnType<typeof setTimeout> | null = null;

  private pedido: { humor: HumorMusical; energia: Energia; estilo: EstiloMusical } = { humor: "taverna", energia: "baixa", estilo: "fantasia" };
  private faixas: FaixasLocais = {};
  /** humores cujas faixas locais não tocaram (formato que o navegador não abre): ficam na trilha gerada */
  private quebradas = new Set<string>();
  private ligado = true;
  private volume = 0.35;

  private readonly aoMudarVisibilidade = () => this.sincronizar();
  /**
   * o "esperando gesto" da interface sai do estado real do contexto, não da flag. "running" também devolve a flag:
   * um resume() que demorou mais que PRAZO_GESTO_MS (fone Bluetooth, celular voltando do sono) zerou-a em retomar, e sem
   * isto a próxima volta da aba cairia no ramo de parar (querTocar = ligado && desbloqueado) e a trilha não retomaria.
   */
  private readonly aoMudarEstadoCtx = () => {
    const ctx = this.ctx;
    if (ctx && ctx.state === "running") {
      desbloqueado = true;
      if (this.gestoTimer) {
        clearTimeout(this.gestoTimer);
        this.gestoTimer = null;
      }
      // vingou tarde, com a aba já oculta ou o som desligado nesse meio-tempo: volta a suspender
      if (this.oculto() || !this.ligado) {
        this.sincronizar();
        return;
      }
    }
    this.publicarGesto();
  };

  /** humor, energia e estilo da cena (pode vir antes do áudio existir: vale quando começar) */
  definirCena(humor: HumorMusical, energia: Energia, estilo: EstiloMusical = "fantasia") {
    const p = this.pedido;
    if (humor === p.humor && energia === p.energia && estilo === p.estilo) return;
    this.pedido = { humor, energia, estilo };
    if (this.ctx) this.aplicarCena(humor, energia, estilo);
  }

  /** músicas locais disponíveis por humor; troca a camada só se a fonte do humor que está soando mudou */
  definirFaixas(faixas: FaixasLocais) {
    const antes = this.faixas;
    this.faixas = faixas;
    const atual = this.camadas.find((c) => c.fimEm === null);
    if (!this.ctx || !atual) return;
    if (atual.tipo === "arquivo" && this.faixasDe(atual.humor)) {
      // mesma fonte: só atualiza a lista (a próxima faixa já sai da lista nova)
      if (chaveDasFaixas(antes[atual.humor]) !== chaveDasFaixas(faixas[atual.humor])) {
        atual.faixas = this.faixasDe(atual.humor)!;
        atual.ordem = embaralhar(atual.faixas, atual.atual ?? undefined);
        atual.pos = 0;
      }
      return;
    }
    if (atual.tipo === "gerada" && !this.faixasDe(atual.humor)) return;
    this.aplicarCena(atual.humor, atual.energia, this.pedido.estilo, true);
  }

  definirPreferencias(ligado: boolean, volume: number) {
    this.ligado = ligado;
    this.volume = volume;
    if (this.ctx && this.mestre && this.mestreArquivos && this.ctx.state !== "closed") {
      this.mestre.gain.setTargetAtTime(ligado ? ganhoDoVolume(volume) : 0, this.ctx.currentTime, 0.12);
      this.mestreArquivos.gain.setTargetAtTime(ligado ? ganhoDoVolume(volume, GANHO_MAXIMO_ARQUIVO) : 0, this.ctx.currentTime, 0.12);
    }
    this.sincronizar();
  }

  /** chame dentro de um gesto (clique/toque/tecla): só então o navegador deixa o áudio começar */
  desbloquear() {
    desbloqueado = true;
    this.sincronizar();
  }

  /**
   * ainda falta um gesto para o áudio soar? (ligado, mas sem ativação ou com o contexto parado). O componente chama
   * desbloquear() a cada gesto enquanto isto for true: no celular o pointerdown do toque não concede ativação, só o
   * pointerup/touchend/click, então o primeiro resume() pode nascer suspenso e precisa de outra tentativa.
   */
  precisaGesto(): boolean {
    if (!this.ligado) return false;
    if (!desbloqueado) return true;
    return !this.ctx || (this.ctx.state !== "running" && this.ctx.state !== "closed");
  }

  private faixasDe(humor: HumorMusical): FaixaLocal[] | null {
    const lista = this.faixas[humor];
    return lista?.length && !this.quebradas.has(chaveDasFaixas(lista)) ? lista : null;
  }

  private oculto(): boolean {
    return typeof document !== "undefined" && document.visibilityState === "hidden";
  }

  /** "esperando o primeiro toque" pelo estado real do contexto (ou pela flag, enquanto ele não existe) */
  private publicarGesto() {
    const ctx = this.ctx && this.ctx.state !== "closed" ? this.ctx : null;
    const parado = ctx ? ctx.state !== "running" : !desbloqueado;
    publicar({ aguardandoGesto: this.ligado && !this.oculto() && parado });
  }

  /**
   * resume(); se não virar running em 1 s, o gesto não valeu (toque sem ativação): o próximo gesto tenta de novo.
   * Se vingar depois disso, o statechange (aoMudarEstadoCtx) devolve a flag.
   */
  private retomar(ctx: AudioContext) {
    void ctx.resume().catch(() => {});
    if (this.gestoTimer) clearTimeout(this.gestoTimer);
    this.gestoTimer = setTimeout(() => {
      this.gestoTimer = null;
      if (this.ctx !== ctx || ctx.state === "running" || ctx.state === "closed") return;
      if (!this.ligado || this.oculto()) return;
      desbloqueado = false;
      this.publicarGesto();
    }, PRAZO_GESTO_MS);
  }

  /** liga, retoma ou suspende o áudio conforme preferência, gesto e visibilidade da aba */
  private sincronizar() {
    const oculto = this.oculto();
    const querTocar = this.ligado && desbloqueado;
    if (this.desligarTimer) {
      clearTimeout(this.desligarTimer);
      this.desligarTimer = null;
    }

    if (querTocar && !oculto) {
      if (!this.ctx) this.criar();
      const ctx = this.ctx;
      this.publicarGesto();
      if (!ctx || ctx.state === "closed") return;
      if (ctx.state !== "running") this.retomar(ctx);
      for (const c of this.camadas) if (c.tipo === "arquivo" && c.fimEm === null && c.audio.paused && c.audio.src) void c.audio.play().catch(() => {});
      this.iniciarRelogio();
      return;
    }

    this.publicarGesto();

    if (!this.ctx || this.ctx.state === "closed") return;
    this.pararRelogio();
    const ctx = this.ctx;
    if (oculto) {
      this.pausarArquivos();
      void ctx.suspend().catch(() => {});
    } else {
      // desligado pelo botão: deixa o fade do mestre terminar antes de suspender
      this.desligarTimer = setTimeout(() => {
        this.desligarTimer = null;
        if (!this.ligado && ctx.state === "running") {
          this.pausarArquivos();
          void ctx.suspend().catch(() => {});
        }
      }, 500);
    }
  }

  private pausarArquivos() {
    for (const c of this.camadas) if (c.tipo === "arquivo") c.audio.pause();
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

    // síntese: mestre -> compressor suave -> limitador -> saída; músicas locais: mestreArquivos -> limitador
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
    const mestreArquivos = ctx.createGain();
    mestreArquivos.gain.value = this.ligado ? ganhoDoVolume(this.volume, GANHO_MAXIMO_ARQUIVO) : 0;
    mestreArquivos.connect(limitador);

    const reverb = criarReverb(ctx, impulsoReverb(ctx.sampleRate, 3.4));
    const retorno = ctx.createGain();
    retorno.gain.value = 0.9;
    reverb.connect(retorno).connect(mestre);

    this.mestre = mestre;
    this.mestreArquivos = mestreArquivos;
    this.reverb = reverb;
    this.saidaFinal = [mestre, mestreArquivos, compressor, limitador, reverb, retorno];
    this.instrumentos = new Instrumentos(ctx);
    document.addEventListener("visibilitychange", this.aoMudarVisibilidade);
    ctx.addEventListener("statechange", this.aoMudarEstadoCtx);

    this.camadas.push(this.criarCamada(this.pedido.humor, this.pedido.energia, this.pedido.estilo, ctx.currentTime + 0.05, 2));
  }

  /** camada nova: arquivo se a pessoa tem músicas para o humor, senão a trilha gerada do estilo */
  private criarCamada(humor: HumorMusical, energia: Energia, estilo: EstiloMusical, inicio: number, fade: number): Camada {
    const faixas = this.faixasDe(humor);
    return faixas ? this.criarCamadaArquivo(humor, energia, faixas, inicio, fade) : this.criarCamadaGerada(humor, energia, estilo, inicio, fade);
  }

  private criarCamadaGerada(humor: HumorMusical, energia: Energia, estilo: EstiloMusical, inicio: number, fade: number): CamadaGerada {
    const ctx = this.ctx!;
    const instrumentos = this.instrumentos!;
    const receita = receitaDoEstilo(estilo, humor);
    const compositor = criarCompositor(humor, criarAleatorio((Math.random() * 2 ** 32) >>> 0), receita);

    const saida = ctx.createGain();
    fadeEntrada(saida.gain, inicio, receita.volume * VOLUME_ENERGIA[energia], fade);
    const envio = ctx.createGain();
    envio.gain.value = receita.reverb;
    saida.connect(this.mestre!);
    saida.connect(envio).connect(this.reverb!);
    // o sotaque do estilo (gramofone, fita, saturação) fica entre as notas e o fader da camada
    const cadeia = criarCadeia(ctx, receita.efeitos, saida, inicio);
    const entrada = cadeia.entrada;

    const continuas: VozContinua[] = [];
    const pad = receita.pad ? instrumentos.criarPad(entrada, receita.pad.volume, receita.pad.brilho, inicio, receita.pad.timbre) : null;
    if (pad) continuas.push(pad);
    if (receita.drone) {
      continuas.push(instrumentos.criarDrone(entrada, notasDoDrone(receita, compositor.tonica), receita.drone.volume, inicio, receita.drone.timbre));
    }
    if (receita.conversa > 0) continuas.push(instrumentos.criarConversa(saida, receita.conversa, inicio));
    for (const a of receita.efeitos?.ambiente ?? []) continuas.push(instrumentos.criarAmbiente(saida, a.tipo, a.volume, inicio));

    publicar({ tocando: humor, estilo, faixa: null });
    return {
      tipo: "gerada",
      humor,
      energia,
      estilo,
      compositor,
      saida,
      entrada,
      cadeia,
      envio,
      pad,
      continuas,
      proximoCompasso: inicio,
      fila: [],
      fimEm: null,
      trocarEm: null,
      trocarPara: null,
    };
  }

  private criarCamadaArquivo(humor: HumorMusical, energia: Energia, faixas: FaixaLocal[], inicio: number, fade: number): CamadaArquivo {
    const ctx = this.ctx!;
    const saida = ctx.createGain();
    fadeEntrada(saida.gain, inicio, 1, fade);
    saida.connect(this.mestreArquivos!);
    const audio = new Audio();
    audio.preload = "auto";
    const fonte = ctx.createMediaElementSource(audio);
    fonte.connect(saida);
    const camada: CamadaArquivo = {
      tipo: "arquivo",
      humor,
      energia,
      saida,
      audio,
      fonte,
      faixas,
      ordem: embaralhar(faixas),
      pos: 0,
      falhas: 0,
      atual: null,
      fimEm: null,
      trocarEm: null,
      trocarPara: null,
    };
    audio.addEventListener("ended", () => {
      if (camada.fimEm !== null) return;
      // a vitória é uma peça curta: depois de uma faixa volta para a calmaria, como a trilha gerada
      if (camada.humor === "vitoria" && this.ctx) {
        camada.trocarEm = this.ctx.currentTime;
        camada.trocarPara = "calmo";
        return;
      }
      camada.falhas = 0;
      this.proximaFaixa(camada);
    });
    audio.addEventListener("error", () => {
      if (camada.fimEm !== null || !audio.getAttribute("src")) return;
      camada.falhas++;
      if (camada.falhas >= camada.faixas.length) {
        // nenhuma faixa abriu: esquece essas músicas neste humor e volta para a trilha gerada
        this.quebradas.add(chaveDasFaixas(camada.faixas));
        if (this.camadas.includes(camada)) this.aplicarCena(camada.humor, camada.energia, this.pedido.estilo, true);
        return;
      }
      this.proximaFaixa(camada);
    });
    publicar({ tocando: humor });
    this.proximaFaixa(camada);
    return camada;
  }

  private proximaFaixa(camada: CamadaArquivo) {
    if (camada.pos >= camada.ordem.length) {
      camada.ordem = embaralhar(camada.faixas, camada.atual ?? undefined);
      camada.pos = 0;
    }
    const faixa = camada.ordem[camada.pos++];
    if (!faixa) return;
    camada.atual = faixa;
    camada.audio.src = faixa.url;
    const ctx = this.ctx;
    if (ctx && ctx.state === "running" && this.ligado) void camada.audio.play().catch(() => {});
    if (camada.fimEm === null) publicar({ faixa: faixa.nome });
  }

  private aplicarCena(humor: HumorMusical, energia: Energia, estilo: EstiloMusical, forcar = false) {
    const ctx = this.ctx;
    if (!ctx || ctx.state === "closed") return;
    const agora = ctx.currentTime;
    const atual = this.camadas.find((c) => c.fimEm === null);
    const querArquivo = !!this.faixasDe(humor);
    const mesmaFonte =
      atual &&
      atual.humor === humor &&
      (atual.tipo === "arquivo" ? querArquivo : !querArquivo && atual.estilo === estilo);
    if (atual && mesmaFonte && !forcar) {
      atual.energia = energia;
      if (atual.tipo === "gerada") {
        // mesma trilha, só muda a energia: andamento/densidade valem no próximo compasso, volume desliza
        const g = atual.saida.gain;
        const valor = Math.max(PISO, g.value);
        cancelarAutomacao(g, agora);
        try {
          g.setValueAtTime(valor, agora);
          g.linearRampToValueAtTime(atual.compositor.receita.volume * VOLUME_ENERGIA[energia], agora + 2);
        } catch {
          // fade-in em curso que o navegador não deixou cortar: a energia nova vale no volume só na próxima troca
        }
      }
      return;
    }
    if (ctx.state !== "running") {
      // áudio parado (desligado ou aba oculta): nada de crossfade, só troca a camada
      for (const c of [...this.camadas]) {
        if (c.fimEm === null && c.tipo === "gerada") for (const voz of c.continuas) voz.parar(agora);
        this.liberarCamada(c);
      }
    } else if (atual) this.encerrar(atual, agora);
    this.camadas.push(this.criarCamada(humor, energia, estilo, agora + 0.05, CROSSFADE));
  }

  private encerrar(camada: Camada, t: number) {
    camada.fimEm = t + CROSSFADE;
    fadeSaida(camada.saida.gain, t, CROSSFADE);
    if (camada.tipo === "gerada") {
      for (const voz of camada.continuas) voz.parar(camada.fimEm);
      camada.cadeia.parar(camada.fimEm + 0.6);
    }
  }

  private liberarCamada(camada: Camada) {
    desligarCamada(camada);
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
        this.camadas.push(this.criarCamada(para, camada.energia, this.pedido.estilo, agora + 0.05, CROSSFADE));
        continue;
      }
      if (camada.tipo !== "gerada") continue;

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
        instrumentos.tocar(nota.instrumento, nota.midi, t, nota.duracao * segundosPorBatida, nota.intensidade, camada.entrada);
      }
    }
  }

  /** desliga tudo e solta o AudioContext: se estava tocando, fade curto no mestre e close() meio segundo depois */
  destruir() {
    this.pararRelogio();
    if (this.desligarTimer) clearTimeout(this.desligarTimer);
    this.desligarTimer = null;
    if (this.gestoTimer) clearTimeout(this.gestoTimer);
    this.gestoTimer = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.aoMudarVisibilidade);

    // solta tudo da instância já; o que ainda soa fica em variáveis locais até o fade acabar
    const ctx = this.ctx;
    const camadas = this.camadas;
    const nos = this.saidaFinal;
    const instrumentos = this.instrumentos;
    const mestres = [this.mestre, this.mestreArquivos];
    this.camadas = [];
    this.saidaFinal = [];
    this.instrumentos = null;
    this.ctx = null;
    this.mestre = null;
    this.mestreArquivos = null;
    this.reverb = null;
    publicar({ tocando: null, faixa: null, estilo: null });

    const fechar = () => {
      for (const camada of camadas) desligarCamada(camada);
      for (const no of nos) {
        try {
          no.disconnect();
        } catch {
          // já desconectado
        }
      }
      instrumentos?.liberar();
      if (!ctx) return;
      ctx.removeEventListener("statechange", this.aoMudarEstadoCtx);
      if (ctx.state !== "closed") void ctx.close().catch(() => {});
    };
    if (!ctx || ctx.state !== "running") {
      fechar();
      return;
    }
    for (const m of mestres) {
      try {
        m?.gain.setTargetAtTime(0, ctx.currentTime, FADE_FIM);
      } catch {
        // contexto fechado no meio
      }
    }
    setTimeout(fechar, FECHAR_APOS_MS);
  }
}

/** desconecta os nós de uma camada (sem mexer na lista do motor) */
function desligarCamada(camada: Camada) {
  try {
    camada.saida.disconnect();
    if (camada.tipo === "gerada") {
      camada.fila = [];
      camada.envio.disconnect();
      camada.cadeia.desligar();
    } else {
      camada.audio.pause();
      camada.audio.removeAttribute("src");
      camada.audio.load();
      camada.fonte.disconnect();
    }
  } catch {
    // já desconectada
  }
}

// uma instância por página, criada sob demanda (nada de AudioContext no carregamento do módulo)
let instancia: Motor | null = null;
let usuarios = 0;
let destruirTimer: ReturnType<typeof setTimeout> | null = null;
let foraDaMesaTimer: ReturnType<typeof setTimeout> | null = null;

function cancelarFechamento() {
  if (destruirTimer) clearTimeout(destruirTimer);
  if (foraDaMesaTimer) clearTimeout(foraDaMesaTimer);
  destruirTimer = null;
  foraDaMesaTimer = null;
}

/**
 * pega o motor e marca um usuário (componente montado); devolva com soltarMotor.
 * Dentro do prazo de soltarMotor devolve a mesma instância: o contexto e a camada que estava tocando continuam.
 */
export function reterMotor(): Motor {
  cancelarFechamento();
  usuarios++;
  if (!instancia) instancia = new Motor();
  return instancia;
}

/** a página atual ainda é de uma mesa (/mesa/<id>, Ajustes, Livro, ficha)? Fora do navegador, sim (nada a fechar cedo) */
function dentroDaMesa(): boolean {
  if (typeof location === "undefined") return true;
  return ROTA_MESA.test(location.pathname);
}

/**
 * último usuário saiu: a trilha continua por PRAZO_SOLTAR_MS (Ajustes, Livro, ficha e a volta para a mesa); só então
 * fecha o áudio, com fade. Também cobre o remontar do StrictMode sem recriar nada. Se logo depois a URL já não é de uma
 * mesa (voltou à página inicial), não há volta a esperar: fecha em PRAZO_FORA_DA_MESA_MS, com o mesmo fade.
 */
export function soltarMotor() {
  usuarios = Math.max(0, usuarios - 1);
  if (usuarios > 0 || destruirTimer) return;
  const fechar = () => {
    cancelarFechamento();
    if (usuarios === 0 && instancia) {
      instancia.destruir();
      instancia = null;
      publicar({ aguardandoGesto: !desbloqueado });
    }
  };
  destruirTimer = setTimeout(fechar, PRAZO_SOLTAR_MS);
  foraDaMesaTimer = setTimeout(() => {
    foraDaMesaTimer = null;
    if (usuarios === 0 && !dentroDaMesa()) fechar();
  }, PRAZO_FORA_DA_MESA_MS);
}

/** só para testes: o que o módulo guarda entre componentes */
export function _depurarMotor(): { temInstancia: boolean; usuarios: number; desbloqueado: boolean; aguardandoFechar: boolean } {
  return { temInstancia: instancia !== null, usuarios, desbloqueado, aguardandoFechar: destruirTimer !== null };
}

export type { Motor };
