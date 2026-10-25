import { atualizarCampanha, obterCampanha } from "@/lib/db";
import { acessoPermitido, atrasoPara, bloqueioRestante, cookieDoPin, ehLocal, ipDe, registrarFalha, registrarSucesso } from "@/lib/rede/acesso";
import { publicar } from "@/lib/tempo-real";

// PIN da mesa para quem entra pela rede local.
// GET: situação deste aparelho · POST {pin}: confere e grava o cookie · PUT {pin|null}: define/remove (só nesta máquina).

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function campanhaDe(ctx: RouteContext<"/api/campanhas/[id]/pin">) {
  const { id } = await ctx.params;
  return obterCampanha(Number(id));
}

export async function GET(request: Request, ctx: RouteContext<"/api/campanhas/[id]/pin">) {
  const campanha = await campanhaDe(ctx);
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  return Response.json({ temPin: Boolean(campanha.config.pin), liberado: acessoPermitido(request, campanha), local: ehLocal(request) });
}

export async function POST(request: Request, ctx: RouteContext<"/api/campanhas/[id]/pin">) {
  const campanha = await campanhaDe(ctx);
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!campanha.config.pin) return Response.json({ ok: true });

  const ip = ipDe(request);
  const bloqueio = bloqueioRestante(ip);
  if (bloqueio > 0) {
    const minutos = Math.ceil(bloqueio / 60_000);
    return Response.json(
      { erro: `Chutes demais. O taverneiro cruzou os braços: tente de novo em ${minutos} min.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(bloqueio / 1000)) } },
    );
  }

  const corpo = (await request.json().catch(() => ({}))) as { pin?: unknown };
  const pin = String(corpo.pin ?? "").trim();
  // a espera vem antes da resposta, certa ou errada, para não dar pista pelo tempo
  await espera(atrasoPara(ip));
  if (pin !== campanha.config.pin) {
    registrarFalha(ip);
    return Response.json({ erro: "PIN errado. O porteiro nem piscou." }, { status: 403 });
  }
  registrarSucesso(ip);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookieDoPin(campanha) } });
}

export async function PUT(request: Request, ctx: RouteContext<"/api/campanhas/[id]/pin">) {
  const campanha = await campanhaDe(ctx);
  if (!campanha) return Response.json({ erro: "Mesa não encontrada." }, { status: 404 });
  if (!ehLocal(request)) return Response.json({ erro: "Só a máquina da taverna troca o PIN." }, { status: 403 });

  const corpo = (await request.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof corpo.pin === "string" ? corpo.pin.trim().slice(0, 12) : "";
  if (pin && !/^[\p{L}\p{N}]{3,12}$/u.test(pin)) {
    return Response.json({ erro: "PIN de 3 a 12 letras ou números, sem espaços." }, { status: 400 });
  }
  const config = { ...campanha.config };
  if (pin) config.pin = pin;
  else delete config.pin;
  atualizarCampanha(campanha.id, { config });
  // todo mundo recarrega o estado (temPin muda); quem estava pela rede com o PIN antigo cai e volta pela tela de entrada
  publicar(campanha.id, { e: "recarregar" });
  return Response.json({ ok: true, temPin: Boolean(pin) });
}
