"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AcoesTurno, acaoParaCampo, avisoDoDesfeito, type Desfeito } from "@/components/chat/acoes-turno";
import { AjudaAtalhos, rolarPedido, useAtalhos } from "@/components/chat/atalhos";
import { CartaoDado, decisaoAberta, DecisaoDoTeste } from "@/components/chat/cartao-dado";
import { SugestoesCompactas } from "@/components/chat/sugestoes-compactas";
import { Anteriormente } from "@/components/historia/anteriormente";
import { dadosFimSessao, foraDoJogo, montarCena, paragrafosDaNarracao, rastrearMudancas, separarFecho, textoParaOuvir } from "@/components/leitor/cena";
import { AcaoTopo, ATALHOS_LEITOR, LeitorCenas, type BlocoCauda, type ControleLeitor, type Prosa } from "@/components/leitor/leitor-cenas";
import { Mudancas } from "@/components/leitor/mudancas";
import { Aparte, BotaoPerguntar, FimDaNoite, MestreEscrevendo, ProsaCena } from "@/components/leitor/pecas";
import { agruparTurnos } from "@/components/leitor/turnos";
import { useTelaBaixa } from "@/components/leitor/altura";
import { MenuLeitura } from "@/components/leitor/menu-leitura";
import { useEscalaLeitor, usePreferenciasLeitor } from "@/components/leitor/preferencias";
import { AberturaCapitulo, EstiloProsa, Ornamento } from "@/components/leitor/prosa";
import { dadosDoPedido, PedidoTeste } from "@/components/historia/pedido-teste";
import { PainelCena } from "@/components/cena/painel-cena";
import { Diario } from "@/components/diario/diario";
import { FixarSelecao } from "@/components/fatos/fixar-selecao";
import { PainelFatos } from "@/components/fatos/painel-fatos";
import { useFatos, type ControleFatos } from "@/components/fatos/use-fatos";
import { PainelFicha } from "@/components/ficha/painel-ficha";
import { Avatar, emUsoPorOutroAparelho, ondeEsta, outroAparelhoCom, quemAgiu } from "@/components/grupo/avatar";
import { PainelGrupo } from "@/components/grupo/painel-grupo";
import { SeletorAtivo } from "@/components/grupo/seletor-ativo";
import { CabecalhoMesa } from "@/components/mesa/cabecalho-mesa";
import { RoladorDados } from "@/components/rolador/rolador-dados";
import { CartaoNoiteEncerrada, EncerrarNoite, FaixaFechando, IconeLua, remorsoUrgente } from "@/components/sessao/encerrar-noite";
import { chipsDaNoite, ehFimDaNoite, noiteAtual, noiteEncerrada, sessaoDaMesa } from "@/components/sessao/noite";
import { Ouvir, useLeituraAutomatica, VozNoPainel } from "@/components/voz/voz";
import * as identidade from "@/lib/cliente/identidade";
import { useMesa, type Mesa as EstadoVivo } from "@/lib/cliente/use-mesa";
import { parar as pararVoz } from "@/lib/cliente/voz";
import { INICIO, podeDecidir } from "@/lib/constantes";
import type { Mensagem } from "@/lib/db";
import type { EstadoMesa } from "@/lib/mesa";
import { AvisoDarkPack } from "@/components/aviso-dark-pack";
import { temaDoSistema } from "@/lib/temas";
import { Icone } from "@/components/icones";

// Casca da mesa de jogo: chat com o mestre, campo de ação e painéis laterais.
// Cada painel é um componente próprio em src/components/*, que recebe o estado vivo da mesa.
// Mesa local (hot-seat): vários personagens no mesmo aparelho; no modo rodada a vez passa sozinha para quem falta.
// Layout de aplicativo: ocupa a tela inteira (cobre a barra do site, como a mesa do modo história); só a conversa rola,
// o cabeçalho e o campo de ação ficam parados, e o painel lateral tem a própria rolagem.
// Dois jeitos de ler (preferência local): cena a cena (padrão; src/components/leitor) ou a rolagem contínua de sempre. Nos dois a
// cena é montada igual (src/components/leitor/cena.ts): prosa contínua, apartes ((fora do jogo)) em caixa e "o que mudou" em chips.

const NOMES_JANELAS: Record<string, string> = { five_hour: "janela de 5 h", seven_day: "semana", seven_day_opus: "semana (Opus)" };

/** Distância do fim (px) a partir da qual o leitor "subiu para reler" e a rolagem automática para de puxar. */
const LONGE_DO_FIM = 160;

/** Coluna de leitura: narração, ações, dados e o campo de ação alinhados pela mesma medida (~65 caracteres, cresce com a letra). */
const COLUNA = "leitor-medida mx-auto box-content";

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

/** A marcação inline de um parágrafo do mestre: **negrito**, *itálico* e falas (também usada pelo leitor cena a cena). */
function trechoNarracao(p: string): ReactNode {
  return p.split(MARCAS).map((t, j) =>
    j % 2 === 0 ? (
      <Fragment key={j}>{linhas(t)}</Fragment>
    ) : t.startsWith("**") ? (
      <strong key={j} className="font-semibold text-pergaminho">
        {linhas(t.slice(2, -2))}
      </strong>
    ) : t.startsWith("*") ? (
      <em key={j}>{linhas(t.slice(1, -1))}</em>
    ) : (
      <em key={j} className="leitor-fala">
        {t}
      </em>
    ),
  );
}

