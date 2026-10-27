"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { previaFicha, sugerirAtributos, type PreviaFicha } from "@/app/acoes-ficha";
import { apelido as apelidoSalvo, salvarApelido } from "@/lib/cliente/identidade";
import type { AventuraPublica } from "@/lib/aventuras/tipos";
import type { SistemaPublico } from "@/lib/sistemas/tipos";
import { temaDoSistema } from "@/lib/temas";
import { TemaPagina } from "@/components/tema-pagina";
import {
  PassoAncestralidade,
  PassoAntecedente,
  PassoAtributos,
  tipoMetodo,
  PassoCampanha,
  PassoClasse,
  PassoIdentidade,
  PassoOpcoes,
  PassoPericias,
  PassoSistema,
  comAventura,
  semAventura,
  type Escolhas,
} from "./passos";
import { PreviaLateral, Resumo } from "./previa";
import { opcoesValidas, personagemPronto, problemaOpcoes, sortearOpcoes as sortearExtras } from "./sugestoes";

// Assistente de criação de personagem, guiado só pelos dados públicos do sistema (SistemaPublico).
// Um único <form> para a server action: os passos são controlados e os campos do contrato
// (src/lib/formulario-ficha.ts) saem em <input type="hidden"> no fim do formulário.
// O rascunho fica no localStorage (por destino e por sistema) até a criação dar certo.

export type EstadoFormulario = { erro: string | null };

export type PropsFormulario = {
  sistemas: SistemaPublico[];
  /** sistema fixo (personagem novo numa mesa existente); sem isso o jogador escolhe o sistema */
  sistemaFixo?: string;
  /** sistema já marcado ao abrir (vindo do catálogo, /nova/avancada?sistema=); o jogador ainda pode trocar */
  sistemaInicial?: string;
  /** aventuras prontas (parte pública, sem o roteiro) que o passo da campanha oferece para o sistema escolhido */
  aventuras?: AventuraPublica[];
  /** aventura já marcada ao abrir (vinda do início, /nova/avancada?sistema=&aventura=); vale se for do sistema */
  aventuraInicial?: string;
  /** server action que recebe o FormData */
  acao: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  /** "campanha": também pede nome, cenário, tom e modo da mesa; "personagem": só o personagem */
  modo: "campanha" | "personagem";
  textoBotao?: string;
  /** de quem é o rascunho: "campanha" (nova) ou "mesa-<id>"; padrão pelo modo */
  destino?: string;
  /** título da página: grande no primeiro passo, numa linha junto da barra de passos depois */
  cabecalho?: { titulo: string; subtitulo?: ReactNode; antes?: ReactNode };
};

type Passo = "sistema" | "ancestralidade" | "classe" | "antecedente" | "atributos" | "pericias" | "opcoes" | "identidade" | "campanha" | "resumo";

const NOMES_PASSOS: Record<Passo, string> = {
  sistema: "Sistema",
  ancestralidade: "Origem",
  classe: "Classe",
  antecedente: "Antecedente",
  atributos: "Atributos",
  pericias: "Perícias",
  opcoes: "Escolhas",
  identidade: "Identidade",
  campanha: "Campanha",
  resumo: "Resumo",
};

function escolhasIniciais(sistemaId: string, sistema: SistemaPublico | undefined): Escolhas {
  return {
    sistemaId,
    ancestralidade: "",
    classe: "",
    antecedente: "",
    metodo: sistema?.metodosAtributos[0]?.id ?? "",
    atributos: {},
    pericias: [],
    extras: {},
    nome: "",
    historia: "",
    jogador: "",
    campanha: "",
    cenario: "",
    tom: "",
    aventura: "",
    modoMesa: "livre",
    pin: "",
    adicionarMais: false,
    // mesmos padrões dos ajustes da mesa
    dificuldade: "justa",
    narracao: "media",
    foco: [],
    focoLivre: "",
    instrucoes: "",
    dados: "jogador",
    sugestoes: true,
  };
}

/* ---------- rascunho no localStorage ---------- */

const PREFIXO_RASCUNHO = "taverna:rascunho-avancado:";
const VALIDADE_RASCUNHO = 30 * 24 * 3600 * 1000;

type Rascunho = { v: 1; e: Escolhas; passo: Passo; alcance: number; editados: boolean; salvoEm: number };
type Oferta = { rascunho: Rascunho; quando: string; sistema: string };

const chaveRascunho = (destino: string, sistemaId: string) => `${PREFIXO_RASCUNHO}${destino}:${sistemaId}`;

