import type { Metadata } from "next";
import Link from "next/link";
import { COPIAS_GUARDADAS, LIXEIRA_GUARDADAS, listarCopias, listarLixeira, pastaCopias, type CopiaBanco } from "@/lib/backup";
import { obterCampanha, versaoDoEsquema } from "@/lib/db";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";
import { SISTEMAS } from "@/lib/sistemas";
import { apagarDaLixeiraAcao, fazerCopiaAcao, restaurarAcao } from "./acoes";
import { BotaoEnviar, ImportarCampanha } from "./formularios";

// Cópias e lixeira: as cópias do banco (uma por dia, antes de cada atualização do esquema e as feitas à mão), as campanhas
// excluídas (restaurar, baixar ou apagar de vez) e a importação de campanha exportada. Só abre na máquina da taverna.
// Chega-se aqui pelos Ajustes de cada mesa e depois de excluir uma campanha (?excluida=<arquivo> mostra o "desfazer").

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cópias e lixeira · Taverna do Velho Mestre" };

const tamanho = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const quando = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const nomeSistema = (id: string) => SISTEMAS.find((s) => s.id === id)?.nome ?? id;

function motivo(c: CopiaBanco) {
  if (c.motivo === "diaria") return "Diária";
  if (c.motivo === "manual") return "Feita à mão";
  const v = /-v(\d+)-v(\d+)\.db$/.exec(c.arquivo);
  return v ? `Antes de atualizar o banco (v${v[1]} → v${v[2]})` : "Antes de atualizar o banco";
}

