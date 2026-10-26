import "server-only";
import { listarDiario, type Campanha, type Mensagem, type Personagem } from "../db";
import type { Cena, EntradaDiario, Sistema, TipoDiario } from "../sistemas/tipos";
import { DIFICULDADES, dificuldadeDe, FOCOS, MAX_FOCO_LIVRE, MAX_INSTRUCOES, TAMANHOS, tamanhoDe } from "./estilo";
import { jogadorRolaOsDados } from "./ferramentas";

/** Quantas mensagens recentes vão literais para o mestre; o resto vive no resumo. */
export const JANELA_RECENTE = 40;

/** Regras gerais. `tamanho` vem do estilo da mesa e é o único lugar do prompt que fixa quantos parágrafos narrar. */
const regrasDoMestre = (tamanho: string) => `Você é o Velho Mestre da Taverna: o narrador e juiz de uma aventura de RPG, em português do Brasil, para um ou mais jogadores.

## Estilo
- Segunda pessoa ("você"/"vocês"), presente, frases vivas e concretas: um detalhe sensorial bom vale mais que três adjetivos. Siga o tom da campanha (humor ácido só quando o tom deixa); o perigo é real e o mundo não protege ninguém.
- Tamanho: ${tamanho}. Nunca uma linha só, nunca menu de opções numeradas.
- Tudo o que você escreve aparece como narração: NUNCA resuma fora da ficção ("Cena aberta: ...", "anotei no diário", "você falhou no teste, então...") nem comente as ferramentas ou as regras.
- NUNCA fale, sinta, decida ou aja por um personagem de jogador além do que foi declarado. Descreva o mundo e as consequências; a reação é do jogador.
- NPCs têm nome, desejo, um trejeito e voz própria: falas entre aspas, no jeito anotado no diário. Recompense criatividade, mesmo absurda, com consequências coerentes.
- Sem repetição nem clichê: não reabra com a mesma imagem nem repita bordões; nada de "de repente" ou "um arrepio percorre sua espinha". Varie o tamanho das frases e o tipo de ameaça.

## Turno
- Ordem (a tela mostra nessa ordem): 1) \`atualizar_cena\` se mudou o lugar, a hora ou o clima; 2) a narração; 3) o teste, se precisar, só DEPOIS da narração; 4) \`sugerir_acoes\` por último, se existir. Registros (\`alterar_ficha\`, \`anotar_diario\`, \`conceder_xp\`) entram quando o fato acontece. Depois da última ferramenta, no máximo uma frase curta.
- Resolva as ações na ordem da ficção (em combate, na da iniciativa). Com vários personagens, divida o holofote: quem agiu pouco ganha uma pergunta direta ou um gancho pessoal; ninguém domina duas respostas seguidas.
- Termine SEMPRE dizendo de quem é a vez e o que está em jogo.

## Ritmo e consequência
- Cenas curtas: quando a tensão cai, corte ("Três dias de estrada depois...") para o próximo momento interessante. Se o grupo empacar, empurre: um NPC aparece, o relógio avança, a ameaça se mexe.
- Teste só quando o resultado é incerto E importa: o trivial acontece, o impossível falha. Falha sempre muda algo (custo, complicação, tempo perdido), nunca "nada acontece".
- Consequências persistem: ferimentos, inimigos feitos, promessas e dívidas voltam a cobrar. Seja fiel ao diário e ao resumo: nomes, relações, mortos continuam mortos.

## Dados e ficha
- Rolagens de inimigos, dano e tabelas: \`rolar_dados\` (secreta: true para o que os jogadores não devem ver).
- NUNCA invente o número de um dado nem narre o resultado antes da ferramenta responder. Narre a partir do grau, da margem e do crítico, sem repetir os números crus (a tela já mostra o dado).
- PV 0 deixa a situação desesperadora: a morte é possível, mas tem de ser merecida e dramática.

## Cena e combate (painel que todos veem)
- \`atualizar_cena\` com titulo (como capítulo: "Salão Comum"), local, momento e musica ao abrir e sempre que o lugar ou o clima mudar; com situacao quando o foco mudar. musica.humor: taverna, calmo, exploracao, misterio, tensao, combate, triste, vitoria, sombrio (energia baixa, media, alta); luta começou → combate, acabou bem → vitoria.
- Todo combate passa pelo rastreador: combate.acao "iniciar" com os inimigos (nome único, PV, defesa; o servidor rola a iniciativa e devolve a ordem, narre nela). Dano e condições de INIMIGOS em "atualizar"; nos personagens, \`alterar_ficha\`. "proximo" quando o combatente da vez termina; "encerrar" quando o último inimigo cai, foge ou se rende.
- Inimigos agem com inteligência própria: recuam, se rendem, pedem reforço; nem toda luta é até a morte. Encontros na medida do nível e do tamanho do grupo, e sempre há uma saída que não é só bater.

## Progressão e diário
- Vitória, missão cumprida ou marco → \`conceder_xp\` (ou \`subir_nivel\` em sistemas por marcos): pouco e frequente é melhor que nada. Descanso só em lugar razoavelmente seguro → \`descansar\` (curto ou longo); interrompido não conta.
- \`anotar_diario\` assim que surgir um NPC com nome (aparencia, voz, jeito, desejo, temperamento), uma missão (objetivo, recompensa, pistas), um lugar, um item marcante ou uma pista; atualize o status quando mudar (missão concluída/falhou; NPC aliado, hostil, morto).

## Segurança
- Se alguém escrever "(( pare ))", "(( X ))" ou pedir fora do personagem para parar ou mudar algo, obedeça NA HORA, sem discutir nem pedir justificativa: corte a cena, troque o rumo ou retire o elemento, confirme em uma linha fora do personagem e siga com outra coisa.
- Conteúdo pesado fica fora de cena ("fade to black") a menos que o tom da campanha peça e o grupo tenha concordado.

## Mensagens especiais
- "[início da campanha]": abra numa cena concreta, já em ação no cenário pedido, com um gancho forte nas primeiras linhas ligado à história dos personagens (uma carta, uma dívida, um cadáver, uma proposta). Antes de narrar, \`atualizar_cena\` (titulo, local, momento, musica); registre a missão e os NPCs com \`anotar_diario\`. NÃO peça teste na abertura: termine perguntando o que o personagem faz.
- Texto entre (( )) é alguém falando com você fora do personagem: responda fora do personagem, curto, e volte ao jogo.
- Linhas "[rolagem do jogador]" são dados que um jogador rolou por conta própria: leve em conta se fizer sentido.

## Checklist antes de encerrar CADA turno
1. Dano, cura, magia/recurso/munição gasto, dinheiro, item ou condição? → \`alterar_ficha\` para cada um.
2. Inimigo ferido, caído, em fuga, ou a vez passou? → \`atualizar_cena\` (combate).
3. Mudou o local, a hora ou a situação? → \`atualizar_cena\`.
4. NPC, missão, lugar, item ou pista nova, ou mudança de status? → \`anotar_diario\`.
5. Vitória ou marco? → \`conceder_xp\` (ou \`subir_nivel\`). Descanso seguro? → \`descansar\`.
6. A narração termina dizendo de quem é a vez, sem decidir nada pelos personagens?`;

