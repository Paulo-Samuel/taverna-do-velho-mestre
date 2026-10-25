import "server-only";
import { obterSistema, SISTEMAS } from "./sistemas";
import type { EntradaCriacao, Ficha, Sistema } from "./sistemas/tipos";

// Contrato do formulário de personagem (components/ficha/formulario-personagem.tsx) com as server actions.
// Campos do FormData:
//   sistema, nome, ancestralidade, classe, antecedente, metodo, historia, jogador
//   attr_<idAtributo>   valor de cada atributo (todos vazios = o sistema sugere pelo método)
//   pericias            uma entrada por perícia escolhida (ids), além das que a classe já dá
//   extra_<idOpcao>     resposta de cada Sistema.opcoesCriacao (escolha/texto: 1 valor; multipla/lista-texto: vários)
// Só no modo campanha (lidos por app/nova/acoes.ts, não por fichaDoFormulario):
//   campanha, cenario, tom, modo_mesa ("livre" | "rodada"), pin, adicionar_mais ("1" = não começar ainda)

export type ResultadoFormulario = { ok: true; sistema: Sistema; ficha: Ficha; jogador: string } | { ok: false; erro: string };

const texto = (form: FormData, campo: string, max: number) => String(form.get(campo) ?? "").trim().slice(0, max);

export function fichaDoFormulario(form: FormData, sistemaFixo?: string): ResultadoFormulario {
  const sistemaId = sistemaFixo ?? String(form.get("sistema") ?? "");
  // obterSistema cai no padrão com id desconhecido; aqui isso criaria a ficha no sistema errado
  if (!SISTEMAS.some((s) => s.id === sistemaId)) return { ok: false, erro: "Escolha um sistema de regras." };
  const sistema = obterSistema(sistemaId);
  if (!sistema.pronto) return { ok: false, erro: `${sistema.nome} ainda está em construção.` };

  const nome = texto(form, "nome", 60);
  if (!nome) return { ok: false, erro: "Seu personagem precisa de um nome." };

  const ancestralidade = String(form.get("ancestralidade") ?? "");
  if (sistema.ancestralidades.length && !sistema.ancestralidades.some((a) => a.id === ancestralidade)) {
    return { ok: false, erro: `Escolha ${sistema.rotulos.ancestralidade.toLowerCase()}.` };
  }
  const classe = String(form.get("classe") ?? "");
  if (sistema.classes.length && !sistema.classes.some((c) => c.id === classe)) {
    return { ok: false, erro: `Escolha ${sistema.rotulos.classe.toLowerCase()}.` };
  }
  const antecedente = String(form.get("antecedente") ?? "") || undefined;
  if (antecedente && !sistema.antecedentes?.some((a) => a.id === antecedente)) {
    return { ok: false, erro: `${sistema.rotulos.antecedente ?? "Antecedente"} desconhecido.` };
  }

  const metodoPedido = String(form.get("metodo") ?? "");
  const metodo = sistema.metodosAtributos.some((m) => m.id === metodoPedido) ? metodoPedido : (sistema.metodosAtributos[0]?.id ?? "padrao");
  let atributos: Record<string, number> | undefined;
  const informados = sistema.atributos.map((a) => [a, String(form.get(`attr_${a.id}`) ?? "").trim()] as const);
  if (informados.length && informados.every(([, v]) => v !== "")) {
    atributos = {};
    const { min, max } = sistema.limitesAtributos;
    for (const [a, v] of informados) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) return { ok: false, erro: `Valor inválido para ${a.abrev || a.nome} (${min} a ${max}).` };
      atributos[a.id] = n;
    }
  } else if (informados.length) {
    atributos = sistema.atributosIniciais(classe, metodo);
  }

  // perícias da classe já vêm de graça: não contam no limite
  const daClasse = new Set(sistema.classes.find((c) => c.id === classe)?.pericias ?? []);
  const validas = new Set(sistema.pericias.map((p) => p.id));
  const limitePericias = sistema.periciasEscolhiveis ?? 0;
  const pericias =
    limitePericias > 0
      ? [...new Set(form.getAll("pericias").map(String))].filter((p) => validas.has(p) && !daClasse.has(p)).slice(0, limitePericias)
      : [];

  const extras: Record<string, unknown> = {};
  for (const opcao of sistema.opcoesCriacao ?? []) {
    if (opcao.classes?.length && !opcao.classes.includes(classe)) continue;
    if (opcao.ancestralidades?.length && !opcao.ancestralidades.includes(ancestralidade)) continue;
    let valores = [...new Set(form.getAll(`extra_${opcao.id}`).map((v) => String(v).trim().slice(0, 240)).filter(Boolean))];
    // escolhas fechadas só aceitam ids da lista (e só itens da ancestralidade escolhida)
    if ((opcao.tipo === "escolha" || opcao.tipo === "multipla") && opcao.opcoes?.length) {
      const doPersonagem = opcao.opcoes.filter((o) => !o.ancestralidades?.length || o.ancestralidades.includes(ancestralidade));
      // obrigatória sem nenhum item possível para esta ancestralidade não trava a criação
      if (!doPersonagem.length) continue;
      const ids = new Set(doPersonagem.map((o) => o.id));
      valores = valores.filter((v) => ids.has(v));
    }
    if (opcao.obrigatoria && !valores.length) return { ok: false, erro: `Preencha: ${opcao.rotulo}.` };
    if (!valores.length) continue;
    extras[opcao.id] = opcao.tipo === "multipla" || opcao.tipo === "lista-texto" ? valores.slice(0, opcao.max ?? valores.length) : valores[0];
  }

  const entrada: EntradaCriacao = {
    nome,
    ancestralidade,
    classe,
    antecedente,
    atributos,
    pericias,
    historia: texto(form, "historia", 2000),
    extras,
  };
  try {
    const ficha = sistema.criarFicha(entrada);
    return { ok: true, sistema, ficha, jogador: texto(form, "jogador", 40) };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
