// Céu estrelado e animações da criação, em CSS puro (só gradientes, nenhuma imagem de fora).
// Vai num <style> com precedence: o React deduplica e põe no <head>.

export const CSS_CRIACAO = `
/* Céu estrelado da criação: só gradientes, nenhuma imagem de fora. Três camadas de estrelas com tamanhos e
   ritmos diferentes, e uma névoa âmbar no horizonte, que é a taverna esperando lá embaixo. */

.criacao-ceu {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 120% 60% at 50% 115%, rgba(224, 162, 74, 0.16), transparent 60%),
    radial-gradient(ellipse 80% 50% at 15% 0%, rgba(80, 70, 140, 0.18), transparent 70%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(120, 40, 60, 0.14), transparent 70%),
    linear-gradient(180deg, #07060c 0%, #0d0a10 55%, #140e0b 100%);
}

.criacao-estrelas,
.criacao-estrelas::before,
.criacao-estrelas::after {
  position: absolute;
  inset: 0;
  content: "";
  background-repeat: repeat;
}

.criacao-estrelas {
  background-image:
    radial-gradient(1px 1px at 20px 30px, rgba(255, 244, 220, 0.9), transparent 60%),
    radial-gradient(1px 1px at 80px 120px, rgba(255, 244, 220, 0.7), transparent 60%),
    radial-gradient(1px 1px at 150px 60px, rgba(255, 255, 255, 0.8), transparent 60%),
    radial-gradient(1px 1px at 200px 170px, rgba(255, 240, 210, 0.6), transparent 60%),
    radial-gradient(1px 1px at 120px 210px, rgba(255, 255, 255, 0.7), transparent 60%),
    radial-gradient(1px 1px at 230px 20px, rgba(255, 244, 220, 0.5), transparent 60%);
  background-size: 250px 250px;
  opacity: 0.7;
}

.criacao-estrelas::before {
  background-image:
    radial-gradient(1.5px 1.5px at 60px 80px, rgba(255, 250, 235, 0.95), transparent 60%),
    radial-gradient(1.5px 1.5px at 300px 40px, rgba(255, 230, 190, 0.8), transparent 60%),
    radial-gradient(1.5px 1.5px at 180px 290px, rgba(220, 230, 255, 0.85), transparent 60%),
    radial-gradient(1.5px 1.5px at 340px 230px, rgba(255, 250, 235, 0.7), transparent 60%);
  background-size: 380px 380px;
  animation: criacao-cintilar 5s ease-in-out infinite alternate;
}

.criacao-estrelas::after {
  background-image:
    radial-gradient(2px 2px at 110px 160px, rgba(255, 236, 200, 1), transparent 60%),
    radial-gradient(2px 2px at 420px 90px, rgba(210, 225, 255, 0.9), transparent 60%),
    radial-gradient(2px 2px at 280px 380px, rgba(255, 236, 200, 0.85), transparent 60%);
  background-size: 520px 520px;
  animation: criacao-cintilar 7s ease-in-out 1.5s infinite alternate;
}

@keyframes criacao-cintilar {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

/* barra de progresso fina no topo do cartão */
.criacao-progresso {
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.3, 1);
  box-shadow: 0 0 12px -2px var(--ambar);
}

.criacao-passo {
  animation: criacao-entrar 0.35s ease-out both;
}

@keyframes criacao-entrar {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .criacao-estrelas::before,
  .criacao-estrelas::after,
  .criacao-passo {
    animation: none;
  }
  .criacao-progresso {
    transition: none;
  }
}
`;
