import type { NextRequest } from "next/server";
import { porteiro } from "./lib/rede/porteiro";

// Quem chega pela rede local só entra nas mesas; o resto da taverna é da máquina do mestre.
export function proxy(request: NextRequest) {
  return porteiro(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
