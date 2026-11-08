import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { aventuraDoSistema } from "@/lib/aventuras";
import { listarPersonagens, obterCampanha } from "@/lib/db";
import { dificuldadeDe, tamanhoDe } from "@/lib/mestre/estilo";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
import { temaDoSistema } from "@/lib/temas";
import { TemaPagina } from "@/components/tema-pagina";
import { desligarAventuraAcao, duplicarCampanhaAcao, excluirCampanhaAcao, salvarAjustesAcao } from "./acoes";
import { FormularioAventura, FormularioCampanha, FormularioDuplicar, FormularioExcluir, FormularioPin } from "./formularios";
import { Icone } from "@/components/icones";

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
  // só a parte pública da aventura aparece aqui: o roteiro continua sendo segredo do mestre
  const aventura = aventuraDoSistema(campanha.config.aventura, campanha.sistema);

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

      {aventura && (
        <Secao titulo="Aventura em andamento">
          <p className="titulo text-lg text-ambar"><Icone nome="scroll" />  {aventura.titulo}</p>
          <p className="mt-1 text-sm text-foreground/90">{aventura.chamada}</p>
          <p className="mt-1 text-xs text-muted">
            {[aventura.duracao, aventura.recomendado, aventura.tom].filter(Boolean).join(" · ")}
          </p>
          <p className="mb-3 mt-3 text-sm text-muted">
            O mestre conduz com um roteiro secreto (NPCs, pistas, reviravoltas e finais possíveis) e improvisa em cima do que vocês fazem. Se preferir
            que a história siga totalmente livre daqui em diante, desligue o roteiro.
          </p>
          <FormularioAventura acao={desligarAventuraAcao.bind(null, campanha.id)} bloqueado={!local} />
        </Secao>
      )}

      <Secao titulo="Grupo">
        {grupo.length ? (
          <ul className="mb-3 divide-y divide-border/60 rounded-md border border-border/70">
            {grupo.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-pergaminho">{p.ficha.nome}</span>
                  {p.jogador && <span className="text-muted"> · {p.jogador}</span>}
                </span>
                {/* nome, história e a parte narrativa da ficha; pela rede, só o dono salva (a ação confere) */}
                <Link href={`/mesa/${campanha.id}/personagens/${p.id}/editar`} className="shrink-0 py-1 text-xs text-ambar hover:underline">
                  ✐ editar
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mb-3 text-sm text-muted">
          {grupo.length ? "" : "Ninguém sentado ainda. "}O “editar” muda nome, história e o que o mestre lê de cada um, sem mexer nos números. Para tirar
          alguém, use a aba Grupo da mesa.
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

      <Secao titulo="Duplicar campanha">
        <p className="mb-3 text-sm text-muted">
          Uma mesa boa vira molde para a próxima noite: a cópia nasce com o mesmo cenário, tom, estilo do mestre e grupo (fichas descansadas), sem o chat
          nem o PIN. Para levar só um personagem para outra mesa, use “Trazer um personagem de outra mesa” na criação avançada.
        </p>
        <FormularioDuplicar acao={duplicarCampanhaAcao.bind(null, campanha.id)} nome={campanha.nome} personagens={grupo.map((p) => p.ficha.nome)} bloqueado={!local} />
      </Secao>

      <Secao titulo="Exportar e cópias">
        <p className="mb-3 text-sm text-muted">
          Leve esta campanha para outro computador num arquivo só: fichas, anotações, chat, diário e fatos (sem o PIN). Na outra taverna, importe pela
          página Cópias e lixeira, que também guarda uma cópia do banco por dia e as campanhas excluídas.
        </p>
        {local ? (
          <div className="flex flex-wrap gap-2">
            <a href={`/api/campanhas/${campanha.id}/exportar`} download className="btn-borda">
              Exportar campanha
            </a>
            <Link href="/backup" className="btn-borda">
              Cópias e lixeira
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">Só na máquina da taverna.</p>
        )}
      </Secao>

      <Secao titulo="Excluir campanha" perigo>
        <FormularioExcluir acao={excluirCampanhaAcao.bind(null, campanha.id)} nome={campanha.nome} bloqueado={!local} />
      </Secao>
    </main>
  );
}
