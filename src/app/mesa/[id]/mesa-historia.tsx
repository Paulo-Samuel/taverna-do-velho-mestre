"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AcoesTurno, acaoParaCampo, avisoDoDesfeito, type Desfeito } from "@/components/chat/acoes-turno";
import { AjudaAtalhos, rolarPedido, useAtalhos } from "@/components/chat/atalhos";
import { Anteriormente } from "@/components/historia/anteriormente";
import { CabecalhoCena } from "@/components/historia/cabecalho-cena";
import { CartaoAcao, type DesfechoAcao } from "@/components/historia/cartao-acao";
import { CeuEstrelado } from "@/components/historia/ceu-estrelado";
import { Codex, type AbaCodex } from "@/components/historia/codex";
import { corDoNome, mapaDeNomes } from "@/components/historia/cores";
import { fonteGotica } from "@/components/historia/fonte-gotica";
import { LinhaDado } from "@/components/historia/linha-dado";
import { Musica } from "@/components/historia/musica";
import { NarracaoLivro, montarDestaque } from "@/components/historia/narracao-livro";
import { PainelAcao } from "@/components/historia/painel-acao";
import { PedidoTeste, dadosDoPedido } from "@/components/historia/pedido-teste";
import { Retrato } from "@/components/historia/retrato";
import { Presenca } from "@/components/presenca/presenca";
import { Convite } from "@/components/presenca/convite";
import { BotaoVoz, Ouvir, useLeituraAutomatica } from "@/components/voz/voz";
import * as identidade from "@/lib/cliente/identidade";
import { parar as pararVoz } from "@/lib/cliente/voz";
import { useMesa } from "@/lib/cliente/use-mesa";
import { INICIO, RESULTADO_TESTE } from "@/lib/constantes";
import type { Mensagem } from "@/lib/db";
import type { EstadoMesa } from "@/lib/mesa";

// Mesa do modo história, no estilo de um livro: céu estrelado, coluna central de texto corrido, cabeçalhos de
// capítulo, ações dos jogadores em cartões, o dado 3D quando o mestre pede um teste e as ações sugeridas no rodapé.
// O códex (ficha, missões, pessoas, lugares, grupo) fica numa gaveta à esquerda. A mesa avançada continua em mesa.tsx.

/** Distância do fim (px) a partir da qual o leitor "subiu" e a rolagem automática para. */
const LONGE_DO_FIM = 160;

/** ?personagem=<id> (vindo de "novo personagem"): grava como ativo antes do useMesa ler, para a presença já nascer certa. */
function assumirDaUrl(estado: EstadoMesa, valor: string | null) {
  if (typeof window === "undefined") return;
  const pid = Number(valor);
  if (pid && estado.personagens.some((p) => p.id === pid)) identidade.salvarPersonagemAtivo(estado.campanha.id, pid);
}

/**
 * Liga cada ação de jogador ao teste que ela provocou (o primeiro pedido de teste daquele personagem depois da ação),
 * para o cartão da ação mostrar "Perícia · Sucesso" no canto.
 */
function desfechosDasAcoes(mensagens: Mensagem[]): Map<number, DesfechoAcao> {
  const desfechos = new Map<number, DesfechoAcao>();
  const abertas = new Map<number, number>(); // personagemId → id da última ação ainda sem teste
  for (const m of mensagens) {
    if (m.tipo === "sistema") abertas.clear();
    if (m.tipo === "jogador" && m.personagemId !== null) abertas.set(m.personagemId, m.id);
    if (m.tipo !== "dado") continue;
    const d = (m.dados ?? {}) as Record<string, unknown>;
    const pid = typeof d.personagemId === "number" ? d.personagemId : m.personagemId;
    if (pid === null) continue;
    const acao = abertas.get(pid);
    if (acao === undefined) continue;
    if (d.tipo === "pedido_teste" && d.status !== "cancelado") {
      const r = (d.resultado ?? {}) as { grau?: string };
      desfechos.set(acao, { teste: String(d.teste ?? "Teste"), grau: d.status === "resolvido" ? (r.grau ?? null) : null });
      abertas.delete(pid);
    } else if (d.tipo === "teste") {
      desfechos.set(acao, { teste: String(d.teste ?? "Teste"), grau: typeof d.grau === "string" ? d.grau : null });
      abertas.delete(pid);
    }
  }
  return desfechos;
}

