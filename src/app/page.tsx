import Link from "next/link";
import { listarCampanhas, listarPersonagens, type Personagem } from "@/lib/db";
import { lerAjustesMestre, provedorAtual } from "@/lib/mestre";
import { obterSistema } from "@/lib/sistemas";
import { excluirCampanhaAcao } from "./acoes-campanha";
import { BotaoExcluir } from "./botao-excluir";

export const dynamic = "force-dynamic";

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 3 horas", "ontem"... O SQLite grava em UTC sem fuso ("2026-10-25 14:03:00"). */
function haQuanto(dataSqlite: string): string {
  const quando = new Date(dataSqlite.replace(" ", "T") + "Z");
  const seg = Math.round((quando.getTime() - Date.now()) / 1000);
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

function corDaVida(pv: number, max: number) {
  const f = max > 0 ? pv / max : 0;
  return f > 0.5 ? "bg-musgo" : f > 0.25 ? "bg-ambar" : "bg-sangue";
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
        <span className={`shrink-0 tabular-nums text-xs ${pv <= 0 ? "text-sangue" : "text-muted"}`}>{pvMax > 0 ? `${pv}/${pvMax}` : "—"}</span>
      </div>
      {pvMax > 0 && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className={`h-full ${corDaVida(pv, pvMax)}`} style={{ width: `${largura}%` }} />
        </div>
      )}
    </li>
  );
}

export default function Inicio() {
  const campanhas = listarCampanhas().map((c) => {
    const sistema = obterSistema(c.sistema);
    return { ...c, sistema, personagens: listarPersonagens(c.id) };
  });
  const provedor = provedorAtual();
  const configurado = Boolean(lerAjustesMestre().provedor);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <section className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <h1 className="titulo text-4xl leading-tight text-pergaminho sm:text-5xl">
            Puxe um banco. <br />
            <span className="text-ambar">O mestre já está bêbado.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Arrombe a cripta errada, pechinche com um goblin ofendido, caia de um telhado por pura vaidade. Um mestre de IA narra, o
            código rola os dados, e a campanha fica guardada aqui na sua máquina. Sozinho ou com a turma.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/nova" className="btn-ambar">
              Nova história
            </Link>
            <Link href="/nova/avancada" className="btn-borda" title="Escolha o sistema de regras (D&D, Pathfinder, Vampiro...) e monte a ficha completa">
              Modo avançado
            </Link>
          </div>
        </div>
        <div className="cartao p-5 text-sm text-muted">
          <p className="titulo mb-2 text-base text-pergaminho">Quem está mestrando</p>
          <p className="text-ambar">{provedor.nome}</p>
          <p className="mt-2">
            {provedor.id === "falso"
              ? "Mestre de teste: sem IA, só para conferir a mesa. Troque quando for jogar de verdade."
              : provedor.id === "api"
                ? "Cada turno gasta créditos da API."
                : "Sai do limite do seu plano do Claude, sem cobrança extra."}
            {!configurado && " (escolha vinda do .env)"}
          </p>
          <Link href="/config" className="mt-3 inline-block text-ambar underline-offset-4 hover:underline">
            Trocar o mestre →
          </Link>
        </div>
      </section>

      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="titulo text-2xl text-pergaminho">Campanhas</h2>
        {campanhas.length > 0 && (
          <Link href="/nova" className="btn-borda px-3 py-1.5">
            + Nova
          </Link>
        )}
      </div>

      {campanhas.length === 0 ? (
        <div className="cartao p-6 text-muted">
          <p>Nenhuma campanha ainda. A taverna está vazia e o mestre, entediado.</p>
          <Link href="/nova" className="btn-ambar mt-4">
            Começar a primeira
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campanhas.map((c) => (
            <li key={c.id} className="cartao flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="etiqueta text-ambar-forte">{c.sistema.nomeCurto}</span>
                <span className="etiqueta">{c.config.modo === "rodada" ? "por rodada" : "livre"}</span>
                {c.config.pin && (
                  <span className="etiqueta" title="Quem entra pela rede precisa do PIN">
                    🔒 PIN
                  </span>
                )}
              </div>
              <Link href={`/mesa/${c.id}`} className="group mt-2">
                <p className="titulo text-xl text-pergaminho group-hover:text-ambar">{c.nome}</p>
              </Link>
              {c.cenario && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.cenario}</p>}

              <div className="mt-3 flex-1">
                {c.personagens.length ? (
                  <ul className="space-y-2">
                    {c.personagens.map((p) => (
                      <LinhaPersonagem
                        key={p.id}
                        p={p}
                        nomeClasse={c.sistema.classes.find((k) => k.id === p.ficha.classe)?.nome ?? c.sistema.rotulos.classe}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-muted">Ninguém sentou ainda.</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/mesa/${c.id}`} className="btn-ambar flex-1 px-3 py-2">
                  Entrar
                </Link>
                <Link href={`/mesa/${c.id}/ajustes`} className="btn-borda px-3 py-2">
                  Ajustes
                </Link>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                <span title={new Date(c.atualizadaEm.replace(" ", "T") + "Z").toLocaleString("pt-BR")}>Última jogada: {haQuanto(c.atualizadaEm)}</span>
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
            <p className="titulo text-lg text-ambar">Mesa local: um computador, vários heróis</p>
            <p className="mt-2 text-sm text-muted">
              Crie um personagem para cada um na mesma campanha e passe o teclado. Na mesa, o seletor de personagem diz quem está agindo;
              no modo <em>por rodada</em> o mestre espera todo mundo declarar antes de narrar. Ideal para o sofá e a pizza.
            </p>
          </div>
          <div className="cartao p-5">
            <p className="titulo text-lg text-ambar">Rede local: cada um no seu celular</p>
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
