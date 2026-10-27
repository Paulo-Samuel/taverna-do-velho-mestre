"use client";

import type { ReactNode } from "react";
import { CartaoDado, listaDespertares, MedidorFome } from "@/components/chat/cartao-dado";
import type { Mensagem } from "@/lib/db";
import { COR_GRAU, corDoNome } from "./cores";

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

/** Linha centrada com fios dos dois lados: "— Garran perdeu 4 de Vida (8/12) —". */
function Linha({ children, icone, tom = "text-muted", titulo }: { children: ReactNode; icone?: string; tom?: string; titulo?: string }) {
  return (
    <div className={`surgir my-4 flex items-center gap-3 text-sm ${tom}`} title={titulo}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-border" aria-hidden />
      <p className="max-w-[85%] text-center italic leading-snug">
        {icone && (
          <span className="mr-1.5 not-italic" aria-hidden>
            {icone}
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
        <Nome nome={r.personagem} /> perdeu <span className="not-italic font-semibold text-[#f28b82]">{-delta}</span> de Vida
        {pvMax !== null && ` (${pv}/${pvMax})`}
      </span>,
    );
  else if (delta > 0)
    partes.push(
      <span key="pv">
        <Nome nome={r.personagem} /> recuperou <span className="not-italic font-semibold text-[#9ad4a0]">{delta}</span> de Vida
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
    <Linha icone={delta < 0 ? "🩸" : delta > 0 ? "✚" : "✎"} titulo={m.texto}>
      {juntar(partes)}
    </Linha>
  );
}

function LinhaXp({ r }: { r: Dados }) {
  const subiu = num(r.subiuPara);
  const ganho = num(r.ganho);
  return (
    <Linha icone="✦" tom={subiu ? "text-ambar" : "text-muted"} titulo={r.resumo}>
      {ganho !== null && (
        <>
          <Nome nome={r.personagem} /> ganhou {ganho} de experiência
        </>
      )}
      {ganho !== null && subiu !== null && " · "}
      {subiu !== null && (
        <span className="not-italic font-semibold">
          {ganho === null && (
            <>
              <Nome nome={r.personagem} />{" "}
            </>
          )}
          chegou ao nível {subiu}!
        </span>
      )}
      {ganho === null && subiu === null && (r.resumo || "Experiência anotada")}
    </Linha>
  );
}

function LinhaDescanso({ r }: { r: Dados }) {
  const tipo = String(r.descanso ?? r.tipoDescanso ?? "");
  return (
    <Linha icone="☾" titulo={r.resumo}>
      <Nome nome={r.personagem} /> descansou{tipo === "curto" ? " um pouco" : tipo === "longo" ? " a noite toda" : ""}
      {r.resumo && <span className="block text-xs text-muted/80">{r.resumo}</span>}
    </Linha>
  );
}

function LinhaDiario({ r, m }: { r: Dados; m: Mensagem }) {
  const titulo = r.entrada?.titulo;
  const rot = String(r.rotulo ?? "");
  const tom = /conclu/i.test(rot) ? "text-[#9ad4a0]" : /fracass|falhou/i.test(rot) ? "text-[#f28b82]" : "text-ambar";
  return (
    <Linha icone="❡" tom={tom}>
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
    <Linha icone={v >= 0 ? "▲" : "▼"} titulo={r.motivo}>
      <Nome nome={r.personagem} />: {eixo.charAt(0).toUpperCase() + eixo.slice(1)}{" "}
      <span className={`not-italic font-semibold ${v >= 0 ? "text-[#9ad4a0]" : "text-[#f28b82]"}`}>{v >= 0 ? `+${v}` : `−${Math.abs(v)}`}</span>
      {r.motivo && <span className="text-muted/80"> — {r.motivo}</span>}
    </Linha>
  );
}

function LinhaRolagem({ r, m }: { r: Dados; m: Mensagem }) {
  const doMestre = r.origem !== "jogador";
  const quem = doMestre ? "O mestre" : (r.personagem ?? m.autor ?? "Alguém");
  if (r.secreta)
    return (
      <Linha icone="🎲">
        {quem} rolou em segredo{r.motivo ? ` · ${r.motivo}` : ""}
      </Linha>
    );
  return (
    <Linha icone="🎲" titulo={m.texto}>
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
  const faces = x.rolagens.map((f) => (f.length > 1 ? `${f[0]}↻${f[1]}` : String(f[0]))).join(", ");
  const fome = x.estourou
    ? x.fomeAntes < 5
      ? `Fome ${x.fomeAntes} → 5, e a Besta cobra`
      : "Fome 5: o sangue não responde"
    : x.falhas
      ? `Fome ${x.fomeAntes} → ${x.fomeDepois}`
      : `Fome segue ${x.fomeAntes}`;
  return (
    <Linha icone={surto ? "⚡" : "🩸"} tom={pesou ? "text-foreground/85" : "text-muted"} titulo={m.texto}>
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
      : `${r.expressao ?? ""} = ${r.total}`;
  return (
    <Linha icone="🎲" titulo={r.motivo}>
      <Nome nome={r.personagem} /> · {r.teste}: <span className="not-italic tabular-nums text-foreground/85">{conta}</span>
      {alvo !== null && <span className="not-italic tabular-nums text-foreground/85"> vs {alvo}</span>}
      {" · "}
      <span className="not-italic font-semibold" style={{ color: COR_GRAU[r.grau] }}>
        {r.rotuloGrau}
      </span>
    </Linha>
  );
}

export function LinhaDado({ mensagem, novo }: { mensagem: Mensagem; novo: boolean }) {
  const r = (mensagem.dados ?? {}) as Dados;
  switch (r.tipo) {
    case "ficha":
      return <LinhaFicha r={r} m={mensagem} />;
    case "xp":
      return <LinhaXp r={r} />;
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
        <Linha icone="⚔" tom="text-[#f28b82]">
          {String(r.resumo ?? mensagem.texto)}
        </Linha>
      );
    case "cena":
      return <Linha icone="◈">{String(r.texto ?? mensagem.texto)}</Linha>;
    case "iniciativa":
    default:
      return (
        <div className="my-5">
          <CartaoDado mensagem={mensagem} novo={novo} />
        </div>
      );
  }
}
