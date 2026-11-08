"use client";

// Fica discreto no rodapé do cartão e sempre pede confirmação. A campanha vai para a lixeira (página "Cópias e lixeira"),
// de onde dá para restaurar; depois de excluir, a taverna abre essa página com o "desfazer" à vista.
export function BotaoExcluir({ nome }: { nome: string }) {
  return (
    <button
      type="submit"
      className="-mr-2 inline-flex min-h-10 items-center rounded-md px-2 text-muted transition hover:bg-sangue/10 hover:text-sangue sm:min-h-8"
      title="Excluir campanha (vai para a lixeira)"
      aria-label={`Excluir a campanha ${nome}`}
      onClick={(e) => {
        if (!confirm(`Excluir "${nome}"? Ela sai da lista e vai para a lixeira da taverna, de onde dá para restaurar.`)) e.preventDefault();
      }}
    >
      Excluir
    </button>
  );
}
