"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import * as identidade from "@/lib/cliente/identidade";
import type { PersonagemVisivel } from "@/lib/mesa";
import type { CompraXp, ItemXp, NovoXp, OfertaXp, SecaoXp } from "@/lib/sistemas/vtm5/xp";
import { temaDoSistema } from "@/lib/temas";

// Gastar XP do Vampiro V5 na ficha da mesa: vitrine por seção (atributos, perícias, disciplinas...), custo do próximo ponto,
// confirmação leve e "desfazer última compra". As regras moram no servidor (vtm5/xp.ts); aqui só desenha o que ele manda.
// A ficha nova chega a todos pelo SSE {e:"personagem"}; quando ela muda, a vitrine se busca de novo.

type Confirmacao = { corpo: { compra: CompraXp } | { desfazer: true }; pergunta: string; aviso?: string };

const bolinhas = (atual: number, max: number) => `${"●".repeat(Math.max(0, atual))}${"○".repeat(Math.max(0, max - atual))}`;
const pontos = (n: number) => (n > 0 ? "●".repeat(n) : "—");

/** Botão "✦ Gastar XP (N)" + o painel. Só para o Vampiro (quem chama decide). */
export function BotaoGastarXp({ personagem }: { personagem: PersonagemVisivel }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="No V5 não há nível: o XP compra pontos de atributo, perícia, disciplina, vantagem e Potência de Sangue"
        className="rounded-full border border-ambar/50 bg-ambar/10 px-2 py-0.5 text-[11px] text-ambar transition hover:bg-ambar/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ambar"
      >
        ✦ Gastar XP ({personagem.ficha.xp.toLocaleString("pt-BR")})
      </button>
      {aberto && <PainelGastarXp personagem={personagem} aoFechar={() => setAberto(false)} />}
    </>
  );
}

