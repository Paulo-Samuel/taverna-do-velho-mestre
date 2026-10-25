import { hostname, networkInterfaces } from "node:os";

// Endereços desta máquina na rede local (o que os outros aparelhos digitam no navegador).
// Sem "server-only" de propósito: o porteiro (src/proxy.ts) também usa, e ele não roda com a condição react-server.

export type EnderecoRede = {
  ip: string;
  /** nome da interface no sistema ("Wi-Fi", "Ethernet", "en0"...) */
  interfaceNome: string;
  /** adaptador virtual (Hyper-V, WSL, VirtualBox, Docker...): só aparece se não houver outro */
  virtual: boolean;
};

const VIRTUAIS = /vethernet|virtualbox|vbox|vmware|vmnet|hyper-v|wsl|docker|loopback|bluetooth|tailscale|zerotier|hamachi|npcap|utun|br-|veth|virbr/i;
const PREFERIDAS = /wi-?fi|wlan|wireless|ethernet|^eth|^en\d/i;

export function ipPrivado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** IPv4 da rede local, os mais prováveis primeiro (Wi-Fi/cabo, faixa privada). */
export function enderecosLocais(): EnderecoRede[] {
  const lista: EnderecoRede[] = [];
  for (const [nome, infos] of Object.entries(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      // 169.254.x.x é o "sem DHCP" do Windows: ninguém chega por ali
      if (info.address.startsWith("169.254.")) continue;
      lista.push({ ip: info.address, interfaceNome: nome, virtual: VIRTUAIS.test(nome) });
    }
  }
  const nota = (e: EnderecoRede) => (e.virtual ? 0 : 4) + (ipPrivado(e.ip) ? 2 : 0) + (PREFERIDAS.test(e.interfaceNome) ? 1 : 0);
  lista.sort((x, y) => nota(y) - nota(x));
  // adaptador virtual só confunde quem está com o celular na mão; fica apenas se não sobrar nada
  const reais = lista.filter((e) => !e.virtual);
  return reais.length ? reais : lista;
}

let cache: { em: number; nomes: Set<string> } | null = null;

/** Todos os nomes pelos quais esta máquina fala consigo mesma (loopback, IPs próprios, hostname). */
export function nomesDaMaquina(): Set<string> {
  if (cache && Date.now() - cache.em < 30_000) return cache.nomes;
  const nomes = new Set<string>(["localhost", "127.0.0.1", "::1"]);
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos ?? []) nomes.add(info.address.toLowerCase());
  }
  const h = hostname().toLowerCase();
  nomes.add(h);
  nomes.add(`${h}.local`);
  cache = { em: Date.now(), nomes };
  return nomes;
}

/** Porta em que o app atende: a da própria requisição, senão PORT, senão 3300. */
export function portaAtual(request?: Request): number {
  const daRequisicao = request ? Number(new URL(request.url).port) : 0;
  return daRequisicao || Number(process.env.PORT) || 3300;
}
