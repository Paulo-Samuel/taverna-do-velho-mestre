// Céu estrelado e animações da criação, em CSS puro (só gradientes, nenhuma imagem de fora).
// Vai num <style> com precedence: o React deduplica e põe no <head>.

export const CSS_CRIACAO = `
/* Céu estrelado da criação: só gradientes, nenhuma imagem de fora. Três camadas de estrelas com tamanhos e
   ritmos diferentes, e uma névoa âmbar no horizonte, que é a taverna esperando lá embaixo. Tudo sai dos tokens do tema
   (--ambar, --sangue, --pergaminho, --background): nenhuma cor fixa. */

.criacao-ceu {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 120% 60% at 50% 115%, color-mix(in srgb, var(--ambar) 16%, transparent), transparent 60%),
    radial-gradient(ellipse 80% 50% at 15% 0%, color-mix(in srgb, var(--ambar-forte) 10%, transparent), transparent 70%),
    radial-gradient(ellipse 70% 50% at 90% 10%, color-mix(in srgb, var(--sangue) 14%, transparent), transparent 70%),
    linear-gradient(180deg, color-mix(in srgb, var(--background) 60%, black) 0%, color-mix(in srgb, var(--background) 82%, black) 55%, var(--background) 100%);
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
    radial-gradient(1px 1px at 20px 30px, color-mix(in srgb, var(--pergaminho) 90%, transparent), transparent 60%),
    radial-gradient(1px 1px at 80px 120px, color-mix(in srgb, var(--pergaminho) 70%, transparent), transparent 60%),
    radial-gradient(1px 1px at 150px 60px, color-mix(in srgb, var(--pergaminho) 80%, transparent), transparent 60%),
    radial-gradient(1px 1px at 200px 170px, color-mix(in srgb, var(--pergaminho) 60%, transparent), transparent 60%),
    radial-gradient(1px 1px at 120px 210px, color-mix(in srgb, var(--pergaminho) 70%, transparent), transparent 60%),
    radial-gradient(1px 1px at 230px 20px, color-mix(in srgb, var(--pergaminho) 50%, transparent), transparent 60%);
  background-size: 250px 250px;
  opacity: 0.7;
}

.criacao-estrelas::before {
  background-image:
    radial-gradient(1.5px 1.5px at 60px 80px, color-mix(in srgb, var(--pergaminho) 95%, transparent), transparent 60%),
    radial-gradient(1.5px 1.5px at 300px 40px, color-mix(in srgb, var(--pergaminho) 80%, transparent), transparent 60%),
    radial-gradient(1.5px 1.5px at 180px 290px, color-mix(in srgb, var(--pergaminho) 85%, transparent), transparent 60%),
    radial-gradient(1.5px 1.5px at 340px 230px, color-mix(in srgb, var(--pergaminho) 70%, transparent), transparent 60%);
  background-size: 380px 380px;
  animation: criacao-cintilar 5s ease-in-out infinite alternate;
}

.criacao-estrelas::after {
  background-image:
    radial-gradient(2px 2px at 110px 160px, color-mix(in srgb, var(--pergaminho) 100%, transparent), transparent 60%),
    radial-gradient(2px 2px at 420px 90px, color-mix(in srgb, var(--pergaminho) 90%, transparent), transparent 60%),
    radial-gradient(2px 2px at 280px 380px, color-mix(in srgb, var(--pergaminho) 85%, transparent), transparent 60%);
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
