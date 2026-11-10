"use client";

import type { ReactNode } from "react";
import { CartaoDado, listaDespertares, MedidorFome } from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import { COR_GRAU, corDoNome } from "./cores";
import { Icone, type NomeIcone } from "@/components/icones";

// Acontecimentos mecânicos no fluxo do livro (dano, XP, descanso, missão, reputação, rolagem do mestre...):
// linhas discretas e centradas, como notas de rodapé no meio do capítulo. Tipos sem desenho próprio usam o CartaoDado.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dados = Record<string, any>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function Nome({ nome }: { nome: unknown }) {
  if (typeof nome !== "string" || !nome) return null;
  return (
    <span className="font-semibold not-italic" style={{ color: corDoNome(nome) }}>
      {nome}
    </span>
  );
}

/** Linha centrada com um fio de cada lado ("Garran perdeu 4 de Vida (8/12)"). `cor`: cor do grau vinda de COR_GRAU (vai em style, por cima do tom). */
function Linha({ children, icone, tom = "text-muted", titulo, cor }: { children: ReactNode; icone?: NomeIcone; tom?: string; titulo?: string; cor?: string }) {
  return (
    <div className={`surgir my-4 flex items-center gap-3 text-sm ${tom}`} style={cor ? { color: cor } : undefined} title={titulo}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-border" aria-hidden />
      <p className="max-w-[85%] text-center italic leading-snug">
        {icone && (
          <span className="mr-1.5 not-italic" aria-hidden>
            <Icone nome={icone} />
          </span>
        )}
        {children}
      </p>
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-border" aria-hidden />
    </div>
  );
}

function juntar(partes: ReactNode[]): ReactNode[] {
  return partes.flatMap((p, i) => (i === 0 ? [p] : [<span key={`s${i}`}> · </span>, p]));
}

function LinhaFicha({ r, m }: { r: Dados; m: Mensagem }) {
  const pv = num(r.pv);
  const pvMax = num(r.pvMax);
  const pvAntes = num(r.pvAntes);
  const delta = pv !== null && pvAntes !== null ? pv - pvAntes : 0;
  const partes: ReactNode[] = [];
  if (delta < 0)
    partes.push(
      <span key="pv">
        <Nome nome={r.personagem} /> perdeu <span className="not-italic font-semibold" style={{ color: COR_GRAU.falha }}>{-delta}</span> de Vida
        {pvMax !== null && ` (${pv}/${pvMax})`}
      </span>,
    );
  else if (delta > 0)
    partes.push(
      <span key="pv">
        <Nome nome={r.personagem} /> recuperou <span className="not-italic font-semibold" style={{ color: COR_GRAU.sucesso }}>{delta}</span> de Vida
        {pvMax !== null && ` (${pv}/${pvMax})`}
      </span>,
    );
  const ganhou = lista(r.ganhou);
  const perdeu = lista(r.perdeu);
  const recursos = lista(r.recursos);
  const semNome = partes.length > 0;
  if (ganhou.length)
    partes.push(
      <span key="g">
        {!semNome && (
          <>
            <Nome nome={r.personagem} />{" "}
          </>
        )}
        recebeu <span className="not-italic text-pergaminho">{ganhou.join(", ")}</span>
      </span>,
    );
  if (perdeu.length)
    partes.push(
      <span key="p">
        {partes.length === 0 && (
          <>
            <Nome nome={r.personagem} />{" "}
          </>
        )}
        perdeu <span className="line-through decoration-muted/60">{perdeu.join(", ")}</span>
      </span>,
    );
  if (recursos.length) partes.push(<span key="r">{recursos.join(", ")}</span>);
  if (!partes.length)
    partes.push(
      <span key="m">
        <Nome nome={r.personagem} />
        {r.motivo ? `: ${r.motivo}` : ""}
      </span>,
    );
  return (
    <Linha icone={delta < 0 ? "drop" : delta > 0 ? "plus" : "pencil"} titulo={m.texto}>
      {juntar(partes)}
    </Linha>
  );
}

function LinhaXp({ r, novo }: { r: Dados; novo: boolean }) {
  const subiu = num(r.subiuPara);
  const ganho = num(r.ganho);
  // subir de nível é evento, não nota de rodapé: bloco próprio, inteiro numa página do leitor (data-inteiro = break-inside: avoid).
  // O surgir fica no invólucro: no mesmo elemento ele e o halo-pulso disputariam a propriedade animation.
  // O halo só pulsa quando o evento chega com a mesa aberta; no histórico (e a cada página virada do leitor) o cartão fica parado.
  if (subiu !== null)
    return (
      <div data-inteiro className="surgir my-4" title={typeof r.resumo === "string" ? r.resumo : undefined}>
        <div className={`cartao cartao-matiz ${novo ? "halo-pulso " : ""}mx-auto max-w-xl px-4 py-3 text-center text-ambar`}>
          <p className="text-sm">
            <Icone nome="sparkle" /> <Nome nome={r.personagem} />
          </p>
          <p className="titulo text-xl text-pergaminho">Nível {subiu}</p>
          <p className="text-xs text-muted">
            {ganho !== null ? `Ganhou ${ganho} de experiência e subiu de nível` : typeof r.resumo === "string" && r.resumo ? r.resumo : "Subiu de nível"}
          </p>
        </div>
      </div>
    );
  return (
    <Linha icone="sparkle" titulo={r.resumo}>
      {ganho !== null ? (
        <>
          <Nome nome={r.personagem} /> ganhou {ganho} de experiência
        </>
      ) : (
        r.resumo || "Experiência anotada"
      )}
    </Linha>
  );
}

