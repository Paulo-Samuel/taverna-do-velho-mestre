import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { personagensParaTrazer } from "@/app/nova/copiar-personagem";
import { FaixaAviso } from "@/components/faixa-aviso";
import { FormularioPersonagem } from "@/components/ficha/formulario-personagem";
import { CriacaoHistoria } from "@/components/historia/criacao/criacao-historia";
import { LinkVoltar } from "@/components/link-voltar";
import { listarPersonagens, obterCampanha } from "@/lib/db";
import { acessoNaPagina } from "@/lib/rede/acesso";
import { obterSistema, sistemasPublicos } from "@/lib/sistemas";
import { publico } from "@/lib/sistemas/comum";
import { temaDoSistema } from "@/lib/temas";
import { criarPersonagemAcao, criarPersonagemHistoriaAcao } from "../acoes";

// Mais uma cadeira na mesa: ficha nova no sistema da campanha. Serve para a mesa local (vários no mesmo teclado)
// e para quem chega pela rede e ainda não tem personagem. Numa mesa do modo história a criação é a do modo história
// (nome, rosto, ofício, passado), sem o passo da campanha: a mesa já existe.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/personagens/novo">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Novo personagem · ${c.nome}` : "Porta errada" };
}

export default async function NovoPersonagem(props: PageProps<"/mesa/[id]/personagens/novo">) {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);

  const sistema = obterSistema(campanha.sistema);
  const grupo = listarPersonagens(campanha.id).map((p) => p.ficha.nome);

  if (campanha.sistema === "historia") {
    // a cada visita, outros nomes e rostos sugeridos (a página é dinâmica: a semente nasce no servidor e vai no HTML)
    const semente = crypto.randomUUID().slice(0, 8);
    return (
      <CriacaoHistoria
        modo="personagem"
        sistema={publico(sistema)}
        semente={semente}
        acao={criarPersonagemHistoriaAcao.bind(null, campanha.id)}
        // rascunho separado por mesa: não se mistura com o de uma campanha nova (/nova) nem com o de outra mesa
        chaveRascunho={`taverna:rascunho-historia:mesa-${campanha.id}`}
        mesa={{ id: campanha.id, nome: campanha.nome, grupo }}
      />
    );
  }

  return (
    // data-tema já no HTML do servidor; o formulário põe o mesmo tema no <body> (fundo e cabeçalho)
    <main data-tema={temaDoSistema(campanha.sistema)} className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {!sistema.pronto && (
        <FaixaAviso tom="alerta" className="mb-4">
          {sistema.nome} ainda está em construção: não dá para criar fichas nele por enquanto.
        </FaixaAviso>
      )}
      <FormularioPersonagem
        sistemas={sistemasPublicos()}
        sistemaFixo={campanha.sistema}
        acao={criarPersonagemAcao.bind(null, campanha.id)}
        modo="personagem"
        destino={`mesa-${campanha.id}`}
        textoBotao="Puxar o banco"
        // personagens de outras mesas do mesmo sistema (só nesta máquina): o cartão "Trazer um personagem" copia a ficha descansada
        copiaveis={sistema.pronto ? await personagensParaTrazer({ sistema: campanha.sistema, excetoCampanha: campanha.id }) : []}
        cabecalho={{
          titulo: "Mais uma cadeira na mesa",
          antes: (
            <LinkVoltar href={`/mesa/${campanha.id}`} className="mb-1">
              Voltar para {campanha.nome}
            </LinkVoltar>
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
