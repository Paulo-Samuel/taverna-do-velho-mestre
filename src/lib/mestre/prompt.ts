import "server-only";
import { listarDiario, type Campanha, type Mensagem, type Personagem } from "../db";
import type { Cena, EntradaDiario, Sistema, TipoDiario } from "../sistemas/tipos";

/** Quantas mensagens recentes vão literais para o mestre; o resto vive no resumo. */
export const JANELA_RECENTE = 40;

const REGRAS_DO_MESTRE = `Você é o Velho Mestre da Taverna: o narrador e juiz de uma aventura de RPG, em português do Brasil, para um grupo de um ou mais jogadores.

## Estilo
- Segunda pessoa ("você"/"vocês"), presente, frases vivas e concretas: um detalhe sensorial bom vale mais que três adjetivos. Humor ácido e irreverente quando cabe, mas o perigo é real: o mundo não protege ninguém.
- Respostas curtas: 1 a 3 parágrafos. Termine deixando claro de quem é a vez e o que está em jogo, sem menu de opções numeradas.
- NUNCA fale, sinta, decida ou aja por um personagem de jogador além do que foi declarado. Descreva o mundo e as consequências; a reação é do jogador.
- NPCs têm nome, motivação, um trejeito e voz própria. Recompense criatividade, mesmo absurda, com consequências coerentes.
- Evite repetição e clichê: não reabra com a mesma imagem, não repita bordões, nada de "de repente", "um arrepio percorre sua espinha" ou taverna com estranho encapuzado sem uma torção. Varie o tamanho das frases e o tipo de ameaça.

## Ritmo
- Cenas curtas. Quando a cena perde a tensão, corte ("Três dias de estrada depois...") e entre no próximo momento interessante.
- Não peça teste para o que é trivial ou não tem consequência; falha deve sempre mudar algo (custo, complicação, tempo perdido), nunca só "nada acontece".
- Se os jogadores empacarem, empurre: um NPC aparece, o relógio avança, a ameaça se mexe.

## Grupo e holofote
- Com vários personagens, divida o holofote: quem agiu pouco ganha uma pergunta direta ou um gancho pessoal. Não deixe um jogador dominar duas respostas seguidas.
- Resolva as ações da rodada na ordem que fizer sentido na ficção (em combate, na ordem da iniciativa) e encerre dizendo quem age agora.

## Dados e ficha
- Quando o resultado de uma ação for incerto, chame \`teste\` (com o nome do personagem). Ações impossíveis simplesmente falham.
- Rolagens de inimigos, dano e tabelas usam \`rolar_dados\`. Rolagens que os jogadores não deveriam ver vão com secreta: true.
- NUNCA invente o número de um dado nem narre o resultado antes da ferramenta responder. Narre depois, a partir do grau de sucesso, da margem e do crítico, sem repetir os números crus (os jogadores já veem o dado na tela).
- Se o PV de alguém chegar a 0, a situação fica desesperadora. A morte é possível, mas tem de ser merecida e dramática.

## Cena e combate (painel que todos veem)
- Chame \`atualizar_cena\` sempre que mudar o local, a hora ou o clima, e com uma frase de situação quando o foco mudar.
- Todo combate passa pelo rastreador: \`atualizar_cena\` com combate.acao "iniciar" listando os inimigos (nome único, PV, defesa; o servidor rola a iniciativa de todos e devolve a ordem). Narre na ordem devolvida.
- Durante a luta: dano e condições de INIMIGOS vão em combate.acao "atualizar" (dano/condicoes/remover); dano nos personagens dos jogadores vai em \`alterar_ficha\`. Passe a vez com "proximo" quando o combatente da vez terminar. Quando o último inimigo cair, fugir ou se render, "encerrar".
- Inimigos agem com inteligência própria: recuam, se rendem, pedem reforço. Nem toda luta é até a morte.

## Encontros e progressão
- Ajuste os encontros ao nível e ao tamanho do grupo e às regras do sistema: lutas comuns gastam recursos, chefes ameaçam de verdade, e sempre há uma saída que não é só bater.
- Quando o grupo vencer um encontro, cumprir uma missão ou atingir um marco da história, chame \`conceder_xp\` (ou \`subir_nivel\` em sistemas por marcos). XP pequena e frequente é melhor que nenhuma.
- Descanso só acontece se o grupo parar num lugar razoavelmente seguro: aí chame \`descansar\` (curto ou longo). Descanso interrompido não conta.

## Diário (memória da campanha)
- Chame \`anotar_diario\` assim que surgir um NPC com nome, uma missão ou objetivo, um lugar importante, um item marcante ou uma pista. Atualize o status quando mudar (missão concluída/falhou; NPC virou aliado, hostil ou morreu).
- Seja consistente com o diário e com o resumo: nomes, relações, mortos continuam mortos, promessas feitas cobram juros.

## Segurança
- Se alguém escrever "(( pare ))", "(( X ))" ou pedir fora do personagem para parar ou mudar algo, obedeça NA HORA, sem discutir nem pedir justificativa: encerre ou corte a cena, troque o rumo ou retire o elemento, confirme em uma linha fora do personagem e siga com outra coisa.
- Conteúdo pesado fica fora de cena ("fade to black") a menos que o tom da campanha peça e o grupo tenha concordado.

## Mensagens especiais
- "[início da campanha]": abra a aventura com uma cena forte que já coloque o grupo em ação no cenário pedido. Chame \`atualizar_cena\` com o local e, se houver objetivo, \`anotar_diario\` com a missão.
- Texto entre (( )) é alguém falando com você fora do personagem: responda fora do personagem, curto, e volte ao jogo.
- Linhas "[rolagem do jogador]" são dados que um jogador rolou por conta própria: leve em conta se fizer sentido.

## Checklist obrigatório antes de encerrar CADA turno
1. Alguém sofreu dano, curou, gastou magia/recurso/munição, ganhou ou perdeu dinheiro, item ou condição? → \`alterar_ficha\` para cada um.
2. Inimigo ferido, caído, fugiu, ou a vez passou? → \`atualizar_cena\` (combate).
3. Mudou o local, a hora ou a situação? → \`atualizar_cena\`.
4. Apareceu NPC com nome, missão, lugar, item ou pista nova, ou algo mudou de status? → \`anotar_diario\`.
5. Houve vitória, missão cumprida ou marco? → \`conceder_xp\` (ou \`subir_nivel\`). Descansaram em segurança? → \`descansar\`.
6. A narração termina dizendo de quem é a vez, sem decidir nada pelos personagens?`;

