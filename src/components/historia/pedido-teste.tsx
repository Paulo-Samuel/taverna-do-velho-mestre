"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ANEL_CRITICO,
  ANEL_FALHA,
  decisaoAberta,
  DecisaoDoTeste,
  EfeitosVtm,
  FaixaDespertar,
  IconeD20,
  listaDespertares,
  type DecisaoNoCartao,
} from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import type { PersonagemVisivel } from "@/lib/mesa";
import { COR_GRAU, corDoNome, sinal } from "./cores";
import { Dado3D } from "./dado-3d";
import { CLASSE_DEPOIS, EstiloParada, lerParada, ParadaDados, PASSO_MS, qtdDados, type Parada, type ResultadoParada } from "./parada-dados";
import { Retrato } from "./retrato";
import { seloDoDesfecho, type SeloDesfecho } from "./selo-desfecho";
import { usaD20 } from "./usa-d20";
import { Icone } from "@/components/icones";

// O momento principal do modo história: o mestre pediu um teste e o jogador rola na tela.
// Pendente → cartão grande com os dados e o botão. Rolado aqui → d20 3D gira e assenta na face do servidor; nos outros sistemas a
// parada (d10 do Vampiro, d100, Fate, 2d6) treme e assenta dado a dado. Rolado em outro aparelho (ou ao recarregar) → resultado
// compacto: d20 numa linha, os outros com a mesma parada assentada em tamanho pequeno.
// Decisão depois do dado (Vampiro: rerrolar com Força de Vontade escolhendo os dados; PF2e: Ponto de Herói; 5e: Inspiração): falha,
// teste perigoso ou ataque ficam "decidir" — só o aparelho que rolou decide; mesa solo espera sem prazo, com mais gente o servidor
// fica com o resultado em 45 s (rota /rerrolar) e só então manda ao mestre. Num sucesso comum o botão fica discreto uns segundos.
// Antes do dado: a composição da parada e, no Vampiro, o Surto de Sangue como escolha do jogador.

export type ResultadoRolagem = { natural: number | null; total: number; dados: number[]; grau: string; rotuloGrau: string };

/** Escolhas antes de rolar que o pedido traz (Vampiro: Surto de Sangue). */
type OpcaoAntes = { id: string; rotulo: string; custo?: string; efeito?: string };

type DadosPedido = {
  tipo?: string;
  status?: "pendente" | "decidir" | "resolvido" | "cancelado";
  /** decisão depois do dado: prazo do servidor (null = mesa solo), dono e opções */
  decisao?: DecisaoNoCartao;
  /** o prazo acabou sem resposta e o servidor ficou com o resultado */
  aceitoSozinho?: boolean;
  /** composição da parada calculada na prévia ("Carisma 4 + Lábia 4 · 1 de Fome") */
  detalhes?: string;
  antes?: OpcaoAntes[];
  personagem?: string;
  personagemId?: number;
  teste?: string;
  alvo?: number | null;
  bonus?: number;
  perigoso?: boolean;
  motivo?: string;
  /** como a parada é rolada ("1d20+4", "7d10 (2 de Fome)", "4dF+2", "1d100") */
  expressao?: string;
  dadoPrincipal?: string;
  sistema?: string;
  modo?: string;
  /** custos anunciados antes do clique (Vampiro: "Despertar · Celeridade ●●", "Surto +2") */
  custos?: string[];
  /** opções guardadas no pedido; `oposicao` é quem resiste num teste oposto (o servidor rola o lado dele no clique) */
  opcoes?: { oposicao?: { nome?: string; parada?: number; bonus?: number } };
  resultado?: Partial<ResultadoRolagem> & ResultadoParada & { bonus?: number; alvo?: number | null };
};

/** "contra Vera (5 dados)" ou "contra o guarda (+3)": o teste oposto antes do clique. */
export function textoContraPedido(d: Pick<DadosPedido, "opcoes">): string | null {
  const o = d.opcoes?.oposicao;
  if (!o || (typeof o.parada !== "number" && typeof o.bonus !== "number")) return null;
  const nome = o.nome?.trim() || "a oposição";
  if (typeof o.parada === "number") return `contra ${nome} (${o.parada} ${o.parada === 1 ? "dado" : "dados"})`;
  return `contra ${nome} (${sinal(o.bonus ?? 0)})`;
}

/** Depois do clique: "Vera tirou 2" (parada) ou "Vera tirou 15" (d20), do campo `oposicao` do resultado. */
function textoOposicaoResultado(r: { oposicao?: unknown }): string | null {
  const o = r.oposicao as { nome?: unknown; total?: unknown; expressao?: unknown } | undefined;
  if (!o || typeof o.nome !== "string" || typeof o.total !== "number") return null;
  const d10 = /d10$/.test(String(o.expressao ?? ""));
  return d10 ? `${o.nome}: ${o.total} ${o.total === 1 ? "sucesso" : "sucessos"}` : `${o.nome}: ${String(o.expressao ?? "")} = ${o.total}`;
}

