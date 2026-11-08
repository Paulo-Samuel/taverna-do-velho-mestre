import "server-only";
import { listarDiario, listarFatos, listarMensagens, mensagensDepois, obterCampanha, type Campanha, type Mensagem, type Personagem } from "../db";
import { lembretesDoTurno } from "./muletas";
import { quantosEntram } from "../../components/fatos/limites";
import type { Cena, EntradaDiario, Ficha, Sistema, TipoDiario } from "../sistemas/tipos";
import { DIFICULDADES, dificuldadeDe, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, TAMANHOS, tamanhoDe } from "./estilo";
import { jogadorRolaOsDados } from "./ferramentas";
import { JANELA_RECENTE } from "./memoria";
import { aventuraDoSistema, roteiroParaMestre } from "../aventuras";
import { sementesDe } from "../sistemas/sementes";
import { TITULO_ESTADO } from "./tipos";

export { JANELA_RECENTE };

// ---------- orçamento do prompt (P172) ----------
//
// O prompt de sistema vai em DOIS blocos:
//   - ESTÁVEL (blocoEstavel): regras gerais + extras (modo história, quem rola, sugestões, rerrolagem) + regras do sistema +
//     cabeçalho da campanha (nome, cenário, tom, modo, estilo da mesa, regras da casa) + roteiro da aventura. Idêntico entre
//     jogadas: na API vai com cache_control (leitura a 10%), no Claude Code é o --system-prompt-file. Nada que muda por turno
//     pode entrar aqui; a única exceção aceita é o roteiro da aventura, que perde a cena de abertura quando nasce o resumo.
//   - DO TURNO (blocoDoTurno): linha do grupo (quantos, nível), fichas, fatos fixados, resumo, diário compacto e cena atual.
//     Na API é o segundo bloco de sistema, sem cache; no Claude Code entra no começo do stdin, sob "## Estado da mesa agora".
// Tetos conferidos por teste (tests/prompt-orcamento.test.ts): estável <= TETO_ESTAVEL e turno <= TETO_TURNO, por sistema e
// por aventura. medirPrompt() loga os tamanhos a cada jogada.
//
// Onde entram as propostas que somam texto (decidido no plano da auditoria):
//   - P96 cidade/corte → estável (config.cidade escolhido na criação, até 1.200 caracteres, junto do cenário);
//   - P50, P06, P26, P27, P29 → estável, dentro de regrasParaMestre do Vampiro, que tem teto de 12.000 caracteres;
//   - P98 bestiário e P99 tabelas → NUNCA como texto: viram ferramentas (consultar_bestiario, rolar_tabela) com descrição
//     curta (~400 caracteres) e retorno sob demanda (até 600);
//   - P108 música atual → uma linha "Trilha: ..." em cenaEmTexto (bloco do turno);
//   - P24 → resolvido pelo resumo só de enredo (P174): o resumo encolhe em vez de crescer, o diário é dono de NPCs e lugares;
//   - P16 (janela maior) → não é "mais mensagens": a janela literal nunca fica abaixo do limite do resumo (memoria.ts).

/** Teto do bloco estável, em caracteres, por sistema e por aventura. */
export const TETO_ESTAVEL = 36_000;
/** Teto do bloco do turno, em caracteres (fichas, fatos, resumo, diário e cena de uma mesa cheia). */
export const TETO_TURNO = 30_000;

/**
 * O que as regras gerais dizem sobre combate, pelo modelo do sistema (campo `combate` do contrato): "rodadas" tem
 * iniciativa e rastreador em toda luta; "leve" segue a ordem da ficção e o rastreador só guarda o PV dos inimigos.
 */
const COMBATE_GERAL = {
  rodadas: {
    ordem: "Resolva as ações na ordem da ficção (em combate, na da iniciativa).",
    rastreador:
      'Todo combate passa pelo rastreador: combate.acao "iniciar" com os inimigos (nome único, PV, defesa; o servidor rola a iniciativa e devolve a ordem, narre nela). Dano e condições de INIMIGOS em "atualizar"; nos personagens, `alterar_ficha`. "proximo" quando o combatente da vez termina; "encerrar" quando o último inimigo cai, foge ou se rende.',
    checklist: "Inimigo ferido, caído, em fuga, ou a vez passou? → `atualizar_cena` (combate).",
  },
  leve: {
    ordem: "Resolva as ações na ordem da ficção, também em combate (sem rodadas nem iniciativa).",
    rastreador:
      'O rastreador é opcional (as regras do sistema dizem quando abrir) e serve para ter o PV dos inimigos à vista: combate.acao "iniciar" com os inimigos (nome único, PV); dano e condições de INIMIGOS em "atualizar"; nos personagens, `alterar_ficha`; "encerrar" quando o último inimigo cai, foge ou se rende.',
    checklist: "Rastreador aberto e um inimigo foi ferido, caiu ou fugiu? → `atualizar_cena` (combate).",
  },
} as const;