// tamanho, entrelinha e medida vêm do .leitor-prosa (src/components/leitor/prosa.tsx), iguais nos dois modos de leitura
const CLASSE_NARRACAO = "text-foreground/90";
const SEPARADOR_NARRACAO = <Ornamento />;
const PROSA: Prosa = { classe: CLASSE_NARRACAO, inline: (t) => trechoNarracao(t), separador: SEPARADOR_NARRACAO };

/** Markdown mínimo do mestre, em prosa de livro: parágrafos, **negrito**, *itálico*, falas, separadores (---) e ((apartes)). */
export function Narracao({ texto, escrevendo = false }: { texto: string; escrevendo?: boolean }) {
  return (
    <ProsaCena paragrafos={paragrafosDaNarracao(texto, -1)} inline={PROSA.inline} separador={SEPARADOR_NARRACAO} classe={CLASSE_NARRACAO} escrevendo={escrevendo} />
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

type Aba = "ficha" | "grupo" | "cena" | "anotacoes";

/** Abas Ficha/Grupo/Cena/Diário/📌 Fatos: a barra de abas fica parada e o conteúdo rola sozinho. */
function Lateral({
  mesa,
  acoes,
  fatos,
  aoAtalhos,
  aoEncerrar,
  aoRemorso,
}: {
  mesa: EstadoVivo;
  acoes: ReturnType<typeof useMesa>[1];
  fatos: ControleFatos;
  aoAtalhos: () => void;
  aoEncerrar: () => void;
  aoRemorso: (mensagemId: number | null) => void;
}) {
  const [aba, setAba] = useState<Aba>("ficha");
  const [anotacao, setAnotacao] = useState<"diario" | "fatos">("diario");
  const urgente = remorsoUrgente(mesa);
  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? mesa.personagens[0] ?? null;
  const abas: [Aba, ReactNode][] = [
    ["ficha", "Ficha"],
    ["grupo", `Grupo (${mesa.personagens.length})`],
    ["cena", mesa.cena.combate?.ativo ? "⚔ Cena" : "Cena"],
    ["anotacoes", "Anotações"],
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
            className={`-mb-px min-h-10 border-b-2 px-2 focus-visible:text-ambar focus-visible:outline-none ${aba === id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-5">
        {aba === "ficha" &&
          (ativo ? (
            <PainelFicha personagem={ativo} sistema={mesa.sistema} ocupado={mesa.ocupado} aoRemorso={aoRemorso} />
          ) : (
            <p className="text-sm text-muted">Nenhum personagem nesta mesa.</p>
          ))}
        {aba === "grupo" && <PainelGrupo mesa={mesa} acoes={acoes} />}
        {aba === "cena" && <PainelCena cena={mesa.cena} sistema={mesa.sistema} />}
        {aba === "anotacoes" && (
          <div className="flex min-h-0 flex-col">
            <div className="mb-3 flex shrink-0 gap-1 self-start rounded-md border border-border p-0.5 text-xs" role="tablist" aria-label="Anotações da mesa">
              {(["diario", "fatos"] as const).map((qual) => (
                <button
                  key={qual}
                  type="button"
                  role="tab"
                  aria-selected={anotacao === qual}
                  onClick={() => setAnotacao(qual)}
                  className={`rounded px-2.5 py-1.5 transition ${anotacao === qual ? "bg-ambar/15 text-ambar" : "text-muted hover:text-foreground"}`}
                >
                  {qual === "diario" ? "Diário" : `Fatos fixados (${fatos.fatos.length})`}
                </button>
              ))}
            </div>
            {anotacao === "diario" ? <Diario entradas={mesa.diario} fatos={fatos} /> : <PainelFatos controle={fatos} />}
          </div>
        )}
        <div className="mt-5 border-t border-border pt-3 text-xs text-muted">
          <p>
            {mesa.sistema.nomeCurto} · Mestre: {mesa.provedor}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3">
            <Link href={`/mesa/${mesa.campanha.id}/livro`} className="inline-flex min-h-9 items-center gap-1 text-ambar underline-offset-4 hover:underline">
              <Icone nome="scroll" /> Livro da campanha
            </Link>
            {/* no celular a engrenagem sai do cabeçalho (o título precisa do espaço) e mora aqui */}
            <Link href={`/mesa/${mesa.campanha.id}/ajustes`} className="inline-flex min-h-9 items-center gap-1 underline-offset-4 hover:text-ambar hover:underline sm:hidden">
              <span aria-hidden>⚙</span> Ajustes da mesa
            </Link>
            <button type="button" onClick={aoAtalhos} className="hidden min-h-9 items-center gap-1 hover:text-ambar [@media(pointer:fine)]:inline-flex">
              Atalhos <kbd className="rounded border border-border px-1">?</kbd>
            </button>
          </p>
          <VozNoPainel className="mt-2 sm:hidden" />
          <div className="mt-1 flex items-center gap-2 sm:hidden">
            <MenuLeitura acima esquerda />
            <span>Modo de leitura</span>
          </div>
          {/* celular: o "Encerrar a noite" mora aqui, em destaque (no cabeçalho ele vai para o menu ⋯) */}
          <button
            type="button"
            onClick={aoEncerrar}
            className={`mt-3 flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left sm:hidden ${urgente ? "border-sangue/60 bg-sangue/10" : "border-ambar/40 bg-ambar/5"}`}
            data-encerrar-painel
          >
            <span className={urgente ? "text-sangue" : "text-ambar"}>
              <IconeLua className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Encerrar a noite</span>
              <span className="block text-xs leading-snug">{urgente ? "Há Remorso para rolar · XP e marcador no livro" : mesa.sistema.id === "vtm5" ? "XP, Remorso e marcador no livro" : "XP e marcador no livro"}</span>
            </span>
          </button>
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
  const fatos = useFatos(mesa.campanha.id);
  const [acao, setAcao] = useState("");
  /** "💬 Perguntar": o campo manda a mensagem embrulhada em (( )), fora do jogo */
  const [perguntar, setPerguntar] = useState(false);
  const [lateralAberta, setLateralAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [longeDoFim, setLongeDoFim] = useState(false);
  const rolador = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const longeRef = useRef(false);
  const ultimoTopo = useRef(0);
  const campo = useRef<HTMLTextAreaElement>(null);
  const anterior = useRef<number | null>(null);
  const [ajuda, setAjuda] = useState(false);
  // leitor cena a cena (padrão) ou rolagem contínua; com a tela baixa demais para páginas (zoom 200 %, notebook a 175 %) a
  // rolagem entra sozinha e volta às páginas quando a altura voltar, a não ser que a pessoa insista nas páginas
  const { modo, paginasEmTelaBaixa } = usePreferenciasLeitor();
  const escala = useEscalaLeitor();
  /** o espaço do leitor (palco + barra), igual nos dois modos: é a altura que decide a tela baixa */
  const palco = useRef<HTMLDivElement>(null);
  const telaBaixa = useTelaBaixa(palco);
  const cenas = modo === "cenas" && !(telaBaixa && !paginasEmTelaBaixa);
  const leitor = useRef<ControleLeitor>(null);
  /** no leitor cena a cena: a pessoa está na última página da cena atual, toda à vista (as sugestões ganham destaque) */
  const [noFimDaCena, setNoFimDaCena] = useState(true);
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
  /** O mestre já tem o resultado do dado na fila (ação interna, invisível) e ainda não começou a narrar. */
  const lendoResultado = mesa.lendoResultado && !mesa.ocupado && pendentes.length === 0;
  // ação por um personagem que outro aparelho está usando agora: a pergunta "mandar mesmo assim?" é feita uma vez por personagem
  const confirmados = useRef(new Set<number>());
  /**
   * Este aparelho pode rolar o teste deste personagem? A máquina da taverna rola por qualquer um. Pela rede, só quem está com o
   * personagem (a presença deste aparelho, confirmada pelo servidor, tem que apontar para ele), o dono dele pelo apelido, ou um
   * aparelho sozinho na mesa que já escolheu alguém. Quem só assiste não rola por ninguém.
   */
  const podeRolarPara = (pid: number | null | undefined) => {
    if (!mesa.eu.clienteId || pid == null) return false;
    if (euLocal) return true;
    const minha = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId);
    if (mesa.eu.personagemId === pid && minha?.personagemId === pid) return true;
    const p = mesa.personagens.find((x) => x.id === pid);
    if (p?.jogador && p.jogador === mesa.eu.apelido) return true;
    return mesa.presenca.length <= 1 && mesa.eu.personagemId !== null;
  };
  /** Leva a um cartão de dado (pedido de teste): cena a cena, o leitor abre a cena e a página dele e deixa o "Rolar o dado" com o foco. */
  const irParaMensagem = (id: number) => {
    if (cenas) leitor.current?.irParaMensagem(id, () => document.querySelector<HTMLButtonElement>(`#pedido-${id} button[data-rolar]`)?.focus({ preventScroll: true }));
    else document.getElementById(`pedido-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const irParaDado = () => {
    if (meuPendente) irParaMensagem(meuPendente.id);
  };
  // fim da noite: o diálogo do ritual, o cartão "Noite N encerrada" e o "Continuar jogando" (guarda o id do marcador)
  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const fecharEncerrar = useCallback(() => setEncerrarAberto(false), []);
  const [continuouDe, setContinuouDe] = useState<number | null>(null);
  const encerrada = noiteEncerrada(mesa.mensagens);
  const sessaoCampanha = sessaoDaMesa(mesa);
  const cartaoNoite = encerrada && continuouDe !== encerrada.id && !mesa.fechando && !mesa.ocupado && !meuPendente ? encerrada : null;
  const noiteNova = encerrada && continuouDe === encerrada.id ? (encerrada.sessao ? encerrada.sessao + 1 : noiteAtual(mesa.mensagens, sessaoCampanha)) : null;
  const chipsNoite = useMemo(() => (cartaoNoite ? chipsDaNoite(mesa.mensagens) : []), [cartaoNoite, mesa.mensagens]);
  /** Quem tem os botões da decisão depois do dado (o aparelho que rolou; com ele fora, a máquina da taverna). */
  const decidePor = (m: (typeof mesa.mensagens)[number], pid: number | null | undefined) => {
    const dec = decisaoAberta(m.dados as { decisao?: unknown } | null);
    return dec ? podeDecidir(dec, { clienteId: mesa.eu.clienteId, local: euLocal }, mesa.presenca, pid ?? null) : false;
  };
  /** Pergunta fora do jogo direto ao mestre (o campo fica travado enquanto há dado pendente). */
  const perguntarAoMestre = (texto: string) => {
    if (mesa.semSinal) return;
    void acoes.enviarAcao(texto);
  };

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
  }, [cenas]);

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

  // narração em voz alta: lê as narrações novas (com a leitura automática ligada) e cala ao sair da mesa
  useLeituraAutomatica(mesa.mensagens);

  // painel do celular (tela cheia): Esc fecha
  useEffect(() => {
    if (!lateralAberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLateralAberta(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [lateralAberta]);

  /** Envia o campo, ou uma ação sugerida (sem apagar o que o jogador estava digitando). */
  async function enviar(sugerida?: string) {
    const bruto = (sugerida ?? acao).trim();
    if (!bruto || meuPendente || mesa.semSinal) return;
    // pergunta ao mestre: vai entre (( )), que ele já trata como fora do jogo
    const pergunta = sugerida === undefined && perguntar;
    const texto = pergunta && !foraDoJogo(bruto) ? `(( ${bruto} ))` : bruto;
    // o personagem ativo está nas mãos de outro aparelho agora (mesa mista): confirma uma vez antes de agir por ele
    const outro = ativo && !texto.startsWith("((") ? outroAparelhoCom(mesa, ativo.id) : null;
    if (outro && ativo && !confirmados.current.has(ativo.id)) {
      if (!window.confirm(`${outro.apelido} já está jogando com ${ativo.ficha.nome} agora. Mandar mesmo assim?`)) return;
      confirmados.current.add(ativo.id);
    }
    pararVoz();
    // sem sinal, enviarAcao avisa e devolve false: o texto fica no campo
    if (!(await acoes.enviarAcao(texto))) return;
    if (sugerida === undefined) {
      setAcao("");
      setPerguntar(false);
    }
    // no leitor cena a cena a ação vira a cena nova sozinha
    if (!cenas) irParaOFim(true);
    // hot-seat no modo rodada: a vez passa para o próximo que ainda não agiu (na ordem do grupo)
    if (!rodada || !ativo || texto.startsWith("((")) return;
    const ja = new Set(agiram).add(ativo.id);
    const i = mesa.personagens.findIndex((p) => p.id === ativo.id);
    const faltando = [...mesa.personagens.slice(i + 1), ...mesa.personagens.slice(0, i)].filter((p) => !ja.has(p.id));
    // só passa para quem divide este teclado: nunca para um personagem em uso em outro aparelho e, pela rede,
    // só para personagens sem dono ou do mesmo jogador
    const proximo = faltando.find((p) => !emUsoPorOutroAparelho(mesa, p.id) && (euLocal || !p.jogador || p.jogador === mesa.eu.apelido));
    if (proximo) {
      acoes.escolherPersonagem(proximo.id);
      setAviso(`Vez de ${proximo.ficha.nome}. Passe o teclado!`);
    } else if (!faltando.length) {
      setAviso("Todo mundo agiu. O mestre vai narrar.");
    } else {
      const quem = outroAparelhoCom(mesa, faltando[0].id);
      setAviso(quem ? `Esperando ${faltando[0].ficha.nome}, que está ${ondeEsta(quem, euLocal)}.` : `Esperando ${faltando[0].ficha.nome}.`);
    }
  }

  /** 🌙 Encerrar a noite (cabeçalho, menu ⋯ ou pé do painel): abre o diálogo do ritual. */
  function aoEncerrar() {
    setLateralAberta(false);
    setEncerrarAberto(true);
  }

  /** "Rolar Remorso" na ficha: o pedido de teste vira um cartão de dado; fecha o painel e leva até ele quando chegar. */
  function aoRemorso(mensagemId: number | null) {
    setLateralAberta(false);
    if (mensagemId !== null) setTimeout(() => irParaMensagem(mensagemId), 350);
  }

  /** Depois de desfazer: a ação do personagem ativo volta ao campo para ser reescrita (refazer não devolve nada). */
  function aoDesfazer(r: Desfeito, refazer: boolean) {
    pararVoz();
    setContinuouDe(null);
    const texto = refazer ? null : acaoParaCampo(r, mesa.eu.personagemId);
    if (texto) {
      setAcao(texto);
      if (window.matchMedia("(pointer: fine)").matches) setTimeout(() => campo.current?.focus(), 50);
    }
    setAviso(avisoDoDesfeito(r, refazer, Boolean(texto), !refazer && encerrada !== null));
  }

  /** Erro do provedor com instantâneo: "Tentar de novo" reenfileira as ações do turno; "Reescrever" devolve a ação ao campo. */
  async function aposErro(refazer: boolean) {
    const resp = await fetch(`/api/campanhas/${mesa.campanha.id}/desfazer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refazer ? { refazer: true } : {}),
    }).catch(() => null);
    const corpo = resp ? ((await resp.json().catch(() => ({}))) as Desfeito & { erro?: string }) : null;
    if (!resp?.ok || !corpo) {
      setAviso(corpo?.erro ?? "Não deu para tentar de novo. Confira a conexão.");
      return;
    }
    acoes.limparErro();
    aoDesfazer(corpo, refazer);
  }

  // desfazer/refazer só com o mestre quieto e nada esperando na fila
  const ultimoMestre = mesa.mensagens.findLast((m) => m.tipo === "mestre")?.id ?? null;
  const podeDesfazer = !mesa.ocupado && !mesa.aoVivo && mesa.fila.length === 0;

  useAtalhos({
    totalSugestoes: mostrarSugestoes ? Math.min(9, sugestoes.length) : 0,
    escolherSugestao: (i) => sugestoes[i] && void enviar(sugestoes[i].texto),
    rolarTeste: () => {
      if (!cenas) return rolarPedido(meuPendente?.id);
      if (!meuPendente) return false;
      const id = meuPendente.id;
      leitor.current?.irParaMensagem(id, () => rolarPedido(id, false));
      return true;
    },
    focarCampo: () => campo.current?.focus(),
    fechar: () => setAjuda(false),
    alternarAjuda: () => setAjuda((v) => !v),
  });

  const vazia = mesa.mensagens.length === 0 && !mesa.ocupado && !mesa.fila.length;
  // modo 📜 Rolagem: a história inteira, turno a turno, montada como no leitor
  const cenasRolagem = useMemo(() => {
    if (cenas) return [];
    const rastro = rastrearMudancas(mesa.mensagens);
    return agruparTurnos(mesa.mensagens).map((turno) => ({ turno, cena: montarCena(turno, rastro) }));
  }, [cenas, mesa.mensagens]);
  const nomeDe = (id: number | null) => mesa.personagens.find((p) => p.id === id)?.ficha.nome;
  const personagemDe = (id: number | null) => mesa.personagens.find((p) => p.id === id) ?? null;
  const linkNovo = `/mesa/${mesa.campanha.id}/personagens/novo`;
  const caido = ativo ? ativo.ficha.pvMax > 0 && ativo.ficha.pv <= 0 : false;

  /** Ação de jogador na conversa que rola. Fala fora do jogo ((assim)) vira nota discreta no meio, sem cara de ação. */
  function desenharAcao(m: Mensagem) {
    const p = personagemDe(m.personagemId);
    if (foraDoJogo(m.texto))
      return (
        <Aparte key={m.id} quem={m.autor || nomeDe(m.personagemId) || "Alguém"} className="surgir my-5! text-[0.95rem]">
          <p>{m.texto.trim().replace(/^\(\(|\)\)$/g, "").trim()}</p>
        </Aparte>
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

  /** Cartões que não são narração nem ação: abertura de capítulo, pedido de teste, dado, aviso do sistema. */
  function desenharItem(m: Mensagem) {
    const d = (m.dados ?? {}) as { tipo?: string; titulo?: string | null; local?: string | null; momento?: string | null };
    const fim = dadosFimSessao(m);
    if (fim) return <FimDaNoite key={m.id} sessao={fim.sessao} data={fim.data} />;
    if (m.tipo === "dado" && d.tipo === "cena_titulo") return <AberturaCapitulo key={m.id} titulo={d.titulo} local={d.local} momento={d.momento} />;
    if (m.tipo === "dado" && dadosDoPedido(m).tipo === "pedido_teste")
      return (
        // sem sinal, o cartão inteiro (Rolar, Aceitar, Rerrolar) fica inerte até a conexão voltar
        <div key={m.id} inert={mesa.semSinal || undefined} className={mesa.semSinal ? "opacity-60" : undefined}>
          <PedidoTeste
            mensagem={m}
            personagem={personagemDe(pidDoPedido(m))}
            podeRolar={podeRolarPara(pidDoPedido(m))}
            podeDecidir={decidePor(m, pidDoPedido(m))}
            clienteId={mesa.eu.clienteId}
            rolar={acoes.rolarTeste}
            perguntar={perguntarAoMestre}
          />
        </div>
      );
    if (m.tipo === "dado") {
      // teste do modo automático com oferta de rerrolar: o mestre já narrou e corrige se a pessoa rerrolar
      const dt = (m.dados ?? {}) as Record<string, unknown>;
      const decAuto = dt.tipo === "teste" ? decisaoAberta(dt) : null;
      const pid = (dt.personagemId as number | undefined) ?? m.personagemId;
      const p = decAuto ? personagemDe(pid ?? null) : null;
      return (
        <div key={m.id} className="my-5" inert={(decAuto && mesa.semSinal) || undefined}>
          <CartaoDado mensagem={m} novo={mesa.novas.has(m.id)} />
          {decAuto && (
            <DecisaoDoTeste
              mensagemId={m.id}
              decisao={decAuto}
              r={dt as { dados?: number[]; dadosFome?: number[] }}
              podeDecidir={decidePor(m, pid)}
              quem={p?.jogador || p?.ficha.nome || "quem joga"}
              clienteId={mesa.eu.clienteId}
            />
          )}
        </div>
      );
    }
    return (
      <p key={m.id} className="titulo divisor-tema my-6 text-center text-sm text-muted">
        {m.texto}
      </p>
    );
  }

  /** A ação no topo da cena (leitor cena a cena), discreta. */
  function acaoTopo(m: Mensagem) {
    const p = personagemDe(m.personagemId);
    const nome = nomeDe(m.personagemId) ?? (m.personagemId ? "Personagem que saiu" : null);
    return <AcaoTopo nome={nome} icone={p ? <Avatar mesa={mesa} personagem={p} tamanho="sm" /> : undefined} autor={m.autor} texto={m.texto} />;
  }

  // o "agora" que ainda não é mensagem: mestre pensando, ações na fila (com a rodada) e erro
  const cauda: BlocoCauda[] = [];
  // cena a cena: as ações na fila ficam no topo do palco, como a ação da cena (o mestre escrevendo vem logo abaixo)
  const filaNoTopo = cenas && mesa.fila.length > 0 && !(rodada && !mesa.ocupado);
  if (filaNoTopo)
    cauda.push({
      chave: "fila",
      no: (
        <div className="leitor-topo mb-2 space-y-1.5">
          {mesa.fila.map((a) =>
            a.acao === INICIO ? null : (
              <Fragment key={a.id}>
                {acaoTopo({ id: -a.id, tipo: "jogador", texto: a.acao, dados: null, personagemId: a.personagemId, autor: a.autor, criadaEm: "" })}
              </Fragment>
            ),
          )}
          {mesa.fila.some((a) => a.acao !== INICIO) && <div className="mt-3 h-px bg-linear-to-r from-border/80 via-border/30 to-transparent" aria-hidden />}
        </div>
      ),
    });
  if (mesa.ocupado && !mesa.aoVivo)
    cauda.push({
      chave: "pensando",
      no: cenas ? (
        <MestreEscrevendo frase={mesa.fila.some((a) => a.acao === INICIO) ? "O mestre arruma a mesa e abre o livro" : undefined} />
      ) : (
        <p className="my-8 flex items-center justify-center gap-2 text-sm italic text-muted" role="status">
          O mestre coça a barba e pensa
          <Pontinhos />
        </p>
      ),
    });
  // o dado já foi rolado e o resultado espera na fila (invisível): sem isto o palco ficava mudo entre o dado e a narração
  else if (lendoResultado)
    cauda.push({
      chave: "lendo",
      no: cenas ? (
        <MestreEscrevendo frase="O mestre lê o resultado" />
      ) : (
        <p className="my-8 flex items-center justify-center gap-2 text-sm italic text-muted" role="status" data-lendo-resultado>
          O mestre lê o resultado…
        </p>
      ),
    });
  if (mesa.fila.length > 0 && !filaNoTopo)
    cauda.push({
      chave: "fila",
      no: (
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
      ),
    });
  if (mesa.erro)
    cauda.push({
      chave: "erro",
      no: (
        <div className="my-5 flex items-start gap-3 rounded-md border border-sangue/60 bg-sangue/10 py-2 pl-4 pr-1 text-sm" role="alert">
          <span className="mt-1.5 shrink-0 text-sangue" aria-hidden>
            ⚠
          </span>
          <div className="min-w-0 flex-1">
            <p className="py-1">{mesa.erro}</p>
            {(mesa.erroInfo?.refazer || mesa.erroInfo?.acao === "config") && (
              <div className="mb-1 mt-1 flex flex-wrap gap-2" data-erro-acoes>
                {mesa.erroInfo?.refazer && (
                  <>
                    <button type="button" data-tentar-de-novo className="btn-ambar min-h-9 px-3 text-xs" onClick={() => void aposErro(true)}>
                      ↻ Tentar de novo
                    </button>
                    <button type="button" className="btn-borda min-h-9 px-3 text-xs" onClick={() => void aposErro(false)}>
                      ✎ Reescrever a ação
                    </button>
                  </>
                )}
                {mesa.erroInfo?.acao === "config" && (
                  <a href="/config" className="btn-borda min-h-9 px-3 text-xs">
                    Abrir Configurações
                  </a>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={acoes.limparErro} className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:text-foreground" aria-label="Fechar o aviso">
            ✕
          </button>
        </div>
      ),
    });

  const telaVazia = vazia ? (
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
  ) : null;

  return (
    <div data-tema={temaDoSistema(mesa.sistema.id)} className="fundo-tema fixed inset-0 z-30 flex flex-col overflow-hidden text-foreground" style={escala as CSSProperties}>
      <EstiloProsa />
      {/* tela baixa (baixo:): cabeçalho de 44 px, só o nome da campanha */}
      <CabecalhoMesa
        mesa={mesa}
        acoes={acoes}
        aoEncerrar={aoEncerrar}
        telaBaixa={telaBaixa && modo === "cenas"}
        fimDaNoite={cartaoNoite !== null}
        className="border-border/70 bg-background/90 backdrop-blur"
        painel={
          // celular: abre a ficha/painéis em tela cheia; mostra só as iniciais e a vida, para caber em 375px
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
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 lg:gap-6 lg:px-4">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* a coluna de prosa: um véu da superfície do tema atrás do texto, sem caixa (a textura do tema continua aparecendo) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 48% 75% at 50% 42%, color-mix(in srgb, var(--surface) 55%, transparent), transparent 78%)" }}
            aria-hidden
          />
          {/* conexão caída há mais de 3 s: a faixa some sozinha quando o fluxo de eventos volta */}
          {mesa.semSinal && (
            <div role="alert" data-sem-sinal className="relative z-10 flex shrink-0 items-center justify-center gap-2 border-b border-sangue/50 bg-sangue/15 px-4 py-2 text-center text-sm text-foreground">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-sangue" aria-hidden />
              Sem sinal da taverna — tentando de novo…
            </div>
          )}
          <Anteriormente
            campanhaId={mesa.campanha.id}
            nome={mesa.campanha.nome}
            mensagens={mesa.mensagens}
            cena={mesa.cena}
            diario={mesa.diario}
            aoContinuar={() => !cenas && irParaOFim(true)}
          />
          {/* o espaço do leitor, nos dois modos: a altura dele decide a tela baixa (useTelaBaixa) */}
          <div ref={palco} className="relative flex min-h-0 flex-1 flex-col" data-espaco-leitor>
            {cenas ? (
              <LeitorCenas
                ref={leitor}
                mensagens={mesa.mensagens}
                aoVivo={mesa.aoVivo}
                ocupado={mesa.ocupado}
                esperandoNovoTurno={mesa.fila.some((a) => a.acao !== INICIO) && pendentes.length === 0}
                prosa={PROSA}
                acao={acaoTopo}
                item={desenharItem}
                cauda={cauda}
                vazio={telaVazia}
                largura="leitor-medida"
                linkReler={`/mesa/${mesa.campanha.id}/livro`}
                ferramentas={(t) =>
                  podeDesfazer && ultimoMestre !== null && t.itens.some((m) => m.id === ultimoMestre) ? (
                    <AcoesTurno campanhaId={mesa.campanha.id} aoConcluir={aoDesfazer} aoErro={setAviso} compacto fechamento={t.itens.some(ehFimDaNoite)} />
                  ) : null
                }
                aoMudarFim={setNoFimDaCena}
                destaque={meuPendente?.id ?? null}
              />
            ) : (
              <div ref={rolador} onScroll={aoRolar} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div ref={conteudo} className={`${COLUNA} px-4 pb-8 pt-6 sm:px-6`}>
                  {telaVazia}

                  {/* turno a turno, montado como no leitor: prosa contínua, cartões no lugar e "o que mudou" no fim */}
                  {cenasRolagem.map(({ turno, cena }, t) => {
                    const ultimo = t === cenasRolagem.length - 1;
                    const { corpo, fecho } = separarFecho(cena.pecas);
                    const ultimaProsa = corpo.findLast((p) => p.tipo === "prosa");
                    const comFerramentas = ultimo && podeDesfazer && ultimoMestre !== null && turno.itens.some((m) => m.id === ultimoMestre);
                    return (
                      <Fragment key={turno.chave}>
                        {turno.acoes.map(desenharAcao)}
                        {corpo.map((p) =>
                          p.tipo === "prosa" ? (
                            <div key={p.chave} className="surgir group my-6">
                              <ProsaCena paragrafos={p.paragrafos} inline={PROSA.inline} separador={SEPARADOR_NARRACAO} classe={CLASSE_NARRACAO} />
                              <div className="mt-1 flex min-h-8 flex-wrap items-center justify-end gap-1">
                                {comFerramentas && p === ultimaProsa && (
                                  <AcoesTurno
                                    campanhaId={mesa.campanha.id}
                                    aoConcluir={aoDesfazer}
                                    aoErro={setAviso}
                                    className="mr-auto -ml-2.5"
                                    fechamento={turno.itens.some(ehFimDaNoite)}
                                  />
                                )}
                                {textoParaOuvir(p.paragrafos) && <Ouvir id={`msg-${p.ids[0]}`} texto={textoParaOuvir(p.paragrafos)} />}
                              </div>
                            </div>
                          ) : (
                            desenharItem(p.m)
                          ),
                        )}
                        {cena.mudancas.length > 0 && <Mudancas grupos={cena.mudancas} className="mb-8" />}
                        {fecho.map((p) => (p.tipo === "item" ? desenharItem(p.m) : null))}
                      </Fragment>
                    );
                  })}

                  {mesa.aoVivo && (
                    <div className="my-6" aria-live="off">
                      <Narracao texto={mesa.aoVivo} escrevendo />
                    </div>
                  )}
                  {cauda.map((c) => (
                    <Fragment key={c.chave}>{c.no}</Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            className="relative shrink-0 border-t border-border/50 bg-background/85 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            {longeDoFim && !cenas && (
              <button
                type="button"
                onClick={() => irParaOFim(true)}
                className="surgir absolute bottom-full left-1/2 mb-3 min-h-10 -translate-x-1/2 rounded-full border border-ambar/60 bg-surface/95 px-4 text-sm text-ambar shadow-lg backdrop-blur hover:bg-surface-2"
              >
                {mesa.aoVivo || mesa.ocupado ? "O mestre está narrando ↓" : "Voltar ao fim ↓"}
              </button>
            )}
            {/* aviso curto (vez de quem, turno desfeito) flutua por cima do palco, sem empurrar nada */}
            {aviso && (
              <p
                className="surgir pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 max-w-[calc(100%-2rem)] -translate-x-1/2 truncate rounded-full border border-ambar/50 bg-surface/95 px-4 py-1.5 text-sm text-ambar shadow-lg"
                role="status"
              >
                {aviso}
              </p>
            )}
            {/* noite encerrada: o cartão fica no lugar do campo até alguém escolher continuar; fechando: a faixa */}
            {cartaoNoite ? (
              <div className={`${COLUNA} px-4 py-2 sm:px-6`}>
                <CartaoNoiteEncerrada
                  mesa={mesa}
                  sessao={cartaoNoite.sessao}
                  data={cartaoNoite.data}
                  chips={chipsNoite}
                  aoContinuar={() => {
                    setContinuouDe(cartaoNoite.id);
                    if (window.matchMedia("(pointer: fine)").matches) setTimeout(() => campo.current?.focus(), 50);
                  }}
                />
              </div>
            ) : mesa.fechando ? (
              <div className={`${COLUNA} px-4 py-2 sm:px-6`}>
                <FaixaFechando n={noiteAtual(mesa.mensagens, sessaoCampanha)} />
              </div>
            ) : (
            <div className={`${COLUNA} px-4 sm:px-6`}>
              {/* espaço das sugestões reservado (três linhas baixas no desktop; uma no celular e na tela baixa, sem reserva): o palco não muda de altura a cada turno */}
              {ativo && (
                <div className="mb-1 flex min-h-10 flex-col justify-end largo:min-h-[90px]" data-vaga-sugestoes>
                  {mostrarSugestoes ? (
                    <SugestoesCompactas sugestoes={sugestoes} desabilitado={mesa.semSinal} discretas={cenas && !noFimDaCena} aoEscolher={(t) => void enviar(t)} />
                  ) : (
                    <div className="flex min-h-10 items-center justify-center gap-3 text-center text-[13px] italic text-muted largo:min-h-7">
                      {lendoResultado ? (
                        "O mestre lê o resultado…"
                      ) : mesa.ocupado ? (
                        <>
                          <span>O mestre coça a barba e escreve…</span>
                          <button
                            type="button"
                            className="min-h-9 rounded-md px-2 not-italic text-muted hover:bg-sangue/10 hover:text-sangue sm:min-h-7"
                            onClick={() => acoes.controle("cancelar")}
                            title="Interromper o mestre"
                          >
                            ■ interromper
                          </button>
                        </>
                      ) : meuPendente ? (
                        "Primeiro o dado. As ideias voltam depois."
                      ) : minhaNaFila ? (
                        `${ativo.ficha.nome} já está na fila. O mestre espera o resto.`
                      ) : pendentes.length > 0 ? (
                        "Esperando alguém rolar o dado."
                      ) : (
                        "Sem sugestões desta vez: escreva o que o personagem faz."
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="mb-1 flex min-h-7 flex-wrap items-center gap-2 text-xs">
                <SeletorAtivo mesa={mesa} acoes={acoes} />
                <RoladorDados
                  campanhaId={mesa.campanha.id}
                  sistema={mesa.sistema}
                  personagem={ativo}
                  autor={mesa.eu.apelido}
                  aoRolar={acoes.receberMensagem}
                  pendente={
                    meuPendente
                      ? { teste: dadosDoPedido(meuPendente).teste ?? "um teste", alvo: dadosDoPedido(meuPendente).alvo ?? null, irPara: irParaDado }
                      : null
                  }
                />
                {mesa.ocupado && !ativo && (
                  <button type="button" className="ml-auto min-h-10 px-1 text-muted hover:text-sangue sm:min-h-0" onClick={() => acoes.controle("cancelar")}>
                    Interromper o mestre
                  </button>
                )}
              </div>
              {meuPendente ? (
                // a barra inteira leva ao dado (alvo grande no celular), igual à do modo história
                <button
                  type="button"
                  onClick={irParaDado}
                  className="surgir group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-1.5 text-left text-sm shadow-[0_0_24px_-12px_var(--ambar)] transition hover:border-ambar hover:bg-ambar/15 focus-visible:border-ambar focus-visible:outline-none"
                  data-ir-para-dado
                >
                  <span className="min-w-0 text-ambar">
                    <Icone nome="dice" />
                    Role o dado primeiro: o mestre não aceita fiado.
                  </span>
                  <span className="shrink-0 rounded-md bg-ambar px-3 py-1.5 text-xs font-semibold text-[#1a120c] transition group-hover:bg-[#f0b762]">Ir para o dado ↑</span>
                </button>
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
                    aria-label={perguntar ? "Pergunta ao mestre, fora do jogo" : ativo ? `Ação de ${ativo.ficha.nome}` : "Mensagem ao mestre"}
                    placeholder={
                      perguntar
                        ? "Pergunte ao mestre (regras, opções, chances)…"
                        : !ativo
                          ? "Fale com o mestre fora do jogo ((assim)), ou adicione um personagem."
                          : minhaNaFila
                            ? `${ativo.ficha.nome} já está na fila. Mande outra para complementar.`
                            : noiteNova
                              ? `Noite ${noiteNova} — o que ${ativo.ficha.nome} faz?`
                              : `O que ${ativo.ficha.nome} faz?`
                    }
                    className={`campo field-sizing-content max-h-36 min-h-11 flex-1 resize-none py-2.5 leading-snug ${perguntar ? "border-dashed! border-ambar/60! bg-ambar/5!" : ""}`}
                    data-campo-acao
                  />
                  <BotaoPerguntar
                    ligado={perguntar}
                    aoAlternar={() => {
                      setPerguntar((v) => !v);
                      campo.current?.focus();
                    }}
                  />
                  <button
                    className="btn-ambar h-11 shrink-0 px-4"
                    disabled={!acao.trim() || mesa.semSinal}
                    title={mesa.semSinal ? "Sem sinal da taverna: espere a conexão voltar" : "Enviar (Enter) · Shift+Enter quebra a linha"}
                  >
                    {perguntar ? "Enviar" : "Agir"}
                  </button>
                </div>
              )}
            </div>
            )}
          </form>
        </main>

        <aside className="hidden w-[330px] shrink-0 py-4 lg:flex">
          <div className="cartao flex min-h-0 flex-1 flex-col overflow-hidden">
            <Lateral mesa={mesa} acoes={acoes} fatos={fatos} aoAtalhos={() => setAjuda(true)} aoEncerrar={aoEncerrar} aoRemorso={aoRemorso} />
          </div>
        </aside>
      </div>

      {lateralAberta && (
        <div id="painel-celular" className="surgir fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-background lg:hidden baixo:top-11" role="dialog" aria-label="Painel da mesa">
          <Lateral mesa={mesa} acoes={acoes} fatos={fatos} aoAtalhos={() => setAjuda(true)} aoEncerrar={aoEncerrar} aoRemorso={aoRemorso} />
        </div>
      )}

      <EncerrarNoite mesa={mesa} acoes={acoes} aberto={encerrarAberto} aoFechar={fecharEncerrar} irParaMensagem={irParaMensagem} />
      <AjudaAtalhos aberta={ajuda} aoFechar={() => setAjuda(false)} extras={cenas ? ATALHOS_LEITOR : []} />
      <FixarSelecao controle={fatos} />
    </div>
  );
}