/** Dano sugerido pelo teste (ataque oposto do Vampiro, por exemplo). */
function textoDano(r: { dano?: unknown }): string | null {
  const d = r.dano as { valor?: unknown; texto?: unknown } | undefined;
  if (!d || typeof d.valor !== "number") return null;
  return typeof d.texto === "string" && d.texto ? d.texto : `${d.valor} de dano`;
}

/** Linha da oposição e do dano embaixo da conta (quando houver). */
function LinhaDisputa({ r, centro = false }: { r: { oposicao?: unknown; dano?: unknown }; centro?: boolean }) {
  const op = textoOposicaoResultado(r);
  const dano = textoDano(r);
  if (!op && !dano) return null;
  return (
    <p className={`mt-1 text-xs tabular-nums text-muted ${centro ? "mx-auto max-w-md" : ""}`}>
      {op && (
        <span>
          <Icone nome="swords" /> {op}
        </span>
      )}
      {op && dano && " · "}
      {dano && (
        <span className="text-foreground/85">
          <Icone nome="swords" /> {dano}
        </span>
      )}
    </p>
  );
}

type Resultado = ResultadoRolagem & ResultadoParada;

/** girando → assentando (dado parando na face) → pronto (conta na tela) → recolhido (vira o resultado compacto e solta o WebGL) */
type Rolagem = { fase: "girando" | "assentando" | "pronto" | "recolhido"; resultado: Resultado | null };

/** Tempo máximo esperando o dado 3D avisar que parou (se o aviso não vier, mostra o resultado assim mesmo). */
const ESPERA_MAXIMA_MS = 4000;

/** Quanto tempo o dado grande fica na tela depois do resultado. Depois vira o resumo compacto: cada Dado3D usa um contexto
 * WebGL e o navegador só aguenta uns 16 por página, então só o teste ativo mantém o dado montado. */
const DADO_NA_TELA_MS = 8000;

/** A parada treme pelo menos isso, mesmo se o servidor responder na hora (senão a rolagem nem aparece). */
const GIRO_MINIMO_MS = 900;

export function dadosDoPedido(m: Mensagem): DadosPedido {
  return (m.dados ?? {}) as DadosPedido;
}

// usaD20 (usa-d20.ts) escolhe entre o d20 3D e a parada em SVG (d10 do Vampiro, d100, Fate, 2d6) pela expressão do pedido.

/** "17 + 4 = 21 vs 12" (ou "21 vs 12" quando o sistema não tem dado natural). */
function conta(natural: number | null | undefined, bonus: number, total: number, alvo: number | null | undefined) {
  const base = typeof natural === "number" ? `${natural} ${bonus >= 0 ? "+" : "−"} ${Math.abs(bonus)} = ${total}` : String(total);
  return typeof alvo === "number" ? `${base} vs ${alvo}` : base;
}

function rotulo(r: { rotuloGrau?: string; grau?: string }) {
  const t = (r.rotuloGrau ?? "").trim();
  if (t) return /[!.]$/.test(t) ? t : `${t}!`;
  return r.grau?.includes("sucesso") ? "Sucesso!" : "Falha.";
}

/** Título só com o nome do teste: o "precisa de um teste" já está na linha de cima. */
function tituloDoTeste(teste: string) {
  return teste.replace(/^teste\s+de\s+/i, "").trim() || "Teste";
}

// ---------- parada (sistemas sem d20) ----------

/** Rótulo do grau como o sistema chama, sem exclamação inventada ("Crítico Sujo", "Sucesso Difícil", "Falha Bestial"). */
function rotuloParada(r: ResultadoParada) {
  return (r.rotuloGrau ?? "").trim() || (r.grau?.includes("sucesso") ? "Sucesso" : "Falha");
}

/** Rótulos longos viram nome curto + explicação: "Falha — o mestre faz um movimento" e "Falha (tirou Normal, exigia Difícil)". */
function partesDoRotulo(r: ResultadoParada): { nome: string; resto: string } {
  const t = rotuloParada(r);
  const m = t.match(/^(.+?)\s+[—–]\s+(.+)$/) ?? t.match(/^(.+?)\s*\((.+)\)$/);
  return m ? { nome: m[1].trim(), resto: m[2].trim() } : { nome: t, resto: "" };
}

/** Cor do grau com os tokens do tema: Crítico Sujo e Falha Bestial em sangue, crítico na cor de crítico do tema. */
function corParada(r: ResultadoParada) {
  if (r.rotuloGrau === "Crítico Sujo" || r.rotuloGrau === "Falha Bestial" || r.grau === "falha_critica") return "var(--sangue)";
  if (r.grau === "sucesso_critico") return "var(--critico)";
  return COR_GRAU[r.grau ?? ""] ?? "var(--foreground)";
}