function lerRascunhos(destino: string): Rascunho[] {
  const lista: Rascunho[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave?.startsWith(`${PREFIXO_RASCUNHO}${destino}:`)) continue;
      try {
        const r = JSON.parse(localStorage.getItem(chave) ?? "") as Rascunho;
        if (r?.v === 1 && r.e?.sistemaId && Date.now() - r.salvoEm < VALIDADE_RASCUNHO) lista.push(r);
      } catch {
        // rascunho estragado: ignora
      }
    }
  } catch {
    // armazenamento bloqueado (modo privado): sem rascunho, a vida segue
  }
  return lista.sort((a, b) => b.salvoEm - a.salvoEm);
}

function gravarRascunho(destino: string, sistemaId: string, r: Rascunho | null) {
  try {
    if (r) localStorage.setItem(chaveRascunho(destino, sistemaId), JSON.stringify(r));
    else localStorage.removeItem(chaveRascunho(destino, sistemaId));
  } catch {
    // cheio ou bloqueado: perde só a conveniência
  }
}

function haQuanto(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 2) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Tem algo que valha guardar? (abrir a página e não mexer em nada não vira rascunho) */
function temConteudo(e: Escolhas): boolean {
  return Boolean(
    e.ancestralidade ||
      e.classe ||
      e.antecedente ||
      e.nome.trim() ||
      e.historia.trim() ||
      e.campanha.trim() ||
      e.cenario.trim() ||
      e.pericias.length ||
      Object.values(e.extras).some((v) => v.some((x) => x.trim())),
  );
}