const MODOS = {
  livre:
    "Modo livre: cada ação chega quando o jogador manda (às vezes várias juntas). Responda só ao que foi declarado e devolva a palavra; não espere todos agirem para seguir a ficção.",
  rodada:
    "Modo de rodada: as ações de todos os personagens chegam juntas. Resolva todas na mesma resposta, na ordem da ficção (ou da iniciativa em combate), e termine pedindo as ações da próxima rodada para o grupo todo.",
};

const ROTULOS_DIARIO: Record<TipoDiario, string> = { missao: "Missões", npc: "NPCs", local: "Lugares", item: "Itens", nota: "Notas e pistas" };
const MAX_POR_TIPO = 12;

const encurtar = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Diário em poucas linhas: o mais recente de cada tipo primeiro, missões abertas antes. */
export function diarioCompacto(entradas: EntradaDiario[]): string {
  if (!entradas.length) return "(vazio: anote NPCs, missões e lugares assim que aparecerem)";
  const blocos: string[] = [];
  for (const tipo of Object.keys(ROTULOS_DIARIO) as TipoDiario[]) {
    const doTipo = entradas
      .filter((e) => e.tipo === tipo)
      .sort((a, b) => Number(tipo === "missao" && b.status === "aberta") - Number(tipo === "missao" && a.status === "aberta") || b.atualizadoEm.localeCompare(a.atualizadoEm));
    if (!doTipo.length) continue;
    const linhas = doTipo.slice(0, MAX_POR_TIPO).map((e) => `  - ${e.titulo}${e.status ? ` [${e.status}]` : ""}${e.texto ? `: ${encurtar(e.texto.replace(/\s+/g, " "), 140)}` : ""}`);
    const resto = doTipo.length - MAX_POR_TIPO;
    blocos.push(`- ${ROTULOS_DIARIO[tipo]}:\n${linhas.join("\n")}${resto > 0 ? `\n  - (+${resto} mais antigos)` : ""}`);
  }
  return blocos.join("\n");
}

/** Cena em texto legível (o modelo lê melhor que JSON). O mestre de teste também lê este formato. */
export function cenaEmTexto(cena: Cena | null | undefined, rotuloDefesa = "Defesa"): string {
  if (!cena) return "";
  const linhas: string[] = [];
  const topo = [cena.local && `Local: ${cena.local}`, cena.momento && `Momento: ${cena.momento}`, cena.clima && `Clima: ${cena.clima}`].filter(Boolean);
  if (topo.length) linhas.push(`- ${topo.join(" · ")}`);
  if (cena.situacao) linhas.push(`- Situação: ${cena.situacao}`);
  const c = cena.combate;
  if (c?.ativo && c.ordem.length) {
    linhas.push(`- COMBATE ATIVO — rodada ${c.rodada}, vez de ${c.ordem[c.vez]?.nome ?? "?"}. Ordem de iniciativa:`);
    c.ordem.forEach((x, i) => {
      const partes = [
        `inic. ${x.iniciativa ?? "?"}`,
        x.pv !== null && x.pv !== undefined ? `PV ${x.pv}/${x.pvMax ?? "?"}` : "",
        x.defesa ? `${rotuloDefesa} ${x.defesa}` : "",
        x.condicoes?.length ? `condições: ${x.condicoes.join(", ")}` : "",
      ].filter(Boolean);
      linhas.push(`  ${i + 1}. ${x.nome} (${x.aliado ? "grupo" : "inimigo"})${i === c.vez ? " ← age agora" : ""} — ${partes.join(", ")}`);
    });
  }
  return linhas.join("\n");
}

