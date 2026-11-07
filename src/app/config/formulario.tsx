"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { AjustesMestre, IdProvedor } from "@/lib/mestre";
import { salvarAjustesAcao, statusLoginAcao, testarConexaoAcao, usarExecutavelAcao, type EstadoSalvar, type ResultadoTeste } from "./acoes";
import type { AlternativaClaude, StatusClaude } from "./claude-local";

export type PadroesEnv = {
  provedor: IdProvedor;
  modeloCli: string;
  binCli: string;
  modeloApi: string;
  temChaveApi: boolean;
};

type Escolha = "" | IdProvedor;

const OPCOES: { id: IdProvedor; nome: string; custo: string; texto: string }[] = [
  {
    id: "cli",
    nome: "Claude Code (seu plano)",
    custo: "Sai da assinatura Pro/Max",
    texto:
      "Usa o Claude Code instalado e logado neste computador. Não cobra nada à parte: gasta dos mesmos limites de 5 horas e semanal que você já tem no plano.",
  },
  {
    id: "api",
    nome: "API da Anthropic",
    custo: "Paga por uso (créditos)",
    texto:
      "Cada turno consome créditos da sua chave de API. Bom para quem não tem plano ou quer deixar a taverna rodando para outras pessoas.",
  },
  {
    id: "falso",
    nome: "Mestre de teste",
    custo: "De graça (e sem graça)",
    texto: "Sem IA: um mestre de mentirinha que rola dados e responde frases prontas. Serve para testar a mesa, o rolador e a rede.",
  },
];

const MODELOS_CLI = [
  { id: "sonnet", rotulo: "equilibrado (padrão bom)" },
  { id: "opus", rotulo: "mais caprichado, gasta o limite mais rápido" },
  { id: "haiku", rotulo: "rapidinho e econômico" },
];

// Preços por milhão de tokens (entrada/saída), para dar noção do tamanho da conta.
const MODELOS_API = [
  { id: "claude-sonnet-5-5", rotulo: "US$ 2 / 10 — padrão" },
  { id: "claude-opus-5-5", rotulo: "US$ 4 / 20 — narra melhor, custa o dobro" },
  { id: "claude-haiku-5-5", rotulo: "US$ 0,10 / 0,50 — baratíssimo" },
  { id: "claude-fable-5-1", rotulo: "US$ 10 / 50 — o mais capaz, para quem tem ouro" },
];

