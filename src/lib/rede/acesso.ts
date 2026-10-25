import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { lerAjuste, obterCampanha, salvarAjuste, type Campanha } from "../db";
import { ehDestaMaquina, ehLocal } from "./local";

export { ehLocal, ipDe } from "./local";

// Controle de acesso das mesas pela rede local.
// Esta máquina sempre entra. Pela rede: mesa sem PIN é porta aberta; com PIN, vale um cookie httpOnly com o hash do PIN.
// Trocar o PIN muda o hash, então quem entrou com o antigo precisa digitar de novo.

/** Validade do cookie de PIN: uma campanha longa, não uma eternidade. */
const DURACAO_COOKIE = 60 * 60 * 24 * 30;

export function nomeCookie(campanhaId: number) {
  return `taverna_pin_${campanhaId}`;
}

/** Sal desta instalação, criado na primeira vez e guardado no banco (o hash não serve em outra máquina). */
function sal(): string {
  let s = lerAjuste<string>("rede.sal", "");
  if (!s) {
    s = randomBytes(16).toString("hex");
    salvarAjuste("rede.sal", s);
  }
  return s;
}

export function hashPin(campanhaId: number, pin: string): string {
  return createHash("sha256").update(`${sal()}:${campanhaId}:${pin}`).digest("hex");
}

function confere(campanha: Campanha, valorCookie: string | undefined): boolean {
  if (!campanha.config.pin) return true;
  if (!valorCookie) return false;
  const esperado = Buffer.from(hashPin(campanha.id, campanha.config.pin));
  const recebido = Buffer.from(valorCookie);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

function lerCookie(request: Request, nome: string): string | undefined {
  for (const parte of (request.headers.get("cookie") ?? "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return undefined;
}

/** true se esta requisição pode ver e agir na mesa. */
export function acessoPermitido(request: Request, campanha: Campanha): boolean {
  if (!campanha.config.pin || ehLocal(request)) return true;
  return confere(campanha, lerCookie(request, nomeCookie(campanha.id)));
}

/** O mesmo, para páginas e server actions (lê cabeçalhos e cookies do Next). */
export async function acessoNaPagina(campanha: Campanha): Promise<boolean> {
  if (!campanha.config.pin || (await daMaquinaNaPagina())) return true;
  return confere(campanha, (await cookies()).get(nomeCookie(campanha.id))?.value);
}

/** Atalho para server actions que só têm o id: false também quando a campanha não existe. */
export async function acessoNaAcao(campanhaId: number): Promise<boolean> {
  const c = obterCampanha(campanhaId);
  return c ? acessoNaPagina(c) : false;
}

/** A página/ação está sendo usada nesta máquina? */
export async function daMaquinaNaPagina(): Promise<boolean> {
  const h = await headers();
  return ehDestaMaquina(h.get("host"), h.get("x-forwarded-for"));
}

/** Cabeçalho Set-Cookie que libera a mesa neste aparelho. Sem Secure: a rede local é http. */
export function cookieDoPin(campanha: Campanha): string {
  return `${nomeCookie(campanha.id)}=${hashPin(campanha.id, campanha.config.pin ?? "")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACAO_COOKIE}`;
}

// ---------- força bruta: atraso crescente e bloqueio por IP, em memória ----------

const MAX_FALHAS = 5;
const JANELA_MS = 15 * 60_000;
const BLOQUEIO_MS = 5 * 60_000;

type Tentativas = { falhas: number; desde: number; bloqueadoAte: number };
const g = globalThis as unknown as { __tavernaTentativasPin?: Map<string, Tentativas> };
const tentativas = (g.__tavernaTentativasPin ??= new Map());

/** Milissegundos até o IP poder tentar de novo (0 = pode). */
export function bloqueioRestante(ip: string): number {
  const t = tentativas.get(ip);
  return t ? Math.max(0, t.bloqueadoAte - Date.now()) : 0;
}

/** Espera antes de responder: cresce a cada erro, para que chutar 10 mil PINs leve uma eternidade. */
export function atrasoPara(ip: string): number {
  const t = tentativas.get(ip);
  return Math.min(3000, 400 + (t?.falhas ?? 0) * 500);
}

export function registrarFalha(ip: string) {
  const agora = Date.now();
  let t = tentativas.get(ip);
  if (!t || agora - t.desde > JANELA_MS) tentativas.set(ip, (t = { falhas: 0, desde: agora, bloqueadoAte: 0 }));
  t.falhas++;
  if (t.falhas >= MAX_FALHAS) {
    t.bloqueadoAte = agora + BLOQUEIO_MS;
    t.falhas = 0;
    t.desde = agora;
  }
  // não deixa o mapa crescer para sempre
  if (tentativas.size > 500) {
    for (const [chave, v] of tentativas) if (agora - v.desde > JANELA_MS && v.bloqueadoAte < agora) tentativas.delete(chave);
  }
}

export function registrarSucesso(ip: string) {
  tentativas.delete(ip);
}
