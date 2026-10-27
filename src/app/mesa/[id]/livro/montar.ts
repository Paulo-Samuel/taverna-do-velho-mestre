import "server-only";
import { listarDiario, listarFatos, listarMensagens, listarPersonagens, obterCampanha, type Campanha, type Mensagem, type Personagem } from "@/lib/db";
import { obterSistema } from "@/lib/sistemas";
import type { EntradaDiario, Sistema } from "@/lib/sistemas/tipos";

// Monta a campanha inteira como um livro (página /mesa/[id]/livro e o Markdown de /api/campanhas/[id]/livro):
// capítulos quebrados pelos cabeçalhos de cena (mensagens "dado" com tipo "cena_titulo"), narração em prosa, ações dos
// jogadores com o nome, rolagens como notas pequenas. Fica de fora o que é interno: falas ((fora do jogo)), rolagens
// secretas do mestre, testes ainda pendentes ou cancelados e os registros de ficha/diário/combate.

export type Bloco =
  | { tipo: "narracao"; id: number; texto: string }
  | { tipo: "acao"; id: number; nome: string; autor: string | null; texto: string }
  | { tipo: "nota"; id: number; texto: string }
  | { tipo: "sistema"; id: number; texto: string };

export type Capitulo = { numero: number; titulo: string | null; local: string | null; momento: string | null; blocos: Bloco[] };

export type FichaResumo = {
  id: number;
  nome: string;
  /** "Humano · Guerreiro · nível 3" */
  linha: string;
  vida: string | null;
  atributos: string | null;
  inventario: string[];
  condicoes: string[];
  historia: string;
  jogador: string;
  /** para o retrato */
  ficha: Pick<Personagem["ficha"], "nome" | "classe" | "extras">;
};

export type Livro = {
  campanha: Pick<Campanha, "id" | "nome" | "cenario" | "tom" | "resumo" | "criadaEm" | "atualizadaEm">;
  historia: boolean;
  sistema: { id: string; nome: string; nomeCurto: string };
  fichas: FichaResumo[];
  capitulos: Capitulo[];
  missoes: EntradaDiario[];
  pessoas: EntradaDiario[];
  lugares: EntradaDiario[];
  outros: EntradaDiario[];
  /** fatos fixados pelo jogador, na ordem da lista */
  fatos: string[];
};

/** Nota de rolagem para a margem, ou null quando é coisa interna. */
function notaDoDado(m: Mensagem): string | null {
  const d = (m.dados ?? {}) as Record<string, unknown>;
  if (d.tipo === "rolagem") return d.secreta ? null : m.texto;
  if (d.tipo === "teste") return m.texto;
  if (d.tipo === "pedido_teste") return d.status === "resolvido" ? m.texto : null;
  if (d.tipo === "xp" && typeof d.resumo === "string") return d.resumo;
  return null;
}

function resumirFicha(sistema: Sistema, p: Personagem): FichaResumo {
  const f = p.ficha;
  const anc = sistema.ancestralidades.find((a) => a.id === f.ancestralidade)?.nome ?? (f.ancestralidade || null);
  const cls = sistema.classes.find((c) => c.id === f.classe)?.nome ?? (f.classe || null);
  const linha = [anc, cls, f.nivel ? `${sistema.rotulos.nivel.toLowerCase()} ${f.nivel}` : null].filter(Boolean).join(" · ");
  const atributos = sistema.atributos
    .filter((a) => typeof f.atributos?.[a.id] === "number")
    .map((a) => `${a.abrev} ${f.atributos[a.id]}`)
    .join(" · ");
  return {
    id: p.id,
    nome: f.nome,
    linha,
    vida: f.pvMax > 0 ? `${sistema.rotulos.pv} ${f.pv}/${f.pvMax}` : null,
    atributos: atributos || null,
    inventario: (f.inventario ?? []).slice(0, 12),
    condicoes: f.condicoes ?? [],
    historia: (f.historia ?? "").trim(),
    jogador: p.jogador,
    ficha: { nome: f.nome, classe: f.classe, extras: f.extras ?? {} },
  };
}

