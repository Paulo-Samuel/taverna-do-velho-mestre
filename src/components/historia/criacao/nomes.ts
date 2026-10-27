import { sorte } from "../retrato/dados";

// Nomes para quem chega na taverna sem saber como se chama (acontece mais do que deveria, geralmente depois da terceira caneca).

export const NOMES_MASCULINOS = [
  "Afonso", "Gonçalo", "Mendo", "Fernão", "Lourenço", "Martim", "Nuno", "Rodrigo", "Sancho", "Vasco",
  "Egas", "Garcia", "Paio", "Soeiro", "Tristão", "Baltasar", "Bartolomeu", "Crispim", "Damião", "Eusébio",
  "Gaspar", "Hilário", "Inácio", "Jerônimo", "Leôncio", "Matias", "Onofre", "Pancrácio", "Quirino", "Rufino",
  "Silvestre", "Teodoro", "Urbano", "Valério", "Aldo", "Bram", "Corvino", "Dagoberto", "Edmundo", "Fausto",
  "Godofredo", "Haroldo", "Ivo", "Jorvan", "Kael", "Lotário", "Mordecai", "Osvaldo", "Percival", "Ragnar",
  "Severino", "Ulrico", "Vladislau", "Wolfram", "Zacarias", "Cássio", "Brás", "Tibúrcio", "Anselmo", "Bertoldo",
  "Cipriano", "Duarte", "Estêvão", "Florêncio", "Gualter", "Heitor", "Isidoro", "Julião", "Ladislau", "Macário",
  "Norberto", "Otão", "Pelágio", "Rogério", "Sigismundo", "Tancredo", "Ugolino", "Vicente", "Aurélio", "Belmiro",
  "Dimas", "Elói", "Gervásio", "Lázaro", "Malaquias", "Policarpo", "Rolando", "Tadeu", "Abelardo", "Caetano",
];

export const NOMES_FEMININOS = [
  "Aldonça", "Beatriz", "Brites", "Constança", "Dulce", "Elvira", "Filipa", "Guiomar", "Inês", "Leonor",
  "Mafalda", "Mécia", "Oriana", "Teresa", "Urraca", "Violante", "Isolda", "Ximena", "Berengária", "Catarina",
  "Branca", "Sancha", "Joana", "Margarida", "Matilde", "Rosalinda", "Genoveva", "Hildegarda", "Ingrid", "Brunilda",
  "Morgana", "Ondina", "Selene", "Tamsin", "Ysolde", "Zuleica", "Amélia", "Benedita", "Clotilde", "Doroteia",
  "Eulália", "Florbela", "Gertrudes", "Helvíria", "Iolanda", "Jacinta", "Lucrécia", "Melisande", "Nereia", "Odete",
  "Petronila", "Quitéria", "Rosamunda", "Sibila", "Tecla", "Úrsula", "Valquíria", "Guilhermina", "Yara", "Zenóbia",
  "Aurélia", "Bárbara", "Celeste", "Esmeralda", "Adelaide", "Briolanja", "Cecília", "Domitila", "Engrácia", "Felícia",
  "Gisela", "Heloísa", "Idalina", "Judite", "Leocádia", "Madalena", "Natália", "Olímpia", "Perpétua", "Rosaura",
  "Severa", "Teodora", "Virgínia", "Aldegunda", "Bertrada", "Cunegundes", "Edwiges", "Frederica", "Irmengarda", "Mirtes",
];

/** Nomes que servem para qualquer um (ou para quem prefere ser chamado como um pássaro). */
export const NOMES_NEUTROS = [
  "Corvo", "Cinza", "Sálvia", "Faísca", "Lume", "Breu", "Orvalho", "Junco", "Alecrim", "Pardal",
  "Bruma", "Ébano", "Rubi", "Ariel", "Sabre", "Gralha", "Urze", "Tojo", "Andorinha", "Musgo",
  "Cardo", "Ferrugem", "Fagulha", "Avelã", "Lince", "Ônix", "Garoa", "Raposa", "Coruja", "Ventania",
  "Âmbar", "Carvão", "Sereno", "Rapina", "Nogueira", "Trovão", "Azevinho", "Estopa", "Graveto", "Lírio",
];

export type SexoNome = "homem" | "mulher" | "outro" | "";

/**
 * Seis nomes sorteados, sempre os mesmos para a mesma semente. Sem sexo escolhido: dois de cada lista. Depois do passo do
 * rosto (quem volta para trocar o nome), puxa para o lado escolhido: quatro do sexo e dois neutros.
 */
export function sortearNomes(semente: string, sexo: SexoNome = "", evitar: string[] = []): string[] {
  const s = sorte(`nomes|${semente}`);
  const escolhidos: string[] = [];
  const pegar = (lista: string[], quantos: number) => {
    for (let k = 0; k < quantos; k++) {
      for (let i = 0; i < 20; i++) {
        const n = s.um(lista);
        if (!escolhidos.includes(n) && !evitar.includes(n)) {
          escolhidos.push(n);
          break;
        }
      }
    }
  };
  if (sexo === "homem") pegar(NOMES_MASCULINOS, 4);
  else if (sexo === "mulher") pegar(NOMES_FEMININOS, 4);
  else {
    pegar(NOMES_MASCULINOS, 2);
    pegar(NOMES_FEMININOS, 2);
  }
  pegar(NOMES_NEUTROS, 2);
  // embaralha (Fisher-Yates: sort com comparador aleatório muda de motor para motor e quebra a hidratação)
  for (let i = escolhidos.length - 1; i > 0; i--) {
    const j = Math.floor(s.n() * (i + 1));
    [escolhidos[i], escolhidos[j]] = [escolhidos[j], escolhidos[i]];
  }
  return escolhidos;
}
