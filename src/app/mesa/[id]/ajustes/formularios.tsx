"use client";

import { useActionState, useState } from "react";
import { DIFICULDADES, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, separarFoco, TAMANHOS, type Dificuldade, type TamanhoNarracao } from "@/lib/mestre/estilo";
import type { EstadoAjustes } from "./acoes";

// Formulários da página de ajustes: dados da campanha, PIN da rede e a porta dos fundos (excluir).

type Acao = (estado: EstadoAjustes, form: FormData) => Promise<EstadoAjustes>;

const TONS = ["sombrio e debochado", "épico e heroico", "terror lento", "comédia pastelão", "intriga política", "aventura pulp", "melancólico"];

const MODOS = [
  {
    id: "livre",
    nome: "Livre",
    texto: "Cada ação vai para o mestre assim que ele termina de falar. Quem chega junto é narrado junto. Bom para um ou dois jogadores, ou grupo que gosta de atropelo.",
  },
  {
    id: "rodada",
    nome: "Rodada",
    texto: "O mestre espera todos os personagens declararem o que fazem e narra tudo de uma vez. Ideal para mesa local passando o teclado: ninguém fica para trás, e dá para forçar se alguém dormir.",
  },
] as const;

const DADOS = [
  {
    id: "jogador",
    nome: "O jogador, na tela",
    texto: "O mestre pede o teste e espera. Você clica e rola: d20 em 3D, ou a parada do sistema (d10 do Vampiro, d100, Fate). Mais suspense, um clique a mais.",
  },
  {
    id: "automatico",
    nome: "O mestre, na hora",
    texto: "O servidor rola assim que o mestre pede e ele já narra o resultado. Mais rápido, menos cerimônia.",
  },
] as const;

function Aviso({ estado }: { estado: EstadoAjustes }) {
  if (estado.erro)
    return (
      <p role="alert" className="text-sm text-sangue">
        {estado.erro}
      </p>
    );
  if (estado.ok)
    return (
      <p role="status" className="text-sm text-musgo">
        ✓ {estado.ok}
      </p>
    );
  return null;
}

// cartão de opção com rádio dentro: o anel aparece quando o rádio tem foco de teclado
const CARTAO_RADIO = "cursor-pointer rounded-lg border p-3 transition has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ambar/70";