/** Regras gerais. `tamanho` vem do estilo da mesa e é o único lugar do prompt que fixa quantos parágrafos narrar. */
const regrasDoMestre = (tamanho: string, combate: (typeof COMBATE_GERAL)[keyof typeof COMBATE_GERAL]) => `Você é o Velho Mestre da Taverna: o narrador e juiz de uma aventura de RPG, em português do Brasil, para um ou mais jogadores.

## Estilo
- Segunda pessoa ("você"/"vocês"), presente, frases vivas e concretas: um detalhe sensorial bom vale mais que três adjetivos. Siga o tom da campanha (humor ácido só quando o tom deixa); o perigo é real e o mundo não protege ninguém.
- Tamanho: ${tamanho}. Nunca uma linha só, nunca menu de opções numeradas.
- Tudo o que você escreve aparece como narração: NUNCA resuma fora da ficção ("Cena aberta: ...", "anotei no diário", "você falhou no teste, então...") nem comente as ferramentas ou as regras.
- A tela já mostra os dados, as mudanças de ficha, Manchas, Fome, Força de Vontade, PV, diário e XP: NUNCA resuma isso em texto ("gastou 1 de Força de Vontade, agora 9/10", "ganhou 1 Mancha", "o homem está com 3 de 8 PV", "anotei no diário"); fale do que acontece na ficção.
- NUNCA fale, sinta, decida ou aja por um personagem de jogador além do que foi declarado. Descreva o mundo e as consequências; a reação é do jogador.
- NPCs têm nome, desejo, um trejeito e voz própria: falas entre aspas, no jeito anotado no diário. Recompense criatividade, mesmo absurda, com consequências coerentes.
- Sem repetição nem clichê: não reabra com a mesma imagem nem repita bordões; nada de "de repente" ou "um arrepio percorre sua espinha". Varie o tamanho das frases e o tipo de ameaça. Quando o pedido do turno listar o que você repetiu nas últimas narrações ("NÃO use: …"), troque por outra imagem, sem citar o proibido.

## Turno
- Ordem (a tela mostra nessa ordem): 1) \`atualizar_cena\` se mudou o lugar, a hora ou o clima; 2) a narração; 3) o teste, se precisar, só DEPOIS da narração; 4) \`sugerir_acoes\` por último, se existir. Registros (\`alterar_ficha\`, \`anotar_diario\`, \`conceder_xp\`) entram quando o fato acontece. A narração completa vem ANTES de \`sugerir_acoes\`, como texto da resposta ou pela ferramenta \`narrar\` (use \`narrar\` sempre que a narração vier depois de outras ferramentas; o raciocínio interno não aparece para o jogador: nunca narre só nele) (pode vir depois de outras ferramentas, mas nunca é trocada por elas). Depois das ferramentas finais (\`pedir_teste\`, \`sugerir_acoes\`, registros) NÃO escreva mais NADA: nem "a vez é sua", nem "o dado é seu", nem resumo do que mudou, nem comentário sobre o que você fez ("a abertura está pronta"). O turno acaba na última ferramenta; se ainda precisar responder algo depois dela, responda só "—".
- ${combate.ordem} Com vários personagens, divida o holofote: quem agiu pouco ganha uma pergunta direta ou um gancho pessoal; ninguém domina duas respostas seguidas.
- Fecho, UMA vez, no fim do texto narrado (com teste: no momento antes do dado). Com um personagem só: termine num detalhe concreto ou numa fala que exige resposta; não recapitule a situação, não liste opções (isso é o \`sugerir_acoes\`), não diga "a vez é sua". Com vários personagens: diga de quem é a vez e o que está em jogo, sem recapitular. Nunca repita a passagem de vez numa frase à parte depois das ferramentas.

## Ritmo e consequência
- Cenas curtas: quando a tensão cai, corte ("Três dias de estrada depois...") para o próximo momento interessante. Se o grupo empacar, empurre: um NPC aparece, o relógio avança, a ameaça se mexe.
- Teste só quando o resultado é incerto E importa: o trivial acontece, o impossível falha. Falha sempre muda algo (custo, complicação, tempo perdido), nunca "nada acontece".
- Consequências persistem: ferimentos, inimigos feitos, promessas e dívidas voltam a cobrar. Seja fiel ao diário e ao resumo: nomes, relações, mortos continuam mortos.

## Dados e ficha
- Rolagens de inimigos, dano e tabelas: \`rolar_dados\` (secreta: true para o que os jogadores não devem ver).
- NUNCA invente o número de um dado nem narre o resultado antes da ferramenta responder. Narre a partir do grau, da margem e do crítico, sem repetir os números crus (a tela já mostra o dado).
- PV 0 deixa a situação desesperadora: a morte é possível, mas tem de ser merecida e dramática, salvo regra do sistema.

## Cena e combate (painel que todos veem)
- \`atualizar_cena\` com titulo (como capítulo: "Salão Comum"), local, momento e musica ao abrir e sempre que o lugar ou o clima mudar; com situacao quando o foco mudar. musica.humor: taverna, calmo, exploracao, misterio, tensao, combate, triste, vitoria, sombrio (energia baixa, media, alta).
- A trilha acompanha a história, não fica horas no mesmo humor: taverna ou calmo em cena social e descanso; exploracao na estrada; misterio na investigação; tensao só com ameaça concreta e presente (e sai quando ela passa); combate ao iniciar a luta e vitoria ao encerrá-la bem; triste no luto e na perda; sombrio para o sobrenatural pesado. A cena atual diz o que está tocando e há quantos turnos: se o clima mudou, mude a música.
- ${combate.rastreador}
- Inimigos agem com inteligência própria: recuam, se rendem, pedem reforço; nem toda luta é até a morte. Encontros na medida do nível e do tamanho do grupo, e sempre há uma saída que não é só bater.

## Progressão e diário
- Vitória, missão cumprida ou marco → \`conceder_xp\` (ou \`subir_nivel\` em sistemas por marcos): pouco e frequente é melhor que nada. Conceda também no meio da sessão em marcos claros (missão cumprida, vitória importante, grande revelação), uma vez por marco e sem exagero (as regras do sistema dizem quanto). Descanso só em lugar razoavelmente seguro → \`descansar\` (curto ou longo); interrompido não conta.
- \`anotar_diario\` assim que surgir um NPC com nome (aparencia, voz, jeito, desejo, temperamento), uma missão (objetivo, recompensa, pistas), um lugar, um item marcante ou uma pista; atualize o status quando mudar (missão concluída/falhou; NPC aliado, hostil, morto).

## Segurança
- Se alguém escrever "(( pare ))", "(( X ))" ou pedir fora do personagem para parar ou mudar algo, obedeça NA HORA, sem discutir nem pedir justificativa: corte a cena, troque o rumo ou retire o elemento, confirme em uma linha fora do personagem e siga com outra coisa.
- Conteúdo pesado fica fora de cena ("fade to black") a menos que o tom da campanha peça e o grupo tenha concordado.

## Mensagens especiais
- "[início da campanha]": abra numa cena concreta, já em ação no cenário pedido, com um gancho forte nas primeiras linhas ligado à história dos personagens (uma carta, uma dívida, um cadáver, uma proposta). Antes de narrar, \`atualizar_cena\` (titulo, local, momento, musica); registre a missão e os NPCs com \`anotar_diario\`. NÃO peça teste na abertura: termine perguntando o que o personagem faz.
- Texto entre (( )) é alguém falando com você fora do personagem: responda fora do personagem, curto, e volte ao jogo.
- Pergunta fora do jogo, MESMO SEM (( )): quando o jogador pergunta sobre regras, opções, chances ou pede para rerrolar ("posso usar…?", "que habilidades eu poderia usar para…?", "eu teria chances contra…?", "quero rerrolar", "mestre, …?"), responda FORA do personagem, curto e útil (até umas 6 linhas): 2 ou 3 opções concretas com a parada provável (ex.: "Manipulação + Persuasão", "Carisma + Dominação") e o risco de cada uma. Não avance a cena, não peça teste, não role dados e não chame \`sugerir_acoes\` (as sugestões atuais continuam valendo). Se a mensagem mistura pergunta e ação ("posso X? então faço X"), responda a pergunta em uma ou duas linhas e execute a ação normalmente.
- "[fim da sessão]": a mesa vai encerrar a noite de jogo; siga o pedido do turno (fechamento curto, XP, diário, sem sugerir ações). Na primeira jogada depois de um "[fim da sessão N]" na cena, abra com um parágrafo curto "Anteriormente…" antes de responder à ação.
- Linhas "[rolagem do jogador]" são dados que um jogador rolou por conta própria: leve em conta se fizer sentido.

## Checklist antes de encerrar CADA turno
1. Dano, cura, magia/recurso/munição gasto, dinheiro, item ou condição? → \`alterar_ficha\` para cada um.
2. ${combate.checklist}
3. Mudou o local, a hora ou a situação? → \`atualizar_cena\`. O clima mudou (a ameaça passou, virou cena social, luto, revelação, luta começou ou acabou)? → \`atualizar_cena\` com musica.
4. NPC, missão, lugar, item ou pista nova, ou mudança de status? → \`anotar_diario\`.
5. Vitória ou marco? → \`conceder_xp\` (ou \`subir_nivel\`). Descanso seguro? → \`descansar\`.
6. A narração (não uma frase extra no fim) já terminou no fecho (detalhe ou fala que pede resposta; com vários personagens, de quem é a vez), sem recapitular nem decidir nada pelos personagens? Depois das ferramentas, nada mais.`;

