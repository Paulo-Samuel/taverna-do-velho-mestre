import { UnifrakturMaguntia } from "next/font/google";

// Letra gótica do modo história (logo, títulos de cena, nomes no códex). Uma instância só, para a mesa e a criação
// usarem a mesma fonte (o next/font baixa e serve o arquivo uma vez).
export const fonteGotica = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", display: "swap" });
