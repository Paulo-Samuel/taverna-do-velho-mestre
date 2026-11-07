// Paginação do leitor cena a cena, medindo o DOM.
// O turno é desenhado num contêiner de colunas (uma coluna = uma página; column-fill: auto e altura fixa), e o próprio navegador
// quebra o texto entre as páginas, linha a linha. Parágrafos pequenos ganham data-inteiro (break-inside: avoid) para não serem
// partidos; só parágrafo grande quebra no meio. Cartões (dado, pedido de teste, cabeçalho) nunca quebram.
// Aqui ficam as medidas: em que página cai cada pedaço e onde cada página termina no "fio" do texto (posições contadas em
// caracteres visíveis, com cada cartão valendo 1), que é o que o revelar usa para parar no fim da página.

/** Espaço entre as colunas (px). Fica escondido pelo overflow do visor. */
export const VAO = 64;

export type Unidade =
  | { tipo: "texto"; no: Text; inicio: number; tamanho: number; fimDeBloco: boolean }
  | { tipo: "cartao"; el: HTMLElement; inicio: number; tamanho: 1 };

/** Os pedaços reveláveis do fluxo, na ordem: nós de texto dos parágrafos ([data-revelar]) e cartões ([data-cartao]). */
export function listarUnidades(fluxo: HTMLElement): { unidades: Unidade[]; total: number } {
  const unidades: Unidade[] = [];
  let pos = 0;
  for (const el of fluxo.querySelectorAll<HTMLElement>("[data-revelar],[data-cartao]")) {
    if (el.hasAttribute("data-cartao")) {
      unidades.push({ tipo: "cartao", el, inicio: pos, tamanho: 1 });
      pos += 1;
      continue;
    }
    const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let ultimo: Extract<Unidade, { tipo: "texto" }> | null = null;
    for (let n = andador.nextNode() as Text | null; n; n = andador.nextNode() as Text | null) {
      if (!n.data.length) continue;
      ultimo = { tipo: "texto", no: n, inicio: pos, tamanho: n.data.length, fimDeBloco: false };
      unidades.push(ultimo);
      pos += n.data.length;
    }
    if (ultimo) ultimo.fimDeBloco = true;
  }
  return { unidades, total: pos };
}

/** A unidade que contém a posição (busca binária; posições fora do fio dão a última). */
export function unidadeEm(unidades: Unidade[], pos: number): Unidade | null {
  let lo = 0;
  let hi = unidades.length - 1;
  if (hi < 0) return null;
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1;
    if (unidades[meio].inicio <= pos) lo = meio;
    else hi = meio - 1;
  }
  return unidades[lo];
}

/** Página de uma coordenada x (as colunas se repetem a cada `passo` px a partir de `base`). */
export function paginaDoX(x: number, base: number, passo: number): number {
  return Math.max(0, Math.floor((x - base + 1) / passo));
}

const faixa = typeof document !== "undefined" ? document.createRange() : null;

/** Página onde cai a posição do fio (null quando o pedaço não tem caixa: espaço colapsado, elemento escondido). */
function paginaDaPosicao(unidades: Unidade[], pos: number, base: number, passo: number): number | null {
  const u = unidadeEm(unidades, pos);
  if (!u) return null;
  if (u.tipo === "cartao") {
    const r = u.el.getClientRects()[0];
    return r ? paginaDoX(r.left, base, passo) : null;
  }
  if (!faixa || !u.no.data.length) return null;
  const off = Math.min(u.tamanho - 1, u.no.data.length - 1, Math.max(0, pos - u.inicio));
  faixa.setStart(u.no, off);
  faixa.setEnd(u.no, off + 1);
  const r = faixa.getClientRects()[0] ?? faixa.getBoundingClientRect();
  if (!r || (r.width === 0 && r.height === 0)) return null;
  return paginaDoX(r.left, base, passo);
}

