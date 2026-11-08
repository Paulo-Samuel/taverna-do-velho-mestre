import "server-only";
import { AVISO_LIMITE_RODADAS } from "./provedor-api";
import type { OpcoesTurno, Provedor } from "./tipos";

// Mestre de mentira, para testar a interface e as regras sem gastar o plano nem créditos.
// Escreve um texto pré-montado aos poucos e chama as ferramentas de verdade: cena, diário,
// combate com iniciativa, testes, dano, XP e descanso. Lê o estado da cena do bloco do turno (`contexto`,
// formato de cenaEmTexto em prompt.ts) porque não guarda nada entre turnos.
// Ensaios: "[limite]" na ação simula o fim anormal do turno (aviso de limite de ações gravado como mensagem de sistema).

const pausa = (ms: number, sinal?: AbortSignal) =>
  new Promise<void>((ok, falha) => {
    const t = setTimeout(ok, ms);
    sinal?.addEventListener("abort", () => {
      clearTimeout(t);
      falha(new Error("Turno cancelado."));
    });
  });

async function escrever(texto: string, emitir: OpcoesTurno["emitir"], sinal?: AbortSignal) {
  for (const pedaco of texto.match(/.{1,12}(\s|$)/gs) ?? [texto]) {
    emitir({ tipo: "texto", texto: pedaco });
    await pausa(25, sinal);
  }
}

/** Primeiro nome de personagem citado no prompt de turno ("Nova ação de X" / "- X: ..."). */
function personagemDoPrompt(prompt: string): string | undefined {
  return prompt.match(/Nova ação de ([^:\n]+):/)?.[1] ?? prompt.match(/Ações desta rodada:\n- ([^:]+):/)?.[1];
}

/** Texto das ações do turno, para escolher o que encenar. */
function acaoDoPrompt(prompt: string): string {
  const depois = prompt.split("\n---\n").pop() ?? prompt;
  // o lembrete do checklist fala em "combate": não pode disparar uma luta
  return depois.split("\n\n(Antes de encerrar")[0].toLowerCase();
}

type Inimigo = { nome: string; pv: number | null };