/** Grupo de cartões de rádio (mesmo visual de "Modo da mesa" e "Quem rola os testes"). */
function CartoesRadio<T extends string>({
  legenda,
  nome,
  opcoes,
  valor,
  aoMudar,
}: {
  legenda: string;
  nome: string;
  opcoes: readonly { id: T; nome: string; texto: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{legenda}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {opcoes.map((m) => (
          <label key={m.id} className={`${CARTAO_RADIO} ${valor === m.id ? "border-ambar bg-ambar/10" : "border-border hover:border-ambar/50"}`}>
            <span className="flex items-center gap-2">
              <input type="radio" name={nome} value={m.id} checked={valor === m.id} onChange={() => aoMudar(m.id)} className="h-4 w-4 accent-[var(--ambar)]" />
              <span className="font-semibold text-pergaminho">{m.nome}</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">{m.texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormularioCampanha({
  acao,
  inicial,
  bloqueado,
}: {
  acao: Acao;
  inicial: {
    nome: string;
    cenario: string;
    tom: string;
    modo: "livre" | "rodada";
    dados: "jogador" | "automatico";
    sugestoes: boolean;
    dificuldade: Dificuldade;
    narracao: TamanhoNarracao;
    foco: string[];
    instrucoes: string;
  };
  bloqueado: boolean;
}) {
  // "sujo" = mexeu em algo depois do último salvar; o rodapé avisa para ninguém sair achando que salvou
  const [sujo, setSujo] = useState(false);
  const [estado, enviar, enviando] = useActionState(async (anterior: EstadoAjustes, form: FormData) => {
    const r = await acao(anterior, form);
    if (!r.erro) setSujo(false);
    return r;
  }, { erro: null });
  const [modo, setModo] = useState(inicial.modo);
  const [dados, setDados] = useState(inicial.dados);
  const [tom, setTom] = useState(inicial.tom);
  const [dificuldade, setDificuldade] = useState(inicial.dificuldade);
  const [narracao, setNarracao] = useState(inicial.narracao);
  const [instrucoes, setInstrucoes] = useState(inicial.instrucoes);
  const foco = separarFoco(inicial.foco);
  return (
    <form action={enviar} onChange={() => setSujo(true)} className="space-y-4">
      <fieldset disabled={bloqueado} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Nome da campanha</span>
          <input name="nome" defaultValue={inicial.nome} maxLength={80} required className="campo" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Cenário</span>
          <textarea name="cenario" defaultValue={inicial.cenario} maxLength={1500} rows={4} className="campo resize-y" placeholder="Onde a história acontece e o que paira no ar" />
          <span className="mt-1 block text-xs text-muted">O mestre relê isto a cada turno. Mudar no meio da campanha é como trocar o mapa com o grupo dentro.</span>
        </label>
        <div>
          <label htmlFor="tom-mesa" className="mb-1 block text-sm text-muted">
            Tom
          </label>
          <input id="tom-mesa" name="tom" value={tom} onChange={(e) => setTom(e.target.value)} maxLength={60} className="campo" />
          {/* sugestões à vista (o datalist some no celular) */}
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Sugestões de tom">
            {TONS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tom === t}
                onClick={() => {
                  setTom(t);
                  setSujo(true);
                }}
                className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm transition sm:min-h-8 sm:text-xs ${
                  tom === t ? "border-ambar bg-ambar/15 text-ambar" : "border-border text-foreground/80 hover:border-ambar/60 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Modo da mesa</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODOS.map((m) => (
              <label
                key={m.id}
                className={`${CARTAO_RADIO} ${modo === m.id ? "border-ambar bg-ambar/10" : "border-border hover:border-ambar/50"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="modo" value={m.id} checked={modo === m.id} onChange={() => setModo(m.id)} className="h-4 w-4 accent-[var(--ambar)]" />
                  <span className="font-semibold text-pergaminho">{m.nome}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{m.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Quem rola os testes</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DADOS.map((m) => (
              <label
                key={m.id}
                className={`${CARTAO_RADIO} ${dados === m.id ? "border-ambar bg-ambar/10" : "border-border hover:border-ambar/50"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="dados" value={m.id} checked={dados === m.id} onChange={() => setDados(m.id)} className="h-4 w-4 accent-[var(--ambar)]" />
                  <span className="font-semibold text-pergaminho">{m.nome}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{m.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:border-ambar/50 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ambar/70">
          <input type="checkbox" name="sugestoes" defaultChecked={inicial.sugestoes} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ambar)]" />
          <span>
            <span className="font-semibold text-pergaminho">Ações sugeridas</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">A cada turno o mestre oferece 3 opções clicáveis. Dá para escrever a própria ação do mesmo jeito.</span>
          </span>
        </label>

        {/* estilo do mestre: entra no prompt a partir do próximo turno */}
        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <h3 className="titulo text-lg text-pergaminho">Estilo do mestre</h3>
            <p className="text-xs text-muted">Vale a partir do próximo turno. O padrão é o mestre de sempre.</p>
          </div>
          <CartoesRadio legenda="Dificuldade" nome="dificuldade" opcoes={DIFICULDADES} valor={dificuldade} aoMudar={setDificuldade} />
          <CartoesRadio legenda="Tamanho da narração" nome="narracao" opcoes={TAMANHOS} valor={narracao} aoMudar={setNarracao} />
          <fieldset>
            <legend className="mb-2 text-sm text-muted">Foco (opcional): o que o mestre deve privilegiar</legend>
            <div className="flex flex-wrap gap-1.5">
              {FOCOS.map((f) => (
                <label
                  key={f.id}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-sm text-foreground/80 transition hover:border-ambar/60 has-[input:checked]:border-ambar has-[input:checked]:bg-ambar/15 has-[input:checked]:text-ambar has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ambar/70 sm:min-h-8 sm:text-xs"
                >
                  <input type="checkbox" name="foco" value={f.id} defaultChecked={foco.ids.includes(f.id)} className="h-3.5 w-3.5 accent-[var(--ambar)]" />
                  {f.nome}
                </label>
              ))}
            </div>
            <input
              name="focoLivre"
              defaultValue={foco.livre}
              maxLength={MAX_FOCO_LIVRE}
              aria-label="Outro foco, em poucas palavras"
              placeholder="Outro, em poucas palavras (ex.: política de guildas)"
              className="campo mt-2"
            />
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Instruções da casa</span>
            <textarea
              name="instrucoes"
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              maxLength={MAX_INSTRUCOES}
              rows={3}
              className="campo resize-y"
              placeholder="Regras e preferências da mesa: “sem aranhas”, “NPCs falam com sotaque nordestino”, “regra da casa: críticos explodem”"
            />
            <span className="mt-1 flex justify-between gap-2 text-xs text-muted">
              <span>O mestre segue isto acima das regras gerais (menos as de segurança).</span>
              <span aria-live="polite">
                {instrucoes.length}/{MAX_INSTRUCOES}
              </span>
            </span>
          </label>
        </div>
      </fieldset>
      {/* rodapé grudado enquanto o formulário está na tela: o Salvar e o retorno ficam sempre à vista */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-xl border-t border-border bg-surface/95 px-5 py-3 backdrop-blur">
        <button className="btn-ambar" disabled={bloqueado || enviando}>
          {enviando ? "Salvando…" : "Salvar ajustes"}
        </button>
        {sujo && !enviando && !estado.erro ? (
          <p className="text-sm text-ambar" role="status">
            Alterações não salvas
          </p>
        ) : (
          <Aviso estado={estado} />
        )}
      </div>
    </form>
  );
}

/** PIN pela rota do porteiro (PUT /api/campanhas/[id]/pin), que valida o formato e derruba quem entrou com o antigo. */
export function FormularioPin({
  campanhaId,
  temPin,
  pinAtual,
  bloqueado,
}: {
  campanhaId: number;
  temPin: boolean;
  /** só vem preenchido na máquina da taverna */
  pinAtual: string | null;
  bloqueado: boolean;
}) {
  const [pin, setPin] = useState(pinAtual);
  const [tem, setTem] = useState(temPin);
  const [novo, setNovo] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState<EstadoAjustes>({ erro: null });
  const [enviando, setEnviando] = useState(false);

  async function salvar(valor: string | null) {
    setEnviando(true);
    setEstado({ erro: null });
    try {
      const r = await fetch(`/api/campanhas/${campanhaId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: valor }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setEstado({ erro: corpo.erro ?? `Erro ${r.status}` });
        return;
      }
      setPin(valor);
      setTem(Boolean(valor));
      setNovo("");
      setEstado({ erro: null, ok: valor ? "PIN trocado. Quem entrou com o antigo vai ter que bater na porta de novo." : "PIN removido: porta aberta na rede local." });
    } catch {
      setEstado({ erro: "A taverna não respondeu. O servidor está de pé?" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        {pin ? (
          <>
            PIN atual:{" "}
            <button type="button" onClick={() => setVer((v) => !v)} className="-my-1 rounded px-1.5 py-1 font-mono text-ambar hover:bg-ambar/10 hover:underline" title={ver ? "Esconder" : "Mostrar"}>
              {ver ? pin : "•".repeat(pin.length)}
            </button>
          </>
        ) : tem ? (
          <span className="text-muted">Esta mesa tem PIN (o número só aparece na máquina da taverna).</span>
        ) : (
          <span className="text-muted">Sem PIN: qualquer aparelho na sua rede que souber o endereço entra na mesa.</span>
        )}
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (novo.trim()) void salvar(novo.trim());
        }}
      >
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          maxLength={12}
          placeholder={tem ? "Novo PIN" : "Definir PIN (3 a 12 letras ou números)"}
          aria-label="Novo PIN"
          autoComplete="off"
          disabled={bloqueado}
          className="campo min-w-0 flex-1"
        />
        <button className="btn-borda" disabled={bloqueado || enviando || !novo.trim()}>
          {tem ? "Trocar" : "Definir"}
        </button>
        {tem && (
          <button type="button" className="btn-borda hover:border-sangue hover:text-sangue" disabled={bloqueado || enviando} onClick={() => void salvar(null)}>
            Remover
          </button>
        )}
      </form>
      <Aviso estado={estado} />
    </div>
  );
}

/** Aventura pronta em andamento: só leitura, com a opção de desligar o roteiro e seguir livre. */
export function FormularioAventura({ acao, bloqueado }: { acao: Acao; bloqueado: boolean }) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const [certeza, setCerteza] = useState(false);
  if (estado.ok) return <Aviso estado={estado} />;
  return (
    <form action={enviar} className="space-y-2">
      {certeza ? (
        <>
          <p className="text-sm">O mestre esquece o roteiro (NPCs, pistas, finais) e segue só com o que já aconteceu. Não dá para religar depois.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-borda hover:border-sangue hover:text-sangue" disabled={enviando || bloqueado}>
              {enviando ? "Rasgando o roteiro…" : "Desligar o roteiro"}
            </button>
            <button type="button" className="btn-borda" onClick={() => setCerteza(false)}>
              Deixa como está
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn-borda" disabled={bloqueado} onClick={() => setCerteza(true)}>
          Seguir livre, sem o roteiro
        </button>
      )}
      <Aviso estado={estado} />
    </form>
  );
}

export function FormularioExcluir({ acao, nome, bloqueado }: { acao: Acao; nome: string; bloqueado: boolean }) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  if (!aberto) {
    return (
      <button type="button" className="btn-borda hover:border-sangue hover:text-sangue" disabled={bloqueado} onClick={() => setAberto(true)}>
        Excluir campanha
      </button>
    );
  }
  return (
    <form action={enviar} className="space-y-3">
      <p className="text-sm">
        Isso apaga personagens, chat, diário e cena. Não tem ressurreição, nem pagando o clérigo. Digite <strong className="text-pergaminho">{nome}</strong> para
        confirmar:
      </p>
      <input name="confirmacao" value={texto} onChange={(e) => setTexto(e.target.value)} className="campo" autoComplete="off" aria-label="Nome da campanha" />
      <Aviso estado={estado} />
      <div className="flex flex-wrap gap-2">
        <button
          className="btn bg-sangue text-foreground hover:bg-sangue/80"
          disabled={enviando || texto.trim().toLowerCase() !== nome.trim().toLowerCase()}
        >
          {enviando ? "Apagando…" : "Apagar para sempre"}
        </button>
        <button type="button" className="btn-borda" onClick={() => setAberto(false)}>
          Melhor não
        </button>
      </div>
    </form>
  );
}
