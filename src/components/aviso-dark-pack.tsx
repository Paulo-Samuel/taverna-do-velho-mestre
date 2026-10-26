// Aviso exigido pela política Dark Pack (Paradox) para fã-conteúdo de World of Darkness:
// logo do programa, declaração legal e aviso de que não é material oficial.
// Sem hooks: funciona em componente de servidor e de cliente.

export const DECLARACAO_DARK_PACK =
  "Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission. All rights reserved. For more information please visit worldofdarkness.com.";

export function AvisoDarkPack({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compacto ? "text-[11px]" : "text-xs"} text-muted`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeno e fixo, sem otimização de imagem */}
      <img src="/darkpack.png" alt="Dark Pack" width={compacto ? 36 : 56} height={compacto ? 36 : 56} className="shrink-0" />
      <p>
        Vampiro: A Máscara entra na taverna como <strong className="text-foreground">fã-conteúdo gratuito e não oficial</strong>, sob a
        política Dark Pack; não é material oficial de World of Darkness. {DECLARACAO_DARK_PACK}
      </p>
    </div>
  );
}
