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
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FaixaAviso } from "@/components/faixa-aviso";
import { LinkVoltar } from "@/components/link-voltar";
import { SecaoCartao } from "@/components/secao-cartao";

// Ajustes da mesa: nome, cenário, tom, modo (livre/rodada), dados, estilo do mestre, PIN da rede e exclusão.
// Pela rede a página abre só para leitura; quem manda no salão é a máquina da taverna.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/ajustes">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Ajustes · ${c.nome}` : "Porta errada" };
}

// atalhos para as seções: a página é comprida e o que se procura quase sempre está lá embaixo
const ANCORAS = [
  { href: "#campanha", rotulo: "Campanha", matiz: "matiz-7" },
  { href: "#grupo", rotulo: "Grupo", matiz: "matiz-1" },
  { href: "#pin", rotulo: "PIN", matiz: "matiz-1" },
  { href: "#copias", rotulo: "Duplicar", matiz: "matiz-6" },
  { href: "#exportar", rotulo: "Exportar", matiz: "matiz-6" },
  { href: "#excluir", rotulo: "Excluir", matiz: "matiz-4" },
];

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
  // a recomendação some na aventura-tutorial e quando a chamada já diz a mesma coisa
  const recomendado =
    aventura?.recomendado && !aventura.tutorial && !aventura.chamada.toLowerCase().includes(aventura.recomendado.toLowerCase()) ? aventura.recomendado : null;

  return (
    <main
      data-tema={temaDoSistema(campanha.sistema)}
      className="mx-auto max-w-3xl space-y-6 px-4 py-8 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ambar">
      <TemaPagina tema={temaDoSistema(campanha.sistema)} />
      <div>
        <LinkVoltar href={`/mesa/${campanha.id}`}>Voltar para a mesa</LinkVoltar>
        <CabecalhoPagina
          className="mt-1 mb-0!"
          sobrelinha={campanha.nome}
          titulo="Ajustes da mesa"
          subtitulo={
            <>
              {sistema.id === "historia" ? "Modo história" : sistema.nome} · {grupo.length} {grupo.length === 1 ? "personagem" : "personagens"} · criada em{" "}
              {new Date(campanha.criadaEm + "Z").toLocaleDateString("pt-BR")}
            </>
          }
        />
        <nav aria-label="Seções dos ajustes" className="mt-4 flex flex-wrap gap-2">
          {ANCORAS.map((a) => (
            <a key={a.href} href={a.href} className={`etiqueta-matiz ${a.matiz} min-h-10 px-3 hover:brightness-125`}>
              {a.rotulo}
            </a>
          ))}
        </nav>
      </div>

      {!local && (
        <FaixaAviso tom="alerta" icone="lock">
          Você está pela rede. Dá para olhar, mas só a máquina da taverna muda os ajustes. Peça para quem está nela.
        </FaixaAviso>
      )}

      <SecaoCartao id="campanha" titulo="Campanha" icone="gear" matiz="matiz-7">
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
      </SecaoCartao>

      {aventura && (
        <SecaoCartao id="aventura" titulo="Aventura em andamento" icone="scroll" matiz="matiz-7">
          <p className="titulo text-lg text-ambar">{aventura.titulo}</p>
          <p className="mt-1 text-sm text-foreground/90">{aventura.chamada}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="etiqueta">{aventura.duracao}</span>
            {recomendado && <span className="etiqueta">{recomendado}</span>}
            {aventura.tom && <span className="etiqueta">{aventura.tom}</span>}
          </p>
          <p className="mb-3 mt-3 text-sm text-muted">
            O mestre conduz com um roteiro secreto (NPCs, pistas, reviravoltas e finais possíveis) e improvisa em cima do que vocês fazem. Se preferir
            que a história siga totalmente livre daqui em diante, desligue o roteiro.
          </p>
          <FormularioAventura acao={desligarAventuraAcao.bind(null, campanha.id)} bloqueado={!local} />
        </SecaoCartao>
      )}

      <SecaoCartao id="grupo" titulo="Grupo" icone="person" matiz="matiz-1">
        {grupo.length ? (
          <ul className="mb-3 divide-y divide-border/60 rounded-md border border-border/70">
            {grupo.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    <span className="text-pergaminho">{p.ficha.nome}</span>
                    {p.jogador && <span className="text-muted"> · {p.jogador}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[sistema.classes.find((c) => c.id === p.ficha.classe)?.nome, `${sistema.rotulos.nivel} ${p.ficha.nivel}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {/* nome, história e a parte narrativa da ficha; pela rede, só o dono salva (a ação confere) */}
                <Link href={`/mesa/${campanha.id}/personagens/${p.id}/editar`} className="btn-borda min-h-10 shrink-0 px-3 py-1 text-xs">
                  <Icone nome="pencil" /> Editar
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mb-3 text-sm text-muted">
          {grupo.length ? "" : "Ninguém sentado ainda. "}O “Editar” muda nome, história e o que o mestre lê de cada um, sem mexer nos números. Para tirar
          alguém, use a aba Grupo da mesa.
        </p>
        <Link href={`/mesa/${campanha.id}/personagens/novo`} className="btn-borda">
          + Adicionar personagem
        </Link>
      </SecaoCartao>

      <SecaoCartao id="pin" titulo="PIN da rede local" icone="lock" matiz="matiz-1">
        <p className="mb-3 text-sm text-muted">
          Quem entra pelo celular ou por outro computador da casa digita o PIN uma vez. Esta máquina nunca precisa dele.
        </p>
        {/* o PIN em si só vai para a página quando ela está aberta na própria máquina */}
        <FormularioPin campanhaId={campanha.id} temPin={Boolean(campanha.config.pin)} pinAtual={local ? (campanha.config.pin ?? null) : null} bloqueado={!local} />
      </SecaoCartao>

      <SecaoCartao id="copias" titulo="Duplicar campanha" icone="book" matiz="matiz-6">
        <p className="mb-3 text-sm text-muted">
          Uma mesa boa vira molde para a próxima noite: a cópia nasce com o mesmo cenário, tom, estilo do mestre e grupo (fichas descansadas), sem o chat
          nem o PIN. Para levar só um personagem para outra mesa, use “Trazer um personagem de outra mesa” na criação avançada.
        </p>
        <FormularioDuplicar acao={duplicarCampanhaAcao.bind(null, campanha.id)} nome={campanha.nome} personagens={grupo.map((p) => p.ficha.nome)} bloqueado={!local} />
      </SecaoCartao>

      <SecaoCartao id="exportar" titulo="Exportar e cópias" icone="download" matiz="matiz-6">
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
      </SecaoCartao>

      <SecaoCartao id="excluir" titulo="Excluir campanha" icone="skull" perigo>
        <FormularioExcluir acao={excluirCampanhaAcao.bind(null, campanha.id)} nome={campanha.nome} bloqueado={!local} />
      </SecaoCartao>
    </main>
  );
}
