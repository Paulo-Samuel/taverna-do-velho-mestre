import type { Metadata } from "next";
import Link from "next/link";
import { COPIAS_GUARDADAS, LIXEIRA_GUARDADAS, listarCopias, listarLixeira, pastaCopias, type CopiaBanco } from "@/lib/backup";
import { obterCampanha, versaoDoEsquema } from "@/lib/db";
import { daMaquinaNaPagina } from "@/lib/rede/acesso";
import { SISTEMAS } from "@/lib/sistemas";
import { haQuanto } from "@/lib/ha-quanto";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { FaixaAviso } from "@/components/faixa-aviso";
import { Icone } from "@/components/icones";
import { LinkVoltar } from "@/components/link-voltar";
import { SecaoCartao } from "@/components/secao-cartao";
import { apagarDaLixeiraAcao, fazerCopiaAcao, restaurarAcao } from "./acoes";
import { BotaoEnviar, ImportarCampanha } from "./formularios";

// Cópias e lixeira: as cópias do banco (uma por dia, antes de cada atualização do esquema e as feitas à mão), as campanhas
// excluídas (restaurar, baixar ou apagar de vez) e a importação de campanha exportada. Só abre na máquina da taverna.
// Chega-se aqui pelos Ajustes de cada mesa e depois de excluir uma campanha (?excluida=<arquivo> mostra o "desfazer").

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cópias e lixeira" };

const tamanho = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const quando = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const nomeSistema = (id: string) => SISTEMAS.find((s) => s.id === id)?.nome ?? id;

function motivo(c: CopiaBanco) {
  if (c.motivo === "diaria") return "Diária";
  if (c.motivo === "manual") return "Feita à mão";
  const v = /-v(\d+)-v(\d+)\.db$/.exec(c.arquivo);
  return v ? `Antes de atualizar o banco (da v${v[1]} para a v${v[2]})` : "Antes de atualizar o banco";
}

// cor da plaquinha de cada tipo de cópia (texto literal, para o Tailwind enxergar a classe)
const MATIZ_DO_MOTIVO: Record<CopiaBanco["motivo"], string> = { diaria: "matiz-1", manual: "matiz-2", migracao: "matiz-7" };

