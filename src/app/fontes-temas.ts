import { Alfa_Slab_One, Cinzel, Cinzel_Decorative, Cormorant_SC, Marcellus_SC, Pirata_One, Special_Elite, Uncial_Antiqua } from "next/font/google";

// Fontes de título dos temas por sistema (src/lib/temas.ts + blocos [data-tema] no globals.css). preload: false porque cada
// página usa no máximo uma ou duas: o navegador só baixa a fonte quando algum título do tema aparece na tela.
// (o next/font só aceita literais nas opções: nada de espalhar um objeto comum)

const cinzel = Cinzel({ subsets: ["latin"], display: "swap", preload: false, variable: "--fonte-cinzel" });
const cinzelDecorativa = Cinzel_Decorative({ subsets: ["latin"], weight: "700", display: "swap", preload: false, variable: "--fonte-cinzel-decorativa" });
const marcellus = Marcellus_SC({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--fonte-marcellus" });
const pirata = Pirata_One({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--fonte-pirata" });
const elite = Special_Elite({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--fonte-elite" });
const alfa = Alfa_Slab_One({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--fonte-alfa" });
const uncial = Uncial_Antiqua({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--fonte-uncial" });
const cormorant = Cormorant_SC({ subsets: ["latin"], weight: ["500", "600"], display: "swap", preload: false, variable: "--fonte-cormorant" });

/** Classes que definem as variáveis das fontes dos temas; vão no <html>, somadas às fontes da casa. */
export const classesFontesTemas = [cinzel, cinzelDecorativa, marcellus, pirata, elite, alfa, uncial, cormorant].map((f) => f.variable).join(" ");
