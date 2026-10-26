import { clarear, escurecer, misturar } from "./cores";
import { figurinoDaClasse, type DadosRetrato } from "./dados";
import { geoRosto, type GeoRosto } from "./geometria";

// Tudo que as partes do retrato precisam saber: dados, geometria, paleta derivada e ids únicos dos <defs>.

export type Tons = { base: string; luz: string; sombra: string; funda: string };

export type Ctx = {
  d: DadosRetrato;
  g: GeoRosto;
  figurino: string;
  /** id único no documento (vários retratos na mesma página não podem brigar por gradiente) */
  id: (nome: string) => string;
  url: (nome: string) => string;
  pele: Tons & { contorno: string; labio: string };
  cabelo: Tons;
  roupa: Tons;
  detalhe: Tons;
  /** meia-largura dos ombros */
  ombro: number;
  /** meia-largura do pescoço */
  pescoco: number;
  /** cabelo + 3: o volume do cabelo em volta do crânio */
  L: number;
};

function tons(cor: string, luz = 0.3, sombra = 0.35, funda = 0.6): Tons {
  return { base: cor, luz: clarear(cor, luz), sombra: escurecer(cor, sombra), funda: escurecer(cor, funda) };
}

export function criarCtx(d: DadosRetrato, prefixo: string): Ctx {
  const g = geoRosto(d.rosto);
  const figurino = figurinoDaClasse(d.classe);
  const homem = d.sexo === "homem";
  const mulher = d.sexo === "mulher";
  const forte = figurino === "barbaro" || d.origem === "meio-orc" || d.origem === "anao";
  const miudo = d.origem === "halfling" || d.origem === "elfo";
  const ombro = (homem ? 64 : mulher ? 56 : 60) + (forte ? 6 : 0) - (miudo ? 4 : 0);
  const pescoco = (homem ? 14 : mulher ? 11.5 : 12.5) + (forte ? 3 : 0) - (d.origem === "elfo" ? 1 : 0);
  return {
    d,
    g,
    figurino,
    id: (nome) => `${prefixo}-${nome}`,
    url: (nome) => `url(#${prefixo}-${nome})`,
    pele: {
      ...tons(d.pele, 0.28, 0.3, 0.55),
      contorno: escurecer(d.pele, 0.62),
      labio: misturar(d.pele, "#a8434a", mulher ? 0.4 : 0.2),
    },
    cabelo: tons(d.cabelo.cor, 0.35, 0.4, 0.65),
    roupa: tons(d.corRoupa, 0.25, 0.4, 0.65),
    detalhe: tons(d.corDetalhe, 0.4, 0.35, 0.6),
    ombro,
    pescoco,
    L: g.l + 3,
  };
}
