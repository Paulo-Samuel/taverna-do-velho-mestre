import QRCode from "qrcode";
import { obterCampanha } from "@/lib/db";
import { acessoPermitido, ehLocal } from "@/lib/rede/acesso";
import { comandoLiberarFirewall, enderecosLocais, estadoFirewall, portaAtual } from "@/lib/rede/enderecos";

// Endereços desta máquina na rede local, com o link de entrada da mesa e um QR code (SVG) para cada um.
// GET /api/rede?campanha=<id>
// Também diz se o firewall do Windows deixa os celulares entrarem: firewall "ok" | "bloqueado" | "desconhecido".

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const campanhaId = Number(new URL(request.url).searchParams.get("campanha"));
  const campanha = campanhaId ? obterCampanha(campanhaId) : null;
  if (campanhaId && !campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (campanha && !acessoPermitido(request, campanha)) return Response.json({ erro: "Esta mesa pede PIN." }, { status: 403 });

  const porta = portaAtual(request);
  const caminho = campanha ? `/mesa/${campanha.id}/entrar` : "/";
  const enderecos = await Promise.all(
    enderecosLocais().map(async (e) => {
      const url = `http://${e.ip}:${porta}${caminho}`;
      // QR com as cores da taverna: escuro sobre pergaminho (leitor de celular precisa de contraste)
      const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#120d0a", light: "#f1e4c4" } });
      return { ip: e.ip, interfaceNome: e.interfaceNome, url, qr };
    }),
  );

  // Firewall do Windows (só leitura, guardado por 2 min). Quem abre o Convidar (com ?campanha) espera a primeira conferência;
  // o atalho, que só quer saber se a taverna está no ar, recebe o último valor conhecido sem esperar o PowerShell.
  const local = ehLocal(request);
  const firewall = await estadoFirewall(porta, campanha && local ? 6000 : 0);

  return Response.json(
    {
      local,
      porta,
      dev: process.env.NODE_ENV === "development",
      temPin: Boolean(campanha?.config.pin),
      enderecos,
      firewall: firewall.estado,
      // detalhes e o comando pronto só para a máquina da taverna (quem está na rede não precisa)
      ...(local ? { firewallMotivo: firewall.motivo, redes: firewall.categorias, comandoFirewall: comandoLiberarFirewall(porta) } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
