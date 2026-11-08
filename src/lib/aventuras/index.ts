import "server-only";
import type { Aventura, AventuraPublica, PorSistema, Recompensas, Roteiro } from "./tipos";
import { FANTASIA } from "./fantasia";
import { HISTORIA } from "./historia";
import { OUTROS } from "./outros";
import { PATHFINDER } from "./pathfinder";
import { VAMPIRO } from "./vampiro";

// Aventuras prontas: missões iniciais escritas para cada sistema, para começar sem pensar. A campanha nasce com cenário,
// tom e config.aventura = id; o roteiro secreto entra no prompt do mestre (mestre/prompt.ts) e nunca vai para o navegador.

export type { Aventura, AventuraPublica } from "./tipos";

export const AVENTURAS: Aventura[] = [...VAMPIRO, ...PATHFINDER, ...FANTASIA, ...OUTROS, ...HISTORIA];

export function obterAventura(id: unknown): Aventura | null {
  return typeof id === "string" && id ? (AVENTURAS.find((a) => a.id === id) ?? null) : null;
}

/** A aventura só vale se existe e roda no sistema da campanha (id adulterado ou de outro sistema cai fora). */
export function aventuraDoSistema(id: unknown, sistemaId: string): Aventura | null {
  const a = obterAventura(id);
  return a && a.sistemas.includes(sistemaId) ? a : null;
}

export const aventurasDoSistema = (sistemaId: string) => AVENTURAS.filter((a) => a.sistemas.includes(sistemaId));

export function aventuraPublica(a: Aventura): AventuraPublica {
  const { id, sistemas, titulo, chamada, duracao, recomendado, tom, cenario } = a;
  // do solo só sai o "pode": o aliado é coisa do roteiro
  return { id, sistemas, titulo, chamada, duracao, ...(recomendado ? { recomendado } : {}), tom, cenario, ...(a.solo ? { soloOk: true as const } : {}) };
}

/** Lista pública (para as páginas mandarem ao navegador), de um sistema ou de todos. */
export function aventurasPublicas(sistemaId?: string): AventuraPublica[] {
  return (sistemaId ? aventurasDoSistema(sistemaId) : AVENTURAS).map(aventuraPublica);
}

/**
 * A recompensa que vale para um sistema: o texto único, ou a entrada do sistema; sem entrada própria, a "padrao" (ou a
 * primeira que houver). Uma aventura aberta a vários sistemas fala em ouro = XP só para o OSR e em runas só para o PF2e.
 */
export function recompensaDoSistema(recompensas: Recompensas, sistemaId?: string): string {
  return textoDoSistema(recompensas, sistemaId);
}

/** O texto de um campo por sistema (recompensa, linha de stats): o único, o do sistema, o "padrao" ou o primeiro. */
export function textoDoSistema(texto: PorSistema, sistemaId?: string): string {
  if (typeof texto === "string") return texto;
  return (sistemaId && texto[sistemaId]) || texto.padrao || Object.values(texto)[0] || "";
}

/**
 * Os blocos de apoio do roteiro (sessões, encontros e complicações), impressos depois das recompensas. O teto combinado é
 * ~1.200 caracteres somados por aventura, contando as linhas de solo e Pedra de Toque (o roteiro entra em todo turno);
 * tests/w14-roteiros.test.ts mede em cada sistema. A Forja Afundada (masmorra de PF2e) é a exceção: os encontros são o jogo.
 */
export function blocosDeApoio(r: Roteiro, sistemaId?: string): string[] {
  return [
    r.sessoes?.length ? `- Sessões (cada noite fecha num gancho):\n${r.sessoes.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}` : "",
    r.encontros?.length
      ? `- Encontros preparados (escala do sistema; ajuste ao grupo):\n${r.encontros
          .map((e) => `  - ${e.nome} (${e.onde}): ${textoDoSistema(e.inimigos, sistemaId)}. Tática: ${e.tatica}. Saída: ${e.saida}`)
          .join("\n")}`
      : "",
    r.complicacoes?.length ? `- Complicações (o grupo enrolou ou falhou: use uma): ${r.complicacoes.map((c, i) => `${i + 1}) ${c}`).join(" ")}` : "",
  ].filter(Boolean);
}

/**
 * Linhas da mesa solo e da Pedra de Toque. A frase do solo é condicional de propósito: o mestre vê as fichas no prompt e
 * decide; o código não precisa contar personagens.
 */
export function linhasPessoais(a: Aventura): string[] {
  return [
    a.solo
      ? `- Solo: se a mesa tiver um só personagem, ${a.solo.aliado}${a.solo.aliado.includes(",") ? "," : ""} acompanha e ${
          a.sistemas.every((s) => s === "historia") ? "pode se meter em apuros (nada de morte)" : "pode morrer"
        }.`
      : "",
    a.pedraEmJogo ? `- Amarre a Pedra de Toque (nome da ficha): ${a.pedraEmJogo}.` : "",
  ].filter(Boolean);
}

/**
 * Roteiro compacto para o prompt do mestre (entra em todo turno: cada caractere conta). A cena de abertura só vai junto
 * enquanto a campanha está começando (`comAbertura`); depois ela já virou narração e só ocuparia espaço. `sistemaId` é o
 * sistema da campanha: escolhe a recompensa certa quando a aventura roda em mais de um.
 */
export function roteiroParaMestre(a: Aventura, comAbertura = true, sistemaId?: string): string {
  const r = a.roteiro;
  const ficha = [a.duracao, a.recomendado].filter(Boolean).join("; ");
  return [
    `"${a.titulo}" (${ficha}). Conduza como arco curto até um dos finais; se o grupo mudar o rumo, adapte em vez de puxar de volta. NPCs agem mesmo sem o grupo.`,
    comAbertura ? `- Abertura (no [início da campanha], narre a partir desta cena): ${a.abertura}` : "",
    `- Verdade: ${r.verdade}`,
    `- NPCs (segredo só se revela em cena):\n${r.npcs.map((n) => `  - ${n.nome}, ${n.quem}. Voz: ${n.voz}. Quer: ${n.quer}. Segredo: ${n.segredo}`).join("\n")}`,
    `- Locais: ${r.locais.map((l) => `${l.nome} (${l.texto})`).join("; ")}`,
    `- Pistas (nenhuma é a única porta; perdeu uma, outra aparece):\n${r.pistas.map((p) => `  - ${p}`).join("\n")}`,
    `- Reviravoltas: ${r.reviravoltas.map((t, i) => `${i + 1}) ${t}`).join(" ")}`,
    `- Relógio (avança quando o grupo enrola ou falha feio): ${r.relogio.map((t, i) => `${i + 1}. ${t}`).join(" ")}`,
    `- Finais: ${r.finais.join(" | ")}`,
    `- Recompensas: ${recompensaDoSistema(r.recompensas, sistemaId)}`,
    ...blocosDeApoio(r, sistemaId),
    ...linhasPessoais(a),
  ]
    .filter(Boolean)
    .join("\n");
}