/** Lê "COMBATE ATIVO" e as linhas "N. Nome (inimigo) ... PV a/b" do prompt de sistema. */
function combateDoSistema(sistema: string): { ativo: boolean; inimigos: Inimigo[] } {
  if (!sistema.includes("COMBATE ATIVO")) return { ativo: false, inimigos: [] };
  const inimigos = [...sistema.matchAll(/^\s+\d+\. (.+?) \(inimigo\)(?: ← age agora)? — (.*)$/gm)].map((m) => {
    const pv = m[2].match(/PV (\d+)\//);
    return { nome: m[1], pv: pv ? Number(pv[1]) : null };
  });
  return { ativo: true, inimigos };
}

const sorte = (chance: number) => Math.random() < chance;

/** Números da luta de mentira na escala de cada mecânica (CA 12 num Fate seria impossível; d100 rola abaixo da perícia). */
type Escala = { alvo: number | null; inimigo: { pv: number; defesa: number }; danoJogador: string; ataqueInimigo: string; acerto: (total: number) => boolean; danoInimigo: string; arranhao: string };

const ESCALAS: Record<"d20" | "fate" | "d100" | "pbta", Escala> = {
  d20: { alvo: 12, inimigo: { pv: 7, defesa: 12 }, danoJogador: "1d8+2", ataqueInimigo: "1d20+3", acerto: (t) => t >= 12, danoInimigo: "1d6", arranhao: "1d4" },
  // oposição Razoável (+2); salteador aguenta 3 tensões e acerta 1 caixa de estresse
  fate: { alvo: 2, inimigo: { pv: 3, defesa: 2 }, danoJogador: "1d3", ataqueInimigo: "4dF+1", acerto: (t) => t >= 2, danoInimigo: "1d2", arranhao: "1" },
  d100: { alvo: null, inimigo: { pv: 7, defesa: 0 }, danoJogador: "1d6+1", ataqueInimigo: "1d100", acerto: (t) => t <= 40, danoInimigo: "1d6", arranhao: "1d3" },
  pbta: { alvo: null, inimigo: { pv: 6, defesa: 1 }, danoJogador: "1d8", ataqueInimigo: "1d6", acerto: (t) => t >= 4, danoInimigo: "1d6", arranhao: "1d4" },
};

/** Descobre a mecânica pela descrição da ferramenta teste ("pelas regras de Fate Acelerado"). */
function escalaDe(ferramentas: OpcoesTurno["ferramentas"]): Escala {
  const desc = String(ferramentas.find((f) => f.name === "teste")?.description ?? "");
  if (/Fate/i.test(desc)) return ESCALAS.fate;
  if (/d100|Horror/i.test(desc)) return ESCALAS.d100;
  if (/Dungeon World|PbtA/i.test(desc)) return ESCALAS.pbta;
  return ESCALAS.d20;
}

export const provedorFalso: Provedor = {
  id: "falso",
  nome: "Mestre de teste (sem IA)",

  async turno({ sistema, contexto, prompt, ferramentas, executar, emitir, sinal }: OpcoesTurno) {
    const tem = (nome: string) => ferramentas.some((f) => f.name === nome);
    const diga = (texto: string) => escrever(texto, emitir, sinal);
    /** Chama a ferramenta; se falhar, conta na narração em vez de derrubar o turno. */
    const usar = async <T>(nome: string, entrada: unknown): Promise<T | null> => {
      if (!tem(nome)) return null;
      try {
        return (await executar(nome, entrada)) as T;
      } catch (e) {
        await diga(`(ferramenta ${nome} falhou: ${e instanceof Error ? e.message : e}) `);
        return null;
      }
    };

    const inicio = prompt.includes("[início da campanha]");
    const personagem = personagemDoPrompt(prompt);
    const acao = acaoDoPrompt(prompt);
    // a cena (e o COMBATE ATIVO) vem no bloco do turno; o estável não muda de jogada para jogada
    const combate = combateDoSistema(contexto || sistema);
    const escala = escalaDe(ferramentas);

    // Continuação pedida por index.ts (o turno acabou sem narração): só a ferramenta narrar está disponível.
    // "[mudo total]" na ação ignora até a continuação, para ver o erro "O mestre não narrou nada" na tela.
    if (ferramentas.length === 1 && tem("narrar")) {
      // (o pedido original vem antes do "---" da continuação: a ação está no prompt inteiro, não em `acao`)
      if (/\[mudo total\]/i.test(prompt)) return;
      await usar("narrar", {
        texto:
          "Bruno Três-Dedos larga o pano no balcão e olha para você como quem acaba de lembrar que tinha uma história para contar.\n\n\"Ia me esquecendo\", ele diz, baixo. \"O sujeito da carta deixou outra coisa: disse que volta antes do sino da capela.\" Lá fora, o sino ainda não tocou.",
      });
      return;
    }
    // Ensaio da rede de segurança: "[mudo]" na ação faz o mestre de teste registrar a cena e terminar SEM narrar
    // (como o modelo que narra só no raciocínio); index.ts então pede a continuação acima. Nada de texto, nem de erro de ferramenta.
    // Ensaio do fim anormal do turno (P130): narra um pouco e avisa que passou do limite de ações, como a API faria
    if (/\[limite\]/.test(acao)) {
      await diga("Você começa a agir, mas a noite tem mais pressa que o mestre.");
      emitir({ tipo: "aviso", texto: AVISO_LIMITE_RODADAS });
      return;
    }
    if (/\[mudo/.test(acao)) {
      if (tem("atualizar_cena")) await executar("atualizar_cena", { situacao: "O mestre de teste ficou mudo de propósito." }).catch(() => undefined);
      return;
    }
    // Ensaio da consulta (W18): "[consulta]" consulta o bestiário (secreto) e sorteia a primeira tabela (pública)
    if (/\[consulta\]/.test(acao)) {
      const enumTabelas = (ferramentas.find((f) => f.name === "sortear_tabela")?.input_schema as { properties?: { tabela?: { enum?: string[] } } } | undefined)?.properties?.tabela?.enum;
      const bloco = await usar<string>("consultar_bestiario", { nivel: 1 });
      const sorteio = enumTabelas?.length ? await usar<string>("sortear_tabela", { tabela: enumTabelas[0], publica: true }) : null;
      await diga(`O mestre folheia as anotações. ${bloco ? `(${bloco.split("\n")[0]}) ` : ""}${sorteio ? `Sorteado: ${sorteio}` : ""}`);
      return;
    }

    // Fim da noite ("Encerrar a noite"): segue o roteiro do pedido (Remorso de quem tem Manchas, fechamento, diário, XP).
    // Campanha com "(rebelde)" no nome ignora o roteiro de propósito (abre luta e cena nova, não rola Remorso nem dá XP), para
    // ensaiar a rede de segurança do servidor (index.ts: guardaDoFim e redeDoFim).
    if (prompt.includes("[fim da sessão]")) {
      if (/\(rebelde\)/i.test(sistema)) {
        await usar("atualizar_cena", {
          titulo: "Emboscada no Beco",
          musica: { humor: "combate", energia: "alta" },
          combate: { acao: "iniciar", inimigos: [{ nome: "Carniçal", pv: escala.inimigo.pv, pvMax: escala.inimigo.pv, defesa: escala.inimigo.defesa }] },
        });
        await usar("rolar_dados", { expressao: "1d10", motivo: "Só para ver o que acontece" });
        await diga("Um carniçal salta do escuro e a noite, que devia acabar, recomeça. Quem age primeiro?");
        return;
      }
      const remorso = prompt.match(/teste_de_remorso para ([^(\n]+?) \(tem Manchas\)/);
      for (const nome of remorso ? remorso[1].split(/,\s*/).filter(Boolean) : []) await usar("teste_de_remorso", { personagem: nome.trim() });
      await usar("narrar", {
        texto:
          "A noite se recolhe devagar. Você volta ao refúgio com o gosto do que fez ainda na boca, e o silêncio do dia que chega pesa mais que qualquer conversa.\n\nAmanhã alguém vai bater à sua porta com perguntas. Por hoje, só o escuro.",
      });
      await usar("anotar_diario", { tipo: "nota", titulo: "Fim da noite", texto: "A noite terminou no refúgio; há perguntas esperando." });
      if (!/NÃO chame conceder_xp/.test(prompt)) {
        await usar("conceder_xp", { personagens: "todos", quantidade: /moeda/.test(prompt) ? 1 : 100, motivo: "pela noite jogada" });
        // "(xp por motivo)" no nome: uma chamada por motivo, como as regras de XP pedem (o servidor aceita as duas)
        if (/\(xp por motivo\)/i.test(sistema)) await usar("conceder_xp", { personagens: "todos", quantidade: 1, motivo: "pela Ambição perseguida" });
      }
      await diga("—");
      return;
    }

    // modo história: cena com título e música, NPC com personalidade, teste rolado pelo jogador e ações sugeridas
    if (tem("pedir_teste") || tem("sugerir_acoes")) {
      const sugerir = () =>
        usar("sugerir_acoes", {
          acoes: [
            { texto: "Agarrar o taverneiro pela gola e exigir a verdade", pericia: "Intimidação" },
            { texto: "Pagar uma bebida e puxar conversa com calma", pericia: "Persuasão" },
            { texto: "Examinar o lacre da carta antes de qualquer coisa", pericia: "Investigação" },
          ],
        });
      if (inicio) {
        await usar("atualizar_cena", {
          titulo: "Salão Comum",
          local: "Taverna do Javali Torto",
          momento: "Manhã",
          musica: { humor: "taverna", energia: "baixa" },
        });
        await usar("anotar_diario", {
          tipo: "npc",
          titulo: "Bruno Três-Dedos",
          texto: "Taverneiro, ex-soldado, sabe mais do que conta.",
          aparencia: "careca, avental manchado, falta dois dedos na mão esquerda",
          voz: "rouca e baixa",
          jeito: "limpa o balcão quando está nervoso",
          desejo: "pagar a dívida com o cartel sem sujar as mãos",
          temperamento: "desconfiado",
          relacao: "neutro",
          sexo: "homem",
          oficio: "taverneiro, ex-soldado",
        });
        // diário vivo: pessoa (mulher), lugar e item novos também viram chip em "o que mudou"
        await usar("anotar_diario", {
          tipo: "npc",
          titulo: "Irmã Celeste",
          texto: "Sacerdotisa da capela do sino; reza alto e escuta mais alto ainda.",
          sexo: "mulher",
          oficio: "sacerdotisa",
          status: "neutro",
        });
        await usar("anotar_diario", { tipo: "local", titulo: "Taverna do Javali Torto", texto: "Salão baixo, fumaça de sebo, um balcão que já viu facas." });
        await usar("anotar_diario", { tipo: "item", titulo: "Envelope com lacre de serpente", texto: "Deixado para você antes do sol nascer." });
        await usar("anotar_diario", {
          tipo: "missao",
          titulo: "A carta do cartel",
          texto: "Alguém deixou uma carta lacrada para você.",
          objetivo: "Descobrir quem mandou a carta e o que ela exige",
          pistas: ["O lacre tem uma serpente enrolada"],
        });
        await diga(
          "Um pano úmido estala no balcão a um palmo do seu nariz. **Bruno Três-Dedos** te encara com a paciência de quem já enterrou gente mais simpática.\n\n\"Acorda. Deixaram isso pra você antes do sol nascer\", ele diz, empurrando um envelope com lacre de serpente.",
        );
        await sugerir();
        return;
      }
      if (prompt.includes("(resultado do teste pedido)")) {
        const sucesso = /Sucesso/.test(prompt.slice(prompt.lastIndexOf("(resultado do teste pedido)")));
        await diga(
          sucesso
            ? "Bruno solta o pano devagar. \"Tá bom, tá bom\", ele resmunga. \"Foi um sujeito magro, lábio cortado. Cheirava a cravo.\""
            : "Bruno nem pisca. \"Sai do meu balcão antes que eu te sirva de petisco pros ratos.\" Metade da taverna agora olha para você.",
        );
        await usar("anotar_diario", { tipo: "missao", titulo: "A carta do cartel", pistas: [sucesso ? "O mensageiro tinha lábio cortado e cheirava a cravo" : "Bruno se recusou a falar"] });
        // NPC sem sexo informado: o retrato sai do nome (inferência ou sorteio pela semente)
        if (sucesso) await usar("anotar_diario", { tipo: "npc", titulo: "Hesper Vanko", texto: "O mensageiro magro de lábio cortado. Cheira a cravo.", oficio: "mensageiro" });
        await sugerir();
        return;
      }
      await diga(`Você decide: ${acao || "agir"}. O salão inteiro parece prender a respiração.\n\n`);
      await usar("pedir_teste", { personagem, teste: "Intimidação", alvo: 12, perigoso: false, motivo: "Arrancar a verdade do taverneiro" });
      await diga("Bruno aperta o pano entre os dedos que sobraram. Os olhos dele não desviam dos seus...");
      await sugerir();
      return;
    }

    if (inicio) {
      await usar("atualizar_cena", {
        local: "Taverna do Javali Caolho",
        momento: "Noite, primeiro dia",
        clima: "Garoa fria e insistente",
        situacao: "Um bardo desafina, a taverneira conta moedas e alguém lá fora não para de olhar pela janela.",
        musica: { humor: "taverna", energia: "baixa" },
      });
      await diga("A taverna range com o vento. Um bardo desafina no canto, alguém derruba uma caneca, e todos os olhos se viram para vocês. ");
      await usar("anotar_diario", { tipo: "npc", titulo: "Berta, a taverneira", texto: "Braços de ferreira, paciência de mosquito. Sabe tudo da estrada.", status: "neutro" });
      await usar("anotar_diario", { tipo: "missao", titulo: "O bandido da estrada velha", texto: "Berta paga 50 moedas por quem der um jeito no salteador que assusta as carroças." });
      await pausa(150, sinal);
      await diga("\n\nBerta bate um cartaz amassado no balcão. O que vocês fazem?");
      return;
    }

    if (combate.ativo) {
      const vivos = combate.inimigos.filter((i) => i.pv === null || i.pv > 0);
      const alvo = vivos[0];
      if (alvo) {
        await diga(`Aço contra aço: você parte para cima de ${alvo.nome}. `);
        const r = await usar<{ sucesso?: boolean }>("teste", { personagem, teste: "Ataque", alvo: escala.alvo, motivo: `Golpear ${alvo.nome}` });
        let caiu = false;
        if (r?.sucesso) {
          const dano = await usar<{ total: number }>("rolar_dados", { expressao: escala.danoJogador, motivo: `Dano em ${alvo.nome}` });
          if (dano) {
            caiu = alvo.pv !== null && dano.total >= alvo.pv;
            await usar("atualizar_cena", { combate: { acao: "atualizar", dano: [{ nome: alvo.nome, pv: dano.total }] } });
            await diga(caiu ? `${alvo.nome} desaba feito saco de batata. ` : `${alvo.nome} cambaleia, sangrando e ofendido. `);
          }
        } else if (r) {
          await diga("O golpe corta o ar e um pouco do seu orgulho. ");
        }
        const restantes = vivos.length - (caiu ? 1 : 0);
        if (restantes > 0) {
          const atacante = caiu ? vivos[1] : alvo;
          const golpe = await usar<{ total: number }>("rolar_dados", { expressao: escala.ataqueInimigo, motivo: `Ataque de ${atacante.nome}` });
          if (golpe && escala.acerto(golpe.total)) {
            const dano = await usar<{ total: number }>("rolar_dados", { expressao: escala.danoInimigo, motivo: `Dano de ${atacante.nome}` });
            if (dano) await usar("alterar_ficha", { personagem, pv: -dano.total, motivo: `Golpe de ${atacante.nome}` });
            await diga(`${atacante.nome} responde e acerta onde dói. `);
          } else if (golpe) {
            await diga(`${atacante.nome} erra por um fio de barba. `);
          }
          await usar("atualizar_cena", { combate: { acao: "proximo" } });
          await pausa(150, sinal);
          await diga("\n\nA luta continua. Quem age agora?");
          return;
        }
      }
      // luta acabou bem: a trilha troca para vitória (o mestre de verdade segue a mesma regra do prompt)
      await usar("atualizar_cena", { combate: { acao: "encerrar" }, situacao: "Silêncio, gemidos e o cheiro de vitória mal lavada.", musica: { humor: "vitoria", energia: "media" } });
      await diga("O último bandido cai. O silêncio que sobra parece até educado. ");
      await usar("conceder_xp", { personagens: "todos", quantidade: 150, motivo: "Venceram os salteadores da estrada" });
      await usar("anotar_diario", { tipo: "missao", titulo: "O bandido da estrada velha", status: "concluida", texto: "Os salteadores foram despachados. Falta cobrar a Berta." });
      await pausa(150, sinal);
      await diga("\n\nO que vocês fazem com os despojos?");
      return;
    }

    if (/descans|dorm|acamp|repous/.test(acao)) {
      await usar("atualizar_cena", { momento: "Amanhecer", situacao: "O grupo acorda com o corpo inteiro reclamando, mas inteiro." });
      await diga("Vocês dormem o sono dos injustos. Ninguém é assassinado durante a noite, o que já é um avanço. ");
      await usar("descansar", { personagens: "todos", tipo: /curt|pausa|rapid/.test(acao) ? "curto" : "longo" });
      await diga("\n\nO que vocês fazem?");
      return;
    }

    if (/atac|lut|brig|golpe|espad|machad|combat|soco|chut|emboscad/.test(acao) || sorte(0.3)) {
      // luta começou: a trilha troca para combate
      await usar("atualizar_cena", {
        local: "Estrada velha, saída da vila",
        situacao: "Dois salteadores saem do mato com facas enferrujadas e muita autoestima.",
        musica: { humor: "combate", energia: "alta" },
        combate: {
          acao: "iniciar",
          inimigos: [
            { nome: "Salteador", pv: escala.inimigo.pv, pvMax: escala.inimigo.pv, defesa: escala.inimigo.defesa, bonusIniciativa: 1 },
            { nome: "Salteador", pv: escala.inimigo.pv, pvMax: escala.inimigo.pv, defesa: escala.inimigo.defesa, bonusIniciativa: 1 },
          ],
        },
      });
      await usar("anotar_diario", { tipo: "npc", titulo: "Salteadores da estrada velha", texto: "Facas ruins, dentes piores. Trabalham para alguém.", status: "hostil" });
      await diga("Um assovio, um galho quebrado, e dois salteadores pulam do mato. Façam suas preces e rolem a iniciativa, que eu já rolei.");
      await pausa(150, sinal);
      await diga("\n\nQuem age primeiro?");
      return;
    }

    await diga("O mundo prende a respiração enquanto você tenta. ");
    const r = await usar<{ sucesso?: boolean }>("teste", { personagem, teste: "Percepção", alvo: escala.alvo, motivo: "Notar o perigo a tempo" });
    if (r) {
      await diga(r.sucesso ? "Você percebe a lâmina vindo e quase desvia. " : "Você não vê o golpe chegando. ");
      const dano = await usar<{ total: number }>("rolar_dados", { expressao: escala.arranhao, motivo: "Dano do bandido" });
      if (dano) await usar("alterar_ficha", { personagem, pv: -dano.total, motivo: "Corte do bandido" });
    }
    if (sorte(0.5)) {
      await usar("anotar_diario", { tipo: "nota", titulo: "Marca de bota com três pregos", texto: "Pegada estranha perto da janela da taverna. Alguém anda espiando." });
    }
    await pausa(150, sinal);
    await diga("\n\nO que vocês fazem?");
  },

  async texto({ sistema }) {
    // recapitulação do fim da noite (SISTEMA_RECAPITULACAO): o "Anteriormente…" de teste
    if (/Anteriormente/.test(sistema)) {
      return "Anteriormente… você chegou à taverna atrás de respostas, trocou golpes com quem não devia e voltou ao refúgio antes do sol, com uma pergunta ainda sem dono.";
    }
    return "Resumo de teste: o grupo chegou à taverna, brigou com um bandido e sobreviveu, por enquanto.";
  },
};
