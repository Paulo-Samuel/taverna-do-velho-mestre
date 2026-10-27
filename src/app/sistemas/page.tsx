import type { Metadata } from "next";
import { aventurasDoSistema } from "@/lib/aventuras";
import { sistemasPublicos } from "@/lib/sistemas";
import { AvisoDarkPack, DECLARACAO_DARK_PACK } from "@/components/aviso-dark-pack";
import { Catalogo, type ItemCatalogo } from "./catalogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sistemas · Taverna do Velho Mestre" };

// Texto de atribuição que cada licença pede. O resumo curto de cada sistema vem do próprio registro (Sistema.licenca);
// aqui fica a forma longa, que algumas licenças exigem quase palavra por palavra (por isso parte está no original em inglês).
const ATRIBUICAO: Record<string, string> = {
  dnd5e:
    "This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
  pf2e:
    "Usa regras do Pathfinder Remaster (Player Core, GM Core e afins), de Paizo Inc., sob a ORC License. O material aberto é usado como mecânica; nomes próprios do cenário ficam de fora. Não é um produto oficial nem endossado pela Paizo.",
  pf1e:
    "Usa material do Pathfinder Roleplaying Game Reference Document (Paizo Inc.) e do System Reference Document 3.5 (Wizards of the Coast), sob a Open Game License 1.0a. Apenas mecânicas declaradas como Open Game Content; sem Product Identity.",
  osr: "Regras no estilo das edições básicas dos anos 80, a partir de conteúdo aberto sob a Open Game License 1.0a (SRD 5.1/3.5 e clones old-school de licença aberta). Textos de descrição escritos pela taverna.",
  d100: "Baseado no Basic Roleplaying: Universal Game Engine, de Chaosium Inc., sob a ORC License. Não usa marcas nem cenários da Chaosium.",
  fate:
    "This work is based on Fate Core System and Fate Accelerated Edition (found at http://www.faterpg.com/), products of Evil Hat Productions, LLC, developed, authored, and edited by Leonard Balsera, Brian Engard, Jeremy Keller, Ryan Macklin, Mike Olson, Clark Valentine, Amanda Valentine, Fred Hicks, and Rob Donoghue, and licensed for our use under the Creative Commons Attribution 3.0 Unported license (http://creativecommons.org/licenses/by/3.0/).",
  vtm5: `Fã-conteúdo gratuito e não oficial sob a política Dark Pack da Paradox Interactive. Vampire: The Masquerade e World of Darkness são marcas da Paradox Interactive AB. ${DECLARACAO_DARK_PACK}`,
  pbta: "Baseado em Dungeon World, de Sage LaTorra e Adam Koebel, licenciado sob Creative Commons Attribution 3.0 Unported (http://creativecommons.org/licenses/by/3.0/).",
};

const MECANICA: Record<string, string> = {
  d20: "d20 + modificador contra uma dificuldade",
  d100: "rolar abaixo da porcentagem da perícia",
  "4dF": "quatro dados Fate (+, −, branco) somados à escada",
  d10: "parada de d10 (atributo + perícia): 6+ é sucesso, par de 10 é crítico e os dados de Fome mordem",
  "2d6": "2d6 + atributo: 10+ acerto, 7–9 com custo, 6− o mestre faz um movimento",
};

export default function PaginaSistemas() {
  const itens: ItemCatalogo[] = sistemasPublicos().map((s) => ({
    id: s.id,
    nome: s.nome,
    nomeCurto: s.nomeCurto,
    descricao: s.descricao,
    licenca: s.licenca,
    atribuicao: ATRIBUICAO[s.id] ?? null,
    dadoPrincipal: s.dadoPrincipal,
    mecanica: MECANICA[s.dadoPrincipal] ?? null,
    pronto: s.pronto,
    rotuloClasse: s.rotulos.classe,
    rotuloAncestralidade: s.rotulos.ancestralidade,
    nivelMaximo: s.nivelMaximo,
    atributos: s.atributos.length,
    pericias: s.pericias.length,
    antecedentes: s.antecedentes?.length ?? 0,
    aventuras: aventurasDoSistema(s.id).length,
    // só o que a lista mostra: manda menos coisa para o navegador
    classes: s.classes.map((c) => ({ id: c.id, nome: c.nome, descricao: c.descricao, detalhe: [c.papel, c.fonte].filter(Boolean).join(" · ") })),
    ancestralidades: s.ancestralidades.map((a) => ({
      id: a.id,
      nome: a.nome,
      descricao: a.descricao,
      detalhe: [a.deslocamento, ...(a.tracos ?? [])].filter(Boolean).join(" · "),
    })),
  }));
  const prontos = itens.filter((i) => i.pronto).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="titulo text-3xl text-pergaminho sm:text-4xl">Sistemas da casa</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {itens.length} jeitos de rolar dados e se arrepender, {prontos} já servidos na mesa. Quase todos de licença aberta (Vampiro entra como fã-conteúdo do Dark Pack): a
        taverna escreveu as descrições com as próprias palavras (e o próprio veneno).
      </p>
      <Catalogo itens={itens} />
      <div className="mt-10 border-t border-border pt-6">
        <AvisoDarkPack />
      </div>
    </main>
  );
}
