"use client";

import { useActionState, useState } from "react";
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

function Aviso({ estado }: { estado: EstadoAjustes }) {
  if (estado.erro) return <p className="text-sm text-sangue">{estado.erro}</p>;
  if (estado.ok) return <p className="text-sm text-musgo">{estado.ok}</p>;
  return null;
}

export function FormularioCampanha({
  acao,
  inicial,
  bloqueado,
}: {
  acao: Acao;
  inicial: { nome: string; cenario: string; tom: string; modo: "livre" | "rodada" };
  bloqueado: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(acao, { erro: null });
  const [modo, setModo] = useState(inicial.modo);
  return (
    <form action={enviar} className="space-y-4">
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
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Tom</span>
          <input name="tom" defaultValue={inicial.tom} maxLength={60} list="tons-taverna" className="campo" />
          <datalist id="tons-taverna">
            {TONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Modo da mesa</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODOS.map((m) => (
              <label
                key={m.id}
                className={`cursor-pointer rounded-lg border p-3 transition ${modo === m.id ? "border-ambar bg-ambar/10" : "border-border hover:border-ambar/50"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="modo" value={m.id} checked={modo === m.id} onChange={() => setModo(m.id)} className="accent-[var(--ambar)]" />
                  <span className="font-semibold text-pergaminho">{m.nome}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{m.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>
      <Aviso estado={estado} />
      <button className="btn-ambar" disabled={bloqueado || enviando}>
        {enviando ? "Salvando…" : "Salvar ajustes"}
      </button>
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
            <button type="button" onClick={() => setVer((v) => !v)} className="font-mono text-ambar hover:underline" title={ver ? "Esconder" : "Mostrar"}>
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
