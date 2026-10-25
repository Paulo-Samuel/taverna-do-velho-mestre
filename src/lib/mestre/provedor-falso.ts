import "server-only";
import type { OpcoesTurno, Provedor } from "./tipos";

// Mestre de mentira, para testar a interface e as regras sem gastar o plano nem créditos.
// Escreve um texto pré-montado aos poucos e chama as ferramentas de verdade: cena, diário,
// combate com iniciativa, testes, dano, XP e descanso. Lê o estado da cena do prompt de sistema
// (formato de cenaEmTexto em prompt.ts) porque não guarda nada entre turnos.

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

  async turno({ sistema, prompt, ferramentas, executar, emitir, sinal }: OpcoesTurno) {
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
    const combate = combateDoSistema(sistema);
    const escala = escalaDe(ferramentas);

    if (inicio) {
      await usar("atualizar_cena", {
        local: "Taverna do Javali Caolho",
        momento: "Noite, primeiro dia",
        clima: "Garoa fria e insistente",
        situacao: "Um bardo desafina, a taverneira conta moedas e alguém lá fora não para de olhar pela janela.",
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
      await usar("atualizar_cena", { combate: { acao: "encerrar" }, situacao: "Silêncio, gemidos e o cheiro de vitória mal lavada." });
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
      await usar("atualizar_cena", {
        local: "Estrada velha, saída da vila",
        situacao: "Dois salteadores saem do mato com facas enferrujadas e muita autoestima.",
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

  async texto() {
    return "Resumo de teste: o grupo chegou à taverna, brigou com um bandido e sobreviveu, por enquanto.";
  },
};