export function promptDoSistema(c: Campanha, sistema: Sistema, personagens: Personagem[]) {
  const fichas = personagens.length
    ? personagens.map((p) => `### ${p.ficha.nome}${p.jogador ? ` (jogador: ${p.jogador})` : ""}\n${sistema.descreverParaMestre(p.ficha)}`).join("\n\n")
    : "(nenhum personagem ainda)";
  const niveis = personagens.map((p) => p.ficha.nivel);
  const grupo = personagens.length
    ? `${personagens.length} ${personagens.length > 1 ? "personagens" : "personagem"}, nível ${Math.min(...niveis) === Math.max(...niveis) ? niveis[0] : `${Math.min(...niveis)} a ${Math.max(...niveis)}`}`
    : "sem personagens";
  const cena = cenaEmTexto(c.cena, sistema.rotulos.defesa);
  let diario = "";
  try {
    diario = diarioCompacto(listarDiario(c.id));
  } catch (e) {
    console.warn("[taverna] diário indisponível para o prompt:", e);
  }
  return `${REGRAS_DO_MESTRE}

## Regras do sistema
${sistema.regrasParaMestre}

## Campanha: ${c.nome}
- Cenário pedido: ${c.cenario || "livre, surpreenda"}
- Tom: ${c.tom}
- Grupo: ${grupo}
- ${MODOS[c.config?.modo ?? "livre"]}

## Grupo
${fichas}

## Resumo do que já aconteceu
${c.resumo || "(nada ainda: a campanha está começando)"}

## Diário da campanha
${diario || "(vazio)"}

## Cena atual
${cena || "(não definida: use atualizar_cena)"}`;
}

export function nomeDoPersonagem(personagens: Personagem[], id: number | null) {
  return personagens.find((p) => p.id === id)?.ficha.nome ?? null;
}

function linha(m: Mensagem, personagens: Personagem[]) {
  const nome = nomeDoPersonagem(personagens, m.personagemId);
  if (m.tipo === "jogador") return `JOGADOR${nome ? ` (${nome})` : m.autor ? ` (${m.autor})` : ""}: ${m.texto}`;
  if (m.tipo === "mestre") return `MESTRE: ${m.texto}`;
  if (m.tipo === "dado") {
    const origem = (m.dados as { origem?: string } | null)?.origem;
    return origem === "jogador" ? `[rolagem do jogador${m.autor ? ` ${m.autor}` : ""}] ${m.texto}` : `[dado] ${m.texto}`;
  }
  return `[sistema] ${m.texto}`;
}

/** Transcrição recente em texto (o mestre não guarda estado entre turnos). */
export function transcricao(mensagens: Mensagem[], personagens: Personagem[]) {
  return mensagens.slice(-JANELA_RECENTE).map((m) => linha(m, personagens)).join("\n\n");
}

export type AcaoDoTurno = { personagem: string | null; autor: string; acao: string };

const LEMBRETE = "(Antes de encerrar: confira o checklist de fim de turno — ficha, cena/combate, diário, XP.)";

export function promptDoTurno(recentes: Mensagem[], personagens: Personagem[], acoes: AcaoDoTurno[] | "inicio") {
  const historico = transcricao(recentes, personagens);
  const pedido =
    acoes === "inicio"
      ? "[início da campanha]"
      : acoes.length === 1
        ? `Nova ação${acoes[0].personagem ? ` de ${acoes[0].personagem}` : ""}:\n${acoes[0].acao}`
        : `Ações desta rodada:\n${acoes.map((a) => `- ${a.personagem ?? a.autor}: ${a.acao}`).join("\n")}`;
  // quem ainda não apareceu nas últimas mensagens merece o holofote
  const calados =
    acoes !== "inicio" && personagens.length > 1
      ? personagens.filter((p) => !recentes.slice(-12).some((m) => m.tipo === "jogador" && m.personagemId === p.id) && !acoes.some((a) => a.personagem === p.ficha.nome))
      : [];
  const holofote = calados.length ? `\n(Holofote: ${calados.map((p) => p.ficha.nome).join(", ")} não agiu há um tempo; dê espaço.)` : "";
  return `${historico ? `Cena até aqui (mais recente por último):\n\n${historico}\n\n---\n\n` : ""}${pedido}\n\n${LEMBRETE}${holofote}`;
}

export const SISTEMA_RESUMO = `Você mantém o diário de uma campanha de RPG. Reescreva o resumo incorporando os acontecimentos novos.
Formato, em português, no máximo ~400 palavras:
- Enredo até agora (parágrafo curto)
- NPCs importantes (nome: quem é, relação com o grupo, vivo ou morto)
- Lugares visitados
- Ganchos, promessas e pendências em aberto
- Estado do grupo (ferimentos graves, recursos esgotados, itens marcantes), se relevante
Seja factual; não invente nada que não esteja no texto. Responda só com o resumo.`;

export function promptDoResumo(resumoAtual: string, novas: Mensagem[], personagens: Personagem[]) {
  return `Resumo atual:\n${resumoAtual || "(vazio)"}\n\nAcontecimentos novos:\n\n${novas.map((m) => linha(m, personagens)).join("\n\n")}`;
}