/** A conta embaixo do grau, no jeito de cada sistema. */
function contaParada(p: Parada, r: ResultadoParada, alvoPedido: number | null) {
  const dados = r.dados ?? [];
  const total = r.total ?? 0;
  const alvo = typeof r.alvo === "number" ? r.alvo : alvoPedido;
  if (p.sabor === "vtm5") {
    if (r.vtm === "despertar") return r.rotuloGrau ?? "";
    const pares = Math.floor(dados.filter((v) => v === 10).length / 2);
    const partes = [`${total} ${total === 1 ? "sucesso" : "sucessos"}`];
    // teste oposto: o alvo é "sucessos do NPC + 1"; quem resistiu aparece na linha da disputa
    if (typeof alvo === "number" && !textoOposicaoResultado(r)) partes.push(`dificuldade ${alvo}`);
    if (pares) partes.push(`${pares} ${pares === 1 ? "par" : "pares"} de 10`);
    return partes.join(" · ");
  }
  if (p.sabor === "d100") {
    const valor = typeof r.natural === "number" ? r.natural : total;
    return typeof r.alvo === "number" ? `rolou ${valor} · precisava de ${r.alvo} ou menos` : `rolou ${valor}`;
  }
  if (p.sabor === "fate") {
    const soma = dados.reduce((a, b) => a + b, 0);
    const bonus = r.bonus ?? 0;
    return `dados ${sinal(soma)}${bonus ? ` · perícia ${sinal(bonus)}` : ""} = ${sinal(total)}${typeof alvo === "number" ? ` contra ${sinal(alvo)}` : ""}`;
  }
  if (p.sabor === "pbta") {
    const bonus = r.bonus ?? 0;
    return `${dados.slice(0, 2).join(" + ")}${bonus ? ` ${bonus > 0 ? "+" : "−"} ${Math.abs(bonus)}` : ""} = ${total}`;
  }
  return typeof alvo === "number" ? `${total} vs ${alvo}` : String(total);
}

// ---------- o momento do resultado (d20) ----------

/** Crítico ou falha crítica do d20: pelo grau ou pelo dado natural (o selo natural vem de selo-desfecho.ts, a regra é de lá). */
function marcaDoD20(grau: string, selo: SeloDesfecho): "critico" | "falha" | null {
  if (grau === "sucesso_critico") return "critico";
  if (grau === "falha_critica") return "falha";
  return selo.natural?.valor === 20 ? "critico" : selo.natural?.valor === 1 ? "falha" : null;
}

const COR_MARCA = { critico: COR_GRAU.sucesso_critico, falha: COR_GRAU.falha_critica } as const;

/** O desfecho dito uma vez ao leitor de tela ("Sucesso: 17 contra CD 15"). O número do dado sozinho quem anuncia é o dado 3D. */
function Anuncio({ texto, vivo = true }: { texto: string; vivo?: boolean }) {
  // histórico já resolvido é texto comum: uma região viva por cartão antigo viraria anúncio em lote ao remontar a lista
  return (
    <p className="sr-only" role={vivo ? "status" : undefined}>
      {texto}
    </p>
  );
}

/** "Sucesso: 17 contra CD 15" (ou "Sucesso: total 17" sem alvo; em teste oposto a disputa já tem linha própria). */
function fraseD20(r: { rotuloGrau?: string; grau?: string; total?: number; oposicao?: unknown }, alvo: number | null) {
  const grau = rotulo(r).replace(/[!.]+$/, "");
  const total = r.total ?? 0;
  return typeof alvo === "number" && !textoOposicaoResultado(r) ? `${grau}: ${total} contra CD ${alvo}` : `${grau}: total ${total}`;
}

// ---------- cabeçalho comum (d20 e parada) ----------

/** Pílula do cabeçalho do teste: `etiqueta` neutra por padrão; custo e perigo passam `etiqueta-matiz matiz-4`. */
function Chip({ children, tom = "etiqueta text-foreground/85" }: { children: ReactNode; tom?: string }) {
  return <span className={`${tom} whitespace-nowrap px-2.5`}>{children}</span>;
}