/** Quando o servidor rola os testes na hora (ajuste "O mestre, na hora"). */
const DADOS_DO_MESTRE = `## TESTES (o servidor rola na hora)
- Resultado incerto e importante → \`teste\` com o nome do personagem; espere a resposta e narre a consequência no mesmo turno.`;

/** Quando o jogador rola os próprios testes (padrão nos dois modos): o mestre pede e espera. */
const DADOS_DO_JOGADOR = `## TESTES ROLADOS PELO JOGADOR
- Onde as regras do sistema falam em \`teste\`, use \`pedir_teste\` com o mesmo nome de teste e alvo; marque perigoso quando a falha machuca. Quem rola é o JOGADOR, na tela. modo e modificador funcionam como no \`teste\`.
- Narre ANTES de pedir: o que o personagem tenta e o que está em jogo, terminando no suspense (o instante antes do dado), sem contar o resultado nem o que vem depois. Depois de \`pedir_teste\` não escreva mais nada (no máximo chame \`sugerir_acoes\`): o cartão do dado na tela já é o "role agora". Um teste por personagem por turno.
- Pedido para rerrolar um teste já rolado: responda fora do personagem; não rerrole você mesmo com \`rolar_dados\` nem gaste recurso com \`alterar_ficha\`.
- "(resultado do teste pedido)" no turno seguinte é a RECOMPENSA do suspense: narre a consequência no tamanho combinado (o que o personagem consegue, percebe ou sofre e como o mundo reage), a partir do grau, e só então feche como pede o Turno. Nunca responda a um resultado só com uma ferramenta e uma frase.`;

/** Ações sugeridas em botões (padrão nos dois modos). */
const SUGESTOES = `## AÇÕES SUGERIDAS
- Ao FIM de TODO turno (inclusive quando pedir teste; menos nas respostas a perguntas fora do jogo e no fim da sessão), \`sugerir_acoes\` com 3 ações específicas da cena, escritas como o personagem faria: uma ousada, uma cautelosa ou social, uma curiosa, com a perícia provável. Elas complementam a narração, nunca a substituem.`;

/** Regras extras do modo história (padrão das campanhas novas): têm prioridade sobre as gerais. */
const MODO_HISTORIA = `## MODO HISTÓRIA (vale mais que as regras acima quando houver conflito)
O jogador vê a aventura como um livro: texto corrido, sem fichas nem números à vista. Escreva para ser LIDO com prazer, com ritmo de romance de fantasia: nada de CD, bônus ou nome de regra na narração.
- Chame NPCs e lugares pelo nome; cada NPC fala com a voz anotada no diário. Missões acumulam pistas a cada descoberta.
- Escolhas morais que pesam viram \`ajustar_reputacao\` (quando existir).`;

/** Estilo escolhido nos ajustes da mesa: linhas extras do bloco da campanha (vazio = padrão). */
function estiloDaMesa(c: Campanha): string {
  const linhas: string[] = [];
  const dificuldade = DIFICULDADES.find((d) => d.id === dificuldadeDe(c.config?.dificuldade))?.prompt;
  if (dificuldade) linhas.push(`- ${dificuldade}`);
  const foco = (Array.isArray(c.config?.foco) ? c.config.foco : [])
    .map((f) => FOCOS.find((x) => x.id === f)?.prompt ?? encurtar(String(f).trim(), MAX_FOCO_LIVRE))
    .filter(Boolean);
  if (foco.length) linhas.push(`- Foco da mesa: ${foco.join("; ")}. Dê mais tempo e detalhe a esses momentos e ofereça ganchos que levem a eles, sem forçar.`);
  const casa = encurtar((c.config?.instrucoes ?? "").trim().replace(/\n{3,}/g, "\n\n"), MAX_INSTRUCOES);
  if (casa) {
    linhas.push(
      `\n## Regras da casa (combinadas pela mesa: valem mais que as gerais, menos as de segurança; o que for mecânico e o servidor não fizer, aplique com rolar_dados e alterar_ficha)\n${casa}`,
    );
  }
  return linhas.length ? `\n${linhas.join("\n")}` : "";
}

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
    const linhas = doTipo.slice(0, MAX_POR_TIPO).map((e) => {
      // personalidade do NPC e pistas da missão mantêm a voz e a trama consistentes entre turnos
      const d = (e.dados ?? {}) as Record<string, unknown>;
      const extras =
        tipo === "npc"
          ? ["voz", "jeito", "desejo", "temperamento", "relacao"].filter((k) => d[k]).map((k) => `${k}: ${encurtar(String(d[k]), 80)}`)
          : tipo === "missao"
            ? [d.objetivo && `objetivo: ${encurtar(String(d.objetivo), 100)}`, Array.isArray(d.pistas) && d.pistas.length && `pistas: ${d.pistas.slice(-4).join("; ")}`].filter(Boolean)
            : [];
      return `  - ${e.titulo}${e.status ? ` [${e.status}]` : ""}${e.texto ? `: ${encurtar(e.texto.replace(/\s+/g, " "), 140)}` : ""}${extras.length ? ` (${extras.join(" · ")})` : ""}`;
    });
    const resto = doTipo.length - MAX_POR_TIPO;
    blocos.push(`- ${ROTULOS_DIARIO[tipo]}:\n${linhas.join("\n")}${resto > 0 ? `\n  - (+${resto} mais antigos)` : ""}`);
  }
  return blocos.join("\n");
}