export function montarLivro(campanhaId: number): Livro | null {
  const c = obterCampanha(campanhaId);
  if (!c) return null;
  const sistema = obterSistema(c.sistema);
  const personagens = listarPersonagens(c.id);
  const nomeDe = (id: number | null) => personagens.find((p) => p.id === id)?.ficha.nome ?? null;

  const capitulos: Capitulo[] = [];
  let atual: Capitulo = { numero: 1, titulo: null, local: null, momento: null, blocos: [] };
  const abrir = (titulo: string | null, local: string | null, momento: string | null) => {
    // capítulo ainda vazio (ex.: o título da primeira cena logo na abertura) só ganha o nome
    if (!atual.blocos.some((b) => b.tipo === "narracao" || b.tipo === "acao")) {
      Object.assign(atual, { titulo, local, momento });
      return;
    }
    capitulos.push(atual);
    atual = { numero: atual.numero + 1, titulo, local, momento, blocos: [] };
  };

  for (const m of listarMensagens(c.id)) {
    if (m.tipo === "mestre") {
      if (m.texto.trim()) atual.blocos.push({ tipo: "narracao", id: m.id, texto: m.texto.trim() });
    } else if (m.tipo === "jogador") {
      const texto = m.texto.trim();
      if (!texto || texto.startsWith("((")) continue;
      atual.blocos.push({ tipo: "acao", id: m.id, nome: nomeDe(m.personagemId) ?? m.autor ?? "Alguém", autor: m.autor, texto });
    } else if (m.tipo === "dado") {
      const d = (m.dados ?? {}) as Record<string, unknown>;
      if (d.tipo === "cena_titulo") {
        const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
        abrir(s(d.titulo), s(d.local), s(d.momento));
        continue;
      }
      const nota = notaDoDado(m);
      if (nota) atual.blocos.push({ tipo: "nota", id: m.id, texto: nota });
    } else if (m.texto.trim()) {
      atual.blocos.push({ tipo: "sistema", id: m.id, texto: m.texto.trim() });
    }
  }
  if (atual.blocos.length || !capitulos.length) capitulos.push(atual);

  const diario = listarDiario(c.id);
  return {
    campanha: { id: c.id, nome: c.nome, cenario: c.cenario, tom: c.tom, resumo: c.resumo, criadaEm: c.criadaEm, atualizadaEm: c.atualizadaEm },
    historia: (c.config.modoJogo ?? "avancado") === "historia",
    sistema: { id: sistema.id, nome: sistema.nome, nomeCurto: sistema.nomeCurto },
    fichas: personagens.map((p) => resumirFicha(sistema, p)),
    capitulos,
    missoes: diario.filter((e) => e.tipo === "missao"),
    pessoas: diario.filter((e) => e.tipo === "npc"),
    lugares: diario.filter((e) => e.tipo === "local"),
    outros: diario.filter((e) => e.tipo === "item" || e.tipo === "nota"),
    fatos: listarFatos(c.id).map((f) => f.texto),
  };
}

const ROMANOS: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function romano(n: number): string {
  let r = "";
  for (const [v, s] of ROMANOS)
    while (n >= v) {
      r += s;
      n -= v;
    }
  return r;
}

/** "Capítulo III — Salão Comum" */
export function tituloDoCapitulo(c: Capitulo): string {
  return c.titulo ?? c.local ?? (c.numero === 1 ? "Prólogo" : `Capítulo ${romano(c.numero)}`);
}

/** Missão concluída/falhou ou em aberto, para o rótulo. */
export function statusDaMissao(status: string): string {
  if (/conclu/i.test(status)) return "concluída";
  if (/falh/i.test(status)) return "falhou";
  return "em aberto";
}

