import Link from "next/link";
import { aventuraTutorial, aventurasPublicas } from "@/lib/aventuras";
import { listarCampanhas, listarDiario, listarMensagens, listarPersonagens, type Campanha, type Personagem } from "@/lib/db";
import { contarMissoes } from "@/lib/progresso-missoes";
import { resumoDasNoites, type ResumoNoites } from "@/lib/mesa";
import { lerAjustesMestre, provedorAtual } from "@/lib/mestre";
import { obterSistema } from "@/lib/sistemas";
import { dadosDoTema, temaDoSistema } from "@/lib/temas";
import { excluirCampanhaAcao } from "./acoes-campanha";
import { BotaoExcluir } from "./botao-excluir";
import { Icone } from "@/components/icones";
import { CapaAventura } from "@/components/aventuras/capa-aventura";
import { linkDaAventura } from "@/lib/aventuras/link";
import { matizDaCampanha, matizDaPosicao } from "@/lib/inicio/matiz-campanha";
import { BotaoJogarAgora } from "@/components/inicio/botao-jogar-agora";
import { FaixaHerois } from "@/components/inicio/faixa-herois";
import { JogadaExemplo } from "@/components/inicio/jogada-exemplo";
import { PerguntasFrequentes } from "@/components/inicio/perguntas-frequentes";
import { PortasDeEntrada } from "@/components/inicio/portas-de-entrada";
import { jogarAgoraAcao } from "./nova/jogar-agora-acoes";

export const dynamic = "force-dynamic";

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** O SQLite grava em UTC sem fuso ("2026-10-25 14:03:00"). */
const dataDoBanco = (dataSqlite: string) => new Date(dataSqlite.replace(" ", "T") + "Z");

/** "há 3 horas", "ontem"... */
function haQuanto(dataSqlite: string): string {
  const seg = Math.round((dataDoBanco(dataSqlite).getTime() - Date.now()) / 1000);
  const passos: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ];
  let valor = seg;
  for (const [unidade, tamanho] of passos) {
    if (Math.abs(valor) < tamanho) return unidade === "second" ? "agora há pouco" : relativo.format(valor, unidade);
    valor = Math.round(valor / tamanho);
  }
  return relativo.format(valor, "year");
}

/** Último parágrafo do mestre, sem a marcação de ênfase: é "onde a história parou". */
function ondeParou(campanhaId: number): string | null {
  const fala = listarMensagens(campanhaId, 12).findLast((m) => m.tipo === "mestre" && m.texto.trim());
  if (!fala) return null;
  const paragrafos = fala.texto
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[*_#>`]+/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const ultimo = paragrafos.at(-1) ?? "";
  // parágrafo curtinho ("— E aí?") sozinho não diz nada: junta com o anterior
  const texto = ultimo.length < 120 && paragrafos.length > 1 ? `${paragrafos.at(-2)} ${ultimo}` : ultimo;
  return texto.length > 420 ? `…${texto.slice(-420).replace(/^\S*\s/, "")}` : texto;
}

function corDaVida(pv: number, max: number) {
  const f = max > 0 ? pv / max : 0;
  return f > 0.5 ? "bg-musgo" : f > 0.25 ? "bg-ambar" : "bg-sangue";
}

type CampanhaListada = Omit<Campanha, "sistema"> & { sistema: ReturnType<typeof obterSistema>; personagens: Personagem[]; noites: ResumoNoites };

/** Plaquinhas do cartão: sistema (o modo história já é o próprio "sistema"), modo de jogo, rodada e PIN. */
function Etiquetas({ c }: { c: CampanhaListada }) {
  const historia = (c.config.modoJogo ?? "avancado") === "historia";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {c.sistema.id !== "historia" && (
        <span className="etiqueta-matiz" title={dadosDoTema(c.sistema.id).nome}>
          <span aria-hidden>{dadosDoTema(c.sistema.id).ornamento}</span> {c.sistema.nomeCurto}
        </span>
      )}
      {historia ? (
        <span className="etiqueta" title="Mesa em estilo de livro: ações sugeridas e você rola os dados na tela">
          <Icone nome="scroll" /> Modo história
        </span>
      ) : (
        <span className="etiqueta" title="Ficha completa e mesa com painéis">
          <Icone nome="shield" /> Modo avançado
        </span>
      )}
      {c.config.modo === "rodada" && (
        <span className="etiqueta" title="O mestre espera todo mundo declarar a ação antes de narrar">
          Por rodada
        </span>
      )}
      {c.config.pin && (
        <span className="etiqueta" title="Quem entra pela rede precisa do PIN">
          <Icone nome="lock" /> PIN
        </span>
      )}
    </div>
  );
}

