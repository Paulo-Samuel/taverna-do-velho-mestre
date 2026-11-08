"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AcaoPendente, Mensagem } from "@/lib/db";
import type { EstadoMesa, PersonagemVisivel } from "@/lib/mesa";
import type { Cena, EntradaDiario } from "@/lib/sistemas/tipos";
import type { EventoMesa, Jogador } from "@/lib/tempo-real";
import * as identidade from "./identidade";
import { postarJson } from "./http";
import { FIM_DE_SESSAO, RESULTADO_TESTE } from "@/lib/constantes";

// Estado vivo de uma mesa no navegador: começa com o estado do servidor e segue o fluxo de eventos (SSE).

export type Limite = { janela: string; uso: number | null; renovaEm: number | null };

/** "conectando" até o primeiro onopen (sem alarme vermelho), "caiu" depois de um onerror (o EventSource tenta de novo sozinho). */
export type Conexao = "conectando" | "ok" | "caiu";

/** Quanto tempo a conexão fica caída antes de a mesa avisar e travar os botões (uma oscilação curta não assusta ninguém). */
export const ATRASO_SEM_SINAL_MS = 3000;

/**
 * O servidor bate (ping) a cada 20 s. Sem nenhum evento por este tempo, a conexão morreu em silêncio (Wi-Fi que caiu sem
 * fechar o socket): o navegador não dispara onerror sozinho nesse caso, então a mesa fecha e reabre o fluxo por conta própria.
 */
export const SEM_BATIDA_MS = 45_000;

export type Mesa = {
  campanha: EstadoMesa["campanha"];
  sistema: EstadoMesa["sistema"];
  personagens: PersonagemVisivel[];
  mensagens: Mensagem[];
  cena: Cena;
  diario: EntradaDiario[];
  fila: AcaoPendente[];
  /** a fila bruta só tem ação interna (resultado de teste, fim da noite) esperando o mestre: ele "lê o resultado" */
  lendoResultado: boolean;
  ocupado: boolean;
  presenca: Jogador[];
  provedor: string;
  /** a página foi aberta na máquina da taverna (mesa local) */
  local: boolean;
  /** narração do mestre chegando agora (ainda não virou mensagem) */
  aoVivo: string;
  limite: Limite | null;
  erro: string | null;
  /** o que veio junto com o erro do mestre: `refazer` = o turno pode ser tentado de novo com as mesmas ações; `acao` = o atalho */
  erroInfo: { refazer?: boolean; acao?: "config" | "tentar"; aviso?: boolean } | null;
  conexao: Conexao;
  /** a conexão está caída há mais de ATRASO_SEM_SINAL_MS: faixa de aviso e botões de agir/rolar travados */
  semSinal: boolean;
  /** ids de mensagens de dado chegadas nesta sessão (para animar) */
  novas: Set<number>;
  /** este aparelho */
  eu: { clienteId: string; apelido: string; personagemId: number | null };
};

export type AcoesMesa = {
  enviarAcao: (texto: string, personagemId?: number | null) => Promise<boolean>;
  controle: (comando: "iniciar" | "cancelar" | "forcar" | "retirar", extra?: Record<string, unknown>) => Promise<void>;
  escolherPersonagem: (personagemId: number | null) => void;
  mudarApelido: (apelido: string) => void;
  limparErro: () => void;
  /** registra uma mensagem recebida fora do fluxo (ex.: resposta de uma rota) sem duplicar */
  receberMensagem: (m: Mensagem) => void;
  /**
   * Rola um teste que o mestre pediu (mensagem 'dado' com dados.tipo "pedido_teste" e status "pendente").
   * O servidor sorteia o d20 e devolve o resultado (ResultadoTeste) para a animação do dado; a mensagem
   * atualizada chega a todos pelo fluxo de eventos e o mestre continua sozinho quando não houver mais testes pendentes.
   */
  rolarTeste: (
    mensagemId: number,
    opcoes?: { surto?: boolean },
  ) => Promise<{ natural: number | null; total: number; dados: number[]; grau: string; rotuloGrau: string } | null>;
};

/** Ação interna da fila: não aparece no chat (resultado de teste rolado pelo jogador, o fechamento da noite). */
const interna = (a: AcaoPendente) => a.acao.startsWith(RESULTADO_TESTE) || a.acao === FIM_DE_SESSAO;

/** A fila mostrada esconde as ações internas. */
const semInternas = (fila: AcaoPendente[]) => fila.filter((a) => !interna(a));

/** Só ação interna esperando: o mestre ainda não pegou o resultado (modo rodada esperando os outros, ou o instante antes de narrar). */
const soInternas = (fila: AcaoPendente[]) => fila.length > 0 && fila.every(interna);

/**
 * Personagem ativo ao abrir a mesa: o salvo neste aparelho, se ainda existir. Sem nada salvo, a máquina da taverna (hot-seat) e
 * a mesa de um personagem só entram direto no primeiro; pela rede, quem não reivindicou nada entra só assistindo (nunca age
 * pelo personagem de outra pessoa por engano).
 */
