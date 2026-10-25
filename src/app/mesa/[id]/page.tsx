import { notFound, redirect } from "next/navigation";
import { obterCampanha } from "@/lib/db";
import { estadoMesa } from "@/lib/mesa";
import { acessoNaPagina } from "@/lib/rede/acesso";
import { Mesa } from "./mesa";

export const dynamic = "force-dynamic";

export default async function PaginaMesa(props: PageProps<"/mesa/[id]">) {
  const { id } = await props.params;
  const { inicio } = await props.searchParams;
  const campanha = obterCampanha(Number(id));
  if (!campanha) notFound();
  // o HTML inicial já traz mensagens e fichas: sem o PIN, nada disso sai do servidor
  if (!(await acessoNaPagina(campanha))) redirect(`/mesa/${campanha.id}/entrar`);
  const estado = estadoMesa(campanha.id);
  if (!estado) notFound();
  // ?inicio=1 (criação sem "vou adicionar mais personagens"): o mestre abre a cena assim que a mesa monta
  return <Mesa estadoInicial={estado} comecarSozinho={inicio === "1" && estado.mensagens.length === 0} />;
}