function LinhaPersonagem({ p, nomeClasse }: { p: Personagem; nomeClasse: string }) {
  const { pv, pvMax } = p.ficha;
  const largura = pvMax > 0 ? Math.max(0, Math.min(100, (pv / pvMax) * 100)) : 0;
  return (
    <li className="text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-foreground">
          {p.ficha.nome}
          <span className="text-muted">
            {" "}
            · {nomeClasse} {p.ficha.nivel}
          </span>
        </span>
        <span className={`shrink-0 text-xs tabular-nums ${pv <= 0 ? "text-sangue" : "text-muted"}`}>
          {pvMax > 0 ? (
            <>
              <span className="sr-only">Vida </span>
              {pv}/{pvMax}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
      {pvMax > 0 && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className={`h-full ${corDaVida(pv, pvMax)}`} style={{ width: `${largura}%` }} />
        </div>
      )}
    </li>
  );
}

const nomeDaClasse = (c: CampanhaListada, p: Personagem) => c.sistema.classes.find((k) => k.id === p.ficha.classe)?.nome ?? c.sistema.rotulos.classe;

/** Cartão grande da campanha jogada por último, com o fim da última fala do mestre. */
function Continuar({ c }: { c: CampanhaListada }) {
  const trecho = ondeParou(c.id);
  const herois = c.personagens.map((p) => p.ficha.nome).filter(Boolean);
  const missoes = contarMissoes(listarDiario(c.id));
  const noite = c.noites.ultima?.numero;
  const feitas = missoes.total > 0 ? Math.round((missoes.concluidas / missoes.total) * 100) : 0;
  const textoMissoes = `${missoes.concluidas} de ${missoes.total} ${missoes.total === 1 ? "missão concluída" : "missões concluídas"}`;
  return (
    <section
      aria-labelledby="continuar-titulo"
      data-tema={temaDoSistema(c.sistema.id)}
      className="cartao cartao-tema relative overflow-hidden border-2 border-ambar/70 p-5 shadow-[0_0_50px_-24px_var(--ambar)] sm:p-6"
    >
      {/* brilho de vela atrás do cartão */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-ambar/10 blur-3xl" />
      <p className="text-xs uppercase tracking-[0.18em] text-ambar-forte">Onde vocês pararam · {haQuanto(c.atualizadaEm)}</p>
      <h2 id="continuar-titulo" className="titulo titulo-brilho mt-1 text-2xl leading-tight text-pergaminho sm:text-3xl">
        {c.nome}
      </h2>
      <div className="mt-2">
        <Etiquetas c={c} />
      </div>
      {herois.length > 0 && <p className="mt-3 truncate text-sm text-muted">Com {herois.join(", ")}</p>}
      {(noite != null || missoes.total > 0) && (
        <div className="mt-3 text-xs text-muted">
          <p>
            {noite != null && <span className="text-foreground/90">Noite {noite}</span>}
            {noite != null && missoes.total > 0 && " · "}
            {missoes.total > 0 && textoMissoes}
          </p>
          {/* com nada concluído a barra vazia só parece defeito: o texto de cima já conta */}
          {feitas > 0 && (
            <div
              role="progressbar"
              aria-label="Missões concluídas"
              aria-valuemin={0}
              aria-valuemax={missoes.total}
              aria-valuenow={missoes.concluidas}
              aria-valuetext={textoMissoes}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full border border-border/60 bg-surface-2"
            >
              <div className="h-full bg-ambar" style={{ width: `${feitas}%` }} />
            </div>
          )}
        </div>
      )}
      {trecho ? (
        <blockquote className="mt-3 line-clamp-4 border-l-2 border-ambar-forte/60 pl-3 text-[15px] italic leading-relaxed text-foreground/90">
          {trecho}
        </blockquote>
      ) : (
        c.cenario && <p className="mt-3 line-clamp-3 text-sm text-muted">{c.cenario}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={`/mesa/${c.id}`} className="btn-palco min-h-11 basis-full whitespace-nowrap sm:basis-auto sm:px-8">
          Continuar a história
        </Link>
        <Link href={`/mesa/${c.id}/ajustes`} className="btn-borda min-h-11 px-4">
          Ajustes
        </Link>
        <Link href={`/mesa/${c.id}/livro`} className="inline-flex min-h-10 items-center gap-1 rounded-sm px-1 text-sm text-muted hover:text-ambar sm:min-h-8" title="Livro da campanha: reler, imprimir ou baixar">
          <Icone nome="scroll" /> Livro
        </Link>
        <form action={excluirCampanhaAcao} className="ml-auto text-sm">
          <input type="hidden" name="id" value={c.id} />
          <BotaoExcluir nome={c.nome} />
        </form>
      </div>
    </section>
  );
}

/** Cartão da grade: o título estica o link sobre o cartão inteiro; os botões ficam por cima dele (relative z-10). */
function CartaoCampanha({ c }: { c: CampanhaListada }) {
  return (
    <li data-tema={temaDoSistema(c.sistema.id)} className={`cartao cartao-tema cartao-matiz cartao-clicavel relative flex flex-col p-5 ${matizDaCampanha(c.id, c.sistema.id)}`}>
      {/* as plaquinhas ficam por cima do link esticado para a dica (title) continuar aparecendo */}
      <div className="relative z-10 w-fit">
        <Etiquetas c={c} />
      </div>
      <h3 className="titulo mt-2 text-xl text-pergaminho">
        <Link href={`/mesa/${c.id}`} className="rounded-sm after:absolute after:inset-0 after:rounded-xl hover:text-ambar focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ambar">
          {c.nome}
        </Link>
      </h3>
      {c.cenario ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted">{c.cenario}</p>
      ) : (
        <p className="mt-1 text-sm italic text-muted">Sem cenário anotado. O mestre improvisa.</p>
      )}

      <div className="mt-3">
        {c.personagens.length ? (
          <ul className="space-y-2" aria-label="Personagens">
            {c.personagens.map((p) => (
              <LinhaPersonagem key={p.id} p={p} nomeClasse={nomeDaClasse(c, p)} />
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-muted">Ninguém sentou ainda.</p>
        )}
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-4">
        <Link href={`/mesa/${c.id}`} className="btn-borda min-h-10 flex-1 gap-1.5 px-3 py-2" aria-label={`Entrar em ${c.nome}`}>
          Entrar <Icone nome="arrowRight" />
        </Link>
        <Link href={`/mesa/${c.id}/ajustes`} className="btn-borda min-h-10 px-3 py-2">
          Ajustes
        </Link>
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-x-2 border-t border-border pt-2 text-xs text-muted">
        {c.noites.quantas && c.noites.ultima ? (
          <span title={`Última jogada: ${dataDoBanco(c.noites.ultima.fim).toLocaleString("pt-BR")}`}>
            {c.noites.quantas} {c.noites.quantas === 1 ? "noite" : "noites"} · última jogada {haQuanto(c.noites.ultima.fim)}
          </span>
        ) : (
          <span title={dataDoBanco(c.atualizadaEm).toLocaleString("pt-BR")}>Última jogada: {haQuanto(c.atualizadaEm)}</span>
        )}
        <Link
          href={`/mesa/${c.id}/livro`}
          className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-sm px-1 hover:text-ambar sm:min-h-8"
          title="Livro da campanha: reler, imprimir ou baixar"
        >
          <Icone nome="scroll" /> Livro
        </Link>
        <form action={excluirCampanhaAcao}>
          <input type="hidden" name="id" value={c.id} />
          <BotaoExcluir nome={c.nome} />
        </form>
      </div>
    </li>
  );
}

/** Quantas campanhas a grade mostra antes de guardar o resto no "Ver as outras". */
const CAMPANHAS_A_VISTA = 6;
/** Com resto guardado, uma vaga da grade fica para o "Abrir outra mesa": seis células fecham as linhas (2 ou 3 colunas). */
const campanhasAVista = (total: number) => (total > CAMPANHAS_A_VISTA ? CAMPANHAS_A_VISTA - 1 : CAMPANHAS_A_VISTA);

/** "Quem está mestrando" em uma linha: cabe embaixo dos botões sem empurrar as campanhas no celular. */
function MestreCompacto({ nome, aviso }: { nome: string; aviso: string }) {
  return (
    <div className="mt-5 max-w-xl border-l-2 border-border pl-3 text-sm text-muted">
      <p className="flex flex-wrap items-center gap-x-3">
        <span>
          Mestrando: <span className="text-ambar">{nome}</span>
        </span>
        <Link href="/config" className="inline-flex min-h-10 items-center gap-1 text-ambar underline-offset-4 hover:underline sm:min-h-0">
          Trocar o mestre <Icone nome="arrowRight" />
        </Link>
      </p>
      <p className="text-xs">{aviso}</p>
    </div>
  );
}

/** Faixa discreta de aventuras prontas: cartões pequenos com o tema de cada sistema, rolando de lado. */
function AventurasProntas() {
  // o modo história (o padrão) vem primeiro; o resto na ordem do catálogo de aventuras
  const lista = aventurasPublicas().sort((a, b) => Number(b.sistemas[0] === "historia") - Number(a.sistemas[0] === "historia"));
  return (
    <section className="mt-12" aria-labelledby="aventuras-titulo">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id="aventuras-titulo" className="titulo text-2xl text-pergaminho">
          Aventuras prontas
        </h2>
        <Link href="/aventuras" className="inline-flex min-h-11 items-center text-sm text-ambar hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar">
          Ver todas as {lista.length} aventuras <Icone nome="arrowRight" className="ml-1" />
        </Link>
        <p className="basis-full text-sm text-muted">Sem ideia? Escolha uma: o mestre já chega com o roteiro decorado (e com os segredos que você não vai ler).</p>
      </div>
      {/* celular: carrossel com a borda direita sumindo (tem mais para o lado); sm+: grade com as quatro primeiras */}
      <ul
        className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 max-sm:pr-10 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        aria-label="Aventuras prontas"
      >
        {lista.map((a, i) => {
          const sistema = a.sistemas[0];
          const tema = dadosDoTema(sistema);
          return (
            <li key={a.id} className={`w-60 shrink-0 snap-start sm:w-auto ${i >= 4 ? "sm:hidden" : ""}`}>
              <Link
                href={linkDaAventura(a)}
                data-tema={temaDoSistema(sistema)}
                className={`cartao cartao-tema group relative flex h-full flex-col overflow-hidden cartao-matiz cartao-clicavel ${sistema === "historia" ? matizDaPosicao(i) : ""}`}
              >
                {/* a capa é 2:1; na grade de duas colunas o cartão é largo e o teto de 96px cortava a silhueta pela metade */}
                <CapaAventura id={a.id} sistema={sistema} className="max-h-24 sm:max-h-36 lg:max-h-24" />
                {a.tutorial && <span className="fita-destaque">Comece por aqui</span>}
                <span className="flex flex-1 flex-col p-4">
                <span className="etiqueta w-fit text-ambar-forte">
                  <span aria-hidden>{sistema === "historia" ? <Icone nome="scroll" /> : tema.ornamento}</span> {sistema === "historia" ? "Modo história" : obterSistema(sistema).nomeCurto}
                </span>
                <span className="titulo mt-2 text-lg leading-tight text-pergaminho group-hover:text-ambar">{a.titulo}</span>
                <span className="mt-1 line-clamp-3 text-xs leading-snug text-muted">{a.chamada}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs text-muted/80">
                  <span>{a.duracao}</span>
                  {a.soloOk && (
                    <span className="etiqueta-matiz matiz-2" title="Roda com um personagem só: um aliado do mestre divide as cenas">
                      solo ok
                    </span>
                  )}
                </span>
                {/* na tutorial a fita "Comece por aqui" já diz isso */}
                {!a.tutorial && a.recomendado && <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted/70">{a.recomendado}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3">
        <Link href="/aventuras" className="btn-borda min-h-11 w-full gap-1.5 sm:w-auto">
          Ver todas as {lista.length} aventuras <Icone nome="arrowRight" />
        </Link>
      </p>
    </section>
  );
}

export default async function Inicio(props: PageProps<"/">) {
  const { falhou } = await props.searchParams;
  // listarCampanhas já vem da jogada mais recente para a mais antiga
  const campanhas: CampanhaListada[] = listarCampanhas().map((c) => ({
    ...c,
    sistema: obterSistema(c.sistema),
    personagens: listarPersonagens(c.id),
    noites: resumoDasNoites(c.id),
  }));
  const provedor = provedorAtual();
  const configurado = Boolean(lerAjustesMestre().provedor);
  const aviso =
    provedor.id === "falso"
      ? "Mestre de teste: sem IA, só para conferir a mesa. Troque quando for jogar de verdade."
      : provedor.id === "api"
        ? "Cada turno gasta créditos da API."
        : "Sai do limite do seu plano do Claude, sem cobrança extra.";
  const recente = campanhas[0];
  // a campanha em destaque não se repete na grade: o palco de cima já é ela
  const outras = recente ? campanhas.slice(1) : campanhas;
  const aVista = campanhasAVista(outras.length);
  // quando há resto, ele tem pelo menos duas campanhas (o plural do "Ver as outras" é sempre certo)
  const guardadas = outras.length - aVista;
  // primeira visita (nenhuma campanha): a aventura-tutorial ganha um cartão de destaque
  const tutorial = campanhas.length === 0 ? aventuraTutorial() : null;
  const modoAvancado = (
    <Link
      href="/nova/avancada"
      className="inline-flex min-h-11 items-center gap-1 px-1 text-sm text-ambar underline-offset-4 hover:underline"
      title="Escolha o sistema de regras (D&D, Pathfinder, Vampiro...) e monte a ficha completa"
    >
      Modo avançado <Icone nome="arrowRight" />
    </Link>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      {falhou === "jogar-agora" && (
        <p role="alert" className="mb-6 rounded-xl border border-sangue bg-surface px-4 py-3 text-sm text-foreground">
          A taverna tropeçou ao abrir sua mesa (o banco não colaborou). Tente de novo ou{" "}
          <Link href="/nova" className="text-ambar underline underline-offset-4">
            monte o herói à mão
          </Link>
          .
        </p>
      )}
      <section className={`ceu-topo grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-center ${recente ? "mb-10" : "mb-12"}`}>
        <div>
          <h1 className="titulo leading-none">
            <span className="block text-3xl text-pergaminho sm:text-4xl">Puxe um banco.</span>
            <span className="titulo-brilho mt-1.5 block text-4xl tracking-tight text-ambar sm:mt-2 sm:text-6xl">O mestre já está bêbado.</span>
          </h1>
          <p className="mt-3 text-lg font-semibold text-foreground">Um RPG de mesa inteiro, com mestre de IA, rodando aí na sua máquina.</p>
          {/* quem já tem campanha não precisa do discurso de boas-vindas no celular */}
          <p className={`mt-4 max-w-xl text-base text-muted ${recente ? "hidden sm:block" : ""}`}>
            Arrombe a cripta errada, pechinche com um goblin ofendido, caia de um telhado por pura vaidade. Um mestre de IA narra, o
            código rola os dados, e a campanha fica guardada aqui na sua máquina. Sozinho ou com a turma.
          </p>
          {recente ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/nova" className="btn-borda min-h-11 gap-1.5">
                <Icone nome="pencil" /> Nova história
              </Link>
              <form action={jogarAgoraAcao}>
                <BotaoJogarAgora className="btn-borda min-h-11 gap-1.5">
                  <Icone nome="dice" /> Jogar agora com herói pronto
                </BotaoJogarAgora>
              </form>
              {modoAvancado}
            </div>
          ) : (
            <div className="mt-6">
              {/* um só botão principal: herói e aventura saem prontos */}
              <form action={jogarAgoraAcao}>
                <BotaoJogarAgora>Jogar agora</BotaoJogarAgora>
              </form>
              <p className="mt-2 max-w-xl text-xs text-muted">
                Começa em segundos. Sem cadastro, sem ficha, sem boleto: o mestre te entrega um herói e uma encrenca.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href="/nova" className="btn-borda min-h-11">
                  Montar meu herói
                </Link>
                {modoAvancado}
              </div>
            </div>
          )}
          {recente && <MestreCompacto nome={provedor.nome} aviso={`${aviso}${!configurado ? " (padrão da instalação)" : ""}`} />}
        </div>

        {recente ? (
          <Continuar c={recente} />
        ) : (
          <div className="cartao p-5 text-sm text-muted">
            <p className="titulo mb-2 text-base text-pergaminho">Quem está mestrando</p>
            <p className="text-ambar">{provedor.nome}</p>
            <p className="mt-2">
              {aviso}
              {!configurado && " (padrão da instalação)"}
            </p>
            <Link href="/config" className="mt-1 inline-flex min-h-10 items-center gap-1 text-ambar underline-offset-4 hover:underline">
              Trocar o mestre <Icone nome="arrowRight" />
            </Link>
          </div>
        )}
      </section>

      {!recente && <FaixaHerois />}

      <h2 className="titulo mb-4 text-2xl text-pergaminho">
        {recente && outras.length > 0 ? "Outras campanhas" : "Campanhas"}{" "}
        {outras.length > 1 && <span className="text-base text-muted">({outras.length})</span>}
      </h2>

      {campanhas.length === 0 ? (
        <>
        <div className="cartao relative overflow-hidden px-6 py-10 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-24 mx-auto size-64 rounded-full bg-ambar/10 blur-3xl" />
          <p className="text-5xl" aria-hidden><Icone nome="candle" /> 
          </p>
          <p className="titulo mt-3 text-2xl text-pergaminho">A taverna está vazia</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Nenhuma campanha ainda. As cadeiras estão em cima das mesas e o mestre já tá conversando com a caneca.
          </p>
        </div>
        <PortasDeEntrada
          tutorial={tutorial ? { titulo: tutorial.titulo, href: linkDaAventura(tutorial) } : null}
          jogarAgora={
            <form action={jogarAgoraAcao}>
              {tutorial && <input type="hidden" name="aventura" value={tutorial.id} />}
              <BotaoJogarAgora className="btn-ambar min-h-11 w-full">Jogar agora</BotaoJogarAgora>
            </form>
          }
        />
        </>
      ) : outras.length === 0 ? (
        <p className="cartao px-5 py-6 text-center text-sm text-muted">
          Só essa campanha por enquanto. Continue nela ou{" "}
          <Link href="/nova" className="text-ambar underline-offset-4 hover:underline">
            comece outra
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outras.slice(0, aVista).map((c) => (
              <CartaoCampanha key={c.id} c={c} />
            ))}
            <li className="flex">
              <Link
                href="/nova"
                className="cartao-clicavel flex min-h-24 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-5 text-center text-muted hover:text-ambar"
              >
                <Icone nome="plus" className="text-2xl" />
                <span className="titulo text-lg">Abrir outra mesa</span>
                <span className="text-xs">Tem banco sobrando.</span>
              </Link>
            </li>
          </ul>
          {guardadas > 0 && (
            <details className="group mt-4">
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-sm text-sm text-ambar underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Ver as outras {guardadas} campanhas</span>
                <span className="hidden group-open:inline">Recolher as outras {guardadas} campanhas</span>
                <Icone nome="chevronDown" className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {outras.slice(aVista).map((c) => (
                  <CartaoCampanha key={c.id} c={c} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {recente ? (
        <FaixaHerois compacta />
      ) : (
        <JogadaExemplo>
          <form action={jogarAgoraAcao}>
            <BotaoJogarAgora className="btn-ambar size-11 shrink-0 p-0" espera={null} rotulo="Começar a jogar">
              <Icone nome="arrowRight" />
            </BotaoJogarAgora>
          </form>
        </JogadaExemplo>
      )}

      <AventurasProntas />

      <section id="amigos" className="mt-14 scroll-mt-20" aria-labelledby="amigos-titulo">
        <h2 id="amigos-titulo" className="titulo mb-4 text-2xl text-pergaminho">Como jogar com amigos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="cartao cartao-matiz matiz-1 p-5">
            <h3 className="titulo text-lg texto-matiz">Mesa local: um computador, vários heróis</h3>
            <p className="mt-2 text-sm text-muted">
              Crie um personagem para cada um na mesma campanha e passe o teclado. Na mesa, o seletor de personagem diz quem está agindo;
              no modo <em>por rodada</em> o mestre espera todo mundo declarar antes de narrar. Ideal para o sofá e a pizza.
            </p>
          </div>
          <div className="cartao cartao-matiz matiz-6 p-5">
            <h3 className="titulo text-lg texto-matiz">Rede local: cada um no seu celular</h3>
            <p className="mt-2 text-sm text-muted">
              Rode <code className="text-foreground">npm run rede</code>, abra a mesa e toque em <strong className="text-foreground">Convidar</strong>:
              aparece o link e o QR code para a turma no mesmo Wi-Fi. Cada um reivindica o próprio personagem. Ponha um PIN nos ajustes da
              mesa se o Wi-Fi for de condomínio. Pela rede só as mesas abrem; campanhas e configurações ficam nesta máquina.
            </p>
            <p className="mt-2 text-xs text-muted">No Windows, libere a porta 3300 no firewall na primeira vez (o README explica).</p>
          </div>
        </div>
      </section>

      <PerguntasFrequentes provedor={provedor.id} />
    </main>
  );
}
