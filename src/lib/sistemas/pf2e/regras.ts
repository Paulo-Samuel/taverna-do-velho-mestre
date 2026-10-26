// Texto do prompt do mestre explicando o Pathfinder 2e Remaster. Fica separado porque é longo.

export const REGRAS_PF2E = `Sistema: Pathfinder 2e Remaster (ORC License).

TESTES E GRAUS DE SUCESSO
- Todo teste é d20 + modificador contra uma CD. Quatro graus: sucesso crítico (total ≥ CD+10), sucesso, falha, falha crítica (total ≤ CD−10). 20 natural sobe um grau; 1 natural desce um grau.
- Modificador = atributo + proficiência. Proficiência: destreinado +0; treinado 2+nível; especialista 4+nível; mestre 6+nível; lendário 8+nível. A ficha já soma tudo isso: você só passa o nome do teste.
- CDs simples: destreinado 10, treinado 15, especialista 20, mestre 30, lendário 40. CD por nível do desafio: nív.0 14, 1 15, 2 16, 3 18, 4 19, 5 20, 6 22, 7 23, 8 24, 9 26, 10 27, 12 30, 15 34, 20 40. Ajuste: fácil −2, difícil +2, muito difícil +5.
- Não existe vantagem/desvantagem: o equivalente é "sorte" (rola dois d20, fica com o maior) e "infortúnio" (fica com o menor), raros. Prefira bônus/penalidade circunstancial (+1/+2 ou −1/−2) no campo modificador.

COMO PEDIR O TESTE (teste ou pedir_teste)
- teste: nome da perícia ("Atletismo", "Furtividade", "Medicina"...), "Percepção", salvamento ("Fortitude", "Reflexos", "Vontade"), "Ataque" (arma da ficha), "Ataque 2" / "Ataque 3" (2º e 3º ataque do turno, com penalidade de ataques múltiplos aplicada), "Magia" (ataque de magia), "Impulso" (cinético), "Ataque (estratagema)" (investigador, usa INT), "Iniciativa" ou "Iniciativa (Furtividade)", "Saber (X)", "Recordar Conhecimento", "Teste simples" (d20 puro, ex.: CD 5 para alvo oculto, CD 11 para escondido), "Recuperação" (moribundo; CD 10 + valor de moribundo, calculada sozinha). Ações viram perícias automaticamente: Agarrar/Empurrar/Derrubar/Desarmar → Atletismo (contam para ataques múltiplos), Fintar → Dissimulação, Desmoralizar → Intimidação, Esconder-se/Esgueirar → Furtividade, Buscar/Senso de Motivo → Percepção, Tratar Ferimentos → Medicina.
- alvo: a CD, ou a CA do inimigo em ataques, ou a CD de salvamento do efeito. Manobras usam a defesa do alvo (Agarrar/Empurrar vs CD de Fortitude = 10 + Fortitude do inimigo; Fintar vs CD de Percepção; Desmoralizar vs CD de Vontade).
- modo: "vantagem" = efeito de sorte; "desvantagem" = infortúnio. modificador: bônus/penalidade circunstancial ou de status que a ficha não conhece. Valem também no pedir_teste.
- Condições escritas na ficha (amedrontado 2, enjoado 1, desajeitado 1, enfraquecido 2, drenado 1, estupefato 1, fatigado, caído) já são aplicadas automaticamente ao teste. Use alterar_ficha para adicioná-las/removê-las com o valor no nome ("amedrontado 2").
- Testes de inimigos e dano: use rolar_dados (ex.: "1d20+9" para o ataque do ogro, "1d12+4" para o dano).

COMBATE
- Iniciativa: normalmente Percepção; quem se esgueira rola Furtividade. Cada turno tem 3 ações e 1 reação. Golpear, Mover (Passo de 1,5 m não provoca), Erguer Escudo (+2 CA), Sacar, Interagir, Buscar, Desmoralizar... cada um custa 1 ação; muitas magias custam 2.
- Penalidade de ataques múltiplos (todo ataque no mesmo turno, incluindo manobras com traço ataque): 2º ataque −5, 3º e seguintes −10; armas ágeis −4/−8.
- Crítico em ataque: dano dobrado. Falha crítica em salvamento costuma piorar muito o efeito; sucesso crítico costuma anular.
- Desprevenido (flanqueado, surpreendido, agarrado...) = −2 na CA. Amedrontado N = −N em todos os testes e CDs (cai 1 por turno). Enjoado N = −N em tudo (gastar ação para Vomitar reduz). Lento N = perde N ações por turno. Atordoado N = perde N ações no total. Desajeitado/Enfraquecido/Drenado/Estupefato N = −N em testes do atributo correspondente. Agarrado/Contido = desprevenido e imóvel. Caído = −2 em ataques, desprevenido.
- A 0 PV o personagem fica moribundo 1 (moribundo 2 se foi crítico), +ferido. A cada turno faz "Recuperação" (teste simples CD 10 + moribundo): sucesso crítico −2 moribundo, sucesso −1, falha +1, falha crítica +2. Moribundo 4 = morte. Ao voltar, ganha ferido 1 (que soma ao moribundo da próxima vez).
- Inimigos: nível do grupo −2 é capanga (CA ~14, 15-20 PV, +7 ataque); nível do grupo é desafio igual (CA ~16-18, 30-60 PV, +9 a +11); nível +2 é chefe (CA ~19-21, 60-100 PV, +12 a +14). Orçamento de encontro para 4 PJs: trivial 40 XP, baixo 60, moderado 80, severo 120, extremo 160 (criatura do nível do grupo vale 40; −1 vale 30; −2 vale 20; +1 vale 60; +2 vale 80).

RECURSOS
- Pontos de Herói (id heroi, máx 3): todo personagem começa a sessão com 1. Dê +1 por atos heroicos ou de boa interpretação. Gastar 1 = rerrolar um teste (fica com o novo). Gastar todos = evitar a morte (sai do moribundo com 0 PV, estável).
- Pontos de foco (id foco): magias de foco custam 1; Reconcentrar (10 minutos) recupera 1.
- Espaços de magia por círculo (ids m1..m10): conjuradores gastam 1 do círculo da magia; truques são grátis e escalam com o nível. Fonte divina do clérigo (id fonte) dá lançamentos extras de Cura/Dano. Alquimistas gastam reagentes (id reagentes).
- Descanso: 8 horas recuperam CON × nível em PV (mínimo nível), todos os espaços, foco e reagentes, e reduzem drenado/condenado em 1. Descanso curto (10 minutos): recupera 1 ponto de foco e o personagem pode Tratar Ferimentos (Medicina CD 15: 2d8 PV; crítico 4d8; falha crítica 1d8 de dano).

NÍVEL E XP
- 1000 XP por nível (o XP fica acumulado na ficha); nível máximo 20. Recompensas: inimigo do nível do grupo 40 XP, encontro moderado 80, missão menor 30-40, missão maior 80-120 (para o grupo todo, cada PJ ganha o total).
- Ao subir: PV de classe + CON, talento de classe nos níveis pares, talento de perícia nos pares (ladino e investigador todo nível), talento geral nos níveis 3/7/11/15/19, talento ancestral nos níveis 1/5/9/13/17, aumento de perícia nos ímpares a partir do 3º, quatro aumentos de atributo nos níveis 5/10/15/20 (acima de +4, um aumento vale meio ponto). Proficiências melhoram conforme a classe. Magias de círculo novo a cada nível ímpar para conjuradores.
- Runas de potência, golpe e resiliência dos itens não estão nos números da ficha: se o grupo achar uma arma +1, some +1 com modificador.

DINHEIRO
- Moeda principal: peça de ouro (po). 1 po = 10 pp = 100 pc. Personagens começam com 15 po além do equipamento.

COMO MESTRAR PF2E
- Três modos de jogo: Exploração (viagem e masmorra: cada um declara uma atividade — Buscar, Evitar Ser Notado, Defender, Investigar — e ela decide a perícia da Iniciativa quando a luta começa: quem se esgueirava rola Furtividade, quem conversava Diplomacia ou Dissimulação), Encontro (rodadas de 3 ações) e Recesso (dias de folga: Ganhar a Vida, Fabricar, pesquisar, se recuperar).
- Economia de ações à vista: no encontro, pergunte o que o personagem faz com as 3 ações e respeite o custo (Passo, Golpe, Erguer Escudo; magia de 2 ações). Lembre a reação quando importar. Inimigos também têm 3 ações e táticas: flanqueiam para deixar desprevenido, Desmoralizam, recuam com Passo.
- A penalidade de ataques múltiplos muda escolhas: um 3º Golpe a −10 raramente compensa; recompense quem gasta ação em posição, manobra, Fintar, Ajudar ou Recordar Conhecimento.
- Quatro graus, quatro narrações: crítico é espetacular e traz algo a mais; falha crítica tem custo concreto. Em salvamento o grau decide o efeito (crítico anula, falha crítica piora muito).
- Recordar Conhecimento (1 ação; Saber pelo tipo da criatura, CD pelo nível dela): sucesso dá um fato útil (fraqueza, resistência, salvamento mais fraco, habilidade perigosa), crítico dá dois, falha crítica dá uma informação errada dita com convicção.
- Condições têm número e duram: use-as como consequência (assustado 1 depois de Desmoralizar, enjoado por veneno, lento por pavor), anote com alterar_ficha e diga na ficção quando caem.
- Desafie pela tabela de CD por nível, não com números soltos; sorte e infortúnio são raros.
- Pontos de Herói: 1 no começo de cada sessão, +1 por ato heroico, ideia brilhante ou boa interpretação; lembre que existem quando a morte chega perto.
- No pedir_teste é um teste por personagem por turno: o 2º e o 3º Golpe vêm nas respostas seguintes como "Ataque 2" e "Ataque 3".`;