function haQuanto(d: Date) {
  const horas = (Date.now() - d.getTime()) / 3_600_000;
  if (horas < 1) return "há menos de uma hora";
  if (horas < 24) return `há ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="titulo mb-3 text-xl text-pergaminho">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PaginaBackup(props: PageProps<"/backup">) {
  if (!(await daMaquinaNaPagina())) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="cartao p-6 text-muted">As cópias do banco e a lixeira só abrem no computador da taverna. Daqui, só as mesas.</p>
      </main>
    );
  }
  const busca = await props.searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const excluida = um(busca.excluida);
  const restaurada = Number(um(busca.restaurada));
  const copiaFeita = um(busca.copia);
  const erro = um(busca.erro);
  const falhou = um(busca.falhou);

  const copias = listarCopias();
  const ultima = copias.find((c) => c.motivo !== "migracao");
  const lixeira = listarLixeira();
  const recemExcluida = excluida ? lixeira.find((i) => i.arquivo === excluida) : undefined;
  const campanhaRestaurada = Number.isInteger(restaurada) ? obterCampanha(restaurada) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ambar">
      <div>
        <Link href="/" className="-my-2 inline-block py-2 text-xs text-muted hover:text-ambar">
          ← voltar para as campanhas
        </Link>
        <h1 className="titulo mt-1 text-3xl text-pergaminho">Cópias e lixeira</h1>
        <p className="mt-1 text-sm text-muted">
          Tudo fica nesta máquina, na pasta <code className="text-ambar">data</code> da taverna. Banco no formato v{versaoDoEsquema()}.
        </p>
      </div>

      {recemExcluida && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ambar/40 bg-ambar/10 px-4 py-3 text-sm">
          <span>
            <strong className="text-pergaminho">{recemExcluida.nome}</strong> foi para a lixeira.
          </span>
          <form action={restaurarAcao}>
            <input type="hidden" name="arquivo" value={recemExcluida.arquivo} />
            <BotaoEnviar texto="Desfazer: restaurar" esperando="Restaurando…" />
          </form>
        </div>
      )}
      {campanhaRestaurada && (
        <p role="status" className="rounded-md border border-musgo/40 bg-musgo/10 px-4 py-3 text-sm">
          ✓ <strong className="text-pergaminho">{campanhaRestaurada.nome}</strong> está de volta.{" "}
          <Link href={`/mesa/${campanhaRestaurada.id}`} className="underline hover:text-ambar">
            Abrir a mesa
          </Link>
        </p>
      )}
      {copiaFeita && (
        <p role="status" className="rounded-md border border-musgo/40 bg-musgo/10 px-4 py-3 text-sm">
          ✓ Cópia feita: <code>{copiaFeita}</code>
        </p>
      )}
      {um(busca.apagada) && (
        <p role="status" className="rounded-md border border-border px-4 py-3 text-sm text-muted">
          Apagada de vez da lixeira.
        </p>
      )}
      {(erro || falhou) && (
        <p role="alert" className="rounded-md border border-sangue/50 bg-sangue/10 px-4 py-3 text-sm text-sangue">
          {erro ?? "Não deu para guardar a campanha na lixeira (disco cheio?), então nada foi apagado."}
        </p>
      )}

      <Secao titulo="Cópias do banco">
        <p className="mb-3 text-sm text-muted">
          A taverna copia o banco inteiro (todas as campanhas) uma vez por dia e antes de cada atualização do formato, e guarda as {COPIAS_GUARDADAS} mais
          novas.{" "}
          {ultima ? (
            <>
              Última: <span className="text-foreground">{haQuanto(ultima.criadaEm)}</span>.
            </>
          ) : (
            "Ainda não há nenhuma."
          )}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <form action={fazerCopiaAcao}>
            <BotaoEnviar texto="Fazer cópia agora" esperando="Copiando…" />
          </form>
          <a href="/api/backup" download className="btn-borda">
            Baixar o banco
          </a>
        </div>
        {copias.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {copias.map((c) => (
              <li key={c.arquivo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="text-foreground">{quando(c.criadaEm)}</span>
                  <span className="text-muted">
                    {" "}
                    · {motivo(c)} · {tamanho(c.tamanho)}
                  </span>
                </span>
                <a href={`/api/backup?copia=${encodeURIComponent(c.arquivo)}`} download className="text-xs text-muted underline hover:text-ambar">
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer hover:text-ambar">Como voltar o banco inteiro para uma cópia</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Desligue a taverna (feche a janela do atalho).</li>
            <li>
              Na pasta <code className="break-all text-ambar">{pastaCopias().replace(/[\\/]copias$/, "")}</code>, renomeie <code>taverna.db</code> para
              guardar (e apague <code>taverna.db-wal</code> e <code>taverna.db-shm</code>, se existirem).
            </li>
            <li>
              Copie a cópia escolhida (de <code>copias</code>) para lá com o nome <code>taverna.db</code> e ligue a taverna de novo.
            </li>
          </ol>
          <p className="mt-2">Para trazer só uma campanha de volta, a lixeira abaixo é mais simples: não mexe nas outras.</p>
        </details>
      </Secao>

      <Secao titulo="Lixeira">
        <p className="mb-3 text-sm text-muted">
          Campanhas excluídas, inteiras (fichas, anotações, chat, diário e fatos). Restaurar recria a mesa com o mesmo nome. Ficam as {LIXEIRA_GUARDADAS} mais
          recentes.
        </p>
        {lixeira.length === 0 ? (
          <p className="text-sm text-muted">Vazia. Nenhuma campanha foi excluída por aqui.</p>
        ) : (
          <ul className="space-y-2">
            {lixeira.map((i) => (
              <li key={i.arquivo} className={`rounded-lg border px-3 py-2 ${i.arquivo === excluida ? "border-ambar/60" : "border-border"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold text-pergaminho">{i.nome}</span>
                  <span className="text-xs text-muted">excluída em {quando(i.excluidaEm)}</span>
                </div>
                <p className="text-xs text-muted">
                  {[i.sistema && nomeSistema(i.sistema), i.personagens.length ? i.personagens.join(", ") : "sem personagens", `${i.mensagens} mensagens`, tamanho(i.tamanho)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={restaurarAcao}>
                    <input type="hidden" name="arquivo" value={i.arquivo} />
                    <BotaoEnviar texto="Restaurar" esperando="Restaurando…" />
                  </form>
                  <a href={`/api/backup?lixeira=${encodeURIComponent(i.arquivo)}`} download className="btn-borda">
                    Baixar
                  </a>
                  <form action={apagarDaLixeiraAcao}>
                    <input type="hidden" name="arquivo" value={i.arquivo} />
                    <BotaoEnviar texto="Apagar de vez" esperando="Apagando…" perigo confirmar={`Apagar "${i.nome}" de vez? Isto não tem volta.`} />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Importar campanha">
        <p className="mb-3 text-sm text-muted">
          Um arquivo de “Exportar campanha” (Ajustes da mesa), desta ou de outra taverna, vira uma mesa nova aqui. Arquivo de uma taverna mais nova pede
          atualizar esta primeiro.
        </p>
        <ImportarCampanha />
      </Secao>
    </main>
  );
}
