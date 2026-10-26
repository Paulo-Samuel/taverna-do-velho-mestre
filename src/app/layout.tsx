import type { Metadata, Viewport } from "next";
import { Alegreya, IM_Fell_English_SC } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { ehDestaMaquina } from "@/lib/rede/local";
import { Navegacao } from "./config/navegacao";
import { classesFontesTemas } from "./fontes-temas";
import "./globals.css";

const corpo = Alegreya({ subsets: ["latin"], variable: "--font-corpo" });
// a fonte de título da casa vira --fonte-fell; o --font-titulo de verdade é escolhido pelo tema no globals.css
const titulo = IM_Fell_English_SC({ subsets: ["latin"], weight: "400", variable: "--fonte-fell" });

export const metadata: Metadata = {
  title: "Taverna do Velho Mestre",
  description: "RPG de mesa com um mestre de IA, rodando na sua máquina. Sozinho, com a turma no sofá ou pela rede de casa.",
};

export const viewport: Viewport = { themeColor: "#120d0a", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Quem chega pela rede só enxerga as mesas (o porteiro barra o resto); mostrar a navegação seria só porta pintada na parede.
  const h = await headers();
  const daMaquina = ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"));

  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable} ${classesFontesTemas}`}>
      <body className="min-h-dvh font-sans text-[17px] antialiased">
        <header className="relative z-20 border-b border-border/70 bg-background/70 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            {daMaquina ? (
              <Link href="/" className="titulo flex min-w-0 items-center gap-2 text-xl text-ambar">
                <span aria-hidden>🍺</span>
                <span className="truncate">Taverna do Velho Mestre</span>
              </Link>
            ) : (
              <span className="titulo flex min-w-0 items-center gap-2 text-xl text-ambar">
                <span aria-hidden>🍺</span>
                <span className="truncate">Taverna do Velho Mestre</span>
              </span>
            )}
            {daMaquina && <Navegacao />}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
