"use client";

export function BotaoExcluir({ nome }: { nome: string }) {
  return (
    <button
      className="hover:text-sangue"
      title="Excluir campanha"
      onClick={(e) => {
        if (!confirm(`Excluir "${nome}" e todo o histórico? Não dá para desfazer.`)) e.preventDefault();
      }}
    >
      Excluir
    </button>
  );
}