function LinhaDescanso({ r }: { r: Dados }) {
  const tipo = String(r.descanso ?? r.tipoDescanso ?? "");
  return (
    <Linha icone="moon" titulo={r.resumo}>
      <Nome nome={r.personagem} /> descansou{tipo === "curto" ? " um pouco" : tipo === "longo" ? " a noite toda" : ""}
      {r.resumo && <span className="block text-xs text-muted/80">{r.resumo}</span>}
    </Linha>
  );
}

function LinhaDiario({ r, m }: { r: Dados; m: Mensagem }) {
  const titulo = r.entrada?.titulo;
  const rot = String(r.rotulo ?? "");
  // missão concluída ou fracassada pega a cor do grau; o resto fica no âmbar do tema
  const cor = /conclu/i.test(rot) ? COR_GRAU.sucesso : /fracass|falhou/i.test(rot) ? COR_GRAU.falha : undefined;
  return (
    <Linha icone="scroll" tom="text-ambar" cor={cor}>
      {titulo ? (
        <>
          <span className="not-italic text-[11px] font-semibold uppercase tracking-[0.2em]">{rot || "Diário"}</span>
          <span className="not-italic text-muted">: </span>
          <span className="text-pergaminho">{titulo}</span>
        </>
      ) : (
        String(r.resumo ?? r.texto ?? m.texto)
      )}
    </Linha>
  );
}

function LinhaReputacao({ r }: { r: Dados }) {
  const v = num(r.variacao) ?? 0;
  const eixo = String(r.eixo ?? "Reputação");
  return (
    <Linha icone={v >= 0 ? "arrowUp" : "arrowDown"} titulo={r.motivo}>
      <Nome nome={r.personagem} />: {eixo.charAt(0).toUpperCase() + eixo.slice(1)}{" "}
      <span className="not-italic font-semibold" style={{ color: v >= 0 ? COR_GRAU.sucesso : COR_GRAU.falha }}>{v >= 0 ? `+${v}` : `−${Math.abs(v)}`}</span>
      {r.motivo && <span className="text-muted/80"> · {r.motivo}</span>}
    </Linha>
  );
}

function LinhaRolagem({ r, m }: { r: Dados; m: Mensagem }) {
  const doMestre = r.origem !== "jogador";
  const quem = doMestre ? "O mestre" : (r.personagem ?? m.autor ?? "Alguém");
  if (r.secreta)
    return (
      <Linha icone="dice">
        {quem} rolou em segredo{r.motivo ? ` · ${r.motivo}` : ""}
      </Linha>
    );
  return (
    <Linha icone="dice" titulo={m.texto}>
      {doMestre ? quem : <Nome nome={quem} />} rolou {r.expressao ?? "os dados"}
      {num(r.total) !== null && (
        <>
          {" = "}
          <span className="not-italic font-semibold text-pergaminho">{r.total}</span>
        </>
      )}
      {r.motivo ? ` · ${r.motivo}` : ""}
    </Linha>
  );
}

