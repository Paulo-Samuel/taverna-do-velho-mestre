import type { MetadataRoute } from "next";
import { DESCRICAO_CASA, NOME_CASA } from "@/lib/descricao-casa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: NOME_CASA,
    short_name: "Taverna",
    description: DESCRICAO_CASA,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    categories: ["games", "entertainment"],
    // madeira escura do tema "historia" em temas.css (a mesma do viewport.themeColor e do fundo do ícone maskable);
    // manifesto não lê token
    background_color: "#120d0a",
    theme_color: "#120d0a",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
