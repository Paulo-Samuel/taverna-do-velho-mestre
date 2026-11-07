import type { NextRequest } from "next/server";
import { porteiro } from "./lib/rede/porteiro";

// Quem chega pela rede local só entra nas mesas; o resto da taverna é da máquina do mestre.
// Toda resposta leva "x-taverna: 1": é por esse cabeçalho que iniciar-taverna.ps1 e atualizar-taverna.ps1 sabem que
// quem respondeu na porta foi a taverna, e não outro programa qualquer.
export function proxy(request: NextRequest) {
  const resposta = porteiro(request);
  resposta.headers.set("x-taverna", "1");
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