/** Despertar e Surto de Sangue do Vampiro: nota de rodapé com as faces e a Fome em losangos ("Despertar · Celeridade ●●: 4 → Fome 2 → 3"). */
function LinhaSangue({ r, m, novo }: { r: Dados; m: Mensagem; novo: boolean }) {
  const x = listaDespertares(r.despertares)[0];
  const surto = r.vtm === "surto";
  const ganho = num(r.surtoGanho) ?? 0;
  const pesou = x.falhas > 0 || Boolean(x.estourou);
  // dado rolado de novo: a face antiga, o ícone de rerrolar e a nova
  const faces = x.rolagens.map((f, i) => (
    <span key={i}>
      {i > 0 && ", "}
      {f[0]}
      {f.length > 1 && (
        <>
          <Icone nome="redo" className="mx-px" />
          {f[1]}
        </>
      )}
    </span>
  ));
  const fome = x.estourou
    ? x.fomeAntes < 5
      ? `Fome ${x.fomeAntes} → 5, e a Besta cobra`
      : "Fome 5: o sangue não responde"
    : x.falhas
      ? `Fome ${x.fomeAntes} → ${x.fomeDepois}`
      : `Fome segue ${x.fomeAntes}`;
  return (
    <Linha icone={surto ? "bolt" : "drop"} tom={pesou ? "text-foreground/85" : "text-muted"} titulo={m.texto}>
      <Nome nome={r.personagem} /> · {surto ? "Surto de Sangue" : `Despertar${x.vezes > 1 ? ` ×${x.vezes}` : ""}${x.motivo ? ` · ${x.motivo}` : ""}`}:{" "}
      <span className="not-italic tabular-nums text-foreground/85">{faces}</span>
      {" → "}
      <span className="not-italic font-semibold" style={{ color: pesou ? "var(--sangue)" : undefined }}>
        {fome}
      </span>{" "}
      <span className="ml-1 inline-flex translate-y-px align-middle not-italic">
        <MedidorFome antes={x.fomeAntes} depois={x.fomeDepois} novo={novo} />
      </span>
      {surto && ganho > 0 && (
        <span className="block text-xs not-italic" style={{ color: "var(--critico)" }}>
          +{ganho} dados no próximo teste
        </span>
      )}
    </Linha>
  );
}

/** Teste resolvido direto pelo sistema (sem o jogador rolar): uma linha com a conta e o grau. */
function LinhaTeste({ r }: { r: Dados }) {
  const natural = num(r.natural);
  const bonus = num(r.bonus) ?? 0;
  const alvo = num(r.alvo);
  const conta =
    natural !== null && (r.dados?.length ?? 1) <= 2
      ? `${natural} ${bonus >= 0 ? "+" : "−"} ${Math.abs(bonus)} = ${r.total}`
      : `${String(r.expressao ?? "").replace(/\s+vs\s+.*$/, "")} = ${r.total}`;
  // teste oposto: no lugar do "vs alvo", quem resistiu e quanto tirou
  const o = r.oposicao as { nome?: unknown; expressao?: unknown; total?: unknown } | undefined;
  const contra = o && typeof o.nome === "string" && typeof o.total === "number" ? `contra ${o.nome} (${String(o.expressao ?? "")} → ${o.total})` : null;
  const dano = r.dano as { texto?: unknown; valor?: unknown } | undefined;
  return (
    <Linha icone="dice" titulo={r.motivo}>
      <Nome nome={r.personagem} /> · {r.teste}: <span className="not-italic tabular-nums text-foreground/85">{conta}</span>
      {contra ? (
        <span className="not-italic tabular-nums text-foreground/85"> {contra}</span>
      ) : (
        alvo !== null && <span className="not-italic tabular-nums text-foreground/85"> vs {alvo}</span>
      )}
      {" · "}
      <span className="not-italic font-semibold" style={{ color: COR_GRAU[r.grau] }}>
        {r.rotuloGrau}
      </span>
      {dano && typeof dano.valor === "number" && (
        <span className="not-italic text-foreground/85"> · {typeof dano.texto === "string" && dano.texto ? dano.texto : `${dano.valor} de dano`}</span>
      )}
    </Linha>
  );
}

export function LinhaDado({ mensagem, novo }: { mensagem: Mensagem; novo: boolean }) {
  const r = (mensagem.dados ?? {}) as Dados;
  switch (r.tipo) {
    case "ficha":
      return <LinhaFicha r={r} m={mensagem} />;
    case "xp":
      return <LinhaXp r={r} novo={novo} />;
    case "descanso":
    case "curto":
    case "longo":
      return <LinhaDescanso r={r} />;
    case "diario":
      return <LinhaDiario r={r} m={mensagem} />;
    case "reputacao":
      return <LinhaReputacao r={r} />;
    case "rolagem":
      return <LinhaRolagem r={r} m={mensagem} />;
    case "teste":
      // Despertar e Surto do Vampiro viram nota de rodapé; testes de parada de dados (Vampiro) e afins ficam com o cartão completo
      if ((r.vtm === "despertar" || r.vtm === "surto") && listaDespertares(r.despertares).length) return <LinhaSangue r={r} m={mensagem} novo={novo} />;
      if (r.sistema === "vtm5" || Array.isArray(r.dadosFome))
        return (
          <div className="my-4">
            <CartaoDado mensagem={mensagem} novo={novo} />
          </div>
        );
      return <LinhaTeste r={r} />;
    case "combate":
      return (
        <Linha icone="swords" cor={COR_GRAU.falha}>
          {String(r.resumo ?? mensagem.texto)}
        </Linha>
      );
    case "cena":
      return <Linha icone="place">{String(r.texto ?? mensagem.texto)}</Linha>;
    case "iniciativa":
    default:
      return (
        <div className="my-5">
          <CartaoDado mensagem={mensagem} novo={novo} />
        </div>
      );
  }
}
