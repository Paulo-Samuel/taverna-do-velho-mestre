import "server-only";
import type { Ficha } from "@/lib/sistemas/tipos";
import { historia } from "@/lib/sistemas/historia";
import { gerarRetrato, normalizarRetrato } from "../retrato/dados";

// Lê o formulário da criação do modo história (criacao-historia.tsx) e monta a ficha do sistema "historia". Serve às duas
// server actions: a que abre uma mesa nova (app/nova/historia-acoes.ts) e a que senta mais um herói numa mesa que já
// existe (app/mesa/[id]/personagens/acoes.ts). Só no servidor: o sistema importa "server-only".

const SEXOS = ["homem", "mulher", "outro"] as const;
type Sexo = (typeof SEXOS)[number];

export type ResultadoFichaHistoria = { ok: true; ficha: Ficha; jogador: string } | { ok: false; erro: string };

/** Um campo de texto do formulário, sem espaços repetidos e no tamanho certo. */
export function textoDoFormulario(form: FormData, campo: string, max: number): string {
  return String(form.get(campo) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Nome, sexo, origem, ofício, aparência, história e retrato viram uma ficha do modo história (ou um erro em português). */
export function fichaHistoriaDoFormulario(form: FormData): ResultadoFichaHistoria {
  const nome = textoDoFormulario(form, "nome", 40);
  if (nome.length < 2) return { ok: false, erro: "Todo herói tem nome. Até os que morrem na primeira cena." };

  const ancestralidade = textoDoFormulario(form, "origem", 30);
  if (!historia.ancestralidades.some((a) => a.id === ancestralidade)) return { ok: false, erro: "Escolha de onde vem seu sangue (a origem)." };

  const classe = textoDoFormulario(form, "classe", 30);
  if (!historia.classes.some((c) => c.id === classe)) return { ok: false, erro: "Escolha um ofício. Desocupado a taverna já tem demais." };

  const sexo = textoDoFormulario(form, "sexo", 10);
  if (!(SEXOS as readonly string[]).includes(sexo)) return { ok: false, erro: "Diga como você é (homem, mulher ou outro)." };

  const aparencia = textoDoFormulario(form, "aparencia", 200);
  // a história guarda as quebras de linha; o resto dos campos não precisa
  const passado = String(form.get("historia") ?? "")
    .trim()
    .slice(0, 1500);

  let retrato = null;
  try {
    retrato = normalizarRetrato(JSON.parse(String(form.get("retrato") ?? "null")));
  } catch {
    retrato = null;
  }
  // o rosto escolhido veste o ofício escolhido; sem rosto, a taverna pinta um pelo nome
  retrato = retrato ? { ...retrato, sexo: sexo as Sexo, origem: ancestralidade } : gerarRetrato(nome, { sexo, origem: ancestralidade, classe });

  const ficha = historia.criarFicha({
    nome,
    ancestralidade,
    classe,
    historia: passado,
    extras: { sexo, ...(aparencia ? { aparencia } : {}), retrato },
  });
  return { ok: true, ficha, jogador: textoDoFormulario(form, "jogador", 40) };
}
