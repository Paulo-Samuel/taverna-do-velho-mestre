import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// IPs desta máquina na rede local: no modo dev o Next só serve HMR e arquivos de desenvolvimento a origens conhecidas,
// então o celular que abre http://192.168.x.x:3300 precisa estar na lista. As faixas privadas cobrem troca de IP pelo DHCP.
// (Mesma ideia de src/lib/rede/enderecos.ts, repetida aqui porque a config carrega antes do app.)
const ipsLocais = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  // App local de um usuário só; o modelo clássico de cache basta (como na loja-3d).
  cacheComponents: false,
  // TAVERNA_DIST permite um segundo servidor de desenvolvimento (ex.: com o mestre de teste) sem brigar pela pasta .next
  ...(process.env.TAVERNA_DIST ? { distDir: process.env.TAVERNA_DIST } : {}),
  allowedDevOrigins: [...new Set([...ipsLocais, "192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"])],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