/**
 * Onde termina cada página no fio: limites[k] = primeira posição que já está depois da página k (a última é o total).
 * As páginas crescem junto com o fio, então cada limite sai de uma busca binária.
 */
export function calcularLimites(unidades: Unidade[], total: number, paginas: number, base: number, passo: number): number[] {
  const pag = (pos: number) => {
    for (let p = pos; p >= Math.max(0, pos - 6); p--) {
      const k = paginaDaPosicao(unidades, p, base, passo);
      if (k !== null) return k;
    }
    return 0;
  };
  const limites: number[] = [];
  let lo = 0;
  for (let k = 0; k < paginas - 1; k++) {
    let a = lo;
    let b = total;
    while (a < b) {
      const meio = (a + b) >> 1;
      if (pag(meio) > k) b = meio;
      else a = meio + 1;
    }
    limites.push(a);
    lo = a;
  }
  limites.push(total);
  return limites;
}

/** Parágrafo com menos que isso da altura da página não é partido entre duas páginas. */
const FRACAO_INTEIRO = 0.26;

/** Marca os parágrafos pequenos com data-inteiro (a altura somada dos pedaços não depende de onde ele quebra: não entra em laço). */
export function marcarParagrafos(fluxo: HTMLElement, alturaPagina: number) {
  for (const p of fluxo.querySelectorAll<HTMLElement>("[data-revelar]")) {
    let altura = 0;
    for (const r of p.getClientRects()) altura += r.height;
    const inteiro = altura > 0 && altura < alturaPagina * FRACAO_INTEIRO;
    if (inteiro !== p.hasAttribute("data-inteiro")) p.toggleAttribute("data-inteiro", inteiro);
  }
}

/** Menor escala de um cartão encolhido para caber no fim da página (abaixo disso, ele pula de página mesmo). */
const ESCALA_MINIMA = 0.75;
/** No celular a tela já é apertada e o cartão nasce grande: aceita encolher um pouco mais. */
const ESCALA_MINIMA_CELULAR = 0.7;

/** A menor escala aceitável para um cartão encolhido caber no fim da página. */
export function escalaMinima(celular: boolean): number {
  return celular ? ESCALA_MINIMA_CELULAR : ESCALA_MINIMA;
}

/**
 * O conteúdo de que depende a decisão de encolher: a posição no fio de cada cartão encolhível (o que vem ANTES dele). O que vem
 * depois (a narração do mestre chegando, o "pensando" da cauda) e o que muda dentro do próprio cartão (o dado girando, a linha do
 * resultado) não entram: senão o cartão que a pessoa acabou de tocar era remedido a cada mudança, oscilava entre a página em que
 * coube encolhido e a seguinte, e a página ia atrás dele e ficava vazia. Cartão novo ou texto chegando antes de um cartão mudam a
 * assinatura (e aí a conta é refeita por limparCompactos + compactarCartoes).
 */
export function assinaturaDosCompactaveis(unidades: Unidade[]): string {
  return unidades
    .filter((u) => u.tipo === "cartao" && u.el.hasAttribute("data-compactavel"))
    .map((u) => u.inicio)
    .join(",");
}

/**
 * Cartão grande (pedido de teste, teste) que não coube no fim da página e pulou para a seguinte, deixando um buraco: se encolhido
 * um pouco (zoom até a escala mínima, sem o respiro grande em volta) ele cabe no espaço que sobrou, encolhe e fica. O pedido de
 * teste pendente (.pedido-teste) tem ainda uma versão compacta (sem retrato, motivo numa linha, menos respiro: data-versao-compacta,
 * desenhada pelo ESTILO do leitor), tentada quando o cartão inteiro não cabe nem encolhido. Roda também com o cartão ainda
 * escondido pelo revelar (data-leitor-oculto: visibility hidden conserva as caixas). Devolve true quando mexeu em algum.
 * Cada cartão é avaliado uma vez por tamanho de palco e conteúdo (data-compacto guarda a decisão; limparCompactos desfaz).
 */
