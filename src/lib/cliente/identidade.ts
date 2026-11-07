"use client";

// Identidade do aparelho na mesa (sem login): um id aleatório, o apelido escolhido e o personagem ativo em cada mesa.
// Tudo no localStorage, com fallback em memória quando o navegador bloqueia o armazenamento.

const memoria = new Map<string, string>();

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave) ?? memoria.get(chave) ?? null;
  } catch {
    return memoria.get(chave) ?? null;
  }
}

function gravar(chave: string, valor: string | null) {
  if (valor === null) memoria.delete(chave);
  else memoria.set(chave, valor);
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    // modo privado / armazenamento bloqueado: fica só na memória
  }
}

/** Id aleatório: crypto.randomUUID só existe em contexto seguro (https ou localhost); pela rede local (http://192.168…) não há. */
function idAleatorio(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function clienteId(): string {
  let id = ler("taverna:cliente");
  if (!id) {
    id = idAleatorio();
    gravar("taverna:cliente", id);
  }
  return id;
}

export function apelido(): string {
  return ler("taverna:apelido") ?? "";
}

export function salvarApelido(nome: string) {
  gravar("taverna:apelido", nome.trim().slice(0, 40));
}

export function personagemAtivo(campanhaId: number): number | null {
  const v = Number(ler(`taverna:ativo:${campanhaId}`));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function salvarPersonagemAtivo(campanhaId: number, personagemId: number | null) {
  gravar(`taverna:ativo:${campanhaId}`, personagemId === null ? null : String(personagemId));
}
