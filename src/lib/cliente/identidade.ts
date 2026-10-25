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

export function clienteId(): string {
  let id = ler("taverna:cliente");
  if (!id) {
    id = crypto.randomUUID();
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
