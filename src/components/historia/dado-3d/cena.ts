import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { DIRECAO_CAMERA, facesD20, rotacaoParaFace } from "./geometria";
import { desenharAtlas, uvDaCelula } from "./textura";

// Cena WebGL do d20: renderer com fundo transparente, luz quente de vela e a física de mentira do dado
// (tumble com eixo aleatório, quiques e assentamento numa face escolhida). Este módulo só é carregado
// via import() no navegador, para o three.js não entrar no bundle inicial nem rodar no servidor.

export type CenaDado = {
  /** começa (ou continua) a girar e quicar */
  rolar(): void;
  /** desacelera e assenta com a face `valor` virada para a câmera; `aoFim` é chamado quando para */
  assentar(valor: number, aoFim: () => void): void;
  /** mostra a face sem animação (null = pose neutra, de quina, sem face de frente) */
  mostrar(valor: number | null): void;
  destacar(destaque: "critico" | "falha" | null): void;
  redimensionar(tamanho: number): void;
  destruir(): void;
};

/** giro mínimo antes de assentar, para dar emoção mesmo quando o servidor responde rápido */
const GIRO_MINIMO = 0.8;
/** duração do assentamento (desacelera, quica e para na face) */
const DURACAO_ASSENTAR = 1.2;
/** giro final aleatório em volta do eixo da câmera (±), limitado para o número continuar legível */
const GIRO_FINAL_MAX = 0.6;
const GRAVIDADE = 14;
const ALTURA_MAX = 0.4;

const suave = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function vetorAleatorio(): Vector3 {
  // ponto uniforme na esfera
  const z = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return new Vector3(r * Math.cos(t), r * Math.sin(t), z);
}

/** gira `q` (no espaço do mundo) pela velocidade angular `omega` durante `dt` segundos */
function integrar(q: Quaternion, omega: Vector3, dt: number) {
  const angulo = omega.length() * dt;
  if (angulo < 1e-9) return;
  const dq = new Quaternion().setFromAxisAngle(omega.clone().normalize(), angulo);
  q.premultiply(dq).normalize();
}