function PainelGastarXp({ personagem, aoFechar }: { personagem: PersonagemVisivel; aoFechar: () => void }) {
  const [oferta, setOferta] = useState<OfertaXp | null>(null);
  const [aba, setAba] = useState("atributos");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tom: "ok" | "erro" } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);
  const url = `/api/campanhas/${personagem.campanhaId}/personagens/${personagem.id}/xp`;
  const ficha = personagem.ficha;

  const buscar = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { oferta?: OfertaXp; ocupado?: boolean; erro?: string };
      if (j.oferta) setOferta(j.oferta);
      setOcupado(Boolean(j.ocupado));
      // o mestre terminou: o aviso de "narrando" já não vale
      if (!j.ocupado) setAviso((a) => (a?.tom === "erro" && /narrando/i.test(a.texto) ? null : a));
      if (!r.ok) setAviso({ texto: j.erro ?? "Não deu para abrir a lista de compras.", tom: "erro" });
    } catch {
      setAviso({ texto: "Sem conexão com a taverna.", tom: "erro" });
    }
  }, [url]);

  // abriu, ou a ficha mudou (compra em outro aparelho, o mestre deu XP): busca a vitrine de novo
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca externa; o setState vem depois do fetch
    void buscar();
  }, [buscar, ficha]);

  // a ficha não sabe quando o mestre termina de narrar: enquanto ele fala, pergunta de novo de tempos em tempos
  useEffect(() => {
    if (!ocupado) return;
    const t = setInterval(() => void buscar(), 2500);
    return () => clearInterval(t);
  }, [ocupado, buscar]);

  useEffect(() => {
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && (confirmacao ? setConfirmacao(null) : aoFechar());
    window.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [aoFechar, confirmacao]);

  async function enviar(c: Confirmacao) {
    setEnviando(true);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c.corpo, autor: identidade.apelido() || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { oferta?: OfertaXp; resumo?: string; erro?: string };
      if (j.oferta) setOferta(j.oferta);
      if (r.ok) setAviso({ texto: j.resumo ?? "Feito.", tom: "ok" });
      else {
        setAviso({ texto: j.erro ?? "Não deu para gastar agora.", tom: "erro" });
        if (r.status === 409 && /narrando/i.test(j.erro ?? "")) setOcupado(true);
      }
    } catch {
      setAviso({ texto: "Sem conexão com a taverna.", tom: "erro" });
    } finally {
      setEnviando(false);
      setConfirmacao(null);
    }
  }

  function pedirCompra(compra: CompraXp, nome: string, custo: number, aviso?: string) {
    setAviso(null);
    setConfirmacao({ corpo: { compra }, pergunta: `Comprar ${nome} por ${custo} XP?`, aviso });
  }

  const secao = oferta?.secoes.find((s) => s.id === aba) ?? oferta?.secoes[0];
  const ultima = oferta?.ultima;

  return createPortal(
    <div
      data-tema={temaDoSistema(ficha.sistema)}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gastar-xp-titulo"
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface text-foreground shadow-2xl sm:h-[min(46rem,90dvh)] sm:max-w-xl sm:rounded-2xl"
      >
        <header className="flex items-start gap-3 border-b border-border px-4 pb-2 pt-3">
          <div className="min-w-0 flex-1">
            <h2 id="gastar-xp-titulo" className="titulo text-xl leading-tight text-pergaminho">
              ✦ Gastar XP
            </h2>
            <p className="truncate text-xs text-muted">{ficha.nome} · a eternidade é longa, o XP nem tanto</p>
          </div>
          <button ref={fechar} type="button" onClick={aoFechar} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ambar">
            ✕
          </button>
        </header>

        <nav role="tablist" aria-label="O que comprar" className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border px-2 [scrollbar-width:none] sm:flex-wrap">
          {(oferta?.secoes ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={secao?.id === s.id}
              onClick={() => {
                setAba(s.id);
                setConfirmacao(null);
              }}
              className={`-mb-px min-h-10 shrink-0 whitespace-nowrap border-b-2 px-2 text-sm focus-visible:text-ambar focus-visible:outline-none ${secao?.id === s.id ? "border-ambar text-ambar" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {s.id === "potencia" ? "Potência" : s.titulo}
              {s.itens.some((i) => i.cabe) && <span className="ml-1 inline-block size-1.5 rounded-full bg-ambar align-middle" aria-hidden />}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {ocupado && (
            <p role="status" className="mb-2 rounded-md border border-sangue/40 bg-sangue/10 px-2 py-1 text-xs text-sangue">
              O mestre está narrando. Dá para olhar a vitrine, mas comprar só quando ele terminar.
            </p>
          )}
          {aviso && (
            <p role="status" className={`mb-2 rounded-md border px-2 py-1.5 text-xs leading-snug ${aviso.tom === "ok" ? "border-musgo/40 bg-musgo/10 text-musgo" : "border-sangue/40 bg-sangue/10 text-sangue"}`}>
              {aviso.texto}
            </p>
          )}
          {!oferta ? (
            <p className="py-8 text-center text-sm text-muted">Contando as moedas de sangue…</p>
          ) : secao ? (
            <ConteudoSecao secao={secao} xp={oferta.xp} desligado={enviando || ocupado} aoComprar={pedirCompra} />
          ) : null}
          {oferta && oferta.historico.length > 0 && (
            <details className="mt-4 border-t border-border/70 pt-2 text-xs text-muted">
              <summary className="cursor-pointer hover:text-ambar">Últimos gastos</summary>
              <ul className="mt-1.5 space-y-0.5">
                {oferta.historico.map((g, i) => (
                  <li key={`${g.data}-${i}`} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{g.item}</span>
                    <span className="shrink-0 tabular-nums">−{g.custo} XP</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {confirmacao && (
          <div role="alertdialog" aria-label="Confirmar" className="shrink-0 border-t border-ambar/40 bg-ambar/10 px-4 py-2.5">
            <p className="text-sm text-pergaminho">{confirmacao.pergunta}</p>
            {confirmacao.aviso && <p className="mt-0.5 text-xs leading-snug text-ambar">⚠ {confirmacao.aviso}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn-borda px-3 py-1.5 text-sm" onClick={() => setConfirmacao(null)} disabled={enviando}>
                Melhor não
              </button>
              <button type="button" className="btn-ambar px-3 py-1.5 text-sm" onClick={() => void enviar(confirmacao)} disabled={enviando} autoFocus>
                {enviando ? "Gastando…" : "desfazer" in confirmacao.corpo ? "Desfazer" : "Comprar"}
              </button>
            </div>
          </div>
        )}

        <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-surface-2/60 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <p className="text-sm">
            <span className="text-muted">XP disponível </span>
            <span className="titulo text-lg tabular-nums tracking-normal! text-ambar">{(oferta?.xp ?? ficha.xp).toLocaleString("pt-BR")}</span>
          </p>
          {ultima && (
            <span className="ml-auto" title={ultima.podeDesfazer ? `Volta ${ultima.item} e devolve ${ultima.custo} XP` : ultima.motivo}>
              <button
                type="button"
                disabled={!ultima.podeDesfazer || enviando || ocupado}
                onClick={() => {
                  setAviso(null);
                  setConfirmacao({ corpo: { desfazer: true }, pergunta: `Desfazer “${ultima.item}” e recuperar ${ultima.custo} XP?` });
                }}
                className="max-w-[16rem] truncate text-xs text-muted underline-offset-2 hover:text-ambar hover:underline focus-visible:text-ambar focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted/40 disabled:no-underline"
              >
                ↶ desfazer última compra
              </button>
            </span>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ConteudoSecao({ secao, xp, desligado, aoComprar }: { secao: SecaoXp; xp: number; desligado: boolean; aoComprar: (c: CompraXp, nome: string, custo: number, aviso?: string) => void }) {
  // agrupa as linhas pelo grupo (Físicos/Sociais/Mentais, Do clã/De fora), mantendo a ordem do servidor
  const grupos: { titulo?: string; itens: ItemXp[] }[] = [];
  for (const i of secao.itens) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.titulo === i.grupo) ultimo.itens.push(i);
    else grupos.push({ titulo: i.grupo, itens: [i] });
  }
  return (
    <div>
      {secao.ajuda && <p className="mb-2 text-xs leading-snug text-muted">{secao.ajuda}</p>}
      {grupos.map((g, n) => (
        <div key={`${g.titulo ?? ""}-${n}`} className="mb-2">
          {g.titulo && <p className="mb-0.5 mt-2 text-[10px] uppercase tracking-wider text-muted">{g.titulo}</p>}
          <ul className="divide-y divide-border/50">
            {g.itens.map((i) => (
              <LinhaItem key={`${i.tipo}:${i.alvo}`} item={i} xp={xp} desligado={desligado} aoComprar={aoComprar} />
            ))}
          </ul>
        </div>
      ))}
      {secao.itens.length === 0 && !secao.novo && <p className="text-sm text-muted">Nada por aqui.</p>}
      {secao.novo && <FormNovo novo={secao.novo} xp={xp} desligado={desligado} aoComprar={aoComprar} />}
    </div>
  );
}

function LinhaItem({ item: i, xp, desligado, aoComprar }: { item: ItemXp; xp: number; desligado: boolean; aoComprar: (c: CompraXp, nome: string, custo: number, aviso?: string) => void }) {
  // itens que só se listam (especialidade já comprada, ritual conhecido) não têm botão
  if (i.soLeitura) {
    return (
      <li className="flex items-center gap-2 py-1.5 text-sm">
        <span className="min-w-0 flex-1 break-words">{i.nome}</span>
        {i.tipo !== "especialidade" && <span className="shrink-0 tracking-wider text-ambar">{pontos(i.atual)}</span>}
      </li>
    );
  }
  const maximo = i.custo === null && i.atual >= i.max;
  const falta = i.custo !== null && i.custo > xp ? i.custo - xp : 0;
  const motivo = desligado && i.cabe ? "Espere: o mestre está narrando (ou a compra anterior ainda viaja)." : i.motivo;
  const proximo = `${i.nome} ${pontos(i.atual + 1)}`;
  return (
    <li className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm" title={i.nome}>
          {i.nome}
          {i.aviso && (
            <span className="ml-1 text-xs text-ambar" title={i.aviso} aria-label={`Atenção: ${i.aviso}`}>
              ⚠
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm tracking-wider text-ambar" aria-label={`${i.atual} de ${i.max}`}>
          {bolinhas(i.atual, i.max)}
        </span>
        <span className={`w-14 shrink-0 text-right text-xs tabular-nums ${falta ? "text-muted/60" : maximo ? "text-muted" : "text-pergaminho"}`}>
          {maximo ? "máx." : i.custo !== null ? `${i.custo} XP` : "—"}
        </span>
        <span title={motivo ?? `Comprar ${proximo} por ${i.custo} XP`} className="shrink-0">
          <button
            type="button"
            aria-label={i.cabe && !desligado ? `Comprar ${proximo} por ${i.custo} XP` : `Não dá para comprar ${i.nome}: ${motivo ?? ""}`}
            disabled={!i.cabe || desligado}
            onClick={() => i.custo !== null && aoComprar({ tipo: i.tipo, alvo: i.alvo, de: i.atual }, proximo, i.custo, i.aviso)}
            className="grid size-8 place-items-center rounded-full border border-ambar/60 text-base leading-none text-ambar transition hover:bg-ambar/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ambar disabled:cursor-not-allowed disabled:border-border/50 disabled:text-muted/30 disabled:hover:bg-transparent"
          >
            +
          </button>
        </span>
      </div>
      {/* no celular não há tooltip: o motivo de bloqueio que não é "falta XP" aparece por escrito */}
      {i.custo === null && !maximo && i.motivo && <p className="mt-0.5 text-[11px] leading-snug text-muted">{i.motivo}</p>}
      {falta > 0 && <p className="sr-only">Faltam {falta} XP.</p>}
    </li>
  );
}

function FormNovo({ novo, xp, desligado, aoComprar }: { novo: NovoXp; xp: number; desligado: boolean; aoComprar: (c: CompraXp, nome: string, custo: number, aviso?: string) => void }) {
  const [nome, setNome] = useState("");
  const [pericia, setPericia] = useState(() => (novo.tipo === "especialidade" ? (novo.pericias.find((p) => p.pode)?.id ?? "") : ""));
  const [nivel, setNivel] = useState(1);

  const custo = "custoPorNivel" in novo ? novo.custoPorNivel * nivel : novo.custo;
  const falta = custo > xp ? custo - xp : 0;
  const texto = nome.trim();
  const valido = texto.length >= 2 && (novo.tipo !== "especialidade" || Boolean(pericia));
  const rotulo = { especialidade: "Especialidade nova", vantagem: "Vantagem nova", ritual: "Ritual novo", formula: "Fórmula nova" }[novo.tipo];

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || falta || desligado) return;
    if (novo.tipo === "especialidade") {
      const p = novo.pericias.find((x) => x.id === pericia);
      aoComprar({ tipo: "especialidade", alvo: pericia, foco: texto, de: 0 }, `a especialidade ${p?.nome ?? ""} (${texto})`, custo);
    } else if (novo.tipo === "vantagem") {
      aoComprar({ tipo: "vantagem", nome: texto, de: 0 }, `a vantagem ${texto} ●`, custo, "Vantagem nova pede motivo na história. Combine com o mestre.");
    } else {
      aoComprar({ tipo: novo.tipo, nome: texto, nivel }, `${novo.tipo === "ritual" ? "o ritual" : "a fórmula"} ${texto} ${pontos(nivel)}`, custo);
    }
    setNome("");
  }

  return (
    <form onSubmit={enviar} className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs uppercase tracking-wider text-muted">{rotulo}</p>
      {novo.tipo === "especialidade" && (
        <select value={pericia} onChange={(e) => setPericia(e.target.value)} aria-label="Perícia da especialidade" className="campo w-full px-2 py-1.5 text-sm">
          {novo.pericias.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.pode}>
              {p.nome}
              {p.pode ? "" : " (sem espaço)"}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={novo.tipo === "especialidade" ? 40 : 60}
          placeholder={{ especialidade: "foco: sedução, fechaduras, Elísio…", vantagem: "Refúgio, Contatos (polícia), Rebanho…", ritual: "nome do ritual", formula: "nome da fórmula" }[novo.tipo]}
          aria-label={novo.tipo === "especialidade" ? "Foco da especialidade" : `Nome: ${rotulo}`}
          className="campo min-w-0 flex-1 px-2 py-1.5 text-sm"
        />
        {(novo.tipo === "ritual" || novo.tipo === "formula") && (
          <select value={nivel} onChange={(e) => setNivel(Number(e.target.value))} aria-label="Nível" className="campo w-24 shrink-0 px-2 py-1.5 text-sm">
            {Array.from({ length: novo.nivelMax }, (_, n) => n + 1).map((n) => (
              <option key={n} value={n}>
                {pontos(n)} · {n * novo.custoPorNivel}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{falta ? `Faltam ${falta} XP.` : `Custa ${custo} XP.`}</span>
        <button type="submit" disabled={!valido || falta > 0 || desligado} className="btn-borda px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40" title={falta ? `Faltam ${falta} XP` : !valido ? "Preencha o nome" : undefined}>
          Comprar ({custo} XP)
        </button>
      </div>
      {novo.tipo === "especialidade" && !novo.pericias.some((p) => p.pode) && <p className="text-[11px] text-muted">Nenhuma perícia com espaço: cada ponto comporta uma especialidade.</p>}
    </form>
  );
}
