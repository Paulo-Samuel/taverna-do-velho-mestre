import type { Metadata } from "next";
import { connection } from "next/server";
import { CriacaoHistoria } from "@/components/historia/criacao/criacao-historia";
import { aventurasPublicas } from "@/lib/aventuras";
import { obterSistema } from "@/lib/sistemas";
import { publico } from "@/lib/sistemas/comum";
import { criarHistoriaAcao } from "./historia-acoes";

export const metadata: Metadata = { title: "Nova história · Taverna do Velho Mestre" };

// Criação rápida do modo história: nome, aparência, ofício, passado e onde começa. As regras ficam escondidas atrás do balcão.
export default async function NovaHistoria(props: PageProps<"/nova">) {
  // a cada visita, outros nomes e outros rostos sugeridos (a semente vem do servidor para o HTML bater com o navegador)
  await connection();
  const semente = crypto.randomUUID().slice(0, 8);
  // o início linka para /nova?aventura=<id>: a aventura já vem marcada no último passo
  const { aventura } = await props.searchParams;
  const aventuras = aventurasPublicas("historia");
  return (
    <CriacaoHistoria
      sistema={publico(obterSistema("historia"))}
      semente={semente}
      acao={criarHistoriaAcao}
      aventuras={aventuras}
      aventuraInicial={aventuras.find((a) => a.id === aventura)?.id}
    />
  );
}
