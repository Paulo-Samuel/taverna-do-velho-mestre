"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AcaoPendente, Mensagem } from "@/lib/db";
import type { EstadoMesa, PersonagemVisivel } from "@/lib/mesa";
import type { Cena, EntradaDiario } from "@/lib/sistemas/tipos";
import type { EventoMesa, Jogador } from "@/lib/tempo-real";
import * as identidade from "./identidade";
import { FIM_DE_SESSAO, RESULTADO_TESTE } from "@/lib/constantes";

// Estado vivo de uma mesa no navegador: começa com o estado do servidor e segue o fluxo de eventos (SSE).

export type Limite = { janela: string; uso: number | null; renovaEm: number | null };

export type Mesa = {
  campanha: EstadoMesa["campanha"];
  sistema: EstadoMesa["sistema"];
  personagens: PersonagemVisivel[];
  mensagens: Mensagem[];
  cena: Cena;
  diario: EntradaDiario[];
  fila: AcaoPendente[];
  ocupado: boolean;
  presenca: Jogador[];
  provedor: string;
  /** narração do mestre chegando agora (ainda não virou mensagem) */
  aoVivo: string;
  limite: Limite | null;
  erro: string | null;
  conectado: boolean;
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
  rolarTeste: (mensagemId: number) => Promise<{ natural: number | null; total: number; dados: number[]; grau: string; rotuloGrau: string } | null>;
};

/** A fila mostrada esconde as ações internas (resultado de teste rolado pelo jogador, o fechamento da noite). */
const semInternas = (fila: AcaoPendente[]) => fila.filter((a) => !a.acao.startsWith(RESULTADO_TESTE) && a.acao !== FIM_DE_SESSAO);

function deEstado(e: EstadoMesa) {
  return {
    campanha: e.campanha,
    sistema: e.sistema,
    personagens: e.personagens,
    mensagens: e.mensagens,
    cena: e.cena,
    diario: e.diario,
    fila: semInternas(e.fila),
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
  const [erro, setErro] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [novas, setNovas] = useState<Set<number>>(new Set());
  const [eu, setEu] = useState({ clienteId: "", apelido: "", personagemId: null as number | null });
  const euRef = useRef(eu);
  useEffect(() => {
    euRef.current = eu;
  }, [eu]);

  // identidade só existe no navegador
  useEffect(() => {
    const salvo = identidade.personagemAtivo(id);
    const valido = inicial.personagens.some((p) => p.id === salvo) ? salvo : (inicial.personagens[0]?.id ?? null);
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
        setBase((b) => ({ ...b, ocupado: ev.ocupado, fila: semInternas(ev.fila) }));
        if (!ev.ocupado) setAoVivo("");
        break;
      case "presenca":
        setBase((b) => ({ ...b, presenca: ev.jogadores }));
        break;
      case "limite":
        setLimite({ janela: ev.janela, uso: ev.uso, renovaEm: ev.renovaEm });
        break;
      case "erro":
        setErro(ev.erro);
        break;
      case "recarregar":
        // o próximo estado_inicial chega reabrindo a conexão
        break;
    }
  }, []);

  // conexão SSE (reabre sozinha quando cai; o servidor manda o estado inteiro a cada conexão)
  useEffect(() => {
    if (!eu.clienteId) return;
    const params = new URLSearchParams({ cliente: eu.clienteId, apelido: euRef.current.apelido, personagem: String(euRef.current.personagemId ?? "") });
    let fonte: EventSource | null = null;
    let parado = false;
    const abrir = () => {
      fonte = new EventSource(`/api/campanhas/${id}/eventos?${params}`);
      fonte.onopen = () => setConectado(true);
      fonte.onerror = () => setConectado(false);
      fonte.onmessage = (msg) => {
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
      fonte?.close();
    };
  }, [id, eu.clienteId, aplicar]);

  const avisarPresenca = useCallback(
    (mudancas: { apelido?: string; personagemId?: number | null }) => {
      if (!euRef.current.clienteId) return;
      void fetch(`/api/campanhas/${id}/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: euRef.current.clienteId, ...mudancas }),
      });
    },
    [id],
  );

  const acoes: AcoesMesa = {
    enviarAcao: useCallback(
      async (texto: string, personagemId?: number | null) => {
        setErro(null);
        const resp = await fetch(`/api/campanhas/${id}/acao`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: texto, personagemId: personagemId ?? euRef.current.personagemId, autor: euRef.current.apelido }),
        });
        if (!resp.ok) {
          const corpo = await resp.json().catch(() => ({}));
          setErro(corpo.erro ?? `Erro ${resp.status}`);
          return false;
        }
        return true;
      },
      [id],
    ),
    controle: useCallback(
      async (comando, extra = {}) => {
        const resp = await fetch(`/api/campanhas/${id}/controle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comando, ...extra }),
        });
        if (!resp.ok) setErro((await resp.json().catch(() => ({}))).erro ?? `Erro ${resp.status}`);
      },
      [id],
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
    limparErro: useCallback(() => setErro(null), []),
    rolarTeste: useCallback(
      async (mensagemId: number) => {
        setErro(null);
        const resp = await fetch(`/api/campanhas/${id}/rolar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagemId, autor: euRef.current.apelido }),
        });
        const corpo = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setErro(corpo.erro ?? `Erro ${resp.status}`);
          return null;
        }
        return corpo.resultado ?? null;
      },
      [id],
    ),
    receberMensagem: useCallback((m: Mensagem) => aplicar({ e: "mensagem", mensagem: m }), [aplicar]),
  };

  return [{ ...base, aoVivo, limite, erro, conectado, novas, eu }, acoes];
}
