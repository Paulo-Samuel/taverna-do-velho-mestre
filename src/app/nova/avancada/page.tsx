import type { Metadata } from "next";
import { FormularioPersonagem } from "@/components/ficha/formulario-personagem";
import { sistemasPublicos } from "@/lib/sistemas";
import { criarCampanhaAcao } from "../acoes";

export const metadata: Metadata = { title: "Nova campanha (avançado) · Taverna do Velho Mestre" };

export default async function NovaCampanha(props: PageProps<"/nova/avancada">) {
  // o catálogo (/sistemas) linka para /nova/avancada?sistema=<id>; o formulário confere se existe e está pronto
  const { sistema } = await props.searchParams;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* o título mora no formulário: grande no primeiro passo, numa linha junto da barra de passos depois */}
      <FormularioPersonagem
        sistemas={sistemasPublicos()}
        sistemaInicial={typeof sistema === "string" ? sistema : undefined}
        acao={criarCampanhaAcao}
        modo="campanha"
        destino="campanha"
        textoBotao="Entrar na taverna"
        cabecalho={{
          titulo: "Quem entra pela porta?",
          subtitulo: "Escolha as regras, monte o personagem e diga onde a história começa. O mestre cuida do resto, inclusive de arruinar seus planos.",
        }}
      />
    </main>
  );
}
