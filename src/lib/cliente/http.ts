// Chamadas HTTP do navegador para a taverna, com a queda de rede tratada num lugar só.
// Sem rede o fetch rejeita ("Failed to fetch") e, sem este embrulho, a promessa estourava no evento do botão: a mesa ficava
// muda, com o texto no campo e nenhum aviso. Aqui toda resposta vira um objeto; quem chama decide o que mostrar.
// Sem importações de propósito: o arquivo roda também no node:test (tests/http.test.mjs).

export const SEM_SINAL = "Sem sinal da taverna: a ação não saiu. Confira o Wi-Fi e tente de novo.";

export type Resposta<T> =
  | { ok: true; status: number; corpo: T }
  | {
      ok: false;
      status: number;
      erro: string;
      /** o pedido nem chegou ao servidor (rede caída, servidor desligado) */
      semRede: boolean;
    };

/** Lê o JSON da resposta sem estourar quando o corpo está vazio ou não é JSON. */
async function lerJson<T>(resposta: Response): Promise<T> {
  try {
    return (await resposta.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Mensagem de erro de uma resposta HTTP que não foi 2xx: o `erro` que a rota mandou, senão o código. */
export function mensagemDeErro(status: number, corpo: unknown): string {
  const erro = corpo && typeof corpo === "object" ? (corpo as { erro?: unknown }).erro : undefined;
  return typeof erro === "string" && erro ? erro : `Erro ${status}`;
}

/** Faz um pedido e devolve sempre um objeto (nunca rejeita). */
export async function pedir<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<Resposta<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(url, init);
  } catch {
    return { ok: false, status: 0, erro: SEM_SINAL, semRede: true };
  }
  const corpo = await lerJson<T>(resposta);
  if (!resposta.ok) return { ok: false, status: resposta.status, erro: mensagemDeErro(resposta.status, corpo), semRede: false };
  return { ok: true, status: resposta.status, corpo };
}

/** POST com corpo JSON. */
export function postarJson<T = Record<string, unknown>>(url: string, corpo: unknown, init?: RequestInit): Promise<Resposta<T>> {
  return pedir<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(corpo),
    ...init,
  });
}
