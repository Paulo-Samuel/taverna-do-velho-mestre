import type { Metadata } from "next";
import { FormularioPersonagem } from "@/components/ficha/formulario-personagem";
import { aventurasPublicas } from "@/lib/aventuras";
import { sistemasPublicos } from "@/lib/sistemas";
import { criarCampanhaAcao } from "../acoes";
import { personagensParaTrazer } from "../copiar-personagem";

export const metadata: Metadata = { title: "Nova campanha (avançado) · Taverna do Velho Mestre" };
// lê o banco (personagens de outras mesas) e os cabeçalhos (máquina da taverna?): não pode ser pré-renderizada
export const dynamic = "force-dynamic";

export default async function NovaCampanha(props: PageProps<"/nova/avancada">) {
  // o catálogo (/sistemas) linka para /nova/avancada?sistema=<id>; o formulário confere se existe e está pronto
  // o início linka para ?sistema=<id>&aventura=<id>: a aventura já vem marcada (e a campanha preenchida)
  const { sistema, aventura } = await props.searchParams;
  // personagens de outras mesas para o cartão "Trazer um personagem" (lista vazia pela rede)
  const copiaveis = await personagensParaTrazer();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* o título mora no formulário: grande no primeiro passo, numa linha junto da barra de passos depois */}
      <FormularioPersonagem
        sistemas={sistemasPublicos()}
        copiaveis={copiaveis}
        sistemaInicial={typeof sistema === "string" ? sistema : undefined}
        aventuras={aventurasPublicas().filter((a) => !a.sistemas.includes("historia"))}
        aventuraInicial={typeof aventura === "string" ? aventura : undefined}
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