export function FormularioPersonagem({
  sistemas,
  sistemaFixo,
  sistemaInicial,
  aventuras = [],
  aventuraInicial,
  acao,
  modo,
  textoBotao,
  destino: destinoProp,
  cabecalho,
}: PropsFormulario) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const formRef = useRef<HTMLFormElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);
  // fica ligada por um instante depois que o resumo aparece (trava contra envio por clique duplo)
  const travaEnvio = useRef(false);
  const relogioRascunho = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destino = destinoProp ?? (modo === "campanha" ? "campanha" : "personagem");

  const pedido = sistemas.find((s) => s.id === sistemaInicial && s.pronto)?.id;
  const inicial = sistemaFixo ?? pedido ?? sistemas.find((s) => s.pronto)?.id ?? "";
  // aventura pedida pelo link do início: só se for do sistema que abriu; já preenche nome, cenário e tom da campanha
  const aventuraPedida = modo === "campanha" ? aventuras.find((a) => a.id === aventuraInicial && a.sistemas.includes(inicial)) : undefined;
  const [e, setE] = useState<Escolhas>(() => ({ ...escolhasIniciais(inicial, sistemas.find((s) => s.id === inicial)), ...comAventura(aventuraPedida) }));
  // veio do catálogo com o sistema escolhido: pula direto para o personagem (a barra de passos deixa voltar)
  const [passo, setPasso] = useState<Passo>(sistemaFixo || pedido ? "ancestralidade" : "sistema");
  const [aviso, setAviso] = useState<string | null>(null);
  // a página assume o tema do sistema assim que o jogador escolhe um (antes disso, a taverna de sempre)
  const [tocouSistema, setTocouSistema] = useState(false);
  // passo mais adiantado já visitado: a barra de passos deixa pular até ele (validando o caminho)
  const [alcance, setAlcance] = useState(0);
  // de que classe+método vieram os atributos atuais; editar à mão congela (não sobrescrevemos o que o jogador digitou)
  const [origemAtributos, setOrigemAtributos] = useState<string | null>(null);
  const [editados, setEditados] = useState(false);
  // últimos valores que o servidor sugeriu: base do "Embaralhar" e do aviso de fora da distribuição
  const [sugestao, setSugestao] = useState<Record<string, number> | null>(null);
  const [carregandoAtributos, iniciarAtributos] = useTransition();
  const [previa, setPrevia] = useState<PreviaFicha | null>(null);
  const [carregandoPrevia, iniciarPrevia] = useTransition();
  // ação auxiliar (prévia, sugestão de atributos) que falhou: aviso pequeno, sem derrubar a página
  const [tropeco, setTropeco] = useState<string | null>(null);
  // rascunho encontrado ao abrir; enquanto a pessoa não decide, nada é gravado por cima
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [veioPronto, setVeioPronto] = useState(false);

  const sistema = sistemas.find((s) => s.id === e.sistemaId);
  const opcoes = opcoesValidas(sistema, e.classe, e.ancestralidade, e.extras);
  const limitePericias = sistema?.periciasEscolhiveis ?? 0;
  const periciasDaClasse = new Set(sistema?.classes.find((c) => c.id === e.classe)?.pericias ?? []);
  const periciasEscolhidas = e.pericias.filter((p) => !periciasDaClasse.has(p)).slice(0, limitePericias);

  const passos: Passo[] = [];
  if (!sistemaFixo) passos.push("sistema");
  if (sistema?.pronto) {
    if (sistema.ancestralidades.length) passos.push("ancestralidade");
    if (sistema.classes.length) passos.push("classe");
    if (sistema.antecedentes?.length) passos.push("antecedente");
    if (sistema.atributos.length) passos.push("atributos");
    if (limitePericias > 0 && sistema.pericias.length) passos.push("pericias");
    if (opcoes.length) passos.push("opcoes");
    passos.push("identidade");
    if (modo === "campanha") passos.push("campanha");
    passos.push("resumo");
  }
  const indice = Math.max(0, passos.indexOf(passo));
  // os passos de regra usam o vocabulário do sistema (Espécie, Arquétipo, Ocupação...)
  const nomePasso = (p: Passo) =>
    (p === "ancestralidade" && sistema?.rotulos.ancestralidade) ||
    (p === "classe" && sistema?.rotulos.classe) ||
    (p === "antecedente" && sistema?.rotulos.antecedente) ||
    NOMES_PASSOS[p];
  const atual = passos[indice] ?? "sistema";
  const ultimo = atual === "resumo";

  // ao abrir: procura um rascunho deste destino (do sistema pedido, ou o mais recente)
  useEffect(() => {
    const fixo = sistemaFixo ?? pedido;
    const achado = lerRascunhos(destino).find((r) => (!fixo || r.e.sistemaId === fixo) && sistemas.some((s) => s.id === r.e.sistemaId && s.pronto));
    if (!achado) return;
    const nomeSistema = sistemas.find((s) => s.id === achado.e.sistemaId)?.nomeCurto ?? achado.e.sistemaId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador, depois da hidratação
    setOferta({ rascunho: achado, quando: haQuanto(achado.salvoEm), sistema: nomeSistema });
    // o navegador pode restaurar a rolagem de antes do recarregar e esconder a pergunta lá em cima
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }, [destino, sistemaFixo, pedido, sistemas]);

  // grava o rascunho um instante depois de cada mudança (e de novo quando o envio volta com erro)
  useEffect(() => {
    if (oferta || !temConteudo(e)) return;
    if (relogioRascunho.current) clearTimeout(relogioRascunho.current);
    relogioRascunho.current = setTimeout(() => {
      gravarRascunho(destino, e.sistemaId, { v: 1, e, passo, alcance, editados, salvoEm: Date.now() });
    }, 400);
    return () => {
      if (relogioRascunho.current) clearTimeout(relogioRascunho.current);
    };
  }, [e, passo, alcance, editados, oferta, destino, estado]);

  function continuarRascunho() {
    if (!oferta) return;
    const r = oferta.rascunho;
    const sis = sistemas.find((s) => s.id === r.e.sistemaId);
    // campos novos que o rascunho antigo não tinha vêm do padrão; a aventura pedida pelo link vence a do rascunho
    const restaurado = { ...escolhasIniciais(r.e.sistemaId, sis), ...r.e, ...(aventuraPedida?.sistemas.includes(r.e.sistemaId) ? comAventura(aventuraPedida) : {}) };
    setE(restaurado);
    setPasso(r.passo);
    setAlcance(r.alcance);
    setEditados(r.editados);
    const temAtributos = sis?.atributos.some((a) => restaurado.atributos[a.id]);
    setOrigemAtributos(temAtributos ? `${restaurado.classe}|${restaurado.metodo}` : null);
    setSugestao(null);
    setTocouSistema(true);
    setOferta(null);
    setAviso(null);
  }

  function descartarRascunho() {
    if (oferta) gravarRascunho(destino, oferta.rascunho.e.sistemaId, null);
    setOferta(null);
  }

  function atualizar(parcial: Partial<Escolhas>) {
    setAviso(null);
    setE((v) => ({ ...v, ...parcial }));
  }

  function escolherSistema(id: string) {
    if (sistemas.find((s) => s.id === id)?.pronto) setTocouSistema(true);
    if (id === e.sistemaId) return;
    const novo = sistemas.find((s) => s.id === id);
    if (!novo?.pronto) return;
    // trocar de sistema zera as escolhas de regra, mas guarda nome, história e campanha (a aventura só se rodar no novo)
    setE((v) => {
      const velha = aventuras.find((a) => a.id === v.aventura);
      const c = velha && !velha.sistemas.includes(id) ? { ...v, ...semAventura(v, velha) } : v;
      return {
        ...escolhasIniciais(id, novo),
        nome: v.nome,
        historia: v.historia,
        jogador: v.jogador,
        campanha: c.campanha,
        cenario: c.cenario,
        tom: c.tom,
        aventura: c.aventura,
        modoMesa: v.modoMesa,
        pin: v.pin,
        adicionarMais: v.adicionarMais,
        dificuldade: v.dificuldade,
        narracao: v.narracao,
        foco: v.foco,
        focoLivre: v.focoLivre,
        instrucoes: v.instrucoes,
        dados: v.dados,
        sugestoes: v.sugestoes,
      };
    });
    setOrigemAtributos(null);
    setEditados(false);
    setAviso(null);
    // outro sistema tem outros passos: o que estava "visitado" não vale mais
    setAlcance(indice);
  }

  function sugerir(metodo: string, classe = e.classe, tentativa = 0) {
    if (!sistema) return;
    const id = sistema.id;
    setE((v) => ({ ...v, metodo }));
    iniciarAtributos(async () => {
      try {
        const valores = await sugerirAtributos(id, classe, metodo);
        setTropeco(null);
        if (!Object.keys(valores).length) return;
        setE((v) => (v.sistemaId === id ? { ...v, atributos: Object.fromEntries(Object.entries(valores).map(([k, n]) => [k, String(n)])) } : v));
        setSugestao(valores);
        setOrigemAtributos(`${classe}|${metodo}`);
        setEditados(false);
      } catch {
        // servidor tropeçou (reiniciando, rede): avisa e tenta mais uma vez, sem levar a página junto
        if (tentativa < 1) {
          setTropeco("Os atributos não vieram. Tentando de novo…");
          setTimeout(() => sugerir(metodo, classe, tentativa + 1), 1500);
        } else {
          setTropeco("Os atributos não vieram. Clique em “Sugerir valores” de novo ou digite à mão.");
        }
      }
    });
  }

  function pedirPrevia(dados: FormData, tentativa = 0) {
    iniciarPrevia(async () => {
      try {
        setPrevia(await previaFicha(dados));
        setTropeco(null);
      } catch {
        if (tentativa < 2) {
          setTropeco("A prévia não carregou. Tentando de novo…");
          setTimeout(() => pedirPrevia(dados, tentativa + 1), 1500);
        } else {
          setTropeco(null);
          setPrevia({ ok: false, erro: "A prévia não carregou (o servidor tropeçou). Dá para criar assim mesmo: a ficha sai das mesmas escolhas." });
        }
      }
    });
  }

  /** Trocar de método: "Livre" só libera a edição (mantém os valores); os outros pedem valores ao servidor. */
  function escolherMetodo(metodo: string) {
    const m = sistema?.metodosAtributos.find((x) => x.id === metodo);
    const temValores = sistema?.atributos.some((a) => e.atributos[a.id]);
    if (tipoMetodo(m) === "livre" && temValores) atualizar({ metodo });
    else sugerir(metodo);
  }

  /** Distribuições fixas: troca os mesmos valores de lugar, para a distribuição continuar válida. */
  function embaralhar() {
    if (!sistema) return;
    const base = sistema.atributos.map((a) => (sugestao ? String(sugestao[a.id] ?? "") : (e.atributos[a.id] ?? "")));
    if (base.some((v) => v === "")) return sugerir(e.metodo);
    const sorteio = crypto.getRandomValues(new Uint32Array(base.length));
    for (let i = base.length - 1; i > 0; i--) {
      const j = sorteio[i] % (i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    setEditados(true);
    atualizar({ atributos: Object.fromEntries(sistema.atributos.map((a, i) => [a.id, base[i]])) });
  }

  function editarAtributo(id: string, valor: string) {
    setEditados(true);
    atualizar({ atributos: { ...e.atributos, [id]: valor } });
  }

  function problema(p: Passo): string | null {
    if (!sistema) return "Escolha um sistema.";
    switch (p) {
      case "sistema":
        return sistema.pronto ? null : `${sistema.nome} ainda está em construção.`;
      case "ancestralidade":
        return sistema.ancestralidades.some((a) => a.id === e.ancestralidade) ? null : `Escolha ${sistema.rotulos.ancestralidade.toLowerCase()}.`;
      case "classe":
        return sistema.classes.some((c) => c.id === e.classe) ? null : `Escolha ${sistema.rotulos.classe.toLowerCase()}.`;
      case "antecedente":
        return sistema.antecedentes?.some((a) => a.id === e.antecedente) ? null : `Escolha ${(sistema.rotulos.antecedente ?? "antecedente").toLowerCase()}.`;
      case "atributos": {
        const { min, max } = sistema.limitesAtributos;
        const valores = sistema.atributos.map((a) => (e.atributos[a.id] ?? "").trim());
        if (valores.every((v) => v === "")) return null;
        if (valores.some((v) => v === "")) return "Preencha todos os atributos ou deixe todos em branco para o sistema decidir.";
        const ruim = sistema.atributos.find((a) => {
          const n = Number(e.atributos[a.id]);
          return !Number.isFinite(n) || n < min || n > max;
        });
        return ruim ? `${ruim.nome} precisa ficar entre ${min} e ${max}.` : null;
      }
      case "pericias":
        return periciasEscolhidas.length > limitePericias ? `No máximo ${limitePericias} perícias.` : null;
      case "opcoes":
        return problemaOpcoes(opcoes, e.extras);
      case "identidade":
        return e.nome.trim() ? null : "Seu personagem precisa de um nome.";
      default:
        return null;
    }
  }

  function irPara(p: Passo) {
    setAviso(null);
    if (p !== "identidade") setVeioPronto(false);
    if (p === "atributos" && sistema?.atributos.length) {
      const vazios = sistema.atributos.every((a) => !e.atributos[a.id]);
      // sugestão nova quando ainda não há valores, ou quando a classe mudou e o jogador não mexeu à mão
      if (vazios || (!editados && origemAtributos?.split("|")[0] !== e.classe)) sugerir(e.metodo);
    }
    if (p === "identidade" && !e.jogador) {
      const salvo = apelidoSalvo();
      if (salvo) setE((v) => ({ ...v, jogador: v.jogador || salvo }));
    }
    if (p === "resumo") {
      travaEnvio.current = true;
      setTimeout(() => (travaEnvio.current = false), 800);
      setPrevia(null);
      // o FormData sai dos campos escondidos, que já refletem o estado atual
      const form = formRef.current;
      if (form) pedirPrevia(new FormData(form));
    }
    setPasso(p);
    setAlcance((a) => Math.max(a, passos.indexOf(p)));
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function avancar() {
    const erro = problema(atual);
    if (erro) return setAviso(erro);
    const proximo = passos[indice + 1];
    if (proximo) irPara(proximo);
  }

  /** Clique na barra de passos: voltar é livre; ir adiante para quem já foi visitado para no primeiro passo com pendência. */
  function pular(i: number) {
    if (i === indice || i > alcance) return;
    if (i > indice) {
      const pendente = passos.slice(indice, i).find((p) => problema(p));
      if (pendente) {
        if (pendente !== atual) irPara(pendente);
        setAviso(problema(pendente));
        return;
      }
    }
    irPara(passos[i]);
  }

  function voltar() {
    const anterior = passos[indice - 1];
    if (anterior) irPara(anterior);
  }

  /** ⚡ Personagem pronto: sorteia tudo que é regra (válido), nome e história, e leva para revisar a identidade. */
  function prontoJa() {
    if (!sistema?.pronto) return;
    setTocouSistema(true);
    const sorteado = personagemPronto(sistema, e);
    setE((v) => ({ ...v, ...sorteado }));
    setOrigemAtributos(null);
    setEditados(false);
    setSugestao(null);
    if (sistema.atributos.length) sugerir(e.metodo || (sistema.metodosAtributos[0]?.id ?? ""), sorteado.classe ?? "");
    irPara("identidade");
    // todos os passos ficam liberados na barra para revisar o que o dado escolheu
    setAlcance(99);
    setVeioPronto(true);
  }

  function aoEnviar(ev: FormEvent<HTMLFormElement>) {
    // Enter num campo ou envio fora do último passo não manda o formulário
    if (!ultimo) {
      ev.preventDefault();
      avancar();
      return;
    }
    // clique duplo no "Revisar" não pode virar envio: o segundo clique cai no botão de criar que acabou de aparecer
    if (travaEnvio.current) {
      ev.preventDefault();
      return;
    }
    const pendente = passos.find((p) => problema(p));
    if (pendente) {
      ev.preventDefault();
      irPara(pendente);
      setAviso(problema(pendente));
      return;
    }
    if (e.jogador.trim()) salvarApelido(e.jogador);
    // deu certo, a página vai embora com o redirect; deu erro, o efeito do rascunho grava de novo quando o estado volta
    if (relogioRascunho.current) clearTimeout(relogioRascunho.current);
    gravarRascunho(destino, e.sistemaId, null);
  }

  function aoTeclar(ev: KeyboardEvent<HTMLFormElement>) {
    if (ev.key === "Enter" && ev.target instanceof HTMLInputElement && ev.target.type !== "checkbox") {
      ev.preventDefault();
      if (!ultimo) avancar();
    }
  }

  const prontos = sistemas.filter((s) => s.pronto);
  const aventurasDoSistema = aventuras.filter((a) => a.sistemas.includes(e.sistemaId));
  const aventuraEscolhida = aventurasDoSistema.find((a) => a.id === e.aventura);
  const temaEscolhido = Boolean(sistemaFixo || pedido || tocouSistema || atual !== "sistema");
  // a prévia só faz sentido entre o sistema e o resumo (o resumo já mostra a ficha inteira)
  const mostrarPrevia = Boolean(sistema) && atual !== "sistema" && atual !== "resumo";
  const proximo = passos[indice + 1];
  const resumoCurto = sistema
    ? [
        e.nome.trim() || "Sem nome",
        sistema.ancestralidades.find((a) => a.id === e.ancestralidade)?.nome,
        sistema.classes.find((c) => c.id === e.classe)?.nome,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  // depois do primeiro passo o título da página encolhe para uma linha junto da barra de passos
  const compacto = indice > 0;
  const primeiroDeRegra = passos.find((p) => p !== "sistema");
  const mostrarPronto = Boolean(sistema?.pronto) && (atual === "sistema" || (atual === primeiroDeRegra && atual !== "identidade"));

  return (
    <div ref={topoRef} className="scroll-mt-4">
      {temaEscolhido && <TemaPagina tema={temaDoSistema(e.sistemaId)} />}
      {cabecalho?.antes}
      {cabecalho && !compacto && (
        <header className="mb-6">
          <h1 className="titulo text-3xl text-pergaminho sm:text-4xl">{cabecalho.titulo}</h1>
          {cabecalho.subtitulo && <p className="mt-2 max-w-2xl text-sm text-muted">{cabecalho.subtitulo}</p>}
        </header>
      )}
      {sistemaFixo && sistema && !sistema.pronto ? null : prontos.length === 0 ? (
        <p className="cartao p-4 text-sm text-muted">Nenhum sistema pronto ainda. O mestre está afinando as regras.</p>
      ) : (
        <form
          ref={formRef}
          action={enviar}
          onSubmit={aoEnviar}
          onKeyDown={aoTeclar}
          noValidate
          className="[&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ambar"
        >
          {oferta && (
            <div role="status" className="cartao mb-4 flex flex-wrap items-center justify-between gap-3 border-ambar/50 bg-ambar/[0.07] px-4 py-3">
              <p className="min-w-0 flex-1 basis-64 text-sm">
                <span className="font-semibold text-pergaminho">
                  Continuar o rascunho de {oferta.rascunho.e.nome.trim() || "alguém sem nome"} ({oferta.quando})?
                </span>{" "}
                <span className="text-muted">
                  {oferta.sistema}
                  {oferta.rascunho.e.campanha.trim() ? ` · ${oferta.rascunho.e.campanha.trim()}` : ""}. O mestre guardou a ficha embaixo do balcão.
                </span>
              </p>
              <span className="flex shrink-0 gap-2">
                <button type="button" className="btn-ambar" onClick={continuarRascunho}>
                  Continuar
                </button>
                <button type="button" className="btn-borda" onClick={descartarRascunho}>
                  Começar do zero
                </button>
              </span>
            </div>
          )}

          {/* progresso: cada passo já visitado é clicável */}
          <nav className="mb-4" aria-label="Passos da criação">
            <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
              <span className="flex min-w-0 items-baseline gap-2">
                {cabecalho && compacto && <h1 className="titulo min-w-0 truncate text-lg leading-tight text-pergaminho sm:text-xl">{cabecalho.titulo}</h1>}
                <span className="shrink-0">
                  {cabecalho && compacto ? "· " : ""}Passo {indice + 1} de {passos.length} · <span className="font-semibold text-ambar">{nomePasso(atual)}</span>
                </span>
              </span>
              {/* no celular, com o título na linha, o nome do sistema sai (já está na prévia) */}
              {sistema && atual !== "sistema" && <span className={`shrink-0 truncate ${cabecalho && compacto ? "hidden sm:inline" : ""}`}>{sistema.nomeCurto}</span>}
            </div>
            <ol className="flex gap-1">
              {passos.map((p, i) => {
                const visitado = i <= alcance;
                return (
                  <li key={p} className="min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={i === indice || !visitado}
                      onClick={() => pular(i)}
                      title={visitado && i !== indice ? `Ir para ${nomePasso(p)}` : nomePasso(p)}
                      aria-current={i === indice ? "step" : undefined}
                      className="group flex w-full flex-col gap-1 rounded-sm py-2 text-left disabled:cursor-default"
                    >
                      <span
                        className={`h-1.5 w-full rounded-full transition-colors ${
                          i === indice ? "bg-ambar" : visitado ? "bg-ambar-forte group-hover:bg-ambar" : "bg-border"
                        }`}
                      />
                      <span
                        className={`hidden truncate text-[11px] leading-tight md:block ${
                          i === indice ? "font-semibold text-ambar" : visitado ? "text-foreground/80 group-hover:text-ambar" : "text-muted"
                        }`}
                      >
                        {nomePasso(p)}
                      </span>
                      <span className="sr-only md:hidden">{nomePasso(p)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {mostrarPronto && sistema && (
            <div className="cartao mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 basis-64 text-sm">
                <span className="font-semibold text-pergaminho">Sem paciência para ficha?</span>{" "}
                <span className="text-muted">O dado escolhe tudo em {sistema.nomeCurto} (dentro das regras, prometo) e você só revisa o nome e a história.</span>
              </p>
              <button type="button" className="btn-ambar shrink-0" onClick={prontoJa}>
                ⚡ Personagem pronto
              </button>
            </div>
          )}

          {veioPronto && atual === "identidade" && (
            <p role="status" className="mb-4 rounded-lg border border-musgo/50 bg-musgo/10 px-3 py-2 text-sm">
              ⚡ Tudo sorteado. Revise o nome e a história; a barra de passos leva a qualquer escolha para trocar o que o dado errou.
            </p>
          )}

          {/* veio do início com uma aventura: lembrete discreto de que a campanha já está pronta, só falta o personagem */}
          {aventuraEscolhida && atual !== "campanha" && atual !== "resumo" && (
            <p role="status" className="mb-4 rounded-lg border border-ambar/40 bg-ambar/[0.07] px-3 py-2 text-sm">
              📜 Aventura pronta: <span className="font-semibold text-pergaminho">{aventuraEscolhida.titulo}</span>.{" "}
              <span className="text-muted">A campanha já vem preenchida; monte o personagem e confira tudo no passo da campanha.</span>
            </p>
          )}

          {tropeco && (
            <p role="status" className="mb-4 rounded-lg border border-ambar/40 bg-ambar/10 px-3 py-2 text-xs text-foreground/90">
              {tropeco}
            </p>
          )}

          {/* no celular a prévia mora numa gaveta acima do passo */}
          {sistema && mostrarPrevia && (
            <details className="cartao group/previa mb-4 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-widest text-ambar-forte">Prévia da ficha</span>
                  <span className="block truncate text-sm text-foreground/90">{resumoCurto}</span>
                </span>
                <span className="text-muted transition-transform group-open/previa:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="border-t border-border px-4 pb-4 pt-3">
                <PreviaLateral sistema={sistema} e={e} opcoes={opcoes} />
              </div>
            </details>
          )}

          {/* pb: o fim do passo não fica escondido atrás da barra grudada no rodapé */}
          <div className={`pb-10 ${mostrarPrevia ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
            <div key={atual} className="surgir min-w-0">
              {atual === "sistema" && <PassoSistema sistemas={sistemas} e={e} escolher={escolherSistema} />}
              {sistema && atual === "ancestralidade" && <PassoAncestralidade sistema={sistema} e={e} atualizar={atualizar} />}
              {sistema && atual === "classe" && <PassoClasse sistema={sistema} e={e} atualizar={atualizar} />}
              {sistema && atual === "antecedente" && <PassoAntecedente sistema={sistema} e={e} atualizar={atualizar} />}
              {sistema && atual === "atributos" && (
                <PassoAtributos
                  sistema={sistema}
                  e={e}
                  atualizar={atualizar}
                  carregando={carregandoAtributos}
                  sugerir={sugerir}
                  editar={editarAtributo}
                  sugestao={sugestao}
                  escolherMetodo={escolherMetodo}
                  embaralhar={embaralhar}
                />
              )}
              {sistema && atual === "pericias" && <PassoPericias sistema={sistema} e={e} atualizar={atualizar} />}
              {sistema && atual === "opcoes" && (
                <PassoOpcoes
                  sistema={sistema}
                  e={e}
                  atualizar={atualizar}
                  opcoes={opcoes}
                  sortearOpcoes={(modoSorteio) => atualizar({ extras: sortearExtras(sistema, e, modoSorteio) })}
                />
              )}
              {atual === "identidade" && <PassoIdentidade e={e} atualizar={atualizar} />}
              {atual === "campanha" && <PassoCampanha e={e} atualizar={atualizar} aventuras={aventurasDoSistema} />}
              {sistema && atual === "resumo" && (
                <Resumo
                  sistema={sistema}
                  e={e}
                  opcoes={opcoes}
                  modo={modo}
                  passos={passos}
                  irPara={(p) => irPara(p as Passo)}
                  previa={previa}
                  carregando={carregandoPrevia}
                  aventura={aventuraEscolhida}
                />
              )}
            </div>

            {sistema && mostrarPrevia && (
              <aside className="hidden lg:block" aria-label="Prévia da ficha">
                <div className="cartao sticky top-6 max-h-[calc(100vh-9rem)] overflow-y-auto p-4">
                  <PreviaLateral sistema={sistema} e={e} opcoes={opcoes} />
                </div>
              </aside>
            )}
          </div>

          {/* navegação grudada no rodapé (celular e desktop): listas longas não escondem o Avançar, nem o aviso de pendência */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-t-xl sm:border-x sm:bg-surface/95">
            {(aviso || (ultimo && estado.erro)) && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-sangue/60 bg-sangue/15 px-3 py-2 text-sm">
                <span className="text-sangue" aria-hidden>
                  ✕
                </span>
                <span>{aviso ?? estado.erro}</span>
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <button type="button" className="btn-borda px-4" onClick={voltar} disabled={indice === 0 || enviando}>
                ← Voltar
              </button>
              <span className="hidden min-w-0 truncate text-center text-xs text-muted sm:block">
                {ultimo ? "Depois daqui, só o mestre e os dados mexem na ficha." : proximo ? `Próximo: ${nomePasso(proximo)}` : ""}
              </span>
              {/* keys diferentes: sem elas o React reaproveita o mesmo <button> e só troca o type para "submit" durante o clique
                  do Avançar, e o navegador envia o formulário no mesmo clique (criava a campanha ao chegar no resumo) */}
              {ultimo ? (
                <button key="enviar" type="submit" className="btn-ambar" disabled={enviando}>
                  {enviando ? "Abrindo a porta…" : (textoBotao ?? "Criar")}
                </button>
              ) : (
                <button key="avancar" type="button" className="btn-ambar" onClick={avancar} disabled={!sistema?.pronto}>
                  {proximo === "resumo" ? "Revisar →" : "Avançar →"}
                </button>
              )}
            </div>
          </div>

          {/* campos do contrato (src/lib/formulario-ficha.ts) */}
          <input type="hidden" name="sistema" value={e.sistemaId} />
          <input type="hidden" name="nome" value={e.nome.trim()} />
          <input type="hidden" name="ancestralidade" value={e.ancestralidade} />
          <input type="hidden" name="classe" value={e.classe} />
          <input type="hidden" name="antecedente" value={e.antecedente} />
          <input type="hidden" name="metodo" value={e.metodo} />
          <input type="hidden" name="historia" value={e.historia.trim()} />
          <input type="hidden" name="jogador" value={e.jogador.trim()} />
          {sistema?.atributos.map((a) => (
            <input key={a.id} type="hidden" name={`attr_${a.id}`} value={(e.atributos[a.id] ?? "").trim()} />
          ))}
          {periciasEscolhidas.map((p) => (
            <input key={p} type="hidden" name="pericias" value={p} />
          ))}
          {opcoes.flatMap((o) =>
            (e.extras[o.id] ?? [])
              .map((v) => v.trim())
              // escolha que deixou de valer (trocou a ancestralidade) não vai junto
              .filter((v) => v && (!(o.tipo === "escolha" || o.tipo === "multipla") || !o.opcoes?.length || o.opcoes.some((x) => x.id === v)))
              .map((v, i) => <input key={`${o.id}-${i}`} type="hidden" name={`extra_${o.id}`} value={v} />),
          )}
          {modo === "campanha" && (
            <>
              <input type="hidden" name="campanha" value={e.campanha.trim()} />
              <input type="hidden" name="cenario" value={e.cenario.trim()} />
              <input type="hidden" name="tom" value={e.tom.trim()} />
              {aventuraEscolhida && <input type="hidden" name="aventura" value={aventuraEscolhida.id} />}
              <input type="hidden" name="modo_mesa" value={e.modoMesa} />
              <input type="hidden" name="pin" value={e.pin} />
              {e.adicionarMais && <input type="hidden" name="adicionar_mais" value="1" />}
              <input type="hidden" name="dificuldade" value={e.dificuldade} />
              <input type="hidden" name="narracao" value={e.narracao} />
              {e.foco.map((f) => (
                <input key={f} type="hidden" name="foco" value={f} />
              ))}
              <input type="hidden" name="focoLivre" value={e.focoLivre.trim()} />
              <input type="hidden" name="instrucoes" value={e.instrucoes.trim()} />
              <input type="hidden" name="dados" value={e.dados} />
              {e.sugestoes && <input type="hidden" name="sugestoes" value="on" />}
            </>
          )}
        </form>
      )}
    </div>
  );
}
