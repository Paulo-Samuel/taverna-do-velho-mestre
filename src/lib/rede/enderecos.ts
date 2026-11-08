import { execFile } from "node:child_process";
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

const VIRTUAIS = /vethernet|virtualbox|vbox|vmware|vmnet|hyper-v|wsl|docker|loopback|bluetooth|tailscale|zerotier|hamachi|npcap|utun|br-|veth|virbr|openvpn|tap-windows|wintun|wireguard/i;
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

// ---------- firewall do Windows ----------

/** "ok": algo libera a porta para a rede atual; "bloqueado": nada libera (ou há bloqueio); "desconhecido": não deu para saber. */
export type EstadoFirewall = "ok" | "bloqueado" | "desconhecido";

export type ConferenciaFirewall = {
  estado: EstadoFirewall;
  /** o porquê, curto: "regra da taverna", "node.exe liberado", "firewall desligado", "rede Pública sem regra"... */
  motivo: string;
  /** categoria das redes conectadas segundo o Windows (Private, Public, Domain) */
  categorias: string[];
};

/** Nome da regra que o atalho cria (e o README ensina a criar à mão). */
export function nomeRegraFirewall(porta = 3300) {
  return `Taverna do Velho Mestre (${porta})`;
}

/** Comando pronto para liberar a porta nas redes privadas (o que o convite e o doutor mostram para copiar). */
export function comandoLiberarFirewall(porta = 3300) {
  return `New-NetFirewallRule -DisplayName "${nomeRegraFirewall(porta)}" -Direction Inbound -Protocol TCP -LocalPort ${porta} -Action Allow -Profile Private`;
}

/**
 * Script PowerShell só de leitura: categoria das redes conectadas, perfil do firewall ligado, regra da taverna e regras do
 * node.exe (a que o Windows cria quando a pessoa aceita o aviso). Bloqueio vence liberação, como no próprio firewall.
 * Imprime uma linha "estado|motivo|categorias". O mesmo raciocínio está em iniciar-taverna.ps1 (Get-EstadoFirewall).
 */
export function scriptFirewall(porta = 3300): string {
  const nome = nomeRegraFirewall(porta).replace(/'/g, "''");
  return [
    "$ErrorActionPreference='SilentlyContinue'",
    "$cats=@(Get-NetConnectionProfile | ForEach-Object { ('' + $_.NetworkCategory) -replace 'DomainAuthenticated','Domain' } | Select-Object -Unique)",
    "if ($cats.Count -eq 0) { 'desconhecido|sem rede conectada|'; exit }",
    "$c=($cats -join ',')",
    "$ligados=@(Get-NetFirewallProfile | Where-Object { $cats -contains ('' + $_.Name) -and ('' + $_.Enabled) -eq 'True' })",
    "if ($ligados.Count -eq 0) { 'ok|firewall desligado nesta rede|' + $c; exit }",
    "function Cobre($r) { $p = '' + $r.Profile; if ($p -eq 'Any') { return $true }; foreach ($x in $cats) { if ($p -match $x) { return $true } }; return $false }",
    `$daTaverna=@(Get-NetFirewallRule -DisplayName '${nome}')`,
    "$doNode=@(Get-NetFirewallApplicationFilter | Where-Object { ('' + $_.Program) -like '*\\node.exe' } | Get-NetFirewallRule)",
    "$valem=@(@($daTaverna + $doNode) | Where-Object { ('' + $_.Enabled) -eq 'True' -and ('' + $_.Direction) -eq 'Inbound' -and (Cobre $_) })",
    "if (@($valem | Where-Object { ('' + $_.Action) -eq 'Block' }).Count -gt 0) { 'bloqueado|regra bloqueando o node.exe|' + $c; exit }",
    `if (@($valem | Where-Object { ('' + $_.Action) -eq 'Allow' -and ('' + $_.DisplayName) -eq '${nome}' }).Count -gt 0) { 'ok|regra da taverna|' + $c; exit }`,
    "if (@($valem | Where-Object { ('' + $_.Action) -eq 'Allow' }).Count -gt 0) { 'ok|node.exe liberado|' + $c; exit }",
    "'bloqueado|nenhuma regra libera a porta nesta rede|' + $c",
  ].join("\n");
}

/** Lê a linha "estado|motivo|categorias" do script; qualquer coisa estranha vira "desconhecido". */
export function lerSaidaFirewall(saida: string): ConferenciaFirewall {
  const linha = String(saida ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .pop();
  const [estado, motivo = "", categorias = ""] = (linha ?? "").split("|");
  if (estado !== "ok" && estado !== "bloqueado" && estado !== "desconhecido") {
    return { estado: "desconhecido", motivo: "não entendi a resposta do Windows", categorias: [] };
  }
  return { estado, motivo, categorias: categorias.split(",").filter(Boolean) };
}

/** Confere o firewall do Windows (só leitura, ~3 s por causa do PowerShell). Fora do Windows: "desconhecido". */
export function conferirFirewall(porta = 3300, tempoMs = 15_000): Promise<ConferenciaFirewall> {
  if (process.platform !== "win32") return Promise.resolve({ estado: "desconhecido", motivo: "só confiro no Windows", categorias: [] });
  return new Promise((ok) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", scriptFirewall(porta)],
      { timeout: tempoMs, windowsHide: true, encoding: "utf8" },
      (falha, saida) => ok(falha && !saida ? { estado: "desconhecido", motivo: "o PowerShell não respondeu", categorias: [] } : lerSaidaFirewall(String(saida))),
    );
  });
}

/** Motivo do "desconhecido" enquanto a primeira conferência ainda corre. */
export const MOTIVO_CONFERINDO = "conferindo…";

const gf = globalThis as unknown as { __tavernaFirewall?: Map<number, { em: number; valor?: ConferenciaFirewall; pendente?: Promise<ConferenciaFirewall> }> };

/**
 * O estado do firewall guardado por 2 minutos. Com `esperarMs`, espera a conferência até esse tempo; sem ela (ou se passar),
 * devolve o último valor conhecido (ou "desconhecido") e deixa a conferência correndo para a próxima vez. Assim o
 * /api/rede, que o atalho usa para saber se a taverna está no ar, nunca demora por causa do PowerShell.
 */
export async function estadoFirewall(porta = 3300, esperarMs = 0): Promise<ConferenciaFirewall> {
  const mapa = (gf.__tavernaFirewall ??= new Map());
  const atual = mapa.get(porta);
  if (atual?.valor && Date.now() - atual.em < 120_000) return atual.valor;
  let pendente = atual?.pendente;
  if (!pendente) {
    pendente = conferirFirewall(porta).then((valor) => {
      mapa.set(porta, { em: Date.now(), valor });
      return valor;
    });
    mapa.set(porta, { em: atual?.em ?? 0, valor: atual?.valor, pendente });
  }
  const reserva: ConferenciaFirewall = atual?.valor ?? { estado: "desconhecido", motivo: MOTIVO_CONFERINDO, categorias: [] };
  if (esperarMs <= 0) return reserva;
  return Promise.race([pendente, new Promise<ConferenciaFirewall>((ok) => setTimeout(() => ok(reserva), esperarMs))]);
}
