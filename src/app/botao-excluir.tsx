"use client";

// Fica discreto no rodapé do cartão e sempre pede confirmação: apagar campanha não tem volta.
export function BotaoExcluir({ nome }: { nome: string }) {
  return (
    <button
      type="submit"
      className="-mr-2 inline-flex min-h-10 items-center rounded-md px-2 text-muted transition hover:bg-sangue/10 hover:text-sangue sm:min-h-8"
      title="Excluir campanha"
      aria-label={`Excluir a campanha ${nome}`}
      onClick={(e) => {
        if (!confirm(`Excluir "${nome}" e todo o histórico? Não dá para desfazer.`)) e.preventDefault();
      }}
    >
      Excluir
    </button>
  );
}
