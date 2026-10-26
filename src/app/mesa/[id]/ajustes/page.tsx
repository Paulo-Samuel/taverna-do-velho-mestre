import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listarPersonagens, obterCampanha } from "@/lib/db";
import { dificuldadeDe, tamanhoDe } from "@/lib/mestre/estilo";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
import { temaDoSistema } from "@/lib/temas";
import { TemaPagina } from "@/components/tema-pagina";
import { excluirCampanhaAcao, salvarAjustesAcao } from "./acoes";
import { FormularioCampanha, FormularioExcluir, FormularioPin } from "./formularios";

// Ajustes da mesa: nome, cenário, tom, modo (livre/rodada), dados, estilo do mestre, PIN da rede e exclusão.
// Pela rede a página abre só para leitura; quem manda no salão é a máquina da taverna.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/ajustes">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Ajustes · ${c.nome}` : "Taverna do Velho Mestre" };
}

function Secao({ titulo, children, perigo }: { titulo: string; children: React.ReactNode; perigo?: boolean }) {
  return (
    <section className={`cartao p-5 ${perigo ? "border-sangue/40" : ""}`}>
      <h2 className={`titulo mb-4 text-xl ${perigo ? "text-sangue" : "text-pergaminho"}`}>{titulo}</h2>
      {children}
    </section>
  );
}

export default async function AjustesMesa(props: PageProps<"/mesa/[id]/ajustes">) {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);

  const local = await daMaquinaNaPagina();
  const sistema = obterSistema(campanha.sistema);
  const grupo = listarPersonagens(campanha.id);

  return (
    <main
      data-tema={temaDoSistema(campanha.sistema)}
      className="mx-auto max-w-3xl space-y-6 px-4 py-8 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ambar">
      <TemaPagina tema={temaDoSistema(campanha.sistema)} />
      <div>
        <Link href={`/mesa/${campanha.id}`} className="-my-2 inline-block py-2 text-xs text-muted hover:text-ambar">
          ← voltar para a mesa
        </Link>
        <h1 className="titulo mt-1 text-3xl text-pergaminho">Ajustes da mesa</h1>
        <p className="mt-1 text-sm text-muted">
          {sistema.nome} · {grupo.length} {grupo.length === 1 ? "personagem" : "personagens"} · criada em{" "}
          {new Date(campanha.criadaEm + "Z").toLocaleDateString("pt-BR")}
        </p>
      </div>

      {!local && (
        <p className="rounded-md border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm">
          Você está pela rede. Dá para olhar, mas só a máquina da taverna muda os ajustes. Peça para quem está nela.
        </p>
      )}

      <Secao titulo="Campanha">
        <FormularioCampanha
          acao={salvarAjustesAcao.bind(null, campanha.id)}
          inicial={{
            nome: campanha.nome,
            cenario: campanha.cenario,
            tom: campanha.tom,
            modo: campanha.config.modo ?? "livre",
            dados: campanha.config.dados ?? "jogador",
            sugestoes: campanha.config.sugestoes !== false,
            dificuldade: dificuldadeDe(campanha.config.dificuldade),
            narracao: tamanhoDe(campanha.config.narracao),
            foco: campanha.config.foco ?? [],
            instrucoes: campanha.config.instrucoes ?? "",
          }}
          bloqueado={!local}
        />
      </Secao>

      <Secao titulo="Grupo">
        <p className="mb-3 text-sm text-muted">
          {grupo.length ? `${grupo.map((p) => p.ficha.nome).join(", ")}.` : "Ninguém sentado ainda."} Para tirar alguém, use a aba Grupo da mesa.
        </p>
        <Link href={`/mesa/${campanha.id}/personagens/novo`} className="btn-borda">
          + Adicionar personagem
        </Link>
      </Secao>

      <Secao titulo="PIN da rede local">
        <p className="mb-3 text-sm text-muted">
          Quem entra pelo celular ou por outro computador da casa digita o PIN uma vez. Esta máquina nunca precisa dele.
        </p>
        {/* o PIN em si só vai para a página quando ela está aberta na própria máquina */}
        <FormularioPin campanhaId={campanha.id} temPin={Boolean(campanha.config.pin)} pinAtual={local ? (campanha.config.pin ?? null) : null} bloqueado={!local} />
      </Secao>

      <Secao titulo="Excluir campanha" perigo>
        <FormularioExcluir acao={excluirCampanhaAcao.bind(null, campanha.id)} nome={campanha.nome} bloqueado={!local} />
      </Secao>
    </main>
  );
}
