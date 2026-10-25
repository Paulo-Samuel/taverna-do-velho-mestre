import http from "node:http";

// O Next só preenche x-forwarded-for quando ele NÃO veio na requisição (??=): qualquer celular da rede podia mandar
// "X-Forwarded-For: 127.0.0.1" + "Host: localhost" e passar por esta máquina (abrindo /config, que escolhe o executável
// que o servidor roda). Aqui, antes de o Next ver a requisição, o cabeçalho passa a ser sempre o IP real do socket.
// A taverna não roda atrás de proxy reverso; se um dia rodar, isto precisa confiar só no IP do proxy.

const g = globalThis as unknown as { __tavernaBlindada?: boolean };

export function blindarCabecalhos() {
  if (g.__tavernaBlindada) return;
  g.__tavernaBlindada = true;
  const emitOriginal = http.Server.prototype.emit as (this: http.Server, evento: string | symbol, ...args: unknown[]) => boolean;
  http.Server.prototype.emit = function (this: http.Server, evento: string | symbol, ...args: unknown[]) {
    if (evento === "request") {
      const req = args[0] as http.IncomingMessage;
      req.headers["x-forwarded-for"] = req.socket?.remoteAddress ?? "";
      delete req.headers["x-forwarded-host"];
    }
    return emitOriginal.call(this, evento, ...args);
  } as typeof http.Server.prototype.emit;
}
