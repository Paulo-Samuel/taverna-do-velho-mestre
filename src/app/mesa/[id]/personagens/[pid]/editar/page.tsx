import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FaixaAviso } from "@/components/faixa-aviso";
import { EdicaoFicha } from "@/components/ficha/passos";
import { Icone } from "@/components/icones";
import { LinkVoltar } from "@/components/link-voltar";
import { TemaPagina } from "@/components/tema-pagina";
import { EdicaoHistoria } from "@/components/historia/criacao/criacao-historia";
import { normalizarRetrato } from "@/components/historia/retrato/dados";
import { obterCampanha, obterPersonagem } from "@/lib/db";
import { extrasIniciais, opcoesEditaveis } from "@/lib/editar-ficha";
import { mesaOcupada } from "@/lib/mestre";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
import { publico } from "@/lib/sistemas/comum";
import { temaDoSistema } from "@/lib/temas";
import { editarPersonagemAcao } from "../../acoes";

// Editar um personagem que já está na mesa: só a parte narrativa (nome, jogador, história, conceito, convicções, pedras de
// toque, vantagens...). O que mexe em número (atributos, perícias, disciplinas, Manchas, Surto) não aparece e não muda.
// No modo história: nome, rosto, aparência e história. Quem salva é editarPersonagemAcao (../../acoes.ts).

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/personagens/[pid]/editar">): Promise<Metadata> {
  const { id, pid } = await props.params;
  const c = obterCampanha(Number(id));
  const p = obterPersonagem(Number(pid));
  return { title: c && p && p.campanhaId === c.id ? `Editar ${p.ficha.nome} · ${c.nome}` : "Porta errada" };
}

export default async function EditarPersonagem(props: PageProps<"/mesa/[id]/personagens/[pid]/editar">) {
  const { id, pid } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);
  const p = obterPersonagem(Number(pid));
  // personagem de outra mesa conta como inexistente (como nas rotas do grupo)
  if (!p || p.campanhaId !== campanha.id) notFound();

  const ocupado = mesaOcupada(campanha.id);
  const local = await daMaquinaNaPagina();
  const acao = editarPersonagemAcao.bind(null, campanha.id, p.id);
  const ficha = p.ficha;

  if (campanha.sistema === "historia") {
    const sistema = obterSistema("historia");
    const semente = crypto.randomUUID().slice(0, 8);
    return (
      <EdicaoHistoria
        semente={semente}
        acao={acao}
        mesa={{ id: campanha.id, nome: campanha.nome }}
        ocupado={ocupado}
        inicial={{
          nome: ficha.nome,
          aparencia: String(ficha.extras?.aparencia ?? ""),
          historia: ficha.historia ?? "",
          sexo: String(ficha.extras?.sexo ?? ""),
          origem: ficha.ancestralidade,
          origemNome: sistema.ancestralidades.find((a) => a.id === ficha.ancestralidade)?.nome ?? "",
          classe: ficha.classe,
          classeNome: sistema.classes.find((c) => c.id === ficha.classe)?.nome ?? "",
          retrato: normalizarRetrato(ficha.extras?.retrato),
        }}
      />
    );
  }

  const sistema = obterSistema(campanha.sistema);
  const opcoes = opcoesEditaveis(sistema.opcoesCriacao, ficha);
  return (
    <main data-tema={temaDoSistema(campanha.sistema)} className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <TemaPagina tema={temaDoSistema(campanha.sistema)} />
      <LinkVoltar href={`/mesa/${campanha.id}`}>Voltar para {campanha.nome}</LinkVoltar>
      <CabecalhoPagina
        className="mt-1"
        titulo={`Editar ${ficha.nome}`}
        subtitulo={
          <>
            {sistema.nome}. Aqui muda o que o mestre lê para saber quem é o personagem; os números (atributos, perícias, poderes, vida e
            marcadores) ficam como estão: crescem com XP ou se ajustam no “<Icone nome="pencil" aria-hidden /> ajustar” da ficha.
          </>
        }
      />
      {!local && p.jogador && (
        <FaixaAviso tom="alerta" icone="lock" className="mb-4">
          Você está pela rede: só {p.jogador} (o dono deste personagem, pelo apelido da mesa) ou a máquina da taverna salvam mudanças.
        </FaixaAviso>
      )}
      <EdicaoFicha
        sistema={publico(sistema)}
        opcoes={opcoes}
        acao={acao}
        ocupado={ocupado}
        voltar={{ href: `/mesa/${campanha.id}`, texto: "Cancelar" }}
        inicial={{
          nome: ficha.nome,
          jogador: p.jogador,
          historia: ficha.historia ?? "",
          classe: ficha.classe,
          ancestralidade: ficha.ancestralidade,
          extras: extrasIniciais(ficha, opcoes),
        }}
      />
    </main>
  );
}
