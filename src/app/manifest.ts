import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taverna do Velho Mestre",
    short_name: "Taverna",
    description: "RPG de mesa com um mestre de IA, rodando na sua máquina.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#120d0a",
    theme_color: "#120d0a",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