function texturaSombra(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    g.addColorStop(0.6, "rgba(0, 0, 0, 0.25)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(c);
}

/** cria a cena dentro de `container` (o canvas é criado aqui e removido no destruir). Lança erro sem WebGL. */
export function criarCena(container: HTMLElement, aoPerderContexto: () => void): CenaDado {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  let destruido = false;
  const perdeuContexto = (e: Event) => {
    e.preventDefault();
    if (!destruido) aoPerderContexto();
  };
  canvas.addEventListener("webglcontextlost", perdeuContexto);

  const cena = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.copy(DIRECAO_CAMERA).multiplyScalar(5.6);
  camera.lookAt(0, 0, 0);

  // luz de vela: céu quente, chão escuro, luz principal âmbar do alto à direita e contraluz avermelhada
  cena.add(new HemisphereLight(0xffd9a0, 0x1a0c04, 1.1));
  const principal = new DirectionalLight(0xffc77a, 2.6);
  principal.position.set(2.5, 3.2, 4);
  cena.add(principal);
  const contraluz = new PointLight(0xff6a2a, 6, 12, 1.5);
  contraluz.position.set(-2.5, -0.5, -1.5);
  cena.add(contraluz);
  const preenchimento = new DirectionalLight(0xffe2b8, 0.6);
  preenchimento.position.set(-3, 1, 3);
  cena.add(preenchimento);

  // geometria: 20 triângulos sem índice, normal chapada por face e UV na célula do atlas
  const faces = facesD20();
  const posicoes: number[] = [];
  const normais: number[] = [];
  const uvs: number[] = [];
  faces.forEach((f, i) => {
    const uv = uvDaCelula(i);
    [f.a, f.b, f.c].forEach((p, k) => {
      posicoes.push(p.x, p.y, p.z);
      normais.push(f.normal.x, f.normal.y, f.normal.z);
      uvs.push(uv[k][0], uv[k][1]);
    });
  });
  const geometria = new BufferGeometry();
  geometria.setAttribute("position", new Float32BufferAttribute(posicoes, 3));
  geometria.setAttribute("normal", new Float32BufferAttribute(normais, 3));
  geometria.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

  const atlas = new CanvasTexture(desenharAtlas(faces.map((f) => f.numero)));
  atlas.colorSpace = SRGBColorSpace;
  atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // resina âmbar polida: verniz (clearcoat) por cima dá o brilho de dado de verdade
  const material = new MeshPhysicalMaterial({
    map: atlas,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
    emissive: new Color(0x000000),
  });
  const dado = new Mesh(geometria, material);
  dado.scale.setScalar(0.92);
  cena.add(dado);

  // sombra no "chão": diminui e clareia quando o dado sobe
  const sombraTextura = texturaSombra();
  const sombraGeometria = new PlaneGeometry(1, 1);
  const sombraMaterial = new MeshBasicMaterial({ map: sombraTextura, transparent: true, depthWrite: false, opacity: 0.6 });
  const sombra = new Mesh(sombraGeometria, sombraMaterial);
  sombra.position.set(0, -0.98, -0.4);
  cena.add(sombra);

  // ----- estado da animação -----
  type Fase = "parado" | "rolando" | "assentando";
  let fase: Fase = "parado";
  let valorAtual: number | null = null;
  const omega = new Vector3();
  let tRolando = 0;
  let altura = 0;
  let vy = 0;
  let alturaQuique = ALTURA_MAX;
  let pedido: { valor: number; aoFim: () => void } | null = null;

  // assentamento
  let tAssentar = 0;
  const qGiro = new Quaternion();
  const qAlvo = new Quaternion();
  let velocidadeInicial = 0;
  const eixoGiro = new Vector3();
  const eixoBalanco = new Vector3();

  const poseNeutra = new Quaternion().setFromUnitVectors(faces[0].a.clone().normalize(), DIRECAO_CAMERA);
  dado.quaternion.copy(poseNeutra);

  function desenhar() {
    dado.position.y = altura;
    const subida = Math.min(1, altura / ALTURA_MAX);
    sombra.scale.set(1.7 * (1 - subida * 0.35), 0.32 * (1 - subida * 0.35), 1);
    sombraMaterial.opacity = 0.6 * (1 - subida * 0.55);
    renderer.render(cena, camera);
  }

  // loop só existe enquanto há animação; parado, a cena é desenhada sob demanda
  let quadroId = 0;
  let ultimo = 0;
  function iniciarLoop() {
    if (quadroId || destruido) return;
    ultimo = performance.now();
    quadroId = requestAnimationFrame(quadro);
  }
  function pararLoop() {
    if (quadroId) cancelAnimationFrame(quadroId);
    quadroId = 0;
  }
  function quadro(agora: number) {
    const dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
    ultimo = agora;
    const fim = atualizar(dt);
    desenhar();
    if (fase === "parado") {
      quadroId = 0;
      fim?.();
    } else {
      quadroId = requestAnimationFrame(quadro);
    }
  }

  function iniciarRolagem() {
    fase = "rolando";
    tRolando = 0;
    omega.copy(vetorAleatorio()).multiplyScalar(20);
    alturaQuique = ALTURA_MAX;
    vy = Math.sqrt(2 * GRAVIDADE * Math.max(0, ALTURA_MAX - altura));
    valorAtual = null;
    iniciarLoop();
  }

  function iniciarAssentamento(valor: number) {
    fase = "assentando";
    tAssentar = 0;
    qGiro.copy(dado.quaternion);
    velocidadeInicial = omega.length();
    eixoGiro.copy(omega).normalize();
    eixoBalanco.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize();
    qAlvo.copy(rotacaoParaFace(valor, (Math.random() * 2 - 1) * GIRO_FINAL_MAX));
    valorAtual = valor;
    // um último quique mais alto antes de parar, se estiver perto do chão
    if (altura < 0.15 && vy <= 0) vy = Math.sqrt(2 * GRAVIDADE * 0.3);
  }

  // vigia: se o requestAnimationFrame parar (aba em segundo plano, webview escondida), termina mesmo assim
  let vigia: ReturnType<typeof setTimeout> | null = null;
  function limparVigia() {
    if (vigia) clearTimeout(vigia);
    vigia = null;
  }
  function armarVigia() {
    limparVigia();
    vigia = setTimeout(concluirJa, (GIRO_MINIMO + DURACAO_ASSENTAR) * 1000 + 1500);
  }

  /** pula direto para o fim do assentamento (aba escondida: o requestAnimationFrame não roda) */
  function concluirJa() {
    limparVigia();
    if (!pedido) return;
    const { valor, aoFim } = pedido;
    pararLoop();
    pedido = null;
    fase = "parado";
    altura = 0;
    vy = 0;
    omega.set(0, 0, 0);
    valorAtual = valor;
    dado.quaternion.copy(rotacaoParaFace(valor, (Math.random() * 2 - 1) * GIRO_FINAL_MAX));
    desenhar();
    aoFim();
  }
  const aoMudarVisibilidade = () => {
    if (document.hidden && fase !== "parado") concluirJa();
  };
  document.addEventListener("visibilitychange", aoMudarVisibilidade);

  /** avança a simulação; devolve o callback de fim quando o dado acabou de parar */
  function atualizar(dt: number): (() => void) | null {
    if (fase === "rolando") {
      tRolando += dt;
      // velocidade cai do arremesso (20 rad/s) até um giro sustentado (9 rad/s) enquanto espera o resultado
      const velocidade = 9 + 11 * Math.exp(-tRolando * 2.5);
      omega.setLength(velocidade);
      integrar(dado.quaternion, omega, dt);
      vy -= GRAVIDADE * dt;
      altura += vy * dt;
      if (altura <= 0) {
        altura = 0;
        // bateu na mesa: muda o eixo do tumble e quica de novo, cada vez um pouco mais baixo
        omega.add(vetorAleatorio().multiplyScalar(velocidade * 0.6));
        alturaQuique = Math.max(0.1, alturaQuique * 0.6);
        vy = Math.sqrt(2 * GRAVIDADE * alturaQuique);
      }
      if (pedido && tRolando >= GIRO_MINIMO) {
        iniciarAssentamento(pedido.valor);
      }
      return null;
    }

    if (fase === "assentando") {
      tAssentar += dt;
      const s = Math.min(1, tAssentar / DURACAO_ASSENTAR);
      // o giro livre desacelera até zero...
      const velocidade = velocidadeInicial * (1 - s) * (1 - s);
      integrar(qGiro, eixoGiro.clone().multiplyScalar(velocidade), dt);
      // ...enquanto a orientação é puxada para a face alvo
      const peso = suave(s / 0.8);
      dado.quaternion.slerpQuaternions(qGiro, qAlvo, peso);
      // balanço final que morre em s = 1
      const balanco = 0.16 * Math.sin(s * Math.PI * 5) * (1 - s) * (1 - s) * peso;
      if (Math.abs(balanco) > 1e-5) dado.quaternion.premultiply(new Quaternion().setFromAxisAngle(eixoBalanco, balanco));

      // quiques amortecidos, sem novos arremessos
      if (altura > 0 || vy > 0) {
        vy -= GRAVIDADE * dt;
        altura += vy * dt;
        if (altura <= 0) {
          altura = 0;
          vy = -vy * 0.45;
          if (vy < 0.7) vy = 0;
        }
      }
      if (s > 0.85) altura *= Math.max(0, (1 - s) / 0.15);

      if (s >= 1) {
        dado.quaternion.copy(qAlvo);
        altura = 0;
        vy = 0;
        omega.set(0, 0, 0);
        fase = "parado";
        limparVigia();
        const fim = pedido?.aoFim ?? null;
        pedido = null;
        return fim;
      }
    }
    return null;
  }

  return {
    rolar() {
      pedido = null;
      limparVigia();
      if (fase === "rolando") return;
      if (fase === "assentando") {
        // voltou a rolar no meio do assentamento: retoma o giro com a velocidade que restava
        fase = "rolando";
        tRolando = 0;
        omega.copy(eixoGiro).multiplyScalar(Math.max(4, velocidadeInicial * 0.5));
        return;
      }
      iniciarRolagem();
    },

    assentar(valor, aoFim) {
      if (fase === "parado" && valorAtual === valor && !pedido) {
        aoFim();
        return;
      }
      if (fase === "assentando") {
        if (valorAtual === valor) {
          pedido = { valor, aoFim };
          return;
        }
        // mudou o valor no meio do caminho: volta a girar e assenta de novo
        fase = "rolando";
        tRolando = 0;
        omega.copy(eixoGiro).multiplyScalar(Math.max(6, velocidadeInicial * 0.5));
      } else if (fase === "parado") {
        iniciarRolagem();
      }
      pedido = { valor, aoFim };
      if (document.hidden) {
        concluirJa();
        return;
      }
      armarVigia();
      iniciarLoop();
    },

    mostrar(valor) {
      pararLoop();
      limparVigia();
      pedido = null;
      fase = "parado";
      altura = 0;
      vy = 0;
      omega.set(0, 0, 0);
      valorAtual = valor;
      dado.quaternion.copy(valor === null ? poseNeutra : rotacaoParaFace(valor, 0));
      desenhar();
    },

    destacar(destaque) {
      if (destaque === "critico") {
        material.emissive.setHex(0x7a4c08);
        material.emissiveIntensity = 0.55;
      } else if (destaque === "falha") {
        material.emissive.setHex(0x6a0e06);
        material.emissiveIntensity = 0.6;
      } else {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 1;
      }
      if (!quadroId) desenhar();
    },

    redimensionar(tamanho) {
      renderer.setSize(tamanho, tamanho);
      if (!quadroId) desenhar();
    },

    destruir() {
      destruido = true;
      pararLoop();
      limparVigia();
      pedido = null;
      canvas.removeEventListener("webglcontextlost", perdeuContexto);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      geometria.dispose();
      material.dispose();
      atlas.dispose();
      sombraGeometria.dispose();
      sombraMaterial.dispose();
      sombraTextura.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
