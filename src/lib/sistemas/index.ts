import "server-only";
import { publico } from "./comum";
import { d100 } from "./d100";
import { dnd5e } from "./dnd5e";
import { fate } from "./fate";
import { osr } from "./osr";
import { pbta } from "./pbta";
import { pf1e } from "./pf1e";
import { pf2e } from "./pf2e";
import type { Sistema, SistemaPublico } from "./tipos";

// Registro de sistemas. Para adicionar um sistema: crie o arquivo e inclua-o aqui.
export const SISTEMAS: Sistema[] = [dnd5e, pf2e, pf1e, osr, d100, fate, pbta];

export const SISTEMA_PADRAO = "dnd5e";

export function obterSistema(id: string): Sistema {
  return SISTEMAS.find((s) => s.id === id) ?? dnd5e;
}

export function sistemasPublicos(): SistemaPublico[] {
  return SISTEMAS.map(publico);
}
