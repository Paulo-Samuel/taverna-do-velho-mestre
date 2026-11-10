"use client";

import { useEffect, useRef, type RefObject } from "react";
import { SELETOR_FOCAVEL, proximoFoco } from "@/lib/foco-preso";

type Opcoes = { devolver?: boolean; reserva?: () => HTMLElement | null };

/** Armadilhas ativas, na ordem em que abriram: só a última age (o convite pode abrir por cima do códex). */
const pilha: symbol[] = [];

// getClientRects em vez de offsetParent: elemento com position fixed tem offsetParent nulo mesmo estando na tela.
const alcancavel = (el: HTMLElement) => el.isConnected && el.getClientRects().length > 0 && !el.closest("[inert]");

/**
 * Últimos elementos que tiveram foco, do mais recente para o mais antigo. Diálogo com autoFocus já puxou o foco para
 * dentro quando a armadilha arma; é daqui que sai o "quem tinha o foco antes" nesse caso.
 */
const rastro: HTMLElement[] = [];
if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const i = rastro.indexOf(e.target);
      if (i !== -1) rastro.splice(i, 1);
      rastro.unshift(e.target);
      if (rastro.length > 8) rastro.length = 8;
    },
    true,
  );
}

/** Rádio desmarcado de um grupo que já tem um marcado: o Tab pula (só as setas chegam nele). */
function radioForaDoTab(el: HTMLElement, conteiner: HTMLElement): boolean {
  if (!(el instanceof HTMLInputElement) || el.type !== "radio" || el.checked || !el.name) return false;
  return Array.from(conteiner.querySelectorAll<HTMLInputElement>('input[type="radio"]')).some((r) => r.checked && r.name === el.name && r.form === el.form);
}

/**
 * Só o que o Tab alcança de verdade. O seletor pega `button` e `a` mesmo com tabindex="-1" (abas com foco itinerante,
 * como as do códex): se um desses ficasse na ponta da lista, a borda real passaria batida e o foco sairia do diálogo.
 */
function focaveisDe(conteiner: HTMLElement): HTMLElement[] {
  return Array.from(conteiner.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
    (el) => el.tabIndex >= 0 && alcancavel(el) && !radioForaDoTab(el, conteiner),
  );
}

/**
 * Prende o Tab dentro do contêiner enquanto `ativo` e devolve o foco a quem o tinha quando a armadilha desliga.
 * Não move o foco ao abrir: cada diálogo já escolhe onde começar.
 */
export function useFocoPreso(ref: RefObject<HTMLElement | null>, ativo: boolean, opcoes?: Opcoes): void {
  // As opções costumam vir como objeto novo a cada renderização: ficam numa ref para não rearmar a armadilha à toa.
  const opcoesRef = useRef(opcoes);
  useEffect(() => {
    opcoesRef.current = opcoes;
  });

  useEffect(() => {
    if (!ativo) return;
    const ficha = Symbol("foco-preso");
    // O nó é guardado aqui porque na limpeza de uma desmontagem o ref já pode estar vazio.
    const conteinerInicial = ref.current;
    const ativoAgora = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const deFora = (el: HTMLElement) => !conteinerInicial || !conteinerInicial.contains(el);
    // Se o diálogo já puxou o foco para dentro (autoFocus), o "anterior" é o último de fora que teve foco.
    const anterior = ativoAgora && deFora(ativoAgora) ? ativoAgora : (rastro.find((el) => el.isConnected && deFora(el)) ?? null);
    pilha.push(ficha);

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
      if (pilha[pilha.length - 1] !== ficha) return;
      const conteiner = ref.current;
      if (!conteiner) return;
      const lista = focaveisDe(conteiner);
      if (lista.length === 0) {
        e.preventDefault();
        if (!conteiner.hasAttribute("tabindex")) conteiner.tabIndex = -1;
        conteiner.focus({ preventScroll: true });
        return;
      }
      const atual = lista.indexOf(document.activeElement as HTMLElement);
      const destino = proximoFoco(lista.length, atual, e.shiftKey);
      if (destino === null) return;
      e.preventDefault();
      lista[destino].focus();
    };
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      const i = pilha.indexOf(ficha);
      if (i !== -1) pilha.splice(i, 1);

      const { devolver, reserva } = opcoesRef.current ?? {};
      if (devolver === false) return;
      const foco = document.activeElement;
      const perdido = !foco || foco === document.body || (conteinerInicial !== null && conteinerInicial.contains(foco));
      // Se a pessoa já levou o foco para outro canto, ninguém rouba de volta.
      if (!perdido) return;
      const alvo = anterior && alcancavel(anterior) ? anterior : (reserva?.() ?? null);
      alvo?.focus({ preventScroll: true });
    };
  }, [ativo, ref]);
}
