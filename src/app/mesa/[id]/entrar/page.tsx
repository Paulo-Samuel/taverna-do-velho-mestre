import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listarPersonagens, obterCampanha } from "@/lib/db";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { obterSistema } from "@/lib/sistemas";
import { temaDoSistema } from "@/lib/temas";
import { TemaPagina } from "@/components/tema-pagina";
import { listarPresenca } from "@/lib/tempo-real";
import { Entrada, type PersonagemEntrada } from "./entrada";

// Porta da mesa para quem chega pela rede: apelido, PIN (se houver) e escolha do personagem.
// Sem o PIN certo, a página mostra só o nome da mesa: nem a lista de personagens sai daqui.

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/mesa/[id]/entrar">): Promise<Metadata> {
  const { id } = await props.params;
  const c = obterCampanha(Number(id));
  return { title: c ? `Entrar em ${c.nome} · Taverna do Velho Mestre` : "Taverna do Velho Mestre" };
}

export default async function PaginaEntrar(props: PageProps<"/mesa/[id]/entrar">) {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  const sistema = obterSistema(campanha.sistema);
  const liberado = await acessoNaPagina(campanha);

  const personagens: PersonagemEntrada[] = liberado
    ? listarPersonagens(campanha.id).map((p) => ({
        id: p.id,
        nome: p.ficha.nome,
        jogador: p.jogador,
        resumo: [
          sistema.ancestralidades.find((a) => a.id === p.ficha.ancestralidade)?.nome,
          sistema.classes.find((c) => c.id === p.ficha.classe)?.nome,
          `${sistema.rotulos.nivel} ${p.ficha.nivel}`,
        ]
          .filter(Boolean)
          .join(" · "),
        pv: p.ficha.pv,
        pvMax: p.ficha.pvMax,
      }))
    : [];

  return (
    <>
      <TemaPagina tema={temaDoSistema(campanha.sistema)} />
      <Entrada
      campanha={{ id: campanha.id, nome: campanha.nome, cenario: campanha.cenario }}
      sistema={{ nome: sistema.nome, nomeCurto: sistema.nomeCurto }}
      temPin={Boolean(campanha.config.pin)}
      liberado={liberado}
      local={await daMaquinaNaPagina()}
      personagens={personagens}
      presenca={liberado ? listarPresenca(campanha.id).map((j) => ({ apelido: j.apelido, personagemId: j.personagemId, local: j.local })) : []}
      />
    </>
  );
}
