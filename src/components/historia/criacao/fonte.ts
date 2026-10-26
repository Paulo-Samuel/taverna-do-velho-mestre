import { UnifrakturMaguntia } from "next/font/google";

// Letra gótica só da tela de criação: o resto da taverna continua legível para quem bebeu.
export const gotica = UnifrakturMaguntia({ weight: "400", subsets: ["latin"], display: "swap" });
