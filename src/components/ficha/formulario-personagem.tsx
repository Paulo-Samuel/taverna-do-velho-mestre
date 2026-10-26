"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { previaFicha, sugerirAtributos, type PreviaFicha } from "@/app/acoes-ficha";
import { apelido as apelidoSalvo, salvarApelido } from "@/lib/cliente/identidade";
import type { OpcaoCriacao, SistemaPublico } from "@/lib/sistemas/tipos";
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
  type Escolhas,
} from "./passos";
import { PreviaLateral, Resumo } from "./previa";

// Assistente de criação de personagem, guiado só pelos dados públicos do sistema (SistemaPublico).
// Um único <form> para a server action: os passos são controlados e os campos do contrato
// (src/lib/formulario-ficha.ts) saem em <input type="hidden"> no fim do formulário.

export type EstadoFormulario = { erro: string | null };

export type PropsFormulario = {
  sistemas: SistemaPublico[];
  /** sistema fixo (personagem novo numa mesa existente); sem isso o jogador escolhe o sistema */
  sistemaFixo?: string;
  /** sistema já marcado ao abrir (vindo do catálogo, /nova/avancada?sistema=); o jogador ainda pode trocar */
  sistemaInicial?: string;
  /** server action que recebe o FormData */
  acao: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  /** "campanha": também pede nome, cenário, tom e modo da mesa; "personagem": só o personagem */
  modo: "campanha" | "personagem";
  textoBotao?: string;
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
    modoMesa: "livre",
    pin: "",
    adicionarMais: false,
  };
}

/** Opções de criação que valem para a classe e a ancestralidade escolhidas (itens de outra ancestralidade somem). */
function opcoesValidas(sistema: SistemaPublico | undefined, classe: string, ancestralidade: string): OpcaoCriacao[] {
  const vale = (lista: string[] | undefined, id: string) => !lista?.length || lista.includes(id);
  return (sistema?.opcoesCriacao ?? [])
    .filter((o) => vale(o.classes, classe) && vale(o.ancestralidades, ancestralidade))
    .map((o) => (o.opcoes?.some((x) => x.ancestralidades?.length) ? { ...o, opcoes: o.opcoes.filter((x) => vale(x.ancestralidades, ancestralidade)) } : o))
    // lista fechada que ficou vazia (nenhuma herança desta ancestralidade) não tem o que escolher
    .filter((o) => !((o.tipo === "escolha" || o.tipo === "multipla") && o.opcoes && !o.opcoes.length));
}