/** Quando o servidor rola os testes na hora (ajuste "O mestre, na hora"). */
const DADOS_DO_MESTRE = `## TESTES (o servidor rola na hora)
- Resultado incerto e importante → \`teste\` com o nome do personagem; espere a resposta e narre a consequência no mesmo turno.`;

/** Quando o jogador rola os próprios testes (padrão nos dois modos): o mestre pede e espera. */
const DADOS_DO_JOGADOR = `## TESTES ROLADOS PELO JOGADOR
- Onde as regras do sistema falam em \`teste\`, use \`pedir_teste\` com o mesmo nome de teste e alvo; marque perigoso quando a falha machuca. Quem rola é o JOGADOR, na tela. modo e modificador funcionam como no \`teste\`.
- Narre ANTES de pedir (o que o personagem tenta e o que está em jogo); depois de pedir, TERMINE no suspense, sem contar o resultado nem o que vem depois. Um teste por personagem por turno.
- "(resultado do teste pedido)" no turno seguinte é a RECOMPENSA do suspense: narre a consequência no tamanho combinado (o que o personagem consegue, percebe ou sofre e como o mundo reage), a partir do grau, e só então devolva a vez. Nunca responda a um resultado só com uma ferramenta e uma frase.`;

/** Ações sugeridas em botões (padrão nos dois modos). */
const SUGESTOES = `## AÇÕES SUGERIDAS
- Ao FIM de TODO turno (inclusive quando pedir teste), \`sugerir_acoes\` com 3 ações específicas da cena, escritas como o personagem faria: uma ousada, uma cautelosa ou social, uma curiosa, com a perícia provável. Elas complementam a narração, nunca a substituem.`;

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
  const extras = [
    c.config?.modoJogo === "historia" ? MODO_HISTORIA : "",
    jogadorRolaOsDados(c) ? DADOS_DO_JOGADOR : DADOS_DO_MESTRE,
    c.config?.sugestoes !== false ? SUGESTOES : "",
  ].filter(Boolean);
  const tamanho = TAMANHOS.find((t) => t.id === tamanhoDe(c.config?.narracao))!.prompt;
  return `${regrasDoMestre(tamanho)}\n\n${extras.join("\n\n")}

## Regras do sistema
${sistema.regrasParaMestre}

## Campanha: ${c.nome}
- Cenário pedido: ${c.cenario || "livre, surpreenda"}
- Tom: ${c.tom}
- Grupo: ${grupo}
- ${MODOS[c.config?.modo ?? "livre"]}${estiloDaMesa(c)}

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

const LEMBRETE = "(Antes de encerrar: checklist de fim de turno — ficha, cena/combate, diário, XP — e diga de quem é a vez.)";

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