/** Pílulas abaixo do título: dificuldade, como rola e o aviso de perigo. */
function Chips({ d, parada, d20, bonus, alvo }: { d: DadosPedido; parada: Parada; d20: boolean; bonus: number; alvo: number | null }) {
  const chips: ReactNode[] = [];
  const contra = textoContraPedido(d);
  if (d20) {
    if (contra) chips.push(<Chip key="contra">
          <Icone nome="swords" /> {contra}
        </Chip>);
    else if (typeof alvo === "number") chips.push(<Chip key="cd">CD {alvo}</Chip>);
    chips.push(<Chip key="bonus">Bônus {sinal(bonus)}</Chip>);
    if (d.modo === "vantagem" || d.modo === "desvantagem") chips.push(<Chip key="modo">Com {d.modo}</Chip>);
  } else if (parada.sabor === "vtm5") {
    if (contra) chips.push(<Chip key="contra">
          <Icone nome="swords" /> {contra}
        </Chip>);
    else if (typeof alvo === "number") chips.push(<Chip key="dif">Dificuldade {alvo}</Chip>);
    chips.push(
      <Chip key="parada">
        {parada.qtd} {parada.qtd === 1 ? "dado" : "dados"}
        {parada.fome > 0 && (
          <>
            <span className="text-muted">·</span>
            <span className="inline-block size-2 rotate-45 bg-sangue" aria-hidden />
            <span className="text-sangue">{parada.fome} de Fome</span>
          </>
        )}
      </Chip>,
    );
  } else if (parada.sabor === "d100") {
    chips.push(<Chip key="d100">1d100 · role abaixo do valor</Chip>);
    if (alvo === 2 || alvo === 3) chips.push(<Chip key="exige">Exige {alvo === 3 ? "Extremo" : "Difícil"}</Chip>);
  } else if (parada.sabor === "fate") {
    if (typeof alvo === "number") chips.push(<Chip key="op">Oposição {sinal(alvo)}</Chip>);
    chips.push(<Chip key="fate">{parada.qtd}dF{bonus ? ` · perícia ${sinal(bonus)}` : ""}</Chip>);
  } else {
    if (parada.sabor === "outro" && typeof alvo === "number") chips.push(<Chip key="alvo">Alvo {alvo}</Chip>);
    const mod = bonus || parada.mod;
    chips.push(
      <Chip key="dados">
        {parada.qtd}d{parada.lados}
        {mod ? ` ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}` : ""}
      </Chip>,
    );
  }
  for (const [i, c] of (Array.isArray(d.custos) ? d.custos : []).entries()) {
    chips.push(
      <Chip key={`custo${i}`} tom="etiqueta-matiz matiz-4">
        <Icone nome={/^surto/i.test(c) ? "bolt" : "drop"} /> {c}
      </Chip>,
    );
  }
  if (d.perigoso) {
    chips.push(
      <Chip key="perigo" tom="etiqueta-matiz matiz-4 font-semibold">
        <Icone nome="warning" /> Teste perigoso
      </Chip>,
    );
  }
  return (
    <div className="mt-2.5 flex flex-wrap justify-center gap-1.5" data-pd-chips>
      {chips}
    </div>
  );
}

/** Vampiro: o Despertar do poder rolado junto com a parada e as pílulas do que mudou (Fome, Surto gasto, Ressonância, frenesi). */
function SangueDoResultado({ r, centro = false, novo = false }: { r: ResultadoParada; centro?: boolean; novo?: boolean }) {
  // Despertar e Surto avulsos já mostram tudo na própria parada e na conta
  if (r.vtm === "despertar" || r.vtm === "surto") return <EfeitosVtm efeitos={r.efeitos} centro={centro} />;
  const despertares = listaDespertares(r.despertares).filter((x) => !x.previsto);
  if (!despertares.length && !Array.isArray(r.efeitos)) return null;
  return (
    <div className={centro ? "mx-auto max-w-md" : ""}>
      {despertares.map((x, i) => (
        <FaixaDespertar key={i} x={x} centro={centro} novo={novo} />
      ))}
      <EfeitosVtm efeitos={r.efeitos} centro={centro} />
    </div>
  );
}

// ---------- rerrolar com Força de Vontade (Vampiro) ----------

/** Linha do que a rerrolagem custou: "Força de Vontade 7 → 6 (superficial) · rerrolou 2→8, 4→6". */
function LinhaVontade({ r, centro = false }: { r: ResultadoParada; centro?: boolean }) {
  const x = r.rerrolado;
  if (!x?.vontade) return null;
  return (
    <p className={`mt-1.5 text-xs text-ambar ${centro ? "text-center" : ""}`}>
      <span className="font-semibold">
        <Icone nome="redo" /> Força de Vontade {x.vontade.antes} → {x.vontade.depois}
      </span>{" "}
      <span className="text-muted">(superficial)</span>
      {x.dados?.length ? <> · rerrolou {x.dados.map((t) => `${t.antes}→${t.depois}`).join(", ")}</> : null}
      {x.grauAntes && <span className="text-muted"> · antes: {x.grauAntes}</span>}
    </p>
  );
}

/** O recurso que a opção gasta, lido da ficha, para o cartão mostrar quanto sobra. */
function recursoDaOpcao(personagem: PersonagemVisivel | null, opcaoId: string | undefined): { rotulo: string; atual: number; max: number } | null {
  const rec = personagem?.ficha.recursos ?? {};
  const id = opcaoId === "rerrolar_vontade" ? "vontade" : opcaoId === "ponto_de_heroi" ? "heroi" : opcaoId === "inspiracao_heroica" ? "inspiracao" : null;
  const x = id ? rec[id] : undefined;
  return x ? { rotulo: x.rotulo, atual: x.atual, max: x.max } : null;
}

/** "Ponto de Herói 2 → 1 · d20 4 → 17 · antes: Falha" (PF2e) e "Inspiração heroica…" (5e), com o ícone de rerrolar na frente. */
function LinhaRecursoD20({ r }: { r: Record<string, unknown> }) {
  const heroi = r.heroi as { antes: number; depois: number; naturalAntes: number; naturalDepois: number; grauAntes?: string } | undefined;
  const insp = r.inspiracao as { naturalAntes: number; naturalDepois: number; grauAntes?: string } | undefined;
  const x = heroi ?? insp;
  if (!x) return null;
  return (
    <p className="mt-1 text-xs text-ambar" data-recurso-gasto>
      <span className="font-semibold">
        <Icone nome="redo" /> {heroi ? `Ponto de Herói ${heroi.antes} → ${heroi.depois}` : "Inspiração heroica gasta"}</span> · d20 {x.naturalAntes} → {x.naturalDepois}
      {x.grauAntes && <span className="text-muted"> · antes: {x.grauAntes}</span>}
    </p>
  );
}

