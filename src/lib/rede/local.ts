import { nomesDaMaquina } from "./enderecos";

// "Esta máquina" x "a rede": quem está no computador da taverna nunca precisa de PIN.
// Usa o Host da requisição e o endereço de origem (o Next põe o IP do socket em x-forwarded-for).
// O x-forwarded-for é confiável porque blindagem.ts (via src/instrumentation.ts) o reescreve com o IP do socket antes do Next;
// o Host pode ser forjado à vontade, mas sozinho não basta. O PIN é a tranca da porta da taverna, não do tesouro.

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|::1|::ffff:127(\.\d{1,3}){3})$/i;

/** Nome do host sem porta e sem colchetes ("[::1]:3300" → "::1"). */
export function semPorta(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(1, h.indexOf("]") > 0 ? h.indexOf("]") : undefined);
  // IPv6 cru (vários ":") não tem porta
  if (h.split(":").length > 2) return h;
  return h.split(":")[0];
}

function daMaquina(nome: string): boolean {
  // IPv4 embrulhado em IPv6 ("::ffff:192.168.0.7") é o mesmo endereço
  return LOOPBACK.test(nome) || nomesDaMaquina().has(nome.replace(/^::ffff:/, ""));
}

/** true quando os cabeçalhos dizem que a requisição saiu desta própria máquina. */
export function ehDestaMaquina(host: string | null, encaminhadoPara: string | null): boolean {
  if (!host || !daMaquina(semPorta(host))) return false;
  const origem = encaminhadoPara?.split(",")[0]?.trim();
  // sem x-forwarded-for (não deveria acontecer no Next): vale só o Host
  return !origem || daMaquina(semPorta(origem));
}

/** Só o Host, para onde não há x-forwarded-for (o proxy roda antes do Next preencher): vale apenas loopback. */
export function hostLoopback(request: Request): boolean {
  const origem = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (origem && !LOOPBACK.test(semPorta(origem))) return false;
  return LOOPBACK.test(semPorta(request.headers.get("host") ?? new URL(request.url).host));
}

export function ehLocal(request: Request): boolean {
  return ehDestaMaquina(request.headers.get("host") ?? new URL(request.url).host, request.headers.get("x-forwarded-for"));
}

/** IP de quem fez a requisição (para limitar tentativas de PIN). */
export function ipDe(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}
