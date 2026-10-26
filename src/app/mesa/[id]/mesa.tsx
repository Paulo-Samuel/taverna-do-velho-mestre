"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { CartaoDado } from "@/components/chat/cartao-dado";
import { PainelCena } from "@/components/cena/painel-cena";
import { Diario } from "@/components/diario/diario";
import { PainelFicha } from "@/components/ficha/painel-ficha";
import { Avatar, quemAgiu } from "@/components/grupo/avatar";
import { PainelGrupo } from "@/components/grupo/painel-grupo";
import { SeletorAtivo } from "@/components/grupo/seletor-ativo";
import { Convite } from "@/components/presenca/convite";
import { Presenca } from "@/components/presenca/presenca";
import { RoladorDados } from "@/components/rolador/rolador-dados";
import * as identidade from "@/lib/cliente/identidade";
import { useMesa, type Mesa as EstadoVivo } from "@/lib/cliente/use-mesa";
import { INICIO } from "@/lib/constantes";
import type { EstadoMesa } from "@/lib/mesa";
import { AvisoDarkPack } from "@/components/aviso-dark-pack";

// Casca da mesa de jogo: chat com o mestre, campo de ação e painéis laterais.
// Cada painel é um componente próprio em src/components/*, que recebe o estado vivo da mesa.
// Mesa local (hot-seat): vários personagens no mesmo aparelho; no modo rodada a vez passa sozinha para quem falta.

const NOMES_JANELAS: Record<string, string> = { five_hour: "janela de 5 h", seven_day: "semana", seven_day_opus: "semana (Opus)" };

