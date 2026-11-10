import { COR_GRAU, NOME_GRAU } from "./cores";
import { descricaoDoTeste, tipoDoTeste } from "./tipo-teste";

// G17: a jogada como conversa. Dado o teste que uma ação virou, decide os selos que aparecem embaixo dela:
// chip da perícia (cor do tipo de teste), selo do grau e, só em d20, o selo de dado natural (1 ou 20).
// Módulo puro (sem React): o desenho fica em selos-da-acao.tsx; testes em tests/selo-desfecho.test.ts.

export type EntradaSelo = {
  /** nome do teste/perícia, como o mestre escreveu ("Acrobacia") */
  teste: string;
  /** grau do resultado; null enquanto o dado ainda não caiu */
  grau: string | null;
  /** face que saiu no dado principal, quando gravada */
  natural?: number | null;
  /** o teste foi rolado em d20 (só aí 1 e 20 naturais significam algo) */
  d20?: boolean;
};

export type SeloDesfecho = {
  chip: { texto: string; classe: string | null; titulo: string | null };
  grau: { texto: string; cor: string | null; rolando: boolean; critico: boolean };
  natural: { valor: 1 | 20; texto: string; icone: "skull" | "sparkle"; cor: string } | null;
  /** frase completa para leitor de tela */
  leitor: string;
};

const CRITICOS = new Set(["sucesso_critico", "falha_critica"]);

export function seloDoDesfecho(e: EntradaSelo): SeloDesfecho {
  const info = tipoDoTeste(e.teste);
  const chip: SeloDesfecho["chip"] = {
    texto: e.teste,
    classe: info?.classe ?? null,
    titulo: info ? (info.tipo === "semrolagem" ? info.rotulo : `Teste ${info.rotulo.toLowerCase()}`) : null,
  };

  const grau: SeloDesfecho["grau"] =
    e.grau === null
      ? { texto: "rolando…", cor: null, rolando: true, critico: false }
      : { texto: NOME_GRAU[e.grau] ?? e.grau, cor: COR_GRAU[e.grau] ?? null, rolando: false, critico: CRITICOS.has(e.grau) };

  // em d100, parada de d10, Fate e 2d6 o 1 e o 20 não querem dizer a mesma coisa: o selo natural é só do d20
  let natural: SeloDesfecho["natural"] = null;
  if (e.d20 === true && e.grau !== null) {
    if (e.natural === 20) natural = { valor: 20, texto: "20 natural", icone: "sparkle", cor: "var(--critico, #f5c542)" };
    else if (e.natural === 1) natural = { valor: 1, texto: "1 natural", icone: "skull", cor: COR_GRAU.falha_critica };
  }

  let leitor = `${descricaoDoTeste(e.teste, info)}: ${grau.rolando ? "rolando" : grau.texto.toLowerCase()}`;
  if (natural) leitor += `, ${natural.texto}`;

  return { chip, grau, natural, leitor };
}