/** Data do SQLite (UTC) por extenso: "25 de outubro de 2026". */
export function dataPorExtenso(dataSqlite: string): string {
  return new Date(dataSqlite.replace(" ", "T") + "Z").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

// ---------- Markdown ----------

function entradaMd(e: EntradaDiario, extra = ""): string {
  return `- **${e.titulo}**${extra}${e.texto ? ` — ${e.texto.replace(/\s*\n+\s*/g, " ")}` : ""}`;
}

export function livroEmMarkdown(l: Livro): string {
  const linhas: string[] = [];
  linhas.push(`# ${l.campanha.nome}`, "");
  linhas.push(`*${l.historia ? "Modo história" : l.sistema.nome} · de ${dataPorExtenso(l.campanha.criadaEm)} a ${dataPorExtenso(l.campanha.atualizadaEm)}*`, "");
  if (l.campanha.cenario) linhas.push(`> ${l.campanha.cenario.replace(/\n+/g, "\n> ")}`, "");
  if (l.fichas.length) linhas.push(`**Personagens:** ${l.fichas.map((f) => (f.linha ? `${f.nome} (${f.linha})` : f.nome)).join(", ")}`, "");

  for (const c of l.capitulos) {
    linhas.push("---", "", `## ${c.numero === 1 && !c.titulo && !c.local ? "Prólogo" : `Capítulo ${romano(c.numero)}`}${c.titulo || c.local ? ` — ${tituloDoCapitulo(c)}` : ""}`, "");
    const onde = [c.titulo ? c.local : null, c.momento].filter(Boolean).join(" · ");
    if (onde) linhas.push(`*${onde}*`, "");
    for (const b of c.blocos) {
      if (b.tipo === "narracao") linhas.push(b.texto.replace(/^#{1,6}\s+/gm, ""), "");
      else if (b.tipo === "acao") linhas.push(`> **${b.nome}:** *${b.texto.replace(/\*/g, "").replace(/\n+/g, " ")}*`, "");
      else if (b.tipo === "nota") linhas.push(`<sub>🎲 ${b.texto}</sub>`, "");
      else linhas.push(`*✦ ${b.texto} ✦*`, "");
    }
  }

  if (l.fichas.length) {
    linhas.push("---", "", "## Fichas", "");
    for (const f of l.fichas) {
      linhas.push(`### ${f.nome}`, "");
      if (f.linha) linhas.push(`*${f.linha}*${f.jogador ? ` · jogado por ${f.jogador}` : ""}`, "");
      const dados = [f.vida, f.atributos].filter(Boolean).join(" · ");
      if (dados) linhas.push(dados, "");
      if (f.condicoes.length) linhas.push(`**Condições:** ${f.condicoes.join(", ")}`, "");
      if (f.inventario.length) linhas.push(`**Inventário:** ${f.inventario.join(", ")}`, "");
      if (f.historia) linhas.push(f.historia, "");
    }
  }

  const secao = (titulo: string, itens: EntradaDiario[], extra?: (e: EntradaDiario) => string) => {
    if (!itens.length) return;
    linhas.push(`### ${titulo}`, "", ...itens.map((e) => entradaMd(e, extra?.(e) ?? "")), "");
  };
  if (l.missoes.length + l.pessoas.length + l.lugares.length + l.outros.length + l.fatos.length) {
    linhas.push("---", "", "## Diário", "");
    secao("Missões", l.missoes, (e) => ` *(${statusDaMissao(e.status)})*`);
    secao("Pessoas", l.pessoas, (e) => (e.status ? ` *(${e.status})*` : ""));
    secao("Lugares", l.lugares);
    secao("Notas e itens", l.outros);
    if (l.fatos.length) linhas.push("### Fatos fixados", "", ...l.fatos.map((f) => `- 📌 ${f}`), "");
  }
  linhas.push("---", "", "*Escrito na Taverna do Velho Mestre. Os personagens são IA; as desculpas pelas rolagens ruins são de vocês.*", "");
  return linhas.join("\n");
}

/** Nome de arquivo seguro a partir do nome da campanha: "A Cripta do Bode (teste)" → "a-cripta-do-bode-teste.md". */
export function nomeDoArquivo(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "campanha"}.md`;
}