/**
 * Cena em texto legível (o modelo lê melhor que JSON). O mestre de teste também lê este formato.
 * `turnosDeTrilha`: há quantos turnos do mestre a música atual toca (a linha "Trilha" sai quando a cena não tem música).
 */
export function cenaEmTexto(cena: Cena | null | undefined, rotuloDefesa = "Defesa", turnosDeTrilha: number | null = null): string {
  if (!cena) return "";
  const linhas: string[] = [];
  const topo = [cena.local && `Local: ${cena.local}`, cena.momento && `Momento: ${cena.momento}`, cena.clima && `Clima: ${cena.clima}`].filter(Boolean);
  if (topo.length) linhas.push(`- ${topo.join(" · ")}`);
  if (cena.situacao) linhas.push(`- Situação: ${cena.situacao}`);
  if (cena.musica?.humor) {
    const ha = turnosDeTrilha === null ? "" : turnosDeTrilha === 0 ? ", desde este turno" : `, há ${turnosDeTrilha} turno${turnosDeTrilha === 1 ? "" : "s"}`;
    linhas.push(`- Trilha: ${cena.musica.humor} (${cena.musica.energia ?? "media"})${ha}`);
  }
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

/**
 * Há quantos turnos a música da cena toca: jogadas (grupos de mensagens de jogador seguidas, uma por turno, inclusive na
 * rodada) depois de `musicaDesde`. null quando não há música ou a cena ainda não registrou desde quando.
 */
function turnosDeTrilha(c: Campanha): number | null {
  const desde = c.cena?.musicaDesde;
  if (!c.cena?.musica?.humor || typeof desde !== "number") return null;
  try {
    let turnos = 0;
    let anteriorJogador = false;
    for (const m of mensagensDepois(c.id, desde)) {
      const jogador = m.tipo === "jogador";
      if (jogador && !anteriorJogador) turnos++;
      anteriorJogador = jogador;
    }
    return turnos;
  } catch (e) {
    console.warn("[taverna] turnos da trilha indisponíveis para o prompt:", e);
    return null;
  }
}

/** Diário compacto da campanha (lido do banco), ou "" quando não deu para ler. */
function diarioDaCampanha(campanhaId: number): string {
  try {
    return diarioCompacto(listarDiario(campanhaId));
  } catch (e) {
    console.warn("[taverna] diário indisponível para o prompt:", e);
    return "";
  }
}

/** Linha fixa do bloco estável: o diário é dono dos fatos de status; o resumo, do enredo (P174). */
export const DIARIO_X_RESUMO = "- Diário x Resumo: para status de NPC, missão e lugar, o status vale o Diário; o Resumo guarda só o enredo e as pendências.";

/**
 * Bloco ESTÁVEL do prompt de sistema: o que não muda de uma jogada para a outra (vai em cache). Não lê nada do turno:
 * fichas, fatos, resumo, diário e cena ficam em blocoDoTurno.
 */
export function blocoEstavel(c: Campanha, sistema: Sistema): string {
  const extras = [
    c.config?.modoJogo === "historia" ? MODO_HISTORIA : "",
    jogadorRolaOsDados(c) ? DADOS_DO_JOGADOR : DADOS_DO_MESTRE,
    c.config?.sugestoes !== false ? SUGESTOES : "",
    // texto próprio do sistema sobre a decisão depois do dado (Vampiro: rerrolagem com Força de Vontade é botão do jogador)
    sistema.textosDoMestre?.rerrolagem ?? "",
  ].filter(Boolean);
  const tamanho = TAMANHOS.find((t) => t.id === tamanhoDe(c.config?.narracao))!.prompt;
  // aventura pronta: o roteiro secreto vai em todo turno; a cena de abertura, só enquanto ainda não há resumo
  const pronta = aventuraDoSistema(c.config?.aventura, sistema.id);
  const aventura = pronta
    ? `\n\n## AVENTURA EM ANDAMENTO (roteiro secreto: nunca revele ao jogador; improvise em cima, deixe o jogador mudar o rumo)\n${roteiroParaMestre(pronta, !c.resumo, sistema.id)}`
    : "";
  return `${regrasDoMestre(tamanho, COMBATE_GERAL[sistema.combate?.modelo ?? "rodadas"])}\n\n${extras.join("\n\n")}

## Regras do sistema (quando conflitam com as gerais, valem estas)
${sistema.regrasParaMestre}

## Campanha: ${c.nome}
- Cenário pedido: ${c.cenario || sementesDe(sistema.id).cenarioVazio}
- Tom: ${c.tom}
- ${MODOS[c.config?.modo ?? "livre"]}
${DIARIO_X_RESUMO}${estiloDaMesa(c)}${aventura}

(O estado da mesa — grupo, fichas, fatos fixados, resumo, diário e cena — vem logo depois, em "Estado da mesa agora", e muda a cada jogada.)`;
}

/** Linha do grupo: quantos personagens e de que nível (muda ao subir de nível: fica no bloco do turno). */
function linhaDoGrupo(personagens: Personagem[]): string {
  if (!personagens.length) return "sem personagens";
  const niveis = personagens.map((p) => p.ficha.nivel);
  const min = Math.min(...niveis);
  const max = Math.max(...niveis);
  return `${personagens.length} ${personagens.length > 1 ? "personagens" : "personagem"}, nível ${min === max ? niveis[0] : `${min} a ${max}`}`;
}

/** Bloco DO TURNO: grupo, fichas, fatos fixados, resumo, diário compacto e cena atual (lidos do banco a cada jogada). */
export function blocoDoTurno(c: Campanha, sistema: Sistema, personagens: Personagem[]): string {
  const fichas = personagens.length
    ? personagens.map((p) => `### ${p.ficha.nome}${p.jogador ? ` (jogador: ${p.jogador})` : ""}\n${sistema.descreverParaMestre(p.ficha)}`).join("\n\n")
    : "(nenhum personagem ainda)";
  const cena = cenaEmTexto(c.cena, sistema.rotulos.defesa, turnosDeTrilha(c));
  const diario = diarioDaCampanha(c.id);
  // fatos fixados pelo jogador: em todo turno, com prioridade sobre o resumo (só os que cabem no limite)
  let fatos = "";
  try {
    const textos = listarFatos(c.id).map((f) => f.texto);
    fatos = textos.slice(0, quantosEntram(textos)).map((t) => `- ${t}`).join("\n");
  } catch (e) {
    console.warn("[taverna] fatos fixados indisponíveis para o prompt:", e);
  }
  return `## Grupo: ${linhaDoGrupo(personagens)}
${fichas}
${fatos ? `\n## FATOS FIXADOS (o jogador marcou: valem acima do resumo e nunca podem ser contrariados)\n${fatos}\n` : ""}
## Resumo do que já aconteceu (só enredo e pendências; status de NPC, missão e lugar: veja o Diário)
${c.resumo || "(nada ainda: a campanha está começando)"}

## Diário da campanha
${diario || "(vazio)"}

## Cena atual
${cena || "(não definida: use atualizar_cena)"}`;
}

/** Os dois blocos do prompt de sistema de uma jogada. */
export function promptEmBlocos(c: Campanha, sistema: Sistema, personagens: Personagem[]): { estavel: string; turno: string } {
  return { estavel: blocoEstavel(c, sistema), turno: blocoDoTurno(c, sistema, personagens) };
}

export { TITULO_ESTADO };

/**
 * O prompt de sistema inteiro num texto só (estável + turno), para quem só quer ler (testes, golden, diagnóstico).
 * Os provedores recebem os dois blocos separados: veja promptEmBlocos.
 */
export function promptDoSistema(c: Campanha, sistema: Sistema, personagens: Personagem[]) {
  const { estavel, turno } = promptEmBlocos(c, sistema, personagens);
  return `${estavel}\n\n${TITULO_ESTADO}\n\n${turno}`;
}

export type MedidaPrompt = { estavel: number; turno: number; transcricao: number; pedido: number; em: number };

const milhar = (n: number) => n.toLocaleString("pt-BR");

/**
 * Mede os blocos de uma jogada e devolve a linha do log ("[taverna] prompt: estável 33.912 c (cache) · turno 27.480 c ·
 * transcrição 17.560 c"). Avisa no console quando um bloco passa do teto.
 */
export function medirPrompt(blocos: { estavel: string; turno: string }, pedido: string, transcricaoTexto: string): { medida: MedidaPrompt; linha: string } {
  const medida: MedidaPrompt = {
    estavel: blocos.estavel.length,
    turno: blocos.turno.length,
    transcricao: transcricaoTexto.length,
    pedido: pedido.length,
    em: Date.now(),
  };
  const linha = `[taverna] prompt: estável ${milhar(medida.estavel)} c (cache) · turno ${milhar(medida.turno)} c · transcrição ${milhar(medida.transcricao)} c · pedido ${milhar(medida.pedido)} c`;
  if (medida.estavel > TETO_ESTAVEL) console.warn(`[taverna] bloco estável acima do teto (${milhar(medida.estavel)} > ${milhar(TETO_ESTAVEL)} c)`);
  if (medida.turno > TETO_TURNO) console.warn(`[taverna] bloco do turno acima do teto (${milhar(medida.turno)} > ${milhar(TETO_TURNO)} c)`);
  return { medida, linha };
}

export function nomeDoPersonagem(personagens: Personagem[], id: number | null) {
  return personagens.find((p) => p.id === id)?.ficha.nome ?? null;
}

function linha(m: Mensagem, personagens: Personagem[]) {
  const nome = nomeDoPersonagem(personagens, m.personagemId);
  if (m.tipo === "jogador") return `JOGADOR${nome ? ` (${nome})` : m.autor ? ` (${m.autor})` : ""}: ${m.texto}`;
  if (m.tipo === "mestre") return `MESTRE: ${m.texto}`;
  if (m.tipo === "dado") {
    const d = m.dados as { origem?: string; tipo?: string; sessao?: number } | null;
    if (d?.tipo === "fim_sessao") return `[fim da sessão ${d.sessao ?? ""}]`.replace(" ]", "]");
    const origem = d?.origem;
    return origem === "jogador" ? `[rolagem do jogador${m.autor ? ` ${m.autor}` : ""}] ${m.texto}` : `[dado] ${m.texto}`;
  }
  return `[sistema] ${m.texto}`;
}

/**
 * Mensagens de sistema que são recado para a mesa, não ficção: avisos de fim anormal do turno (limite de ações, resposta
 * cortada, recusa) e divergências entre resumo e diário. Ficam fora da transcrição do mestre e do resumo.
 */
export const TIPOS_RECADO_SISTEMA = ["aviso", "divergencia"] as const;

export function foraDaTranscricao(m: Mensagem): boolean {
  if (m.tipo !== "sistema") return false;
  const tipo = (m.dados as { tipo?: unknown } | null)?.tipo;
  return (TIPOS_RECADO_SISTEMA as readonly unknown[]).includes(tipo);
}

/** Transcrição recente em texto (o mestre não guarda estado entre turnos). */
export function transcricao(mensagens: Mensagem[], personagens: Personagem[]) {
  return mensagens
    .filter((m) => !foraDaTranscricao(m))
    .slice(-JANELA_RECENTE)
    .map((m) => linha(m, personagens))
    .join("\n\n");
}

export type AcaoDoTurno = { personagem: string | null; autor: string; acao: string };

// não pede "diga de quem é a vez": isso provocava uma frase extra depois das ferramentas
const LEMBRETE =
  "(Antes de encerrar: checklist de fim de turno — ficha, cena/combate e música, diário, XP. O fecho vai dentro da narração, sem recapitular nem listar opções; o \"se acertar / se errar\" vem ANTES do pedir_teste, nunca depois; depois das ferramentas finais não escreva mais nada (no máximo —). Se for só uma pergunta fora do jogo, responda curto, fora do personagem, sem ferramentas.)";

/**
 * Pedido da chamada de continuação: o turno terminou sem narração suficiente (o modelo narrou só no raciocínio).
 * Vai junto com o pedido original, porque o mestre não guarda nada entre chamadas; só a ferramenta `narrar` fica disponível.
 */
export function promptDeContinuacao(promptOriginal: string, ferramentasUsadas: string[], narradoAteAqui: string): string {
  const feitas = ferramentasUsadas.length ? `Ferramentas que JÁ rodaram nesta resposta (não repita nenhuma): ${[...new Set(ferramentasUsadas)].join(", ")}.` : "Nenhuma ferramenta rodou ainda.";
  const lido = narradoAteAqui.trim() ? `O único texto que o jogador leu até agora foi:\n"""\n${narradoAteAqui.trim()}\n"""` : "O jogador não leu NADA deste turno.";
  return `${promptOriginal}

---

(CONTINUAÇÃO DO MESMO TURNO. ${lido}
${feitas} O que você escreveu no raciocínio interno não apareceu para ele. NÃO repita cena, diário, teste nem sugestões: chame AGORA a ferramenta narrar com a narração completa deste turno, no tamanho combinado, e termine. Nada de texto fora da ferramenta.)`;
}

/**
 * Pedido do turno de fim de sessão: fechamento curto, XP pelas regras do sistema, passos próprios do sistema antes do
 * fechamento (Remorso no Vampiro), diário, sem sugestões. Monte com `fimDeSessao`.
 */
export type FimDeSessao = {
  sessao: number;
  xp: string;
  passosExtras: string[];
  /** "Nesta sessão": linhas da noite inteira (ações, cenas, XP, missões), para o XP e o diário saírem dela e não da janela */
  nestaSessao?: string[];
  /** havia luta aberta ao encerrar: feche com um desfecho rápido ou deixe o gancho explícito */
  combateAtivo?: boolean;
  /** fechamento em retrospectiva (a noite terminou sem o botão e ninguém jogou desde então) */
  retroativa?: { horas: number } | null;
  /** o XP desta noite já saiu num Encerrar interrompido: true para a mesa toda, ou os nomes de quem já recebeu */
  xpJaConcedido?: boolean | string[];
};

/** XP do fim da noite quando o sistema não declara o próprio (campo `fimDeSessao` do contrato), pela progressão. */
const XP_FIM_GENERICO = {
  marcos: "subir_nivel só se esta sessão fechou um arco ou uma missão importante; senão, conceder_xp como registro dos marcos da noite, com o motivo",
  xp: "conceder_xp pelos marcos desta sessão (encontros vencidos, missões cumpridas, descobertas, boas ideias), na medida das regras do sistema, com o motivo",
};

/**
 * O pedido de fim de sessão deste sistema, para estas fichas. O texto do XP é do sistema (campo `fimDeSessao.xp` do contrato;
 * o do Vampiro mora na pasta dele em sistemas/); sem ele, o genérico pela progressão.
 */
export function fimDeSessao(sistema: Sistema, sessao: number, fichas: Ficha[], extra: Omit<FimDeSessao, "sessao" | "xp" | "passosExtras"> = {}): FimDeSessao {
  const proprio = sistema.fimDeSessao;
  const xp = proprio?.xp ?? (sistema.progressao === "xp" ? XP_FIM_GENERICO.xp : XP_FIM_GENERICO.marcos);
  return { sessao, xp, passosExtras: proprio?.passosExtras?.(fichas) ?? [], ...extra };
}

/** Quantas linhas do "Nesta sessão" entram no pedido de fim (as mais recentes ficam). */
const MAX_LINHAS_NOITE = 40;

/**
 * "Nesta sessão": a noite inteira em poucas linhas, para o XP e o diário do fechamento: ações dos jogadores (curtas),
 * títulos de cena, XP já concedido, missões e testes marcantes. Sem narração (a janela recente já leva a dela).
 */
export function linhasDaNoite(mensagens: Mensagem[], personagens: Personagem[]): string[] {
  const linhas: string[] = [];
  for (const m of mensagens) {
    const d = (m.dados ?? {}) as Record<string, unknown>;
    if (m.tipo === "jogador") {
      const t = m.texto.trim();
      if (!t || t.startsWith("((")) continue;
      linhas.push(`- ${nomeDoPersonagem(personagens, m.personagemId) ?? m.autor ?? "Jogador"}: ${encurtar(t.replace(/\s+/g, " "), 140)}`);
    } else if (m.tipo === "dado") {
      if (d.tipo === "cena_titulo") linhas.push(`- [cena] ${encurtar(m.texto.replace(/\s+/g, " "), 100)}`);
      else if (d.tipo === "xp") linhas.push(`- [XP já concedido] ${encurtar(m.texto.replace(/\s+/g, " "), 140)}`);
      else if (d.tipo === "diario" && ((d.entrada ?? {}) as { tipo?: string }).tipo === "missao") linhas.push(`- [missão] ${encurtar(m.texto.replace(/\s+/g, " "), 140)}`);
      else if (d.tipo === "combate") linhas.push(`- [luta] ${encurtar(m.texto.replace(/\s+/g, " "), 100)}`);
      else if ((d.tipo === "pedido_teste" && d.status === "resolvido") || (d.tipo === "teste" && !d.secreta)) linhas.push(`- [teste] ${encurtar(m.texto.replace(/\s+/g, " "), 140)}`);
    }
  }
  return linhas.length > MAX_LINHAS_NOITE ? ["- (…começo da noite omitido)", ...linhas.slice(-MAX_LINHAS_NOITE)] : linhas;
}

function pedidoDeFim(f: FimDeSessao): string {
  const fechamento = f.retroativa
    ? `narrar com o FECHAMENTO da noite em retrospectiva, 1 parágrafo: a noite terminou há ${horasPorExtenso(f.retroativa.horas)} sem ser encerrada; feche onde a história parou, sem avançar a cena, sem criar NPC nem lugar novo, o peso do que aconteceu e um gancho para a próxima sessão. Sem pedir teste, sem perguntar o que ele faz, sem passar a vez`
    : "narrar com o FECHAMENTO da noite, curto (1 a 2 parágrafos): onde o personagem fica (sem decidir escolhas novas por ele: corte para o amanhecer ou o refúgio), o peso do que aconteceu e um gancho para a próxima sessão. Sem pedir teste, sem perguntar o que ele faz, sem passar a vez";
  const passos = [
    ...f.passosExtras,
    f.combateAtivo ? "há uma luta aberta no rastreador: feche-a com um desfecho rápido (atualizar_cena com combate.acao \"encerrar\") ou deixe o cliffhanger explícito no fechamento; NÃO abra combate nem cena nova" : "",
    fechamento,
    "anotar_diario para atualizar missões (status, pistas novas) e NPCs que mudaram",
    f.xpJaConcedido === true
      ? "o XP desta noite JÁ foi concedido (o encerramento anterior foi interrompido): NÃO chame conceder_xp"
      : Array.isArray(f.xpJaConcedido) && f.xpJaConcedido.length
        ? `${f.xp} (o encerramento anterior foi interrompido: ${f.xpJaConcedido.join(", ")} JÁ ${f.xpJaConcedido.length === 1 ? "recebeu" : "receberam"} o XP desta noite; conceda só a quem falta)`
        : f.xp,
  ].filter(Boolean);
  const noite = f.nestaSessao?.length ? `\n\nNesta sessão (a noite inteira, para o motivo do XP e o status das missões):\n${f.nestaSessao.join("\n")}` : "";
  return `[fim da sessão]\n\nA mesa está encerrando a noite de jogo (fim da sessão ${f.sessao}). Faça nesta ordem:\n${passos.map((p, i) => `${i + 1}) ${p};`).join("\n")}\n${passos.length + 1}) e PARE: NÃO chame sugerir_acoes, não peça teste, não abra combate nem cena nova e não escreva nada depois das ferramentas, no máximo "—" (a tela mostra o XP e o marcador de fim de sessão).${noite}`;
}

/** "3 horas", "1 dia", "2 dias". */
export function horasPorExtenso(horas: number): string {
  if (horas < 36) {
    const h = Math.max(1, Math.round(horas));
    return `${h} hora${h === 1 ? "" : "s"}`;
  }
  const d = Math.round(horas / 24);
  return `${d} dia${d === 1 ? "" : "s"}`;
}

/**
 * Primeira jogada de uma noite nova (config.recapPendente). Com a recapitulação gravada no marcador, o servidor já a mostrou
 * ao jogador antes da ação: o mestre só não repete. Sem ela, o mestre abre com o "Anteriormente…" num `narrar` próprio.
 */
export type Recapitular = { motivo: "marcador" | "intervalo"; horas?: number; jaMostrada?: boolean };

function textoRecapitular(r: Recapitular): string {
  if (r.jaMostrada) {
    return "(Começa uma nova sessão de jogo. O \"Anteriormente…\" desta noite JÁ foi mostrado ao jogador logo antes da ação: NÃO recapitule nem repita o que ele diz; responda direto à ação abaixo.)\n\n";
  }
  const porque =
    r.motivo === "intervalo"
      ? `Voltando depois de ${horasPorExtenso(r.horas ?? 5)}; a noite anterior não foi encerrada.`
      : "Começa uma nova sessão de jogo depois do \"[fim da sessão]\".";
  return `(${porque} PRIMEIRO chame narrar SÓ com um parágrafo curto começando por "Anteriormente…": onde a história parou, o que pesa e o que está pendente. Depois, em OUTRO narrar, responda à ação abaixo.)\n\n`;
}

export function promptDoTurno(
  recentes: Mensagem[],
  personagens: Personagem[],
  acoes: AcaoDoTurno[] | "inicio" | FimDeSessao,
  opcoes: { recapitular?: Recapitular | null } = {},
) {
  // a transcrição manda tudo depois de resumoAte; passar da janela significa que o resumo atrasou (nada se perde, mas avisa)
  if (recentes.length > JANELA_RECENTE) {
    console.warn(`[taverna] transcrição com ${recentes.length} mensagens, acima da janela de ${JANELA_RECENTE}: o resumo automático está atrasado.`);
  }
  const historico = transcricao(recentes, personagens);
  const especial = acoes === "inicio" || !Array.isArray(acoes);
  const pedido =
    acoes === "inicio"
      ? "[início da campanha]\n\nAbra a aventura nesta ordem: 1) atualizar_cena; 2) a ferramenta narrar com a CENA DE ABERTURA completa, no tamanho combinado para a abertura: onde o personagem está, o que vê, ouve e sente, quem está ali e o que diz, e o gancho ligado à história dele, terminando com a pergunta do que ele faz; 3) anotar_diario com a missão e os NPCs; 4) sugerir_acoes, e nada mais depois dele (no máximo —). O que você rascunha no raciocínio NÃO aparece para o jogador: sem o narrar ele não sabe onde está nem por quê."
      : !Array.isArray(acoes)
        ? pedidoDeFim(acoes)
        : `${opcoes.recapitular ? textoRecapitular(opcoes.recapitular) : ""}${
            acoes.length === 1
              ? `Nova ação${acoes[0].personagem ? ` de ${acoes[0].personagem}` : ""}:\n${acoes[0].acao}`
              : `Ações desta rodada:\n${acoes.map((a) => `- ${a.personagem ?? a.autor}: ${a.acao}`).join("\n")}`
          }`;
  // quem ainda não apareceu nas últimas mensagens merece o holofote
  const calados =
    Array.isArray(acoes) && personagens.length > 1
      ? personagens.filter((p) => !recentes.slice(-12).some((m) => m.tipo === "jogador" && m.personagemId === p.id) && !acoes.some((a) => a.personagem === p.ficha.nome))
      : [];
  const holofote = calados.length ? `\n(Holofote: ${calados.map((p) => p.ficha.nome).join(", ")} não agiu há um tempo; dê espaço.)` : "";
  // muletas das últimas narrações e aviso de tamanho (P18): só nos turnos comuns, lidos do banco
  const extras = especial ? [] : lembretesDaCampanha(personagens[0]?.campanhaId, acoes as AcaoDoTurno[]);
  // na abertura e no fim da sessão o lembrete do checklist distrai: o pedido já diz o que fazer
  return `${historico ? `Cena até aqui (mais recente por último):\n\n${historico}\n\n---\n\n` : ""}${pedido}${especial ? "" : `\n\n${[LEMBRETE, ...extras].join("\n")}`}${holofote}`;
}

/** Mensagens lidas para as muletas: as 8 narrações longas (muletas.ts) vêm espaçadas por dados e falas curtas. */
const JANELA_MULETAS = 80;

/**
 * Linhas extras do LEMBRETE (muletas.ts): o que o mestre repetiu nas últimas 5 narrações e, se a última passou do teto do
 * tamanho da mesa, o aviso. Lê as mensagens e o estilo da campanha no banco (o turno já gravou as ações do jogador).
 */
function lembretesDaCampanha(campanhaId: number | undefined, acoes: AcaoDoTurno[]): string[] {
  if (!campanhaId) return [];
  try {
    const campanha = obterCampanha(campanhaId);
    const tamanho = TAMANHOS.find((t) => t.id === tamanhoDe(campanha?.config?.narracao));
    const teto = tamanho ? { paragrafos: tamanho.paragrafos, palavras: tamanho.palavras } : null;
    // nomes do diário (NPCs, lugares, itens) são o assunto da história, não muleta
    const doDiario = listarDiario(campanhaId).map((e) => e.titulo);
    return lembretesDoTurno(listarMensagens(campanhaId, JANELA_MULETAS), teto, [...acoes.map((a) => a.acao), ...doDiario]);
  } catch (e) {
    console.warn("[taverna] muletas indisponíveis para o prompt:", e);
    return [];
  }
}

/** Teto do resumo, em palavras (o diário guarda NPCs, lugares e status; o resumo, só o enredo). */
export const MAX_PALAVRAS_RESUMO = 320;

/** Títulos das seções do resumo, na ordem (P174). "Divergências" sai do resumo gravado e vira recado na mesa. */
export const SECOES_RESUMO = ["Enredo até agora", "Pendências e promessas", "Estado do grupo", "Divergências"] as const;

export const SISTEMA_RESUMO = `Você mantém a memória de uma campanha de RPG. Reescreva o resumo incorporando os acontecimentos novos.
O DIÁRIO da campanha já guarda NPCs, lugares, itens, missões e o status de cada um: o resumo NÃO repete nem reescreve nada disso.
Formato, em português, no máximo ${MAX_PALAVRAS_RESUMO} palavras no total, exatamente com estas quatro seções:
## Enredo até agora
(até 220 palavras: o que aconteceu e por quê, em ordem; cite NPCs só pelo nome, sem descrevê-los)
## Pendências e promessas
(lista curta: ganchos, dívidas, promessas e perguntas em aberto)
## Estado do grupo
(só o que a ficha não mostra: ferimentos narrativos, dívidas, onde o grupo está; "—" se nada)
## Divergências
(frases dos acontecimentos novos que contradizem o diário, ex.: "o diário diz Vera aliada, mas ela atacou o grupo"; "—" se nenhuma.
O diário pode estar à frente destes acontecimentos: as mensagens mais recentes ficam fora deste trecho. Fato do diário que não aparece aqui, ou que aqui "ainda não aconteceu", NÃO é divergência; só a contradição direta conta)
Texto puro: além dos quatro títulos "## " acima, NADA de markdown (sem negrito, itálico, asteriscos nem sublinhados; listas só com "- " simples). O jogador lê este resumo no cartão "Anteriormente…".
Seja factual; não invente nada que não esteja no texto. Responda só com o resumo.`;

/** Teto da recapitulação gravada no marcador de fim da noite, em palavras. */
export const MAX_PALAVRAS_RECAPITULACAO = 120;

/** Recapitulação da noite que acabou: gravada no marcador e lida na volta (cartão "Anteriormente…" e a abertura do mestre). */
export const SISTEMA_RECAPITULACAO = `Você é o narrador de uma campanha de RPG e escreve o "Anteriormente…" da próxima sessão, em português do Brasil.
Até ${MAX_PALAVRAS_RECAPITULACAO} palavras, um ou dois parágrafos, em segunda pessoa ("você"/"vocês"), no passado recente: onde a história parou, o que pesa sobre o personagem e o que ficou pendente. Comece com "Anteriormente…".
Texto puro, sem markdown, sem títulos, sem listas, sem números de regra (XP, Manchas, dados). Seja fiel ao texto; não invente nada. Responda só com a recapitulação.`;

/** Pedido da recapitulação: o resumo (enredo até antes da noite) e as mensagens da noite que acabou. */
export function promptDaRecapitulacao(resumo: string, daNoite: Mensagem[], personagens: Personagem[]): string {
  const linhas = daNoite
    .filter((m) => !foraDaTranscricao(m))
    .map((m) => linha(m, personagens))
    .join("\n\n");
  // a noite pode ser longa: o fim (o fechamento) importa mais que o começo
  const texto = linhas.length > 24_000 ? `(…)\n${linhas.slice(-24_000)}` : linhas;
  return `Resumo da campanha até aqui:\n${resumo.trim() || "(vazio)"}\n\nA noite que acabou de terminar:\n\n${texto}`;
}

/** Corta a recapitulação devolvida no teto de palavras (o modelo às vezes passa um pouco). */
export function limparRecapitulacao(texto: string): string {
  const t = texto
    .replace(/[*_#`>]+/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
  const palavras = t.split(/\s+/);
  if (palavras.length <= MAX_PALAVRAS_RECAPITULACAO + 10) return t;
  const corte = palavras.slice(0, MAX_PALAVRAS_RECAPITULACAO).join(" ");
  const ponto = corte.lastIndexOf(".");
  return ponto > corte.length * 0.6 ? corte.slice(0, ponto + 1) : `${corte}…`;
}

