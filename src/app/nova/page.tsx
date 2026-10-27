import type { Metadata } from "next";
import { connection } from "next/server";
import { CriacaoHistoria } from "@/components/historia/criacao/criacao-historia";
import { obterSistema } from "@/lib/sistemas";
import { publico } from "@/lib/sistemas/comum";
import { criarHistoriaAcao } from "./historia-acoes";

export const metadata: Metadata = { title: "Nova história · Taverna do Velho Mestre" };

// Criação rápida do modo história: nome, aparência, ofício, passado e onde começa. As regras ficam escondidas atrás do balcão.
export default async function NovaHistoria() {
  // a cada visita, outros nomes e outros rostos sugeridos (a semente vem do servidor para o HTML bater com o navegador)
  await connection();
  const semente = crypto.randomUUID().slice(0, 8);
  return <CriacaoHistoria sistema={publico(obterSistema("historia"))} semente={semente} acao={criarHistoriaAcao} />;
}
