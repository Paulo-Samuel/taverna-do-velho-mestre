import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormularioPersonagem } from "@/components/ficha/formulario-personagem";
import { listarPersonagens, obterCampanha } from "@/lib/db";
import { acessoNaPagina } from "@/lib/rede/acesso";
import { obterSistema, sistemasPublicos } from "@/lib/sistemas";
import { temaDoSistema } from "@/lib/temas";
import { criarPersonagemAcao } from "../acoes";

// Mais uma cadeira na mesa: ficha nova no sistema da campanha. Serve para a mesa local (vários no mesmo teclado)
// e para quem chega pela rede e ainda não tem personagem.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/personagens/novo">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Novo personagem · ${c.nome}` : "Taverna do Velho Mestre" };
}

export default async function NovoPersonagem(props: PageProps<"/mesa/[id]/personagens/novo">) {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);

  const sistema = obterSistema(campanha.sistema);
  const grupo = listarPersonagens(campanha.id).map((p) => p.ficha.nome);

  return (
    // data-tema já no HTML do servidor; o formulário põe o mesmo tema no <body> (fundo e cabeçalho)
    <main data-tema={temaDoSistema(campanha.sistema)} className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {!sistema.pronto && <p className="cartao mb-4 p-4 text-sm text-sangue">{sistema.nome} ainda está em construção: não dá para criar fichas nele por enquanto.</p>}
      <FormularioPersonagem
        sistemas={sistemasPublicos()}
        sistemaFixo={campanha.sistema}
        acao={criarPersonagemAcao.bind(null, campanha.id)}
        modo="personagem"
        destino={`mesa-${campanha.id}`}
        textoBotao="Puxar o banco"
        cabecalho={{
          titulo: "Mais uma cadeira na mesa",
          antes: (
            <Link href={`/mesa/${campanha.id}`} className="-my-2 mb-1 inline-block py-2 text-xs text-muted hover:text-ambar">
              ← voltar para {campanha.nome}
            </Link>
          ),
          subtitulo: (
            <>
              {sistema.nome}
              {grupo.length ? ` · já sentados: ${grupo.join(", ")}` : " · a mesa ainda está vazia"}. Cada personagem pode ser de um jogador diferente no
              mesmo computador: é só trocar quem age antes de digitar.
            </>
          ),
        }}
      />
    </main>
  );
}