export function compactarCartoes(fluxo: HTMLElement, alturaPagina: number, minima = ESCALA_MINIMA): boolean {
  const cs = getComputedStyle(fluxo);
  const caixa = fluxo.getBoundingClientRect();
  const topo = caixa.top + parseFloat(cs.paddingTop);
  const fundo = topo + alturaPagina;
  const pecas = [...fluxo.querySelectorAll<HTMLElement>("[data-revelar],[data-cartao]")];
  // encolhido, o cartão perde o respiro grande (margem de 0,6rem, ver o ESTILO do leitor) e a escala cobre o resto
  const margens = 2 * 0.6 * parseFloat(getComputedStyle(document.documentElement).fontSize);
  let mexeu = false;
  for (const el of fluxo.querySelectorAll<HTMLElement>("[data-compactavel]:not([data-compacto])")) {
    const r = el.getClientRects()[0];
    if (!r || r.height < 40) continue;
    // cartão mais alto que a página inteira (tela baixa, notebook a 125 %+): nem sozinho numa página ele cabe e o botão de rolar
    // fica cortado embaixo. Vai para a versão compacta e encolhe o que for preciso para caber numa página (aqui não há mínimo
    // que valha a pena: cortado é pior que miúdo).
    if (r.height + margens > alturaPagina - 4) {
      if (el.querySelector(".pedido-teste")) el.setAttribute("data-versao-compacta", "");
      const rv = el.getClientRects()[0] ?? r;
      const escala = Math.max(0.5, Math.floor(Math.min(0.97, (alturaPagina - margens - 8) / rv.height) * 100) / 100);
      el.setAttribute("data-compacto", String(escala));
      el.style.setProperty("zoom", String(escala));
      mexeu = true;
      continue;
    }
    // só cartão no topo de uma página que não é a primeira
    if (r.top - topo > 28 || r.left - caixa.left < 10) continue;
    const i = pecas.indexOf(el);
    const antes = i > 0 ? pecas[i - 1] : null;
    const rs = antes ? antes.getClientRects() : null;
    const ultimo = rs && rs.length ? rs[rs.length - 1] : null;
    if (!ultimo || ultimo.left >= r.left - 10) continue;
    const livre = fundo - ultimo.bottom - 12;
    const escalaPara = (altura: number) => Math.floor(Math.min(0.97, livre / (altura + margens)) * 100) / 100;
    let escala = escalaPara(r.height);
    // nem encolhido cabe: o pedido de teste pendente tem a versão compacta; mede de novo com ela (já é miúda: aceita até 0,7)
    let piso = minima;
    if (escala < minima && el.querySelector(".pedido-teste")) {
      el.setAttribute("data-versao-compacta", "");
      const rv = el.getClientRects()[0];
      escala = rv ? escalaPara(rv.height) : 0;
      piso = Math.min(minima, ESCALA_MINIMA_CELULAR);
      if (escala < piso) el.removeAttribute("data-versao-compacta");
    }
    if (escala < piso) {
      el.setAttribute("data-compacto", "não");
      continue;
    }
    el.setAttribute("data-compacto", "tentando");
    el.style.setProperty("zoom", String(escala));
    // não voltou para a página de antes (quebra de linha, regra de órfãs): desiste e deixa como era
    const depois = el.getClientRects()[0];
    if (depois && Math.abs(depois.left - r.left) < 10) {
      el.style.removeProperty("zoom");
      el.removeAttribute("data-versao-compacta");
      el.setAttribute("data-compacto", "não");
      continue;
    }
    el.setAttribute("data-compacto", String(escala));
    mexeu = true;
  }
  return mexeu;
}

/**
 * O que a barra faz quando o cartão em destaque (o teste pendente do personagem ativo) caiu em outra página: nada enquanto ele
 * está nesta página ou antes dela (ou a página ainda se revela); quando a página termina, avança sozinho se a pessoa acompanhou o
 * texto se revelando (ou a cena já estava lida ao abrir), senão só chama ("continuar para o dado ▸") e deixa a pessoa virar.
 */