export function FormularioConfig({ ajustes, padroes }: { ajustes: AjustesMestre; padroes: PadroesEnv }) {
  const [escolha, setEscolha] = useState<Escolha>(ajustes.provedor ?? "");
  const efetivo: IdProvedor = escolha || padroes.provedor;
  const [salvo, salvar, salvando] = useActionState(salvarAjustesAcao, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [teste, setTeste] = useState<ResultadoTeste | null>(null);
  const [testando, iniciarTeste] = useTransition();

  const testar = () => {
    if (!formRef.current) return;
    const dados = new FormData(formRef.current);
    setTeste(null);
    iniciarTeste(async () => setTeste(await testarConexaoAcao(dados)));
  };

  return (
    <form ref={formRef} action={salvar} className="mt-8 space-y-8">
      <fieldset>
        <legend className="titulo mb-3 text-xl text-pergaminho">Quem mestra</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <CartaoOpcao
            marcado={escolha === ""}
            aoMarcar={() => setEscolha("")}
            valor=""
            titulo="Seguir o .env"
            custo={`Hoje: ${OPCOES.find((o) => o.id === padroes.provedor)?.nome}`}
            texto="Deixa a escolha com TAVERNA_PROVEDOR do .env.local (ou Claude Code, se não houver nada lá)."
          />
          {OPCOES.map((o) => (
            <CartaoOpcao
              key={o.id}
              marcado={escolha === o.id}
              aoMarcar={() => setEscolha(o.id)}
              valor={o.id}
              titulo={o.nome}
              custo={o.custo}
              texto={o.texto}
            />
          ))}
        </div>
      </fieldset>

      {/* As seções escondidas continuam no formulário: salvar uma não apaga a outra. */}
      <section className={efetivo === "cli" ? "space-y-4" : "hidden"}>
        <h2 className="titulo text-xl text-pergaminho">Claude Code</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">Modelo</span>
            <input
              name="modeloCli"
              list="modelos-cli"
              defaultValue={ajustes.modeloCli ?? ""}
              placeholder={padroes.modeloCli || "padrão do Claude Code"}
              className="campo mt-1"
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="modelos-cli">
              {MODELOS_CLI.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo}
                </option>
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-muted">Apelido (sonnet, opus, haiku) ou o nome completo do modelo.</span>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Executável (opcional)</span>
            <input
              name="binCli"
              defaultValue={ajustes.binCli ?? ""}
              placeholder={padroes.binCli || "claude do PATH"}
              className="campo mt-1 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="mt-1 block text-xs text-muted">
              Vazio: a taverna procura sozinha (PATH, npm, app desktop). Ou o caminho do claude.exe, uma pasta com ele, ou{" "}
              <code className="text-ambar">desktop</code> para usar sempre o mais novo embutido no app Claude.
            </span>
          </label>
        </div>
        <StatusLogin binRef={formRef} ativo={efetivo === "cli"} />
        <AvisoUsoPessoal />
      </section>

      <section className={efetivo === "api" ? "space-y-4" : "hidden"}>
        <h2 className="titulo text-xl text-pergaminho">API da Anthropic</h2>
        <label className="block text-sm sm:max-w-md">
          <span className="text-muted">Modelo</span>
          <input
            name="modeloApi"
            list="modelos-api"
            defaultValue={ajustes.modeloApi ?? ""}
            placeholder={padroes.modeloApi}
            className="campo mt-1"
            autoComplete="off"
            spellCheck={false}
          />
          <datalist id="modelos-api">
            {MODELOS_API.map((m) => (
              <option key={m.id} value={m.id}>
                {m.rotulo}
              </option>
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-muted">Preço por milhão de tokens (entrada / saída) aparece na lista. Um turno típico gasta uns poucos milhares.</span>
        </label>
        <p className={`cartao p-4 text-sm ${padroes.temChaveApi ? "text-musgo" : "text-sangue"}`}>
          {padroes.temChaveApi ? (
            "Chave de API encontrada no ambiente (ANTHROPIC_API_KEY)."
          ) : (
            <>
              Nenhuma ANTHROPIC_API_KEY no ambiente. Ponha a chave no <code>.env.local</code> e reinicie o app; por segurança ela não é
              digitada nem guardada por esta página.
            </>
          )}
        </p>
      </section>

      <section className={efetivo === "falso" ? "" : "hidden"}>
        <p className="cartao p-4 text-sm text-muted">
          O mestre de teste não pensa, não cobra e não tem configuração. Ótimo para conferir se o celular do amigo chega na mesa antes de
          gastar um único token.
        </p>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button type="submit" className="btn-ambar min-h-11" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="btn-borda min-h-11" onClick={testar} disabled={testando}>
          {testando ? "Chamando o mestre…" : "Testar conexão"}
        </button>
        <span role="status" className={`text-sm ${salvo?.ok ? "text-musgo" : "text-sangue"}`}>
          {salvo?.mensagem}
        </span>
        {/* junto do botão: no celular a barra gruda no rodapé e o aviso solto ficava longe dele */}
        {efetivo === "cli" && <p className="basis-full text-xs text-muted">No modo Claude Code, o teste gasta um tiquinho do limite do seu plano.</p>}
      </div>

      {teste && (
        <div className={`cartao surgir p-4 text-sm ${teste.ok ? "border-musgo/60" : "border-sangue/60"}`} role="status">
          <p className={teste.ok ? "text-musgo" : "text-sangue"}>
            {teste.ok ? "O mestre respondeu" : "O mestre não respondeu"} em {(teste.ms / 1000).toFixed(1)} s
          </p>
          <p className="mt-1 text-xs text-muted">{teste.provedor}</p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-foreground">{teste.resposta}</pre>
        </div>
      )}
    </form>
  );
}

function CartaoOpcao(props: { marcado: boolean; aoMarcar: () => void; valor: string; titulo: string; custo: string; texto: string }) {
  return (
    <label
      className={`cartao flex cursor-pointer gap-3 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ambar ${props.marcado ? "border-ambar ring-1 ring-ambar/50" : "hover:border-ambar/50"}`}
    >
      {/* o cartão inteiro mostra o foco; o anel do próprio rádio sobraria */}
      <input
        type="radio"
        name="provedor"
        value={props.valor}
        checked={props.marcado}
        onChange={props.aoMarcar}
        className="mt-1 size-4 shrink-0 accent-[var(--ambar)] focus-visible:outline-none"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-pergaminho">{props.titulo}</span>
        <span className="block text-xs uppercase tracking-wider text-ambar-forte">{props.custo}</span>
        <span className="mt-1 block text-sm text-muted">{props.texto}</span>
      </span>
    </label>
  );
}

function StatusLogin({ binRef, ativo }: { binRef: React.RefObject<HTMLFormElement | null>; ativo: boolean }) {
  const [status, setStatus] = useState<StatusClaude | null>(null);
  const [verificando, iniciar] = useTransition();
  const [gravado, setGravado] = useState<EstadoSalvar>(null);
  const [gravando, iniciarGravar] = useTransition();

  const verificar = useCallback(() => {
    const bin = String(new FormData(binRef.current ?? undefined).get("binCli") ?? "");
    iniciar(async () => setStatus(await statusLoginAcao(bin)));
  }, [binRef]);

  // "Usar este": grava o executável achado no ajuste, mostra no campo e confere de novo
  const usar = useCallback(
    (caminho: string) => {
      setGravado(null);
      iniciarGravar(async () => {
        const r = await usarExecutavelAcao(caminho);
        setGravado(r);
        if (r?.ok) {
          const campo = binRef.current?.elements.namedItem("binCli");
          if (campo instanceof HTMLInputElement) campo.value = caminho;
          verificar();
        }
      });
    },
    [binRef, verificar],
  );

  // confere sozinho na primeira vez que a seção aparece
  const conferido = useRef(false);
  useEffect(() => {
    if (ativo && !conferido.current) {
      conferido.current = true;
      verificar();
    }
  }, [ativo, verificar]);

  const ocupado = verificando || gravando;

  return (
    <div className="cartao p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="titulo text-base text-pergaminho">Login do Claude Code</p>
        <button type="button" className="btn-borda min-h-10 px-3 py-1.5 text-xs" onClick={verificar} disabled={ocupado}>
          {verificando ? "Perguntando…" : "Verificar de novo"}
        </button>
      </div>

      {!status ? (
        <p className="mt-2 text-muted">{verificando ? "Perguntando ao Claude Code se ele está acordado…" : "Ainda não verificado."}</p>
      ) : !status.instalado ? (
        <div className="mt-2 space-y-2">
          {status.caminhoConfiguradoSumiu ? (
            <CaminhoSumiu caminho={status.caminhoConfiguradoSumiu} />
          ) : (
            <p className="text-sangue">Claude Code não encontrado{status.caminho ? ` em ${status.caminho}` : ""}.</p>
          )}
          {status.erro && <p className="font-mono text-xs text-muted">{status.erro}</p>}
          <Instalacao />
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {status.caminhoConfiguradoSumiu && (
            <div className="space-y-2 rounded-xl border border-ambar-forte/50 bg-ambar/5 p-3">
              <CaminhoSumiu caminho={status.caminhoConfiguradoSumiu} />
              <p className="text-muted">
                Encontrei este <span className="text-foreground">({status.versao ?? "?"}, {rotuloOrigem(status)})</span> e estou usando por enquanto; para
                fixar, clique em usar este:
              </p>
              <LinhaExecutavel caminho={status.caminho ?? ""} aoUsar={usar} ocupado={ocupado} />
            </div>
          )}
          <p className="text-muted">
            Versão <span className="text-foreground">{status.versao ?? "?"}</span>
            {status.origem && !status.caminhoConfiguradoSumiu && <span className="text-xs"> ({rotuloOrigem(status)})</span>}
            <span className="block break-all font-mono text-xs">{status.caminho}</span>
            {status.executaDeFato && (
              <span className="block break-all text-xs">
                Executa de fato: <span className="font-mono">{status.executaDeFato}</span>
                {status.atalho && <> (traduzido do atalho do npm {status.atalho})</>}
              </span>
            )}
          </p>
          {status.desatualizado && (
            <p className="text-sangue">
              Claude Code {status.versao} é mais antigo que o mínimo {status.versaoMinima} — rode <code className="text-ambar">claude update</code> (ou
              reinstale pelo winget) e verifique de novo.
            </p>
          )}
          {status.maisNovoQueTestado && (
            <p className="text-xs text-muted">Versão mais nova que a testada ({status.versaoTestada}): se o mestre falhar, mande o diagnóstico.</p>
          )}
          {status.logado ? (
            <p className="text-musgo">
              Logado{status.metodo === "claude.ai" ? " com a conta do claude.ai" : status.metodo ? ` (${status.metodo})` : ""}
              {status.plano ? `, plano ${status.plano}` : ""}
              {status.email ? ` — ${status.email}` : ""}.
            </p>
          ) : status.erro ? (
            <p className="text-sangue">Instalado, mas não consegui conferir o login.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sangue">Instalado, mas sem login.</p>
              <p className="text-muted">
                Abra um terminal, rode <code className="text-ambar">claude</code> e siga o login no navegador. Depois clique em verificar de novo.
              </p>
            </div>
          )}
          {status.metodo && status.metodo !== "claude.ai" && (
            <p className="text-xs text-muted">Esse login não é o do plano: a cobrança segue o método mostrado acima.</p>
          )}
          {status.erro && <p className="font-mono text-xs text-muted">{status.erro}</p>}
        </div>
      )}

      {status && status.alternativas.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer">
            {status.instalado ? "Outras instalações nesta máquina" : "Instalações encontradas nesta máquina"} ({status.alternativas.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {status.alternativas.map((a: AlternativaClaude) => (
              <li key={a.caminho} className="space-y-1">
                <span>
                  {a.versao ?? "versão ?"} · {a.rotulo}
                </span>
                <LinhaExecutavel caminho={a.caminho} aoUsar={usar} ocupado={ocupado} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {gravado && (
        <p role="status" className={`mt-2 text-xs ${gravado.ok ? "text-musgo" : "text-sangue"}`}>
          {gravado.mensagem}
        </p>
      )}
    </div>
  );
}

function rotuloOrigem(status: StatusClaude) {
  const r: Record<string, string> = {
    configurado: "caminho configurado",
    desktop: "embutido no app Claude",
    where: "no PATH",
    "local-bin": "instalador oficial",
    "claude-data": "embutido no app Claude",
    npm: "instalado pelo npm",
    path: "no PATH",
  };
  return status.origem ? (r[status.origem] ?? status.origem) : "";
}

function CaminhoSumiu({ caminho }: { caminho: string }) {
  return (
    <p className="text-sangue">
      O executável configurado não existe mais (o app Claude atualizou e trocou de pasta):
      <span className="block break-all font-mono text-xs text-muted">{caminho}</span>
    </p>
  );
}

function LinhaExecutavel({ caminho, aoUsar, ocupado }: { caminho: string; aoUsar: (c: string) => void; ocupado: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{caminho}</code>
      <button type="button" className="btn-borda min-h-9 px-3 py-1 text-xs" onClick={() => aoUsar(caminho)} disabled={ocupado}>
        Usar este
      </button>
    </div>
  );
}

function Instalacao() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-muted">
      <li>
        Instale: <code className="text-ambar">winget install Anthropic.ClaudeCode</code> (Windows) ou siga o site oficial no Mac/Linux.
      </li>
      <li>
        Rode <code className="text-ambar">claude</code> uma vez num terminal e faça login com a sua conta Pro/Max.
      </li>
      <li>Reinicie a taverna (ou informe o caminho do executável acima) e verifique de novo.</li>
    </ol>
  );
}

function AvisoUsoPessoal() {
  return (
    <div className="rounded-xl border border-ambar-forte/50 bg-ambar/5 p-4 text-sm text-muted">
      <p className="titulo mb-1 text-base text-ambar">Uso pessoal, palavra de taverneiro</p>
      <p>
        Este modo só faz sentido no <strong className="text-foreground">seu</strong> computador, com o <strong className="text-foreground">seu</strong>{" "}
        login. O app não lê nem copia o token: apenas chama o Claude Code oficial. O que não pode: publicar a taverna na internet,
        oferecer o seu plano para outras pessoas usarem por conta própria ou distribuir o app configurado assim. Vai abrir a mesa
        para a turma ou instalar na máquina de alguém? Cada um com o próprio login, ou use a API, que é o caminho sem letra miúda.
      </p>
    </div>
  );
}
