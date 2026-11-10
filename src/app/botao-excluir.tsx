"use client";

import { useId, useRef, type RefObject } from "react";
import { useFormStatus } from "react-dom";

/** Botões do diálogo. Fica num componente à parte porque o useFormStatus só enxerga o <form> de quem está acima dele. */
function AcoesDoDialogo({ refCancelar, aoCancelar }: { refCancelar: RefObject<HTMLButtonElement | null>; aoCancelar: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <button ref={refCancelar} type="button" className="btn-borda min-h-11 px-4" disabled={pending} onClick={aoCancelar}>
        Deixa quieto
      </button>
      <button type="submit" className="btn-perigo-cheio min-h-11 px-4" disabled={pending} aria-busy={pending}>
        {pending ? "Levando para a lixeira…" : "Excluir"}
      </button>
    </div>
  );
}

// Fica discreto no rodapé do cartão e sempre pede confirmação num diálogo da casa. A campanha vai para a lixeira (página
// "Cópias e lixeira"), de onde dá para restaurar; depois de excluir, a taverna abre essa página com o "desfazer" à vista.
// Precisa morar dentro do <form action={excluirCampanhaAcao}>: o "Excluir" do diálogo é o botão de enviar desse form.
export function BotaoExcluir({ nome }: { nome: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idTexto = useId();

  const abrir = () => {
    const d = dialogo.current;
    if (!d || d.open) return;
    d.showModal();
    // o foco começa na saída segura, não no botão que apaga
    cancelar.current?.focus();
  };
  // fechar pelo close() nativo devolve o foco ao botão que abriu (o Esc também passa por aqui)
  const fechar = () => dialogo.current?.close();

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-10 items-center rounded-sm px-1 text-muted transition hover:text-sangue sm:min-h-8"
        title="Excluir campanha (vai para a lixeira)"
        aria-label={`Excluir a campanha ${nome}`}
        aria-haspopup="dialog"
        onClick={abrir}
      >
        Excluir
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        aria-describedby={idTexto}
        className="cartao dialogo-suave m-auto w-[calc(100vw-2rem)] max-w-sm p-0 text-left text-sm font-normal normal-case tracking-normal text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm"
        // o clique que acerta o próprio <dialog> (e não o miolo) foi no fundo escurecido
        onClick={(e) => {
          if (e.target === e.currentTarget) fechar();
        }}
      >
        <div className="p-5">
          <h2 id={idTitulo} className="titulo text-xl text-pergaminho">
            Mandar para a lixeira?
          </h2>
          <p className="mt-2 break-words font-semibold text-pergaminho">{nome}</p>
          <p id={idTexto} className="mt-2 text-muted">
            Ela sai da lista e fica na lixeira da taverna, de onde dá para restaurar.
          </p>
          <AcoesDoDialogo refCancelar={cancelar} aoCancelar={fechar} />
        </div>
      </dialog>
    </>
  );
}
