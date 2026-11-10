import type { Metadata, Viewport } from "next";
import { Alegreya, IM_Fell_English_SC } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { DESCRICAO_CASA, NOME_CASA } from "@/lib/descricao-casa";
import { ehDestaMaquina } from "@/lib/rede/local";
import { Navegacao } from "./config/navegacao";
import { classesFontesTemas } from "./fontes-temas";
import "./globals.css";
import { Icone } from "@/components/icones";
import { RodapeCasa } from "@/components/rodape-casa";

const corpo = Alegreya({ subsets: ["latin"], variable: "--font-corpo" });
// a fonte de título da casa vira --fonte-fell; o --font-titulo de verdade é escolhido pelo tema no globals.css
const titulo = IM_Fell_English_SC({ subsets: ["latin"], weight: "400", variable: "--fonte-fell" });

// Cada página dá só a parte própria do título ("Sistemas"); o template completa com o nome da casa.
// O host vem do pedido (localhost na máquina, IP da rede no celular) para o Open Graph apontar para onde a pessoa está.
export async function generateMetadata(): Promise<Metadata> {
  const pedido = (await headers()).get("host") ?? "";
  const host = /^[\w.\-\[\]:]+$/.test(pedido) ? pedido : "localhost:3300";
  let base: URL;
  try {
    base = new URL(`http://${host}`);
  } catch {
    base = new URL("http://localhost:3300");
  }
  return {
    title: { default: NOME_CASA, template: "%s · Taverna do Velho Mestre" },
    description: DESCRICAO_CASA,
    applicationName: NOME_CASA,
    manifest: "/manifest.webmanifest",
    metadataBase: base,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: NOME_CASA,
      title: NOME_CASA,
      description: DESCRICAO_CASA,
      images: ["/icone-512.png"],
    },
    twitter: { card: "summary" },
    appleWebApp: { capable: true, title: "Taverna", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
    // a taverna é local: se alguém expuser a porta por engano, não é para buscador nenhum indexar
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#120d0a", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Quem chega pela rede só enxerga as mesas (o porteiro barra o resto); mostrar a navegação seria só porta pintada na parede.
  const h = await headers();
  const daMaquina = ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"));

  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable} ${classesFontesTemas}`}>
      <body className="flex min-h-dvh flex-col font-sans text-[17px] antialiased">
        <a href="#conteudo" className="pular-conteudo">
          Pular para o conteúdo
        </a>
        <header className="relative z-20 border-t-2 border-t-ambar border-b border-b-border bg-background/95">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            {daMaquina ? (
              <Link href="/" className="titulo titulo-brilho flex min-w-0 items-center gap-2 text-xl text-ambar">
                <Icone nome="mug" />
                <span className="truncate">Taverna do Velho Mestre</span>
              </Link>
            ) : (
              <span className="titulo titulo-brilho flex min-w-0 items-center gap-2 text-xl text-ambar">
                <Icone nome="mug" />
                <span className="truncate">Taverna do Velho Mestre</span>
              </span>
            )}
            {daMaquina && <Navegacao />}
          </div>
        </header>
        <div id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </div>
        {/* mesmo critério da navegação: quem vem pela rede só vê mesas (que são fixed e cobrem cabeçalho e rodapé) */}
        {daMaquina && <RodapeCasa />}
      </body>
    </html>
  );
}