export function promptDoResumo(resumoAtual: string, novas: Mensagem[], personagens: Personagem[], diario = "") {
  const doDiario = diario.trim()
    ? `Diário da campanha (isto já está no diário: não repita nem reescreva; se os acontecimentos mudarem um status, registre em Divergências):\n${diario.trim()}\n\n`
    : "";
  return `${doDiario}Resumo atual:\n${resumoAtual || "(vazio)"}\n\nAcontecimentos novos:\n\n${novas
    .filter((m) => !foraDaTranscricao(m))
    .map((m) => linha(m, personagens))
    .join("\n\n")}`;
}

/** Diário compacto de uma campanha, para o resumidor (vazio quando não dá para ler). */
export function diarioParaResumo(campanhaId: number): string {
  return diarioDaCampanha(campanhaId);
}

/**
 * Separa a seção "Divergências" do resumo devolvido pelo modelo: o resumo gravado fica sem ela (o mestre lê o diário para
 * status) e cada divergência real vira um recado de sistema na mesa. "—", "nenhuma" e afins contam como vazio.
 */
export function separarDivergencias(resumo: string): { resumo: string; divergencias: string[] } {
  const linhas = resumo.split(/\r?\n/);
  const titulo = (l: string) => /^\s*(?:#{1,4}\s+|\*\*)/.test(l);
  const inicio = linhas.findIndex((l) => /^\s*(?:#{1,4}\s*|\*\*)?\s*Diverg[êe]ncias\b/i.test(l));
  if (inicio < 0) return { resumo: resumo.trim(), divergencias: [] };
  let fim = inicio + 1;
  while (fim < linhas.length && !titulo(linhas[fim])) fim++;
  // texto na mesma linha do título ("Divergências: o diário diz...")
  const naLinha = linhas[inicio].replace(/^\s*(?:#{1,4}\s*|\*\*)?\s*Diverg[êe]ncias\b\**\s*:?\**\s*/i, "");
  const divergencias = [naLinha, ...linhas.slice(inicio + 1, fim)]
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").replace(/^\((.*)\)$/, "$1").trim())
    .filter((l) => l && !/^(—|-|–|nenhuma\.?|nada\.?|sem diverg[êe]ncias\.?|n\/a)$/i.test(l));
  const sem = [...linhas.slice(0, inicio), ...linhas.slice(fim)].join("\n").trim();
  return { resumo: sem, divergencias };
}
