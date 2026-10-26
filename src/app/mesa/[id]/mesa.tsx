"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CartaoDado } from "@/components/chat/cartao-dado";
import { SugestoesCompactas } from "@/components/chat/sugestoes-compactas";
import { dadosDoPedido, PedidoTeste } from "@/components/historia/pedido-teste";
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
// Layout de aplicativo: ocupa a tela inteira (cobre a barra do site, como a mesa do modo história); só a conversa rola,
// o cabeçalho e o campo de ação ficam parados, e o painel lateral tem a própria rolagem.

const NOMES_JANELAS: Record<string, string> = { five_hour: "janela de 5 h", seven_day: "semana", seven_day_opus: "semana (Opus)" };

/** Distância do fim (px) a partir da qual o leitor "subiu para reler" e a rolagem automática para de puxar. */
const LONGE_DO_FIM = 160;

/** Coluna de leitura: narração, ações, dados e o campo de ação alinhados pela mesma largura (~68 caracteres). */
const COLUNA = "mx-auto w-full max-w-[42rem]";

// **negrito**, *itálico* e falas entre aspas (estas em itálico, com as aspas originais)
const MARCAS = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|"[^"\n]+"|“[^”\n]+”)/g;

function linhas(texto: string): ReactNode {
  return texto.split("\n").map((l, k) => (
    <Fragment key={k}>
      {k > 0 && <br />}
      {l}
    </Fragment>
  ));
}

/** Markdown mínimo do mestre, em prosa de livro: parágrafos, **negrito**, *itálico*, falas e separadores (---). */
export function Narracao({ texto, escrevendo = false }: { texto: string; escrevendo?: boolean }) {
  const paragrafos = texto
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);
  return (
    <div className="text-[1.06rem] leading-[1.8] text-foreground/95 sm:text-[1.12rem]">
      {paragrafos.map((p, i) =>
        /^(-{3,}|\*{3,}|_{3,})$/.test(p) ? (
          <p key={i} className="my-5 text-center text-sm tracking-[0.6em] text-ambar/50" aria-hidden>
            ✦✦✦
          </p>
        ) : (
          <p key={i} className={`mb-4 last:mb-0 ${escrevendo && i === paragrafos.length - 1 ? "cursor" : ""}`}>
            {p.split(MARCAS).map((t, j) =>
              j % 2 === 0 ? (
                <Fragment key={j}>{linhas(t)}</Fragment>
              ) : t.startsWith("**") ? (
                <strong key={j} className="font-semibold text-pergaminho">
                  {linhas(t.slice(2, -2))}
                </strong>
              ) : t.startsWith("*") ? (
                <em key={j}>{linhas(t.slice(1, -1))}</em>
              ) : (
                <em key={j} className="text-pergaminho">
                  {t}
                </em>
              ),
            )}
          </p>
        ),
      )}
      {escrevendo && paragrafos.length === 0 && <p className="cursor" />}
    </div>
  );
}

/** Três pontinhos pulando (ficam parados para quem pediu menos movimento). */
function Pontinhos() {
  return (
    <span className="inline-flex items-center gap-1 text-ambar" aria-hidden>
      {[0, 150, 300].map((atraso) => (
        <span key={atraso} className="size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-none" style={{ animationDelay: `${atraso}ms` }} />
      ))}
    </span>
  );
}

type Aba = "ficha" | "grupo" | "cena" | "diario";

