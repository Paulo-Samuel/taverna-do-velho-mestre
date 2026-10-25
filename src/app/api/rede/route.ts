import QRCode from "qrcode";
import { obterCampanha } from "@/lib/db";
import { acessoPermitido, ehLocal } from "@/lib/rede/acesso";
import { enderecosLocais, portaAtual } from "@/lib/rede/enderecos";

// Endereços desta máquina na rede local, com o link de entrada da mesa e um QR code (SVG) para cada um.
// GET /api/rede?campanha=<id>

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

  return Response.json(
    { local: ehLocal(request), porta, dev: process.env.NODE_ENV === "development", temPin: Boolean(campanha?.config.pin), enderecos },
    { headers: { "Cache-Control": "no-store" } },
  );
}