/** Markdown mínimo do mestre: parágrafos, **negrito** e *itálico*. */
export function Narracao({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="mb-3 last:mb-0">
          {p.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((t, j) =>
            t.startsWith("**") ? (
              <strong key={j} className="text-pergaminho">
                {t.slice(2, -2)}
              </strong>
            ) : t.startsWith("*") && t.length > 2 ? (
              <em key={j}>{t.slice(1, -1)}</em>
            ) : (
              <Fragment key={j}>
                {t.split("\n").map((l, k) => (
                  <Fragment key={k}>
                    {k > 0 && <br />}
                    {l}
                  </Fragment>
                ))}
              </Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}

type Aba = "ficha" | "grupo" | "cena" | "diario";

function Lateral({ mesa, acoes }: { mesa: EstadoVivo; acoes: ReturnType<typeof useMesa>[1] }) {
  const [aba, setAba] = useState<Aba>("ficha");
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? mesa.personagens[0] ?? null;
  const abas: [Aba, string][] = [
    ["ficha", "Ficha"],
    ["grupo", `Grupo (${mesa.personagens.length})`],
    ["cena", mesa.cena.combate?.ativo ? "⚔ Cena" : "Cena"],
    ["diario", "Diário"],
  ];
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border text-sm">
        {abas.map(([id, rotulo]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`-mb-px border-b-2 px-2.5 py-1.5 ${aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {aba === "ficha" &&
        (ativo ? <PainelFicha personagem={ativo} sistema={mesa.sistema} /> : <p className="text-sm text-muted">Nenhum personagem nesta mesa.</p>)}
      {aba === "grupo" && <PainelGrupo mesa={mesa} acoes={acoes} />}
      {aba === "cena" && <PainelCena cena={mesa.cena} sistema={mesa.sistema} />}
      {aba === "diario" && <Diario entradas={mesa.diario} />}
      <div className="mt-5 border-t border-border pt-3 text-xs text-muted">
        <p>
          {mesa.sistema.nomeCurto} · Mestre: {mesa.provedor}
        </p>
        {mesa.sistema.id === "vtm5" && (
          <div className="mt-3">
            <AvisoDarkPack compacto />
          </div>
        )}
        {mesa.limite?.uso != null && (
          <p className="mt-1">
            Uso do plano: {Math.round(mesa.limite.uso * 100)}% da {NOMES_JANELAS[mesa.limite.janela] ?? mesa.limite.janela}
            {mesa.limite.renovaEm &&
              ` · renova ${new Date(mesa.limite.renovaEm * 1000).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`}
          </p>
        )}
      </div>
    </div>
  );
}

/** ?personagem=<id> (vindo de "novo personagem"): grava como ativo antes do useMesa ler, para a presença já nascer certa. */
function assumirDaUrl(estado: EstadoMesa, valor: string | null) {
  if (typeof window === "undefined") return;
  const pid = Number(valor);
  if (pid && estado.personagens.some((p) => p.id === pid)) identidade.salvarPersonagemAtivo(estado.campanha.id, pid);
}

export function Mesa({ estadoInicial, comecarSozinho }: { estadoInicial: EstadoMesa; comecarSozinho: boolean }) {
  // roda uma vez, na renderização, antes dos efeitos do useMesa. useSearchParams e não window.location:
  // no redirect da server action a barra de endereço só muda depois que a página já renderizou
  const busca = useSearchParams();
  useState(() => assumirDaUrl(estadoInicial, busca.get("personagem")));
  const [mesa, acoes] = useMesa(estadoInicial);
  const [acao, setAcao] = useState("");
  const [lateralAberta, setLateralAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const anterior = useRef<number | null>(null);
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const minhaNaFila = mesa.fila.find((a) => a.personagemId === mesa.eu.personagemId && a.personagemId !== null);
  const rodada = mesa.campanha.modo === "rodada";
  const agiram = quemAgiu(mesa);
  const faltam = mesa.personagens.filter((p) => !agiram.has(p.id));
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? false;

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mesa.mensagens.length, mesa.aoVivo]);

  // limpa da barra de endereço o que já foi usado (?inicio=1, ?personagem=)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("inicio") && !url.searchParams.has("personagem")) return;
    url.searchParams.delete("inicio");
    url.searchParams.delete("personagem");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  // campanha recém-criada sem "vou adicionar mais personagens": o mestre abre a cena sozinho, uma vez
  // (o ref segura o efeito duplo do StrictMode; a rota recusa um segundo início de qualquer jeito)
  const comecou = useRef(false);
  useEffect(() => {
    if (!comecarSozinho || comecou.current) return;
    comecou.current = true;
    void acoes.controle("iniciar");
  }, [comecarSozinho, acoes]);

  // trocou de personagem (Alt+n, chip, cartão): o teclado já fica pronto para o próximo jogador digitar.
  // Só com mouse: no celular, focar abriria o teclado virtual do nada.
  useEffect(() => {
    const id = mesa.eu.personagemId;
    if (anterior.current !== null && id !== null && id !== anterior.current && window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
    anterior.current = id;
  }, [mesa.eu.personagemId]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function enviar() {
    const texto = acao.trim();
    if (!texto) return;
    if (!(await acoes.enviarAcao(texto))) return;
    setAcao("");
    // hot-seat no modo rodada: a vez passa para o próximo que ainda não agiu (na ordem do grupo)
    if (!rodada || !ativo || texto.startsWith("((")) return;
    const ja = new Set(agiram).add(ativo.id);
    const i = mesa.personagens.findIndex((p) => p.id === ativo.id);
    const proximo = [...mesa.personagens.slice(i + 1), ...mesa.personagens.slice(0, i)].find((p) => !ja.has(p.id));
    // pela rede só passa para personagens sem dono ou do mesmo jogador; na máquina da taverna, para qualquer um
    if (proximo && (euLocal || !proximo.jogador || proximo.jogador === mesa.eu.apelido)) {
      acoes.escolherPersonagem(proximo.id);
      setAviso(`Vez de ${proximo.ficha.nome}. Passe o teclado!`);
    } else if (!proximo) {
      setAviso("Todo mundo agiu. O mestre vai narrar.");
    }
  }

  const vazia = mesa.mensagens.length === 0 && !mesa.ocupado && !mesa.fila.length;
  const nomeDe = (id: number | null) => mesa.personagens.find((p) => p.id === id)?.ficha.nome;
  const personagemDe = (id: number | null) => mesa.personagens.find((p) => p.id === id) ?? null;
  const linkNovo = `/mesa/${mesa.campanha.id}/personagens/novo`;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-[calc(100dvh-7rem)] min-w-0 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/" className="text-xs text-muted hover:text-ambar">
              ← campanhas
            </Link>
            <h1 className="titulo truncate text-2xl text-pergaminho">{mesa.campanha.nome}</h1>
            {rodada && <p className="text-[11px] uppercase tracking-wider text-ambar-forte">modo rodada</p>}
          </div>
          <div className="flex items-center gap-3">
            <Presenca mesa={mesa} acoes={acoes} />
            <Convite campanhaId={mesa.campanha.id} temPin={mesa.campanha.temPin} />
            <Link
              href={`/mesa/${mesa.campanha.id}/ajustes`}
              className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:border-ambar hover:text-ambar"
              aria-label="Ajustes da mesa"
              title="Ajustes da mesa"
            >
              ⚙
            </Link>
            <button className="btn-borda py-1.5 lg:hidden" onClick={() => setLateralAberta((v) => !v)}>
              {lateralAberta ? "Fechar" : ativo ? `${ativo.ficha.nome} · ${ativo.ficha.pv}/${ativo.ficha.pvMax}` : "Painel"}
            </button>
          </div>
        </div>

        {lateralAberta && (
          <div className="cartao mb-4 p-4 lg:hidden">
            <Lateral mesa={mesa} acoes={acoes} />
          </div>
        )}

        <div className="flex-1 space-y-4 pb-4">
          {vazia && (
            <div className="cartao p-6 text-center">
              <p className="titulo text-xl text-pergaminho">{comecarSozinho ? "Mesa posta." : "A taverna está em silêncio."}</p>
              {mesa.personagens.length > 0 ? (
                <>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {mesa.personagens.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2.5 text-sm">
                        <Avatar mesa={mesa} personagem={p} tamanho="sm" />
                        {p.ficha.nome}
                      </span>
                    ))}
                  </div>
                  <p className="mx-auto mt-4 max-w-md text-sm text-muted">
                    Vão jogar mais pessoas neste computador? Adicione os personagens do grupo antes de começar: o mestre apresenta todo mundo na cena de abertura.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Link href={linkNovo} className="btn-borda">
                      + Adicionar personagem
                    </Link>
                    <button className="btn-ambar" onClick={() => acoes.controle("iniciar")}>
                      Começar a aventura
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">Ninguém sentado ainda. Adicione os personagens do grupo antes de começar.</p>
                  <Link href={linkNovo} className="btn-ambar mt-4">
                    + Adicionar personagem
                  </Link>
                </>
              )}
            </div>
          )}

          {mesa.mensagens.map((m) =>
            m.tipo === "jogador" ? (
              <div key={m.id} className="surgir flex flex-col items-end">
                <span className="mb-0.5 flex items-center gap-1.5 text-xs text-muted">
                  {(() => {
                    const p = personagemDe(m.personagemId);
                    return p ? <Avatar mesa={mesa} personagem={p} tamanho="sm" /> : null;
                  })()}
                  {nomeDe(m.personagemId) ?? (m.personagemId ? "Personagem que saiu" : "Fora do jogo")}
                  {m.autor && ` · ${m.autor}`}
                </span>
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-ambar/30 bg-ambar/10 px-4 py-2.5">{m.texto}</p>
              </div>
            ) : m.tipo === "mestre" ? (
              <div key={m.id} className="surgir cartao max-w-[95%] px-5 py-4 leading-relaxed">
                <Narracao texto={m.texto} />
              </div>
            ) : m.tipo === "dado" ? (
              <CartaoDado key={m.id} mensagem={m} novo={mesa.novas.has(m.id)} />
            ) : (
              <p key={m.id} className="titulo text-center text-sm text-muted">
                ✦ {m.texto} ✦
              </p>
            ),
          )}

          {mesa.aoVivo && (
            <div className="cartao max-w-[95%] px-5 py-4 leading-relaxed">
              <div className="cursor">
                <Narracao texto={mesa.aoVivo} />
              </div>
            </div>
          )}
          {mesa.ocupado && !mesa.aoVivo && <p className="animate-pulse text-sm italic text-muted">O mestre coça a barba e pensa…</p>}
          {mesa.fila.length > 0 && (
            <div className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted">
              <p className="mb-1 flex flex-wrap justify-between gap-2 text-xs uppercase tracking-wider">
                <span>Aguardando o mestre</span>
                {rodada && mesa.personagens.length > 0 && (
                  <span className={faltam.length ? "" : "text-musgo"}>
                    {mesa.personagens.length - faltam.length}/{mesa.personagens.length} agiram
                  </span>
                )}
              </p>
              {mesa.fila.map((a) => (
                <p key={a.id}>
                  <span className="text-foreground">
                    {a.acao === INICIO ? "Mesa" : (nomeDe(a.personagemId) ?? a.autor) || "Alguém"}
                    {a.acao !== INICIO && a.personagemId !== null && " ✓"}:
                  </span>{" "}
                  {a.acao === INICIO ? "começar a aventura" : a.acao}
                </p>
              ))}
              {rodada && faltam.length > 0 && !mesa.ocupado && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span>Falta:</span>
                  {faltam.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => acoes.escolherPersonagem(p.id)}
                      title={`Agir como ${p.ficha.nome}`}
                      className={`flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 ${p.id === ativo?.id ? "border-ambar text-foreground" : "border-border hover:border-ambar/60"}`}
                    >
                      <Avatar mesa={mesa} personagem={p} tamanho="sm" />
                      {p.ficha.nome}
                    </button>
                  ))}
                </div>
              )}
              {rodada && !mesa.ocupado && (
                <button className="mt-2 text-xs text-ambar hover:underline" onClick={() => acoes.controle("forcar")}>
                  Narrar agora com as ações que já chegaram
                </button>
              )}
            </div>
          )}
          {mesa.erro && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-sangue/60 bg-sangue/10 px-4 py-3 text-sm">
              <p>{mesa.erro}</p>
              <button onClick={acoes.limparErro} className="text-muted hover:text-foreground" aria-label="Fechar">
                ✕
              </button>
            </div>
          )}
          <div ref={fim} />
        </div>

        <form
          className="sticky bottom-0 -mx-4 border-t border-border bg-background/90 px-4 pb-4 pt-3 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <SeletorAtivo mesa={mesa} acoes={acoes} />
            <RoladorDados campanhaId={mesa.campanha.id} sistema={mesa.sistema} personagem={ativo} autor={mesa.eu.apelido} aoRolar={acoes.receberMensagem} />
            {mesa.ocupado && (
              <button type="button" className="ml-auto text-muted hover:text-sangue" onClick={() => acoes.controle("cancelar")}>
                Interromper o mestre
              </button>
            )}
          </div>
          {aviso && (
            <p className="surgir mb-2 text-xs text-ambar" role="status">
              {aviso}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={campo}
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              rows={2}
              maxLength={2000}
              aria-label={ativo ? `Ação de ${ativo.ficha.nome}` : "Mensagem ao mestre"}
              placeholder={
                !ativo
                  ? "Fale com o mestre fora do jogo ((assim)), ou adicione um personagem."
                  : minhaNaFila
                    ? `${ativo.ficha.nome} já está na fila. Mande outra para complementar.`
                    : // curto para caber nas 2 linhas do campo no celular
                      `O que ${ativo.ficha.nome} faz? · ((assim)) fala fora do jogo`
              }
              className="campo min-h-12 flex-1 resize-none"
            />
            <button className="btn-ambar h-12" disabled={!acao.trim()}>
              Agir
            </button>
          </div>
        </form>
      </div>

      <aside className="hidden lg:block">
        <div className="cartao sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto p-5">
          <Lateral mesa={mesa} acoes={acoes} />
        </div>
      </aside>
    </div>
  );
}