/** Abas Ficha/Grupo/Cena/Diário: a barra de abas fica parada e o conteúdo rola sozinho. */
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="Painéis da mesa" className="flex shrink-0 gap-1 border-b border-border px-4 pt-2 text-sm sm:px-5">
        {abas.map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`-mb-px min-h-10 border-b-2 px-2.5 focus-visible:text-ambar focus-visible:outline-none ${aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-5">
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
  const [longeDoFim, setLongeDoFim] = useState(false);
  const rolador = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const longeRef = useRef(false);
  const ultimoTopo = useRef(0);
  const campo = useRef<HTMLTextAreaElement>(null);
  const anterior = useRef<number | null>(null);
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const minhaNaFila = mesa.fila.find((a) => a.personagemId === mesa.eu.personagemId && a.personagemId !== null);
  const rodada = mesa.campanha.modo === "rodada";
  const agiram = quemAgiu(mesa);
  const faltam = mesa.personagens.filter((p) => !agiram.has(p.id));
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? false;
  // testes que o mestre pediu e que esperam o jogador rolar (mesmo fluxo do modo história)
  const pendentes = mesa.mensagens.filter((m) => m.tipo === "dado" && dadosDoPedido(m).tipo === "pedido_teste" && dadosDoPedido(m).status === "pendente");
  const pidDoPedido = (m: (typeof mesa.mensagens)[number]) => dadosDoPedido(m).personagemId ?? m.personagemId;
  const meuPendente = ativo ? (pendentes.find((m) => pidDoPedido(m) === ativo.id) ?? null) : null;
  const sugestoes = mesa.cena.sugestoes ?? [];
  const mostrarSugestoes = !mesa.ocupado && pendentes.length === 0 && Boolean(ativo) && !minhaNaFila && sugestoes.length > 0;
  /** Este aparelho pode rolar o teste deste personagem? Dono do personagem, máquina da taverna ou aparelho sozinho na mesa. */
  const podeRolarPara = (pid: number | null | undefined) => {
    if (!mesa.eu.clienteId) return false;
    const p = mesa.personagens.find((x) => x.id === pid);
    return mesa.eu.personagemId === pid || euLocal || mesa.presenca.length <= 1 || Boolean(p?.jogador && p.jogador === mesa.eu.apelido);
  };
  const irParaDado = () => meuPendente && document.getElementById(`pedido-${meuPendente.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  // ---------- rolagem da conversa ----------

  const irParaOFim = useCallback((suave = false) => {
    const el = rolador.current;
    if (!el) return;
    longeRef.current = false;
    setLongeDoFim(false);
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: suave && !reduzido ? "smooth" : "auto" });
  }, []);

  // conteúdo cresceu (mensagem nova, texto ao vivo, dado mostrando o resultado) ou a área encolheu (sugestões, teclado):
  // acompanha o fim, a não ser que o leitor tenha subido para reler
  useEffect(() => {
    const el = rolador.current;
    const dentro = conteudo.current;
    if (!el || !dentro) return;
    const obs = new ResizeObserver(() => {
      if (!longeRef.current) el.scrollTop = el.scrollHeight;
    });
    obs.observe(el);
    obs.observe(dentro);
    el.scrollTop = el.scrollHeight;
    return () => obs.disconnect();
  }, []);

  // Só conta como "subiu para reler" quando a rolagem andou para cima: o evento chega atrasado e, se o conteúdo cresceu
  // nesse meio-tempo (texto ao vivo), a distância do fim engana e a rolagem automática pararia sozinha.
  function aoRolar() {
    const el = rolador.current;
    if (!el) return;
    const distancia = el.scrollHeight - el.scrollTop - el.clientHeight;
    const subiu = el.scrollTop < ultimoTopo.current - 2;
    ultimoTopo.current = el.scrollTop;
    const longe = distancia > LONGE_DO_FIM && (subiu || longeRef.current);
    longeRef.current = longe;
    setLongeDoFim(longe);
  }

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

  // painel do celular (tela cheia): Esc fecha
  useEffect(() => {
    if (!lateralAberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLateralAberta(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [lateralAberta]);

  /** Envia o campo, ou uma ação sugerida (sem apagar o que o jogador estava digitando). */
  async function enviar(sugerida?: string) {
    const texto = (sugerida ?? acao).trim();
    if (!texto || meuPendente) return;
    if (!(await acoes.enviarAcao(texto))) return;
    if (sugerida === undefined) setAcao("");
    irParaOFim(true);
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
  const caido = ativo ? ativo.ficha.pvMax > 0 && ativo.ficha.pv <= 0 : false;

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden text-foreground">
      <header className="relative z-20 shrink-0 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2 sm:gap-2 sm:px-4">
          <Link
            href="/"
            className="grid size-10 shrink-0 place-items-center rounded-md text-lg text-muted hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar"
            aria-label="Voltar para as campanhas"
            title="Voltar para as campanhas"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="titulo truncate text-base text-pergaminho sm:text-xl" title={mesa.campanha.nome}>{mesa.campanha.nome}</h1>
            <p className="truncate text-[11px] text-muted">
              <span aria-hidden>🍺</span> {mesa.sistema.nomeCurto}
              {rodada && <span className="uppercase tracking-wider text-ambar-forte"> · modo rodada</span>}
            </p>
          </div>
          <Presenca mesa={mesa} acoes={acoes} />
          <Convite campanhaId={mesa.campanha.id} temPin={mesa.campanha.temPin} compacto />
          <Link
            href={`/mesa/${mesa.campanha.id}/ajustes`}
            className="grid size-10 shrink-0 place-items-center rounded-md text-lg text-muted hover:bg-surface-2/60 hover:text-ambar focus-visible:outline-2 focus-visible:outline-ambar"
            aria-label="Ajustes da mesa"
            title="Ajustes da mesa"
          >
            ⚙
          </Link>
          {/* celular: abre a ficha/painéis em tela cheia; mostra só as iniciais e a vida, para caber em 375px */}
          <button
            type="button"
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-ambar lg:hidden ${
              lateralAberta ? "border-ambar text-ambar" : "border-border hover:border-ambar"
            }`}
            onClick={() => setLateralAberta((v) => !v)}
            aria-expanded={lateralAberta}
            aria-controls="painel-celular"
            aria-label={
              lateralAberta ? "Fechar o painel" : ativo ? `Abrir a ficha de ${ativo.ficha.nome} (${ativo.ficha.pv} de ${ativo.ficha.pvMax})` : "Abrir o painel da mesa"
            }
          >
            {lateralAberta ? (
              <span className="px-1" aria-hidden>
                ✕
              </span>
            ) : ativo ? (
              <>
                <Avatar mesa={mesa} personagem={ativo} tamanho="sm" />
                <span className={caido ? "text-sangue" : "text-foreground/90"}>
                  {ativo.ficha.pv}/{ativo.ficha.pvMax}
                </span>
              </>
            ) : (
              <span aria-hidden>☰</span>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 lg:gap-6 lg:px-4">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={rolador} onScroll={aoRolar} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div ref={conteudo} className={`${COLUNA} px-4 pb-8 pt-6 sm:px-6`}>
              {vazia && (
                <div className="surgir py-10 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">{mesa.sistema.nomeCurto}</p>
                  <p className="titulo mt-2 text-3xl text-pergaminho">{comecarSozinho ? "Mesa posta." : "A taverna está em silêncio."}</p>
                  <div className="mx-auto mt-4 h-px w-40 bg-linear-to-r from-transparent via-ambar/60 to-transparent" />
                  {mesa.personagens.length > 0 ? (
                    <>
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {mesa.personagens.map((p) => (
                          <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2.5 text-sm">
                            <Avatar mesa={mesa} personagem={p} tamanho="sm" />
                            {p.ficha.nome}
                          </span>
                        ))}
                      </div>
                      <p className="mx-auto mt-5 max-w-md text-sm text-muted">
                        Vão jogar mais pessoas neste computador? Adicione os personagens do grupo antes de começar: o mestre apresenta todo mundo na cena de abertura.
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <Link href={linkNovo} className="btn-borda min-h-11">
                          + Adicionar personagem
                        </Link>
                        <button type="button" className="btn-ambar min-h-11" onClick={() => acoes.controle("iniciar")}>
                          Começar a aventura
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mx-auto mt-5 max-w-md text-sm text-muted">Ninguém sentado ainda. O mestre não narra para cadeira vazia: adicione os personagens do grupo.</p>
                      <Link href={linkNovo} className="btn-ambar mt-5 min-h-11">
                        + Adicionar personagem
                      </Link>
                    </>
                  )}
                </div>
              )}

              {mesa.mensagens.map((m) => {
                if (m.tipo === "jogador") {
                  const p = personagemDe(m.personagemId);
                  // fala fora do jogo ((assim)): nota discreta no meio, sem cara de ação
                  if (m.texto.trim().startsWith("(("))
                    return (
                      <p key={m.id} className="surgir my-5 text-center text-sm italic text-muted">
                        <span className="not-italic text-muted/80">{m.autor || nomeDe(m.personagemId) || "Alguém"}, fora do jogo:</span>{" "}
                        {m.texto.trim().replace(/^\(\(|\)\)$/g, "").trim()}
                      </p>
                    );
                  return (
                    <div key={m.id} className="surgir my-6">
                      <p className="mb-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
                        {p && <Avatar mesa={mesa} personagem={p} tamanho="sm" />}
                        <span className="truncate font-semibold tracking-wide text-ambar">{nomeDe(m.personagemId) ?? (m.personagemId ? "Personagem que saiu" : "Fora do jogo")}</span>
                        {m.autor && m.autor !== nomeDe(m.personagemId) && <span className="truncate">· {m.autor}</span>}
                      </p>
                      <p className="whitespace-pre-wrap break-words border-l-2 border-ambar/50 pl-3 italic leading-relaxed text-foreground/85">{m.texto}</p>
                    </div>
                  );
                }
                if (m.tipo === "mestre")
                  return (
                    <div key={m.id} className="surgir my-6">
                      <Narracao texto={m.texto} />
                    </div>
                  );
                if (m.tipo === "dado" && dadosDoPedido(m).tipo === "pedido_teste")
                  return (
                    <PedidoTeste key={m.id} mensagem={m} personagem={personagemDe(pidDoPedido(m))} podeRolar={podeRolarPara(pidDoPedido(m))} rolar={acoes.rolarTeste} />
                  );
                if (m.tipo === "dado")
                  return (
                    <div key={m.id} className="my-5">
                      <CartaoDado mensagem={m} novo={mesa.novas.has(m.id)} />
                    </div>
                  );
                return (
                  <p key={m.id} className="titulo my-6 text-center text-sm text-muted">
                    ✦ {m.texto} ✦
                  </p>
                );
              })}

              {mesa.aoVivo && (
                <div className="my-6" aria-live="off">
                  <Narracao texto={mesa.aoVivo} escrevendo />
                </div>
              )}
              {mesa.ocupado && !mesa.aoVivo && (
                <p className="my-8 flex items-center justify-center gap-2 text-sm italic text-muted" role="status">
                  O mestre coça a barba e pensa
                  <Pontinhos />
                </p>
              )}
              {mesa.fila.length > 0 && (
                <div className="my-5 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted">
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
                          className={`flex min-h-9 items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 ${p.id === ativo?.id ? "border-ambar text-foreground" : "border-border hover:border-ambar/60"}`}
                        >
                          <Avatar mesa={mesa} personagem={p} tamanho="sm" />
                          {p.ficha.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {rodada && !mesa.ocupado && (
                    <button type="button" className="mt-2 min-h-9 text-xs text-ambar hover:underline" onClick={() => acoes.controle("forcar")}>
                      Narrar agora com as ações que já chegaram
                    </button>
                  )}
                </div>
              )}
              {mesa.erro && (
                <div className="my-5 flex items-start gap-3 rounded-md border border-sangue/60 bg-sangue/10 py-2 pl-4 pr-1 text-sm" role="alert">
                  <span className="mt-1.5 shrink-0 text-sangue" aria-hidden>
                    ⚠
                  </span>
                  <p className="min-w-0 flex-1 py-1">{mesa.erro}</p>
                  <button type="button" onClick={acoes.limparErro} className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:text-foreground" aria-label="Fechar o aviso">
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <form
            className="relative shrink-0 border-t border-border/70 bg-background/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            {longeDoFim && (
              <button
                type="button"
                onClick={() => irParaOFim(true)}
                className="surgir absolute bottom-full left-1/2 mb-3 min-h-10 -translate-x-1/2 rounded-full border border-ambar/60 bg-surface/95 px-4 text-sm text-ambar shadow-lg backdrop-blur hover:bg-surface-2"
              >
                {mesa.aoVivo || mesa.ocupado ? "O mestre está narrando ↓" : "Voltar ao fim ↓"}
              </button>
            )}
            <div className={`${COLUNA} px-4 sm:px-6`}>
              {mostrarSugestoes && <SugestoesCompactas sugestoes={sugestoes} aoEscolher={(t) => void enviar(t)} />}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <SeletorAtivo mesa={mesa} acoes={acoes} />
                <RoladorDados campanhaId={mesa.campanha.id} sistema={mesa.sistema} personagem={ativo} autor={mesa.eu.apelido} aoRolar={acoes.receberMensagem} />
                {mesa.ocupado && (
                  <button type="button" className="ml-auto min-h-10 px-1 text-muted hover:text-sangue sm:min-h-0" onClick={() => acoes.controle("cancelar")}>
                    Interromper o mestre
                  </button>
                )}
              </div>
              {aviso && (
                <p className="surgir mb-2 text-xs text-ambar" role="status">
                  {aviso}
                </p>
              )}
              {meuPendente ? (
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-1 text-sm" role="status">
                  <span className="text-ambar">🎲 Role o dado primeiro: o mestre não aceita fiado.</span>
                  <button type="button" onClick={irParaDado} className="min-h-10 shrink-0 rounded-md px-2 text-xs text-muted hover:text-ambar hover:underline">
                    ir para o dado ↑
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={campo}
                    value={acao}
                    onChange={(e) => setAcao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void enviar();
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    aria-label={ativo ? `Ação de ${ativo.ficha.nome}` : "Mensagem ao mestre"}
                    placeholder={
                      !ativo
                        ? "Fale com o mestre fora do jogo ((assim)), ou adicione um personagem."
                        : minhaNaFila
                          ? `${ativo.ficha.nome} já está na fila. Mande outra para complementar.`
                          : // curto para caber em 2 linhas no celular
                            `O que ${ativo.ficha.nome} faz? · ((assim)) fala fora do jogo`
                    }
                    className="campo field-sizing-content max-h-40 min-h-12 flex-1 resize-none py-3 leading-snug"
                  />
                  <button className="btn-ambar h-12 shrink-0 px-4" disabled={!acao.trim()} title="Enviar (Enter) · Shift+Enter quebra a linha">
                    Agir
                  </button>
                </div>
              )}
            </div>
          </form>
        </main>

        <aside className="hidden w-[330px] shrink-0 py-4 lg:flex">
          <div className="cartao flex min-h-0 flex-1 flex-col overflow-hidden">
            <Lateral mesa={mesa} acoes={acoes} />
          </div>
        </aside>
      </div>

      {lateralAberta && (
        <div id="painel-celular" className="surgir fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-background lg:hidden" role="dialog" aria-label="Painel da mesa">
          <Lateral mesa={mesa} acoes={acoes} />
        </div>
      )}
    </div>
  );
}
