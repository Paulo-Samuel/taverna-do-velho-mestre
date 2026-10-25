import type { Metadata } from "next";
import { FormularioPersonagem } from "@/components/ficha/formulario-personagem";
import { sistemasPublicos } from "@/lib/sistemas";
import { criarCampanhaAcao } from "./acoes";

export const metadata: Metadata = { title: "Nova campanha · Taverna do Velho Mestre" };

export default async function NovaCampanha(props: PageProps<"/nova">) {
  // o catálogo (/sistemas) linka para /nova?sistema=<id>; o formulário confere se existe e está pronto
  const { sistema } = await props.searchParams;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="titulo text-3xl text-pergaminho sm:text-4xl">Quem entra pela porta?</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Escolha as regras, monte o personagem e diga onde a história começa. O mestre cuida do resto, inclusive de arruinar seus planos.
      </p>
      <FormularioPersonagem
        sistemas={sistemasPublicos()}
        sistemaInicial={typeof sistema === "string" ? sistema : undefined}
        acao={criarCampanhaAcao}
        modo="campanha"
        textoBotao="Entrar na taverna"
      />
    </main>
  );
}
