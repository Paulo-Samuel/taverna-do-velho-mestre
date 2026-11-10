import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { obterCampanha } from "@/lib/db";
import { estadoMesa } from "@/lib/mesa";
import { acessoNaPagina, daMaquinaNaPagina } from "@/lib/rede/acesso";
import { Mesa } from "./mesa";
import { MesaHistoria } from "./mesa-historia";

export const dynamic = "force-dynamic";

// nome da campanha na aba; mesa com PIN vista pela rede não entrega o nome antes do PIN
export async function generateMetadata(props: PageProps<"/mesa/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const campanha = obterCampanha(Number(id));
  if (!campanha) return { title: "Porta errada" };
  if (!(await acessoNaPagina(campanha))) return { title: "Mesa" };
  return { title: campanha.nome };
}

export default async function PaginaMesa(props: PageProps<"/mesa/[id]">) {
  const { id } = await props.params;
  const { inicio } = await props.searchParams;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  // o HTML inicial já traz mensagens e fichas: sem o PIN, nada disso sai do servidor
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);
  // na máquina da taverna o primeiro personagem já fica ativo (hot-seat); pela rede, quem não reivindicou só assiste
  const estado = estadoMesa(campanha.id, { local: await daMaquinaNaPagina() });
  if (!estado) notFound();
  // ?inicio=1 (criação sem "vou adicionar mais personagens"): o mestre abre a cena assim que a mesa monta
  const comecarSozinho = inicio === "1" && estado.mensagens.length === 0;
  return estado.campanha.modoJogo === "historia" ? (
    <MesaHistoria estadoInicial={estado} comecarSozinho={comecarSozinho} />
  ) : (
    <Mesa estadoInicial={estado} comecarSozinho={comecarSozinho} />
  );
}
