# Suas músicas na taverna

A taverna já vem com trilha sonora gerada na hora (cada sistema tem seu estilo). Se preferir tocar **as suas músicas**,
coloque os arquivos de áudio aqui nesta pasta `musica/`. Ela fica fora do git: nada daqui é enviado para lugar nenhum.

## Como organizar

```
musica/
  <sistema>/
    <humor>/      ← músicas daquele sistema para aquele clima de cena
    *.mp3         ← soltas na pasta do sistema: valem para qualquer humor dele
  geral/
    <humor>/      ← para qualquer sistema, naquele humor
    *.mp3         ← para qualquer sistema e qualquer humor
```

A taverna procura nesta ordem e usa a primeira que tiver música: `musica/<sistema>/<humor>/`, `musica/<sistema>/`,
`musica/geral/<humor>/`, `musica/geral/`. Se não achar nada, toca a trilha gerada.

**Sistemas:** `dnd5e`, `pf2e`, `pf1e`, `osr`, `d100`, `fate`, `pbta`, `vtm5` e `historia` (modo história).

**Humores** (os mesmos que o mestre escolhe para a cena): `taverna`, `calmo`, `exploracao`, `misterio`, `tensao`, `combate`,
`triste`, `vitoria`, `sombrio`. Maiúsculas e acentos no nome da pasta não importam (`Tensão` vale como `tensao`).

**Formatos:** `.mp3`, `.ogg`, `.m4a`, `.wav`, `.flac`, `.webm`. Subpastas dentro da pasta do humor são ignoradas.

## Exemplos

```
musica/vtm5/combate/batida-industrial.mp3
musica/vtm5/taverna/boate-elysium.ogg
musica/vtm5/noite-chuvosa.mp3          (qualquer cena de Vampiro sem pasta própria)
musica/d100/misterio/caixinha.m4a
musica/geral/vitoria/fanfarra.mp3      (vitória em qualquer sistema)
musica/geral/ambiente-de-taverna.mp3   (último recurso para tudo)
```

## Como toca

- As faixas de um humor tocam em ordem aleatória, uma emendando na outra. Quando a cena muda de humor, a música troca
  com um crossfade de uns 3 segundos. A vitória toca uma faixa e depois volta para a calmaria.
- O botão de som e o volume da mesa valem para as suas músicas também. No menu do volume aparece o nome da faixa (♪).
- Cada aparelho da mesa toca no próprio alto-falante, buscando os arquivos desta máquina. Pode acrescentar ou tirar
  músicas com a taverna ligada: ela relê a pasta quando você abre o menu do volume ou volta para a aba.

## Que músicas colocar

Use só músicas que você tem direito de usar: as que você comprou, as com licença livre (CC0, CC-BY, respeitando a
atribuição pedida) ou de sites que permitem uso pessoal. Elas ficam só na sua máquina.