export function PedidoTeste({
  mensagem,
  personagem,
  podeRolar,
  podeDecidir,
  clienteId = "",
  rolar,
  perguntar,
}: {
  mensagem: Mensagem;
  personagem: PersonagemVisivel | null;
  /** este aparelho controla o personagem do teste (ou é a mesa local) */
  podeRolar: boolean;
  /** este aparelho tem os botões da decisão depois do dado (o dono; sem `podeDecidir`, vale `podeRolar`) */
  podeDecidir?: boolean;
  clienteId?: string;
  rolar: (mensagemId: number, opcoes?: { surto?: boolean }) => Promise<ResultadoRolagem | null>;
  /** manda uma pergunta fora do personagem ao mestre ("não é essa parada?") */
  perguntar?: (texto: string) => void;
}) {
  const d = dadosDoPedido(mensagem);
  const [rolagem, setRolagem] = useState<Rolagem | null>(null);
  // o cartão estava na tela esperando o dado: só nesse caso o desfecho que chega de outro aparelho é anunciado
  const [nasceuAberto] = useState(() => d.status === "pendente" || d.status === "decidir");
  // desfazer o turno devolve o teste para "pendente": o dado já rolado aqui volta a esperar (ajuste durante a renderização)
  const [statusVisto, setStatusVisto] = useState(d.status);
  if (d.status !== statusVisto) {
    setStatusVisto(d.status);
    if (d.status === "pendente" && rolagem && rolagem.fase !== "girando") setRolagem(null);
  }
  // a rerrolagem com Força de Vontade chegou com o cartão aberto (aqui ou em outro aparelho): os dados trocados rolam de novo
  const rr = d.resultado as (Record<string, unknown> | undefined);
  const temRerrolagem = Boolean(rr?.rerrolado || rr?.heroi || rr?.inspiracao);
  const [rerrolagemVista, setRerrolagemVista] = useState(temRerrolagem);
  const [rerrolagemNova, setRerrolagemNova] = useState(false);
  if (temRerrolagem !== rerrolagemVista) {
    setRerrolagemVista(temRerrolagem);
    setRerrolagemNova(temRerrolagem);
  }
  const decidindo = d.status === "decidir";
  const aberta = decisaoAberta(d);
  const [surto, setSurto] = useState(false);
  const vontade = personagem?.ficha.recursos?.vontade ?? null;
  const nome = personagem?.ficha.nome ?? d.personagem ?? "Alguém";
  const cor = corDoNome(nome);
  const bonus = typeof d.bonus === "number" ? d.bonus : (d.resultado?.bonus ?? 0);
  const alvo = d.alvo ?? d.resultado?.alvo ?? null;
  const teste = d.teste ?? "Teste";
  const d20 = usaD20(d);
  const parada = lerParada(d.expressao, d.sistema);

  // rede de segurança: o dado não avisou que parou
  const fase = rolagem?.fase;
  useEffect(() => {
    if (fase !== "assentando") return;
    const t = setTimeout(() => setRolagem((r) => (r ? { ...r, fase: "pronto" } : r)), ESPERA_MAXIMA_MS);
    return () => clearTimeout(t);
  }, [fase]);

  // em decisão (rerrolar ou aceitar) o cartão grande fica até o jogador escolher
  useEffect(() => {
    if (fase !== "pronto" || decidindo) return;
    const t = setTimeout(() => setRolagem((r) => (r ? { ...r, fase: "recolhido" } : r)), DADO_NA_TELA_MS);
    return () => clearTimeout(t);
  }, [fase, decidindo]);

  function aoRerrolar(novo: Record<string, unknown>) {
    setRolagem((r) => (r ? { ...r, resultado: novo as Resultado } : r));
    setRerrolagemVista(true);
    setRerrolagemNova(true);
  }
  const decisao = (r: ResultadoParada) =>
    aberta ? (
      <DecisaoDoTeste
        key={`${mensagem.id}-${aberta.ate ?? "solo"}`}
        mensagemId={mensagem.id}
        decisao={aberta}
        r={r}
        podeDecidir={podeDecidir ?? podeRolar}
        quem={personagem?.jogador || nome}
        recurso={recursoDaOpcao(personagem, aberta.opcoes[0]?.id)}
        clienteId={clienteId}
        aoRerrolar={aoRerrolar}
      />
    ) : d.aceitoSozinho ? (
      <p className="mt-1 text-xs italic text-muted">ninguém decidiu a tempo: ficou o resultado do dado</p>
    ) : null;
  const opcaoSurto = (Array.isArray(d.antes) ? d.antes : []).find((o) => o.id === "surto");

  async function clicar() {
    if (rolagem) return;
    setRolagem({ fase: "girando", resultado: null });
    const reduzido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const comSurto = Boolean(opcaoSurto && surto);
    const [r] = await Promise.all([
      comSurto ? rolar(mensagem.id, { surto: true }) : rolar(mensagem.id),
      d20 || reduzido ? null : new Promise((ok) => setTimeout(ok, GIRO_MINIMO_MS)),
    ]);
    if (!r) {
      setRolagem(null);
      return;
    }
    // a rota devolve o ResultadoTeste inteiro (dadosFome, alvo, detalhes...), não só o pedaço tipado em ResultadoRolagem
    setRolagem({ fase: d20 && typeof r.natural === "number" ? "assentando" : "pronto", resultado: r as Resultado });
  }

  // cancelado: uma linha riscada
  if (!rolagem && d.status === "cancelado") {
    return (
      <p className="surgir my-4 text-center text-sm text-muted">
        <span className="line-through decoration-muted/60">
          Teste de {tituloDoTeste(teste)} de {nome}
        </span>{" "}
        <span className="italic">(cancelado)</span>
      </p>
    );
  }

  // resolvido em outro aparelho, numa visita anterior ou já recolhido: resultado compacto (sem Dado3D)
  if ((!rolagem && (d.status === "resolvido" || decidindo)) || fase === "recolhido") {
    const r = d.resultado ?? rolagem?.resultado ?? {};
    if (!d20) {
      const corGrau = corParada(r);
      const forte = r.rotuloGrau === "Crítico Sujo" || r.rotuloGrau === "Falha Bestial" || r.grau === "falha_critica";
      return (
        <div
          id={`pedido-${mensagem.id}`}
          className={`surgir relative mx-auto my-5 max-w-xl scroll-mt-24 rounded-lg border px-3 py-2.5 text-sm ${
            forte ? "border-sangue/55 bg-sangue/5" : decidindo ? "border-ambar/60 bg-surface/60" : "border-border/70 bg-surface/50"
          }`}
          role="group"
          aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}: ${rotuloParada(r)}`}
        >
          {/* recolhido aqui mesmo: o cartão grande já anunciou */}
          {!rolagem && r.grau && <Anuncio vivo={nasceuAberto} texto={`${rotuloParada(r)}: ${contaParada(parada, r, alvo)}`} />}
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate pt-0.5 text-xs text-muted">
              <span className="font-semibold" style={{ color: cor }}>
                {nome}
              </span>{" "}
              · {tituloDoTeste(teste)}
            </p>
            <span className="titulo max-w-[55%] shrink-0 text-balance text-right font-semibold leading-tight" style={{ color: corGrau }}>
              {partesDoRotulo(r).nome}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ParadaDados parada={parada} resultado={r} fase="assentado" compacto rerrolar={rerrolagemNova} />
            <span className="tabular-nums text-foreground/80">
              {contaParada(parada, r, alvo)}
              {partesDoRotulo(r).resto && <span className="text-muted"> · {partesDoRotulo(r).resto}</span>}
            </span>
          </div>
          <LinhaDisputa r={r} />
          <SangueDoResultado r={r} />
          <LinhaVontade r={r} />
          {r.detalhes && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{r.detalhes}</p>}
          {decisao(r)}
        </div>
      );
    }
    const grau = r.grau ?? "";
    const gastou = Boolean((r as Record<string, unknown>).heroi || (r as Record<string, unknown>).inspiracao);
    // crítico e falha crítica continuam marcados depois do reload: moldura, dado e o selo do dado natural
    const selo = seloDoDesfecho({ teste, grau: r.grau ?? null, natural: r.natural ?? null, d20: true });
    const marca = marcaDoD20(grau, selo);
    const corDado = marca ? COR_MARCA[marca] : COR_GRAU[grau];
    return (
      <div
        id={`pedido-${mensagem.id}`}
        className={`surgir relative mx-auto my-5 max-w-xl scroll-mt-24 rounded-lg border px-3 py-2 text-sm ${
          marca === "critico"
            ? `${ANEL_CRITICO} bg-surface/60`
            : marca === "falha"
              ? ANEL_FALHA
              : decidindo
                ? "border-ambar/60 bg-surface/60"
                : "border-border/70 bg-surface/50"
        }`}
        style={marca === "falha" ? { background: `color-mix(in srgb, ${COR_MARCA.falha} 5%, var(--surface))` } : undefined}
        role="group"
        aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}: ${rotulo(r).replace(/[!.]+$/, "")}`}
      >
      {/* recolhido aqui mesmo: o cartão grande já anunciou */}
      {!rolagem && r.grau && <Anuncio vivo={nasceuAberto} texto={fraseD20(r, alvo)} />}
      <div className="flex items-center gap-3">
        {/* -my-0.5: o hexágono (size-10) ocupa a mesma altura do quadradinho de antes, sem crescer o cartão */}
        <IconeD20
          tamanho="sm"
          valor={r.natural ?? r.total ?? "?"}
          cor="-my-0.5 text-foreground/85"
          style={corDado ? { color: corDado } : undefined}
          preenchimento={marca ? 0.12 : 0.04}
          novo={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              <span className="font-semibold" style={{ color: cor }}>
                {nome}
              </span>{" "}
              · Teste de {tituloDoTeste(teste)}
            </p>
            {selo.natural && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase leading-4 tracking-wide" style={{ color: selo.natural.cor }} aria-hidden>
                <Icone nome={selo.natural.icone} />
                {selo.natural.texto}
              </span>
            )}
          </div>
          <p className="tabular-nums">
            <span className="text-foreground/80">{conta(r.natural, bonus, r.total ?? 0, textoOposicaoResultado(r) ? null : alvo)}</span>
            <span className="text-muted"> · </span>
            <span className="font-semibold" style={{ color: COR_GRAU[grau] }}>
              {rotulo(r)}
            </span>
          </p>
          <LinhaDisputa r={r} />
        </div>
      </div>
        <LinhaRecursoD20 r={r as Record<string, unknown>} />
        {gastou && r.detalhes && <p className="mt-1 line-clamp-2 text-xs text-muted">{r.detalhes}</p>}
        {decisao(r)}
      </div>
    );
  }

  // pendente (ou rolado agora neste aparelho): o cartão grande com os dados
  // depois da rerrolagem vale o resultado novo (chega pela rota ou pelo fluxo de eventos)
  const resultado = ((temRerrolagem ? d.resultado : null) as Resultado | null) ?? rolagem?.resultado ?? null;
  const pronto = rolagem?.fase === "pronto" && resultado;
  const natural = resultado?.natural ?? null;
  const destaque = natural === 20 ? "critico" : natural === 1 ? "falha" : null;
  const corGrau = resultado ? COR_GRAU[resultado.grau] : undefined;
  // o momento do resultado: a moldura pega a cor do grau; crítico e falha crítica (pelo grau ou pelo dado natural) pulsam
  const seloD20 = d20 && resultado ? seloDoDesfecho({ teste, grau: resultado.grau ?? null, natural, d20: true }) : null;
  const marca = seloD20 && resultado ? marcaDoD20(resultado.grau, seloD20) : null;
  const corMoldura = !pronto ? null : !d20 ? corParada(resultado) : marca ? COR_MARCA[marca] : (corGrau ?? null);
  const pulsa =
    Boolean(pronto) &&
    (marca !== null ||
      (!d20 && (resultado?.grau === "sucesso_critico" || resultado?.grau === "falha_critica" || resultado?.rotuloGrau === "Crítico Sujo" || resultado?.rotuloGrau === "Falha Bestial")));
  // esperando o clique deste aparelho: o cartão respira (brilho em ceu-estrelado.tsx) para chamar o olho
  const esperando = !rolagem && podeRolar;
  // o texto do resultado espera o último dado da parada assentar
  const atraso = { "--atraso": `${qtdDados(parada, resultado) * PASSO_MS + 480}ms` } as CSSProperties;
  return (
    <section
      id={`pedido-${mensagem.id}`}
      // halo-pulso e surgir disputam a mesma propriedade (animation): no resultado crítico fica só o halo
      className={`${pulsa ? "halo-pulso" : "surgir"} pedido-teste relative mx-auto my-8 max-w-xl scroll-mt-24 overflow-hidden rounded-2xl border bg-surface/85 px-4 pb-5 pt-4 text-center shadow-[0_0_60px_-24px_var(--ambar)] sm:px-6 ${
        esperando ? "pedido-pendente border-ambar/70" : "border-ambar/50"
      }`}
      // `color` é só para o currentColor do halo; o texto do cartão volta à cor do tema no invólucro logo abaixo
      style={
        corMoldura
          ? { color: corMoldura, borderColor: `color-mix(in srgb, ${corMoldura} 60%, transparent)`, boxShadow: `0 0 60px -24px ${corMoldura}` }
          : undefined
      }
      role="group"
      aria-label={`Teste de ${tituloDoTeste(teste)} de ${nome}`}
    >
      <div className="text-foreground">
      {/* a região já existe vazia antes do dado: leitor de tela só anuncia com segurança o texto que chega a uma região montada */}
      <Anuncio texto={!pronto ? "" : d20 ? fraseD20(resultado, alvo) : `${rotuloParada(resultado)}: ${contaParada(parada, resultado, alvo)}`} />
      {/* os data-pd-* são os pontos que a versão compacta do leitor cena a cena mexe (sem retrato, motivo numa linha, menos respiro) */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        {personagem && (
          <span className="contents" data-pd-retrato>
            <Retrato ficha={personagem.ficha} tamanho={28} />
          </span>
        )}
        <span className="font-semibold" style={{ color: cor }}>
          {nome}
        </span>
        <span>precisa de um teste</span>
      </div>
      <h3 className="titulo mx-auto mt-2 max-w-md text-balance text-[1.35rem] leading-tight text-pergaminho sm:text-2xl" data-pd-titulo>
        {tituloDoTeste(teste)}
      </h3>
      <Chips d={d} parada={parada} d20={d20} bonus={bonus} alvo={alvo} />
      {d.motivo && (
        <p className="mx-auto mt-2.5 max-w-md text-[0.95rem] italic text-foreground/80" data-pd-motivo>
          {d.motivo}
        </p>
      )}
      {!rolagem && d.status === "pendente" && (d.detalhes || (d.sistema === "vtm5" && vontade)) && (
        <p className="mx-auto mt-1.5 max-w-md text-xs italic text-muted" data-pd-detalhes>
          {d.detalhes}
          {d.sistema === "vtm5" && vontade && (
            <span className="not-italic">
              {d.detalhes ? " · " : ""}
              Força de Vontade {vontade.atual}/{vontade.max}
            </span>
          )}
        </p>
      )}
      {!rolagem && d.status === "pendente" && opcaoSurto && podeRolar && (
        <label className="etiqueta-matiz matiz-4 mx-auto mt-2.5 flex min-h-10 w-fit cursor-pointer gap-2 px-3 py-1 sm:min-h-0" data-pd-surto>
          <input type="checkbox" checked={surto} onChange={(e) => setSurto(e.target.checked)} className="accent-[var(--sangue)]" /><Icone nome="bolt" />  {opcaoSurto.rotulo}
          {opcaoSurto.efeito ? ` (${opcaoSurto.efeito})` : ""}{" "}
          <span className="text-muted">· rola um Despertar antes</span>
        </label>
      )}

      {d20 ? (
        <div className="mt-4 flex justify-center" data-pd-dados>
          <Dado3D
            valor={natural}
            rolando={rolagem?.fase === "girando"}
            tamanho={150}
            destaque={rolagem && rolagem.fase !== "girando" ? destaque : null}
            aoParar={() => setRolagem((r) => (r && r.fase === "assentando" ? { ...r, fase: "pronto" } : r))}
          />
        </div>
      ) : (
        <div className="mt-5 flex min-h-14 justify-center" data-pd-dados>
          <ParadaDados
            parada={parada}
            resultado={resultado}
            fase={!rolagem ? "espera" : rolagem.fase === "girando" ? "rolando" : "assentado"}
            novo
            rerrolar={rerrolagemNova}
          />
        </div>
      )}

      {pronto && !d20 ? (
        <div className={`${CLASSE_DEPOIS} mt-4`} style={atraso}>
          <p className="titulo text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: corParada(resultado) }}>
            {partesDoRotulo(resultado).nome}
          </p>
          {partesDoRotulo(resultado).resto && (
            <p className="mx-auto mt-0.5 max-w-md text-balance text-sm" style={{ color: corParada(resultado) }}>
              {partesDoRotulo(resultado).resto}
            </p>
          )}
          <p className="mt-1 text-sm tabular-nums text-foreground/85 sm:text-base">{contaParada(parada, resultado, alvo)}</p>
          <LinhaDisputa r={resultado} centro />
          <SangueDoResultado r={resultado} centro novo />
          <LinhaVontade r={resultado} centro />
          {resultado.detalhes && <p className="mx-auto mt-2 max-w-md text-xs text-muted">{resultado.detalhes}</p>}
          {decisao(resultado)}
        </div>
      ) : pronto ? (
        <div className={`${CLASSE_DEPOIS} mt-4`}>
          {/* a folha do pd-depois é a da parada; no d20 ela não está na página sem isto */}
          <EstiloParada />
          <p className="titulo text-2xl font-semibold leading-none sm:text-3xl" style={{ color: marca ? COR_MARCA[marca] : corGrau }} data-pd-grau>
            {rotulo(resultado)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-foreground/85 sm:text-base" data-pd-conta>
            {conta(resultado.natural, bonus, resultado.total, textoOposicaoResultado(resultado) ? null : alvo)}
          </p>
          <LinhaDisputa r={resultado} centro />
          <LinhaRecursoD20 r={resultado as unknown as Record<string, unknown>} />
          {decisao(resultado)}
        </div>
      ) : rolagem ? (
        <p className="mt-4 text-sm italic text-muted" data-pd-rodape>
          {d20 ? "O dado corre pela mesa…" : "Os dados correm pela mesa…"}
        </p>
      ) : podeRolar ? (
        <>
          <button
            type="button"
            data-rolar
            className="btn-palco mt-5 w-full max-w-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ambar sm:w-auto"
            onClick={() => void clicar()}
          ><Icone nome="dice" />  {d20 ? "Rolar o dado" : "Rolar os dados"}
            {opcaoSurto && surto ? " com Surto" : ""}
          </button>
          {perguntar && (
            <p className="mt-2">
              <button
                type="button"
                data-pd-perguntar
                className="inline-flex min-h-10 items-center text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-foreground"
                onClick={() => perguntar(`(( Sobre o teste de ${tituloDoTeste(teste)}: não é essa parada? Qual atributo e perícia valem aqui? ))`)}
              >
                não é essa parada? pergunte ao mestre
              </button>
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-foreground/85" data-pd-rodape>
          {personagem && (
            <span className="contents" data-pd-retrato>
              <Retrato ficha={personagem.ficha} tamanho={24} />
            </span>
          )}
          <span>
            {d20 ? "O dado está com" : "Os dados estão com"}{" "}
            <span className="font-semibold" style={{ color: cor }}>
              {personagem?.jogador || nome}
            </span>
          </span>
          <span className="pensando text-ambar" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </p>
      )}
      </div>
    </section>
  );
}
