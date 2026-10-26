import Link from "next/link";
import { listarCampanhas, listarMensagens, listarPersonagens, type Campanha, type Personagem } from "@/lib/db";
import { lerAjustesMestre, provedorAtual } from "@/lib/mestre";
import { obterSistema } from "@/lib/sistemas";
import { excluirCampanhaAcao } from "./acoes-campanha";
import { BotaoExcluir } from "./botao-excluir";

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

type CampanhaListada = Omit<Campanha, "sistema"> & { sistema: ReturnType<typeof obterSistema>; personagens: Personagem[] };

/** Plaquinhas do cartão: sistema (o modo história já é o próprio "sistema"), modo de jogo, rodada e PIN. */
function Etiquetas({ c }: { c: CampanhaListada }) {
  const historia = (c.config.modoJogo ?? "avancado") === "historia";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {c.sistema.id !== "historia" && <span className="etiqueta text-ambar-forte">{c.sistema.nomeCurto}</span>}
      {historia ? (
        <span className="etiqueta" title="Mesa em estilo de livro: ações sugeridas e você rola os dados na tela">
          Modo história
        </span>
      ) : (
        <span className="etiqueta" title="Ficha completa e mesa com painéis">
          Modo avançado
        </span>
      )}
      {c.config.modo === "rodada" && (
        <span className="etiqueta" title="O mestre espera todo mundo declarar a ação antes de narrar">
          Por rodada
        </span>
      )}
      {c.config.pin && (
        <span className="etiqueta" title="Quem entra pela rede precisa do PIN">
          🔒 PIN
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
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
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
  return (
    <section aria-labelledby="continuar-titulo" className="cartao relative overflow-hidden border-ambar-forte/60 p-5 sm:p-6">
      {/* brilho de vela atrás do cartão */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-ambar/10 blur-3xl" />
      <p className="text-xs uppercase tracking-[0.18em] text-ambar-forte">Onde vocês pararam · {haQuanto(c.atualizadaEm)}</p>
      <h2 id="continuar-titulo" className="titulo mt-1 text-2xl leading-tight text-pergaminho sm:text-3xl">
        {c.nome}
      </h2>
      <div className="mt-2">
        <Etiquetas c={c} />
      </div>
      {herois.length > 0 && <p className="mt-3 truncate text-sm text-muted">Com {herois.join(", ")}</p>}
      {trecho ? (
        <blockquote className="mt-3 line-clamp-4 border-l-2 border-ambar-forte/60 pl-3 text-[15px] italic leading-relaxed text-foreground/90">
          {trecho}
        </blockquote>
      ) : (
        c.cenario && <p className="mt-3 line-clamp-3 text-sm text-muted">{c.cenario}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/mesa/${c.id}`} className="btn-ambar min-h-11 flex-1 sm:flex-none sm:px-8">
          Continuar a história
        </Link>
        <Link href={`/mesa/${c.id}/ajustes`} className="btn-borda min-h-11 px-4">
          Ajustes
        </Link>
      </div>
    </section>
  );
}

/** "Quem está mestrando" em uma linha: cabe embaixo dos botões sem empurrar as campanhas no celular. */
function MestreCompacto({ nome, aviso }: { nome: string; aviso: string }) {
  return (
    <div className="mt-5 max-w-xl border-l-2 border-border pl-3 text-sm text-muted">
      <p className="flex flex-wrap items-center gap-x-3">
        <span>
          Mestrando: <span className="text-ambar">{nome}</span>
        </span>
        <Link href="/config" className="inline-flex min-h-10 items-center text-ambar underline-offset-4 hover:underline sm:min-h-0">
          Trocar o mestre →
        </Link>
      </p>
      <p className="text-xs">{aviso}</p>
    </div>
  );
}

export default function Inicio() {
  // listarCampanhas já vem da jogada mais recente para a mais antiga
  const campanhas: CampanhaListada[] = listarCampanhas().map((c) => ({ ...c, sistema: obterSistema(c.sistema), personagens: listarPersonagens(c.id) }));
  const provedor = provedorAtual();
  const configurado = Boolean(lerAjustesMestre().provedor);
  const aviso =
    provedor.id === "falso"
      ? "Mestre de teste: sem IA, só para conferir a mesa. Troque quando for jogar de verdade."
      : provedor.id === "api"
        ? "Cada turno gasta créditos da API."
        : "Sai do limite do seu plano do Claude, sem cobrança extra.";
  const recente = campanhas[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <section className={`grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-center ${recente ? "mb-10" : "mb-12"}`}>
        <div>
          <h1 className="titulo text-4xl leading-tight text-pergaminho sm:text-5xl">
            Puxe um banco. <br />
            <span className="text-ambar">O mestre já está bêbado.</span>
          </h1>
          {/* quem já tem campanha não precisa do discurso de boas-vindas no celular */}
          <p className={`mt-4 max-w-xl text-lg text-muted ${recente ? "hidden sm:block" : ""}`}>
            Arrombe a cripta errada, pechinche com um goblin ofendido, caia de um telhado por pura vaidade. Um mestre de IA narra, o
            código rola os dados, e a campanha fica guardada aqui na sua máquina. Sozinho ou com a turma.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/nova" className={recente ? "btn-borda min-h-11" : "btn-ambar min-h-11"}>
              Nova história
            </Link>
            <Link
              href="/nova/avancada"
              className="btn-borda min-h-11"
              title="Escolha o sistema de regras (D&D, Pathfinder, Vampiro...) e monte a ficha completa"
            >
              Modo avançado
            </Link>
          </div>
          {recente && <MestreCompacto nome={provedor.nome} aviso={`${aviso}${!configurado ? " (escolha vinda do .env)" : ""}`} />}
        </div>

        {recente ? (
          <Continuar c={recente} />
        ) : (
          <div className="cartao p-5 text-sm text-muted">
            <p className="titulo mb-2 text-base text-pergaminho">Quem está mestrando</p>
            <p className="text-ambar">{provedor.nome}</p>
            <p className="mt-2">
              {aviso}
              {!configurado && " (escolha vinda do .env)"}
            </p>
            <Link href="/config" className="mt-1 inline-flex min-h-10 items-center text-ambar underline-offset-4 hover:underline">
              Trocar o mestre →
            </Link>
          </div>
        )}
      </section>

      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="titulo text-2xl text-pergaminho">
          Campanhas {campanhas.length > 1 && <span className="text-base text-muted">({campanhas.length})</span>}
        </h2>
        {campanhas.length > 0 && (
          <Link href="/nova" className="btn-borda min-h-10 px-3 py-1.5">
            + Nova
          </Link>
        )}
      </div>

      {campanhas.length === 0 ? (
        <div className="cartao relative overflow-hidden px-6 py-10 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-24 mx-auto size-64 rounded-full bg-ambar/10 blur-3xl" />
          <p className="text-5xl" aria-hidden>
            🕯️
          </p>
          <p className="titulo mt-3 text-2xl text-pergaminho">A taverna está vazia</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Nenhuma campanha ainda. As cadeiras estão em cima das mesas e o mestre já tá conversando com a caneca.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/nova" className="btn-ambar min-h-11">
              Começar a primeira história
            </Link>
            <Link href="/nova/avancada" className="btn-borda min-h-11">
              Modo avançado
            </Link>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs text-muted">
            A história monta o herói em um minuto e o mestre sugere as ações. O avançado deixa escolher o sistema (D&amp;D, Pathfinder,
            Vampiro…) e preencher a ficha inteira.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campanhas.map((c) => (
            <li key={c.id} className="cartao flex flex-col p-5">
              <Etiquetas c={c} />
              <Link href={`/mesa/${c.id}`} className="group mt-2 rounded-sm">
                <h3 className="titulo text-xl text-pergaminho group-hover:text-ambar">{c.nome}</h3>
              </Link>
              {c.cenario && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.cenario}</p>}

              <div className="mt-3 flex-1">
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

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/mesa/${c.id}`} className="btn-ambar min-h-10 flex-1 px-3 py-2">
                  Entrar
                </Link>
                <Link href={`/mesa/${c.id}/ajustes`} className="btn-borda min-h-10 px-3 py-2">
                  Ajustes
                </Link>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted">
                <span title={dataDoBanco(c.atualizadaEm).toLocaleString("pt-BR")}>Última jogada: {haQuanto(c.atualizadaEm)}</span>
                <form action={excluirCampanhaAcao}>
                  <input type="hidden" name="id" value={c.id} />
                  <BotaoExcluir nome={c.nome} />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-14">
        <h2 className="titulo mb-4 text-2xl text-pergaminho">Como jogar com amigos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="cartao p-5">
            <h3 className="titulo text-lg text-ambar">Mesa local: um computador, vários heróis</h3>
            <p className="mt-2 text-sm text-muted">
              Crie um personagem para cada um na mesma campanha e passe o teclado. Na mesa, o seletor de personagem diz quem está agindo;
              no modo <em>por rodada</em> o mestre espera todo mundo declarar antes de narrar. Ideal para o sofá e a pizza.
            </p>
          </div>
          <div className="cartao p-5">
            <h3 className="titulo text-lg text-ambar">Rede local: cada um no seu celular</h3>
            <p className="mt-2 text-sm text-muted">
              Rode <code className="text-foreground">npm run rede</code>, abra a mesa e toque em <strong className="text-foreground">Convidar</strong>:
              aparece o link e o QR code para a turma no mesmo Wi-Fi. Cada um reivindica o próprio personagem. Ponha um PIN nos ajustes da
              mesa se o Wi-Fi for de condomínio. Pela rede só as mesas abrem; campanhas e configurações ficam nesta máquina.
            </p>
            <p className="mt-2 text-xs text-muted">No Windows, libere a porta 3300 no firewall na primeira vez (o README explica).</p>
          </div>
        </div>
      </section>
    </main>
  );
}
