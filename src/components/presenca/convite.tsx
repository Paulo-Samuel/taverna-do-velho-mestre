"use client";

import { useEffect, useState } from "react";

// Convite para entrar pela rede local: endereço da máquina, QR code e PIN.
// Os endereços e os QR codes vêm de /api/rede (o servidor sabe os IPs; o navegador não).

type Endereco = { ip: string; interfaceNome: string; url: string; qr: string };
type InfoRede = { local: boolean; porta: number; dev: boolean; temPin: boolean; enderecos: Endereco[] };

/** Copia texto; em http://IP (contexto inseguro) o navigator.clipboard não existe, então cai no truque antigo. */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function TrocarPin({ campanhaId, temPin, aoMudar }: { campanhaId: number; temPin: boolean; aoMudar: (temPin: boolean) => void }) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(novo: string | null) {
    setEnviando(true);
    setErro(null);
    const r = await fetch(`/api/campanhas/${campanhaId}/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: novo }),
    }).catch(() => null);
    setEnviando(false);
    const corpo = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return setErro(corpo.erro ?? "Não deu para trocar o PIN.");
    setPin("");
    aoMudar(Boolean(corpo.temPin));
  }

  return (
    <div className="mt-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin.trim()) void salvar(pin.trim());
        }}
      >
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={12}
          placeholder={temPin ? "Novo PIN" : "Criar um PIN"}
          aria-label="PIN da mesa"
          className="campo min-w-0 flex-1 py-1.5"
          inputMode="text"
          autoComplete="off"
        />
        <button className="btn-borda px-3 py-1.5" disabled={!pin.trim() || enviando}>
          {temPin ? "Trocar" : "Trancar"}
        </button>
      </form>
      {temPin && (
        <button type="button" className="mt-2 text-xs text-muted hover:text-sangue" disabled={enviando} onClick={() => void salvar(null)}>
          Tirar o PIN (porta aberta para o Wi-Fi inteiro)
        </button>
      )}
      {erro && <p className="mt-1 text-xs text-sangue">{erro}</p>}
      <p className="mt-1 text-xs text-muted">Trocar o PIN derruba quem entrou pela rede com o antigo.</p>
    </div>
  );
}

export function Convite({ campanhaId, temPin }: { campanhaId: number; temPin: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [info, setInfo] = useState<InfoRede | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState(0);
  const [copiado, setCopiado] = useState(false);
  // o PIN pode mudar aqui mesmo antes do estado da mesa recarregar
  const [pinAgora, setPinAgora] = useState<boolean | null>(null);
  const comPin = pinAgora ?? temPin;

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    fetch(`/api/rede?campanha=${campanhaId}`, { cache: "no-store" })
      .then(async (r) => {
        const corpo = await r.json();
        if (!vivo) return;
        if (!r.ok) throw new Error(corpo.erro ?? `Erro ${r.status}`);
        setInfo(corpo as InfoRede);
        setErro(null);
      })
      .catch((e: Error) => vivo && setErro(e.message || "Não consegui descobrir o endereço da taverna."));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    return () => {
      vivo = false;
      document.removeEventListener("keydown", esc);
    };
  }, [aberto, campanhaId]);

  // o estado da mesa recarregou com o PIN novo: a prop volta a mandar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinAgora(null);
  }, [temPin]);

  const atual = info?.enderecos[escolhido] ?? info?.enderecos[0];

  return (
    <>
      <button type="button" className="btn-borda px-3 py-1.5" onClick={() => setAberto(true)} title="Chamar gente pela rede local">
        <span aria-hidden>📜</span> Convidar
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-convite"
          onClick={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div className="cartao surgir max-h-[90dvh] w-full max-w-md overflow-y-auto p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="titulo-convite" className="titulo text-xl text-ambar">
                  Chamar a turma
                </h2>
                <p className="text-sm text-muted">Celulares e notebooks no mesmo Wi-Fi entram pelo navegador. Nada de instalar.</p>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="text-muted hover:text-foreground" aria-label="Fechar">
                ✕
              </button>
            </div>

            {erro && <p className="rounded-md border border-sangue/60 bg-sangue/10 px-3 py-2 text-sm">{erro}</p>}
            {!info && !erro && <p className="animate-pulse py-10 text-center text-sm text-muted">Procurando a taverna na rede…</p>}

            {info && !atual && (
              <p className="rounded-md border border-sangue/60 bg-sangue/10 px-3 py-2 text-sm">
                Esta máquina não está em rede nenhuma. Conecte no Wi-Fi (ou no cabo) e abra o convite de novo.
              </p>
            )}

            {info && atual && (
              <>
                <div className="mx-auto w-full max-w-56 overflow-hidden rounded-lg border border-border bg-pergaminho p-2">
                  {/* SVG gerado pelo nosso servidor (lib qrcode), não vem de usuário */}
                  <div className="aspect-square [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: atual.qr }} />
                </div>
                <p className="mt-2 text-center text-xs text-muted">Aponte a câmera do celular para o QR</p>

                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                  <code className="min-w-0 flex-1 break-all text-sm text-pergaminho">{atual.url}</code>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-ambar hover:underline"
                    onClick={async () => {
                      if (await copiar(atual.url)) {
                        setCopiado(true);
                        setTimeout(() => setCopiado(false), 1800);
                      }
                    }}
                  >
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                {info.enderecos.length > 1 && (
                  <div className="mt-2 text-xs text-muted">
                    <p className="mb-1">Não abriu? Esta máquina tem mais de um endereço:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {info.enderecos.map((e, i) => (
                        <button
                          key={e.ip}
                          type="button"
                          onClick={() => setEscolhido(i)}
                          className={`rounded border px-2 py-0.5 ${e.ip === atual.ip ? "border-ambar text-ambar" : "border-border hover:text-foreground"}`}
                        >
                          {e.ip} <span className="opacity-70">({e.interfaceNome})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 rounded-md border border-border px-3 py-2 text-sm">
              {comPin ? (
                <p>
                  <span aria-hidden>🔒</span> Mesa com PIN: quem chegar pela rede vai precisar dele. Fale em voz alta, a taverna não conta.
                </p>
              ) : (
                <p>
                  <span aria-hidden>🚪</span> Mesa sem PIN: qualquer um no Wi-Fi entra. Ótimo em casa, péssimo no Wi-Fi da faculdade.
                </p>
              )}
              {info?.local && <TrocarPin campanhaId={campanhaId} temPin={comPin} aoMudar={setPinAgora} />}
            </div>

            <details className="mt-3 text-sm text-muted">
              <summary className="cursor-pointer text-foreground hover:text-ambar">O celular não abre o link?</summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Todos precisam estar no <strong className="text-foreground">mesmo Wi-Fi</strong> desta máquina (rede de visitantes e 4G não valem).</li>
                <li>
                  Windows: quando o Firewall perguntar, marque <strong className="text-foreground">Redes privadas</strong> para o Node.js. Se o aviso já passou:
                  Firewall do Windows Defender › Permitir um aplicativo › Node.js › Privada.
                </li>
                <li>A rede do Windows precisa estar como &quot;Privada&quot; (Configurações › Rede e Internet › propriedades do Wi-Fi).</li>
                <li>Digite o endereço com <code>http://</code> e a porta <code>:{info?.porta ?? 3300}</code>; alguns navegadores insistem em https.</li>
                {info?.dev && (
                  <li>
                    Modo de desenvolvimento: a primeira abertura no celular demora. Para jogar de verdade, rode <code>npm run rede</code>.
                  </li>
                )}
              </ul>
            </details>
          </div>
        </div>
      )}
    </>
  );
}