export default async function PaginaBackup(props: PageProps<"/backup">) {
  if (!(await daMaquinaNaPagina())) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p className="cartao p-6 text-muted">As cópias do banco e a lixeira só abrem na máquina da taverna. Daqui, só as mesas.</p>
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
        <LinkVoltar href="/">Voltar para as campanhas</LinkVoltar>
        <CabecalhoPagina
          className="mt-1 mb-0!"
          titulo="Cópias e lixeira"
          subtitulo={
            <>
              Tudo fica nesta máquina, na pasta <code className="text-ambar">data</code> da taverna. Banco no formato v{versaoDoEsquema()}.
            </>
          }
        />
      </div>

      {recemExcluida && (
        <FaixaAviso
          tom="alerta"
          acoes={
            <form action={restaurarAcao}>
              <input type="hidden" name="arquivo" value={recemExcluida.arquivo} />
              <BotaoEnviar texto="Desfazer: restaurar" esperando="Restaurando…" />
            </form>
          }
        >
          <strong className="text-pergaminho">{recemExcluida.nome}</strong> foi para a lixeira.
        </FaixaAviso>
      )}
      {campanhaRestaurada && (
        <FaixaAviso tom="sucesso">
          <strong className="text-pergaminho">{campanhaRestaurada.nome}</strong> está de volta.{" "}
          <Link href={`/mesa/${campanhaRestaurada.id}`} className="underline hover:text-ambar">
            Abrir a mesa
          </Link>
        </FaixaAviso>
      )}
      {copiaFeita && (
        <FaixaAviso tom="sucesso">
          Cópia feita: <code className="break-all">{copiaFeita}</code>
        </FaixaAviso>
      )}
      {um(busca.apagada) && <FaixaAviso tom="info">Apagada de vez da lixeira.</FaixaAviso>}
      {(erro || falhou) && (
        <FaixaAviso tom="erro">{erro ?? "Não deu para guardar a campanha na lixeira (disco cheio?), então nada foi apagado."}</FaixaAviso>
      )}

      <SecaoCartao id="copias" titulo="Cópias do banco" icone="book" matiz="matiz-6">
        <p className="mb-3 text-sm text-muted">
          A taverna copia o banco inteiro (todas as campanhas) uma vez por dia e antes de cada atualização do formato, e guarda as {COPIAS_GUARDADAS} mais
          novas.{" "}
          {ultima && (
            <>
              Última: <span className="text-foreground">{haQuanto(ultima.criadaEm)}</span>.
            </>
          )}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <form action={fazerCopiaAcao}>
            <BotaoEnviar texto="Fazer cópia agora" esperando="Copiando…" />
          </form>
          <a href="/api/backup" download className="btn-borda">
            <Icone nome="download" /> Baixar o banco
          </a>
        </div>
        {copias.length === 0 ? (
          <EstadoVazio compacto icone="book">
            Nenhuma cópia ainda. A primeira sai sozinha amanhã, ou agora mesmo no botão acima.
          </EstadoVazio>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {copias.map((c) => (
              <li key={c.arquivo} className="flex items-center justify-between gap-x-3 px-3 py-1 text-sm">
                {/* o "Baixar" nunca desce de linha: quem quebra é a plaquinha do motivo, dentro da coluna da esquerda */}
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 py-1">
                  <span className="tabular-nums text-foreground">{quando(c.criadaEm)}</span>
                  <span className={`etiqueta-matiz max-w-full rounded-lg ${MATIZ_DO_MOTIVO[c.motivo]}`}>{motivo(c)}</span>
                  <span className="text-xs tabular-nums text-muted">{tamanho(c.tamanho)}</span>
                </span>
                <a
                  href={`/api/backup?copia=${encodeURIComponent(c.arquivo)}`}
                  download
                  aria-label={`Baixar a cópia de ${quando(c.criadaEm)}`}
                  className="-mr-2 inline-flex min-h-10 shrink-0 items-center gap-1 px-2 text-sm text-muted hover:text-ambar"
                >
                  <Icone nome="download" /> Baixar
                </a>
              </li>
            ))}
          </ul>
        )}
        <details className="group mt-4 text-sm text-muted">
          {/* inline-flex tira o triângulo nativo do summary: a seta abaixo faz o papel dele */}
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 hover:text-ambar [&::-webkit-details-marker]:hidden">
            <Icone nome="chevronDown" className="shrink-0 transition-transform group-open:rotate-180" />
            Como voltar o banco inteiro para uma cópia
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Desligue a taverna (feche a janela do atalho).</li>
            <li>
              Na pasta <code className="break-all text-ambar">{pastaCopias().replace(/[\\/]copias$/, "")}</code>, renomeie <code className="text-ambar">taverna.db</code> para
              guardar (e apague <code className="text-ambar">taverna.db-wal</code> e <code className="text-ambar">taverna.db-shm</code>, se existirem).
            </li>
            <li>
              Copie a cópia escolhida (de <code className="text-ambar">copias</code>) para lá com o nome <code className="text-ambar">taverna.db</code> e ligue a taverna de novo.
            </li>
          </ol>
          <p className="mt-2">Para trazer só uma campanha de volta, a lixeira mais abaixo é mais simples: não mexe nas outras.</p>
        </details>
      </SecaoCartao>

      <SecaoCartao id="importar" titulo="Importar campanha" icone="scroll" matiz="matiz-2">
        <p className="mb-3 text-sm text-muted">
          Um arquivo de “Exportar campanha” (Ajustes da mesa), desta ou de outra taverna, vira uma campanha nova aqui. Arquivo de uma taverna mais nova pede
          atualizar esta primeiro.
        </p>
        <ImportarCampanha />
      </SecaoCartao>

      <SecaoCartao id="lixeira" titulo="Lixeira" icone="skull" matiz="matiz-3">
        <p className="mb-3 text-sm text-muted">
          Campanhas excluídas, inteiras (fichas, anotações, chat, diário e fatos). Restaurar recria a mesa com o mesmo nome. Ficam as {LIXEIRA_GUARDADAS} mais
          recentes.
        </p>
        {lixeira.length === 0 ? (
          <EstadoVazio compacto icone="skull">
            Vazia. Nenhuma campanha foi excluída por aqui.
          </EstadoVazio>
        ) : (
          <ul className="space-y-2">
            {lixeira.map((i) => (
              <li
                key={i.arquivo}
                className={`grid gap-x-4 gap-y-2 rounded-lg border px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${i.arquivo === excluida ? "border-ambar/60" : "border-border"}`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-pergaminho">{i.nome}</span>
                    {i.sistema && <span className="etiqueta-matiz matiz-5">{nomeSistema(i.sistema)}</span>}
                  </p>
                  <p className="mt-1 text-sm text-foreground/85">{i.personagens.length ? i.personagens.join(", ") : "sem personagens"}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">
                    excluída em {quando(i.excluidaEm)} · {i.mensagens} {i.mensagens === 1 ? "mensagem" : "mensagens"} · {tamanho(i.tamanho)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-10 [&_button]:px-3">
                  <form action={restaurarAcao}>
                    <input type="hidden" name="arquivo" value={i.arquivo} />
                    <BotaoEnviar texto="Restaurar" esperando="Restaurando…" />
                  </form>
                  <a
                    href={`/api/backup?lixeira=${encodeURIComponent(i.arquivo)}`}
                    download
                    aria-label={`Baixar ${i.nome}`}
                    className="inline-flex min-h-10 items-center gap-1 px-3 text-sm text-muted hover:text-ambar"
                  >
                    <Icone nome="download" /> Baixar
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
      </SecaoCartao>
    </main>
  );
}