export function MesaHistoria({ estadoInicial, comecarSozinho }: { estadoInicial: EstadoMesa; comecarSozinho: boolean }) {
  // roda uma vez, na renderização, antes dos efeitos do useMesa (como na mesa avançada)
  const busca = useSearchParams();
  useState(() => assumirDaUrl(estadoInicial, busca.get("personagem")));
  const [mesa, acoes] = useMesa(estadoInicial);
  const [codexAberto, setCodexAberto] = useState(false);
  const [abaCodex, setAbaCodex] = useState<AbaCodex>("personagem");
  const [aviso, setAviso] = useState<string | null>(null);
  const [longeDoFim, setLongeDoFim] = useState(false);
  const [vistas, setVistas] = useState(estadoInicial.mensagens.length);
  const rolador = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const longeRef = useRef(false);
  const ultimoTopo = useRef(0);
  const campo = useRef<HTMLTextAreaElement>(null);
  const anterior = useRef<number | null>(null);
  /** ação devolvida ao campo depois de desfazer o turno */
  const [preencher, setPreencher] = useState<{ texto: string; n: number } | null>(null);
  const [ajuda, setAjuda] = useState(false);

  const ativo = mesa.personagens.find((p) => p.id === mesa.eu.personagemId) ?? null;
  const euLocal = mesa.presenca.find((j) => j.clienteId === mesa.eu.clienteId)?.local ?? false;
  const rodada = mesa.campanha.modo === "rodada";
  const total = mesa.mensagens.length;

  const destaque = useMemo(() => montarDestaque(mapaDeNomes(mesa.personagens, mesa.diario)), [mesa.personagens, mesa.diario]);
  const desfechos = useMemo(() => desfechosDasAcoes(mesa.mensagens), [mesa.mensagens]);
  const pendentes = useMemo(
    () => mesa.mensagens.filter((m) => m.tipo === "dado" && dadosDoPedido(m).tipo === "pedido_teste" && dadosDoPedido(m).status === "pendente"),
    [mesa.mensagens],
  );
  const pidDoPedido = (m: Mensagem) => dadosDoPedido(m).personagemId ?? m.personagemId;
  const meuPendente = ativo ? (pendentes.find((m) => pidDoPedido(m) === ativo.id) ?? null) : null;
  const filaVisivel = mesa.fila.filter((a) => !a.acao.startsWith(RESULTADO_TESTE));
  const minhaNaFila = ativo ? filaVisivel.some((a) => a.personagemId === ativo.id) : false;
  const personagemDe = (id: number | null | undefined) => mesa.personagens.find((p) => p.id === id) ?? null;

  /** Este aparelho pode rolar o teste deste personagem? Dono do personagem, máquina da taverna ou aparelho sozinho na mesa. */
  const podeRolarPara = (pid: number | null | undefined) => {
    if (!mesa.eu.clienteId) return false;
    const p = personagemDe(pid);
    return mesa.eu.personagemId === pid || euLocal || mesa.presenca.length <= 1 || Boolean(p?.jogador && p.jogador === mesa.eu.apelido);
  };

  // ---------- rolagem automática ----------

  const irParaOFim = useCallback((suave = false) => {
    const el = rolador.current;
    if (!el) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: suave && !reduzido ? "smooth" : "auto" });
  }, []);

  // conteúdo cresceu (mensagem nova, texto ao vivo, dado mostrando o resultado) ou a área encolheu (sugestões no rodapé):
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

  // Só conta como "subiu para reler" quando a rolagem andou para cima. O evento de scroll chega atrasado: se o conteúdo
  // cresceu nesse meio-tempo (fonte carregando, texto ao vivo), a distância do fim engana e a rolagem automática pararia sozinha.
  function aoRolar() {
    const el = rolador.current;
    if (!el) return;
    const distancia = el.scrollHeight - el.scrollTop - el.clientHeight;
    const subiu = el.scrollTop < ultimoTopo.current - 2;
    ultimoTopo.current = el.scrollTop;
    const longe = distancia > LONGE_DO_FIM && (subiu || longeRef.current);
    longeRef.current = longe;
    setLongeDoFim(longe);
    if (!longe) setVistas(total);
  }

  // ---------- início, endereço, avisos, teclado ----------

  // limpa da barra de endereço o que já foi usado (?inicio=1, ?personagem=)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("inicio") && !url.searchParams.has("personagem")) return;
    url.searchParams.delete("inicio");
    url.searchParams.delete("personagem");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  // campanha recém-criada: o mestre abre a cena sozinho, uma vez (o ref segura o efeito duplo do StrictMode)
  const comecou = useRef(false);
  useEffect(() => {
    if (!comecarSozinho || comecou.current) return;
    comecou.current = true;
    void acoes.controle("iniciar");
  }, [comecarSozinho, acoes]);

  // trocou de personagem (hot-seat): o campo já fica pronto para o próximo jogador. Só com mouse, para não abrir o teclado do celular.
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

  // tecla C abre e fecha o códex (fora de campos de texto)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "c" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      e.preventDefault();
      setCodexAberto((v) => !v);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  const fecharCodex = useCallback(() => setCodexAberto(false), []);

  // narração em voz alta: lê as narrações novas (com a leitura automática ligada) e cala ao sair da mesa
  useLeituraAutomatica(mesa.mensagens);

  function abrirCodex(aba?: AbaCodex) {
    if (aba) setAbaCodex(aba);
    setCodexAberto(true);
  }

  // ---------- ações ----------

  async function enviar(texto: string): Promise<boolean> {
    pararVoz();
    if (!(await acoes.enviarAcao(texto))) return false;
    longeRef.current = false;
    irParaOFim(true);
    // hot-seat no modo rodada: a vez passa para o próximo que ainda não agiu (na ordem do grupo)
    if (!rodada || !ativo || texto.startsWith("((")) return true;
    const ja = new Set(filaVisivel.filter((a) => a.acao !== INICIO && a.personagemId !== null).map((a) => a.personagemId as number)).add(ativo.id);
    const i = mesa.personagens.findIndex((p) => p.id === ativo.id);
    const proximo = [...mesa.personagens.slice(i + 1), ...mesa.personagens.slice(0, i)].find((p) => !ja.has(p.id));
    if (proximo && (euLocal || !proximo.jogador || proximo.jogador === mesa.eu.apelido)) {
      acoes.escolherPersonagem(proximo.id);
      setAviso(`Vez de ${proximo.ficha.nome}. Passe o aparelho!`);
    } else if (!proximo) {
      setAviso("Todo mundo agiu. O mestre vai narrar.");
    }
    return true;
  }

  // leva ao cartão do teste e deixa o botão "Rolar o dado" com o foco (Enter ou espaço já rolam)
  function irParaDado() {
    if (!meuPendente) return;
    const cartao = document.getElementById(`pedido-${meuPendente.id}`);
    if (!cartao) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cartao.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "center" });
    cartao.querySelector<HTMLButtonElement>("button[data-rolar]")?.focus({ preventScroll: true });
  }

  /** Depois de desfazer: a ação do personagem ativo volta ao campo para ser reescrita (refazer não devolve nada). */
  function aoDesfazer(r: Desfeito, refazer: boolean) {
    pararVoz();
    const texto = refazer ? null : acaoParaCampo(r, mesa.eu.personagemId);
    if (texto) {
      setPreencher((p) => ({ texto, n: (p?.n ?? 0) + 1 }));
      if (window.matchMedia("(pointer: fine)").matches) setTimeout(() => campo.current?.focus(), 50);
    }
    setAviso(avisoDoDesfeito(r, refazer, Boolean(texto)));
  }

  // ---------- desenho ----------

  const vazia = total === 0 && !mesa.ocupado && !filaVisivel.length;
  const linkNovo = `/mesa/${mesa.campanha.id}/personagens/novo`;
  const comecando = filaVisivel.some((a) => a.acao === INICIO);
  const acoesNaFila = filaVisivel.filter((a) => a.acao !== INICIO);
  const agiram = new Set(acoesNaFila.filter((a) => a.personagemId !== null).map((a) => a.personagemId));
  // leitor lá em cima: avisa se chegou coisa nova (mensagem ou o mestre escrevendo); senão oferece só voltar ao fim
  const novasAbaixo = longeDoFim && (total > vistas || Boolean(mesa.aoVivo));
  const testeMeu = meuPendente ? (dadosDoPedido(meuPendente).teste ?? null) : null;
  const sugestoes = mesa.cena.sugestoes ?? [];
  const sugestoesVisiveis = !mesa.ocupado && pendentes.length === 0 && Boolean(ativo) && !minhaNaFila && !meuPendente ? sugestoes : [];
  // desfazer/refazer só com o mestre quieto e nada esperando na fila
  const ultimoMestre = mesa.mensagens.findLast((m) => m.tipo === "mestre")?.id ?? null;
  const podeDesfazer = !mesa.ocupado && !mesa.aoVivo && filaVisivel.length === 0;

  useAtalhos({
    totalSugestoes: Math.min(9, sugestoesVisiveis.length),
    escolherSugestao: (i) => sugestoesVisiveis[i] && void enviar(sugestoesVisiveis[i].texto),
    rolarTeste: () => rolarPedido(meuPendente?.id),
    focarCampo: () => campo.current?.focus(),
    fechar: () => setAjuda(false),
    alternarAjuda: () => setAjuda((v) => !v),
  });

  function desenhar(m: Mensagem) {
    if (m.tipo === "mestre")
      return (
        <div key={m.id} className="surgir group my-5">
          <NarracaoLivro texto={m.texto} destaque={destaque} />
          <div className="mt-1 flex min-h-8 flex-wrap items-center justify-end gap-1">
            {m.id === ultimoMestre && podeDesfazer && (
              <AcoesTurno campanhaId={mesa.campanha.id} aoConcluir={aoDesfazer} aoErro={setAviso} className="mr-auto -ml-2.5" />
            )}
            <Ouvir id={`msg-${m.id}`} texto={m.texto} />
          </div>
        </div>
      );
    if (m.tipo === "jogador") {
      const p = personagemDe(m.personagemId);
      return (
        <CartaoAcao
          key={m.id}
          personagem={p}
          nomeReserva={m.personagemId ? "Personagem que saiu" : undefined}
          autor={m.autor}
          texto={m.texto}
          desfecho={desfechos.get(m.id) ?? null}
        />
      );
    }
    if (m.tipo === "dado") {
      const d = (m.dados ?? {}) as Record<string, unknown>;
      if (d.tipo === "cena_titulo")
        return <CabecalhoCena key={m.id} titulo={d.titulo as string | null} local={d.local as string | null} momento={d.momento as string | null} />;
      if (d.tipo === "pedido_teste") {
        const pid = pidDoPedido(m);
        return <PedidoTeste key={m.id} mensagem={m} personagem={personagemDe(pid)} podeRolar={podeRolarPara(pid)} rolar={acoes.rolarTeste} />;
      }
      return <LinhaDado key={m.id} mensagem={m} novo={mesa.novas.has(m.id)} />;
    }
    return (
      <p key={m.id} className="surgir my-6 text-center text-xs uppercase tracking-[0.3em] text-muted">
        ✦ {m.texto} ✦
      </p>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden text-foreground">
      <CeuEstrelado />

      {/* cabeçalho fino: campanha, presença, convite e ajustes (no celular os dois moram no códex), som e códex */}
      <header className="relative z-20 border-b border-border/40 bg-background/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-2 sm:gap-2 sm:px-4">
          <Link
            href="/"
            className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2/60 hover:text-ambar"
            aria-label="Voltar para as campanhas"
            title="Voltar para as campanhas"
          >
            ←
          </Link>
          {/* a campanha é o destaque; a taverna vira a assinatura miúda embaixo */}
          <div className="min-w-0 flex-1 leading-none">
            <h1 className={`${fonteGotica.className} truncate text-lg text-ambar sm:text-2xl`} title={mesa.campanha.nome}>
              {mesa.campanha.nome}
            </h1>
            <p className="mt-1 truncate text-[11px] text-muted">
              <span className="hidden sm:inline">Taverna do Velho Mestre · </span>
              {mesa.sistema.nomeCurto}
            </p>
          </div>
          <Presenca mesa={mesa} acoes={acoes} />
          <div className="hidden sm:block">
            <Convite campanhaId={mesa.campanha.id} temPin={mesa.campanha.temPin} />
          </div>
          <Link
            href={`/mesa/${mesa.campanha.id}/ajustes`}
            className="hidden size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2/60 hover:text-ambar sm:grid"
            aria-label="Ajustes da mesa"
            title="Ajustes da mesa"
          >
            ⚙
          </Link>
          <Link
            href={`/mesa/${mesa.campanha.id}/livro`}
            className="hidden size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2/60 hover:text-ambar md:grid"
            aria-label="Livro da campanha"
            title="Livro da campanha: a história inteira, para reler, imprimir ou baixar"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" fill="currentColor" fillOpacity={0.15} />
              <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6M9 10h4" />
            </svg>
          </Link>
          <BotaoVoz compacto />
          <Musica musica={mesa.cena.musica} sistema={mesa.sistema.id} />
          <button
            type="button"
            onClick={() => (codexAberto ? fecharCodex() : abrirCodex())}
            className="flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-md text-lg text-muted hover:bg-surface-2/60 hover:text-ambar sm:border sm:border-border sm:px-2.5 sm:text-base"
            aria-label="Códex: ficha, missões, pessoas e lugares"
            aria-expanded={codexAberto}
            title="Códex: ficha, missões, pessoas e lugares (tecla C)"
          >
            <span aria-hidden>📖</span>
            <span className="hidden text-sm font-semibold sm:inline">Códex</span>
          </button>
        </div>
      </header>

      {/* aba do códex na borda esquerda (desktop largo): marcador de livro com o nome escrito na vertical */}
      {!codexAberto && (
        <button
          type="button"
          onClick={() => abrirCodex()}
          className="group fixed left-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-r-lg border border-l-0 border-ambar/30 bg-surface/80 px-1.5 py-3 text-muted backdrop-blur transition hover:border-ambar/70 hover:pl-2.5 hover:text-ambar motion-reduce:transition-none lg:flex"
          aria-label="Abrir o códex"
          title="Códex (tecla C)"
        >
          <span aria-hidden>📖</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] [writing-mode:vertical-rl]">Códex</span>
          <kbd className="rounded border border-border px-1 text-[10px] text-muted group-hover:border-ambar/50" aria-hidden>
            C
          </kbd>
        </button>
      )}

      <Codex mesa={mesa} acoes={acoes} aberto={codexAberto} aoFechar={fecharCodex} aba={abaCodex} aoMudarAba={setAbaCodex} />

      <AjudaAtalhos aberta={ajuda} aoFechar={() => setAjuda(false)} extras={[["C", "abre e fecha o códex"]]} />

      {/* o livro */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Anteriormente
          campanhaId={mesa.campanha.id}
          nome={mesa.campanha.nome}
          mensagens={mesa.mensagens}
          cena={mesa.cena}
          diario={mesa.diario}
          livro
          aoContinuar={() => {
            longeRef.current = false;
            irParaOFim(true);
          }}
        />
        <div ref={rolador} onScroll={aoRolar} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div ref={conteudo} className="mx-auto max-w-[720px] px-4 pb-10 pt-4 sm:px-6 sm:pt-8">
            {vazia && (
              <div className="surgir py-10 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">{mesa.sistema.nomeCurto}</p>
                <h2 className={`${fonteGotica.className} mt-2 text-4xl leading-tight text-pergaminho sm:text-5xl`}>{mesa.campanha.nome}</h2>
                <div className="mx-auto mt-4 h-px w-40 bg-linear-to-r from-transparent via-ambar/60 to-transparent" />
                {mesa.personagens.length > 0 ? (
                  <>
                    <div className="mt-6 flex flex-wrap justify-center gap-4">
                      {mesa.personagens.map((p) => (
                        <div key={p.id} className="flex w-24 flex-col items-center gap-1.5">
                          <Retrato ficha={p.ficha} tamanho={64} />
                          <span className="w-full truncate text-sm font-semibold" style={{ color: corDoNome(p.ficha.nome) }}>
                            {p.ficha.nome}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mx-auto mt-6 max-w-md text-sm text-muted">
                      Vai jogar mais gente? Adicione os personagens antes de começar: o mestre apresenta todo mundo na cena de abertura.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <Link href={linkNovo} className="btn-borda min-h-12">
                        + Adicionar personagem
                      </Link>
                      <button className="btn-ambar min-h-12 px-7 text-base" onClick={() => void acoes.controle("iniciar")}>
                        Começar a aventura
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mx-auto mt-6 max-w-md text-sm text-muted">Ninguém sentado ainda. Crie um personagem para começar a história.</p>
                    <Link href={linkNovo} className="btn-ambar mt-5 min-h-12">
                      + Criar personagem
                    </Link>
                  </>
                )}
              </div>
            )}

            {mesa.mensagens.map(desenhar)}

            {/* texto do mestre chegando agora */}
            {mesa.aoVivo && (
              <div className="my-5">
                <NarracaoLivro texto={mesa.aoVivo} destaque={destaque} escrevendo />
              </div>
            )}

            {/* ações esperando o mestre */}
            {comecando && total === 0 && !mesa.ocupado && <p className="my-10 text-center italic text-muted">O mestre arruma a mesa e abre o livro…</p>}
            {acoesNaFila.map((a) => (
              <CartaoAcao key={`fila-${a.id}`} personagem={personagemDe(a.personagemId)} autor={a.autor} texto={a.acao} naFila />
            ))}
            {rodada && acoesNaFila.length > 0 && !mesa.ocupado && (
              <div className="my-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
                <span>
                  {mesa.personagens.filter((p) => agiram.has(p.id)).length}/{mesa.personagens.length} agiram
                </span>
                <button className="text-ambar underline-offset-2 hover:underline" onClick={() => void acoes.controle("forcar")}>
                  Narrar agora com as ações que já chegaram
                </button>
              </div>
            )}

            {mesa.ocupado && !mesa.aoVivo && (
              <p className="my-8 flex items-center justify-center gap-2 text-sm italic text-muted" role="status">
                O mestre está pensando
                <span className="pensando text-ambar" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            )}

            {mesa.erro && (
              <div className="my-4 flex items-start justify-between gap-3 rounded-md border border-sangue/60 bg-sangue/10 px-4 py-3 text-sm" role="alert">
                <p className="py-1.5">{mesa.erro}</p>
                <button
                  onClick={acoes.limparErro}
                  className="-my-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-sangue/20 hover:text-foreground"
                  aria-label="Fechar o aviso"
                  title="Fechar o aviso"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {longeDoFim && (
          <button
            type="button"
            onClick={() => irParaOFim(true)}
            className={`surgir absolute bottom-3 left-1/2 z-20 min-h-10 -translate-x-1/2 rounded-full border bg-surface/95 px-4 py-2 text-sm shadow-lg backdrop-blur hover:bg-surface-2 ${
              novasAbaixo ? "border-ambar/60 text-ambar" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {novasAbaixo ? (mesa.aoVivo && total <= vistas ? "↓ o mestre está narrando" : "↓ novas mensagens") : "↓ voltar ao fim"}
          </button>
        )}
      </div>

      {/* rodapé: sugestões, campo de ação e aviso */}
      <footer className="relative z-10 border-t border-border/40 bg-background/75 backdrop-blur">
        <div className="mx-auto max-h-[55dvh] max-w-[720px] overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 sm:px-6">
          <PainelAcao
            sugestoes={sugestoes}
            mostrarSugestoes={!mesa.ocupado && pendentes.length === 0 && Boolean(ativo) && !minhaNaFila}
            bloqueio={meuPendente ? (testeMeu ? `Teste de ${testeMeu}: role o dado antes de agir` : "Role o dado antes de agir") : null}
            aoIrParaBloqueio={irParaDado}
            placeholder={
              ativo
                ? minhaNaFila
                  ? `${ativo.ficha.nome} já agiu. Quer complementar?`
                  : "Ou escreva sua própria ação…"
                : "Fale com o mestre fora do jogo ((assim)), ou crie um personagem."
            }
            rotuloCampo={ativo ? `Ação de ${ativo.ficha.nome}` : "Mensagem ao mestre"}
            enviar={enviar}
            campoRef={campo}
            preencher={preencher}
            topo={
              <div className="mb-2 flex min-h-10 items-center gap-2 text-xs sm:min-h-8">
                {ativo ? (
                  <>
                    {/* o personagem abre a ficha; com mais gente no grupo, o ⇄ ao lado troca de personagem */}
                    <button
                      type="button"
                      onClick={() => abrirCodex("personagem")}
                      className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-full border border-border/70 py-0.5 pl-0.5 pr-2.5 hover:border-ambar/60 sm:min-h-8"
                      aria-label={`Ficha de ${ativo.ficha.nome}`}
                      title="Ver a ficha (C)"
                    >
                      <Retrato ficha={ativo.ficha} tamanho={28} />
                      <span className="truncate font-semibold" style={{ color: corDoNome(ativo.ficha.nome) }}>
                        {ativo.ficha.nome}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted" title={mesa.sistema.rotulos.pv}>
                        ♥ {ativo.ficha.pv}/{ativo.ficha.pvMax}
                      </span>
                      <span className="hidden shrink-0 text-muted sm:inline">· ficha</span>
                    </button>
                    {mesa.personagens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => abrirCodex("grupo")}
                        className="grid size-10 shrink-0 place-items-center rounded-full border border-border/70 text-muted hover:border-ambar/60 hover:text-ambar sm:size-8"
                        aria-label="Trocar de personagem"
                        title="Trocar de personagem"
                      >
                        ⇄
                      </button>
                    )}
                  </>
                ) : mesa.personagens.length > 0 ? (
                  <button type="button" className="min-h-10 text-ambar hover:underline sm:min-h-8" onClick={() => abrirCodex("grupo")}>
                    Escolher personagem
                  </button>
                ) : (
                  <Link href={linkNovo} className="min-h-10 content-center text-ambar hover:underline sm:min-h-8">
                    + Criar personagem
                  </Link>
                )}
                {aviso && (
                  <span className="surgir min-w-0 truncate text-ambar" role="status">
                    {aviso}
                  </span>
                )}
                {mesa.ocupado && (
                  <button
                    type="button"
                    className="ml-auto min-h-10 shrink-0 rounded-md px-2 py-1 text-muted hover:bg-sangue/10 hover:text-sangue sm:min-h-8"
                    onClick={() => void acoes.controle("cancelar")}
                    title="Interromper o mestre"
                  >
                    ■ interromper
                  </button>
                )}
              </div>
            }
          />
          <p className="mt-2 text-center text-[11px] text-muted/70">
            Os personagens são IA. As respostas são ficção.
            <button type="button" onClick={() => setAjuda(true)} className="ml-2 hidden underline-offset-2 hover:text-ambar hover:underline [@media(pointer:fine)]:inline">
              Atalhos: <kbd className="rounded border border-border/70 px-1">?</kbd>
            </button>
          </p>
        </div>
      </footer>
    </div>
  );
}