export function FormularioPersonagem({ sistemas, sistemaFixo, sistemaInicial, acao, modo, textoBotao }: PropsFormulario) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const formRef = useRef<HTMLFormElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);

  const pedido = sistemas.find((s) => s.id === sistemaInicial && s.pronto)?.id;
  const inicial = sistemaFixo ?? pedido ?? sistemas.find((s) => s.pronto)?.id ?? "";
  const [e, setE] = useState<Escolhas>(() => escolhasIniciais(inicial, sistemas.find((s) => s.id === inicial)));
  // veio do catálogo com o sistema escolhido: pula direto para o personagem (a barra de passos deixa voltar)
  const [passo, setPasso] = useState<Passo>(sistemaFixo || pedido ? "ancestralidade" : "sistema");
  const [aviso, setAviso] = useState<string | null>(null);
  // de que classe+método vieram os atributos atuais; editar à mão congela (não sobrescrevemos o que o jogador digitou)
  const [origemAtributos, setOrigemAtributos] = useState<string | null>(null);
  const [editados, setEditados] = useState(false);
  // últimos valores que o servidor sugeriu: base do "Embaralhar" e do aviso de fora da distribuição
  const [sugestao, setSugestao] = useState<Record<string, number> | null>(null);
  const [carregandoAtributos, iniciarAtributos] = useTransition();
  const [previa, setPrevia] = useState<PreviaFicha | null>(null);
  const [carregandoPrevia, iniciarPrevia] = useTransition();

  const sistema = sistemas.find((s) => s.id === e.sistemaId);
  const opcoes = opcoesValidas(sistema, e.classe, e.ancestralidade);
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

  function atualizar(parcial: Partial<Escolhas>) {
    setAviso(null);
    setE((v) => ({ ...v, ...parcial }));
  }

  function escolherSistema(id: string) {
    if (id === e.sistemaId) return;
    const novo = sistemas.find((s) => s.id === id);
    if (!novo?.pronto) return;
    // trocar de sistema zera as escolhas de regra, mas guarda nome, história e campanha
    setE((v) => ({
      ...escolhasIniciais(id, novo),
      nome: v.nome,
      historia: v.historia,
      jogador: v.jogador,
      campanha: v.campanha,
      cenario: v.cenario,
      tom: v.tom,
      modoMesa: v.modoMesa,
      pin: v.pin,
      adicionarMais: v.adicionarMais,
    }));
    setOrigemAtributos(null);
    setEditados(false);
    setAviso(null);
  }

  function sugerir(metodo: string, classe = e.classe) {
    if (!sistema) return;
    setE((v) => ({ ...v, metodo }));
    iniciarAtributos(async () => {
      const valores = await sugerirAtributos(sistema.id, classe, metodo);
      if (!Object.keys(valores).length) return;
      setE((v) => ({ ...v, atributos: Object.fromEntries(Object.entries(valores).map(([k, n]) => [k, String(n)])) }));
      setSugestao(valores);
      setOrigemAtributos(`${classe}|${metodo}`);
      setEditados(false);
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
      case "opcoes": {
        for (const o of opcoes) {
          const fechada = (o.tipo === "escolha" || o.tipo === "multipla") && o.opcoes?.length;
          const valores = (e.extras[o.id] ?? []).filter((v) => v.trim() && (!fechada || o.opcoes?.some((x) => x.id === v)));
          if (o.obrigatoria && !valores.length) return `Preencha: ${o.rotulo}.`;
        }
        return null;
      }
      case "identidade":
        return e.nome.trim() ? null : "Seu personagem precisa de um nome.";
      default:
        return null;
    }
  }

  function irPara(p: Passo) {
    setAviso(null);
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
      setPrevia(null);
      // o FormData sai dos campos escondidos, que já refletem o estado atual
      const form = formRef.current;
      if (form) {
        const dados = new FormData(form);
        iniciarPrevia(async () => setPrevia(await previaFicha(dados)));
      }
    }
    setPasso(p);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function avancar() {
    const erro = problema(atual);
    if (erro) return setAviso(erro);
    const proximo = passos[indice + 1];
    if (proximo) irPara(proximo);
  }

  function voltar() {
    const anterior = passos[indice - 1];
    if (anterior) irPara(anterior);
  }

  function aoEnviar(ev: FormEvent<HTMLFormElement>) {
    // Enter num campo ou envio fora do último passo não manda o formulário
    if (!ultimo) {
      ev.preventDefault();
      avancar();
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
  }

  function aoTeclar(ev: KeyboardEvent<HTMLFormElement>) {
    if (ev.key === "Enter" && ev.target instanceof HTMLInputElement && ev.target.type !== "checkbox") {
      ev.preventDefault();
      if (!ultimo) avancar();
    }
  }

  const prontos = sistemas.filter((s) => s.pronto);

  return (
    <div ref={topoRef} className="mt-6 scroll-mt-4">
      {sistemaFixo && sistema && !sistema.pronto ? null : prontos.length === 0 ? (
        <p className="cartao p-4 text-sm text-muted">Nenhum sistema pronto ainda. O mestre está afinando as regras.</p>
      ) : (
        <form ref={formRef} action={enviar} onSubmit={aoEnviar} onKeyDown={aoTeclar} noValidate>
          {/* progresso */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-muted">
              <span>
                Passo {indice + 1} de {passos.length} · <span className="text-ambar">{nomePasso(atual)}</span>
              </span>
              {sistema && atual !== "sistema" && <span className="truncate">{sistema.nomeCurto}</span>}
            </div>
            <div className="flex gap-1" role="list" aria-label="Passos">
              {passos.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  role="listitem"
                  disabled={i >= indice}
                  onClick={() => irPara(p)}
                  title={nomePasso(p)}
                  aria-current={i === indice ? "step" : undefined}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i < indice ? "bg-ambar-forte hover:bg-ambar" : i === indice ? "bg-ambar" : "bg-surface-2"} disabled:cursor-default`}
                >
                  <span className="sr-only">{nomePasso(p)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
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
              {sistema && atual === "opcoes" && <PassoOpcoes sistema={sistema} e={e} atualizar={atualizar} opcoes={opcoes} />}
              {atual === "identidade" && <PassoIdentidade e={e} atualizar={atualizar} />}
              {atual === "campanha" && <PassoCampanha e={e} atualizar={atualizar} />}
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
                />
              )}
            </div>

            {sistema && atual !== "sistema" && atual !== "resumo" && (
              <aside className="hidden lg:block">
                <div className="cartao sticky top-6 p-4">
                  <PreviaLateral sistema={sistema} e={e} opcoes={opcoes} />
                </div>
              </aside>
            )}
          </div>

          {(aviso || (ultimo && estado.erro)) && (
            <p role="alert" className="mt-4 rounded-md border border-sangue/60 bg-sangue/10 px-3 py-2 text-sm">
              {aviso ?? estado.erro}
            </p>
          )}

          {/* navegação: grudada no rodapé no celular, para não precisar rolar até o fim de listas longas */}
          <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
            <button type="button" className="btn-borda" onClick={voltar} disabled={indice === 0 || enviando}>
              ← Voltar
            </button>
            {ultimo ? (
              <button type="submit" className="btn-ambar" disabled={enviando}>
                {enviando ? "Abrindo a porta…" : (textoBotao ?? "Criar")}
              </button>
            ) : (
              <button type="button" className="btn-ambar" onClick={avancar} disabled={!sistema?.pronto}>
                Avançar →
              </button>
            )}
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
              <input type="hidden" name="modo_mesa" value={e.modoMesa} />
              <input type="hidden" name="pin" value={e.pin} />
              {e.adicionarMais && <input type="hidden" name="adicionar_mais" value="1" />}
            </>
          )}
        </form>
      )}
    </div>
  );
}