export function personagemPadrao(salvo: number | null, ids: number[], local: boolean): number | null {
  if (salvo !== null && ids.includes(salvo)) return salvo;
  if (local || ids.length === 1) return ids[0] ?? null;
  return null;
}

function deEstado(e: EstadoMesa) {
  return {
    campanha: e.campanha,
    sistema: e.sistema,
    personagens: e.personagens,
    mensagens: e.mensagens,
    cena: e.cena,
    diario: e.diario,
    fila: semInternas(e.fila),
    lendoResultado: soInternas(e.fila),
    ocupado: e.ocupado,
    presenca: e.presenca,
    provedor: e.provedor,
  };
}

export function useMesa(inicial: EstadoMesa): [Mesa, AcoesMesa] {
  const id = inicial.campanha.id;
  const [base, setBase] = useState(() => deEstado(inicial));
  const [aoVivo, setAoVivo] = useState("");
  const [limite, setLimite] = useState<Limite | null>(null);
  const [erro, setErroTexto] = useState<string | null>(null);
  const [erroInfo, setErroInfo] = useState<Mesa["erroInfo"]>(null);
  // erro das rotas (texto só); o do mestre chega pelo evento com refazer/acao
  const setErro = useCallback((t: string | null, info: Mesa["erroInfo"] = null) => {
    setErroTexto(t);
    setErroInfo(t ? info : null);
  }, []);
  const [conexao, setConexao] = useState<Conexao>("conectando");
  const [semSinal, setSemSinal] = useState(false);
  const [novas, setNovas] = useState<Set<number>>(new Set());
  const [eu, setEu] = useState({ clienteId: "", apelido: "", personagemId: null as number | null });
  const euRef = useRef(eu);
  useEffect(() => {
    euRef.current = eu;
  }, [eu]);

  // caiu há mais de 3 s: aí sim a mesa avisa (a faixa some sozinha quando a conexão volta)
  useEffect(() => {
    if (conexao !== "caiu") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSemSinal(false);
      return;
    }
    const t = setTimeout(() => setSemSinal(true), ATRASO_SEM_SINAL_MS);
    return () => clearTimeout(t);
  }, [conexao]);

  // identidade só existe no navegador
  useEffect(() => {
    const valido = personagemPadrao(
      identidade.personagemAtivo(id),
      inicial.personagens.map((p) => p.id),
      inicial.local,
    );
    const novo = { clienteId: identidade.clienteId(), apelido: identidade.apelido(), personagemId: valido };
    euRef.current = novo;
    // localStorage só existe depois da hidratação; ler aqui evita divergência entre servidor e cliente
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEu(novo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aplicar = useCallback((ev: EventoMesa) => {
    switch (ev.e) {
      case "mensagem":
        if (ev.mensagem.tipo === "mestre") setAoVivo("");
        if (ev.mensagem.tipo === "dado") setNovas((s) => new Set(s).add(ev.mensagem.id));
        setBase((b) => (b.mensagens.some((m) => m.id === ev.mensagem.id) ? b : { ...b, mensagens: [...b.mensagens, ev.mensagem] }));
        break;
      case "mensagem_atualizada":
        if (ev.mensagem.tipo === "dado") setNovas((s) => new Set(s).add(ev.mensagem.id));
        setBase((b) => ({ ...b, mensagens: b.mensagens.map((m) => (m.id === ev.mensagem.id ? ev.mensagem : m)) }));
        break;
      case "texto":
        setAoVivo((t) => t + ev.texto);
        break;
      case "personagem":
        setBase((b) => {
          const existe = b.personagens.some((p) => p.id === ev.personagem.id);
          return { ...b, personagens: existe ? b.personagens.map((p) => (p.id === ev.personagem.id ? ev.personagem : p)) : [...b.personagens, ev.personagem] };
        });
        break;
      case "personagem_removido":
        setBase((b) => ({ ...b, personagens: b.personagens.filter((p) => p.id !== ev.id) }));
        break;
      case "cena":
        setBase((b) => ({ ...b, cena: ev.cena }));
        break;
      case "diario":
        setBase((b) => ({ ...b, diario: ev.entradas }));
        break;
      case "estado":
        setBase((b) => ({ ...b, ocupado: ev.ocupado, fila: semInternas(ev.fila), lendoResultado: soInternas(ev.fila) }));
        if (!ev.ocupado) setAoVivo("");
        break;
      case "presenca":
        setBase((b) => ({ ...b, presenca: ev.jogadores }));
        break;
      case "limite":
        setLimite({ janela: ev.janela, uso: ev.uso, renovaEm: ev.renovaEm });
        break;
      case "erro":
        setErro(ev.erro, ev.refazer || ev.acao || ev.aviso ? { refazer: ev.refazer, acao: ev.acao, aviso: ev.aviso } : null);
        break;
      case "recarregar":
        // o próximo estado_inicial chega reabrindo a conexão
        break;
    }
  }, [setErro]);

  const avisarPresenca = useCallback(
    (mudancas: { apelido?: string; personagemId?: number | null }) => {
      if (!euRef.current.clienteId) return;
      // sem rede fica por isso mesmo: a presença é refeita pelo servidor quando a conexão volta
      void postarJson(`/api/campanhas/${id}/presenca`, { clienteId: euRef.current.clienteId, ...mudancas });
    },
    [id],
  );

  // conexão SSE (reabre sozinha quando cai; o servidor manda o estado inteiro a cada conexão)
  useEffect(() => {
    if (!eu.clienteId) return;
    const noInicio = { apelido: euRef.current.apelido, personagemId: euRef.current.personagemId };
    const params = new URLSearchParams({ cliente: eu.clienteId, apelido: noInicio.apelido, personagem: String(noInicio.personagemId ?? "") });
    let fonte: EventSource | null = null;
    let parado = false;
    let vigia: ReturnType<typeof setTimeout> | null = null;
    // vigia das batidas: ficou mudo tempo demais → conta como caído e reabre (o EventSource só percebe sockets fechados de verdade)
    const rearmar = () => {
      if (vigia) clearTimeout(vigia);
      vigia = setTimeout(() => {
        setConexao("caiu");
        fonte?.close();
        if (!parado) abrir();
      }, SEM_BATIDA_MS);
    };
    const abrir = () => {
      fonte = new EventSource(`/api/campanhas/${id}/eventos?${params}`);
      rearmar();
      fonte.onopen = () => {
        rearmar();
        setConexao("ok");
        // reconexão: o servidor registrou a presença com os parâmetros de quando a página abriu; se o apelido ou o
        // personagem mudaram nesse meio-tempo, conta a verdade de novo
        const atual = euRef.current;
        if (atual.apelido !== noInicio.apelido || atual.personagemId !== noInicio.personagemId) {
          avisarPresenca({ apelido: atual.apelido, personagemId: atual.personagemId });
        }
      };
      fonte.onerror = () => setConexao("caiu");
      fonte.onmessage = (msg) => {
        rearmar();
        const ev = JSON.parse(msg.data);
        // outros painéis (ex.: fatos fixados, src/components/fatos) ouvem a mesma conexão sem abrir outra
        if (ev.e !== "ping" && ev.e !== "texto") window.dispatchEvent(new CustomEvent("taverna:evento", { detail: ev }));
        if (ev.e === "estado_inicial") {
          if (ev.estado) setBase(deEstado(ev.estado as EstadoMesa));
        } else if (ev.e === "recarregar") {
          fonte?.close();
          if (!parado) abrir();
        } else if (ev.e !== "ping") {
          aplicar(ev as EventoMesa);
        }
      };
    };
    abrir();
    return () => {
      parado = true;
      if (vigia) clearTimeout(vigia);
      fonte?.close();
    };
  }, [id, eu.clienteId, aplicar, avisarPresenca]);

  const acoes: AcoesMesa = {
    enviarAcao: useCallback(
      async (texto: string, personagemId?: number | null) => {
        setErro(null);
        // sem sinal a resposta vem com o aviso e false: o campo não é limpo, a pessoa tenta de novo
        const r = await postarJson(`/api/campanhas/${id}/acao`, {
          acao: texto,
          personagemId: personagemId ?? euRef.current.personagemId,
          autor: euRef.current.apelido,
        });
        if (!r.ok) {
          setErro(r.erro);
          return false;
        }
        return true;
      },
      [id, setErro],
    ),
    controle: useCallback(
      async (comando, extra = {}) => {
        const r = await postarJson(`/api/campanhas/${id}/controle`, { comando, ...extra });
        if (!r.ok) setErro(r.erro);
      },
      [id, setErro],
    ),
    escolherPersonagem: useCallback(
      (personagemId: number | null) => {
        identidade.salvarPersonagemAtivo(id, personagemId);
        setEu((e) => ({ ...e, personagemId }));
        avisarPresenca({ personagemId });
      },
      [id, avisarPresenca],
    ),
    mudarApelido: useCallback(
      (nome: string) => {
        identidade.salvarApelido(nome);
        setEu((e) => ({ ...e, apelido: nome }));
        avisarPresenca({ apelido: nome });
      },
      [avisarPresenca],
    ),
    limparErro: useCallback(() => setErro(null), [setErro]),
    rolarTeste: useCallback(
      async (mensagemId: number, opcoes?: { surto?: boolean }) => {
        setErro(null);
        // o clienteId diz ao servidor quem decide depois do dado (só este aparelho tem os botões)
        const r = await postarJson<{ resultado?: Awaited<ReturnType<AcoesMesa["rolarTeste"]>> }>(`/api/campanhas/${id}/rolar`, {
          mensagemId,
          autor: euRef.current.apelido,
          clienteId: euRef.current.clienteId,
          ...(opcoes ? { opcoes } : {}),
        });
        if (!r.ok) {
          setErro(r.erro);
          return null;
        }
        return r.corpo.resultado ?? null;
      },
      [id, setErro],
    ),
    receberMensagem: useCallback((m: Mensagem) => aplicar({ e: "mensagem", mensagem: m }), [aplicar]),
  };

  return [{ ...base, local: inicial.local, aoVivo, limite, erro, erroInfo, conexao, semSinal, novas, eu }, acoes];
}