export function rumoAoDado({
  paginaDoDestaque,
  paginaAtual,
  completa,
  automatico,
}: {
  paginaDoDestaque: number | null;
  paginaAtual: number;
  completa: boolean;
  automatico: boolean;
}): "nada" | "chamar" | "avancar" {
  if (paginaDoDestaque === null || paginaDoDestaque <= paginaAtual || !completa) return "nada";
  return automatico ? "avancar" : "chamar";
}

/**
 * Fecho da cena sozinho na última página (o "Fim da noite"; os chips de "o que mudou" ficam fora do fluxo, na faixa acima da
 * barra): em vez de grudado no topo de uma página vazia, desce para perto do centro ótico, como a última página de um capítulo.
 * Usa padding (margem some na quebra de coluna).
 */
export function centrarFecho(fluxo: HTMLElement, alturaPagina: number, paginas: number, passo: number) {
  const filhos = [...fluxo.children] as HTMLElement[];
  for (const el of filhos) if (el.style.paddingTop) el.style.removeProperty("padding-top");
  if (paginas < 2) return;
  const base = fluxo.getBoundingClientRect().left;
  const ultima = base + (paginas - 1) * passo - 2;
  // o que tem algum pedaço na última página (a prosa que começou antes e termina nela também conta)
  const naUltima = filhos.filter((el) => {
    const rs = el.getClientRects();
    return rs.length > 0 && rs[rs.length - 1].left >= ultima;
  });
  if (!naUltima.length || !naUltima.every((el) => el.hasAttribute("data-fecho"))) return;
  if (naUltima[0].getClientRects()[0].left < ultima) return;
  const topo = naUltima[0].getBoundingClientRect().top;
  const fundo = Math.max(...naUltima.map((el) => el.getBoundingClientRect().bottom));
  const livre = alturaPagina - (fundo - topo) - 24;
  if (livre > 60) naUltima[0].style.setProperty("padding-top", `${Math.round(livre * 0.36)}px`);
}

/**
 * Desfaz os cartões encolhidos (o palco mudou de tamanho ou chegou conteúdo: a conta muda), menos o `protegido`: o cartão com que
 * a pessoa está mexendo agora (rolando o dado) fica como está, porque no meio da rolagem ele passa por tamanhos passageiros (botão
 * → "o dado corre pela mesa" → resultado) e uma conta feita nesse instante o deixaria encolhido de menos, pulando de página logo
 * em seguida; e a própria rolagem mexe no palco (a barra de "role o dado" vira o campo de ação).
 */
export function limparCompactos(fluxo: HTMLElement, protegido: Element | null = null) {
  for (const el of fluxo.querySelectorAll<HTMLElement>("[data-compacto],[data-versao-compacta]")) {
    if (el === protegido) continue;
    el.removeAttribute("data-compacto");
    el.removeAttribute("data-versao-compacta");
    el.style.removeProperty("zoom");
  }
}

/** O texto de cada página (para ouvir a página atual): parágrafos separados por linha em branco. */
export function textosDasPaginas(unidades: Unidade[], limites: number[]): string[] {
  const textos = limites.map(() => "");
  let k = 0;
  for (const u of unidades) {
    if (u.tipo !== "texto") continue;
    let ini = u.inicio;
    const fim = u.inicio + u.tamanho;
    while (ini < fim) {
      while (k < limites.length - 1 && ini >= limites[k]) k++;
      const ate = Math.min(fim, limites[k]);
      textos[k] += u.no.data.slice(ini - u.inicio, ate - u.inicio);
      ini = ate;
      if (ini === fim && u.fimDeBloco) textos[k] += "\n\n";
      if (ate === limites[k] && k < limites.length - 1) k++;
    }
  }
  return textos.map((t) => t.trim());
}
